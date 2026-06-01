#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const indexPath = path.join(workspaceRoot, "summery", "aiterms", "sources", "index.json");

function usage() {
  console.log(`Usage:
  npm run ai-term:sources:match -- <TERM>

Reads only summery/aiterms/sources/index.json and prints matching source cards.`);
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function display(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function main() {
  const args = process.argv.slice(2);
  const term = String(args.find((arg) => !arg.startsWith("-")) ?? "").trim();
  if (!term || term === "-h" || term === "--help") {
    usage();
    process.exit(term ? 0 : 1);
  }

  const payload = JSON.parse(await fs.readFile(indexPath, "utf8"));
  const items = Array.isArray(payload.items) ? payload.items : [];
  const wantedSlug = normalize(term);
  const wantedText = display(term);
  const matches = items.filter((item) => {
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    return (
      normalize(item.slug) === wantedSlug ||
      normalize(item.term) === wantedSlug ||
      display(item.term) === wantedText ||
      aliases.some((alias) => normalize(alias) === wantedSlug || display(alias) === wantedText)
    );
  });

  console.log(`AI term source match: ${term}`);
  console.log(`Matches: ${matches.length}`);

  for (const match of matches) {
    console.log(`- ${match.term} (${match.slug})`);
    console.log(`  source_file: ${match.source_file}`);
    console.log(`  aliases: ${(match.aliases ?? []).join(", ") || "(none)"}`);
    console.log(`  last_verified_at: ${match.last_verified_at || "(empty)"}`);
    console.log(`  source_count: ${match.source_count ?? 0}`);
  }

  if (matches.length === 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
