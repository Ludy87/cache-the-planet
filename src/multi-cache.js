const cp = require("child_process");
const path = require("path");

function input(name) {
  const normalized = name.replace(/ /g, "_").toUpperCase();
  return process.env[`INPUT_${name.toUpperCase()}`] || process.env[`INPUT_${normalized}`] || "";
}

function parseDefinitions(value) {
  const entries = [];
  let current = null;
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const name = line.match(/^-?\s*([A-Za-z0-9_-]+):\s*$/);
    const pathValue = line.match(/^[-\s]*path:\s*(.+?)\s*$/);
    if (name) {
      current = { name: name[1] };
      entries.push(current);
    } else if (pathValue && current) {
      current.path = pathValue[1].replace(/^['"]|['"]$/g, "");
    } else {
      throw new Error(`invalid multi-cache definition: ${raw}`);
    }
  }
  if (!entries.length || entries.some((entry) => !entry.path)) {
    throw new Error("multi-cache must contain named entries with a path");
  }
  return entries;
}

function parseKeys(value) {
  const keys = new Map();
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error("key entries must use cache-name=key");
    keys.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return keys;
}

function run(entry, script) {
  const env = { ...process.env,
    "INPUT_CACHE-NAME": entry.name,
    INPUT_CACHE_NAME: entry.name,
    INPUT_PATH: entry.path,
    INPUT_KEY: entry.key,
  };
  const result = cp.spawnSync(process.execPath, [path.join(__dirname, script)], {
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`${script} failed for ${entry.name}`);
}

try {
  const keys = parseKeys(input("key"));
  const entries = parseDefinitions(input("multi-cache")).map((entry) => ({
    ...entry,
    key: keys.get(entry.name),
  }));
  if (entries.some((entry) => !entry.key)) {
    throw new Error("missing key for one or more multi-cache entries");
  }
  const script = process.env.MULTI_CACHE_PHASE === "save" ? "save.js" : "restore.js";
  for (const entry of entries) run(entry, script);
} catch (error) {
  console.error(error.message);
  if (input("strict").toLowerCase() === "true") process.exitCode = 1;
}
