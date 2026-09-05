const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const common = require("../src/common");

const maxArtifacts = 16;
const maxTotalBytes = 2 * 1024 ** 3;

function parseWorkflowRunEvent(event) {
  if (!event || typeof event !== "object" || !event.workflow_run)
    throw new Error("workflow_run event is required");
  return event;
}

function validateWorkflowRunIdentity(
  event,
  expectedRepository,
  expectedWorkflow,
) {
  const run = parseWorkflowRunEvent(event).workflow_run;
  if (run.conclusion !== "success")
    throw new Error("workflow run was not successful");
  if (run.event !== "pull_request")
    throw new Error("workflow run was not a pull request");
  if (run.name !== expectedWorkflow) throw new Error("unexpected workflow run");
  if (run.repository?.full_name !== expectedRepository)
    throw new Error("workflow run repository does not match");
  if (!Array.isArray(run.pull_requests) || run.pull_requests.length !== 1)
    throw new Error("workflow run must identify exactly one pull request");
  return run;
}

function validatePullRequestIdentity(run, expectedNumber, expectedHeadSha) {
  const pr = run.pull_requests[0];
  if (!/^\d+$/.test(String(expectedNumber)) || Number(expectedNumber) < 1)
    throw new Error("expected PR number is invalid");
  if (Number(pr.number) !== Number(expectedNumber))
    throw new Error("pull request number does not match");
  if (expectedHeadSha && pr.head?.sha !== expectedHeadSha)
    throw new Error("pull request head SHA does not match");
  return pr;
}

function validateArtifactName(
  name,
  expectedPrNumber,
  allowedCacheNames = null,
) {
  const prefix = `cache-the-planet-pr-${expectedPrNumber}-`;
  if (!name.startsWith(prefix))
    throw new Error(`artifact is not for PR ${expectedPrNumber}`);
  const suffix = name.slice(prefix.length);
  const match = suffix.match(
    /^([A-Za-z0-9_-]{1,32})-([0-9a-f]{8,128})-v([1-9]\d*)$/,
  );
  if (!match) throw new Error(`invalid PR cache artifact name: ${name}`);
  const [, cacheName, key, version] = match;
  if (allowedCacheNames && !allowedCacheNames.includes(cacheName))
    throw new Error(`cache name is not enabled: ${cacheName}`);
  return { cacheName, key, version };
}

function validateArtifactContents(directory, state = { totalBytes: 0 }) {
  const root = fs.realpathSync(directory);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.resolve(root, entry.name);
    const relative = path.relative(root, file);
    if (
      !relative ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      throw new Error("artifact path escapes its root");
    if (entry.isSymbolicLink())
      throw new Error(`symlink in PR cache artifact: ${file}`);
    if (entry.isDirectory()) validateArtifactContents(file, state);
    else if (entry.isFile()) {
      state.totalBytes += fs.statSync(file).size;
      if (state.totalBytes > maxTotalBytes)
        throw new Error("PR cache artifacts exceed the total size limit");
    } else throw new Error(`unsupported file in PR cache artifact: ${file}`);
  }
  return state;
}

function validateArtifactManifest(directory) {
  const manifestFile = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestFile)) return null;
  const value = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("artifact manifest must be a JSON object");
  return value;
}

function main() {
  const root =
    process.env.PR_CACHE_ARTIFACTS_DIR ||
    path.join(process.cwd(), "pr-cache-artifacts");
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository =
    process.env.CACHE_REPOSITORY || process.env.GITHUB_REPOSITORY;
  const expectedWorkflow =
    process.env.EXPECTED_WORKFLOW || "Cache integration save suite";
  if (!eventPath || !repository)
    throw new Error("GITHUB_EVENT_PATH and CACHE_REPOSITORY are required");
  const configFile = process.env.CACHE_CONFIG_FILE || ".cache-the-planet.json";
  if (configFile !== ".cache-the-planet.json")
    throw new Error(
      "publisher must use .cache-the-planet.json from the default branch",
    );
  const allowedCacheNames = common.configuredCacheNames();
  const run = validateWorkflowRunIdentity(
    parseWorkflowRunEvent(JSON.parse(fs.readFileSync(eventPath, "utf8"))),
    repository,
    expectedWorkflow,
  );
  const number = String(process.env.PR_NUMBER || run.pull_requests[0].number);
  const pr = validatePullRequestIdentity(
    run,
    number,
    process.env.EXPECTED_HEAD_SHA || "",
  );
  if (pr.base?.repo?.full_name && pr.base.repo.full_name !== repository)
    throw new Error("pull request base repository does not match");
  const artifacts = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  const matchingArtifacts = artifacts.filter((entry) =>
    entry.name.startsWith(`cache-the-planet-pr-${number}-`),
  );
  if (matchingArtifacts.length > maxArtifacts)
    throw new Error("too many PR cache artifacts");
  const eventFile = path.join(
    process.env.RUNNER_TEMP || root,
    "cache-the-planet-pr-event.json",
  );
  fs.writeFileSync(
    eventFile,
    JSON.stringify({
      repository: { full_name: repository, default_branch: "main" },
      pull_request: { number: Number(number) },
    }),
  );
  try {
    for (const entry of matchingArtifacts) {
      const parsed = validateArtifactName(
        entry.name,
        number,
        allowedCacheNames,
      );
      const directory = path.join(root, entry.name);
      validateArtifactContents(directory);
      validateArtifactManifest(directory);
      cp.execFileSync(
        process.execPath,
        [path.join(process.cwd(), "dist", "save.js")],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CACHE_CONFIG_FILE: "",
            CACHE_ALLOWED_CACHE_NAMES: allowedCacheNames?.join(",") || "",
            GITHUB_EVENT_NAME: "pull_request",
            GITHUB_EVENT_PATH: eventFile,
            GITHUB_REF: `refs/pull/${number}/merge`,
            GITHUB_REPOSITORY: repository,
            INPUT_REPOSITORY: repository,
            "INPUT_CACHE-NAME": parsed.cacheName,
            INPUT_SCOPE: "untrusted",
            "INPUT_ALLOW-PR-CACHE": "true",
            INPUT_KEY: parsed.key,
            INPUT_VERSION: parsed.version,
            INPUT_PATH: directory,
            INPUT_STRICT: "false",
          },
          stdio: "inherit",
        },
      );
    }
  } finally {
    try {
      fs.rmSync(eventFile, { force: true });
    } catch {}
  }
}

module.exports = {
  parseWorkflowRunEvent,
  validateWorkflowRunIdentity,
  validatePullRequestIdentity,
  validateArtifactName,
  validateArtifactContents,
  validateArtifactManifest,
  main,
};
if (require.main === module) main();
