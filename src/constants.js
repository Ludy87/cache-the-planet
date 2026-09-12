const INPUTS = Object.freeze({
  ALLOW_PR_CACHE: "allow-pr-cache",
  ALLOW_SHARED_RESTORE: "allow-shared-restore",
  ARCH: "arch",
  CACHE_NAME: "cache-name",
  COMPRESSION_LEVEL: "compression-level",
  CONFIG_FILE: "config-file",
  DELETE_SHARED: "delete-shared",
  DRY_RUN: "dry-run",
  ENCRYPTION_KEY: "encryption-key",
  EXCLUDE: "exclude",
  EXCLUDE_PATH: "exclude-path",
  EXPIRE_ALL_UNTRUSTED: "expire-all-untrusted",
  GRACE_DAYS: "grace-days",
  KEY: "key",
  MANIFEST_BRANCH: "manifest-branch",
  MODE: "mode",
  MULTI_CACHE: "multi-cache",
  OBJECT: "object",
  OS: "os",
  PATH: "path",
  PR_NUMBER: "pr-number",
  PR_REPOSITORY: "pr-repository",
  RESTORE_KEYS: "restore-keys",
  RESTORE_ONLY: "restore-only",
  REPOSITORY: "repository",
  SAVE_SCOPE: "save-scope",
  SCOPE: "scope",
  TOKEN: "token",
  STRICT: "strict",
  UNTRUSTED_TTL_HOURS: "untrusted-ttl-hours",
  VERSION: "version",
});

const OUTPUTS = Object.freeze({
  CACHE_HIT: "cache-hit",
  MATCHED_KEY: "matched-key",
  CONTENT_HASH: "content-hash",
  ASSET_NAME: "asset-name",
  CACHE_SIZE: "cache-size",
});

const CACHE_PHASES = Object.freeze({
  RESTORE: "restore",
  SAVE: "save",
});

module.exports = { INPUTS, OUTPUTS, CACHE_PHASES };
