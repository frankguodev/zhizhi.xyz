import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ignoredDirs = new Set([".git", ".next", ".open-next", ".wrangler", "node_modules"]);
const textExtensions = new Set([
  ".css",
  ".cjs",
  ".cts",
  ".d.ts",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);
const textFiles = new Set([".editorconfig", ".env.example", ".gitignore"]);

function isTextFile(path) {
  const name = path.split(/[\\/]/).pop();
  if (textFiles.has(name)) {
    return true;
  }

  return [...textExtensions].some((extension) => path.endsWith(extension));
}

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) {
      continue;
    }

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else if (stat.isFile() && isTextFile(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

const fixed = [];
for (const file of walk(process.cwd())) {
  const bytes = readFileSync(file);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    writeFileSync(file, bytes.subarray(3));
    fixed.push(relative(process.cwd(), file));
  }
}

if (fixed.length === 0) {
  console.log("No UTF-8 BOM files found.");
} else {
  console.log(`Removed UTF-8 BOM from ${fixed.length} file(s):`);
  for (const file of fixed) {
    console.log(`- ${file}`);
  }
}