#!/usr/bin/env node
import { program } from 'commander';
import { readFile } from 'node:fs/promises';
import { auditPackage } from '../src/index.js';
import { printReport } from '../src/report/console.js';
import { writeJson } from '../src/report/json.js';

program.name('docrot').description('Find broken code examples in npm package docs').version('0.1.0');

program
  .command('check <package>')
  .description('audit one package')
  .option('--at <version>', 'package version to test', 'latest')
  .option('--json <file>', 'write full results to a JSON file')
  .action(async (pkg, opts) => {
    try {
      const report = await auditPackage(pkg, opts.at);
      printReport(report);
      if (opts.json) await writeJson(opts.json, report);
      process.exitCode = report.summary.confirmed > 0 ? 1 : 0;
    } catch (err) {
      console.error(`docrot: ${err.message}`);
      process.exitCode = 2;
    }
  });

program
  .command('audit <file>')
  .description('audit every package in a JSON array file')
  .option('--out <dir>', 'folder for per-package JSON results', 'case-study/results')
  .action(async (file, opts) => {
    const names = JSON.parse(await readFile(file, 'utf8'));
    const rows = [];
    for (const name of names) {
      try {
        const r = await auditPackage(name);
        await writeJson(`${opts.out}/${name.replace('/', '__')}.json`, r);
        const s = r.summary;
        rows.push({ package: name, version: r.version, snippets: s.total, checked: s.apiChecked, broken: s.confirmed });
        console.log(`ok   ${name}@${r.version}  checked ${s.apiChecked}  broken ${s.confirmed}`);
      } catch (err) {
        rows.push({ package: name, error: err.message });
        console.log(`FAIL ${name}: ${err.message}`);
      }
    }
    await writeJson(`${opts.out}/_summary.json`, rows);
    const done = rows.filter((r) => !r.error);
    const total = done.reduce((a, r) => a + r.snippets, 0);
    const checked = done.reduce((a, r) => a + r.checked, 0);
    const broken = done.reduce((a, r) => a + r.broken, 0);
    console.log(`\n${done.length}/${names.length} packages audited: ${broken} of ${total} JavaScript snippets confirmed broken (${checked} had API references checked)`);
  });

await program.parseAsync();