const assert = require("node:assert/strict");
const test = require("node:test");

const { githubApiError } = require("../src/common");

test("server errors include a useful message and request id", () => {
  const error = githubApiError(500, "", {
    "x-github-request-id": "ABC123",
  });
  assert.equal(
    error.message,
    "GitHub API server error (500): GitHub returned no diagnostic message (request ID: ABC123)",
  );
});
