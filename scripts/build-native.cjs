const { spawnSync } = require("node:child_process");
const path = require("node:path");

const electronPackage = require("electron/package.json");
const target = electronPackage.version;
const electronHeadersUrl = process.env.ELECTRON_HEADERS_URL || "https://artifacts.electronjs.org/headers/dist";
const nodeGypBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "node-gyp.cmd" : "node-gyp"
);

const result = spawnSync(
  nodeGypBin,
  [
    "rebuild",
    "--directory",
    "native/keyboard-blocker",
    `--target=${target}`,
    `--arch=${process.arch}`,
    `--dist-url=${electronHeadersUrl}`
  ],
  { shell: process.platform === "win32", stdio: "inherit" }
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
