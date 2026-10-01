// Isolate backend I/O while exercising the real restore and multi-cache entrypoints.
const c = require("../../src/common");
const name = process.env["INPUT_CACHE-NAME"] || "npm";
const key = `trusted/owner/repo/main/${name}/linux-x64/test/v1`;
const matched = process.env.PROBE_CASE === "fallback" ? key + "-older" : key;
const missing = process.env.PROBE_CASE === "miss" && name === "npm";
c.cacheRepository = () => "owner/repo";
c.scopedKey = () => key;
c.cacheScope = () => "trusted";
c.assertTrustedRestoreAllowed = () => {};
c.refsForKeys = async () => ({ json: { references: missing ? {} : {
  [matched]: {
    object: "sha256:" + "a".repeat(64),
    storage: process.env.INPUT_STORAGE || "github-branch",
    size: 10,
  },
} } });
c.probeObject = async () => {
  if (process.env.PROBE_CASE === "error") throw Error("metadata unavailable");
  return process.env.PROBE_CASE === "missing-object" ? null : { name: "test", size: 10 };
};
for (const method of ["download", "downloadBranchObject", "extract", "object"]) {
  c[method] = () => { throw Error("Unexpected payload operation: " + method); };
}
