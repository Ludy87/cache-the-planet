#!/usr/bin/env bash
set -euo pipefail
command -v node >/dev/null
if [[ ! -f dist/common.js || ! -f dist/restore.js || ! -f dist/save.js || ! -f dist/gc.js || ! -f dist/pr-cleanup.js ]]; then
  npm run build
fi
node --check dist/common.js
node --check dist/restore.js
node --check dist/save.js
node --check dist/gc.js
node --check dist/pr-cleanup.js
node <<'NODE'
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { securityScan: sourceSecurityScan } = require('./src/common');
const { scopedKey, scopeCounterpartKey, pullRequestCacheCombination, expiredUntrustedReferences, scopedRestorePrefix, sharedRestorePrefix, assertTrustedRestoreAllowed, assetName, hashFromAssetName, manifestWriteGuard, excludePatterns } = require('./src/common');
const { inspectTar } = require('./src/common');
const { securityScan: distSecurityScan } = require('./dist/common');
const { encryptFile, decryptFile } = require('./src/common');
const securityScan = (directory) => {
  sourceSecurityScan(directory);
  distSecurityScan(directory);
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-security-'));
try {
  const originalWorkspace = process.env.GITHUB_WORKSPACE;
  process.env.GITHUB_WORKSPACE = root;
  const excludeFile = path.join(root, 'cache-excludes.txt');
  fs.writeFileSync(excludeFile, '# generated files\n**/.env\n\n**/node_modules/**\n');
  process.env['INPUT_EXCLUDE'] = '**/.npmrc\n';
  process.env['INPUT_EXCLUDE-PATH'] = 'cache-excludes.txt';
  const combinedExcludes = excludePatterns();
  if (combinedExcludes.join('|') !== '**/.npmrc|**/.env|**/node_modules/**') {
    throw new Error('exclude and exclude-path patterns were not combined correctly');
  }
  delete process.env['INPUT_EXCLUDE'];
  delete process.env['INPUT_EXCLUDE-PATH'];
  if (originalWorkspace === undefined) delete process.env.GITHUB_WORKSPACE;
  else process.env.GITHUB_WORKSPACE = originalWorkspace;
  const secret = path.join(root, '.env');
  fs.writeFileSync(secret, 'DATABASE_PASSWORD=should-not-be-cached\n');
  let rejected = false;
  try { securityScan(root); } catch { rejected = true; }
  if (!rejected) throw new Error('sensitive filename/content was not rejected');
  fs.rmSync(secret);
  fs.writeFileSync(path.join(root, 'env.py'), 'password = None\n');
  securityScan(root);
  fs.writeFileSync(path.join(root, 'tokens.py'), 'secret = "package-example-value"\n');
  securityScan(root);
  fs.writeFileSync(path.join(root, 'token.cpython-313.pyc'), Buffer.from([0, 1, 2, 3]));
  securityScan(root);
  fs.writeFileSync(path.join(root, 'ImageFont.py'), '# Copyright (c) 1997-2003 by Secret Labs AB\n');
  securityScan(root);
  fs.mkdirSync(path.join(root, 'example-1.0.dist-info'));
  fs.writeFileSync(path.join(root, 'example-1.0.dist-info', 'METADATA'), 'Requires-Dist: password-parser\n');
  fs.writeFileSync(path.join(root, 'example-1.0.dist-info', 'RECORD'), 'npm_token_file,sha256=example\n');
  securityScan(root);
  fs.mkdirSync(path.join(root, '_cacache', 'index-v5', 'b7', 'e8'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '_cacache', 'index-v5', 'b7', 'e8', 'index-entry'),
    'make-fetch-happen:request-cache:https://registry.npmjs.org/example\n',
  );
  securityScan(root);
  fs.writeFileSync(path.join(root, 'target.txt'), 'internal target\n');
  let symlinkSupported = true;
  try {
    fs.symlinkSync('target.txt', path.join(root, 'internal-link'));
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
    symlinkSupported = false;
    console.log('symlink test skipped: insufficient permissions on this platform');
  }
  if (symlinkSupported) {
    securityScan(root);
    fs.rmSync(path.join(root, 'internal-link'));
  }
  fs.writeFileSync(path.join(root, 'dependency.jar'), Buffer.from('password = "binary-package-data"\0'));
  securityScan(root);
  fs.writeFileSync(path.join(root, 'cacert.pem'), '-----BEGIN CERTIFICATE-----\npublic-ca-certificate\n');
  securityScan(root);
  fs.writeFileSync(path.join(root, 'private.key'), '-----BEGIN PRIVATE KEY-----\nsecret\n');
  rejected = false;
  try { securityScan(root); } catch { rejected = true; }
  if (!rejected) throw new Error('private key was not rejected');
  process.env['INPUT_ENCRYPTION-KEY'] = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const encryptedFile = path.join(root, 'archive.bin');
  fs.writeFileSync(encryptedFile, 'cache payload');
  encryptFile(encryptedFile);
  const decryptedFile = decryptFile(encryptedFile);
  if (fs.readFileSync(decryptedFile, 'utf8') !== 'cache payload') {
    throw new Error('encrypted cache round-trip failed');
  }
  console.log('encryption test passed');
  fs.mkdirSync(path.join(root, '.ssh'));
  fs.writeFileSync(path.join(root, '.ssh', 'config'), 'Host example\n');
  rejected = false;
  try { securityScan(root); } catch { rejected = true; }
  if (!rejected) throw new Error('.ssh directory was not rejected');
  fs.rmSync(path.join(root, '.ssh'), { recursive: true, force: true });
  fs.mkdirSync(path.join(root, '.venv', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, '.venv', 'bin', 'python'), 'runner-specific interpreter');
  rejected = false;
  try { securityScan(root); } catch { rejected = true; }
  if (!rejected) throw new Error('.venv directory was not rejected');
  fs.rmSync(path.join(root, '.venv'), { recursive: true, force: true });
  fs.writeFileSync(path.join(root, 'config.txt'), 'DATABASE_PASSWORD=should-not-be-cached\n');
  rejected = false;
  try { securityScan(root); } catch { rejected = true; }
  if (!rejected) throw new Error('private-key content was not rejected');
  process.env.GITHUB_REPOSITORY = 'example/project';
  process.env['INPUT_CACHE-NAME'] = 'npm';
  process.env.GITHUB_EVENT_NAME = 'pull_request';
  process.env.GITHUB_REF = 'refs/pull/7/merge';
  const eventFile = path.join(root, 'event.json');
  fs.writeFileSync(eventFile, JSON.stringify({ pull_request: { number: 7 } }));
  process.env.GITHUB_EVENT_PATH = eventFile;
  if (scopedKey('npm/Linux-X64/hash/v1') !== 'untrusted/example/project/pr-7/npm/Linux-X64/hash/v1') {
    throw new Error('automatic PR cache key was not generated correctly');
  }
  process.env.GITHUB_EVENT_NAME = 'push';
  delete process.env.GITHUB_REF;
  fs.writeFileSync(eventFile, JSON.stringify({ repository: { default_branch: 'main' } }));
  if (scopedKey('npm/Linux-X64/hash/v1') !== 'trusted/example/project/main/npm/Linux-X64/hash/v1') {
    throw new Error('automatic trusted cache key was not generated correctly');
  }
  if (scopedKey('Linux-X64/hash/v1') !== 'trusted/example/project/main/npm/Linux-X64/hash/v1') {
    throw new Error('automatic cache namespace was not generated correctly');
  }
  const sharedKey = 'shared/example/project/npm/Linux-X64/hash/v1';
  process.env['INPUT_SCOPE'] = 'shared';
  process.env.GITHUB_REF = 'refs/heads/main';
  if (scopedKey('Linux-X64/hash/v1') !== sharedKey) {
    throw new Error('shared scope did not generate the shared cache key');
  }
  const trustedKey = 'trusted/example/project/main/npm/Linux-X64/hash/v1';
  if (scopeCounterpartKey(sharedKey) !== trustedKey
    || scopeCounterpartKey(trustedKey) !== sharedKey) {
    throw new Error('trusted/shared counterpart mapping was not generated correctly');
  }
  process.env.GITHUB_REF = 'refs/heads/feature';
  if (scopeCounterpartKey(sharedKey) !== null || scopeCounterpartKey(trustedKey) !== null) {
    throw new Error('trusted/shared counterpart mapping was allowed outside the default branch');
  }
  process.env.GITHUB_EVENT_NAME = 'pull_request';
  fs.writeFileSync(eventFile, JSON.stringify({ pull_request: { number: 7 } }));
  if (scopedKey('Linux-X64/hash/v1') !== 'untrusted/example/project/pr-7/npm/Linux-X64/hash/v1') {
    throw new Error('shared scope was not isolated for pull requests');
  }
  let namespaceKeyRejected = false;
  try { scopedKey(sharedKey); } catch { namespaceKeyRejected = true; }
  if (!namespaceKeyRejected) throw new Error('explicit shared key was accepted in a pull request');
  const prCacheKey = 'untrusted/example/project/pr-7/npm/linux-x64/hash-a/v1';
  const prCacheKey2 = 'untrusted/example/project/pr-7/npm/linux-x64/hash-b/v1';
  if (pullRequestCacheCombination(prCacheKey) !== pullRequestCacheCombination(prCacheKey2)) {
    throw new Error('PR cache combination was not normalized correctly');
  }
  if (pullRequestCacheCombination(prCacheKey) !== 'untrusted/example/project/pr-7/npm/linux-x64/v1') {
    throw new Error('PR cache combination does not include the expected dimensions');
  }
  if (pullRequestCacheCombination('trusted/example/project/main/npm/linux-x64/hash-a/v1') !== null) {
    throw new Error('trusted cache was incorrectly treated as a PR cache');
  }
  const expiryNow = Date.parse('2026-08-30T12:00:00.000Z');
  const expiredReferences = expiredUntrustedReferences({
    'untrusted/example/project/pr-7/npm/linux-x64/old/v1': {
      object: 'sha256:old', updated_at: '2026-08-29T11:59:59.000Z',
    },
    'untrusted/example/project/pr-7/npm/linux-x64/fresh/v1': {
      object: 'sha256:fresh', updated_at: '2026-08-30T11:00:01.000Z',
    },
    'trusted/example/project/main/npm/linux-x64/old/v1': {
      object: 'sha256:trusted', updated_at: '2026-08-29T00:00:00.000Z',
    },
  }, expiryNow);
  if (expiredReferences.length !== 1 || expiredReferences[0][1].object !== 'sha256:old') {
    throw new Error('untrusted cache expiry did not enforce the 24-hour TTL');
  }
  process.env['INPUT_SCOPE'] = 'auto';
  process.env.GITHUB_EVENT_NAME = 'push';
  fs.writeFileSync(eventFile, JSON.stringify({ repository: { default_branch: 'main' } }));
  namespaceKeyRejected = false;
  try { scopedKey(sharedKey); } catch { namespaceKeyRejected = true; }
  if (!namespaceKeyRejected) throw new Error('explicit shared cache key was accepted');
  process.env.CACHE_MAX_MANIFEST_WRITES_PER_HOUR = '1';
  const monitoredManifest = { references: {}, monitoring: {} };
  if (!manifestWriteGuard(monitoredManifest) || monitoredManifest.monitoring.writes !== 1) {
    throw new Error('manifest write monitoring did not record the write');
  }
  if (manifestWriteGuard(monitoredManifest)) {
    throw new Error('manifest write rate limit was not enforced');
  }
  if (!monitoredManifest.monitoring.locked_until) {
    throw new Error('manifest was not locked after the write limit was exceeded');
  }
  delete process.env.CACHE_MAX_MANIFEST_WRITES_PER_HOUR;
  const sharedSaveCheck = cp.spawnSync(process.execPath, ['./src/save.js'], {
    env: {
      ...process.env,
      INPUT_REPOSITORY: 'example/project',
      'INPUT_CACHE-NAME': 'npm',
      INPUT_SCOPE: 'shared',
      INPUT_KEY: 'Linux-X64/hash/v1',
      INPUT_PATH: root,
      INPUT_TOKEN: 'test-token',
      INPUT_STRICT: 'true',
      GITHUB_EVENT_NAME: 'push',
      GITHUB_REF: 'refs/heads/feature',
      GITHUB_DEFAULT_BRANCH: 'main',
    },
    encoding: 'utf8',
  });
  if (sharedSaveCheck.status === 0
    || !`${sharedSaveCheck.stdout}\n${sharedSaveCheck.stderr}`.includes('shared cache keys may only be saved')) {
    throw new Error('shared cache was allowed outside the default branch');
  }
  process.env.GITHUB_EVENT_NAME = 'pull_request';
  fs.writeFileSync(eventFile, JSON.stringify({
    repository: { default_branch: 'main' },
    pull_request: { number: 7 },
  }));
  process.env.INPUT_SCOPE = 'shared';
  if (scopedKey('Linux-X64/hash/v1')
    !== 'untrusted/example/project/pr-7/npm/Linux-X64/hash/v1') {
    throw new Error('shared scope was not mapped to the isolated PR cache');
  }
  if (scopedRestorePrefix('shared/example/project/npm/Linux-X64/hash/v1/')
    !== 'shared/example/project/npm/Linux-X64/hash/v1/') {
    throw new Error('explicit shared restore prefix was not preserved');
  }
  if (scopedRestorePrefix('shared/example/project/') !== 'shared/example/project/') {
    throw new Error('shared repository restore prefix was not accepted');
  }
  if (sharedRestorePrefix('hash/') !== 'shared/example/project/npm/linux-x64/hash/') {
    throw new Error('automatic shared restore prefix was not generated correctly');
  }
  process.env.INPUT_SCOPE = 'auto';
  process.env.GITHUB_EVENT_NAME = 'push';
  process.env.GITHUB_REF = 'refs/heads/main';
  fs.writeFileSync(eventFile, JSON.stringify({ repository: { default_branch: 'main' } }));
  let invalidKeyRejected = false;
  try { scopedKey('trusted/example/project/npm/Linux-X64/hash/v1'); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('invalid trusted cache key was accepted');
  process.env['INPUT_CACHE-NAME'] = 'NPM_CACHE';
  invalidKeyRejected = false;
  if (scopedKey('Linux-X64/hash/v1') !== 'trusted/example/project/main/NPM_CACHE/Linux-X64/hash/v1') {
    throw new Error('uppercase and underscore cache-name was rejected');
  }
  process.env['INPUT_CACHE-NAME'] = 'npm.cache';
  try { scopedKey('Linux-X64/hash/v1'); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('invalid cache-name was accepted');
  process.env['INPUT_CACHE-NAME'] = 'npm';
  invalidKeyRejected = false;
  try { scopedKey('a'.repeat(513)); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('oversized logical cache key was accepted');
  invalidKeyRejected = false;
  try { scopedKey('valid/../unsafe'); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('unsafe logical cache key was accepted');
  process.env.RUNNER_OS = 'Linux';
  process.env.RUNNER_ARCH = 'X64';
  process.env['INPUT_OS'] = 'linux';
  process.env['INPUT_ARCH'] = 'x64';
  process.env['INPUT_VERSION'] = '1';
  if (scopedKey('hash') !== 'trusted/example/project/main/npm/linux-x64/hash/v1') {
    throw new Error('runner platform was not added automatically');
  }
  delete process.env.RUNNER_OS;
  delete process.env.RUNNER_ARCH;
  delete process.env['INPUT_OS'];
  delete process.env['INPUT_ARCH'];
  delete process.env['INPUT_VERSION'];
  if (require('./src/common').runnerPlatform() !== 'unknown-unknown') {
    throw new Error('missing runner platform did not use unknown');
  }
  process.env.RUNNER_OS = 'Linux';
  process.env.RUNNER_ARCH = 'X64';
  process.env['INPUT_OS'] = '__runner__';
  process.env['INPUT_ARCH'] = '__runner__';
  if (require('./src/common').runnerPlatform() !== 'linux-x64') {
    throw new Error('omitted runner inputs did not use runner values');
  }
  process.env['INPUT_OS'] = '';
  process.env['INPUT_ARCH'] = '';
  if (require('./src/common').runnerPlatform() !== 'unknown-unknown') {
    throw new Error('empty runner inputs did not use unknown');
  }
  delete process.env.RUNNER_OS;
  delete process.env.RUNNER_ARCH;
  delete process.env['INPUT_OS'];
  delete process.env['INPUT_ARCH'];
  process.env['INPUT_SCOPE'] = 'invalid';
  invalidKeyRejected = false;
  try { scopedKey('Linux-X64/hash/v1'); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('invalid scope was accepted');
  process.env['INPUT_SCOPE'] = 'auto';
  process.env['INPUT_VERSION'] = 'v1';
  invalidKeyRejected = false;
  try { scopedKey('hash'); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('non-numeric version was accepted');
  delete process.env['INPUT_VERSION'];
  process.env.RUNNER_OS = 'Linux';
  process.env.RUNNER_ARCH = 'X64';
  if (scopedRestorePrefix('npm/Linux-X64/') !== 'trusted/example/project/main/npm/Linux-X64/') {
    throw new Error('automatic restore prefix was not generated correctly');
  }
  if (scopedRestorePrefix('npm/Linux-X64') !== 'trusted/example/project/main/npm/Linux-X64') {
    throw new Error('automatic restore prefix without trailing slash was not generated correctly');
  }
  process.env.RUNNER_OS = 'Linux';
  process.env.RUNNER_ARCH = 'X64';
  if (scopedRestorePrefix('hash/') !== 'trusted/example/project/main/npm/linux-x64/hash/') {
    throw new Error('automatic restore prefix was not generated without a version suffix');
  }
  delete process.env.RUNNER_OS;
  delete process.env.RUNNER_ARCH;
  process.env.GITHUB_EVENT_NAME = 'pull_request';
  fs.writeFileSync(eventFile, JSON.stringify({ pull_request: { number: 7 } }));
  let trustedRestoreRejected = false;
  try { assertTrustedRestoreAllowed(['trusted/example/project/main/npm/Linux-X64/hash/v1']); } catch { trustedRestoreRejected = true; }
  if (!trustedRestoreRejected) throw new Error('trusted restore prefix was not rejected by schema validation');
  let sharedRestoreRejected = false;
  try { assertTrustedRestoreAllowed([sharedKey]); } catch { sharedRestoreRejected = true; }
  if (!sharedRestoreRejected) throw new Error('shared restore was allowed without explicit opt-in');
  process.env['INPUT_ALLOW-SHARED-RESTORE'] = 'true';
  assertTrustedRestoreAllowed([sharedKey]);
  const limitDir = path.join(root, 'archive');
  fs.mkdirSync(path.join(limitDir, '.venv'), { recursive: true });
  rejected = false;
  try { sourceSecurityScan(limitDir); } catch { rejected = true; }
  if (!rejected) throw new Error('virtual environment archive entry was not rejected');
  fs.rmSync(path.join(limitDir, '.venv'), { recursive: true, force: true });
  fs.writeFileSync(path.join(limitDir, 'target.txt'), 'target');
  const unsafeTar = path.join(limitDir, 'unsafe.tar');
  let archiveSymlinkSupported = true;
  try {
    fs.symlinkSync('target.txt', path.join(limitDir, 'link.txt'));
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
    archiveSymlinkSupported = false;
  }
  if (archiveSymlinkSupported) {
    cp.execFileSync('tar', ['-cf', unsafeTar, '-C', limitDir, 'target.txt', 'link.txt']);
    rejected = false;
    try { inspectTar(unsafeTar); } catch { rejected = true; }
    if (!rejected) throw new Error('archive symlink was not rejected');
    fs.rmSync(path.join(limitDir, 'link.txt'), { force: true });
  } else {
    console.log('archive symlink test skipped: insufficient permissions on this platform');
  }
  fs.linkSync(path.join(limitDir, 'target.txt'), path.join(limitDir, 'hardlink.txt'));
  cp.execFileSync('tar', ['-cf', path.basename(unsafeTar), 'target.txt', 'hardlink.txt'], { cwd: limitDir });
  rejected = false;
  try { inspectTar(unsafeTar); } catch { rejected = true; }
  if (!rejected) throw new Error('archive hardlink was not rejected');
  const flattenedTar = path.join(limitDir, 'flattened.tar');
  cp.execFileSync('tar', ['--hard-dereference', '-cf', path.basename(flattenedTar), 'target.txt', 'hardlink.txt'], { cwd: limitDir });
  inspectTar(flattenedTar);
  const namedAsset = assetName(
    'untrusted/Ludy87/spdf-cache/pr-6/buildx/Linux-X64/unoserver/v1',
    `sha256:${'a'.repeat(64)}`,
  );
  if (!namedAsset.startsWith('untrusted-Ludy87-spdf-cache-pr-6-buildx-Linux-X64-unoserver-v1--')
    || hashFromAssetName(namedAsset) !== `sha256:${'a'.repeat(64)}`) {
    throw new Error('descriptive asset name was not generated correctly');
  }
  console.log('security scan test passed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
NODE
if grep -RniE 'actions/cache|cache:[[:space:]]*(npm|maven|gradle|sbt)|enable-cache:[[:space:]]*true|cache-image:[[:space:]]*true|cache-jdk:[[:space:]]*true|package-manager-cache:[[:space:]]*true' .github; then
  echo 'GitHub Actions native cache is disabled but a cache configuration was found'
  exit 1
fi
testdir=$(mktemp -d)
trap 'rm -rf "$testdir"' EXIT
mkdir -p "$testdir/a dir"
printf 'stable\n' > "$testdir/a dir/file.txt"
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -cf - -C "$testdir" 'a dir' | zstd -q -o "$testdir/one.tar.zst"
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -cf - -C "$testdir" 'a dir' | zstd -q -o "$testdir/two.tar.zst"
test "$(sha256sum "$testdir/one.tar.zst" | cut -d' ' -f1)" = "$(sha256sum "$testdir/two.tar.zst" | cut -d' ' -f1)"
echo 'deterministic archive test passed'
