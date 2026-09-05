const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const common = require("../src/common");
const publisher = require("../scripts/publish-pr-cache-artifacts");

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
  assert.equal(common.validateCacheHash(hash), hash);
  assert.throws(() => common.validateCacheHash("sha1:bad"), /sha256 hash/);
  assert.doesNotThrow(() =>
    common.validateManifest({
      references: { key: { object: hash, size: 10 } },
    }),
  );
  assert.throws(
    () => common.validateManifest({ references: { key: { object: "bad" } } }),
    /sha256 hash/,
  );
  assert.throws(
    () => common.validateManifestReference({ object: hash, size: 0 }),
    /positive safe integer/,
  );
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

test("an absent or empty cache allowlist permits valid cache names", () => {
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
    if (content.includes("actions/checkout@"))
      assert.equal(
        (content.match(/actions\/checkout@/g) || []).length,
        (content.match(/persist-credentials:\s*false/g) || []).length,
        `${file} has an unprotected checkout`,
      );
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
