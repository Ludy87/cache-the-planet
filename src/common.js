const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const cp = require("child_process");

const apiVersion = "2022-11-28";
const encryptionMagic = Buffer.from("CTPENC1\0");
const maxCompressedBytes = Number(
  process.env.CACHE_MAX_COMPRESSED_BYTES || 2 * 1024 ** 3,
);
const maxTarBytes = Number(process.env.CACHE_MAX_TAR_BYTES || 8 * 1024 ** 3);
const maxArchiveEntries = Number(process.env.CACHE_MAX_ENTRIES || 200000);
const maxArchivePathLength = 4096;
const defaultManifestReferenceLimit = 100000;
const defaultManifestWritesPerHour = 1000;
const defaultLogicalKeyLength = 512;
const defaultLogicalKeyComponents = 16;

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

function authorizationHeaders() {
  const value = token();
  return value ? { Authorization: `Bearer ${value}` } : {};
}

let githubClientPromise;
let configurationCache;

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
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`${environmentName} must be a positive integer`);
  }
  return limit;
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
  if (names === undefined) return null;
  if (
    !Array.isArray(names) ||
    names.length === 0 ||
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

function headRef() {
  return process.env.GITHUB_HEAD_REF || "";
}

function baseRef() {
  return process.env.GITHUB_BASE_REF || "";
}

function isCompleteCacheKey(key) {
  return /^(?:trusted\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+-[^/]+\/[^/]+\/v1|untrusted\/[^/]+\/[^/]+\/pr-[1-9]\d*\/[^/]+\/[^/]+-[^/]+\/[^/]+\/v1|shared\/[^/]+\/[^/]+\/[^/]+\/[^/]+-[^/]+\/[^/]+\/v1)$/.test(
    key,
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

function cacheScope() {
  const value = input("scope", "auto").trim().toLowerCase();
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
  const version = input("version", "1").trim() || "1";
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

function scopedKey(key) {
  if (!key) return key;
  const name = cacheName();
  const scope = cacheScope();
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
    if (pullRequest)
      log("scope=shared is mapped to an isolated untrusted PR cache");
    if (pullRequest) {
      const number = pullRequestNumber();
      if (!number)
        throw new Error(
          "pull request number is required for an automatic PR cache key",
        );
      return `untrusted/${sourceRepository}/pr-${number}/${logicalKey}`;
    }
    return `shared/${sourceRepository}/${logicalKey}`;
  }
  if (
    selectedScope === "untrusted" ||
    (pullRequest && selectedScope === "untrusted")
  ) {
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
  if (
    selectedScope === "untrusted" ||
    (pullRequest && selectedScope === "untrusted")
  ) {
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

function log(message) {
  console.log(`::notice::${message}`);
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

function githubApiError(status, message) {
  if (status === 401) {
    return new Error(
      "GitHub authentication failed (401 Bad credentials): the cache repository rejected the token. " +
        "Pass token: ${{ github.token }} or set GITHUB_TOKEN. For a separate cache repository, " +
        "use a PAT or GitHub App token with access to that repository. Fork pull requests cannot " +
        "use write-capable secrets; skip saving there or save from a trusted workflow.",
    );
  }
  if (status === 403) {
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
      const apiError = githubApiError(error.status || 500, message);
      apiError.status = error.status;
      apiError.headers = error.response?.headers;
      throw apiError;
    }
  }
  const response = await fetch(`https://api.github.com${url}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": apiVersion,
      ...authorizationHeaders(),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) {
    const error = githubApiError(response.status, body.message || text);
    error.status = response.status;
    error.headers = response.headers;
    throw error;
  }
  return { body, headers: response.headers };
}

async function upload(url, file, name, contentType) {
  const bytes = fs.readFileSync(file);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...authorizationHeaders(),
      "Content-Type": contentType,
      "Content-Length": bytes.length,
      "X-GitHub-Api-Version": apiVersion,
    },
    body: bytes,
  });
  if (response.ok) return JSON.parse(await response.text());
  const text = await response.text();
  let message;
  try {
    message = JSON.parse(text).message || text;
  } catch {
    message = text;
  }
  const error = githubApiError(response.status, message);
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

function encryptFile(file) {
  const key = encryptionKey();
  if (!key) return file;
  const plaintext = fs.readFileSync(file);
  // Deriving the nonce from the compressed content keeps identical encrypted
  // caches deduplicable while remaining unique for different content.
  const nonce = crypto
    .createHash("sha256")
    .update(plaintext)
    .digest()
    .subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const encrypted = `${file}.enc`;
  fs.writeFileSync(
    encrypted,
    Buffer.concat([encryptionMagic, nonce, cipher.getAuthTag(), ciphertext]),
  );
  fs.unlinkSync(file);
  fs.renameSync(encrypted, file);
  return file;
}

function decryptFile(file) {
  const inputBuffer = fs.readFileSync(file);
  if (!inputBuffer.subarray(0, encryptionMagic.length).equals(encryptionMagic))
    return file;
  const key = encryptionKey();
  if (!key)
    throw new Error("encrypted cache requires the encryption-key input");
  const offset = encryptionMagic.length;
  const nonce = inputBuffer.subarray(offset, offset + 12);
  const tag = inputBuffer.subarray(offset + 12, offset + 28);
  const ciphertext = inputBuffer.subarray(offset + 28);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    const decrypted = `${file}.decrypted`;
    fs.writeFileSync(decrypted, plaintext);
    return decrypted;
  } catch {
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
    ["-q", `-${input("compression-level", "3")}`, "-o", output],
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
  validateArchive(output);
  encryptFile(output);
  return { file: output, dir: directory };
}

function validateArchive(file) {
  const tarFile = path.join(path.dirname(file), "validation.tar");
  if (fs.statSync(file).size > maxCompressedBytes) {
    throw new Error("cache archive exceeds the compressed size limit");
  }
  const decompression = cp.spawnSync(
    "zstd",
    ["-q", "-d", "-f", file, "-o", tarFile],
    {
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  if (decompression.status)
    throw new Error("created zstd archive cannot be decompressed");
  inspectTar(tarFile);
}

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

function digest(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return `sha256:${hash.digest("hex")}`;
}

async function release(repository) {
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
}

async function assets(repository) {
  const cacheRelease = await release(repository);
  return {
    release: cacheRelease,
    assets: (
      await gh(
        `/repos/${repository}/releases/${cacheRelease.id}/assets?per_page=100`,
      )
    ).body,
  };
}

async function object(repository, hash) {
  const result = await assets(repository);
  return result.assets.find(
    (asset) =>
      asset.name === `${hash.slice(7)}.tar.zst` ||
      asset.name.endsWith(`--${hash.slice(7)}.tar.zst`),
  );
}

function assetName(key, hash) {
  const slug = key
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${slug}--${hash.slice(7)}.tar.zst`;
}

function hashFromAssetName(name) {
  const match = name.match(/(?:^|--)([a-f0-9]{64})\.tar\.zst$/i);
  return match ? `sha256:${match[1]}` : null;
}

async function manifest(repository) {
  const branch =
    process.env.CACHE_MANIFEST_BRANCH || input("manifest-branch", "main");
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,200}$/.test(branch) ||
    branch.includes("..") ||
    branch.includes("//") ||
    branch.endsWith("/") ||
    branch.endsWith(".")
  ) {
    throw new Error("manifest branch is invalid");
  }
  const result = await gh(
    `/repos/${repository}/contents/manifests/references-v1.json?ref=${encodeURIComponent(branch)}`,
  );
  return {
    json: JSON.parse(Buffer.from(result.body.content, "base64").toString()),
    sha: result.body.sha,
  };
}

async function refs(repository) {
  try {
    return await manifest(repository);
  } catch (error) {
    if (error.status !== 404) throw error;
    return { json: { schema_version: 1, references: {} }, sha: null };
  }
}

async function updateManifest(repository, message, update) {
  const maxAttempts = 12;
  const branch =
    process.env.CACHE_MANIFEST_BRANCH || input("manifest-branch", "main");
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,200}$/.test(branch) ||
    branch.includes("..") ||
    branch.includes("//") ||
    branch.endsWith("/") ||
    branch.endsWith(".")
  ) {
    throw new Error("manifest branch is invalid");
  }
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await refs(repository);
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
      return current.json;
    } catch (error) {
      if (error.status !== 409 || attempt === maxAttempts - 1) throw error;
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

async function deleteObject(repository, hash) {
  const asset = await object(repository, hash);
  if (!asset) return false;
  await gh(`/repos/${repository}/releases/assets/${asset.id}`, {
    method: "DELETE",
  });
  return true;
}

async function download(repository, hash) {
  const asset = await object(repository, hash);
  if (!asset) throw new Error(`object ${hash} not found`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cad-"));
  const file = path.join(directory, asset.name);
  const response = await fetch(asset.browser_download_url, {
    headers: authorizationHeaders(),
  });
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxCompressedBytes)
    throw new Error("cache archive exceeds the compressed size limit");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxCompressedBytes)
    throw new Error("cache archive exceeds the compressed size limit");
  fs.writeFileSync(file, bytes);
  if (digest(file) !== hash)
    throw new Error("integrity check failed: sha256 mismatch");
  return file;
}

function extract(file) {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  if (fs.statSync(file).size > maxCompressedBytes) {
    throw new Error("cache archive exceeds the compressed size limit");
  }
  const decrypted = decryptFile(file);
  const tarFile = path.join(path.dirname(decrypted), "object.tar");
  const decompression = cp.spawnSync(
    "zstd",
    ["-q", "-d", "-f", decrypted, "-o", tarFile],
    {
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  if (decompression.status) throw new Error("zstd decompression failed");
  const names = inspectTar(tarFile);
  for (const name of names) {
    if (
      path.isAbsolute(name) ||
      name.split("/").includes("..") ||
      name.split("\\").includes("..")
    ) {
      throw new Error("unsafe archive path");
    }
  }
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
}

module.exports = {
  input,
  hasInput,
  token,
  eventName,
  repository,
  defaultBranch,
  headRef,
  baseRef,
  pullRequestNumber,
  isPullRequestEvent,
  pullRequestSourceRepository,
  isForkPullRequest,
  cacheName,
  cacheScope,
  runnerPlatform,
  scopedKey,
  scopeCounterpartKey,
  pullRequestCacheCombination,
  expiredUntrustedReferences,
  scopedRestorePrefix,
  sharedRestorePrefix,
  assertTrustedRestoreAllowed,
  log,
  fail,
  gh,
  upload,
  entries,
  excludePatterns,
  refName,
  securityScan,
  makeArchive,
  inspectTar,
  digest,
  assetName,
  hashFromAssetName,
  encryptFile,
  decryptFile,
  release,
  assets,
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
