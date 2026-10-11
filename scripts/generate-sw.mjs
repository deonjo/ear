// Post-build step: writes out/sw.js with a precache list of every exported file,
// so the installed app (including the piano samples) works fully offline.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(OUT)
  .map((f) => relative(OUT, f).split(sep).join("/"))
  .filter((f) => f !== "sw.js" && !f.endsWith(".map") && !f.startsWith("."))
  .sort();

const hash = createHash("sha256");
for (const f of files) hash.update(f).update(readFileSync(join(OUT, f)));
const version = hash.digest("hex").slice(0, 12);
const urls = files.map((f) => `${basePath}/${f}`);

const template = readFileSync("scripts/sw-template.js", "utf8");
const sw = template
  .replace("__VERSION__", JSON.stringify(version))
  .replace("__BASE__", JSON.stringify(basePath))
  .replace("__PRECACHE__", JSON.stringify(urls, null, 0));
writeFileSync(join(OUT, "sw.js"), sw);
console.log(`sw.js: ${urls.length} files precached (version ${version})`);
