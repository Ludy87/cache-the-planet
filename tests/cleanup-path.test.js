const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const common = require("../src/common");

test("cleanup-path-after-save removes configured paths only when enabled", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cleanup-path-"));
  const previous = {
    workspace: process.env.GITHUB_WORKSPACE,
    path: process.env["INPUT_PATH"],
    cleanup: process.env["INPUT_CLEANUP-PATH-AFTER-SAVE"],
  };
  try {
    process.env.GITHUB_WORKSPACE = workspace;
    process.env["INPUT_PATH"] = "target/cache";
    process.env["INPUT_CLEANUP-PATH-AFTER-SAVE"] = "true";
    fs.mkdirSync(path.join(workspace, "target/cache"), { recursive: true });
    fs.writeFileSync(path.join(workspace, "target/cache", "artifact"), "x");
    common.cleanupCachePathsAfterSave();
    assert.equal(fs.existsSync(path.join(workspace, "target/cache")), false);

    process.env["INPUT_CLEANUP-PATH-AFTER-SAVE"] = "false";
    fs.mkdirSync(path.join(workspace, "target/cache"), { recursive: true });
    common.cleanupCachePathsAfterSave();
    assert.equal(fs.existsSync(path.join(workspace, "target/cache")), true);
  } finally {
    if (previous.workspace === undefined) delete process.env.GITHUB_WORKSPACE;
    else process.env.GITHUB_WORKSPACE = previous.workspace;
    if (previous.path === undefined) delete process.env["INPUT_PATH"];
    else process.env["INPUT_PATH"] = previous.path;
    if (previous.cleanup === undefined)
      delete process.env["INPUT_CLEANUP-PATH-AFTER-SAVE"];
    else process.env["INPUT_CLEANUP-PATH-AFTER-SAVE"] = previous.cleanup;
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
