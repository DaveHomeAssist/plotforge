// Syntax check every .js / .jsx file in src/ using @babel/parser.
// Run with: node scripts/syntax-check.mjs
//
// This script becomes useful AFTER `npm install` (which brings in @babel/parser
// transitively via @vitejs/plugin-react). It is not a substitute for `npm test` —
// it only catches structural errors, not type or runtime issues.

import { readFile, readdir } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let parser;
try {
  parser = require("@babel/parser");
} catch {
  console.error("@babel/parser not found. Run `npm install` first.");
  process.exit(2);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const root = join(here, "..", "src");
let failed = 0, checked = 0;
for await (const f of walk(root)) {
  if (![".js", ".jsx"].includes(extname(f))) continue;
  if (f.includes("node_modules")) continue;
  try {
    parser.parse(await readFile(f, "utf8"), {
      sourceType: "module",
      plugins: ["jsx"],
      errorRecovery: false,
    });
    console.log(`  ok  ${f.replace(root + "/", "")}`);
    checked += 1;
  } catch (e) {
    console.log(`  FAIL ${f.replace(root + "/", "")}\n      ${e.message}`);
    failed += 1;
    checked += 1;
  }
}
console.log(`\n${checked - failed}/${checked} files parsed cleanly\n`);
process.exit(failed ? 1 : 0);
