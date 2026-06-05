#!/usr/bin/env node
import path from "node:path";
import { defaultMaxWebpBytes, optimizeDiagramToWebp } from "./lib/ai-term-diagram-image.mjs";

const workspaceRoot = process.cwd();

function usage() {
  console.log(`Usage:
  npm run ai-term:diagram:optimize -- <TERM>

Optimizes a local AI term diagram to WebP, keeps 16:9, adds the zhizhi.xyz watermark, and enforces <=100KB.`);
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

  const optimized = await optimizeDiagramToWebp(term, { maxBytes: getMaxBytes() });
  console.log(`AI term diagram optimized: ${term}`);
  console.log(`Input: ${path.relative(workspaceRoot, optimized.inputPath)} (${optimized.sourceWidth}x${optimized.sourceHeight})`);
  console.log(
    `Output: ${path.relative(workspaceRoot, optimized.outputPath)} (${Math.round(optimized.buffer.length / 1024)}KB, ${optimized.width}x${optimized.height}, webp q=${optimized.quality})`,
  );
  console.log(`Limit: <=${Math.round(defaultMaxWebpBytes / 1024)}KB, 16:9, watermark: zhizhi.xyz`);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
