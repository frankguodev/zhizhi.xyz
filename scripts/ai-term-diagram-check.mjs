#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const diagramDir = path.join(workspaceRoot, "summery", "aiterms", "diagram");

function usage() {
  console.log(`Usage:
  npm run ai-term:diagram:check -- <TERM>

Checks local diagram brief/prompt/image files. It does not upload R2 or modify pro markdown.`);
}

function normalizeArg(value) {
  return String(value ?? "").trim();
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findImage(term) {
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const candidate = path.join(diagramDir, `${term}_diagram${ext}`);
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function readUInt32BE(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function readUInt16BE(buffer, offset) {
  return buffer.readUInt16BE(offset);
}

function pngDimensions(buffer) {
  if (buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: readUInt32BE(buffer, 16), height: readUInt32BE(buffer, 20) };
  }
  return null;
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = readUInt16BE(buffer, offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: readUInt16BE(buffer, offset + 5), width: readUInt16BE(buffer, offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const type = buffer.toString("ascii", 12, 16);
  if (type === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (type === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (type === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

async function imageDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  return pngDimensions(buffer) || jpegDimensions(buffer) || webpDimensions(buffer);
}

function ratioWarning(dimensions) {
  if (!dimensions) {
    return "无法读取图片尺寸";
  }
  const ratio = dimensions.width / dimensions.height;
  return Math.abs(ratio - 16 / 9) > 0.04 ? `图片比例不是 16:9：${dimensions.width}x${dimensions.height}` : "";
}

async function main() {
  const args = process.argv.slice(2);
  const term = normalizeArg(args.find((arg) => !arg.startsWith("-")));
  if (!term || term === "-h" || term === "--help") {
    usage();
    process.exit(term ? 0 : 1);
  }

  const briefPath = path.join(diagramDir, `${term}_一图看懂brief.md`);
  const promptPath = path.join(diagramDir, `${term}_一图看懂提示词.md`);
  const imagePath = await findImage(term);
  const optimizedPath = path.join(diagramDir, `${term}_diagram.webp`);
  const errors = [];
  const warnings = [];

  if (!(await pathExists(briefPath))) {
    errors.push(`缺少 brief：${path.relative(workspaceRoot, briefPath)}`);
  }
  if (!(await pathExists(promptPath))) {
    errors.push(`缺少图片提示词：${path.relative(workspaceRoot, promptPath)}`);
  }

  if (imagePath) {
    const stats = await fs.stat(imagePath);
    const dimensions = await imageDimensions(imagePath);
    const warning = ratioWarning(dimensions);
    if (warning) {
      warnings.push(warning);
    }
    if (stats.size > 3 * 1024 * 1024) {
      warnings.push(`本地图较大：${Math.round(stats.size / 1024)}KB`);
    }
    console.log(`Image: ${path.relative(workspaceRoot, imagePath)} (${Math.round(stats.size / 1024)}KB${dimensions ? `, ${dimensions.width}x${dimensions.height}` : ""})`);
    if (!(await pathExists(optimizedPath))) {
      warnings.push("未找到优化后的 WebP；如需同步生产库，请先运行 ai-term:diagram:optimize。");
    }
  } else {
    warnings.push("未找到本地图；如果只是低成本 brief/prompt 模式，这是允许的。");
  }

  if (await pathExists(optimizedPath)) {
    const stats = await fs.stat(optimizedPath);
    const dimensions = await imageDimensions(optimizedPath);
    const warning = ratioWarning(dimensions);
    if (warning) {
      warnings.push(`优化图 ${warning}`);
    }
    if (stats.size > 100 * 1024) {
      warnings.push(`优化图超过 100KB：${Math.round(stats.size / 1024)}KB`);
    }
    console.log(`Optimized: ${path.relative(workspaceRoot, optimizedPath)} (${Math.round(stats.size / 1024)}KB${dimensions ? `, ${dimensions.width}x${dimensions.height}` : ""})`);
  }

  console.log(`AI term diagram check: ${term}`);
  console.log(`Errors: ${errors.length}, warnings: ${warnings.length}`);
  for (const error of errors) {
    console.log(`- ERROR: ${error}`);
  }
  for (const warning of warnings) {
    console.log(`- WARN: ${warning}`);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
