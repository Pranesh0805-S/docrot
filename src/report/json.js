import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function writeJson(file, data) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}