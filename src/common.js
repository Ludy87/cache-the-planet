const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const cp = require("child_process");
const { Readable, Transform } = require("stream");
const { pipeline } = require("stream/promises");

const apiVersion = "2022-11-28";
const encryptionMagic = Buffer.from("CTPENC1\0");
let githubClientPromise;
let configurationCache;
const releaseCache = new Map();
const assetsCache = new Map();
const manifestCache = new Map();
const manifestLocks = new Map();

function parsePositiveSafeInteger(value, name, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return parsed;
}

function positiveEnvironmentLimit(name, fallback, configName) {
  const configuredValue = configuration().security?.[configName];
  return parsePositiveSafeInteger(
    process.env[name] ?? configuredValue,
    name,
    fallback,
  );
}

const maxCompressedBytes = positiveEnvironmentLimit(
  "CACHE_MAX_COMPRESSED_BYTES",
  2 * 1024 ** 3,
  "max_compressed_bytes",
);
const maxTarBytes = positiveEnvironmentLimit(
  "CACHE_MAX_TAR_BYTES",
  8 * 1024 ** 3,
  "max_tar_bytes",
);
const maxArchiveEntries = positiveEnvironmentLimit(
  "CACHE_MAX_ENTRIES",
  200000,
  "max_entries",
);
const maxArchivePathLength = positiveEnvironmentLimit(
  "CACHE_MAX_ARCHIVE_PATH_LENGTH",
  4096,
  "max_archive_path_length",
);
const defaultManifestReferenceLimit = 100000;
const defaultManifestWritesPerHour = 1000;
const defaultLogicalKeyLength = 512;
const defaultLogicalKeyComponents = 16;
const githubApiTimeoutMs = 120000;
const githubApiMaxRetries = 2;

function input(name, defaultValue = "") {
  const variable = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  return process.env[variable] ?? defaultValue;
}

function hasInput(name) {
  const variable = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  return Object.prototype.hasOwnProperty.call(process.env, variable);
}

function token() {
  // ACTIONS_RUNTIME_TOKEN is for the Actions service, not the GitHub REST API.
  return input("token") || process.env.GITHUB_TOKEN;
}

function setOutput(name, value) {
  const stringValue = String(value ?? "");
  if (!/^[A-Za-z0-9._:/-]*$/.test(stringValue)) {
    throw new Error(`output ${name} contains unsupported characters`);
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${stringValue}\n`);
  }
}

function authorizationHeaders() {
  const value = token();
  return value ? { Authorization: `Bearer ${value}` } : {};
}

function configuration() {
  if (configurationCache) return configurationCache;
  const configuredFile = input("config-file") || process.env.CACHE_CONFIG_FILE;
  if (!configuredFile) return (configurationCache = {});
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const file = path.resolve(workspace, configuredFile);
  const relative = path.relative(workspace, file);
  if (
    path.isAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error("config-file must be inside the GitHub workspace");
  }
  try {
    configurationCache = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`could not read config-file: ${error.message}`);
  }
  if (
    !configurationCache ||
    typeof configurationCache !== "object" ||
    Array.isArray(configurationCache)
  ) {
    throw new Error("config-file must contain a JSON object");
  }
  return configurationCache;
}

function configuredLimit(
  environmentName,
  configName,
  fallback,
  section = "monitoring",
) {
  const environmentValue = process.env[environmentName];
  const configValue = configuration()[section]?.[configName];
  const value = environmentValue ?? configValue ?? fallback;
  return parsePositiveSafeInteger(value, environmentName, fallback);
}

function validateCacheHash(hash) {
  if (typeof hash !== "string" || !/^sha256:[a-f0-9]{64}$/i.test(hash)) {
    throw new Error("cache object must be a sha256 hash");
  }
  return hash.toLowerCase();
}

function validateManifestReference(reference) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    throw new Error("manifest reference must be an object");
  }
  validateCacheHash(reference.object);
  if (reference.size !== null && reference.size !== undefined) {
    parsePositiveSafeInteger(reference.size, "manifest reference size");
  }
  if (
    reference.updated_at !== undefined &&
    !Number.isFinite(Date.parse(reference.updated_at))
  ) {
    throw new Error("manifest reference updated_at must be a valid timestamp");
  }
  return reference;
}

function validateManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("manifest must be an object");
  }
  if (
    !value.references ||
    typeof value.references !== "object" ||
    Array.isArray(value.references)
  ) {
    throw new Error("manifest references must be an object");
  }
  for (const [key, reference] of Object.entries(value.references)) {
    if (!isCompleteCacheKey(key)) {
      throw new Error("manifest reference key is not a complete cache key");
    }
    validateManifestReference(reference);
  }
  return value;
}

function createBoundedTransform(limit, errorMessage) {
  const maxBytes = parsePositiveSafeInteger(limit, "stream limit");
  let total = 0;
  return new Transform({
    transform(chunk, encoding, callback) {
      total += chunk.length;
      if (total > maxBytes) {
        callback(new Error(errorMessage));
        return;
      }
      callback(null, chunk);
    },
  });
}

function removeTemporaryFile(file) {
  if (!file) return;
  try {
    fs.rmSync(file, { force: true, recursive: true });
  } catch {}
}

function configuredCacheNames() {
  const environmentValue = process.env.CACHE_ALLOWED_CACHE_NAMES;
  const configValue = configuration().security?.allowed_cache_names;
  const names = environmentValue
    ? environmentValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : configValue;
  if (
    names === undefined ||
    names === null ||
    (Array.isArray(names) && names.length === 0)
  )
    return null;
  if (
    !Array.isArray(names) ||
    names.some((value) => !/^[A-Za-z0-9_-]{1,32}$/.test(value))
  ) {
    throw new Error(
      "allowed_cache_names must be a non-empty list of valid cache names",
    );
  }
  return names;
}

async function githubClient() {
  const value = token();
  if (!value) return null;
  if (!githubClientPromise) {
    githubClientPromise = import("@actions/github").then(({ getOctokit }) =>
      getOctokit(value, { userAgent: "cache-the-planet" }),
    );
  }
  return githubClientPromise;
}

function eventName() {
  return process.env.GITHUB_EVENT_NAME || "";
}

function repository() {
  return process.env.GITHUB_REPOSITORY || "";
}

function cacheRepository() {
  const value =
    input("repository") ||
    process.env.CACHE_REPOSITORY ||
    configuration().cache_repository ||
    repository();
  if (value && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error("cache repository must be an owner/name repository");
  }
  return value;
}

function defaultBranch() {
  if (process.env.GITHUB_DEFAULT_BRANCH)
    return process.env.GITHUB_DEFAULT_BRANCH;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      return (
        JSON.parse(fs.readFileSync(eventPath, "utf8")).repository
          ?.default_branch || ""
      );
    } catch {
      return "";
    }
  }
  return "";
}

function isCompleteCacheKey(key) {
  if (typeof key !== "string" || key.length > defaultLogicalKeyLength)
    return false;
  const parts = key.split("/");
  const safePart = (value) => /^[A-Za-z0-9._-]+$/.test(value);
  if (parts.some((part) => !safePart(part))) return false;
  if (!/^v\d+$/.test(parts.at(-1))) return false;
  if (parts[0] === "trusted") {
    return (
      parts.length >= 8 &&
      safePart(parts[1]) &&
      safePart(parts[2]) &&
      safePart(parts[3]) &&
      safePart(parts[4]) &&
      safePart(parts[5]) &&
      parts.slice(6, -1).length <= defaultLogicalKeyComponents
    );
  }
  if (parts[0] === "untrusted") {
    return (
      parts.length >= 8 &&
      safePart(parts[1]) &&
      safePart(parts[2]) &&
      /^pr-[1-9]\d*$/.test(parts[3]) &&
      safePart(parts[4]) &&
      safePart(parts[5]) &&
      parts.slice(6, -1).length <= defaultLogicalKeyComponents
    );
  }
  return (
    parts[0] === "shared" &&
    parts.length >= 7 &&
    safePart(parts[1]) &&
    safePart(parts[2]) &&
    safePart(parts[3]) &&
    safePart(parts[4]) &&
    parts.slice(5, -1).length <= defaultLogicalKeyComponents
  );
}

function cacheName() {
  const value = input("cache-name").trim();
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(value)) {
    throw new Error(
      "cache-name is required and may contain only letters, numbers, hyphens, and underscores",
    );
  }
  const allowed = configuredCacheNames();
  if (allowed && !allowed.includes(value)) {
    throw new Error(
      `cache-name is not allowed by the configured cache-name allowlist: ${value}`,
    );
  }
  return value;
}

function cacheScope(inputName = "scope", fallbackInputName = null) {
  const configured = input(inputName).trim();
  const configuredScope = String(configuration().scope ?? "").trim();
  const value = (
    configured ||
    (fallbackInputName
      ? input(fallbackInputName) || configuredScope || "auto"
      : configuredScope || "auto")
  )
    .trim()
    .toLowerCase();
  if (!["auto", "shared", "trusted", "untrusted"].includes(value)) {
    throw new Error("scope must be auto, shared, trusted, or untrusted");
  }
  return value;
}

function runnerPlatform() {
  // GitHub exposes optional action inputs as INPUT_* even when omitted. The
  // metadata default distinguishes omission from an explicitly empty value.
  const osInput = input("os");
  const archInput = input("arch");
  const osValue =
    osInput === "__runner__"
      ? process.env.RUNNER_OS
      : hasInput("os")
        ? osInput
        : process.env.RUNNER_OS;
  const archValue =
    archInput === "__runner__"
      ? process.env.RUNNER_ARCH
      : hasInput("arch")
        ? archInput
        : process.env.RUNNER_ARCH;
  const osName = (osValue || "unknown").trim() || "unknown";
  const architecture = (archValue || "unknown").trim() || "unknown";
  const safe = (value) => value.replace(/[^A-Za-z0-9._-]/g, "-").toLowerCase();
  return `${safe(osName)}-${safe(architecture)}`;
}

function logicalCacheKey(value, name, includeVersion = true) {
  const maxLength = configuredLimit(
    "CACHE_MAX_LOGICAL_KEY_LENGTH",
    "max_logical_key_length",
    defaultLogicalKeyLength,
    "security",
  );
  const maxComponents = configuredLimit(
    "CACHE_MAX_LOGICAL_KEY_COMPONENTS",
    "max_logical_key_components",
    defaultLogicalKeyComponents,
    "security",
  );
  const raw = String(value).trim();
  if (!raw || raw.length > maxLength) {
    throw new Error(`cache key must be between 1 and ${maxLength} characters`);
  }
  const rawParts = raw.replace(/\/$/, "").split("/");
  if (
    rawParts.length > maxComponents ||
    rawParts.some(
      (part) =>
        !/^[A-Za-z0-9._-]+$/.test(part) || part === "." || part === "..",
    )
  ) {
    throw new Error("cache key contains invalid or too many path components");
  }
  const key = raw.startsWith(`${name}/`) ? raw : `${name}/${raw}`;
  const platform = runnerPlatform();
  const withoutName = key.slice(name.length + 1);
  const firstPart = withoutName.split("/")[0];
  const hasPlatform =
    firstPart.toLowerCase() === platform.toLowerCase() ||
    (/^[A-Za-z0-9._-]+-[A-Za-z0-9._-]+$/.test(firstPart) &&
      withoutName.split("/").length > 1);
  const withPlatform = hasPlatform ? key : `${name}/${platform}/${withoutName}`;
  if (withPlatform.length > maxLength) {
    throw new Error(`cache key must not exceed ${maxLength} characters`);
  }
  if (!includeVersion) return withPlatform;
  const version =
    input("version").trim() ||
    String(configuration().version ?? "").trim() ||
    "1";
  if (!/^\d+$/.test(version))
    throw new Error("version must contain numbers only");
  const complete = /\/v[A-Za-z0-9._-]+$/.test(withPlatform)
    ? withPlatform
    : `${withPlatform}/v${version}`;
  if (complete.length > maxLength) {
    throw new Error(`cache key must not exceed ${maxLength} characters`);
  }
  return complete;
}

function isPullRequestEvent() {
  return (
    eventName() === "pull_request" ||
    eventName() === "pull_request_target" ||
    process.env.GITHUB_REF?.includes("/pull/")
  );
}

function validateRestorePrefix(key) {
  const parts = key.replace(/\/$/, "").split("/");
  const validPart = (part) =>
    /^[A-Za-z0-9._-]+$/.test(part) && part !== ".." && part !== ".";
  const validNamespace =
    parts[0] === "trusted"
      ? parts.length >= 5 &&
        validPart(parts[1]) &&
        validPart(parts[2]) &&
        validPart(parts[3])
      : parts[0] === "untrusted" &&
        parts.length >= 5 &&
        validPart(parts[1]) &&
        validPart(parts[2]) &&
        /^pr-[1-9]\d*$/.test(parts[3]);
  const sharedNamespace =
    parts[0] === "shared" &&
    parts.length >= 3 &&
    validPart(parts[1]) &&
    validPart(parts[2]);
  if (
    (!validNamespace && !sharedNamespace) ||
    parts.some((part) => !validPart(part))
  ) {
    throw new Error(
      "restore-keys contains a value outside the trusted/untrusted/shared schema",
    );
  }
  return key;
}

function refName() {
  return process.env.GITHUB_REF_NAME || "";
}

function manifestBranch() {
  const configuredBranch = configuration().manifest_branch;
  const branch =
    process.env.CACHE_MANIFEST_BRANCH ||
    input("manifest-branch") ||
    configuredBranch ||
    "cache-data";
  if (
    typeof branch !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,200}$/.test(branch) ||
    branch.includes("..") ||
    branch.includes("//") ||
    branch.endsWith("/") ||
    branch.endsWith(".")
  ) {
    throw new Error("manifest branch is invalid");
  }
  return branch;
}

function pullRequestNumber() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const number = JSON.parse(fs.readFileSync(eventPath, "utf8")).pull_request
        ?.number;
      if (Number.isInteger(number) && number > 0) return number;
    } catch {
      // Fall through to the ref-based fallback below.
    }
  }
  const match = (process.env.GITHUB_REF || "").match(
    /^refs\/pull\/([1-9]\d*)\/merge$/,
  );
  return match ? Number(match[1]) : null;
}

function pullRequestSourceRepository() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return "";
  try {
    return (
      JSON.parse(fs.readFileSync(eventPath, "utf8")).pull_request?.head?.repo
        ?.full_name || ""
    );
  } catch {
    return "";
  }
}

function isForkPullRequest() {
  const source = pullRequestSourceRepository();
  return isPullRequestEvent() && Boolean(source) && source !== repository();
}

function scopedKey(key, scopeInputName = "scope", fallbackScopeInputName = null) {
  if (!key) return key;
  const name = cacheName();
  const scope = cacheScope(scopeInputName, fallbackScopeInputName);
  if (/^(?:trusted|untrusted|shared)\//.test(key)) {
    throw new Error(
      "key must not contain a trusted/, untrusted/, or shared/ prefix; use scope",
    );
  }
  const logicalKey = logicalCacheKey(key, name);
  const sourceRepository = repository();
  if (!sourceRepository)
    throw new Error("GITHUB_REPOSITORY is required for an automatic cache key");
  const pullRequest = isPullRequestEvent();
  const selectedScope =
    scope === "auto" ? (pullRequest ? "untrusted" : "trusted") : scope;
  if (selectedScope === "shared") {
    if (pullRequest) {
      log("scope=shared is mapped to an isolated untrusted PR cache");
      const number = pullRequestNumber();
      if (!number)
        throw new Error(
          "pull request number is required for an automatic PR cache key",
        );
      return `untrusted/${sourceRepository}/pr-${number}/${logicalKey}`;
    }
    return `shared/${sourceRepository}/${logicalKey}`;
  }
  if (selectedScope === "untrusted") {
    const number = pullRequestNumber();
    if (!sourceRepository || !number)
      throw new Error(
        "repository and pull request number are required for an automatic PR cache key",
      );
    return `untrusted/${sourceRepository}/pr-${number}/${logicalKey}`;
  }
  if (!sourceRepository)
    throw new Error("GITHUB_REPOSITORY is required for an automatic cache key");
  const branch = defaultBranch();
  if (!branch)
    throw new Error(
      "repository default branch is required for an automatic trusted cache key",
    );
  return `trusted/${sourceRepository}/${branch}/${logicalKey}`;
}

function scopeCounterpartKey(key) {
  const branch = defaultBranch();
  const sourceRepository = repository();
  const defaultRef =
    branch && process.env.GITHUB_REF === `refs/heads/${branch}`;
  if (!defaultRef || !sourceRepository) return null;
  const sharedPrefix = `shared/${sourceRepository}/`;
  const trustedPrefix = `trusted/${sourceRepository}/${branch}/`;
  if (key.startsWith(sharedPrefix))
    return `${trustedPrefix}${key.slice(sharedPrefix.length)}`;
  if (key.startsWith(trustedPrefix))
    return `${sharedPrefix}${key.slice(trustedPrefix.length)}`;
  return null;
}

function pullRequestCacheCombination(key) {
  if (!key.startsWith("untrusted/")) return null;
  const parts = key.split("/");
  if (
    parts.length < 8 ||
    !/^pr-[1-9]\d*$/.test(parts[3]) ||
    !/^v\d+$/.test(parts[parts.length - 1])
  ) {
    return null;
  }
  return `${parts.slice(0, 6).join("/")}/${parts[parts.length - 1]}`;
}

function sharedEquivalentKey(key) {
  if (!key.startsWith("untrusted/")) return null;
  const parts = key.split("/");
  if (parts.length < 8 || !/^pr-[1-9]\d*$/.test(parts[3])) return null;
  return `shared/${parts[1]}/${parts[2]}/${parts.slice(4).join("/")}`;
}

function expiredUntrustedReferences(
  references,
  now = Date.now(),
  ttlMs = 24 * 60 * 60 * 1000,
) {
  return Object.entries(references || {}).filter(([key, reference]) => {
    if (!key.startsWith("untrusted/") || !reference?.updated_at) return false;
    const updatedAt = Date.parse(reference.updated_at);
    return Number.isFinite(updatedAt) && now - updatedAt >= ttlMs;
  });
}

function scopedRestorePrefix(prefix) {
  const value = prefix.trim();
  if (!value) return value;
  // An explicit shared prefix is a read-only fallback. PR access remains
  // guarded by assertTrustedRestoreAllowed and allow-shared-restore.
  if (/^shared\//.test(value)) {
    return validateRestorePrefix(value);
  }
  if (/^(?:trusted|untrusted)\//.test(value)) {
    throw new Error(
      "restore-keys must not contain a trusted/ or untrusted/ prefix; use scope",
    );
  }
  const name = cacheName();
  const scope = cacheScope();
  const logicalKey = logicalCacheKey(value, name, false);
  const logicalParts = logicalKey.replace(/\/$/, "").split("/");
  if (
    !logicalParts.length ||
    logicalParts.some((part) => !/^[A-Za-z0-9._-]+$/.test(part))
  ) {
    throw new Error("restore-keys contains invalid path components");
  }
  const sourceRepository = repository();
  if (!sourceRepository)
    throw new Error(
      "GITHUB_REPOSITORY is required for an automatic restore key",
    );
  const pullRequest = isPullRequestEvent();
  const selectedScope =
    scope === "auto" ? (pullRequest ? "untrusted" : "trusted") : scope;
  if (selectedScope === "shared") {
    if (pullRequest)
      log("scope=shared is mapped to an isolated untrusted PR cache");
    if (pullRequest) {
      const number = pullRequestNumber();
      if (!number)
        throw new Error(
          "pull request number is required for an automatic restore key",
        );
      return `untrusted/${sourceRepository}/pr-${number}/${logicalKey}`;
    }
    return `shared/${sourceRepository}/${logicalKey}`;
  }
  if (selectedScope === "untrusted") {
    const number = pullRequestNumber();
    if (!number)
      throw new Error(
        "pull request number is required for an automatic restore key",
      );
    return `untrusted/${sourceRepository}/pr-${number}/${logicalKey}`;
  }
  const branch = defaultBranch();
  if (!branch)
    throw new Error(
      "repository default branch is required for an automatic restore key",
    );
  return `trusted/${sourceRepository}/${branch}/${logicalKey}`;
}

function sharedRestorePrefix(prefix) {
  const value = prefix.trim();
  if (!value) return value;
  if (/^shared\//.test(value)) return validateRestorePrefix(value);
  if (/^(?:trusted|untrusted)\//.test(value)) {
    throw new Error(
      "restore-keys must not contain a trusted/ or untrusted/ prefix; use scope",
    );
  }
  const logicalKey = logicalCacheKey(value, cacheName(), false);
  if (
    logicalKey
      .replace(/\/$/, "")
      .split("/")
      .some((part) => !/^[A-Za-z0-9._-]+$/.test(part))
  ) {
    throw new Error("restore-keys contains invalid path components");
  }
  const sourceRepository = repository();
  if (!sourceRepository)
    throw new Error(
      "GITHUB_REPOSITORY is required for an automatic shared restore key",
    );
  return `shared/${sourceRepository}/${logicalKey}`;
}

function assertTrustedRestoreAllowed(keys) {
  const isPullRequest =
    eventName() === "pull_request" ||
    process.env.GITHUB_REF?.includes("/pull/");
  if (isPullRequest && keys.some((key) => key.startsWith("trusted/"))) {
    throw new Error("pull requests may not restore trusted cache keys");
  }
  if (!isPullRequest && keys.some((key) => key.startsWith("untrusted/"))) {
    throw new Error(
      "default-branch workflows may not restore untrusted cache keys",
    );
  }
  if (
    isPullRequest &&
    keys.some((key) => key.startsWith("shared/")) &&
    String(input("allow-shared-restore")).toLowerCase() !== "true"
  ) {
    throw new Error("shared cache restore requires allow-shared-restore=true");
  }
}

const loggedMessages = new Set();

function log(message) {
  if (loggedMessages.has(message)) return;
  loggedMessages.add(message);
  console.log(`::notice::${message}`);
}

function summary(title, fields) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const escape = (value) =>
    String(value ?? "—")
      .replace(/\\/g, "\\\\")
      .replace(/\|/g, "\\|")
      .replace(/\r?\n/g, " ");
  const rows = Object.entries(fields)
    .map(([name, value]) => `| ${escape(name)} | ${escape(value)} |`)
    .join("\n");
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### ${escape(title)}\n\n| Feld | Wert |\n| --- | --- |\n${rows}\n\n`,
  );
}

function fail(error) {
  const message = error?.message || String(error);
  const debug =
    process.env.ACTIONS_STEP_DEBUG === "true" ||
    process.env.RUNNER_DEBUG === "1";
  if (String(input("strict")).toLowerCase() !== "true") {
    console.log(`::warning::cache ignored: ${message}`);
    if (debug && error?.stack) console.error(error.stack);
    return false;
  }
  console.error(`Cache error: ${message}`);
  if (debug && error?.stack) console.error(error.stack);
  process.exitCode = 1;
  return false;
}

function headerValue(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  return headers[name] || headers[name.toLowerCase()] || "";
}

function githubApiError(status, message, headers) {
  if (status === 401) {
    return new Error(
      "GitHub authentication failed (401 Bad credentials): the cache repository rejected the token. " +
        "Pass token: ${{ github.token }} or set GITHUB_TOKEN. For a separate cache repository, " +
        "use a PAT or GitHub App token with access to that repository. Fork pull requests cannot " +
        "use write-capable secrets; skip saving there or save from a trusted workflow.",
    );
  }
  if (status === 403) {
    if (/rate limit exceeded|rate limit/i.test(String(message))) {
      const retryAfter = headerValue(headers, "retry-after");
      const reset = headerValue(headers, "x-ratelimit-reset");
      const resetText = reset
        ? ` The limit resets at ${new Date(Number(reset) * 1000).toISOString()}.`
        : "";
      return new Error(
        "GitHub API rate limit exceeded (403): GitHub temporarily rejected the cache request. " +
          `Wait${retryAfter ? ` at least ${retryAfter} seconds` : ""} until the rate limit resets, or use an authenticated token with sufficient API quota.` +
          `${resetText} GitHub message: ${message}`,
      );
    }
    return new Error(
      `GitHub authorization failed (403): the token is valid but is not allowed to access the cache repository. ${message}`,
    );
  }
  return new Error(`${status} ${message}`);
}

async function gh(url, options = {}) {
  const client = await githubClient();
  if (client) {
    try {
      const requestOptions = {
        ...options,
        request: { ...(options.request || {}), timeout: githubApiTimeoutMs },
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": apiVersion,
          ...(options.headers || {}),
        },
      };
      if (typeof requestOptions.body === "string") {
        try {
          requestOptions.body = JSON.parse(requestOptions.body);
        } catch {
          /* non-JSON body */
        }
      }
      if (
        requestOptions.body &&
        typeof requestOptions.body === "object" &&
        !Buffer.isBuffer(requestOptions.body)
      ) {
        Object.assign(requestOptions, requestOptions.body);
        delete requestOptions.body;
      }
      const response = await client.request(url, {
        ...requestOptions,
      });
      return { body: response.data, headers: response.headers };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      const apiError = githubApiError(
        error.status || 500,
        message,
        error.response?.headers,
      );
      apiError.status = error.status;
      apiError.headers = error.response?.headers;
      throw apiError;
    }
  }
  const method = String(options.method || "GET").toUpperCase();
  let response;
  for (let attempt = 0; ; attempt += 1) {
    response = await fetch(`https://api.github.com${url}`, {
      ...options,
      signal: AbortSignal.timeout(githubApiTimeoutMs),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": apiVersion,
        ...authorizationHeaders(),
        ...(options.headers || {}),
      },
    });
    const retryable =
      method === "GET" &&
      [408, 429, 500, 502, 503, 504].includes(response.status) &&
      attempt < githubApiMaxRetries;
    if (!retryable) break;
    if (response.body) await response.body.cancel();
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) {
    const error = githubApiError(
      response.status,
      body.message || text,
      response.headers,
    );
    error.status = response.status;
    error.headers = response.headers;
    throw error;
  }
  return { body, headers: response.headers };
}

async function upload(url, file, name, contentType) {
  const size = fs.statSync(file).size;
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(githubApiTimeoutMs),
    headers: {
      ...authorizationHeaders(),
      "Content-Type": contentType,
      "Content-Length": size,
      "X-GitHub-Api-Version": apiVersion,
    },
    body: fs.createReadStream(file),
    duplex: "half",
  });
  if (response.ok) return JSON.parse(await response.text());
  const text = await response.text();
  let message;
  try {
    message = JSON.parse(text).message || text;
  } catch {
    message = text;
  }
  const error = githubApiError(response.status, message, response.headers);
  error.status = response.status;
  throw error;
}

function run(command, args) {
  return cp.execFileSync(command, args, { stdio: ["ignore", "pipe", "pipe"] });
}

function have(command) {
  try {
    run(command, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

function entries() {
  return input("path")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function excludePatterns() {
  const patterns = input("exclude")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const files = input("exclude-path")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  for (const value of files) {
    const absolute = path.resolve(workspace, value);
    const relative = path.relative(workspace, absolute);
    if (
      path.isAbsolute(relative) ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`)
    ) {
      throw new Error(
        `exclude-path must be inside the GitHub workspace: ${value}`,
      );
    }
    let stat;
    try {
      stat = fs.lstatSync(absolute);
    } catch (error) {
      throw new Error(`could not read exclude-path ${value}: ${error.message}`);
    }
    if (stat.isSymbolicLink())
      throw new Error(`exclude-path must not be a symbolic link: ${value}`);
    if (!stat.isFile())
      throw new Error(`exclude-path must reference a regular file: ${value}`);
    if (stat.size > 1024 * 1024)
      throw new Error(`exclude-path is too large: ${value}`);
    try {
      patterns.push(
        ...fs
          .readFileSync(absolute, "utf8")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#")),
      );
    } catch (error) {
      throw new Error(`could not read exclude-path ${value}: ${error.message}`);
    }
  }
  if (patterns.some((value) => value.length > 4096 || value.includes("\0"))) {
    throw new Error(
      "exclude patterns must be at most 4096 characters and contain no NUL bytes",
    );
  }
  return patterns;
}

function encryptionKey() {
  const value = input("encryption-key");
  if (!value) return null;
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, "hex");
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function encryptionEnabled() {
  return Boolean(encryptionKey());
}

function compressionLevel() {
  const configured =
    input("compression-level") ||
    process.env.CACHE_COMPRESSION_LEVEL ||
    configuration().compression_level ||
    "3";
  const value = String(configured).trim();
  if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error("compression-level must be an integer");
  }
  return value;
}

function encryptFile(file) {
  const key = encryptionKey();
  if (!key) return file;
  // Deriving the nonce from the compressed content keeps identical encrypted
  // caches deduplicable while remaining unique for different content.
  const nonce = digestBytes(file).subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = `${file}.enc`;
  const input = fs.openSync(file, "r");
  const output = fs.openSync(encrypted, "w");
  try {
    fs.writeSync(output, encryptionMagic);
    fs.writeSync(output, nonce);
    const tagOffset = encryptionMagic.length + nonce.length;
    fs.writeSync(output, Buffer.alloc(16));
    transformFile(input, output, cipher);
    const finalChunk = cipher.final();
    if (finalChunk.length) fs.writeSync(output, finalChunk);
    fs.writeSync(output, cipher.getAuthTag(), 0, 16, tagOffset);
  } finally {
    fs.closeSync(input);
    fs.closeSync(output);
  }
  fs.rmSync(file, { force: true });
  fs.renameSync(encrypted, file);
  return file;
}

function decryptFile(file) {
  const input = fs.openSync(file, "r");
  const header = Buffer.alloc(encryptionMagic.length + 12 + 16);
  try {
    fs.readSync(input, header, 0, header.length, 0);
  } finally {
    fs.closeSync(input);
  }
  if (!header.subarray(0, encryptionMagic.length).equals(encryptionMagic))
    return file;
  const key = encryptionKey();
  if (!key)
    throw new Error("encrypted cache requires the encryption-key input");
  const offset = encryptionMagic.length;
  const nonce = header.subarray(offset, offset + 12);
  const tag = header.subarray(offset + 12, offset + 28);
  const decrypted = `${file}.decrypted`;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    const source = fs.openSync(file, "r");
    const destination = fs.openSync(decrypted, "w");
    try {
      transformFile(source, destination, decipher, offset + 28);
      const finalChunk = decipher.final();
      if (finalChunk.length) fs.writeSync(destination, finalChunk);
    } finally {
      fs.closeSync(source);
      fs.closeSync(destination);
    }
    return decrypted;
  } catch {
    removeTemporaryFile(decrypted);
    throw new Error(
      "encrypted cache could not be decrypted; check encryption-key",
    );
  }
}

// Cache inputs are treated as untrusted. Refuse obvious credentials before tar
// ever sees them, and refuse symlinks so an apparently harmless cache path
// cannot unexpectedly include data outside the workspace.
const sensitiveName =
  /^(?:\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|\.git-credentials|credentials?(?:[._-].*)?|id_(?:rsa|dsa|ecdsa|ed25519))$/i;
const sensitiveKeywordName =
  /(^|[-_.])(secret|secrets|token|tokens|password|passwd)([-_.]|$)|\.(key|p12|pfx)$/i;
const sourceFileName =
  /\.(?:py|js|mjs|cjs|ts|tsx|java|go|rs|c|cc|cpp|h|hpp|rb|php|cs|swift|kt|kts|scala|sh)$/i;
const binaryFileName =
  /\.(?:7z|aar|bin|class|dll|dylib|exe|gz|iso|jar|jpeg|jpg|pyc|so|tar|tgz|war|webp|zip|zst)$/i;
const packageMetadataPath =
  /(?:^|[\\/])[^\\/]+\.(?:dist-info|egg-info)(?:[\\/]|$)/i;
const npmIndexPath = /(?:^|[\\/])_cacache[\\/]index-v\d+(?:[\\/]|$)/i;
const sensitiveDirectory =
  /(^|[\\/])(?:\.ssh|\.aws|\.docker|\.kube)(?:[\\/]|$)/i;
const virtualEnvironmentPath = /(^|[\\/])\.venv(?:[\\/]|$)/i;
const privateKeyContent = /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i;
const knownTokenContent =
  /(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/i;
const credentialAssignment =
  /(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*(?:"[^"\r\n]{8,}"|'[^'\r\n]{8,}'|[A-Za-z0-9_+/=.-]{20,})/i;

function securityScan(root) {
  const walk = (file) => {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) {
      const target = path.resolve(path.dirname(file), fs.readlinkSync(file));
      const targetRelative = path.relative(root, target);
      if (
        path.isAbsolute(targetRelative) ||
        targetRelative === ".." ||
        targetRelative.startsWith(`..${path.sep}`)
      ) {
        throw new Error(
          `cache path contains an external symlink: ${path.relative(process.cwd(), file)}`,
        );
      }
      return;
    }
    const relative = path.relative(root, file);
    if (
      virtualEnvironmentPath.test(relative) ||
      path.basename(file) === ".venv"
    ) {
      throw new Error(
        `cache path must not contain a virtual environment: ${path.relative(process.cwd(), file)}`,
      );
    }
    if (
      sensitiveDirectory.test(relative) ||
      sensitiveName.test(path.basename(file)) ||
      (sensitiveKeywordName.test(path.basename(file)) &&
        !sourceFileName.test(path.basename(file)) &&
        !binaryFileName.test(path.basename(file)))
    ) {
      throw new Error(
        `cache path contains a sensitive-looking file: ${path.relative(process.cwd(), file)}`,
      );
    }
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(file)) walk(path.join(file, child));
    } else if (
      stat.isFile() &&
      stat.size <= 1024 * 1024 &&
      !binaryFileName.test(file)
    ) {
      const content = fs.readFileSync(file);
      if (content.includes(0)) return;
      const text = content.toString("utf8");
      const sourceOrMetadata =
        sourceFileName.test(file) ||
        packageMetadataPath.test(file) ||
        npmIndexPath.test(file);
      if (
        privateKeyContent.test(text) ||
        (!sourceOrMetadata &&
          (knownTokenContent.test(text) || credentialAssignment.test(text)))
      ) {
        throw new Error(
          `cache path contains credential-like content: ${path.relative(process.cwd(), file)}`,
        );
      }
    }
  };
  walk(root);
}

async function makeArchive() {
  if (!have("tar") || !have("zstd"))
    throw new Error("tar and zstd are required on the runner");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cac-"));
  const output = path.join(directory, "object.tar.zst");
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const paths = [];
  for (const value of entries()) {
    const absolute = path.resolve(workspace, value);
    const relative = path.relative(workspace, absolute);
    if (
      path.isAbsolute(relative) ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`)
    ) {
      throw new Error(`cache path must be inside the workspace: ${value}`);
    }
    if (fs.existsSync(absolute)) {
      if (
        virtualEnvironmentPath.test(relative) ||
        path.basename(absolute) === ".venv"
      ) {
        throw new Error(
          `cache path must not contain a virtual environment: ${value}`,
        );
      }
      securityScan(absolute);
      paths.push(relative || ".");
    } else log(`cache path missing: ${value}`);
  }
  if (!paths.length) throw new Error("no cache paths exist");
  const excludes = excludePatterns().flatMap((value) => ["--exclude", value]);
  const tar = cp.spawn(
    "tar",
    [
      "--sort=name",
      "--mtime=UTC 1970-01-01",
      "--owner=0",
      "--group=0",
      "--numeric-owner",
      "--dereference",
      "--hard-dereference",
      "--exclude-vcs",
      "--format=gnu",
      "-cf",
      "-",
      ...excludes,
      "-C",
      workspace,
      ...paths,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const zstd = cp.spawn(
    "zstd",
    ["-q", `-${compressionLevel()}`, "-o", output],
    {
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  tar.stdout.pipe(zstd.stdin);
  await Promise.all([
    new Promise((resolve, reject) => {
      tar.once("error", reject);
      tar.once("close", (code) =>
        code === 0 ? resolve() : reject(new Error("tar failed")),
      );
    }),
    new Promise((resolve, reject) => {
      zstd.once("error", reject);
      zstd.once("close", (code) =>
        code === 0 ? resolve() : reject(new Error("zstd failed")),
      );
    }),
  ]);
  await validateArchive(output);
  encryptFile(output);
  return { file: output, dir: directory };
}

async function decompressZstd(inputFile, outputFile, maxBytes) {
  const zstd = cp.spawn("zstd", ["-q", "-d", "-c", inputFile], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const exit = new Promise((resolve, reject) => {
    zstd.once("error", reject);
    zstd.once("close", resolve);
  });
  const limiter = createBoundedTransform(
    maxBytes,
    "cache archive exceeds the uncompressed size limit",
  );
  try {
    await pipeline(zstd.stdout, limiter, fs.createWriteStream(outputFile));
    const code = await exit;
    if (code !== 0) throw new Error("zstd decompression failed");
  } catch (error) {
    zstd.kill("SIGKILL");
    removeTemporaryFile(outputFile);
    throw error;
  }
}

async function validateArchiveFile(file) {
  const tarFile = path.join(path.dirname(file), "validation.tar");
  try {
    if (fs.statSync(file).size > maxCompressedBytes) {
      throw new Error("cache archive exceeds the compressed size limit");
    }
    await decompressZstd(file, tarFile, maxTarBytes);
    return inspectTar(tarFile);
  } finally {
    removeTemporaryFile(tarFile);
  }
}

const validateArchive = validateArchiveFile;

function inspectTar(tarFile) {
  const tarSize = fs.statSync(tarFile).size;
  if (tarSize > maxTarBytes)
    throw new Error("cache archive exceeds the uncompressed size limit");
  const listing = cp.spawnSync("tar", ["-tf", tarFile], { encoding: "utf8" });
  if (listing.status) {
    throw new Error(
      `created tar archive is invalid: ${listing.stderr || "tar listing failed"}`,
    );
  }
  const names = listing.stdout.split(/\r?\n/).filter(Boolean);
  if (names.length > maxArchiveEntries)
    throw new Error("cache archive contains too many entries");
  if (names.some((name) => name.length > maxArchivePathLength)) {
    throw new Error("cache archive contains an excessively long path");
  }
  if (
    names.some(
      (name) =>
        path.isAbsolute(name) ||
        name.split("/").includes("..") ||
        name.split("\\").includes(".."),
    )
  ) {
    throw new Error("cache archive contains an unsafe path");
  }
  const details = cp.spawnSync("tar", ["-tvf", tarFile], { encoding: "utf8" });
  if (details.status)
    throw new Error(
      `cache archive metadata is invalid: ${details.stderr || "tar listing failed"}`,
    );
  for (const line of details.stdout.split(/\r?\n/).filter(Boolean)) {
    const type = line[0];
    if (type !== "-" && type !== "d")
      throw new Error(
        "cache archive contains a symlink, hardlink, or special file",
      );
  }
  return names;
}

function transformFile(input, output, transform, position = 0) {
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let offset = position;
  let bytesRead;
  do {
    bytesRead = fs.readSync(input, buffer, 0, buffer.length, offset);
    if (bytesRead) {
      const chunk = transform.update(buffer.subarray(0, bytesRead));
      if (chunk.length) fs.writeSync(output, chunk);
      offset += bytesRead;
    }
  } while (bytesRead);
}

function digestBytes(file) {
  const hash = crypto.createHash("sha256");
  const input = fs.openSync(file, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let offset = 0;
    let bytesRead;
    do {
      bytesRead = fs.readSync(input, buffer, 0, buffer.length, offset);
      if (bytesRead) {
        hash.update(buffer.subarray(0, bytesRead));
        offset += bytesRead;
      }
    } while (bytesRead);
  } finally {
    fs.closeSync(input);
  }
  return hash.digest();
}

function digest(file) {
  return `sha256:${digestBytes(file).toString("hex")}`;
}

async function release(repository) {
  if (releaseCache.has(repository)) return releaseCache.get(repository);
  const pending = (async () => {
    try {
      return (await gh(`/repos/${repository}/releases/tags/cache-v1`)).body;
    } catch (error) {
      if (error.status !== 404) throw error;
      return (
        await gh(`/repos/${repository}/releases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tag_name: "cache-v1",
            name: "Cache objects (v1)",
            prerelease: true,
          }),
        })
      ).body;
    }
  })();
  releaseCache.set(repository, pending);
  try {
    return await pending;
  } catch (error) {
    releaseCache.delete(repository);
    throw error;
  }
}

async function assets(repository) {
  if (assetsCache.has(repository)) return assetsCache.get(repository);
  const pending = (async () => {
    const cacheRelease = await release(repository);
    return {
      release: cacheRelease,
      assets: (
        await gh(
          `/repos/${repository}/releases/${cacheRelease.id}/assets?per_page=100`,
        )
      ).body,
    };
  })();
  assetsCache.set(repository, pending);
  try {
    return await pending;
  } catch (error) {
    assetsCache.delete(repository);
    throw error;
  }
}

function invalidateRepositoryCache(repository) {
  assetsCache.delete(repository);
  releaseCache.delete(repository);
}

async function object(repository, hash) {
  validateCacheHash(hash);
  const result = await assets(repository);
  return result.assets.find(
    (asset) =>
      isSafeAsset(asset) &&
      (asset.name === `${hash.slice(7)}.tar.zst` ||
        asset.name.endsWith(`--${hash.slice(7)}.tar.zst`)),
  );
}

function isSafeAsset(asset) {
  if (!asset || typeof asset.name !== "string") return false;
  if (
    asset.name.length > 255 ||
    /[\r\n]/.test(asset.name) ||
    !/^[^/\\\0]+\.tar\.zst$/i.test(asset.name)
  )
    return false;
  try {
    const url = new URL(asset.browser_download_url);
    return url.protocol === "https:" && url.hostname === "github.com";
  } catch {
    return false;
  }
}

function assetNamePrefix(key) {
  const slug = key
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${slug}--`;
}

function assetName(key, hash) {
  return `${assetNamePrefix(key)}${hash.slice(7)}.tar.zst`;
}

function assetMatchesKeyCombination(name, key) {
  const parts = key.split("/");
  const isShared = key.startsWith("shared/");
  const baseLength = isShared ? 5 : 6;
  const version = parts.at(-1);
  if (!version || (!isShared && !key.startsWith("trusted/"))) return false;
  const prefix = parts
    .slice(0, baseLength)
    .join("/")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  if (!name.startsWith(`${prefix}-`) || !hashFromAssetName(name)) return false;
  return isShared || name.includes(`-${version}--`);
}

function hashFromAssetName(name) {
  const match = name.match(/(?:^|--)([a-f0-9]{64})\.tar\.zst$/i);
  return match ? `sha256:${match[1]}` : null;
}

async function manifest(repository) {
  const branch = manifestBranch();
  const result = await gh(
    `/repos/${repository}/contents/manifests/references-v1.json?ref=${encodeURIComponent(branch)}`,
  );
  const json = JSON.parse(
    Buffer.from(result.body.content, "base64").toString(),
  );
  validateManifest(json);
  return {
    json,
    sha: result.body.sha,
  };
}

async function refs(repository, { fresh = false } = {}) {
  if (!fresh && manifestCache.has(repository)) {
    return manifestCache.get(repository);
  }
  const pending = (async () => {
    try {
      return await manifest(repository);
    } catch (error) {
      if (error.status !== 404) throw error;
      return { json: { schema_version: 1, references: {} }, sha: null };
    }
  })();
  manifestCache.set(repository, pending);
  try {
    return await pending;
  } catch (error) {
    if (manifestCache.get(repository) === pending)
      manifestCache.delete(repository);
    throw error;
  }
}

function invalidateManifestCache(repository) {
  manifestCache.delete(repository);
}

async function updateManifestUnlocked(repository, message, update) {
  const maxAttempts = 12;
  const branch = manifestBranch();
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // A compare-and-swap update must never use the read cache. This also
    // ensures a retry observes the version that caused the conflict.
    invalidateManifestCache(repository);
    const current = await refs(repository, { fresh: true });
    if (!update(current.json)) return current.json;
    try {
      await gh(`/repos/${repository}/contents/manifests/references-v1.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content: Buffer.from(
            `${JSON.stringify(current.json, null, 2)}\n`,
          ).toString("base64"),
          ...(current.sha ? { sha: current.sha } : {}),
          branch,
        }),
      });
      invalidateManifestCache(repository);
      return current.json;
    } catch (error) {
      // GitHub also uses 409 for protected-branch/ruleset violations. Those
      // requests cannot succeed by retrying; only a real optimistic-lock
      // conflict should enter the retry loop.
      const isManifestConflict =
        error.status === 409 && /\bconflict\b/i.test(error.message || "");
      if (!isManifestConflict || attempt === maxAttempts - 1) throw error;
      invalidateManifestCache(repository);
      const delay =
        Math.min(1000 * 2 ** attempt, 10000) + Math.floor(Math.random() * 250);
      log(
        `manifest update conflicted; retrying in ${delay}ms (attempt ${attempt + 2}/${maxAttempts})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`reference update conflicted after ${maxAttempts} attempts`);
}

async function updateManifest(repository, message, update) {
  const previous = manifestLocks.get(repository) || Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(() => updateManifestUnlocked(repository, message, update));
  manifestLocks.set(repository, current);
  try {
    return await current;
  } finally {
    if (manifestLocks.get(repository) === current)
      manifestLocks.delete(repository);
  }
}

function manifestWriteGuard(manifest, replacingKey = null) {
  const now = Date.now();
  const maxReferences = configuredLimit(
    "CACHE_MAX_MANIFEST_REFERENCES",
    "max_manifest_references",
    defaultManifestReferenceLimit,
  );
  const maxWrites = configuredLimit(
    "CACHE_MAX_MANIFEST_WRITES_PER_HOUR",
    "max_manifest_writes_per_hour",
    defaultManifestWritesPerHour,
  );
  const monitoring =
    manifest.monitoring && typeof manifest.monitoring === "object"
      ? manifest.monitoring
      : {};
  const lockedUntil = Date.parse(monitoring.locked_until || "");
  if (Number.isFinite(lockedUntil) && lockedUntil > now) {
    throw new Error(
      `cache writes are temporarily locked until ${monitoring.locked_until}`,
    );
  }
  const referenceCount =
    Object.keys(manifest.references || {}).length -
    (replacingKey && manifest.references?.[replacingKey] ? 1 : 0);
  if (referenceCount >= maxReferences) {
    throw new Error(
      `cache manifest reference limit reached (${maxReferences})`,
    );
  }
  const windowStarted = Date.parse(monitoring.window_started_at || "");
  if (
    !Number.isFinite(windowStarted) ||
    now - windowStarted >= 60 * 60 * 1000
  ) {
    monitoring.window_started_at = new Date(now).toISOString();
    monitoring.writes = 0;
  }
  if (Number(monitoring.writes || 0) >= maxWrites) {
    monitoring.locked_until = new Date(now + 60 * 60 * 1000).toISOString();
    monitoring.lock_reason = "manifest write rate limit exceeded";
    monitoring.locked_at = new Date(now).toISOString();
    manifest.monitoring = monitoring;
    return false;
  }
  monitoring.writes = Number(monitoring.writes || 0) + 1;
  manifest.monitoring = monitoring;
  return true;
}

async function setRef(repository, key, hash, metadata = {}) {
  let locked = false;
  return updateManifest(repository, `cache: update ${key}`, (manifest) => {
    if (manifest.references[key]?.object === hash) return false;
    if (!manifestWriteGuard(manifest)) {
      locked = true;
      return true;
    }
    manifest.references[key] = {
      object: hash,
      updated_at: new Date().toISOString(),
      source: process.env.GITHUB_REPOSITORY || null,
      created_by: process.env.GITHUB_ACTOR || null,
      size: Number.isFinite(metadata.size) ? metadata.size : null,
    };
    return true;
  }).then((result) => {
    if (locked)
      throw new Error(
        "cache writes are temporarily locked: manifest write rate limit exceeded",
      );
    return result;
  });
}

async function replaceRef(repository, key, hash, removeKey, metadata = {}) {
  let locked = false;
  const result = await updateManifest(
    repository,
    `cache: replace ${removeKey} with ${key}`,
    (manifest) => {
      if (manifest.references[key]?.object === hash) return false;
      if (!manifestWriteGuard(manifest, removeKey)) {
        locked = true;
        return true;
      }
      if (removeKey && removeKey !== key) delete manifest.references[removeKey];
      manifest.references[key] = {
        object: hash,
        updated_at: new Date().toISOString(),
        source: process.env.GITHUB_REPOSITORY || null,
        created_by: process.env.GITHUB_ACTOR || null,
        size: Number.isFinite(metadata.size) ? metadata.size : null,
      };
      return true;
    },
  );
  if (locked)
    throw new Error(
      "cache writes are temporarily locked: manifest write rate limit exceeded",
    );
  return result;
}

async function deleteObject(repository, hash, invalidate = true) {
  const asset = await object(repository, hash);
  if (!asset) return false;
  await gh(`/repos/${repository}/releases/assets/${asset.id}`, {
    method: "DELETE",
  });
  if (invalidate) invalidateRepositoryCache(repository);
  return true;
}

async function download(repository, hash) {
  validateCacheHash(hash);
  const asset = await object(repository, hash);
  if (!asset) throw new Error(`object ${hash} not found`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cad-"));
  const file = path.join(directory, asset.name);
  try {
    await downloadToFile(asset.browser_download_url, file, {
      maxBytes: maxCompressedBytes,
      timeoutMs: 120000,
      headers: authorizationHeaders(),
    });
    if (digest(file) !== hash)
      throw new Error("integrity check failed: sha256 mismatch");
    return file;
  } catch (error) {
    removeTemporaryFile(directory);
    throw error;
  }
}

async function downloadToFile(url, output, options = {}) {
  const maxBytes = parsePositiveSafeInteger(
    options.maxBytes ?? maxCompressedBytes,
    "download size limit",
  );
  const timeoutMs = parsePositiveSafeInteger(
    options.timeoutMs ?? 120000,
    "download timeout",
  );
  const response = await fetch(url, {
    headers: options.headers || {},
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxBytes)
    throw new Error("cache archive exceeds the compressed size limit");
  if (!response.body) throw new Error("download response has no body");
  try {
    await pipeline(
      Readable.fromWeb(response.body),
      createBoundedTransform(
        maxBytes,
        "cache archive exceeds the compressed size limit",
      ),
      fs.createWriteStream(output),
    );
  } catch (error) {
    removeTemporaryFile(output);
    throw error;
  }
  return output;
}

function restorePaths() {
  const values = entries().map((value) => {
    const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
    if (!normalized || normalized === ".") return ".";
    if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
      throw new Error(`cache path must be inside the workspace: ${value}`);
    }
    return normalized.replace(/\/$/, "");
  });
  if (!values.length) throw new Error("no cache paths specified");
  return values;
}

function assertArchiveMatchesRestorePaths(names, paths) {
  if (paths.includes(".")) return;
  const normalizedNames = names.map((name) =>
    name.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, ""),
  );
  if (
    normalizedNames.some(
      (name) =>
        !paths.some(
          (root) =>
            name === root ||
            name.startsWith(`${root}/`) ||
            root.startsWith(`${name}/`),
        ),
    )
  ) {
    throw new Error("cache archive contains files outside the configured path");
  }
}

async function extract(file, paths = restorePaths()) {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  if (fs.statSync(file).size > maxCompressedBytes) {
    throw new Error("cache archive exceeds the compressed size limit");
  }
  const decrypted = decryptFile(file);
  const tarFile = path.join(path.dirname(decrypted), "object.tar");
  try {
    await decompressZstd(decrypted, tarFile, maxTarBytes);
    const names = inspectTar(tarFile);
    assertArchiveMatchesRestorePaths(names, paths);
    const extraction = cp.spawnSync(
      "tar",
      [
        "--extract",
        "--file",
        tarFile,
        "--directory",
        workspace,
        "--no-same-owner",
        "--no-same-permissions",
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    if (extraction.status) throw new Error("tar extraction failed");
  } finally {
    removeTemporaryFile(tarFile);
  }
}

module.exports = {
  parsePositiveSafeInteger,
  input,
  hasInput,
  token,
  setOutput,
  eventName,
  repository,
  cacheRepository,
  configuredCacheNames,
  defaultBranch,
  pullRequestNumber,
  isPullRequestEvent,
  pullRequestSourceRepository,
  isForkPullRequest,
  isSafeAsset,
  cacheName,
  cacheScope,
  runnerPlatform,
  scopedKey,
  scopeCounterpartKey,
  pullRequestCacheCombination,
  sharedEquivalentKey,
  expiredUntrustedReferences,
  scopedRestorePrefix,
  sharedRestorePrefix,
  assertTrustedRestoreAllowed,
  log,
  summary,
  fail,
  gh,
  upload,
  entries,
  excludePatterns,
  refName,
  manifestBranch,
  securityScan,
  makeArchive,
  inspectTar,
  digest,
  assetNamePrefix,
  assetName,
  assetMatchesKeyCombination,
  hashFromAssetName,
  validateCacheHash,
  validateManifestReference,
  validateManifest,
  createBoundedTransform,
  downloadToFile,
  decompressZstd,
  validateArchiveFile,
  removeTemporaryFile,
  encryptionEnabled,
  compressionLevel,
  encryptFile,
  decryptFile,
  release,
  assets,
  invalidateRepositoryCache,
  object,
  refs,
  updateManifest,
  setRef,
  replaceRef,
  deleteObject,
  manifestWriteGuard,
  download,
  extract,
};
