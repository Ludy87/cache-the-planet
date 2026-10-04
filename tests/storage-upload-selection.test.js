const assert = require("node:assert/strict");
const test = require("node:test");

const common = require("../src/common");

test("artifact storage is accepted without release fallback", () => {
  assert.equal(common.assertObjectUploadStorage("github-artifact"), "github-artifact");
});

test("unsupported upload storage fails closed instead of selecting release", () => {
  assert.throws(
    () => common.assertObjectUploadStorage("unexpected-storage"),
    /refusing github-release fallback/,
  );
});
