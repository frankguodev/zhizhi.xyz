#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import decodeJpeg, { init as initJpegDecode } from "@jsquash/jpeg/decode.js";
import encodeJpeg, { init as initJpegEncode } from "@jsquash/jpeg/encode.js";
import decodePng, { init as initPngDecode } from "@jsquash/png/decode.js";

const workspaceRoot = process.cwd();
const defaultMaxBytes = 100 * 1024;
let pngDecoderReady = false;
let jpegDecoderReady = false;
let jpegEncoderReady = false;

function usage() {
  console.log(`Usage:
  npm run ai-term:diagram:compress:dry-run -- <TERM>

Tests whether the local diagram can be compressed below 100KB without uploading or writing output.`);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findInputImage(term) {
  for (const ext of [".png", ".jpg", ".jpeg"]) {
    const candidate = path.join(workspaceRoot, "summery", "aiterms", "diagram", `${term}_diagram${ext}`);
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Diagram image not found for ${term}. Expected PNG/JPG/JPEG.`);
}

async function decodeImage(filePath) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  if (ext === ".png") {
    if (!pngDecoderReady) {
      const wasm = await fs.readFile(path.join(workspaceRoot, "node_modules", "@jsquash", "png", "codec", "pkg", "squoosh_png_bg.wasm"));
      await initPngDecode(wasm);
      pngDecoderReady = true;
    }
    return decodePng(arrayBuffer);
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    if (!jpegDecoderReady) {
      const wasm = await fs.readFile(path.join(workspaceRoot, "node_modules", "@jsquash", "jpeg", "codec", "dec", "mozjpeg_dec.wasm"));
      await initJpegDecode(await WebAssembly.compile(wasm));
      jpegDecoderReady = true;
    }
    return decodeJpeg(arrayBuffer);
  }

  throw new Error(`Unsupported image format: ${ext}`);
}

function resizeImageData(source, targetWidth) {
  if (targetWidth >= source.width) {
    return source;
  }

  const targetHeight = Math.round((source.height * targetWidth) / source.width);
  const targetData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const xRatio = source.width / targetWidth;
  const yRatio = source.height / targetHeight;

  for (let y = 0; y < targetHeight; y += 1) {
    const sy = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.max(Math.floor(sy), 0);
    const y1 = Math.min(y0 + 1, source.height - 1);
    const wy = sy - y0;

    for (let x = 0; x < targetWidth; x += 1) {
      const sx = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.max(Math.floor(sx), 0);
      const x1 = Math.min(x0 + 1, source.width - 1);
      const wx = sx - x0;
      const targetIndex = (y * targetWidth + x) * 4;
      const indices = [
        (y0 * source.width + x0) * 4,
        (y0 * source.width + x1) * 4,
        (y1 * source.width + x0) * 4,
        (y1 * source.width + x1) * 4,
      ];

      for (let c = 0; c < 4; c += 1) {
        const top = source.data[indices[0] + c] * (1 - wx) + source.data[indices[1] + c] * wx;
        const bottom = source.data[indices[2] + c] * (1 - wx) + source.data[indices[3] + c] * wx;
        targetData[targetIndex + c] = Math.round(top * (1 - wy) + bottom * wy);
      }
    }
  }

  return { data: targetData, width: targetWidth, height: targetHeight };
}

function flattenAlpha(imageData) {
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha < 1) {
      data[i] = Math.round(data[i] * alpha + 255 * (1 - alpha));
      data[i + 1] = Math.round(data[i + 1] * alpha + 255 * (1 - alpha));
      data[i + 2] = Math.round(data[i + 2] * alpha + 255 * (1 - alpha));
      data[i + 3] = 255;
    }
  }
  return { data, width: imageData.width, height: imageData.height };
}

async function encodeCandidate(imageData, width, quality) {
  if (!jpegEncoderReady) {
    const wasm = await fs.readFile(path.join(workspaceRoot, "node_modules", "@jsquash", "jpeg", "codec", "enc", "mozjpeg_enc.wasm"));
    await initJpegEncode(await WebAssembly.compile(wasm));
    jpegEncoderReady = true;
  }

  const resized = flattenAlpha(resizeImageData(imageData, width));
  const encoded = await encodeJpeg(resized, {
    quality,
    baseline: false,
    arithmetic: false,
    progressive: true,
    optimize_coding: true,
    smoothing: 0,
    color_space: 3,
    quant_table: 3,
  });

  return { bytes: Buffer.from(encoded).length, width: resized.width, height: resized.height, quality };
}

async function main() {
  const args = process.argv.slice(2);
  const term = String(args.find((arg) => !arg.startsWith("-")) ?? "").trim();
  if (!term || term === "-h" || term === "--help") {
    usage();
    process.exit(term ? 0 : 1);
  }

  const inputPath = await findInputImage(term);
  const source = await decodeImage(inputPath);
  const widths = [1280, 1120, 960, 840, 720].filter((width) => width <= source.width);
  if (source.width < 1280) {
    widths.unshift(source.width);
  }
  const qualities = [82, 76, 70, 64, 58, 52, 46, 40];
  let best = null;

  for (const width of widths) {
    for (const quality of qualities) {
      const candidate = await encodeCandidate(source, width, quality);
      if (!best || candidate.bytes < best.bytes) {
        best = candidate;
      }
      if (candidate.bytes <= defaultMaxBytes) {
        console.log(`AI term diagram compression dry run: ${term}`);
        console.log(`Input: ${path.relative(workspaceRoot, inputPath)} (${source.width}x${source.height})`);
        console.log(`PASS: ${Math.round(candidate.bytes / 1024)}KB, ${candidate.width}x${candidate.height}, q=${candidate.quality}`);
        return;
      }
    }
  }

  console.log(`AI term diagram compression dry run: ${term}`);
  console.log(`Input: ${path.relative(workspaceRoot, inputPath)} (${source.width}x${source.height})`);
  console.log(`FAIL: best candidate is ${best ? Math.round(best.bytes / 1024) : "unknown"}KB`);
  process.exit(1);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
