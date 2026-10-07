# docrot

Finds broken code examples in npm package documentation.

docrot installs a package, pulls the README examples for that exact version, checks every API they reference against what the package really exports, and runs the snippets in a throwaway folder.

## Usage

> Until the package is published to npm, run it with `node bin/docrot.js check axios`.

```bash
npx docrot check axios
npx docrot check mime --at 4.1.0 --json report.json
npx docrot audit packages.json
```

| Command | What it does |
|---|---|
| `check <package>` | Audit one package (`--at <version>`, `--json <file>`) |
| `audit <file>` | Audit every package in a JSON array of names |

Exit codes: `0` nothing confirmed broken, `1` at least one confirmed broken snippet, `2` tool error.

## How it works

1. Fetch the README for the exact version (from the package files via jsDelivr, falling back to the npm registry).
2. Extract the JavaScript code blocks.
3. **Static API check:** parse each snippet and confirm that every `pkg.something` or `import { x } from 'pkg'` exists in the installed version. This works even on fragments.
4. **Invalid-as-written check:** flag snippets that are broken by themselves, whatever the README says around them: assigning to a `const`, or using a variable before its `let`/`const` declaration. Declaring the same name twice is only a warning, because READMEs usually do that to show alternatives.
5. **Run each snippet** in a temp folder and classify failures (missing context, needs network, demo behaviour, unverified runtime error). A runtime failure alone is never counted as confirmed.

## What it can and can't tell you

- A **confirmed** break is one of two things: the README references a name the installed package does not export, or the snippet is invalid as written.
- It does **not** detect changed arguments, removed options or changed return values.
- Running README fragments alone gives misleading failures. Most are missing context, which is why failures are only "confirmed" by the static check.

## Case study

I audited 50 npm packages (30 popular, 20 older). Details: [case-study/CASE_STUDY.md](case-study/CASE_STUDY.md).

- 270 snippets that reference the package's API were checked: 0 removed or renamed names.
- Across 681 JavaScript snippets, the invalid-as-written check confirmed 3 (node-schedule, request x2) and raised 4 warnings (winston, node-fetch).
- 26 failures that could not be explained automatically were checked by hand: 5 were real documentation problems (3 examples invalid as written, 2 outdated by platform changes), 21 were not.

## Safety

docrot runs example code from READMEs. For packages you don't trust, run it in a container or a CI job, not on your main machine.

## License

MIT