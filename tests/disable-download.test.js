const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("download switch respects precedence and skips single/multi restore without network", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "disable-download-"));
  const commonPath = path.resolve(__dirname, "../src/common.js");
  try {
    fs.writeFileSync(path.join(root, ".cache-the-planet.json"), JSON.stringify({ disable_download: true }));
    const base = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(INPUT_|CACHE_|SFTP_|GITHUB_)/i.test(key)));
    const run = (code, overrides, args = []) => spawnSync(process.execPath, ["-e", code, "--", ...args], {
      env: { ...base, GITHUB_WORKSPACE: root, ...overrides }, encoding: "utf8",
    });
    for (const [overrides, expected] of [
      [{ INPUT_STORAGE: "github-branch" }, true],
      [{ INPUT_STORAGE: "sftp" }, true],
      [{ INPUT_STORAGE: "github-release" }, false],
      [{ INPUT_STORAGE: "sftp", CACHE_DISABLE_DOWNLOAD: "false" }, false],
      [{ INPUT_STORAGE: "sftp", CACHE_DISABLE_DOWNLOAD: "true", INPUT_DISABLE_DOWNLOAD: "false" }, false],
    ]) {
      const result = run("require('node:assert/strict').equal(require(process.argv[1]).cacheDownloadDisabled(), process.argv[2] === 'true')", overrides, [commonPath, String(expected)]);
      assert.equal(result.status, 0, result.stderr);
    }
    for (const storage of ["sftp", "github-branch"]) {
      for (const script of ["restore.js", "multi-cache.js"]) {
        const output = path.join(root, "output");
        fs.writeFileSync(output, "");
        const result = run("global.fetch = () => { throw Error('Unexpected network request'); }; require(process.argv[1]);", {
          INPUT_STORAGE: storage, INPUT_STRICT: "true", GITHUB_OUTPUT: output,
          INPUT_KEY: "npm=test\nmaven=test", INPUT_MULTI_CACHE: "npm:\n  path: npm\nmaven:\n  path: maven",
        }, [path.resolve(__dirname, "../src", script)]);
        assert.equal(result.status, 0, result.stderr);
        const outputs = fs.readFileSync(output, "utf8");
        if (script === "restore.js") assert.match(outputs, /cache-hit=false/);
        else assert.match(outputs, /"cache-hit":"false"/);
      }
    }
    const invalid = run("require(process.argv[1]).cacheDownloadDisabled()", { INPUT_DISABLE_DOWNLOAD: "invalid" }, [commonPath]);
    assert.notEqual(invalid.status, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
