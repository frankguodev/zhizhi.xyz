import { readdirSync, readFileSync, statSync } from "node:fs";
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

const offenders = walk(process.cwd()).filter((file) => {
  const bytes = readFileSync(file);
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
});

if (offenders.length > 0) {
  console.error("UTF-8 BOM detected in these files:");
  for (const file of offenders) {
    console.error(`- ${relative(process.cwd(), file)}`);
  }
  console.error("Run npm run encoding:fix to remove BOM from text files.");
  process.exit(1);
}

console.log("Encoding check passed: no UTF-8 BOM found in tracked text-like files.");