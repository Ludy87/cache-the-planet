const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const common = require("../src/common");

test("downloads retry server failures twice without writing error bodies", async () => {
  const originalFetch = global.fetch;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cache-download-retry-"));
  const output = path.join(directory, "archive");
  let calls = 0;
  try {
    global.fetch = async () => {
      calls += 1;
      return calls < 3
        ? new Response("server error", { status: 502 })
        : new Response("verified bytes");
    };
    await common.downloadToFile("https://example.invalid/object", output);
    assert.equal(calls, 3);
    assert.equal(fs.readFileSync(output, "utf8"), "verified bytes");
    fs.unlinkSync(output);
    for (const [status, expectedCalls] of [[503, 3], [403, 1], [404, 1]]) {
      calls = 0;
      global.fetch = async () => {
        calls += 1;
        return new Response("rejected", { status });
      };
      await assert.rejects(common.downloadToFile("https://example.invalid/object", output), new RegExp(String(status)));
      assert.equal(calls, expectedCalls);
      assert.equal(fs.existsSync(output), false);
    }
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
