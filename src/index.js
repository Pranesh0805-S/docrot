import { fetchPackage } from './fetch/npm.js';
import { extractSnippets } from './extract/markdown.js';
import { installPackage } from './sandbox/install.js';
import { runSnippet } from './sandbox/run.js';
import { checkApi } from './check/api.js';
import { classify } from './classify/rules.js';

function summarize(results) {
  const s = { total: results.length, pass: 0, fail: 0, timeout: 0, apiChecked: 0, confirmed: 0, categories: {} };
  for (const r of results) {
    s[r.status] += 1;
    if (r.category) s.categories[r.category] = (s.categories[r.category] ?? 0) + 1;
    if (r.apiChecked > 0) s.apiChecked += 1;
    if (r.apiMissing.length > 0) s.confirmed += 1;
  }
  // share of snippets that reference the package's API and point at something that no longer exists
  s.rotRate = s.apiChecked ? +(s.confirmed / s.apiChecked).toFixed(3) : null;
  return s;
}

export async function auditPackage(name, version = 'latest') {
  const pkg = await fetchPackage(name, version);
  const snippets = extractSnippets(pkg.readme).filter((s) => s.kind === 'js');
  const sandbox = await installPackage(pkg.name, pkg.version);
  try {
    const api = await checkApi(sandbox.dir, pkg.name, snippets);
    const results = [];
    for (const [i, s] of snippets.entries()) {
      const run = await runSnippet(sandbox.dir, s, i, { name: pkg.name });
      const a = api[i];
      const category = a.missing.length ? 'Broken API reference' : classify(run);
      results.push({
        line: s.line, code: s.code, ...run, category,
        apiChecked: a.checked, apiMissing: a.missing,
      });
    }
    return {
      name: pkg.name, version: pkg.version, repoUrl: pkg.repoUrl,
      summary: summarize(results), results,
    };
  } finally {
    await sandbox.cleanup();
  }
}