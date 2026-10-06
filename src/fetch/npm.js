export async function fetchPackage(name, version = 'latest') {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name).replace('%40', '@')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`npm registry returned ${res.status} for "${name}"`);
  const data = await res.json();

  const resolved = data['dist-tags']?.[version] ?? version;
  const meta = data.versions?.[resolved];
  if (!meta) throw new Error(`Version "${version}" not found for "${name}"`);

  const repo = meta.repository?.url ?? data.repository?.url ?? null;
  return {
    name,
    version: resolved,
    readme: await fetchReadme(name, resolved, data.readme),
    repoUrl: repo ? repo.replace(/^git\+/, '').replace(/\.git$/, '') : null,
  };
}

async function fetchReadme(name, version, fallback) {
  for (const file of ['README.md', 'readme.md', 'Readme.md']) {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/${name}@${version}/${file}`);
    if (res.ok) return res.text();
  }
  return fallback ?? '';
}