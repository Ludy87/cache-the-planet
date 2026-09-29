const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanup } = require("../scripts/cleanup-branch-storage-test");
const env = { GITHUB_REPOSITORY: "owner/repo", GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "2" };

test("test cleanup removes only this attempt's manifest and parts", async () => {
  const writes = [];
  const paths = ["integration-tests/branch-123-2/v1/github/shared.json", "integration-tests/branch-123-2/objects/v1/hash/part-0"];
  const api = async (url, method, body) => {
    if (method) { writes.push({ url, body }); return { sha: "created" }; }
    if (url.includes("/ref/")) return { object: { sha: "head" } };
    if (url.includes("/commits/")) return { tree: { sha: "base" } };
    return { tree: [...paths, "integration-tests/branch-123-1/object", "integration-tests/branch-123-20/object", "manifests/v1/github/shared.json"].map(path => ({ path, type: "blob", mode: "100644" })) };
  };
  assert.equal(await cleanup(env, api), 2);
  assert.deepEqual(writes[0].body.tree.map(entry => entry.path), paths);
  assert.ok(writes[0].body.tree.every(entry => entry.sha === null));
  assert.equal(writes[0].body.base_tree, "base");
  assert.deepEqual(writes[1].body.parents, ["head"]);
  assert.equal(writes[2].body.force, false);
});

test("cleanup fails closed on invalid identity or truncated tree", async () => {
  await assert.rejects(cleanup({ ...env, GITHUB_RUN_ID: "../123" }, () => assert.fail()), /identity/);
  await assert.rejects(cleanup(env, async url => {
    if (url.includes("/ref/")) return { object: { sha: "head" } };
    if (url.includes("/commits/")) return { tree: { sha: "base" } };
    return { truncated: true };
  }), /incomplete/);
});
