import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSnippets } from '../src/extract/markdown.js';

const fence = '`'.repeat(3);
const md = [
  '# Demo', '',
  `${fence}js`, "const x = require('demo');", 'x.run();', fence, '',
  `${fence}bash`, 'npm install demo', fence, '',
  `${fence}json`, '{"a":1}', fence,
].join('\n');

test('extracts every fenced block', () => {
  assert.equal(extractSnippets(md).length, 3);
});

test('classifies snippet kinds', () => {
  const kinds = extractSnippets(md).map((s) => s.kind);
  assert.deepEqual(kinds, ['js', 'shell', 'other']);
});

test('records the starting line', () => {
  assert.equal(extractSnippets(md)[0].line, 3);
});