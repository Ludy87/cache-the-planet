const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("SFTP ignores JSON credentials and keeps input/environment precedence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sftp-config-test-"));
  try {
    fs.writeFileSync(path.join(root, ".cache-the-planet.json"), JSON.stringify({
      storage: "sftp", sftp: { host: "example.invalid", username: "test-user", port: 2222,
        base_path: "/test-cache", private_key: "json-placeholder", password: "json-placeholder" },
    }));
    const modulePath = path.resolve(__dirname, "../src/common.js");
    const cases = [
      [{}, null],
      [{ SFTP_PASSWORD: "environment-placeholder" }, { password: "environment-placeholder" }],
      [{ SFTP_PRIVATE_KEY: "environment-placeholder" }, { privateKey: "environment-placeholder" }],
      [{ SFTP_PASSWORD: "environment-placeholder", INPUT_SFTP_PASSWORD: "input-placeholder" }, { password: "input-placeholder" }],
      [{ SFTP_PRIVATE_KEY: "environment-placeholder", INPUT_SFTP_PRIVATE_KEY: "input-placeholder" }, { privateKey: "input-placeholder" }],
    ];
    for (const [overrides, expected] of cases) {
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(INPUT_|SFTP_|CACHE_|GITHUB_WORKSPACE$)/i.test(key)));
      const code = `const assert = require('node:assert/strict');
        const c = require(${JSON.stringify(modulePath)});
        const expected = ${JSON.stringify(expected)};
        if (!expected) assert.throws(() => c.sftpSettings(), /SFTP storage requires/);
        else {
          const settings = c.sftpSettings();
          assert.equal(settings.host, 'example.invalid');
          assert.equal(settings.port, 2222);
          assert.equal(settings.basePath, '/test-cache');
          assert.equal(settings.password, expected.password);
          assert.equal(settings.privateKey, expected.privateKey);
        }`;
      const result = spawnSync(process.execPath, ["-e", code], { env: { ...env, GITHUB_WORKSPACE: root, ...overrides }, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
