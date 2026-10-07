import { parse } from 'acorn';
import * as walk from 'acorn-walk';

const OPTS = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
};
const FUNCS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

function addNames(p, out) {
  if (!p) return;
  if (p.type === 'Identifier') out.add(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach((x) => addNames(x.value ?? x.argument, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach((x) => addNames(x, out));
  else if (p.type === 'AssignmentPattern') addNames(p.left, out);
  else if (p.type === 'RestElement') addNames(p.argument, out);
}

// errors: problems that make a snippet invalid by itself, whatever context the README gives it
//   (assigning to a const, using a variable before its let/const declaration).
// warnings: the same name declared twice. READMEs usually do this to show alternatives
//   ("// Or ..."), so it is reported but never counted as confirmed breakage.
export function lintSnippet(code) {
  let ast;
  try {
    ast = parse(code, OPTS);
  } catch (err) {
    const m = /Identifier '(.+)' has already been declared/.exec(err.message);
    if (!m) return { errors: [], warnings: [] }; // other syntax errors are usually fragments
    // READMEs often show "import x from 'x'  // or  const x = require('x')" in one block: alternatives, not a bug
    if (/\bimport\b/.test(code) && /\brequire\s*\(/.test(code)) return { errors: [], warnings: [] };
    return { errors: [], warnings: [`'${m[1]}' is declared twice`] };
  }

  const consts = new Set();
  const lexical = [];
  for (const stmt of ast.body) {
    if (stmt.type !== 'VariableDeclaration' || stmt.kind === 'var') continue;
    for (const d of stmt.declarations) {
      if (d.id.type !== 'Identifier') continue;
      lexical.push({ name: d.id.name, end: d.end });
      if (stmt.kind === 'const') consts.add(d.id.name);
    }
  }

  const shadowed = (name, ancestors) =>
    ancestors.some((a) => {
      const names = new Set();
      if (FUNCS.has(a.type)) a.params.forEach((p) => addNames(p, names));
      else if (a.type === 'CatchClause') addNames(a.param, names);
      return names.has(name);
    });

  const problems = new Set();
  const checkWrite = (target, anc) => {
    if (target.type === 'Identifier' && consts.has(target.name) && !shadowed(target.name, anc)) {
      problems.add(`assignment to const '${target.name}'`);
    }
  };
  walk.ancestor(ast, {
    Identifier(n, _s, anc) {
      if (anc.some((a) => FUNCS.has(a.type))) return; // function bodies run later
      for (const l of lexical) {
        if (l.name === n.name && n.start < l.end) problems.add(`'${n.name}' used before its declaration`);
      }
    },
    AssignmentExpression(n, _s, anc) { checkWrite(n.left, anc); },
    UpdateExpression(n, _s, anc) { checkWrite(n.argument, anc); },
  });
  return { errors: [...problems], warnings: [] };
}
