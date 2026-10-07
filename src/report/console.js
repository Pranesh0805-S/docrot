export function printReport(r) {
  const s = r.summary;
  const rate = s.rotRate === null ? 'n/a' : (s.rotRate * 100).toFixed(1) + '%';
  console.log(`\n${r.name}@${r.version}  (${r.repoUrl ?? 'no repo url'})`);
  console.log(`snippets: ${s.total}  passed: ${s.pass}  failed: ${s.fail}  timeout: ${s.timeout}`);
  console.log(`API-checked: ${s.apiChecked}  confirmed broken: ${s.confirmed}  rot rate: ${rate}`);
  for (const x of r.results.filter((x) => x.apiMissing.length)) {
    console.log(`  line ${x.line}: missing ${x.apiMissing.join(', ')}`);
  }
}