const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root =
  process.env.PR_CACHE_ARTIFACTS_DIR ||
  path.join(process.cwd(), "pr-cache-artifacts");
const eventFile = path.join(
  process.env.RUNNER_TEMP || root,
  "cache-the-planet-pr-event.json",
);
const number = String(process.env.PR_NUMBER || "");
const expectedNumber = String(process.env.EXPECTED_PR_NUMBER || "");
const repository =
  process.env.CACHE_REPOSITORY || process.env.GITHUB_REPOSITORY;

if (!/^\d+$/.test(number) || !/^\d+$/.test(expectedNumber) || number !== expectedNumber || !repository)
  throw new Error("PR_NUMBER and CACHE_REPOSITORY are required");
fs.writeFileSync(
  eventFile,
  JSON.stringify({
    repository: { default_branch: "main" },
    pull_request: { number: Number(number) },
  }),
);

const patterns = [
  "uv-python-3-13",
  "gradle-java17",
  "maven-java17",
  "docker",
  "npm",
  "task",
  "uv",
];
const artifacts = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory());
const prefix = `cache-the-planet-pr-${number}-`;
const matchingArtifacts = artifacts.filter((entry) => entry.name.startsWith(prefix));
if (matchingArtifacts.length > 16)
  throw new Error("too many PR cache artifacts");

let totalBytes = 0;
function validateTree(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlink in PR cache artifact: ${file}`);
    if (entry.isDirectory()) {
      validateTree(file);
    } else if (entry.isFile()) {
      totalBytes += fs.statSync(file).size;
      if (totalBytes > 2 * 1024 ** 3)
        throw new Error("PR cache artifacts exceed the total size limit");
    } else {
      throw new Error(`unsupported file in PR cache artifact: ${file}`);
    }
  }
}

for (const entry of matchingArtifacts) {
  if (!entry.name.startsWith(prefix)) continue;
  const suffix = entry.name.slice(prefix.length);
  const cacheName = patterns.find((name) => suffix.startsWith(`${name}-`));
  if (!cacheName) throw new Error(`unknown PR cache artifact: ${entry.name}`);
  const rest = suffix.slice(cacheName.length + 1);
  const keyMatch = rest.match(/^([0-9a-f]+)-v(\d+)$/);
  if (!keyMatch) throw new Error(`invalid PR cache artifact name: ${entry.name}`);
  validateTree(path.join(root, entry.name));
  const env = {
    ...process.env,
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_EVENT_PATH: eventFile,
    GITHUB_REF: `refs/pull/${number}/merge`,
    GITHUB_REPOSITORY: repository,
    INPUT_REPOSITORY: repository,
    "INPUT_CACHE-NAME": cacheName,
    INPUT_SCOPE: "untrusted",
    "INPUT_ALLOW-PR-CACHE": "true",
    INPUT_KEY: keyMatch[1],
    INPUT_VERSION: keyMatch[2],
    INPUT_PATH: path.join(root, entry.name),
    INPUT_STRICT: "false",
  };
  cp.execFileSync(
    process.execPath,
    [path.join(process.cwd(), "dist", "save.js")],
    {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    },
  );
}
