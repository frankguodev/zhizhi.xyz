#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import decodeJpeg, { init as initJpegDecode } from "@jsquash/jpeg/decode.js";
import encodeJpeg, { init as initJpegEncode } from "@jsquash/jpeg/encode.js";
import decodePng, { init as initPngDecode } from "@jsquash/png/decode.js";

const workspaceRoot = process.cwd();
const maxJpegBytes = 100 * 1024;
const defaultBaseUrl = "https://zhizhi.xyz";
let pngDecoderReady = false;
let jpegDecoderReady = false;
let jpegEncoderReady = false;

function usage() {
  console.log(`Usage:
  npm run ai-term:push:prod -- <TERM>
  npm run ai-term:push:prod -- <TERM> --dry-run

Required env:
  AI_TERM_ADMIN_COOKIE  Production admin Cookie header value.

Optional env:
  AI_TERM_ADMIN_BASE_URL  Defaults to ${defaultBaseUrl}
  AI_TERM_MAX_JPG_KB      Defaults to 100

Example:
  $env:AI_TERM_ADMIN_COOKIE='zz_admin_session=...'
  npm run ai-term:push:prod -- Agent`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function normalizeTermArg(value) {
  return String(value ?? "").trim();
}

function getRequiredCookie() {
  const cookie = process.env.AI_TERM_ADMIN_COOKIE?.trim();
  if (!cookie) {
    fail("Missing AI_TERM_ADMIN_COOKIE. Copy the production admin Cookie header after logging in.");
  }
  return cookie;
}

function getBaseUrl() {
  const value = process.env.AI_TERM_ADMIN_BASE_URL?.trim() || defaultBaseUrl;
  return value.replace(/\/+$/, "");
}

function getMaxBytes() {
  const kb = Number(process.env.AI_TERM_MAX_JPG_KB || "100");
  if (!Number.isFinite(kb) || kb <= 0) {
    fail("AI_TERM_MAX_JPG_KB must be a positive number.");
  }
  return Math.floor(kb * 1024);
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
  const candidates = [
    path.join(workspaceRoot, "summery", "aiterms", "diagram", `${term}_diagram.png`),
    path.join(workspaceRoot, "summery", "aiterms", "diagram", `${term}_diagram.jpg`),
    path.join(workspaceRoot, "summery", "aiterms", "diagram", `${term}_diagram.jpeg`),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  fail(`Diagram image not found. Expected one of:\n${candidates.map((item) => `  - ${item}`).join("\n")}`);
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

  fail(`Unsupported diagram image format: ${ext}. Use PNG or JPG.`);
}

function resizeImageData(source, targetWidth) {
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  if (targetWidth >= sourceWidth) {
    return source;
  }

  const targetHeight = Math.round((sourceHeight * targetWidth) / sourceWidth);
  const sourceData = source.data;
  const targetData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const xRatio = sourceWidth / targetWidth;
  const yRatio = sourceHeight / targetHeight;

  for (let y = 0; y < targetHeight; y += 1) {
    const sy = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.max(Math.floor(sy), 0);
    const y1 = Math.min(y0 + 1, sourceHeight - 1);
    const wy = sy - y0;

    for (let x = 0; x < targetWidth; x += 1) {
      const sx = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.max(Math.floor(sx), 0);
      const x1 = Math.min(x0 + 1, sourceWidth - 1);
      const wx = sx - x0;

      const targetIndex = (y * targetWidth + x) * 4;
      const i00 = (y0 * sourceWidth + x0) * 4;
      const i10 = (y0 * sourceWidth + x1) * 4;
      const i01 = (y1 * sourceWidth + x0) * 4;
      const i11 = (y1 * sourceWidth + x1) * 4;

      for (let c = 0; c < 4; c += 1) {
        const top = sourceData[i00 + c] * (1 - wx) + sourceData[i10 + c] * wx;
        const bottom = sourceData[i01 + c] * (1 - wx) + sourceData[i11 + c] * wx;
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

async function encodeJpegCandidate(imageData, width, quality) {
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

  return {
    buffer: Buffer.from(encoded),
    width: resized.width,
    height: resized.height,
    quality,
  };
}

async function compressDiagramToJpeg(inputPath, outputPath, maxBytes) {
  const imageData = await decodeImage(inputPath);
  const widths = [1280, 1120, 960, 840, 720].filter((width) => width <= imageData.width);
  if (!widths.includes(imageData.width) && imageData.width < 1280) {
    widths.unshift(imageData.width);
  }
  const qualities = [82, 76, 70, 64, 58, 52, 46, 40];
  let best = null;

  for (const width of widths) {
    for (const quality of qualities) {
      const candidate = await encodeJpegCandidate(imageData, width, quality);
      if (!best || candidate.buffer.length < best.buffer.length) {
        best = candidate;
      }

      if (candidate.buffer.length <= maxBytes) {
        await fs.writeFile(outputPath, candidate.buffer);
        return { ...candidate, outputPath };
      }
    }
  }

  if (best) {
    await fs.writeFile(outputPath, best.buffer);
  }

  fail(`Could not compress diagram below ${Math.round(maxBytes / 1024)}KB. Best result: ${best ? Math.round(best.buffer.length / 1024) : "unknown"}KB.`);
}

function forceDraftFrontmatter(parsed) {
  const data = parsed.data;
  data.status = "draft";
  data.visibility = data.visibility || "public";
  data.source = {
    ...(data.source && typeof data.source === "object" ? data.source : {}),
    human_reviewed: false,
  };
  return data;
}

function getDiagramAlt(data) {
  const diagram = data.diagram && typeof data.diagram === "object" ? data.diagram : {};
  return typeof diagram.image_alt === "string" && diagram.image_alt.trim() ? diagram.image_alt.trim() : `${data.term || data.slug} 一图看懂`;
}

async function uploadDiagram({ baseUrl, cookie, filePath, locale, slug, alt }) {
  const bytes = await fs.readFile(filePath);
  const formData = new FormData();
  const blob = new Blob([bytes], { type: "image/jpeg" });
  formData.set("file", blob, path.basename(filePath));
  formData.set("scope", "ai-term");
  formData.set("role", "diagram");
  formData.set("locale", locale);
  formData.set("slug", slug);
  formData.set("alt", alt);

  const response = await fetch(`${baseUrl}/api/admin/media`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.media?.url) {
    fail(`R2 upload failed (${response.status}). ${payload?.error || payload?.hint || "No JSON error returned."}`);
  }

  return payload.media;
}

async function importMarkdown({ baseUrl, cookie, markdown }) {
  const response = await fetch(`${baseUrl}/api/admin/ai-terms`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ markdown }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.aiTerm) {
    fail(`D1 import failed (${response.status}). ${payload?.error || payload?.hint || "No JSON error returned."}`);
  }

  return payload;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const term = normalizeTermArg(args.find((arg) => !arg.startsWith("-")));
  if (!term || term === "-h" || term === "--help") {
    usage();
    process.exit(term ? 0 : 1);
  }

  const cookie = dryRun ? "" : getRequiredCookie();
  const baseUrl = getBaseUrl();
  const maxBytes = getMaxBytes();
  const proPath = path.join(workspaceRoot, "summery", "aiterms", "pro", `${term}.md`);
  if (!(await pathExists(proPath))) {
    fail(`Pro markdown not found: ${proPath}`);
  }

  const markdown = await fs.readFile(proPath, "utf8");
  const parsed = matter(markdown);
  const data = forceDraftFrontmatter(parsed);
  const locale = data.locale === "en" ? "en" : data.locale === "zh" ? "zh" : null;
  const slug = typeof data.slug === "string" ? data.slug.trim() : "";
  if (!locale || !slug) {
    fail("Frontmatter must contain locale zh/en and slug before uploading a diagram.");
  }

  const inputImage = await findInputImage(term);
  const outputJpeg = path.join(workspaceRoot, "summery", "aiterms", "diagram", `${term}_diagram.jpg`);
  const compressed = await compressDiagramToJpeg(inputImage, outputJpeg, maxBytes);
  console.log(`Compressed diagram: ${path.relative(workspaceRoot, outputJpeg)} (${Math.round(compressed.buffer.length / 1024)}KB, ${compressed.width}x${compressed.height}, q=${compressed.quality})`);

  if (dryRun) {
    console.log("Dry run complete. R2 upload, pro markdown update, and D1 import were skipped.");
    return;
  }

  const alt = getDiagramAlt(data);
  const media = await uploadDiagram({ baseUrl, cookie, filePath: outputJpeg, locale, slug, alt });
  console.log(`Uploaded diagram: ${media.url}`);

  data.diagram = {
    ...(data.diagram && typeof data.diagram === "object" ? data.diagram : {}),
    image: media.url,
    image_alt: alt,
  };

  const updatedMarkdown = matter.stringify(parsed.content.trim(), data).trim() + "\n";
  await fs.writeFile(proPath, updatedMarkdown, "utf8");
  console.log(`Updated pro markdown: ${path.relative(workspaceRoot, proPath)}`);

  const imported = await importMarkdown({ baseUrl, cookie, markdown: updatedMarkdown });
  console.log(`Imported draft: ${imported.aiTerm.locale}/${imported.aiTerm.slug} (${imported.aiTerm.id})`);
  if (imported.importWarnings?.length) {
    console.log("Import warnings:");
    for (const warning of imported.importWarnings) {
      console.log(`- ${warning}`);
    }
  }
  console.log(`${baseUrl}/admin/ai-terms/drafts`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
