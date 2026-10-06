import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';

const ESM = /^\s*(import\s.+from|import\s*['"]|export\s)/m;

function safeEnv() {
  const { PATH, Path, SystemRoot, TEMP, TMP } = process.env;
  return { PATH: PATH ?? Path, SystemRoot, TEMP, TMP };
}

export async function runSnippet(dir, snippet, index, timeoutMs = 10000) {
  const file = `snippet-${index}${ESM.test(snippet.code) ? '.mjs' : '.cjs'}`;
  await writeFile(join(dir, file), snippet.code);

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