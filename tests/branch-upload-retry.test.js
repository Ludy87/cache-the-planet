const test = require("node:test");
const assert = require("node:assert/strict");

test("blob uploads retry server errors five times, preserve bytes, and reject permanent errors", async () => {
  const originalFetch = global.fetch;
  const saved = new Map(["GITHUB_TOKEN", "INPUT_TOKEN"].map(key => [key, process.env[key]]));
  for (const key of saved.keys()) delete process.env[key];
  const common = require("../src/common");
  const requests = [];
  try {
    global.fetch = async (url, options) => {
      requests.push({ url, body: options.body });
      return new Response(JSON.stringify(requests.length < 3 ? { message: "busy" } : { sha: "blob-sha" }), {
        status: requests.length < 3 ? 502 : 201,
      });
    };
    const result = await common.uploadBranchBlob("owner/repo", Buffer.from("test bytes"));
    assert.equal(result.body.sha, "blob-sha");
    assert.equal(requests.length, 3);
    assert.equal(new Set(requests.map(request => request.body)).size, 1);
    assert.ok(requests.every(request => request.url.endsWith("/git/blobs")));

    for (const [status, expectedCalls] of [[503, 6], [422, 1], [403, 1]]) {
      let calls = 0;
      global.fetch = async () => {
        calls += 1;
        return new Response(JSON.stringify({ message: "rejected" }), { status });
      };
      await assert.rejects(common.uploadBranchBlob("owner/repo", Buffer.from("test bytes")), error => error.status === status);
      assert.equal(calls, expectedCalls);
    }
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
