import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';

function safeEnv() {
  const { PATH, Path, SystemRoot, TEMP, TMP } = process.env;
  return { PATH: PATH ?? Path, SystemRoot, TEMP, TMP };
}

function aliasOf(name) {
  return name.replace(/^@[^/]+\//, '').replace(/[-.](\w)/g, (_, c) => c.toUpperCase());
}

// Snippets are README fragments, so give them the names the docs assume:
// the package's default export (e.g. `axios`) and its named exports (e.g. `AxiosHeaders`).
function buildSource(code, pkgName) {
  let pre = "import { createRequire } from 'node:module';\n";
  pre += 'const require = createRequire(import.meta.url);\n';
  if (pkgName) {
    pre += `import * as __m from '${pkgName}';\n`;
    pre += 'for (const [k, v] of Object.entries(__m)) if (k !== "default" && !(k in globalThis)) globalThis[k] = v;\n';
    pre += `if (!(${JSON.stringify(aliasOf(pkgName))} in globalThis)) globalThis[${JSON.stringify(aliasOf(pkgName))}] = __m.default ?? __m;\n`;
  }
  return pre + code;
}

export async function runSnippet(dir, snippet, index, ctx = {}, timeoutMs = 10000) {
  const file = `snippet-${index}.mjs`;
  await writeFile(join(dir, file), buildSource(snippet.code, ctx.name ?? ''));

  return new Promise((resolve) => {
    const started = Date.now();
    execFile(
      process.execPath,
      [file],
      { cwd: dir, timeout: timeoutMs, env: safeEnv(), windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        const ms = Date.now() - started;
        const tail = String(stderr).slice(0, 2000);
        if (!err) return resolve({ status: 'pass', ms, stderr: '' });
        if (err.killed) return resolve({ status: 'timeout', ms, stderr: tail });
        resolve({ status: 'fail', ms, stderr: tail });
      }
    );
  });
}