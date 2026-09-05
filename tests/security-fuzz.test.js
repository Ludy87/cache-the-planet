const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const common = require("../src/common");

function sequence(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state;
  };
}

function mutate(value, next) {
  const fragments = [
    "..",
    ".",
    "/",
    "\\",
    "\0",
    "\n",
    " ",
    "%2f",
    "trusted/owner/repo/main/",
    "untrusted/owner/repo/pr-1/",
    "shared/owner/repo/",
  ];
  const fragment = fragments[next() % fragments.length];
  const position = next() % (value.length + 1);
  return value.slice(0, position) + fragment + value.slice(position);
}

function assertSafeRestorePrefix(value) {
  assert.equal(typeof value, "string");
  assert.ok(!value.startsWith("/"));
  assert.ok(!value.includes("\\"));
  assert.ok(!value.split("/").includes(".."));
  assert.ok(!value.split("/").includes("."));
  assert.match(value, /^(?:trusted|untrusted|shared)\/[A-Za-z0-9._-]+/);
}

test("fuzzed restore prefixes never escape the namespace schema", () => {
  const previous = {
    workspace: process.env.GITHUB_WORKSPACE,
    repository: process.env.GITHUB_REPOSITORY,
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    defaultBranch: process.env["INPUT_DEFAULT-BRANCH"],
    scope: process.env["INPUT_SCOPE"],
    cacheName: process.env["INPUT_CACHE-NAME"],
  };
  process.env.GITHUB_WORKSPACE = os.tmpdir();
  process.env.GITHUB_REPOSITORY = "owner/repo";
  process.env.GITHUB_EVENT_NAME = "push";
  process.env.GITHUB_REF = "refs/heads/main";
  process.env["INPUT_DEFAULT-BRANCH"] = "main";
  process.env["INPUT_SCOPE"] = "auto";
  process.env["INPUT_CACHE-NAME"] = "npm";

  try {
    const next = sequence(0xcace1234);
    const seeds = [
      "dependencies/",
      "cache-key/v1/",
      "a_b-c.1/",
      "../outside/",
      "shared/owner/repo/",
      "trusted/owner/repo/main/",
      "untrusted/owner/repo/pr-1/",
    ];
    for (let index = 0; index < 1000; index += 1) {
      const seed = seeds[next() % seeds.length];
      const candidate = mutate(seed, next);
      for (const validator of [
        common.scopedRestorePrefix,
        common.sharedRestorePrefix,
      ]) {
        try {
          assertSafeRestorePrefix(validator(candidate));
        } catch (error) {
          if (error?.code === "ERR_ASSERTION") throw error;
        }
      }
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      const envKey =
        key === "defaultBranch"
          ? "INPUT_DEFAULT-BRANCH"
          : key === "scope"
            ? "INPUT_SCOPE"
            : key === "cacheName"
              ? "INPUT_CACHE-NAME"
              : `GITHUB_${key.toUpperCase()}`;
      if (value === undefined) delete process.env[envKey];
      else process.env[envKey] = value;
    }
  }
});

test("fuzzed compressed archives are rejected without extraction", async () => {
  if (
    childProcess.spawnSync("zstd", ["--version"], { stdio: "ignore" }).status !==
    0
  ) {
    return;
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cache-archive-fuzz-"));
  const next = sequence(0x51ced123);
  try {
    for (let index = 0; index < 64; index += 1) {
      const file = path.join(root, `mutated-${index}.tar.zst`);
      const bytes = Buffer.alloc(32 + (next() % 512));
      for (let offset = 0; offset < bytes.length; offset += 1) {
        bytes[offset] = next() & 0xff;
      }
      fs.writeFileSync(file, bytes);
      await assert.rejects(common.validateArchiveFile(file), Error);
      assert.deepEqual(fs.readdirSync(root), [`mutated-${index}.tar.zst`]);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
