const fs = require("fs");
const path = require("path");

const dist = path.resolve(__dirname, "..", "dist");

if (fs.existsSync(dist)) {
  for (const entry of fs.readdirSync(dist)) {
    fs.rmSync(path.join(dist, entry), { recursive: true, force: true });
  }
}
