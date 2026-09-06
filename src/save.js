const fs = require("fs");
const c = require("./common");

function saveSummary(status, fields = {}) {
  c.summary("Cache Save", {
    Status: status,
    ...fields,
  });
}

async function cleanupDuplicateAssets(repository, key, keepHash, manifest) {
  if (!key.startsWith("shared/") && !key.startsWith("trusted/")) return;
  const liveHashes = new Set(
    Object.values(manifest.references || {})
      .map((reference) => reference?.object)
      .filter(Boolean),
  );
  const { assets } = await c.assets(repository);
  for (const asset of assets) {
    if (!c.assetMatchesKeyCombination(asset.name, key)) continue;
    const hash = c.hashFromAssetName(asset.name);
    if (!hash || hash === keepHash || liveHashes.has(hash)) continue;
    try {
      await c.deleteObject(repository, hash, false);
      c.log(`removed duplicate cache asset: key=${key}; content-hash=${hash}`);
    } catch (error) {
      c.log(`duplicate cache asset could not be deleted: ${error.message}`);
    }
  }
  c.invalidateRepositoryCache(repository);
}

async function replaceOlderReferences(repository, key) {
  if (!key.startsWith("shared/") && !key.startsWith("trusted/")) {
    return { manifest: null, hashes: [] };
  }
  const parts = key.split("/");
  const combination = parts
    .slice(0, key.startsWith("shared/") ? 5 : 6)
    .join("/");
  const removedHashes = new Set();
  const manifest = await c.updateManifest(
    repository,
    `cache: replace cache references for ${combination}`,
    (next) => {
      removedHashes.clear();
      let changed = false;
      for (const referenceKey of Object.keys(next.references || {})) {
        if (referenceKey === key || !referenceKey.startsWith(`${combination}/`))
          continue;
        const hash = next.references[referenceKey]?.object;
        if (hash) removedHashes.add(hash);
        delete next.references[referenceKey];
        changed = true;
      }
      return changed;
    },
  );
  return { manifest, hashes: [...removedHashes] };
}

async function deleteUnreferencedObjects(repository, hashes, manifest) {
  const liveHashes = new Set(
    Object.values(manifest.references || {})
      .map((reference) => reference?.object)
      .filter(Boolean),
  );
  for (const hash of hashes) {
    if (liveHashes.has(hash)) continue;
    try {
      await c.deleteObject(repository, hash, false);
      c.log(`removed replaced cache asset: content-hash=${hash}`);
    } catch (error) {
      c.log(`replaced cache asset could not be deleted: ${error.message}`);
    }
  }
  c.invalidateRepositoryCache(repository);
}

(async () => {
  try {
    const repository = c.cacheRepository();
    const isFork = c.isForkPullRequest();
    const setOutput = c.setOutput;
    setOutput("is_fork", isFork ? "true" : "false");
    setOutput("read_only", isFork ? "true" : "false");
    const key = c.scopedKey(c.input("key"));
    const isPullRequest = c.isPullRequestEvent();
    const requestedScope = c.input("scope", "auto").trim().toLowerCase();
    if (isFork) {
      c.summary("Cache Save", {
        Status: "SKIPPED",
        Reason: "Fork pull request is read-only",
        "Is fork": "true",
        Encryption: c.encryptionEnabled() ? "enabled" : "disabled",
      });
      c.log(
        "fork pull request: save skipped because write-capable secrets are unavailable",
      );
      return;
    }
    if (
      isPullRequest &&
      String(c.input("allow-pr-cache")).toLowerCase() !== "true"
    ) {
      saveSummary("SKIPPED", { Reason: "Pull request cache saving is disabled" });
      c.log("untrusted pull request: save skipped");
      return;
    }
    if (isPullRequest) {
      const event = JSON.parse(
        fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
      );
      const number = event.pull_request?.number;
      const expectedPrefix = `untrusted/${process.env.GITHUB_REPOSITORY}/pr-${number}/`;
      if (!number || !key.startsWith(expectedPrefix)) {
        throw new Error(`PR cache key must start with ${expectedPrefix}`);
      }
    }

    const trustedKey = key.startsWith("trusted/");
    const untrustedKey = key.startsWith("untrusted/");
    const sharedKey = key.startsWith("shared/");
    const defaultBranch = c.defaultBranch();
    const trustedRef =
      (defaultBranch &&
        process.env.GITHUB_REF === `refs/heads/${defaultBranch}`) ||
      process.env.GITHUB_REF_TYPE === "tag";
    const sharedRef =
      defaultBranch && process.env.GITHUB_REF === `refs/heads/${defaultBranch}`;
    if (!trustedKey && !untrustedKey && !sharedKey) {
      throw new Error(
        "cache key must start with trusted/, untrusted/, or shared/",
      );
    }
    if (trustedKey && !trustedRef) {
      throw new Error(
        "trusted cache keys may only be saved from the repository default branch or tags",
      );
    }
    if (untrustedKey && !isPullRequest) {
      throw new Error(
        "untrusted cache keys may only be saved from pull requests",
      );
    }
    if (sharedKey && !sharedRef) {
      throw new Error(
        "shared cache keys may only be saved from the repository default branch",
      );
    }
    const current = await c.refs(repository);
    const existingReference = current.json.references[key];
    const sharedCounterpart =
      requestedScope === "auto" && trustedKey
        ? c.scopeCounterpartKey(key)
        : null;
    const sharedEquivalent = c.sharedEquivalentKey(key);
    if (sharedEquivalent && current.json.references[sharedEquivalent]?.object) {
      const sharedAsset = await c.object(
        repository,
        current.json.references[sharedEquivalent].object,
      );
      if (sharedAsset) {
        saveSummary("SKIPPED", {
          Reason: "Shared cache already exists",
          "Matched key": sharedEquivalent,
        });
        c.log(
          `shared cache already exists; isolated PR cache publish skipped: key=${sharedEquivalent}`,
        );
        if (process.env.GITHUB_OUTPUT) {
          setOutput("content-hash", current.json.references[sharedEquivalent].object);
          setOutput("asset-name", sharedAsset.name);
        }
        return;
      }
    }
    if (existingReference?.object) {
      const existingAsset = await c.object(
        repository,
        existingReference.object,
      );
      if (!existingAsset) {
        c.log(
          `orphaned cache reference detected for key=${key}; recreating asset`,
        );
      } else {
        saveSummary("SKIPPED", {
          Reason: "Cache already exists",
          "Matched key": key,
        });
        if (sharedCounterpart && !current.json.references[sharedCounterpart]) {
          const updated = await c.setRef(
            repository,
            sharedCounterpart,
            existingReference.object,
            {
              size: existingReference.size,
              source: `linked-from:${key}`,
            },
          );
          await cleanupDuplicateAssets(
            repository,
            sharedCounterpart,
            existingReference.object,
            updated,
          );
          c.log(
            `linked shared cache reference: key=${sharedCounterpart}; source=${key}`,
          );
        }
        const existingAssetName = existingAsset.name;
        c.log(
          `cache already exists for key=${key}; asset=${existingAssetName}`,
        );
        if (process.env.GITHUB_OUTPUT) {
          setOutput("content-hash", existingReference.object);
          setOutput("asset-name", existingAssetName);
        }
        let updated = current.json;
        if (sharedKey || trustedKey) {
          const replacement = await replaceOlderReferences(repository, key);
          updated = replacement.manifest;
          await deleteUnreferencedObjects(
            repository,
            replacement.hashes,
            updated,
          );
        }
        await cleanupDuplicateAssets(
          repository,
          key,
          existingReference.object,
          updated,
        );
        return;
      }
    }

    if (untrustedKey) {
      const combination = c.pullRequestCacheCombination(key);
      const conflictingKey =
        combination &&
        Object.keys(current.json.references).find(
          (referenceKey) =>
            referenceKey !== key &&
            c.pullRequestCacheCombination(referenceKey) === combination,
        );
      if (conflictingKey) {
        const strict = String(c.input("strict")).toLowerCase() === "true";
        if (strict) {
          throw new Error(
            `pull request cache limit reached: only one cache is allowed for ${combination}; existing key=${conflictingKey}`,
          );
        }
        c.log(
          `replacing existing pull request cache: old-key=${conflictingKey}; new-key=${key}`,
        );
        const archive = await c.makeArchive();
        const hash = c.digest(archive.file);
        const existing = await c.object(repository, hash);
        const name = c.assetName(key, hash);
        if (!existing) {
          const release = (await c.assets(repository)).release;
          const uploadUrl = release.upload_url.replace(
            "{?name,label}",
            `?name=${encodeURIComponent(name)}`,
          );
          await c.upload(uploadUrl, archive.file, name, "application/zstd");
          c.invalidateRepositoryCache(repository);
        }
        const updated = await c.replaceRef(
          repository,
          key,
          hash,
          conflictingKey,
          {
            size: fs.statSync(archive.file).size,
          },
        );
        const oldHash = current.json.references[conflictingKey]?.object;
        const stillReferenced =
          oldHash &&
          Object.values(updated.references || {}).some(
            (reference) => reference.object === oldHash,
          );
        if (oldHash && oldHash !== hash && !stillReferenced) {
          try {
            await c.deleteObject(repository, oldHash);
          } catch (error) {
            c.log(`old cache asset could not be deleted: ${error.message}`);
          }
        }
        if (process.env.GITHUB_OUTPUT) {
          setOutput("content-hash", hash);
          setOutput("asset-name", existing?.name || name);
          setOutput("cache-size", fs.statSync(archive.file).size);
        }
        console.log(
          `Cache saved: key=${key}; asset=${existing?.name || name}; content-hash=${hash}`,
        );
        saveSummary("SAVED", {
          Key: key,
          "Asset name": existing?.name || name,
          "Content hash": hash,
        });
        return;
      }
    }

    const relatedKey = c.scopeCounterpartKey(key);
    const relatedReference = relatedKey && current.json.references[relatedKey];
    if (relatedReference?.object) {
      const relatedAsset = await c.object(repository, relatedReference.object);
      if (relatedAsset) {
        let updated = await c.setRef(repository, key, relatedReference.object, {
          size: relatedReference.size,
          source: `linked-from:${relatedKey}`,
        });
        if (sharedKey || trustedKey) {
          const replacement = await replaceOlderReferences(repository, key);
          updated = replacement.manifest;
          await deleteUnreferencedObjects(
            repository,
            replacement.hashes,
            updated,
          );
        }
        await cleanupDuplicateAssets(
          repository,
          key,
          relatedReference.object,
          updated,
        );
        c.log(
          `linked existing cache reference: key=${key}; source=${relatedKey}`,
        );
        if (process.env.GITHUB_OUTPUT) {
          setOutput("content-hash", relatedReference.object);
          setOutput("asset-name", relatedAsset.name);
        }
        saveSummary("SAVED", {
          Key: key,
          "Asset name": relatedAsset.name,
          "Content hash": relatedReference.object,
          "Linked from": relatedKey,
        });
        return;
      }
      c.log(
        `orphaned cache reference detected for key=${relatedKey}; creating asset for ${key}`,
      );
    }

    const archive = await c.makeArchive();
    const hash = c.digest(archive.file);
    const existing = await c.object(repository, hash);
    const name = c.assetName(key, hash);

    if (!existing) {
      const release = (await c.assets(repository)).release;
      try {
        const uploadUrl = release.upload_url.replace(
          "{?name,label}",
          `?name=${encodeURIComponent(name)}`,
        );
        await c.upload(uploadUrl, archive.file, name, "application/zstd");
        c.invalidateRepositoryCache(repository);
        c.log(`uploaded object ${hash}`);
      } catch (error) {
        if (error.status !== 422) throw error;
        c.log(`deduplicated object ${hash}`);
      }
    } else {
      c.log(`object already exists: ${hash}`);
    }

    let updated = await c.setRef(repository, key, hash, {
      size: fs.statSync(archive.file).size,
    });
    if (sharedKey || trustedKey) {
      const replacement = await replaceOlderReferences(repository, key);
      updated = replacement.manifest;
      await deleteUnreferencedObjects(repository, replacement.hashes, updated);
    }
    if (sharedCounterpart) {
      updated = await c.setRef(repository, sharedCounterpart, hash, {
        size: fs.statSync(archive.file).size,
        source: `linked-from:${key}`,
      });
      const replacement = await replaceOlderReferences(
        repository,
        sharedCounterpart,
      );
      updated = replacement.manifest;
      await deleteUnreferencedObjects(repository, replacement.hashes, updated);
      await cleanupDuplicateAssets(
        repository,
        sharedCounterpart,
        hash,
        updated,
      );
      c.log(
        `linked shared cache reference: key=${sharedCounterpart}; source=${key}`,
      );
    }
    await cleanupDuplicateAssets(repository, key, hash, updated);
    if (process.env.GITHUB_OUTPUT) {
      setOutput("content-hash", hash);
      setOutput("asset-name", existing?.name || name);
      setOutput("cache-size", fs.statSync(archive.file).size);
    }
    console.log(
      `Cache saved: key=${key}; asset=${existing?.name || name}; content-hash=${hash}`,
    );
    saveSummary("SAVED", {
      Key: key,
      "Asset name": existing?.name || name,
      "Content hash": hash,
    });
  } catch (error) {
    // Pull-request jobs may receive a valid token without write access to the
    // central cache repository. Saving is optional there, including for
    // scope=shared (which is isolated to the PR namespace).
    if (
      c.isPullRequestEvent() &&
      (error.status === 401 || error.status === 403)
    ) {
      if (process.env.GITHUB_OUTPUT) {
        c.setOutput("read_only", "true");
      }
      saveSummary("SKIPPED", {
        Reason: `Repository access denied (${error.status})`,
      });
      c.log(
        `pull request cache save skipped: repository access denied (${error.status})`,
      );
      return;
    }
    c.fail(error);
  }
})();
