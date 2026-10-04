const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { securityScan } = require('../src/common');

test('dependency documentation allows private-key examples while other files remain blocked', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'ctp-documentation-'));
  const dependency = path.join(workspace, 'frontend', 'node_modules', 'dotenv');
  fs.mkdirSync(dependency, { recursive: true });
  // Only a marker and placeholder, never a real private key.
  const example = 'Multiline example:\n-----BEGIN RSA PRIVATE KEY-----\nplaceholder\n';
  try {
    for (const name of ['README.md', 'README-es.md', 'docs/multiline.md']) {
      const file = path.join(dependency, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, example);
      securityScan(path.join(workspace, 'frontend', 'node_modules'));
      securityScan(file);
    }
    for (const file of [
      path.join(dependency, 'private.pem'),
      path.join(dependency, 'private.key'),
      path.join(workspace, 'README.md'),
    ]) {
      fs.writeFileSync(file, example);
      assert.throws(() => securityScan(file), /blocked path/);
      assert.throws(() => securityScan(workspace), /blocked path/);
      fs.rmSync(file);
    }
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
