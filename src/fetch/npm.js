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
    // the registry stores the README of the latest published version
    readme: data.readme ?? '',
    repoUrl: repo ? repo.replace(/^git\+/, '').replace(/\.git$/, '') : null,
  };
}