const assert = require("node:assert/strict");
const test = require("node:test");

const { classifyZstdFailure } = require("../src/common");

test("classifies zstd exit code 70 as a broken output pipe", () => {
  assert.equal(
    classifyZstdFailure(new Error("zstd exited with code 70")),
    "output pipe closed (broken pipe; zstd exit code 70)",
  );
});

test("keeps genuine ENOSPC errors classified as storage exhaustion", () => {
  const error = new Error("write failed");
  error.code = "ENOSPC";
  assert.equal(
    classifyZstdFailure(error),
    "no space left on device",
  );
});
