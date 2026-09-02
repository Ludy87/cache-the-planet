const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = process.env.PR_CACHE_ARTIFACTS_DIR || path.join(process.cwd(), 'pr-cache-artifacts');
const eventFile = path.join(process.env.RUNNER_TEMP || root, 'cache-the-planet-pr-event.json');
const number = String(process.env.PR_NUMBER || '');
const repository = process.env.CACHE_REPOSITORY || process.env.GITHUB_REPOSITORY;

if (!/^\d+$/.test(number) || !repository) throw new Error('PR_NUMBER and CACHE_REPOSITORY are required');
fs.writeFileSync(eventFile, JSON.stringify({
  repository: { default_branch: 'main' },
  pull_request: { number: Number(number) },
}));

const patterns = [
  ['uv-python-3-13', 4],
  ['gradle-java17', 1],
  ['maven-java17', 1],
  ['docker', 2],
  ['npm', 1],
  ['task', 1],
  ['uv', 2],
];
const artifacts = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory());
const prefix = `cache-the-planet-pr-${number}-`;

for (const entry of artifacts) {
  if (!entry.name.startsWith(prefix)) continue;
  const suffix = entry.name.slice(prefix.length);
  const match = patterns.find(([name]) => suffix.startsWith(`${name}-`));
  if (!match) throw new Error(`unknown PR cache artifact: ${entry.name}`);
  const [cacheName, version] = match;
  const rest = suffix.slice(cacheName.length + 1);
  const keyMatch = rest.match(/^([0-9a-f]+)-v(\d+)$/);
  if (!keyMatch || Number(keyMatch[2]) !== version) throw new Error(`invalid PR cache artifact name: ${entry.name}`);
  const env = {
    ...process.env,
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_EVENT_PATH: eventFile,
    GITHUB_REF: `refs/pull/${number}/merge`,
    GITHUB_REPOSITORY: repository,
    INPUT_REPOSITORY: repository,
    'INPUT_CACHE-NAME': cacheName,
    INPUT_SCOPE: 'untrusted',
    'INPUT_ALLOW-PR-CACHE': 'true',
    INPUT_KEY: keyMatch[1],
    INPUT_VERSION: String(version),
    INPUT_PATH: path.join(root, entry.name),
    // The trusted publisher replaces the previous cache for this PR
    // combination when the dependency hash changed.
    INPUT_STRICT: 'false',
  };
  cp.execFileSync(process.execPath, [path.join(process.cwd(), 'dist', 'save.js')], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });
}
