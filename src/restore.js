const fs = require('fs');
const c = require('./common');

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

(async () => {
  try {
    const repository = c.input('repository');
    const key = c.scopedKey(c.input('key'));
    const manifest = await c.refs(repository);
    const candidates = [
      key,
      ...c.input('restore-keys').split(/\r?\n/).map(c.scopedRestorePrefix).filter(Boolean),
    ];
    c.assertTrustedRestoreAllowed(candidates);
    let found = null;

    for (const prefix of candidates) {
      const matches = Object.entries(manifest.json.references)
        .filter(([cacheKey, reference]) =>
          cacheKey === prefix || cacheKey.startsWith(prefix),
        )
        .filter(([, reference]) => reference && reference.object)
        .sort((a, b) => String(b[1].updated_at).localeCompare(String(a[1].updated_at)));
      if (matches.length) {
        found = matches[0];
        break;
      }
    }

    if (!found) {
      setOutput('cache-hit', 'false');
      setOutput('matched-key', '');
      console.log(`Cache miss: no cache found for key: ${key}`);
      return;
    }

    const asset = await c.object(repository, found[1].object);
    if (!asset) {
      setOutput('cache-hit', 'false');
      setOutput('matched-key', '');
      console.log(`Cache miss: manifest reference has no release asset: key=${found[0]}; object=${found[1].object}`);
      return;
    }

    const archive = await c.download(repository, found[1].object);
    c.extract(archive);
    setOutput('cache-hit', found[0] === key);
    setOutput('matched-key', found[0]);
    setOutput('content-hash', found[1].object);
    setOutput('asset-name', asset.name);
    setOutput('cache-size', fs.statSync(archive).size);
    console.log(`Cache found: requested-key=${key}; matched-key=${found[0]}; asset=${asset.name}; exact-hit=${found[0] === key}`);
  } catch (error) {
    c.fail(error);
  }
})();
