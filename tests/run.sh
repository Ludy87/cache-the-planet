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
const { scopedKey, scopedRestorePrefix, assertTrustedRestoreAllowed, assetName, hashFromAssetName } = require('./src/common');
const { inspectTar } = require('./src/common');
const { securityScan: distSecurityScan } = require('./dist/common');
const { encryptFile, decryptFile } = require('./src/common');
const securityScan = (directory) => {
  sourceSecurityScan(directory);
  distSecurityScan(directory);
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-security-'));
try {
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
  let invalidKeyRejected = false;
  try { scopedKey('trusted/example/project/npm/Linux-X64/hash/v1'); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('invalid trusted cache key was accepted');
  process.env['INPUT_CACHE-NAME'] = 'NPM_CACHE';
  invalidKeyRejected = false;
  try { scopedKey('Linux-X64/hash/v1'); } catch { invalidKeyRejected = true; }
  if (!invalidKeyRejected) throw new Error('invalid cache-name was accepted');
  process.env['INPUT_CACHE-NAME'] = 'npm';
  if (scopedRestorePrefix('npm/Linux-X64/') !== 'trusted/example/project/main/npm/Linux-X64/') {
    throw new Error('automatic restore prefix was not generated correctly');
  }
  if (scopedRestorePrefix('npm/Linux-X64') !== 'trusted/example/project/main/npm/Linux-X64') {
    throw new Error('automatic restore prefix without trailing slash was not generated correctly');
  }
  process.env.GITHUB_EVENT_NAME = 'pull_request';
  fs.writeFileSync(eventFile, JSON.stringify({ pull_request: { number: 7 } }));
  let trustedRestoreRejected = false;
  try { assertTrustedRestoreAllowed(['trusted/example/project/main/npm/Linux-X64/hash/v1']); } catch { trustedRestoreRejected = true; }
  if (!trustedRestoreRejected) throw new Error('trusted restore prefix was not rejected by schema validation');
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
