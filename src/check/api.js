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
export function collectRefs(code, pkgName) {
  let ast;
  try {
    ast = parse(code, OPTS);
  } catch {
    return null; // fragment, TypeScript, "..." placeholders: can't parse
  }
  const bindings = new Map(); // local name -> 'default' | 'namespace'
  const declared = new Set();
  const refs = new Map();
  const add = (base, path) => refs.set(base + ':' + path.join('.'), { base, path });

  const bindPattern = (pattern) => {
    if (pattern.type !== 'ObjectPattern') return;
    for (const p of pattern.properties) {
      if (p.type === 'Property' && !p.computed && p.key.type === 'Identifier') add('namespace', [p.key.name]);
    }
  };

  walk.simple(ast, {
    ImportDeclaration(n) {
      for (const s of n.specifiers) {
        declared.add(s.local.name);
        if (n.source.value !== pkgName) continue;
        if (s.type === 'ImportDefaultSpecifier') bindings.set(s.local.name, 'default');
        else if (s.type === 'ImportNamespaceSpecifier') bindings.set(s.local.name, 'namespace');
        else add('namespace', [s.imported.name ?? s.imported.value]);
      }
    },
    VariableDeclarator(n) {
      if (n.id.type === 'Identifier') declared.add(n.id.name);
      const c = n.init;
      const isReq =
        c?.type === 'CallExpression' && c.callee.name === 'require' &&
        c.arguments[0]?.value === pkgName;
      if (!isReq) return;
      if (n.id.type === 'Identifier') bindings.set(n.id.name, 'default');
      else bindPattern(n.id);
    },
  });

  // snippet uses `axios` without importing it: assume it means the package
  const alias = aliasOf(pkgName);
  if (!bindings.has(alias) && !declared.has(alias)) bindings.set(alias, 'default');

  const writes = new Set();
  walk.full(ast, (n) => {
    if (n.type === 'AssignmentExpression') writes.add(n.left);
    if (n.type === 'UpdateExpression') writes.add(n.argument);
    if (n.type === 'UnaryExpression' && n.operator === 'delete') writes.add(n.argument);
  });
  walk.full(ast, (n) => {
    if (n.type !== 'MemberExpression' || writes.has(n)) return;
    const c = chainOf(n);
    if (c && bindings.has(c.root)) add(bindings.get(c.root), c.path);
  });
  return [...refs.values()];
}

const CHECKER = `
import { readFileSync } from 'node:fs';
const { pkg, refs } = JSON.parse(readFileSync('refs.json', 'utf8'));
let m;
try { m = await import(pkg); } catch (e) { console.log(JSON.stringify({ error: String(e.message) })); process.exit(0); }
const isObj = (o) => o != null && (typeof o === 'object' || typeof o === 'function');
const out = [];
for (const r of refs) {
  let cur = r.base === 'default' ? (m.default ?? m) : m;
  for (let i = 0; i < r.path.length; i++) {
    if (!isObj(cur)) break;
    const seg = r.path[i];
    let next;
    try {
      if (seg in cur) next = cur[seg];
      else if (i === 0 && r.base === 'namespace' && isObj(m.default) && seg in m.default) next = m.default[seg];
      else { out.push({ i: r.i, ref: r.path.slice(0, i + 1).join('.') }); break; }
    } catch { break; }
    cur = next;
  }
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