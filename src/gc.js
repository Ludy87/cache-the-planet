const c = require("./common");

(async () => {
  try {
    const repository = process.env.CACHE_REPOSITORY || c.input("repository");
    const requestedMode = process.env.GC_MODE || "";
    const mode = process.argv.includes("--all")
      ? "all"
      : process.argv.includes("--object")
        ? "object"
        : requestedMode || "orphan";
    const objectValue = process.env.GC_OBJECT || "";
    const dryRun =
      process.argv.includes("--dry-run") || process.env.DRY_RUN !== "false";
    const gracePeriod = Number(process.env.GRACE_DAYS || 7) * 86400000;
    const untrustedTtl =
      Number(process.env.UNTRUSTED_TTL_HOURS || 24) * 3600000;
    const expireAllUntrusted = process.env.GC_EXPIRE_ALL_UNTRUSTED === "true";
    const deleteShared =
      process.env.GITHUB_EVENT_NAME === "workflow_dispatch" &&
      process.env.GC_DELETE_SHARED === "true";
    const manifest = await c.refs(repository);
    const references = manifest.json.references;
    const liveObjects = new Set(
      Object.values(references).map((reference) => reference.object),
    );
    const allAssets = (await c.assets(repository)).assets;
    const now = Date.now();
    const cacheAssets = allAssets.filter((item) =>
      item.name.endsWith(".tar.zst"),
    );

    if (mode === "expired") {
      const isDeletableKey = (key) =>
        key.startsWith("untrusted/") ||
        (deleteShared && key.startsWith("shared/"));
      const expired = expireAllUntrusted
        ? Object.entries(references).filter(([key]) => isDeletableKey(key))
        : c.expiredUntrustedReferences(references, now, untrustedTtl);
      const expiredHashes = new Set(
        expired.map(([, reference]) => reference.object),
      );
      if (expired.length && !dryRun) {
        await c.updateManifest(
          repository,
          "cache: expire untrusted references",
          (current) => {
            let changed = false;
            const candidates = expireAllUntrusted
              ? Object.entries(current.references).filter(([key]) =>
                  isDeletableKey(key),
                )
              : c.expiredUntrustedReferences(
                  current.references,
                  Date.now(),
                  untrustedTtl,
                );
            for (const [key] of candidates) {
              delete current.references[key];
              changed = true;
            }
            return changed;
          },
        );
      }
      if (dryRun && expired.length)
        console.log(
          `would remove ${expired.length} expired untrusted reference(s)`,
        );
      const liveAfterExpiry = new Set(
        Object.values(
          dryRun ? references : (await c.refs(repository)).json.references,
        ).map((reference) => reference.object),
      );
      for (const asset of cacheAssets) {
        const hash = c.hashFromAssetName(asset.name);
        const isUntrustedAsset = asset.name.startsWith("untrusted-");
        const isSharedAsset = asset.name.startsWith("shared-");
        const assetCreatedAt = Date.parse(asset.created_at);
        const oldEnough =
          Number.isFinite(assetCreatedAt) &&
          now - assetCreatedAt >= untrustedTtl;
        if (
          !hash ||
          liveAfterExpiry.has(hash) ||
          (!(expiredHashes.has(hash) || (isUntrustedAsset && oldEnough)) &&
            !(
              expireAllUntrusted &&
              (isUntrustedAsset || (deleteShared && isSharedAsset))
            ))
        )
          continue;
        console.log(`${dryRun ? "would delete" : "delete"} ${asset.name}`);
        if (!dryRun)
          await c.gh(`/repos/${repository}/releases/assets/${asset.id}`, {
            method: "DELETE",
          });
      }
      return;
    }

    if (mode === "all") {
      for (const asset of cacheAssets) {
        console.log(`${dryRun ? "would delete" : "delete"} ${asset.name}`);
        if (!dryRun)
          await c.gh(`/repos/${repository}/releases/assets/${asset.id}`, {
            method: "DELETE",
          });
      }
      if (Object.keys(references).length && !dryRun) {
        await c.updateManifest(
          repository,
          "cache: clear all references",
          (current) => {
            if (!Object.keys(current.references).length) return false;
            current.references = {};
            return true;
          },
        );
      }
      if (mode === "all" && dryRun && Object.keys(references).length) {
        console.log(
          `would clear ${Object.keys(references).length} manifest reference(s)`,
        );
      }
      return;
    }

    if (mode === "object") {
      if (!objectValue)
        throw new Error("GC_OBJECT is required when mode=object");
      const hash = objectValue.startsWith("sha256:")
        ? objectValue
        : /^[a-f0-9]{64}$/i.test(objectValue)
          ? `sha256:${objectValue}`
          : c.hashFromAssetName(objectValue);
      if (!hash)
        throw new Error(
          "GC_OBJECT must be a sha256 hash or cache asset filename",
        );
      const asset = cacheAssets.find(
        (item) => c.hashFromAssetName(item.name) === hash,
      );
      if (asset) {
        console.log(`${dryRun ? "would delete" : "delete"} ${asset.name}`);
        if (!dryRun)
          await c.gh(`/repos/${repository}/releases/assets/${asset.id}`, {
            method: "DELETE",
          });
      } else {
        console.log(`object not found: ${hash}`);
      }
      const matchingKeys = Object.entries(references)
        .filter(([, reference]) => reference.object === hash)
        .map(([key]) => key);
      if (matchingKeys.length && !dryRun) {
        await c.updateManifest(
          repository,
          `cache: remove object ${hash}`,
          (current) => {
            let changed = false;
            for (const key of matchingKeys) {
              if (current.references[key]?.object === hash) {
                delete current.references[key];
                changed = true;
              }
            }
            return changed;
          },
        );
      }
      if (dryRun && matchingKeys.length)
        console.log(
          `would remove ${matchingKeys.length} manifest reference(s)`,
        );
      return;
    }

    for (const asset of cacheAssets) {
      const hash = c.hashFromAssetName(asset.name);
      if (!hash) continue;
      const oldEnough =
        now - new Date(asset.created_at).getTime() > gracePeriod;
      if (!liveObjects.has(hash) && oldEnough) {
        console.log(`${dryRun ? "would delete" : "delete"} ${asset.name}`);
        if (!dryRun) {
          await c.gh(`/repos/${repository}/releases/assets/${asset.id}`, {
            method: "DELETE",
          });
        }
      }
    }
  } catch (error) {
    c.fail(error);
  }
})();
