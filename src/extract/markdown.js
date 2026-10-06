import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

const JS = new Set(['js', 'javascript', 'mjs', 'cjs']);
const TS = new Set(['ts', 'typescript']);
const SHELL = new Set(['sh', 'bash', 'shell', 'zsh', 'console']);

function kindOf(lang) {
  if (JS.has(lang)) return 'js';
  if (TS.has(lang)) return 'ts';
  if (SHELL.has(lang)) return 'shell';
  return 'other';
}

export function extractSnippets(markdown) {
  const tree = unified().use(remarkParse).parse(markdown);
  const snippets = [];
  visit(tree, 'code', (node) => {
    const lang = (node.lang || '').toLowerCase();
    snippets.push({
      lang,
      kind: kindOf(lang),
      code: node.value,
      line: node.position?.start.line ?? null,
    });
  });
  return snippets;
}