import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(exec);
const NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const VERSION = /^[0-9A-Za-z.+-]+$/;

export async function installPackage(name, version) {
  if (!NAME.test(name) || !VERSION.test(version)) {
    throw new Error('Invalid package name or version');
  }
  const dir = await mkdtemp(join(tmpdir(), 'docrot-'));
  await run('npm init -y', { cwd: dir });
  await run(`npm install ${name}@${version} --ignore-scripts --no-audit --no-fund`, {
    cwd: dir,
    timeout: 120000,
  });
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}