import test from 'node:test';
import assert from 'node:assert/strict';
import { lintSnippet } from '../src/check/lint.js';

const none = { errors: [], warnings: [] };

test('flags assignment to a const as an error', () => {
  assert.deepEqual(lintSnippet("const x = 1;\nx = 2;"), { errors: ["assignment to const 'x'"], warnings: [] });
});

test('flags use before declaration as an error', () => {
  assert.deepEqual(lintSnippet('const r = r.defaults({});'), { errors: ["'r' used before its declaration"], warnings: [] });
});

test('reports a double declaration as a warning, not an error', () => {
  assert.deepEqual(lintSnippet('const a = 1;\nconst a = 2;'), { errors: [], warnings: ["'a' is declared twice"] });
});

test('ignores ESM and CommonJS alternatives shown in one block', () => {
  assert.deepEqual(lintSnippet("import a from 'a'\n// or\nconst a = require('a')"), none);
  assert.deepEqual(lintSnippet("import { x } from 'p'\n// or\nconst { x } = require('p')"), none);
});

test('allows recursion, shadowing and let reassignment', () => {
  assert.deepEqual(lintSnippet('const f = (n) => (n ? f(n - 1) : 0);\nfn((f) => { f = 1; });'), none);
  assert.deepEqual(lintSnippet('let n = 0;\nn = 5;\nn++;'), none);
});

test('ignores fragments that do not parse', () => {
  assert.deepEqual(lintSnippet('const a = ...;'), none);
});
