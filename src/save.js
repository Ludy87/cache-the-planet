const fs = require('fs');
const c = require('./common');

(async () => {
  try {
    const repository = c.input('repository');
    const isFork = c.isForkPullRequest();
    const setOutput = (name, value) => {
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
      }
    };
    setOutput('is_fork', isFork ? 'true' : 'false');
    setOutput('read_only', isFork ? 'true' : 'false');
    const key = c.scopedKey(c.input('key'));
    const isPullRequest = c.isPullRequestEvent();
    const requestedScope = c.input('scope', 'auto').trim().toLowerCase();
    if (isFork) {
      c.summary('Cache Save', {
        Status: 'SKIPPED',
        Reason: 'Fork pull request is read-only',
        'Is fork': 'true',
      });
      c.log('fork pull request: save skipped because write-capable secrets are unavailable');
      return;
    }
    if (isPullRequest && String(c.input('allow-pr-cache')).toLowerCase() !== 'true') {
      c.log('untrusted pull request: save skipped');
      return;
    }
    if (isPullRequest) {
      const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      const number = event.pull_request?.number;
      const expectedPrefix = `untrusted/${process.env.GITHUB_REPOSITORY}/pr-${number}/`;
      if (!number || !key.startsWith(expectedPrefix)) {
        throw new Error(`PR cache key must start with ${expectedPrefix}`);
      }
    }

    const trustedKey = key.startsWith('trusted/');
    const untrustedKey = key.startsWith('untrusted/');
    const sharedKey = key.startsWith('shared/');
    const defaultBranch = c.defaultBranch();
    const trustedRef = (defaultBranch
      && process.env.GITHUB_REF === `refs/heads/${defaultBranch}`)
      || process.env.GITHUB_REF_TYPE === 'tag';
    const sharedRef = defaultBranch
      && process.env.GITHUB_REF === `refs/heads/${defaultBranch}`;
    if (!trustedKey && !untrustedKey && !sharedKey) {
      throw new Error('cache key must start with trusted/, untrusted/, or shared/');
    }
    if (trustedKey && !trustedRef) {
      throw new Error('trusted cache keys may only be saved from the repository default branch or tags');
    }
    if (untrustedKey && !isPullRequest) {
      throw new Error('untrusted cache keys may only be saved from pull requests');
    }
    if (sharedKey && !sharedRef) {
      throw new Error('shared cache keys may only be saved from the repository default branch');
    }
    const current = await c.refs(repository);
    const existingReference = current.json.references[key];
    const sharedCounterpart = requestedScope === 'auto' && trustedKey
      ? c.scopeCounterpartKey(key)
      : null;
    const sharedEquivalent = c.sharedEquivalentKey(key);
    if (sharedEquivalent && current.json.references[sharedEquivalent]?.object) {
      const sharedAsset = await c.object(repository, current.json.references[sharedEquivalent].object);
      if (sharedAsset) {
        c.log(`shared cache already exists; isolated PR cache publish skipped: key=${sharedEquivalent}`);
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `content-hash=${current.json.references[sharedEquivalent].object}\nasset-name=${sharedAsset.name}\n`,
          );
        }
        return;
      }
    }
    if (existingReference?.object) {
      const existingAsset = await c.object(repository, existingReference.object);
      if (!existingAsset) {
        c.log(`orphaned cache reference detected for key=${key}; recreating asset`);
      } else {
        if (sharedCounterpart && !current.json.references[sharedCounterpart]) {
          await c.setRef(repository, sharedCounterpart, existingReference.object, {
            size: existingReference.size,
            source: `linked-from:${key}`,
          });
          c.log(`linked shared cache reference: key=${sharedCounterpart}; source=${key}`);
        }
        const existingAssetName = existingAsset.name;
        c.log(`cache already exists for key=${key}; asset=${existingAssetName}`);
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `content-hash=${existingReference.object}\nasset-name=${existingAssetName}\n`,
          );
        }
        return;
      }
    }

    if (untrustedKey) {
      const combination = c.pullRequestCacheCombination(key);
      const conflictingKey = combination && Object.keys(current.json.references).find((referenceKey) => (
        referenceKey !== key
        && c.pullRequestCacheCombination(referenceKey) === combination
      ));
      if (conflictingKey) {
        const strict = String(c.input('strict')).toLowerCase() === 'true';
        if (strict) {
          throw new Error(
            `pull request cache limit reached: only one cache is allowed for ${combination}; existing key=${conflictingKey}`,
          );
        }
        c.log(`replacing existing pull request cache: old-key=${conflictingKey}; new-key=${key}`);
        const archive = await c.makeArchive();
        const hash = c.digest(archive.file);
        const existing = await c.object(repository, hash);
        const name = c.assetName(key, hash);
        if (!existing) {
          const release = (await c.assets(repository)).release;
          const uploadUrl = release.upload_url.replace(
            '{?name,label}',
            `?name=${encodeURIComponent(name)}`,
          );
          await c.upload(uploadUrl, archive.file, name, 'application/zstd');
        }
        const updated = await c.replaceRef(repository, key, hash, conflictingKey, {
          size: fs.statSync(archive.file).size,
        });
        const oldHash = current.json.references[conflictingKey]?.object;
        const stillReferenced = oldHash && Object.values(updated.references || {})
          .some((reference) => reference.object === oldHash);
        if (oldHash && oldHash !== hash && !stillReferenced) {
          try { await c.deleteObject(repository, oldHash); }
          catch (error) { c.log(`old cache asset could not be deleted: ${error.message}`); }
        }
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `content-hash=${hash}\nasset-name=${existing?.name || name}\ncache-size=${fs.statSync(archive.file).size}\n`,
          );
        }
        console.log(`Cache saved: key=${key}; asset=${existing?.name || name}; content-hash=${hash}`);
        return;
      }
    }

    const relatedKey = c.scopeCounterpartKey(key);
    const relatedReference = relatedKey && current.json.references[relatedKey];
    if (relatedReference?.object) {
      const relatedAsset = await c.object(repository, relatedReference.object);
      if (relatedAsset) {
        await c.setRef(repository, key, relatedReference.object, {
          size: relatedReference.size,
          source: `linked-from:${relatedKey}`,
        });
        c.log(`linked existing cache reference: key=${key}; source=${relatedKey}`);
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `content-hash=${relatedReference.object}\nasset-name=${relatedAsset.name}\n`,
          );
        }
        return;
      }
      c.log(`orphaned cache reference detected for key=${relatedKey}; creating asset for ${key}`);
    }

    const archive = await c.makeArchive();
    const hash = c.digest(archive.file);
    const existing = await c.object(repository, hash);
    const name = c.assetName(key, hash);

    if (!existing) {
      const release = (await c.assets(repository)).release;
      try {
        const uploadUrl = release.upload_url.replace(
          '{?name,label}',
          `?name=${encodeURIComponent(name)}`,
        );
        await c.upload(uploadUrl, archive.file, name, 'application/zstd');
        c.log(`uploaded object ${hash}`);
      } catch (error) {
        if (error.status !== 422) throw error;
        c.log(`deduplicated object ${hash}`);
      }
    } else {
      c.log(`object already exists: ${hash}`);
    }

    await c.setRef(repository, key, hash, {
      size: fs.statSync(archive.file).size,
    });
    if (sharedCounterpart) {
      await c.setRef(repository, sharedCounterpart, hash, {
        size: fs.statSync(archive.file).size,
        source: `linked-from:${key}`,
      });
      c.log(`linked shared cache reference: key=${sharedCounterpart}; source=${key}`);
    }
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `content-hash=${hash}\nasset-name=${existing?.name || name}\ncache-size=${fs.statSync(archive.file).size}\n`,
      );
    }
    console.log(`Cache saved: key=${key}; asset=${existing?.name || name}; content-hash=${hash}`);
  } catch (error) {
    c.fail(error);
  }
})();
