#!/usr/bin/env node
import path from "node:path";
import { buildOptimizedDiagram, describeOptimizedDiagramSizes, findSourceDiagramImage } from "./lib/ai-term-diagram-image.mjs";

const workspaceRoot = process.cwd();

function usage() {
  console.log(`Usage:
  npm run ai-term:diagram:compress:dry-run -- <TERM>

Tests whether the local diagram can become a watermarked WebP below 100KB without writing output.
Preferred output is 1600x900; fallback output is 1280x720.`);
}

function getMaxBytes() {
  const kb = Number(process.env.AI_TERM_MAX_WEBP_KB || "100");
  if (!Number.isFinite(kb) || kb <= 0) {
    throw new Error("AI_TERM_MAX_WEBP_KB must be a positive number.");
  }
  return Math.floor(kb * 1024);
}

async function main() {
  const args = process.argv.slice(2);
  const term = String(args.find((arg) => !arg.startsWith("-")) ?? "").trim();
  if (!term || args.includes("-h") || args.includes("--help")) {
    usage();
    process.exit(args.includes("-h") || args.includes("--help") ? 0 : 1);
  }

  const inputPath = await findSourceDiagramImage(term);
  if (!inputPath) {
    throw new Error(`Diagram image not found for ${term}. Expected PNG/JPG/JPEG/WebP.`);
  }

  const maxBytes = getMaxBytes();
  const candidate = await buildOptimizedDiagram(inputPath, maxBytes);
  console.log(`AI term diagram optimization dry run: ${term}`);
  console.log(`Input: ${path.relative(workspaceRoot, inputPath)} (${candidate.sourceWidth}x${candidate.sourceHeight})`);
  if (candidate.metTarget) {
    console.log(`PASS: ${Math.round(candidate.buffer.length / 1024)}KB, ${candidate.width}x${candidate.height}, webp q=${candidate.quality}, watermark zhizhi.xyz`);
    console.log(`Allowed sizes: ${describeOptimizedDiagramSizes()}`);
    return;
  }

  console.log(`FAIL: best candidate is ${Math.round(candidate.buffer.length / 1024)}KB; target is <=${Math.round(maxBytes / 1024)}KB.`);
  process.exit(1);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
