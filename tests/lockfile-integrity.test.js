const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const lockfile = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package-lock.json"), "utf8"),
);

test("package-lock uses registry tarballs with integrity hashes", () => {
  assert.equal(lockfile.lockfileVersion, 3);
  const packages = Object.entries(lockfile.packages).filter(
    ([packagePath, metadata]) => packagePath && metadata.resolved,
  );
  assert.ok(packages.length > 0);
  for (const [packagePath, metadata] of packages) {
    assert.equal(
      new URL(metadata.resolved).origin,
      "https://registry.npmjs.org",
      `${packagePath} must come from the npm registry`,
    );
    assert.match(
      metadata.resolved,
      /\/[^/]+\.tgz$/,
      `${packagePath} must resolve to a tarball`,
    );
    assert.match(
      metadata.integrity,
      /^sha(?:1|256|384|512)-[A-Za-z0-9+/]+=*$/,
      `${packagePath} must contain a valid integrity hash`,
    );
  }
});
