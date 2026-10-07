export function printReport(r) {
  const s = r.summary;
  const rate = s.rotRate === null ? 'n/a' : (s.rotRate * 100).toFixed(1) + '%';
  console.log(`\n${r.name}@${r.version}  (${r.repoUrl ?? 'no repo url'})`);
  console.log(`snippets: ${s.total}  passed: ${s.pass}  failed: ${s.fail}  timeout: ${s.timeout}`);
  console.log(`API-checked: ${s.apiChecked}  broken API refs: ${s.apiBroken}  invalid as written: ${s.invalid}  warnings: ${s.warned}`);
  console.log(`confirmed broken: ${s.confirmed}  rot rate: ${rate}`);
  for (const x of r.results.filter((x) => x.apiMissing.length || x.invalid.length || x.warnings.length)) {
    const why = [
      ...x.apiMissing.map((m) => `missing ${m}`),
      ...x.invalid,
      ...x.warnings.map((w) => `warning: ${w}`),
    ].join('; ');
    console.log(`  line ${x.line}: ${why}`);
  }
}
