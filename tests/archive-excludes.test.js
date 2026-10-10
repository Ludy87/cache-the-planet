const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { execFileSync } = require("node:child_process");

const common = require("../src/common");

test("save excludes are applied to the tar archive", async (t) => {
  try {
    execFileSync("tar", ["--version"], {
      stdio: "ignore",
    });
    execFileSync("zstd", ["--version"], {
      stdio: "ignore",
    });
  } catch {
    t.skip("tar and zstd are required");
    return;
  }

  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "archive-excludes-"));
  const previous = {
    workspace: process.env.GITHUB_WORKSPACE,
    path: process.env.INPUT_PATH,
    exclude: process.env.INPUT_EXCLUDE,
  };
  try {
    process.env.GITHUB_WORKSPACE = workspace;
    process.env.INPUT_PATH = "frontend/editor/src-tauri/target";
    process.env.INPUT_EXCLUDE = [
      "frontend/editor/src-tauri/target/debug/.fingerprint/**",
      "frontend/editor/src-tauri/target/debug/deps/match_token*",
    ].join("\n");
    fs.mkdirSync(
      path.join(workspace, "frontend/editor/src-tauri/target/debug/.fingerprint/crate"),
      { recursive: true },
    );
    fs.mkdirSync(
      path.join(workspace, "frontend/editor/src-tauri/target/debug/deps"),
      { recursive: true },
    );
    fs.writeFileSync(
      path.join(
        workspace,
        "frontend/editor/src-tauri/target/debug/.fingerprint/crate/data",
      ),
      "excluded",
    );
    fs.writeFileSync(
      path.join(workspace, "frontend/editor/src-tauri/target/debug/deps/match_token_demo"),
      "excluded",
    );
    fs.writeFileSync(
      path.join(workspace, "frontend/editor/src-tauri/target/debug/kept.txt"),
      "kept",
    );

    const archive = await common.makeArchive();
    const tarFile = path.join(archive.dir, "test.tar");
    try {
      fs.writeFileSync(tarFile, execFileSync("zstd", ["-q", "-d", "-c", archive.file]));
      const names = common.inspectTar(tarFile);
      assert.ok(names.includes("frontend/editor/src-tauri/target/debug/kept.txt"));
      assert.ok(
        !names.some((name) =>
          name.includes("frontend/editor/src-tauri/target/debug/.fingerprint/"),
        ),
      );
      assert.ok(!names.some((name) => name.includes("match_token_demo")));
    } finally {
      common.removeTemporaryFile(tarFile);
      common.removeTemporaryFile(archive.dir);
    }
  } finally {
    if (previous.workspace === undefined) delete process.env.GITHUB_WORKSPACE;
    else process.env.GITHUB_WORKSPACE = previous.workspace;
    if (previous.path === undefined) delete process.env.INPUT_PATH;
    else process.env.INPUT_PATH = previous.path;
    if (previous.exclude === undefined) delete process.env.INPUT_EXCLUDE;
    else process.env.INPUT_EXCLUDE = previous.exclude;
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
