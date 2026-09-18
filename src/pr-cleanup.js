const c = require("./common");
const { INPUTS } = require("./constants");

(async () => {
  try {
    const repository = c.cacheRepository();
    const sourceRepository =
      process.env.PR_REPOSITORY || c.input(INPUTS.PR_REPOSITORY);
    const number = process.env.PR_NUMBER || c.input(INPUTS.PR_NUMBER);
    if (!repository || !sourceRepository || !number) {
      throw new Error(
        "cache repository, PR_REPOSITORY and PR_NUMBER are required",
      );
    }
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(sourceRepository)) {
      throw new Error("PR_REPOSITORY must be an owner/name repository");
    }
    if (!/^\d+$/.test(String(number)) || Number(number) < 1) {
      throw new Error("PR_NUMBER must be a positive integer");
    }

    const prefix = `untrusted/${sourceRepository}/pr-${number}/`;
    let removed = [];
    let deletedAssets = 0;
    // PR manifests are split by number now, but older versions could leave
    // references in another untrusted manifest. Inspect all manifests so a
    // cleanup cannot silently report success while the cache still exists.
    const all = await c.refsAll(repository, { fresh: true });
    const matchingByPath = new Map();
    for (const [key, reference, filePath] of all.entries) {
      if (!key.startsWith(prefix)) continue;
      if (!matchingByPath.has(filePath)) matchingByPath.set(filePath, []);
      matchingByPath.get(filePath).push([key, reference]);
    }

    for (const [filePath, matches] of matchingByPath) {
      await c.updateManifest(
        repository,
        `cache: remove closed PR ${sourceRepository}#${number}`,
        (manifest) => {
          for (const [key] of matches) delete manifest.references[key];
          removed.push(...matches);
          return matches.length > 0;
        },
        { filePath },
      );
    }

    const updatedManifest = await c.refsAll(repository, { fresh: true });

    const live = new Set(
      Object.values(updatedManifest.json.references).map(
        (reference) => reference.object,
      ),
    );
    const assetPrefix = prefix.replace(/[^A-Za-z0-9._-]+/g, "-");
    const assets = (await c.assets(repository)).assets;
    for (const asset of assets.filter((item) =>
      item.name.endsWith(".tar.zst"),
    )) {
      const hash = c.hashFromAssetName(asset.name);
      if (!hash) continue;
      const belongsToClosedPr = asset.name.startsWith(assetPrefix);
      if (
        !live.has(hash) &&
        (removed.some(([, reference]) => reference.object === hash) ||
          belongsToClosedPr)
      ) {
        await c.gh(`/repos/${repository}/releases/assets/${asset.id}`, {
          method: "DELETE",
        });
        deletedAssets += 1;
        console.log(`deleted PR cache asset ${asset.name}`);
      }
    }
    console.log(
      `removed ${removed.length} references for ${sourceRepository}#${number}`,
    );
    c.setOutput("removed-references", removed.length);
    c.setOutput("deleted-assets", deletedAssets);
  } catch (error) {
    c.fail(error);
  }
})();
