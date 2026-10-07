import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRefs } from '../src/check/api.js';

const keys = (refs) => refs.map((r) => `${r.mod}:${r.base}:${r.path.join('.')}`);

test('collects member reads from a default import', () => {
  const k = keys(collectRefs("import axios from 'axios';\naxios.get('/x');\naxios.interceptors.request.use(f);", 'axios'));
  assert.ok(k.includes('esm:default:get'));
  assert.ok(k.includes('esm:default:interceptors.request.use'));
});

test('collects named imports and destructured requires', () => {
  const k = keys(collectRefs("import { a } from 'pkg';\nconst { b } = require('pkg');", 'pkg'));
  assert.ok(k.includes('esm:namespace:a'));
  assert.ok(k.includes('cjs:namespace:b'));
});

test('does not count assignments as API reads', () => {
  const k = keys(collectRefs("import axios from 'axios';\naxios.defaults.baseURL = 'x';", 'axios'));
  assert.ok(k.includes('esm:default:defaults'));
  assert.ok(!k.includes('esm:default:defaults.baseURL'));
});

test('ignores a callback parameter that shadows the package name', () => {
  const k = keys(collectRefs("import yargs from 'yargs';\nfn((yargs) => yargs.positional('p'));", 'yargs'));
  assert.ok(!k.some((x) => x.endsWith(':positional')));
});

test('assumes the package for an undeclared name that matches it', () => {
  assert.ok(keys(collectRefs("axios.get('/x');", 'axios')).includes('any:default:get'));
});

test('returns null for code that does not parse', () => {
  assert.equal(collectRefs('const a = ...;', 'axios'), null);
});
