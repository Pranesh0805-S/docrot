import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['case-study/results', 'case-study/results-legacy'];
const WANT = new Set(['Runtime API error (unverified)', 'Other']);
const FENCE = '`'.repeat(3);

const out = ['# Triage: failures the static checker could not explain', '',
  'Verify each by hand: install the package at that version in a fresh folder and run the example as written.', ''];
let count = 0;

for (const dir of DIRS) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
    const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const x of r.results.filter((x) => WANT.has(x.category))) {
      count += 1;
      const err = x.stderr.split('\n').find((l) => /Error/.test(l)) ?? x.stderr.slice(0, 100);
      out.push(`## ${r.name}@${r.version}, README line ${x.line}`, `Category: ${x.category}`, `Error: ${err}`,
        FENCE + 'js', x.code.split('\n').slice(0, 8).join('\n'), FENCE, '', 'Verdict: ', '');
    }
  }
}
writeFileSync('case-study/triage.md', out.join('\n'));
console.log(`${count} candidates written to case-study/triage.md`);