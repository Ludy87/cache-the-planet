const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("missing artifact becomes a miss and is marked for post-save", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-missing-"));
  const output = path.join(root, "output");
  const state = path.join(root, "state");
  const fixture = path.resolve(__dirname, "fixtures/probe-restore.cjs");
  const base = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^(INPUT_|CACHE_|SFTP_|GITHUB_|STATE_)/i.test(key),
    ),
  );
  fs.writeFileSync(output, "");
  fs.writeFileSync(state, "");
  try {
    const result = spawnSync(
      process.execPath,
      [path.resolve(__dirname, "../src/restore.js")],
      {
        env: {
          ...base,
          GITHUB_WORKSPACE: root,
          GITHUB_OUTPUT: output,
          GITHUB_STATE: state,
          INPUT_STORAGE: "github-artifact",
          INPUT_CACHE_NAME: "npm",
          INPUT_KEY: "test",
          INPUT_STRICT: "true",
          PROBE_CASE: "missing-artifact",
          NODE_OPTIONS: `--require="${fixture.split(path.sep).join("/")}"`,
        },
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /Cache miss: referenced artifact is unavailable/,
    );
    assert.doesNotMatch(
      result.stdout,
      /::warning::cache ignored: 404 Not Found/,
    );
    assert.match(fs.readFileSync(output, "utf8"), /cache-hit=false/);

    const artifactState = fs
      .readFileSync(state, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith("cache_artifact_missing_"));
    assert.ok(artifactState);
    const [stateName, stateValue] = artifactState.split("=");
    assert.match(stateName, /^cache_artifact_missing_[a-f0-9]{64}$/);
    assert.equal(stateValue, "true");

    const common = require("../src/common");
    const previousCacheName = process.env.INPUT_CACHE_NAME;
    const stateEnvironmentName = `STATE_${stateName}`;
    const previousState = process.env[stateEnvironmentName];
    process.env.INPUT_CACHE_NAME = "npm";
    process.env[stateEnvironmentName] = stateValue;
    try {
      assert.equal(common.isArtifactMissingForSave(), true);
    } finally {
      if (previousCacheName === undefined) delete process.env.INPUT_CACHE_NAME;
      else process.env.INPUT_CACHE_NAME = previousCacheName;
      if (previousState === undefined) delete process.env[stateEnvironmentName];
      else process.env[stateEnvironmentName] = previousState;
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
