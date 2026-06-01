#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const workspaceRoot = process.cwd();

function usage() {
  console.log(`Usage:
  npm run ai-term:import:dry-run -- <TERM>
  npm run ai-term:import:dry-run -- --file summery/aiterms/pro/RAG.md

Parses a local AI term pro markdown and prints the database-facing import summary.
It does not write D1, upload R2, or modify files.`);
}

function normalizeArg(value) {
  return String(value ?? "").trim();
}

function getInputPath(args) {
  const fileIndex = args.indexOf("--file");
  if (fileIndex >= 0) {
    const filePath = normalizeArg(args[fileIndex + 1]);
    if (!filePath) {
      throw new Error("--file requires a path.");
    }
    return path.resolve(workspaceRoot, filePath);
  }

  const term = normalizeArg(args.find((arg) => !arg.startsWith("-")));
  if (!term || term === "-h" || term === "--help") {
    usage();
    process.exit(term ? 0 : 1);
  }

  return path.join(workspaceRoot, "summery", "aiterms", "pro", `${term}.md`);
}

function isRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function summarize(data, content) {
  const categories = Array.isArray(data.categories) ? data.categories.filter(isRecord) : [];
  const relations = Array.isArray(data.relations) ? data.relations.filter(isRecord) : [];
  const seo = isRecord(data.seo) ? data.seo : {};
  const source = isRecord(data.source) ? data.source : {};
  const openGraph = isRecord(data.open_graph) ? data.open_graph : {};
  const twitter = isRecord(data.twitter) ? data.twitter : {};
  const diagram = isRecord(data.diagram) ? data.diagram : {};

  return {
    locale: text(data.locale) || "zh",
    slug: text(data.slug),
    term: text(data.term),
    term_zh: text(data.term_zh),
    full_name: text(data.full_name),
    status: text(data.status),
    visibility: text(data.visibility),
    type: text(data.type),
    difficulty: text(data.difficulty),
    heat_score: data.heat_score,
    quality_score: data.quality_score,
    trending: data.trending,
    content_chars: content.trim().length,
    categories: categories.map((category) => ({
      slug: text(category.slug),
      name: text(category.name),
      sort_order: category.sort_order,
    })),
    relation_candidates: relations.map((relation) => ({
      slug: text(relation.slug),
      term: text(relation.term),
      relation_type: text(relation.relation_type),
      sort_order: relation.sort_order,
    })),
    seo: {
      title: text(seo.title),
      description_chars: text(seo.description).length,
      keywords: stringList(seo.keywords),
      canonical_url: text(seo.canonical_url),
      robots: text(seo.robots),
    },
    media: {
      open_graph_image: text(openGraph.image),
      twitter_image: text(twitter.image),
      diagram_image: text(diagram.image),
      diagram_image_alt: text(diagram.image_alt),
    },
    source: {
      ai_assisted: source.ai_assisted,
      human_reviewed: source.human_reviewed,
      last_verified_at: text(source.last_verified_at),
      published_at: text(source.published_at),
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = getInputPath(args);
  const markdown = await fs.readFile(inputPath, "utf8");
  const parsed = matter(markdown);
  const summary = summarize(parsed.data, parsed.content);

  console.log(`AI term import dry run: ${path.relative(workspaceRoot, inputPath)}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
