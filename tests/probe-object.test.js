const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("branch probe checks every part using metadata only", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "probe-object-"));
  const old = { ...process.env };
  const originalFetch = global.fetch;
  try {
    for (const key of Object.keys(process.env)) {
      if (/^(INPUT_|CACHE_|GITHUB_)/i.test(key)) delete process.env[key];
    }
    process.env.GITHUB_WORKSPACE = root;
    process.env.INPUT_STORAGE = "github-branch";
    const c = require("../src/common");
    const hash = "sha256:" + "a".repeat(64);
    const reference = { object: hash, size: 20, parts: [
      { index: 0, object: hash, size: 10 },
      { index: 1, object: hash, size: 10 },
    ] };
    let body = { type: "file", size: 10 };
    let status = 200;
    global.fetch = async (url) => {
      assert.match(String(url), /\/contents\/manifests\/objects\/v1\/a{64}\/part-00000[01]\?ref=cache-data$/);
      return new Response(JSON.stringify(body), { status });
    };
    assert.equal((await c.probeObject("owner/repo", reference)).size, 20);
    body = { type: "file", size: 11 };
    assert.equal(await c.probeObject("owner/repo", reference), null);
    status = 404;
    assert.equal(await c.probeObject("owner/repo", reference), null);
    status = 403;
    await assert.rejects(c.probeObject("owner/repo", reference));
    assert.equal(await c.probeObject("owner/repo", { object: hash }), null);
    await assert.rejects(c.probeObject("owner/repo", { ...reference, size: 21 }));
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in old)) delete process.env[key];
    Object.assign(process.env, old);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
