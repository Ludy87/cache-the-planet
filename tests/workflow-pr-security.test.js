const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workflow = fs.readFileSync(
  path.join(__dirname, "../.github/workflows/integration-save-suite.yml"),
  "utf8",
);
// Job/step boundaries use the workflow's indentation, without adding a YAML
// dependency to the action. Evaluate guards to check their actual behavior.
const jobDefinitions = workflow.slice(workflow.indexOf("\njobs:\n") + 7);
const boundaries = [...jobDefinitions.matchAll(/^  ([a-z][a-z0-9_-]*):\n/gm)];
const jobs = Object.fromEntries(boundaries.map((match, index) => [
  match[1], jobDefinitions.slice(match.index, boundaries[index + 1]?.index),
]));

function enabled(block, indent, github, result = "success") {
  const guard = block.match(new RegExp(`^${" ".repeat(indent)}if: (.+)$`, "m"));
  if (!guard) return true;
  const expression = guard[1]
    .replace(/^\$\{\{\s*|\s*\}\}$/g, "")
    .replace(/needs\.([a-z0-9_-]+)\.result/g, 'needs["$1"].result');
  const needs = Object.fromEntries(Object.keys(jobs).map(name => [name, { result }]));
  return Boolean(vm.runInNewContext(expression, {
    github, needs, cancelled: () => false,
  }, { timeout: 100 }));
}

test("PR jobs never grant write permissions or pass repository secrets", () => {
  for (const sameRepository of [true, false]) {
    for (const ref of ["refs/pull/7/merge", "refs/heads/main"]) {
      const github = {
        event_name: "pull_request", ref,
        repository: "owner/repo",
        event: { pull_request: {
          user: { login: "Ludy87" },
          head: { repo: { full_name: sameRepository ? "owner/repo" : "fork/repo" } },
        } },
      };
      for (const [name, job] of Object.entries(jobs)) {
        if (!enabled(job, 4, github)) continue;
        assert.doesNotMatch(job, /^      [\w-]+: write$/m, name);
        const [settings, ...steps] = job.split(/^      - /m);
        assert.doesNotMatch(settings, /\bsecrets\./, name);
        for (const step of steps) {
          if (enabled(step, 8, github)) {
            assert.doesNotMatch(step, /\bsecrets\./, name);
          }
        }
      }
    }
  }
});

test("PR hashing and tests run when privileged dependencies are skipped", () => {
  const github = { event_name: "pull_request", ref: "refs/pull/7/merge" };
  assert.ok(enabled(jobs.hash_pr, 4, github, "skipped"));
  assert.ok(enabled(jobs.test, 4, github, "skipped"));
  assert.ok(enabled(jobs["all-save-checks-passed"], 4, github, "skipped"));
  assert.match(jobs.test, /^      contents: read$/m);
});

test("cache writes remain available on main and are blocked on other branches", () => {
  for (const [name, job] of Object.entries(jobs)) {
    if (!/^      contents: write$/m.test(job)) continue;
    for (const event_name of ["push", "workflow_dispatch"]) {
      assert.ok(enabled(job, 4, { event_name, ref: "refs/heads/main" }), name);
      assert.equal(enabled(job, 4, { event_name, ref: "refs/heads/feature" }), false, name);
    }
  }
  const cacheStep = jobs.test.split(/^      - /m).find(step => /\bsecrets\./.test(step));
  assert.ok(cacheStep);
  assert.ok(enabled(cacheStep, 8, { event_name: "push", ref: "refs/heads/main" }));
  assert.match(cacheStep, /^          restore-only: true$/m);
});
