import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePublic = join(repoRoot, "public");
const targetPublic = join(repoRoot, "apps", "tools", "public");

const assets = [
  "apple-touch-icon.png",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-48x48.png",
  "favicon.ico",
  "favicon.svg",
  "logo-512.png",
  "logo.svg",
  "tools-json-worker.js",
  "tools-utility-worker.js",
  "mediapipe",
];

function assertInsideTarget(path) {
  const rel = relative(targetPublic, path);
  if (rel.startsWith("..") || rel === "" || rel.includes(":")) {
    throw new Error(`Refusing to write outside tools public: ${path}`);
  }
}

await mkdir(targetPublic, { recursive: true });

for (const asset of assets) {
  const from = join(sourcePublic, asset);
  const to = join(targetPublic, asset);
  assertInsideTarget(to);
  await rm(to, { force: true, recursive: true });
  await cp(from, to, { recursive: true });
}

console.log(`Synced ${assets.length} tools public assets.`);
