import { parse } from 'acorn';
import * as walk from 'acorn-walk';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';

const OPTS = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
};

function aliasOf(name) {
  return name.replace(/^@[^/]+\//, '').replace(/[-.](\w)/g, (_, c) => c.toUpperCase());
}

function addNames(p, out) {
  if (!p) return;
  if (p.type === 'Identifier') out.add(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach((x) => addNames(x.value ?? x.argument, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach((x) => addNames(x, out));
  else if (p.type === 'AssignmentPattern') addNames(p.left, out);
  else if (p.type === 'RestElement') addNames(p.argument, out);
}

function chainOf(node) {
  const path = [];
  let cur = node;
  while (cur.type === 'MemberExpression') {
    if (!cur.computed) path.unshift(cur.property.name);
    else if (cur.property.type === 'Literal') path.unshift(String(cur.property.value));
    else return null;
    cur = cur.object;
  }
  return cur.type === 'Identifier' ? { root: cur.name, path } : null;
}

// Find every API the snippet reads from the package, e.g. axios.CancelToken.source
// mod = which module system the snippet uses: 'cjs' (require), 'esm' (import) or 'any' (unknown)
export function collectRefs(code, pkgName) {
  let ast;
  try {
    ast = parse(code, OPTS);
  } catch {
    return null; // fragment, TypeScript, "..." placeholders: can't parse
  }
  const bindings = new Map(); // local name -> { base: 'default'|'namespace', mod }
  const declared = new Set();
  const refs = new Map();
  const add = (base, path, mod) => refs.set(`${base}:${mod}:${path.join('.')}`, { base, mod, path });

  const bindPattern = (pattern) => {
    if (pattern.type !== 'ObjectPattern') return;
    for (const p of pattern.properties) {
      if (p.type === 'Property' && !p.computed && p.key.type === 'Identifier') add('namespace', [p.key.name], 'cjs');
    }
  };

  walk.simple(ast, {
    ImportDeclaration(n) {
      for (const s of n.specifiers) {
        declared.add(s.local.name);
        if (n.source.value !== pkgName) continue;
        if (s.type === 'ImportDefaultSpecifier') bindings.set(s.local.name, { base: 'default', mod: 'esm' });
        else if (s.type === 'ImportNamespaceSpecifier') bindings.set(s.local.name, { base: 'namespace', mod: 'esm' });
        else add('namespace', [s.imported.name ?? s.imported.value], 'esm');
      }
    },
    VariableDeclarator(n) {
      addNames(n.id, declared);
      const c = n.init;
      const isReq =
        c?.type === 'CallExpression' && c.callee.name === 'require' &&
        c.arguments[0]?.value === pkgName;
      if (!isReq) return;
      if (n.id.type === 'Identifier') bindings.set(n.id.name, { base: 'default', mod: 'cjs' });
      else bindPattern(n.id);
    },
    // parameters, function and class names are local variables, not the package
    FunctionDeclaration(n) { addNames(n.id, declared); n.params.forEach((p) => addNames(p, declared)); },
    FunctionExpression(n) { addNames(n.id, declared); n.params.forEach((p) => addNames(p, declared)); },
    ArrowFunctionExpression(n) { n.params.forEach((p) => addNames(p, declared)); },
    ClassDeclaration(n) { addNames(n.id, declared); },
    CatchClause(n) { addNames(n.param, declared); },
  });

  // snippet uses `axios` without importing it: assume it means the package
  const alias = aliasOf(pkgName);
  if (!bindings.has(alias) && !declared.has(alias)) bindings.set(alias, { base: 'default', mod: 'any' });

  const writes = new Set();
  walk.full(ast, (n) => {
    if (n.type === 'AssignmentExpression') writes.add(n.left);
    if (n.type === 'UpdateExpression') writes.add(n.argument);
    if (n.type === 'UnaryExpression' && n.operator === 'delete') writes.add(n.argument);
  });
  walk.full(ast, (n) => {
    if (n.type !== 'MemberExpression' || writes.has(n)) return;
    const c = chainOf(n);
    const b = c && bindings.get(c.root);
    if (b) add(b.base, c.path, b.mod);
  });
  return [...refs.values()];
}

// Runs inside the sandbox folder. A ref is only "missing" if it is missing
// from every module shape the snippet could be using (CommonJS and ESM differ for some packages).
const CHECKER = `
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { pkg, refs } = JSON.parse(readFileSync('refs.json', 'utf8'));
let esm, cjs;
try { esm = await import(pkg); } catch {}
try { cjs = createRequire(process.cwd() + '/')(pkg); } catch {}
if (!esm && !cjs) { console.log(JSON.stringify({ error: 'package could not be loaded' })); process.exit(0); }
const isObj = (o) => o != null && (typeof o === 'object' || typeof o === 'function');
function roots(r) {
  const e = esm ? (r.base === 'default' ? [esm.default ?? esm] : [esm, esm.default]) : [];
  const c = cjs ? [cjs] : [];
  const list = r.mod === 'cjs' ? c : r.mod === 'esm' ? e : [...e, ...c];
  return list.filter(isObj);
}
function walkPath(root, path) {
  let cur = root;
  for (let i = 0; i < path.length; i++) {
    if (!isObj(cur)) return { status: 'unknown' };
    try {
      if (!(path[i] in cur)) return { status: 'missing', at: i };
      cur = cur[path[i]];
    } catch { return { status: 'unknown' }; }
  }
  return { status: 'ok' };
}
const out = [];
for (const r of refs) {
  const results = roots(r).map((root) => walkPath(root, r.path));
  if (!results.length || results.some((x) => x.status !== 'missing')) continue;
  out.push({ i: r.i, ref: r.path.slice(0, results[0].at + 1).join('.') });
}
console.log(JSON.stringify({ missing: out }));
`;

function runChecker(dir) {
  return new Promise((resolve) => {
    const { PATH, Path, SystemRoot, TEMP, TMP } = process.env;
    execFile(process.execPath, ['check.mjs'], {
      cwd: dir, timeout: 20000, windowsHide: true,
      env: { PATH: PATH ?? Path, SystemRoot, TEMP, TMP },
    }, (err, stdout) => {
      try { resolve(JSON.parse(String(stdout).trim().split('\n').pop())); }
      catch { resolve({ error: err ? String(err.message).slice(0, 200) : 'no output' }); }
    });
  });
}

// One entry per snippet: { parsed, checked, missing: [...] }
export async function checkApi(dir, pkgName, snippets) {
  const refs = [];
  const info = snippets.map((s, i) => {
    const found = collectRefs(s.code, pkgName);
    if (!found) return { parsed: false, checked: 0, missing: [] };
    for (const r of found) refs.push({ ...r, i });
    return { parsed: true, checked: found.length, missing: [] };
  });
  if (!refs.length) return info;
  await writeFile(join(dir, 'refs.json'), JSON.stringify({ pkg: pkgName, refs }));
  await writeFile(join(dir, 'check.mjs'), CHECKER);
  const res = await runChecker(dir);
  if (res.missing) for (const m of res.missing) info[m.i].missing.push(m.ref);
  else for (const x of info) x.checked = 0; // package could not be imported: don't guess
  return info;
}
