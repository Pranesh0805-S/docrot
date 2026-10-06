import { fetchPackage } from './fetch/npm.js';
import { extractSnippets } from './extract/markdown.js';
import { installPackage } from './sandbox/install.js';
import { runSnippet } from './sandbox/run.js';

export async function auditPackage(name, version = 'latest') {
  const pkg = await fetchPackage(name, version);
  const snippets = extractSnippets(pkg.readme).filter((s) => s.kind === 'js');
  const sandbox = await installPackage(pkg.name, pkg.version);
  try {
    const results = [];
    for (const [i, s] of snippets.entries()) {
      results.push({ line: s.line, code: s.code, ...(await runSnippet(sandbox.dir, s, i)) });
    }
    return { name: pkg.name, version: pkg.version, repoUrl: pkg.repoUrl, results };
  } finally {
    await sandbox.cleanup();
  }
}