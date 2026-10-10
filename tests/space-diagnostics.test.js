const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { temporaryStorageDiagnostics } = require("../src/common");

test("temporary storage diagnostics report archive and disk information", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "space-diagnostics-"));
  const input = path.join(directory, "archive.tar.zst");
  const output = path.join(directory, "validation.tar");
  try {
    fs.writeFileSync(input, Buffer.alloc(1024));
    const diagnostics = temporaryStorageDiagnostics(input, output, 1024 * 1024);
    assert.match(diagnostics, /compressed=1(?:\.00)?KB/);
    assert.match(diagnostics, /output-limit=1(?:\.00)?MB/);
    assert.match(diagnostics, /free=\d+(\.\d+)?(KB|MB|GB|TB)/);
    assert.match(diagnostics, /validation\.tar$/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
