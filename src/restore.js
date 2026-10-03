const fs = require("fs");
const c = require("./common");
const { INPUTS } = require("./constants");

let temporaryArchive;

(async () => {
  try {
    const storage = c.storageMode();
    c.recordInitiatingStorage(storage);
    const isFork = c.isForkPullRequest();
    c.setOutput("is-fork", isFork ? "true" : "false");
    c.setOutput("read-only", isFork ? "true" : "false");
    const downloadDisabled = c.cacheDownloadDisabled();
    const repository = c.cacheRepository();
    const key = c.scopedKey(c.input(INPUTS.KEY));
    const candidates = [];
    if (
      c.cacheScope() === "auto" &&
      (String(c.input(INPUTS.ALLOW_SHARED_RESTORE)).toLowerCase() === "true" ||
        c.eventName() !== "pull_request")
    ) {
      candidates.push(c.sharedRestorePrefix(c.input(INPUTS.KEY)));
    }
    candidates.push(key);
    for (const prefix of c
      .input(INPUTS.RESTORE_KEYS)
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)) {
      if (c.cacheScope() === "auto" && !prefix.startsWith("shared/")) {
        // On auto, prefer a verified shared cache, then use the normal
        // trusted (main/tag) or isolated untrusted (PR) namespace.
        if (
          String(c.input(INPUTS.ALLOW_SHARED_RESTORE)).toLowerCase() ===
            "true" ||
          c.eventName() !== "pull_request"
        ) {
          candidates.push(c.sharedRestorePrefix(prefix));
        }
      }
      candidates.push(c.scopedRestorePrefix(prefix));
    }
    c.assertTrustedRestoreAllowed(candidates);
    const manifest = await c.refsForKeys(repository, candidates);
    let found = null;

    for (const prefix of candidates) {
      const matches = Object.entries(manifest.json.references)
        .filter(
          ([cacheKey, reference]) =>
            (cacheKey === prefix || cacheKey.startsWith(prefix)) &&
            reference.storage === c.storageMode(),
        )
        .filter(([, reference]) => reference && reference.object)
        .sort((a, b) =>
          String(b[1].updated_at).localeCompare(String(a[1].updated_at)),
        );
      if (matches.length) {
        found = matches[0];
        break;
      }
    }

    if (!found) {
      c.setOutput("cache-hit", "false");
      c.setOutput("matched-key", "");
      c.summary("Cache Restore", {
        Status: "MISS",
        "Requested key": key,
        "Matched key": "—",
        Encryption: c.encryptionEnabled() ? "enabled" : "disabled",
      });
      console.log(`Cache miss: no cache found for key: ${key}`);
      return;
    }

    const asset = c.storageMode && ["github-branch", "github-artifact"].includes(c.storageMode())
      ? await c.probeObject(repository, found[1])
      : downloadDisabled
        ? await c.probeObject(repository, found[1])
        : await c.object(repository, found[1].object);
    if (!asset) {
      c.setOutput("cache-hit", "false");
      c.setOutput("matched-key", "");
      c.summary("Cache Restore", {
        Status: "MISS",
        "Requested key": key,
        "Matched key": found[0],
        Asset: "missing",
        Encryption: c.encryptionEnabled() ? "enabled" : "disabled",
      });
      console.log(
        `Cache miss: manifest reference has no release asset: key=${found[0]}; object=${found[1].object}`,
      );
      return;
    }

    if (c.storageMode && c.storageMode() === "github-branch") {
      const branchPath = found[1].path
        ? `${c.manifestPath()}/objects/v1/${found[1].path}/${found[1].object.slice(7)}`
        : `${c.manifestPath()}/objects/v1/${found[1].object.slice(7)}`;
      c.log(`📍 Branch cache object path: ${branchPath}/part-000000`);
    }

    let archive;
    if (!downloadDisabled && c.storageMode && c.storageMode() === "github-artifact") {
      archive = found[1].parts
        ? await c.downloadArtifactParts(found[1])
        : await c.downloadArtifactObject(found[1]);
    } else if (!downloadDisabled && c.storageMode && c.storageMode() === "github-branch") {
      if (!Array.isArray(found[1].parts)) {
        c.setOutput("cache-hit", "false");
        c.setOutput("matched-key", "");
        c.log(`Cache miss: branch reference has no part list: key=${found[0]}`);
        return;
      }
      archive = await c.downloadBranchObject(repository, found[1]);
    } else if (!downloadDisabled) {
      archive = await c.download(repository, found[1].object);
    }
    temporaryArchive = archive;
    if (!downloadDisabled) await c.extract(archive);
    const cacheIdentity = (value) => {
      const parts = value.split("/");
      if (parts[0] === "shared") return parts.slice(3).join("/");
      if (parts[0] === "trusted") return parts.slice(4).join("/");
      // untrusted/<owner>/<repo>/pr-<number>/<cache-name>/...
      // The logical cache identity starts at <cache-name> (index 4).
      if (parts[0] === "untrusted") return parts.slice(4).join("/");
      return value;
    };
    const cacheHit =
      found[0] === key ||
      (found[0].startsWith("shared/") &&
        cacheIdentity(found[0]) === cacheIdentity(key));

    c.setOutput("cache-hit", cacheHit);
    c.setOutput("matched-key", found[0]);
    c.setOutput("content-hash", found[1].object);
    c.setOutput("asset-name", asset.name);
    c.setOutput("cache-size", downloadDisabled ? asset.size : fs.statSync(archive).size);
    c.summary("Cache Restore", {
      Status: cacheHit ? "HIT" : "FALLBACK",
      Download: downloadDisabled ? "disabled (existence check only)" : "completed",
      "Requested key": key,
      "Matched key": found[0],
      Asset: asset.name,
      "Content hash": found[1].object,
      Encryption: c.encryptionEnabled() ? "enabled" : "disabled",
    });
    console.log(`Cache found:`);
    console.log(`requested-key=${key};`);
    console.log(`matched-key=${found[0]};`);
    console.log(`asset=${asset.name};`);
    console.log(`exact-hit=${found[0] === key};`);
    console.log(`cache-hit=${cacheHit}`);
  } catch (error) {
    c.fail(error);
  }
})()
  .finally(() => {
    c.removeTemporaryFile(temporaryArchive);
    return c.closeSftp();
  });
