const c = require('./common');

(async () => {
  try {
    const repository = process.env.CACHE_REPOSITORY || c.input('repository');
    const sourceRepository = process.env.PR_REPOSITORY;
    const number = process.env.PR_NUMBER;
    if (!repository || !sourceRepository || !number) {
      throw new Error('CACHE_REPOSITORY, PR_REPOSITORY and PR_NUMBER are required');
    }
    const prefix = `untrusted/${sourceRepository}/pr-${number}/`;
    let removed = [];
    const updatedManifest = await c.updateManifest(
      repository,
      `cache: remove closed PR ${sourceRepository}#${number}`,
      (manifest) => {
        removed = Object.entries(manifest.references).filter(([key]) => key.startsWith(prefix));
        for (const [key] of removed) delete manifest.references[key];
        return removed.length > 0;
      },
    );
    const live = new Set(Object.values(updatedManifest.references).map((reference) => reference.object));
    const assetPrefix = prefix.replace(/[^A-Za-z0-9._-]+/g, '-');
    const assets = (await c.assets(repository)).assets;
    for (const asset of assets.filter((item) => item.name.endsWith('.tar.zst'))) {
      const hash = c.hashFromAssetName(asset.name);
      if (!hash) continue;
      const belongsToClosedPr = asset.name.startsWith(assetPrefix);
      if (!live.has(hash) && (removed.some(([, reference]) => reference.object === hash)
        || belongsToClosedPr)) {
        await c.gh(`/repos/${repository}/releases/assets/${asset.id}`, { method: 'DELETE' });
        console.log(`deleted PR cache asset ${asset.name}`);
      }
    }
    console.log(`removed ${removed.length} references for ${sourceRepository}#${number}`);
  } catch (error) { c.fail(error); }
})();
