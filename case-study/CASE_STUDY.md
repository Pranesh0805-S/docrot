# Case study: do npm README examples rot?

**Short answer:** names that READMEs reference almost never disappear from a package (0 of 270 checked snippets). The real problems are examples that are wrong as written, or that depend on platform behaviour that has since changed. Running README code naively makes the picture look far worse than it is.

## 1. Problem

Developers copy README examples first. If an example is broken, they lose time and trust the package less. Maintainers rarely re-run their own docs. I wanted to measure how often README code is actually broken, and build a tool that can tell real breakage from noise.

## 2. Evidence

**Sample:** 50 npm packages, tested at their latest version: 30 popular ones (express, axios, mongoose, ...) and 20 older or less active ones (request, mkdirp, mysql, ...).

**Naive run (execute every JavaScript snippet):** on Axios 1.20.0, 65 of 77 snippets failed. None of them was broken documentation. Nearly all were fragments that depend on earlier text in the README.

**After fixing the tool** (package names injected, ESM runner, better classification), 43 of 77 still failed. The rest were network calls, relative URLs and examples that demonstrate cancellation. Static API checking found 0 broken references in Axios.

**Static API check on all 50 packages:**

| Batch | Packages | Packages with checkable snippets | Snippets API-checked | Removed or renamed names |
|---|---|---|---|---|
| Popular | 30 | 20 | 212 | 0 |
| Older | 20 | 11 | 58 | 0 |
| Total | 50 | 31 | 270 | 0 |

**Runtime triage:** 26 failures could not be explained automatically. I went through every one by hand (see `triage.md`):

| Outcome | Count |
|---|---|
| Real documentation problem: invalid as written | 3 |
| Real documentation problem: outdated by a platform change | 2 |
| Not a documentation error (needs setup, network, a file, a placeholder, or the library is doing what it should) | 20 |
| False alarm caused by the tool | 1 |

## 3. Root causes of false alarms

Early versions of the tool reported breakage that wasn't there. Each cause was a lesson:

1. **Missing context:** README fragments use variables defined earlier in the text.
2. **Shadowed names:** `(yargs) => yargs.positional()` refers to a callback parameter, not the package.
3. **CommonJS vs ESM:** `require('ws')` and `import 'ws'` expose different shapes.
4. **Browser-style examples:** relative URLs and cancellation demos fail in Node by design.
5. **Continuation snippets:** an example builds on the previous one (`mime.define()` after `new Mime(...)`).
6. **ESM/CommonJS alternatives in one block:** READMEs show `import x from 'x'` and `const x = require('x')` together, separated by "or". A naive check calls that a double declaration. 7 of the 9 packages the first version flagged were this.
7. **Other alternatives in one block:** the same name declared several times with comments like "// Or enable it later" or "The above is equivalent to". All 4 remaining double-declaration hits were this, so they are reported as warnings, never as confirmed breakage.

## 4. Solution

docrot (this repo):

1. Fetches the README for the exact version.
2. Parses each snippet and checks every API it reads from the package against the installed version.
3. Flags snippets that are invalid as written (assignment to a `const`, use before declaration) and warns about blocks that declare the same name twice.
4. Runs the snippet in a temporary folder and classifies failures.
5. Only reports a break as **confirmed** when the evidence is independent of the surrounding README text.

## 5. Findings

| Package | README line | Finding | Type |
|---|---|---|---|
| node-schedule 2.1.1 | 138 | `const x = ...; x = ...` assigns to a constant | Invalid as written. Maintained: confirm on GitHub, open PR changing `const` to `let` |
| request 2.88.2 | 1072 | `const request = request.defaults(...)` uses the name in its own declaration | Invalid as written. Package deprecated, no PR |
| request 2.88.2 | 1081 | `const j = request.jar()` before `const request = ...` | Invalid as written. Package deprecated, no PR |
| request 2.88.2 | 663 | `secureProtocol: 'SSLv3_method'` | Outdated: SSLv3 is disabled in current Node |
| mysql 2.18.1 | 1259 | Port `84943` is out of range, so Node throws a RangeError, not the documented `ECONNREFUSED` | Outdated by platform change. Minor, possible PR |
| node-fetch 3.3.2 | 793 | `new Response(req, { ... }.blob()` is missing a closing parenthesis (should be `}).blob()`) | Typo (syntax error). Found by hand, see below. Maintained: confirm on `main`, open PR |
| mime 4.1.0 | 122 | `mime.define()` | False alarm: `mime` is the custom instance from the previous snippet |

**Invalid-as-written check across all 50 packages (681 JavaScript snippets):**

- **3 confirmed:** node-schedule 138, request 1072, request 1081. All three were also found independently by the runtime triage.
- **4 warnings** for blocks that declare the same name twice: winston (2) and node-fetch (2). Each is the author showing alternatives, so they are not counted as broken, but the block fails if you paste it whole.
- Reading the second node-fetch warning by hand turned up a real typo that the tool could not report, because the duplicate declaration error comes first in the file.

## 6. Limits

- Only JavaScript code blocks in READMEs, not separate docs sites.
- The API check verifies that names exist. It does not catch changed arguments, removed options or changed return values.
- Double declarations are only warnings, and a warning can hide a second error in the same snippet (the node-fetch typo).
- 19 of 50 packages had nothing checkable (examples just call the default export, or use TypeScript).
- Sample of 50 packages, not a random sample of npm.
- Triage verdicts are my reading of each snippet plus its error; a maintainer could disagree on edge cases.
- Snippets run on my machine. Untrusted packages should be tested in a container.

## Next steps

- Open doc-fix PRs: node-schedule (`const` to `let`) and node-fetch (missing `)`), after confirming both on the current `main` branch. The mysql port example is a possible third.
- Resolve import subpaths (`pkg/subpath`) against the package's `exports` map.
- Detect continuation snippets automatically (a snippet that uses a name defined by the previous one).
- Run in CI to flag README drift on every release.
