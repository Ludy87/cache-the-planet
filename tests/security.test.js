const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const common = require("../src/common");
const publisher = require("../scripts/publish-pr-cache-artifacts");

function runCacheNameWithConfig(config, cacheName = "npm", extraEnv = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cache-config-test-"));
  const configPath = path.join(workspace, ".cache-the-planet.json");
  fs.writeFileSync(configPath, JSON.stringify(config));
  const script = `
    process.env.GITHUB_WORKSPACE = ${JSON.stringify(workspace)};
    process.env["INPUT_CONFIG-FILE"] = ".cache-the-planet.json";
    process.env["INPUT_CACHE-NAME"] = ${JSON.stringify(cacheName)};
    const { cacheName } = require(${JSON.stringify(path.join(__dirname, "..", "src", "common.js"))});
    process.stdout.write(cacheName());
  `;
  const result = childProcess.spawnSync(process.execPath, ["-e", script], {
    cwd: workspace,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
  fs.rmSync(workspace, { recursive: true, force: true });
  return result;
}

function runManifestBranchWithConfig(config, extraEnv = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cache-branch-test-"));
  const configPath = path.join(workspace, ".cache-the-planet.json");
  fs.writeFileSync(configPath, JSON.stringify(config));
  const script = `
    process.env.GITHUB_WORKSPACE = ${JSON.stringify(workspace)};
    process.env["INPUT_CONFIG-FILE"] = ".cache-the-planet.json";
    const { manifestBranch } = require(${JSON.stringify(path.join(__dirname, "..", "src", "common.js"))});
    process.stdout.write(manifestBranch());
  `;
  const env = { ...process.env, ...extraEnv };
  const result = childProcess.spawnSync(process.execPath, ["-e", script], {
    cwd: workspace,
    env,
    encoding: "utf8",
  });
  fs.rmSync(workspace, { recursive: true, force: true });
  return result;
}

function runCacheRepository(config = null, extraEnv = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cache-repository-test-"));
  if (config) {
    fs.writeFileSync(
      path.join(workspace, ".cache-the-planet.json"),
      JSON.stringify(config),
    );
  }
  const script = `
    process.env.GITHUB_WORKSPACE = ${JSON.stringify(workspace)};
    process.env["INPUT_CONFIG-FILE"] = ${JSON.stringify(config ? ".cache-the-planet.json" : "")};
    const { cacheRepository } = require(${JSON.stringify(path.join(__dirname, "..", "src", "common.js"))});
    process.stdout.write(cacheRepository());
  `;
  const result = childProcess.spawnSync(process.execPath, ["-e", script], {
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
  fs.rmSync(workspace, { recursive: true, force: true });
  return result;
}

test("positive limits accept safe integers and reject unsafe values", () => {
  assert.equal(common.parsePositiveSafeInteger("12", "LIMIT"), 12);
  assert.equal(common.parsePositiveSafeInteger(undefined, "LIMIT", 7), 7);
  for (const value of [
    "0",
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    String(Number.MAX_SAFE_INTEGER + 1),
  ]) {
    assert.throws(
      () => common.parsePositiveSafeInteger(value, "LIMIT"),
      /positive safe integer/,
    );
  }
});

test("cache hashes and manifest references are validated", () => {
  const hash = `sha256:${"a".repeat(64)}`;
  const key = "trusted/owner/repo/main/npm/linux-x64/abcdef/v1";
  assert.equal(common.validateCacheHash(hash), hash);
  assert.throws(() => common.validateCacheHash("sha1:bad"), /sha256 hash/);
  assert.doesNotThrow(() =>
    common.validateManifest({
      references: { [key]: { object: hash, size: 10 } },
    }),
  );
  assert.throws(
    () => common.validateManifest({ references: { key: { object: hash } } }),
    /complete cache key/,
  );
  assert.throws(
    () => common.validateManifest({ references: { [key]: { object: "bad" } } }),
    /sha256 hash/,
  );
  assert.throws(
    () => common.validateManifestReference({ object: hash, size: 0 }),
    /positive safe integer/,
  );
});

test("outputs and asset names reject control or unsupported characters", () => {
  const output = path.join(os.tmpdir(), `cache-output-${process.pid}.txt`);
  const previousOutput = process.env.GITHUB_OUTPUT;
  try {
    process.env.GITHUB_OUTPUT = output;
    common.setOutput("matched-key", "trusted/owner/repo/main/npm/linux-x64/key/v1");
    assert.match(fs.readFileSync(output, "utf8"), /matched-key=trusted\//);
    assert.throws(() => common.setOutput("asset-name", "safe.tar.zst\nX=bad"));
    assert.throws(() => common.setOutput("asset-name", "unsafe value"));
  } finally {
    if (previousOutput === undefined) delete process.env.GITHUB_OUTPUT;
    else process.env.GITHUB_OUTPUT = previousOutput;
    fs.rmSync(output, { force: true });
  }
});

test("release assets are constrained before download", () => {
  const hash = "a".repeat(64);
  const safe = {
    name: `trusted-owner-repo-main-cache--${hash}.tar.zst`,
    browser_download_url: `https://github.com/owner/repo/releases/download/cache-v1/${hash}.tar.zst`,
  };
  assert.equal(common.isSafeAsset(safe), true);
  assert.equal(
    common.isSafeAsset({ ...safe, name: `safe--${hash}.tar.zst\nX=bad` }),
    false,
  );
  assert.equal(
    common.isSafeAsset({
      ...safe,
      name: `../outside--${hash}.tar.zst`,
    }),
    false,
  );
  assert.equal(
    common.isSafeAsset({
      ...safe,
      browser_download_url: `https://attacker.example/${hash}.tar.zst`,
    }),
    false,
  );
});

test("encryption and hashing do not load the complete archive", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cache-stream-test-"));
  const file = path.join(root, "archive.bin");
  const previousKey = process.env["INPUT_ENCRYPTION-KEY"];
  try {
    process.env["INPUT_ENCRYPTION-KEY"] = "0123456789abcdef".repeat(4);
    fs.writeFileSync(file, Buffer.alloc(3 * 1024 * 1024 + 17, 7));
    const originalHash = common.digest(file);
    common.encryptFile(file);
    const decrypted = common.decryptFile(file);
    assert.equal(common.digest(decrypted), originalHash);
  } finally {
    if (previousKey === undefined) delete process.env["INPUT_ENCRYPTION-KEY"];
    else process.env["INPUT_ENCRYPTION-KEY"] = previousKey;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("bounded downloads stream successfully and enforce the byte limit", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cache-test-"));
  const output = path.join(root, "download.bin");
  const originalFetch = global.fetch;
  try {
    global.fetch = async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-length": "3" },
      });
    await common.downloadToFile("https://example.invalid/cache", output, {
      maxBytes: 3,
      timeoutMs: 1000,
    });
    assert.deepEqual([...fs.readFileSync(output)], [1, 2, 3]);
    await assert.rejects(
      common.downloadToFile(
        "https://example.invalid/cache",
        path.join(root, "too-large"),
        { maxBytes: 2, timeoutMs: 1000 },
      ),
      /compressed size limit/,
    );
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("GitHub API GET requests have bounded retries", async () => {
  const originalFetch = global.fetch;
  const previousToken = process.env.GITHUB_TOKEN;
  const previousInputToken = process.env.INPUT_TOKEN;
  let calls = 0;
  try {
    delete process.env.GITHUB_TOKEN;
    delete process.env.INPUT_TOKEN;
    global.fetch = async () => {
      calls += 1;
      if (calls < 3) return new Response("busy", { status: 503 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const result = await common.gh("/repos/owner/repo");
    assert.deepEqual(result.body, { ok: true });
    assert.equal(calls, 3);
  } finally {
    global.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousToken;
    if (previousInputToken === undefined) delete process.env.INPUT_TOKEN;
    else process.env.INPUT_TOKEN = previousInputToken;
  }
});

test("artifact publisher correlates workflow, repository, PR and head SHA", () => {
  const event = {
    workflow_run: {
      name: "Cache integration save suite",
      conclusion: "success",
      event: "pull_request",
      repository: { full_name: "owner/cache" },
      pull_requests: [
        {
          number: 7,
          head: { sha: "abc123" },
          base: { repo: { full_name: "owner/cache" } },
        },
      ],
    },
  };
  const run = publisher.validateWorkflowRunIdentity(
    event,
    "owner/cache",
    "Cache integration save suite",
  );
  assert.equal(
    publisher.validatePullRequestIdentity(run, "7", "abc123").number,
    7,
  );
  assert.throws(
    () =>
      publisher.validateWorkflowRunIdentity(
        {
          ...event,
          workflow_run: { ...event.workflow_run, conclusion: "failure" },
        },
        "owner/cache",
        "Cache integration save suite",
      ),
    /not successful/,
  );
  assert.throws(
    () => publisher.validatePullRequestIdentity(run, "8", "abc123"),
    /number does not match/,
  );
  assert.throws(
    () => publisher.validatePullRequestIdentity(run, "7", "wrong"),
    /head SHA/,
  );
});

test("artifact publisher resolves PR metadata when workflow_run omits pull_requests", async () => {
  const originalFetch = global.fetch;
  const previousToken = process.env.GITHUB_TOKEN;
  try {
    process.env.GITHUB_TOKEN = "test-token";
    global.fetch = async (url, options) => {
      assert.equal(url, "https://api.github.com/repos/owner/cache/pulls/7");
      assert.equal(options.headers.Authorization, "Bearer test-token");
      return new Response(
        JSON.stringify({
          number: 7,
          head: { sha: "abc123" },
          base: { repo: { full_name: "owner/cache" } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const run = publisher.validateWorkflowRunIdentity(
      {
        workflow_run: {
          name: "Cache integration save suite",
          conclusion: "success",
          event: "pull_request",
          head_sha: "abc123",
          repository: { full_name: "owner/cache" },
          pull_requests: [],
        },
      },
      "owner/cache",
      "Cache integration save suite",
      { allowMissingPullRequest: true },
    );
    const pr = await publisher.resolveWorkflowPullRequest(
      run,
      "owner/cache",
      "7",
      "abc123",
    );
    assert.equal(pr.number, 7);
  } finally {
    global.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousToken;
  }
});

test("artifact publisher rejects PR lookup without a token", async () => {
  const previousToken = process.env.GITHUB_TOKEN;
  const previousInputToken = process.env.INPUT_TOKEN;
  try {
    delete process.env.GITHUB_TOKEN;
    delete process.env.INPUT_TOKEN;
    await assert.rejects(
      publisher.resolveWorkflowPullRequest(
        { head_sha: "abc123" },
        "owner/cache",
        "7",
        "abc123",
      ),
      /GITHUB_TOKEN is required/,
    );
  } finally {
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousToken;
    if (previousInputToken === undefined) delete process.env.INPUT_TOKEN;
    else process.env.INPUT_TOKEN = previousInputToken;
  }
});

test("artifact names and contents are restricted", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-test-"));
  try {
    const name = "cache-the-planet-pr-7-npm-abcdef12-v1";
    assert.deepEqual(publisher.validateArtifactName(name, 7), {
      cacheName: "npm",
      key: "abcdef12",
      version: "1",
    });
    assert.deepEqual(publisher.validateArtifactName(name, 7, ["npm"]), {
      cacheName: "npm",
      key: "abcdef12",
      version: "1",
    });
    assert.throws(
      () => publisher.validateArtifactName(name, 7, ["uv"]),
      /not enabled/,
    );
    assert.throws(
      () =>
        publisher.validateArtifactName(
          "cache-the-planet-pr-8-npm-abcdef12-v1",
          7,
        ),
      /not for PR/,
    );
    fs.writeFileSync(path.join(root, "payload"), "cache");
    assert.equal(publisher.validateArtifactContents(root).totalBytes, 5);
    assert.equal(publisher.validateArtifactManifest(root), null);
    fs.writeFileSync(path.join(root, "manifest.json"), "[]");
    assert.throws(
      () => publisher.validateArtifactManifest(root),
      /JSON object/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("admin action metadata points to Node 24 bundles", () => {
  for (const file of [
    "action.yml",
    "save/action.yml",
    "gc/action.yml",
    "pr-cleanup/action.yml",
  ]) {
    const directory = path.dirname(file);
    const metadata = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.match(metadata, /using:\s*node24/);
    const main = metadata.match(/main:\s*(\S+)/)?.[1];
    assert.ok(main, `${file} has no main bundle`);
    assert.ok(
      fs.existsSync(path.resolve(__dirname, "..", directory, main)),
      `${file} points to a missing bundle`,
    );
  }
});

test("the trusted default-branch configuration defines the cache allowlist", () => {
  const config = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", ".cache-the-planet.json"),
      "utf8",
    ),
  );
  assert.ok(Array.isArray(config.security?.allowed_cache_names));
  assert.ok(config.security.allowed_cache_names.includes("uv-python-3-13"));
  assert.ok(!config.security.allowed_cache_names.includes("uv-python"));
});

test("cache configuration allows, rejects, and defaults allowlists safely", () => {
  const allowed = runCacheNameWithConfig({
    security: { allowed_cache_names: ["npm", "uv"] },
  });
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout, "npm");

  const rejected = runCacheNameWithConfig(
    { security: { allowed_cache_names: ["npm"] } },
    "uv",
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /not allowed by the configured cache-name allowlist/);

  for (const config of [
    {},
    { security: {} },
    { security: { allowed_cache_names: [] } },
  ]) {
    const unrestricted = runCacheNameWithConfig(config, "new-cache");
    assert.equal(unrestricted.status, 0);
    assert.equal(unrestricted.stdout, "new-cache");
  }
});

test("manifest branch can be configured in JSON with environment override", () => {
  const defaultBranch = runManifestBranchWithConfig({});
  assert.equal(defaultBranch.status, 0);
  assert.equal(defaultBranch.stdout, "cache-data");

  const configured = runManifestBranchWithConfig({
    manifest_branch: "cache-data",
  });
  assert.equal(configured.status, 0);
  assert.equal(configured.stdout, "cache-data");

  const overridden = runManifestBranchWithConfig(
    { manifest_branch: "cache-data" },
    { CACHE_MANIFEST_BRANCH: "env-cache-data" },
  );
  assert.equal(overridden.status, 0);
  assert.equal(overridden.stdout, "env-cache-data");
});

test("cache repository defaults to the workflow repository", () => {
  const workflowRepository = runCacheRepository({
    cache_repository: "owner/configured-repo",
  }, {
    GITHUB_REPOSITORY: "owner/workflow-repo",
    CACHE_REPOSITORY: "",
    "INPUT_REPOSITORY": "",
  });
  assert.equal(workflowRepository.status, 0);
  assert.equal(workflowRepository.stdout, "owner/configured-repo");

  const configuredRepository = runCacheRepository(null, {
    GITHUB_REPOSITORY: "owner/workflow-repo",
    CACHE_REPOSITORY: "owner/cache-repo",
    "INPUT_REPOSITORY": "",
  });
  assert.equal(configuredRepository.status, 0);
  assert.equal(configuredRepository.stdout, "owner/cache-repo");
});

test("cache configuration rejects malformed allowlists and paths outside the workspace", () => {
  for (const config of [
    { security: { allowed_cache_names: "npm" } },
    { security: { allowed_cache_names: ["invalid.name"] } },
    { security: { allowed_cache_names: [""] } },
  ]) {
    const invalid = runCacheNameWithConfig(config);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /allowed_cache_names must be a non-empty list/);
  }

  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cache-config-path-"));
  try {
    const script = `
      process.env.GITHUB_WORKSPACE = ${JSON.stringify(workspace)};
      process.env.CACHE_CONFIG_FILE = "../outside.json";
      process.env["INPUT_CACHE-NAME"] = "npm";
      const { cacheName } = require(${JSON.stringify(path.join(__dirname, "..", "src", "common.js"))});
      cacheName();
    `;
    const result = childProcess.spawnSync(process.execPath, ["-e", script], {
      cwd: workspace,
      env: process.env,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /config-file must be inside the GitHub workspace/);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("an absent or empty cache allowlist permits valid cache names", () => {
  assert.equal(typeof common.configuredCacheNames, "function");
  assert.doesNotThrow(() =>
    publisher.validateArtifactName(
      "cache-the-planet-pr-7-new-cache-abcdef12-v1",
      7,
    ),
  );
  assert.throws(
    () =>
      publisher.validateArtifactName(
        "cache-the-planet-pr-7-invalid.name-abcdef12-v1",
        7,
      ),
    /invalid PR cache artifact name/,
  );
});

test("workflow security invariants remain present", () => {
  const workflowRoot = path.join(__dirname, "..", ".github", "workflows");
  for (const file of fs
    .readdirSync(workflowRoot)
    .filter((name) => name.endsWith(".yml"))) {
    const content = fs.readFileSync(path.join(workflowRoot, file), "utf8");
    assert.doesNotMatch(
      content,
      /actions\/cache|enable-cache:\s*true|cache-image:\s*true|package-manager-cache:\s*true/,
    );
    if (content.includes("actions/checkout@")) {
      const checkoutCount = (content.match(/actions\/checkout@/g) || []).length;
      const expectedCredentialMode = "false";
      assert.equal(
        checkoutCount,
        (content.match(new RegExp(`persist-credentials:\\s*${expectedCredentialMode}`, "g")) || []).length,
        `${file} has an unexpected checkout credential mode`,
      );
    }
  }
  const publisherWorkflow = fs.readFileSync(
    path.join(workflowRoot, "publish-pr-cache-artifacts.yml"),
    "utf8",
  );
  assert.match(publisherWorkflow, /workflow_run:/);
  assert.match(publisherWorkflow, /conclusion == 'success'/);
  assert.match(publisherWorkflow, /event == 'pull_request'/);
  assert.match(
    publisherWorkflow,
    /repository\.full_name == github\.repository/,
  );
  assert.match(publisherWorkflow, /publish-pr-cache-artifacts\.js/);
  assert.match(publisherWorkflow, /ref: main/);
  assert.match(
    publisherWorkflow,
    /CACHE_CONFIG_FILE: \.cache-the-planet\.json/,
  );
});
