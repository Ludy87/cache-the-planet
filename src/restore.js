const fs = require("fs");
const c = require("./common");

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

(async () => {
  try {
    const repository = c.input("repository");
    const key = c.scopedKey(c.input("key"));
    const manifest = await c.refs(repository);
    const candidates = [];
    if (
      c.cacheScope() === "auto" &&
      (String(c.input("allow-shared-restore")).toLowerCase() === "true" ||
        c.eventName() !== "pull_request")
    ) {
      candidates.push(c.sharedRestorePrefix(c.input("key")));
    }
    candidates.push(key);
    for (const prefix of c
      .input("restore-keys")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)) {
      if (c.cacheScope() === "auto" && !prefix.startsWith("shared/")) {
        // On auto, prefer a verified shared cache, then use the normal
        // trusted (main/tag) or isolated untrusted (PR) namespace.
        if (
          String(c.input("allow-shared-restore")).toLowerCase() === "true" ||
          c.eventName() !== "pull_request"
        ) {
          candidates.push(c.sharedRestorePrefix(prefix));
        }
      }
      candidates.push(c.scopedRestorePrefix(prefix));
    }
    c.assertTrustedRestoreAllowed(candidates);
    let found = null;

    for (const prefix of candidates) {
      const matches = Object.entries(manifest.json.references)
        .filter(
          ([cacheKey, reference]) =>
            cacheKey === prefix || cacheKey.startsWith(prefix),
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
      setOutput("cache-hit", "false");
      setOutput("matched-key", "");
      c.summary("Cache Restore", {
        Status: "MISS",
        "Requested key": key,
        "Matched key": "—",
      });
      console.log(`Cache miss: no cache found for key: ${key}`);
      return;
    }

    const asset = await c.object(repository, found[1].object);
    if (!asset) {
      setOutput("cache-hit", "false");
      setOutput("matched-key", "");
      c.summary("Cache Restore", {
        Status: "MISS",
        "Requested key": key,
        "Matched key": found[0],
        Asset: "missing",
      });
      console.log(
        `Cache miss: manifest reference has no release asset: key=${found[0]}; object=${found[1].object}`,
      );
      return;
    }

    const archive = await c.download(repository, found[1].object);
    await c.extract(archive);
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

    setOutput("cache-hit", cacheHit);
    setOutput("matched-key", found[0]);
    setOutput("content-hash", found[1].object);
    setOutput("asset-name", asset.name);
    setOutput("cache-size", fs.statSync(archive).size);
    c.summary("Cache Restore", {
      Status: cacheHit ? "HIT" : "FALLBACK",
      "Requested key": key,
      "Matched key": found[0],
      Asset: asset.name,
      "Content hash": found[1].object,
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
})();
