const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const common = require("../src/common");

const maxMetadataFiles = 16;
const maxParts = 256;
const maxPartSize = 512 * 1024 ** 2;
const maxObjectSize = 4 * 1024 ** 3;

function sha256(file) {
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

function readEvent() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const run = event.workflow_run;
  if (!run || run.conclusion !== "success" || run.event !== "pull_request")
    throw new Error("workflow run is not a successful pull request run");
  if (run.repository?.full_name !== process.env.GITHUB_REPOSITORY)
    throw new Error("workflow run repository does not match");
  return run;
}

function metadataFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, "metadata.json"))
    .filter((file) => fs.existsSync(file));
}

function downloadedArtifactFile(root, artifactName) {
  const directory = path.join(root, artifactName);
  const files = fs.existsSync(directory)
    ? fs.readdirSync(directory).map((name) => path.join(directory, name))
        .filter((file) => fs.statSync(file).isFile())
    : [];
  if (files.length !== 1) throw new Error(`artifact must contain one file: ${artifactName}`);
  return files[0];
}

function validateMetadata(value, run, number, repository) {
  if (!value || value.schema_version !== 1 || value.repository !== repository)
    throw new Error("invalid fork cache metadata");
  if (String(value.pull_request) !== String(number) || value.head_sha !== run.head_sha)
    throw new Error("fork cache metadata does not match the workflow run");
  const keyPrefix = `untrusted/${repository}/pr-${number}/`;
  if (typeof value.key !== "string" || value.key.length > 512 ||
      !value.key.startsWith(keyPrefix) ||
      !/^[A-Za-z0-9._/@+-]+$/.test(value.key) ||
      value.key.includes("..") || value.key.includes("//"))
    throw new Error("fork cache metadata has an invalid key");
  if (!/^sha256:[0-9a-f]{64}$/.test(value.object) ||
      !Number.isSafeInteger(value.size) || value.size < 1 || value.size > maxObjectSize ||
      !Array.isArray(value.parts) || value.parts.length < 1 || value.parts.length > maxParts)
    throw new Error("fork cache metadata has invalid object data");
  const parts = [...value.parts].sort((a, b) => a.index - b.index);
  let total = 0;
  const artifactNames = new Set();
  const artifactIds = new Set();
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.index !== index || !/^sha256:[0-9a-f]{64}$/.test(part.object) ||
        !Number.isSafeInteger(part.size) || part.size < 1 || part.size > maxPartSize ||
        !Number.isSafeInteger(part.artifact_id) || part.artifact_id < 1 ||
        part.workflow_run_id !== Number(run.id) ||
        typeof part.artifact_name !== "string" ||
        !/^cache-[A-Za-z0-9._-]+-part-[0-9]{6}$/.test(part.artifact_name))
      throw new Error("fork cache metadata has an invalid part");
    if (artifactNames.has(part.artifact_name) || artifactIds.has(part.artifact_id))
      throw new Error("fork cache metadata contains duplicate artifacts");
    artifactNames.add(part.artifact_name);
    artifactIds.add(part.artifact_id);
    total += part.size;
  }
  if (total !== value.size) throw new Error("fork cache metadata size mismatch");
  return { ...value, parts };
}

async function validateArtifactIds(runId, repository, parts) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${encodeURIComponent(runId)}/artifacts?per_page=100`,
    { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.SOURCE_ARTIFACT_TOKEN || process.env.GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" }, signal: AbortSignal.timeout(30000) },
  );
  if (!response.ok) throw new Error(`artifact metadata lookup failed: ${response.status}`);
  const artifacts = new Map((await response.json()).artifacts.map((artifact) => [artifact.id, artifact]));
  for (const part of parts) {
    const artifact = artifacts.get(part.artifact_id);
    if (!artifact || artifact.expired || artifact.name !== part.artifact_name ||
        artifact.workflow_run?.id !== Number(runId))
      throw new Error(`artifact identity mismatch: ${part.artifact_name}`);
  }
}

async function main() {
  const run = readEvent();
  const repository = process.env.GITHUB_REPOSITORY;
  const number = run.pull_requests?.[0]?.number || process.env.PR_NUMBER;
  if (!number) throw new Error("pull request number is missing");
  const root = process.env.FORK_ARTIFACT_METADATA_DIR;
  if (!root) throw new Error("FORK_ARTIFACT_METADATA_DIR is required");
  const files = metadataFiles(root);
  if (!files.length) {
    console.log("No fork artifact metadata found.");
    return;
  }
  if (files.length > maxMetadataFiles) throw new Error("too many fork metadata artifacts");
  const eventFile = path.join(process.env.RUNNER_TEMP || root, "fork-publisher-event.json");
  fs.writeFileSync(eventFile, JSON.stringify({ pull_request: { number } }));
  process.env.GITHUB_EVENT_NAME = "pull_request";
  process.env.GITHUB_EVENT_PATH = eventFile;
  process.env.CACHE_STORAGE = "github-artifact";
  process.env.CACHE_MANIFEST_BRANCH = "cache-data";
  try {
    for (const metadataFile of files) {
      const metadata = validateMetadata(
        JSON.parse(fs.readFileSync(metadataFile, "utf8")), run, number, repository,
      );
      await validateArtifactIds(run.id, repository, metadata.parts);
      const objectHash = crypto.createHash("sha256");
      for (const part of metadata.parts) {
        const partFile = downloadedArtifactFile(root, part.artifact_name);
        if (fs.statSync(partFile).size !== part.size || sha256(partFile) !== part.object)
          throw new Error(`artifact part integrity mismatch: ${part.artifact_name}`);
        objectHash.update(fs.readFileSync(partFile));
      }
      if (`sha256:${objectHash.digest("hex")}` !== metadata.object)
        throw new Error("fork artifact object integrity mismatch");
      await common.setRef(repository, metadata.key, metadata.object, {
        size: metadata.size,
        parts: metadata.parts,
        artifact_id: metadata.parts[0].artifact_id,
        workflow_run_id: Number(run.id),
      });
      console.log(`Published fork artifact reference: key=${metadata.key}`);
    }
  } finally {
    fs.rmSync(eventFile, { force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { validateMetadata };
