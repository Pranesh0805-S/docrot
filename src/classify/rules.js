// Only these count as confirmed documentation breakage
export const CONFIRMED = new Set(['Broken API reference']);

const RULES = [
  { category: 'Needs network/external service', test: /ECONNREFUSED|ENOTFOUND|EADDRINUSE|ETIMEDOUT|ECONNRESET|fetch failed|api[_ ]?key|Unauthorized/i },
  { category: 'Runtime API error (unverified)', test: /is not a function|is not a constructor|does not provide an export named|ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_REQUIRE_ESM/ },
  { category: 'Missing dependency/module', test: /Cannot find (module|package)|ERR_MODULE_NOT_FOUND/i },
  { category: 'Incomplete snippet (missing context)', test: /ReferenceError: .+ is not defined/ },
  { category: 'Not runnable as-is (fragment/TypeScript)', test: /SyntaxError|Unexpected (token|identifier|end)/ },
];

export function classify(result) {
  if (result.status === 'pass') return null;
  if (result.status === 'timeout') return 'Long-running (inconclusive)';
  return RULES.find((r) => r.test.test(result.stderr))?.category ?? 'Other';
}