const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const c = require("./common");
const { INPUTS, CACHE_PHASES } = require("./constants");

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
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "multi-cache-output-"));
  const outputFile = path.join(outputDirectory, "output");
  const env = {
    ...process.env,
    "INPUT_CACHE-NAME": entry.name,
    INPUT_PATH: entry.path,
    INPUT_KEY: entry.key,
    GITHUB_OUTPUT: outputFile,
  };
  const result = cp.spawnSync(
    process.execPath,
    [path.join(__dirname, script)],
    {
      env,
      stdio: "inherit",
    },
  );
  if (result.status !== 0) throw new Error(`${script} failed for ${entry.name}`);
  const outputs = {};
  if (fs.existsSync(outputFile)) {
    for (const line of fs.readFileSync(outputFile, "utf8").split(/\r?\n/)) {
      const separator = line.indexOf("=");
      if (separator > 0) outputs[line.slice(0, separator)] = line.slice(separator + 1);
    }
  }
  return outputs;
}

function setListOutput(name, values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${name}<<MULTI_CACHE_OUTPUT\n${values.join("\n")}\nMULTI_CACHE_OUTPUT\n`,
  );
}

try {
  const keys = parseKeys(c.input(INPUTS.KEY));
  const entries = parseDefinitions(c.input(INPUTS.MULTI_CACHE)).map(
    (entry) => ({
      ...entry,
      key: keys.get(entry.name),
    }),
  );
  if (entries.some((entry) => !entry.key)) {
    throw new Error("missing key for one or more multi-cache entries");
  }
  const script =
    process.env.MULTI_CACHE_PHASE === CACHE_PHASES.SAVE
      ? "save.js"
      : "restore.js";
  const results = entries.map((entry) => run(entry, script));
  const values = {
    cacheHit: results.map((result) => result["cache-hit"] || "false"),
    matchedKey: results.map((result) => result["matched-key"] || ""),
    assetName: results.map((result) => result["asset-name"] || ""),
    contentHash: results.map((result) => result["content-hash"] || ""),
    cacheSize: results.map((result) => result["cache-size"] || ""),
  };
  if (entries.length === 1) {
    const [single] = results;
    for (const [name, value] of Object.entries(single)) {
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
      }
    }
  } else {
    setListOutput("cache-hits", values.cacheHit);
    setListOutput("matched-keys", values.matchedKey);
    setListOutput("asset-names", values.assetName);
    setListOutput("content-hashes", values.contentHash);
    setListOutput("cache-sizes", values.cacheSize);
    setListOutput("assets-name", values.assetName);
    setListOutput("contents-hash", values.contentHash);
  }
} catch (error) {
  console.error(error.message);
  if (c.input(INPUTS.STRICT).toLowerCase() === "true") process.exitCode = 1;
}
