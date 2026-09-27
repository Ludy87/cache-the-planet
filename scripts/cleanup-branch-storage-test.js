const { execFileSync } = require("node:child_process");

// Delete only files below the unique test-run prefix. Keep the current tree as
// base and publish without force, so concurrent saves cannot be overwritten.
async function cleanup(env, api) {
  const { GITHUB_REPOSITORY: repository, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: attempt } = env;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || "") ||
      !/^[1-9]\d*$/.test(run || "") || !/^[1-9]\d*$/.test(attempt || ""))
    throw new Error("Invalid test-run cleanup identity");
  const prefix = `integration-tests/branch-${run}-${attempt}/`;
  const base = `/repos/${repository}/git`;
  for (let retry = 0; retry < 3; retry += 1) {
    const head = await api(`${base}/ref/heads/cache-data`);
    const commit = await api(`${base}/commits/${head.object.sha}`);
    const tree = await api(`${base}/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw new Error("Refusing cleanup of an incomplete Git tree");
    const files = tree.tree.filter(entry => entry.type === "blob" && entry.path.startsWith(prefix));
    if (!files.length) return 0;
    const updated = await api(`${base}/trees`, "POST", {
      base_tree: commit.tree.sha,
      tree: files.map(({ path, mode }) => ({ path, mode, type: "blob", sha: null })),
    });
    const next = await api(`${base}/commits`, "POST", {
      message: `test(cache): remove branch test ${run}-${attempt}`,
      tree: updated.sha,
      parents: [head.object.sha],
    });
    try {
      await api(`${base}/refs/heads/cache-data`, "PATCH", { sha: next.sha, force: false });
      return files.length;
    } catch (error) {
      // Rebuild only if the branch actually advanced. Permission/ruleset errors
      // with the same head must remain visible to the workflow.
      const current = await api(`${base}/ref/heads/cache-data`);
      if (current.object.sha === head.object.sha || retry === 2) throw error;
    }
  }
}

if (require.main === module) {
  const api = async (endpoint, method = "GET", body) => JSON.parse(execFileSync("gh", [
    "api", endpoint, "--method", method, ...(body ? ["--input", "-"] : []),
  ], {
    input: body ? JSON.stringify(body) : undefined,
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    timeout: 120000, stdio: ["pipe", "pipe", "pipe"],
  }));
  cleanup(process.env, api).then(count => console.log(`Removed ${count} test files from cache-data; Git history is retained.`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { cleanup };
