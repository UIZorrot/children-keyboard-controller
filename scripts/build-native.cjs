const { spawnSync } = require("node:child_process");
const path = require("node:path");

const electronPackage = require("electron/package.json");
const target = electronPackage.version;
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
    "--target",
    target,
    "--arch",
    process.arch,
    "--dist-url",
    "https://electronjs.org/headers"
  ],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
