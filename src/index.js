import { fetchPackage } from './fetch/npm.js';
import { extractSnippets } from './extract/markdown.js';
import { installPackage } from './sandbox/install.js';
import { runSnippet } from './sandbox/run.js';
import { checkApi } from './check/api.js';
import { lintSnippet } from './check/lint.js';
import { classify } from './classify/rules.js';

function summarize(results) {
  const s = {
    total: results.length, pass: 0, fail: 0, timeout: 0,
    apiChecked: 0, apiBroken: 0, invalid: 0, warned: 0, confirmed: 0, categories: {},
  };
  for (const r of results) {
    s[r.status] += 1;
    if (r.category) s.categories[r.category] = (s.categories[r.category] ?? 0) + 1;
    if (r.apiChecked > 0) s.apiChecked += 1;
    if (r.apiMissing.length > 0) s.apiBroken += 1;
    if (r.invalid.length > 0) s.invalid += 1;
    if (r.warnings.length > 0) s.warned += 1;
    if (r.apiMissing.length > 0 || r.invalid.length > 0) s.confirmed += 1;
  }
  // share of JavaScript snippets confirmed broken (broken API reference or invalid as written)
  s.rotRate = s.total ? +(s.confirmed / s.total).toFixed(3) : null;
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
      const { errors: invalid, warnings } = lintSnippet(s.code);
      const category = a.missing.length
        ? 'Broken API reference'
        : invalid.length
          ? 'Invalid as written'
          : classify(run);
      results.push({
        line: s.line, code: s.code, ...run, category,
        apiChecked: a.checked, apiMissing: a.missing, invalid, warnings,
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
