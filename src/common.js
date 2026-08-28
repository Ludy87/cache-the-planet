const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const cp = require('child_process');

const apiVersion = '2022-11-28';
const encryptionMagic = Buffer.from('CTPENC1\0');
const maxCompressedBytes = Number(process.env.CACHE_MAX_COMPRESSED_BYTES || 2 * 1024 ** 3);
const maxTarBytes = Number(process.env.CACHE_MAX_TAR_BYTES || 8 * 1024 ** 3);
const maxArchiveEntries = Number(process.env.CACHE_MAX_ENTRIES || 200000);
const maxArchivePathLength = 4096;

function input(name, defaultValue = '') {
  const variable = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  return process.env[variable] ?? defaultValue;
}

function token() {
  return input('token') || process.env.GITHUB_TOKEN || process.env.ACTIONS_RUNTIME_TOKEN;
}

function eventName() {
  return process.env.GITHUB_EVENT_NAME || '';
}

function repository() {
  return process.env.GITHUB_REPOSITORY || '';
}

function defaultBranch() {
  if (process.env.GITHUB_DEFAULT_BRANCH) return process.env.GITHUB_DEFAULT_BRANCH;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      return JSON.parse(fs.readFileSync(eventPath, 'utf8')).repository?.default_branch || '';
    } catch {
      return '';
    }
  }
  return '';
}

function headRef() {
  return process.env.GITHUB_HEAD_REF || '';
}

function baseRef() {
  return process.env.GITHUB_BASE_REF || '';
}

function isCompleteCacheKey(key) {
  return /^(?:trusted\/[^/]+\/[^/]+\/[^/]+|untrusted\/[^/]+\/[^/]+\/pr-[1-9]\d*)\/[^/]+\/[^/]+-[^/]+\/[^/]+\/v1$/.test(key);
}

function cacheName() {
  const value = input('cache-name').trim();
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(value)) {
    throw new Error('cache-name is required and must contain only lowercase letters, numbers, or hyphens');
  }
  return value;
}

function validateRestorePrefix(key) {
  const parts = key.replace(/\/$/, '').split('/');
  const validPart = (part) => /^[A-Za-z0-9._-]+$/.test(part) && part !== '..' && part !== '.';
  const validNamespace = parts[0] === 'trusted'
    ? parts.length >= 5 && validPart(parts[1]) && validPart(parts[2]) && validPart(parts[3])
    : parts[0] === 'untrusted'
      && parts.length >= 5 && validPart(parts[1]) && validPart(parts[2]) && /^pr-[1-9]\d*$/.test(parts[3]);
  if (!validNamespace || parts.some((part) => !validPart(part))) {
    throw new Error('restore-keys contains a value outside the trusted/untrusted schema');
  }
  return key;
}

function refName() {
  return process.env.GITHUB_REF_NAME || '';
}

function pullRequestNumber() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const number = JSON.parse(fs.readFileSync(eventPath, 'utf8')).pull_request?.number;
      if (Number.isInteger(number) && number > 0) return number;
    } catch {
      // Fall through to the ref-based fallback below.
    }
  }
  const match = (process.env.GITHUB_REF || '').match(/^refs\/pull\/([1-9]\d*)\/merge$/);
  return match ? Number(match[1]) : null;
}

function scopedKey(key) {
  if (!key) return key;
  const name = cacheName();
  if (key.startsWith('trusted/') || key.startsWith('untrusted/')) {
    if (!isCompleteCacheKey(key)) {
      throw new Error('cache key does not match the trusted/untrusted schema');
    }
    return key;
  }
  const logicalKey = key.startsWith(`${name}/`) ? key : `${name}/${key}`;
  const sourceRepository = repository();
  if (eventName() === 'pull_request' || process.env.GITHUB_REF?.includes('/pull/')) {
    const number = pullRequestNumber();
    if (!sourceRepository || !number) throw new Error('repository and pull request number are required for an automatic PR cache key');
    return `untrusted/${sourceRepository}/pr-${number}/${logicalKey}`;
  }
  if (!sourceRepository) throw new Error('GITHUB_REPOSITORY is required for an automatic cache key');
  const branch = defaultBranch();
  if (!branch) throw new Error('repository default branch is required for an automatic trusted cache key');
  return `trusted/${sourceRepository}/${branch}/${logicalKey}`;
}

function scopedRestorePrefix(prefix) {
  const value = prefix.trim();
  if (!value) return value;
  if (value.startsWith('trusted/') || value.startsWith('untrusted/')) return validateRestorePrefix(value);
  const name = cacheName();
  const logicalKey = value.startsWith(`${name}/`) ? value : `${name}/${value}`;
  const logicalParts = logicalKey.replace(/\/$/, '').split('/');
  if (!logicalParts.length || logicalParts.some((part) => !/^[A-Za-z0-9._-]+$/.test(part))) {
    throw new Error('restore-keys contains invalid path components');
  }
  const sourceRepository = repository();
  if (!sourceRepository) throw new Error('GITHUB_REPOSITORY is required for an automatic restore key');
  if (eventName() === 'pull_request' || process.env.GITHUB_REF?.includes('/pull/')) {
    const number = pullRequestNumber();
    if (!number) throw new Error('pull request number is required for an automatic restore key');
    return `untrusted/${sourceRepository}/pr-${number}/${logicalKey}`;
  }
  const branch = defaultBranch();
  if (!branch) throw new Error('repository default branch is required for an automatic restore key');
  return `trusted/${sourceRepository}/${branch}/${logicalKey}`;
}

function assertTrustedRestoreAllowed(keys) {
  const isPullRequest = eventName() === 'pull_request' || process.env.GITHUB_REF?.includes('/pull/');
  if (isPullRequest && keys.some((key) => key.startsWith('trusted/'))) {
    throw new Error('pull requests may not restore trusted cache keys');
  }
}

function log(message) {
  console.log(`::notice::${message}`);
}

function fail(error) {
  if (String(input('strict')).toLowerCase() !== 'true') {
    console.log(`::warning::cache ignored: ${error.message || error}`);
    return false;
  }
  throw error;
}

async function gh(url, options = {}) {
  const response = await fetch(`https://api.github.com${url}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': apiVersion,
      Authorization: `Bearer ${token()}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`${response.status} ${body.message || text}`);
    error.status = response.status;
    error.headers = response.headers;
    throw error;
  }
  return { body, headers: response.headers };
}

async function upload(url, file, name, contentType) {
  const bytes = fs.readFileSync(file);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': contentType,
      'Content-Length': bytes.length,
      'X-GitHub-Api-Version': apiVersion,
    },
    body: bytes,
  });
  if (response.ok) return JSON.parse(await response.text());
  const error = new Error(`${response.status} ${await response.text()}`);
  error.status = response.status;
  throw error;
}

function run(command, args) {
  return cp.execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
}

function have(command) {
  try { run(command, ['--version']); return true; } catch { return false; }
}

function entries() {
  return input('path').split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

function encryptionKey() {
  const value = input('encryption-key');
  if (!value) return null;
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function encryptFile(file) {
  const key = encryptionKey();
  if (!key) return file;
  const plaintext = fs.readFileSync(file);
  // Deriving the nonce from the compressed content keeps identical encrypted
  // caches deduplicable while remaining unique for different content.
  const nonce = crypto.createHash('sha256').update(plaintext).digest().subarray(0, 12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const encrypted = `${file}.enc`;
  fs.writeFileSync(encrypted, Buffer.concat([encryptionMagic, nonce, cipher.getAuthTag(), ciphertext]));
  fs.unlinkSync(file);
  fs.renameSync(encrypted, file);
  return file;
}

function decryptFile(file) {
  const inputBuffer = fs.readFileSync(file);
  if (!inputBuffer.subarray(0, encryptionMagic.length).equals(encryptionMagic)) return file;
  const key = encryptionKey();
  if (!key) throw new Error('encrypted cache requires the encryption-key input');
  const offset = encryptionMagic.length;
  const nonce = inputBuffer.subarray(offset, offset + 12);
  const tag = inputBuffer.subarray(offset + 12, offset + 28);
  const ciphertext = inputBuffer.subarray(offset + 28);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const decrypted = `${file}.decrypted`;
    fs.writeFileSync(decrypted, plaintext);
    return decrypted;
  } catch {
    throw new Error('encrypted cache could not be decrypted; check encryption-key');
  }
}

// Cache inputs are treated as untrusted. Refuse obvious credentials before tar
// ever sees them, and refuse symlinks so an apparently harmless cache path
// cannot unexpectedly include data outside the workspace.
const sensitiveName = /^(?:\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|\.git-credentials|credentials?(?:[._-].*)?|id_(?:rsa|dsa|ecdsa|ed25519))$/i;
const sensitiveKeywordName = /(^|[-_.])(secret|secrets|token|tokens|password|passwd)([-_.]|$)|\.(key|p12|pfx)$/i;
const sourceFileName = /\.(?:py|js|mjs|cjs|ts|tsx|java|go|rs|c|cc|cpp|h|hpp|rb|php|cs|swift|kt|kts|scala|sh)$/i;
const binaryFileName = /\.(?:7z|aar|bin|class|dll|dylib|exe|gz|iso|jar|jpeg|jpg|pyc|so|tar|tgz|war|webp|zip|zst)$/i;
const packageMetadataPath = /(?:^|[\\/])[^\\/]+\.(?:dist-info|egg-info)(?:[\\/]|$)/i;
const npmIndexPath = /(?:^|[\\/])_cacache[\\/]index-v\d+(?:[\\/]|$)/i;
const sensitiveDirectory = /(^|[\\/])(?:\.ssh|\.aws|\.docker|\.kube)(?:[\\/]|$)/i;
const virtualEnvironmentPath = /(^|[\\/])\.venv(?:[\\/]|$)/i;
const privateKeyContent = /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i;
const knownTokenContent = /(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/i;
const credentialAssignment = /(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*(?:"[^"\r\n]{8,}"|'[^'\r\n]{8,}'|[A-Za-z0-9_+/=.-]{20,})/i;

function securityScan(root) {
  const walk = (file) => {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) {
      const target = path.resolve(path.dirname(file), fs.readlinkSync(file));
      const targetRelative = path.relative(root, target);
      if (path.isAbsolute(targetRelative) || targetRelative === '..'
        || targetRelative.startsWith(`..${path.sep}`)) {
        throw new Error(`cache path contains an external symlink: ${path.relative(process.cwd(), file)}`);
      }
      return;
    }
    const relative = path.relative(root, file);
    if (virtualEnvironmentPath.test(relative) || path.basename(file) === '.venv') {
      throw new Error(`cache path must not contain a virtual environment: ${path.relative(process.cwd(), file)}`);
    }
    if (sensitiveDirectory.test(relative)
      || sensitiveName.test(path.basename(file))
      || (sensitiveKeywordName.test(path.basename(file))
        && !sourceFileName.test(path.basename(file))
        && !binaryFileName.test(path.basename(file)))) {
      throw new Error(`cache path contains a sensitive-looking file: ${path.relative(process.cwd(), file)}`);
    }
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(file)) walk(path.join(file, child));
    } else if (stat.isFile() && stat.size <= 1024 * 1024 && !binaryFileName.test(file)) {
      const content = fs.readFileSync(file);
      if (content.includes(0)) return;
      const text = content.toString('utf8');
      const sourceOrMetadata = sourceFileName.test(file)
        || packageMetadataPath.test(file)
        || npmIndexPath.test(file);
      if (privateKeyContent.test(text)
        || (!sourceOrMetadata && (knownTokenContent.test(text) || credentialAssignment.test(text)))) {
        throw new Error(`cache path contains credential-like content: ${path.relative(process.cwd(), file)}`);
      }
    }
  };
  walk(root);
}

async function makeArchive() {
  if (!have('tar') || !have('zstd')) throw new Error('tar and zstd are required on the runner');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cac-'));
  const output = path.join(directory, 'object.tar.zst');
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const paths = [];
  for (const value of entries()) {
    const absolute = path.resolve(workspace, value);
    const relative = path.relative(workspace, absolute);
    if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
      throw new Error(`cache path must be inside the workspace: ${value}`);
    }
    if (fs.existsSync(absolute)) {
      if (virtualEnvironmentPath.test(relative) || path.basename(absolute) === '.venv') {
        throw new Error(`cache path must not contain a virtual environment: ${value}`);
      }
      securityScan(absolute);
      paths.push(relative || '.');
    }
    else log(`cache path missing: ${value}`);
  }
  if (!paths.length) throw new Error('no cache paths exist');
  const excludes = input('exclude').split(/\r?\n/).map((value) => value.trim())
    .filter(Boolean).flatMap((value) => ['--exclude', value]);
  const tar = cp.spawn('tar', [
    '--sort=name', '--mtime=UTC 1970-01-01', '--owner=0', '--group=0',
    '--numeric-owner', '--dereference', '--hard-dereference', '--exclude-vcs', '--format=gnu', '-cf', '-', ...excludes, '-C', workspace, ...paths,
  ], { stdio: ['ignore', 'pipe', 'inherit'] });
  const zstd = cp.spawn('zstd', ['-q', `-${input('compression-level', '3')}`, '-o', output], {
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  tar.stdout.pipe(zstd.stdin);
  await Promise.all([
    new Promise((resolve, reject) => {
      tar.once('error', reject);
      tar.once('close', (code) => code === 0 ? resolve() : reject(new Error('tar failed')));
    }),
    new Promise((resolve, reject) => {
      zstd.once('error', reject);
      zstd.once('close', (code) => code === 0 ? resolve() : reject(new Error('zstd failed')));
    }),
  ]);
  validateArchive(output);
  encryptFile(output);
  return { file: output, dir: directory };
}

function validateArchive(file) {
  const tarFile = path.join(path.dirname(file), 'validation.tar');
  if (fs.statSync(file).size > maxCompressedBytes) {
    throw new Error('cache archive exceeds the compressed size limit');
  }
  const decompression = cp.spawnSync('zstd', ['-q', '-d', '-f', file, '-o', tarFile], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (decompression.status) throw new Error('created zstd archive cannot be decompressed');
  inspectTar(tarFile);
}

function inspectTar(tarFile) {
  const tarSize = fs.statSync(tarFile).size;
  if (tarSize > maxTarBytes) throw new Error('cache archive exceeds the uncompressed size limit');
  const listing = cp.spawnSync('tar', ['-tf', tarFile], { encoding: 'utf8' });
  if (listing.status) {
    throw new Error(`created tar archive is invalid: ${listing.stderr || 'tar listing failed'}`);
  }
  const names = listing.stdout.split(/\r?\n/).filter(Boolean);
  if (names.length > maxArchiveEntries) throw new Error('cache archive contains too many entries');
  if (names.some((name) => name.length > maxArchivePathLength)) {
    throw new Error('cache archive contains an excessively long path');
  }
  const details = cp.spawnSync('tar', ['-tvf', tarFile], { encoding: 'utf8' });
  if (details.status) throw new Error(`cache archive metadata is invalid: ${details.stderr || 'tar listing failed'}`);
  for (const line of details.stdout.split(/\r?\n/).filter(Boolean)) {
    const type = line[0];
    if (type !== '-' && type !== 'd') throw new Error('cache archive contains a symlink, hardlink, or special file');
  }
  return names;
}

function digest(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return `sha256:${hash.digest('hex')}`;
}

async function release(repository) {
  try { return (await gh(`/repos/${repository}/releases/tags/cache-v1`)).body; }
  catch (error) {
    if (error.status !== 404) throw error;
    return (await gh(`/repos/${repository}/releases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_name: 'cache-v1', name: 'Cache objects (v1)', prerelease: true }),
    })).body;
  }
}

async function assets(repository) {
  const cacheRelease = await release(repository);
  return {
    release: cacheRelease,
    assets: (await gh(`/repos/${repository}/releases/${cacheRelease.id}/assets?per_page=100`)).body,
  };
}

async function object(repository, hash) {
  const result = await assets(repository);
  return result.assets.find((asset) => asset.name === `${hash.slice(7)}.tar.zst`
    || asset.name.endsWith(`--${hash.slice(7)}.tar.zst`));
}

function assetName(key, hash) {
  const slug = key.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
  return `${slug}--${hash.slice(7)}.tar.zst`;
}

function hashFromAssetName(name) {
  const match = name.match(/(?:^|--)([a-f0-9]{64})\.tar\.zst$/i);
  return match ? `sha256:${match[1]}` : null;
}

async function manifest(repository) {
  const result = await gh(`/repos/${repository}/contents/manifests/references-v1.json`);
  return { json: JSON.parse(Buffer.from(result.body.content, 'base64').toString()), sha: result.body.sha };
}

async function refs(repository) {
  try { return await manifest(repository); }
  catch (error) {
    if (error.status !== 404) throw error;
    return { json: { schema_version: 1, references: {} }, sha: null };
  }
}

async function updateManifest(repository, message, update) {
  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await refs(repository);
    if (!update(current.json)) return current.json;
    try {
      await gh(`/repos/${repository}/contents/manifests/references-v1.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          content: Buffer.from(`${JSON.stringify(current.json, null, 2)}\n`).toString('base64'),
          ...(current.sha ? { sha: current.sha } : {}), branch: 'main',
        }),
      });
      return current.json;
    } catch (error) {
      if (error.status !== 409 || attempt === maxAttempts - 1) throw error;
      const delay = Math.min(1000 * 2 ** attempt, 10000) + Math.floor(Math.random() * 250);
      log(`manifest update conflicted; retrying in ${delay}ms (attempt ${attempt + 2}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`reference update conflicted after ${maxAttempts} attempts`);
}

async function setRef(repository, key, hash) {
  return updateManifest(repository, `cache: update ${key}`, (manifest) => {
    manifest.references[key] = { object: hash, updated_at: new Date().toISOString() };
    return true;
  });
}

async function download(repository, hash) {
  const asset = await object(repository, hash);
  if (!asset) throw new Error(`object ${hash} not found`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-'));
  const file = path.join(directory, asset.name);
  const response = await fetch(asset.browser_download_url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxCompressedBytes) throw new Error('cache archive exceeds the compressed size limit');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxCompressedBytes) throw new Error('cache archive exceeds the compressed size limit');
  fs.writeFileSync(file, bytes);
  if (digest(file) !== hash) throw new Error('integrity check failed: sha256 mismatch');
  return file;
}

function extract(file) {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  if (fs.statSync(file).size > maxCompressedBytes) {
    throw new Error('cache archive exceeds the compressed size limit');
  }
  const decrypted = decryptFile(file);
  const tarFile = path.join(path.dirname(decrypted), 'object.tar');
  const decompression = cp.spawnSync('zstd', ['-q', '-d', '-f', decrypted, '-o', tarFile], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (decompression.status) throw new Error('zstd decompression failed');
  const names = inspectTar(tarFile);
  for (const name of names) {
    if (path.isAbsolute(name) || name.split('/').includes('..') || name.split('\\').includes('..')) {
      throw new Error('unsafe archive path');
    }
  }
  const extraction = cp.spawnSync('tar', [
    '--extract', '--file', tarFile, '--directory', workspace,
    '--no-same-owner', '--no-same-permissions',
  ], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (extraction.status) throw new Error('tar extraction failed');
}

module.exports = {
  input, token, eventName, repository, defaultBranch, headRef, baseRef, pullRequestNumber, cacheName,
  scopedKey, scopedRestorePrefix, assertTrustedRestoreAllowed,
  log, fail, gh,
  upload, entries, refName,
  securityScan, makeArchive, inspectTar, digest, assetName, hashFromAssetName,
  encryptFile, decryptFile,
  release, assets, object, refs, updateManifest, setRef,
  download, extract,
};
