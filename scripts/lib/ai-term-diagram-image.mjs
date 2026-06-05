import fs from "node:fs/promises";
import path from "node:path";
import decodeJpeg, { init as initJpegDecode } from "@jsquash/jpeg/decode.js";
import decodePng, { init as initPngDecode } from "@jsquash/png/decode.js";
import decodeWebp, { init as initWebpDecode } from "@jsquash/webp/decode.js";
import encodeWebp, { init as initWebpEncode } from "@jsquash/webp/encode.js";

export const defaultMaxWebpBytes = 100 * 1024;
export const diagramAspectRatio = 16 / 9;
export const diagramDir = path.join(process.cwd(), "summery", "aiterms", "diagram");

let pngDecoderReady = false;
let jpegDecoderReady = false;
let webpDecoderReady = false;
let webpEncoderReady = false;

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function findSourceDiagramImage(term) {
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const candidate = path.join(diagramDir, `${term}_diagram${ext}`);
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function optimizedDiagramPath(term) {
  return path.join(diagramDir, `${term}_diagram.webp`);
}

export async function decodeDiagramImage(filePath) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  if (ext === ".png") {
    if (!pngDecoderReady) {
      const wasm = await fs.readFile(path.join(process.cwd(), "node_modules", "@jsquash", "png", "codec", "pkg", "squoosh_png_bg.wasm"));
      await initPngDecode(wasm);
      pngDecoderReady = true;
    }
    return decodePng(arrayBuffer);
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    if (!jpegDecoderReady) {
      const wasm = await fs.readFile(path.join(process.cwd(), "node_modules", "@jsquash", "jpeg", "codec", "dec", "mozjpeg_dec.wasm"));
      await initJpegDecode(await WebAssembly.compile(wasm));
      jpegDecoderReady = true;
    }
    return decodeJpeg(arrayBuffer);
  }

  if (ext === ".webp") {
    if (!webpDecoderReady) {
      const wasm = await fs.readFile(path.join(process.cwd(), "node_modules", "@jsquash", "webp", "codec", "dec", "webp_dec.wasm"));
      await initWebpDecode(await WebAssembly.compile(wasm));
      webpDecoderReady = true;
    }
    return decodeWebp(arrayBuffer);
  }

  throw new Error(`Unsupported diagram image format: ${ext}. Use PNG, JPG, JPEG, or WebP.`);
}

function cropToAspect(source, aspectRatio = diagramAspectRatio) {
  const sourceRatio = source.width / source.height;
  let cropWidth = source.width;
  let cropHeight = source.height;
  let offsetX = 0;
  let offsetY = 0;

  if (Math.abs(sourceRatio - aspectRatio) < 0.001) {
    return source;
  }

  if (sourceRatio > aspectRatio) {
    cropWidth = Math.round(source.height * aspectRatio);
    offsetX = Math.floor((source.width - cropWidth) / 2);
  } else {
    cropHeight = Math.round(source.width / aspectRatio);
    offsetY = Math.floor((source.height - cropHeight) / 2);
  }

  const data = new Uint8ClampedArray(cropWidth * cropHeight * 4);
  for (let y = 0; y < cropHeight; y += 1) {
    const sourceStart = ((offsetY + y) * source.width + offsetX) * 4;
    const targetStart = y * cropWidth * 4;
    data.set(source.data.subarray(sourceStart, sourceStart + cropWidth * 4), targetStart);
  }

  return { data, width: cropWidth, height: cropHeight };
}

function resizeImageData(source, targetWidth) {
  if (targetWidth >= source.width) {
    return source;
  }

  const targetHeight = Math.round(targetWidth / diagramAspectRatio);
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
      const i00 = (y0 * source.width + x0) * 4;
      const i10 = (y0 * source.width + x1) * 4;
      const i01 = (y1 * source.width + x0) * 4;
      const i11 = (y1 * source.width + x1) * 4;

      for (let c = 0; c < 4; c += 1) {
        const top = source.data[i00 + c] * (1 - wx) + source.data[i10 + c] * wx;
        const bottom = source.data[i01 + c] * (1 - wx) + source.data[i11 + c] * wx;
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

const glyphs = {
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  h: ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  x: ["10001", "01010", "00100", "00100", "01010", "10001", "10001"],
  y: ["10001", "10001", "01010", "00100", "00100", "01000", "10000"],
  z: ["11111", "00010", "00100", "01000", "10000", "10000", "11111"],
};

function blendPixel(data, width, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= width) {
    return;
  }
  const index = (y * width + x) * 4;
  if (index < 0 || index + 3 >= data.length) {
    return;
  }
  const sourceAlpha = alpha;
  const targetAlpha = data[index + 3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  if (outAlpha <= 0) {
    return;
  }
  data[index] = Math.round((color[0] * sourceAlpha + data[index] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 1] = Math.round((color[1] * sourceAlpha + data[index + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 2] = Math.round((color[2] * sourceAlpha + data[index + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 3] = Math.round(outAlpha * 255);
}

function textPixelWidth(text, scale) {
  return text.split("").reduce((total, char, index) => {
    const glyph = glyphs[char] ?? glyphs["."];
    return total + glyph[0].length * scale + (index === text.length - 1 ? 0 : scale);
  }, 0);
}

function addWatermark(imageData) {
  const text = "zhizhi.xyz";
  const data = new Uint8ClampedArray(imageData.data);
  const scale = Math.max(2, Math.round(imageData.width / 640));
  const margin = Math.max(18, Math.round(imageData.width * 0.022));
  const color = [47, 79, 53];
  const alpha = 0.42;
  const textWidth = textPixelWidth(text, scale);
  const textHeight = 7 * scale;
  let cursorX = imageData.width - margin - textWidth;
  const startY = imageData.height - margin - textHeight;

  for (const char of text) {
    const glyph = glyphs[char] ?? glyphs["."];
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy].length; gx += 1) {
        if (glyph[gy][gx] !== "1") {
          continue;
        }
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            blendPixel(data, imageData.width, cursorX + gx * scale + sx, startY + gy * scale + sy, color, alpha);
          }
        }
      }
    }
    cursorX += (glyph[0].length + 1) * scale;
  }

  return { data, width: imageData.width, height: imageData.height };
}

async function encodeWebpCandidate(imageData, quality) {
  if (!webpEncoderReady) {
    const wasm = await fs.readFile(path.join(process.cwd(), "node_modules", "@jsquash", "webp", "codec", "enc", "webp_enc.wasm"));
    await initWebpEncode(await WebAssembly.compile(wasm));
    webpEncoderReady = true;
  }

  const encoded = await encodeWebp(imageData, {
    alpha_quality: 100,
    method: 4,
    quality,
  });

  return Buffer.from(encoded);
}

export async function buildOptimizedDiagram(inputPath, maxBytes = defaultMaxWebpBytes) {
  const decoded = await decodeDiagramImage(inputPath);
  const cropped = cropToAspect(decoded);
  const source = flattenAlpha(cropped);
  const widths = [1280, 1120, 960, 840, 720].filter((width) => width <= source.width);
  if (source.width < 1280) {
    widths.unshift(source.width);
  }
  const qualities = [84, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36, 32];
  let smallest = null;

  for (const width of widths) {
    const resized = addWatermark(resizeImageData(source, width));
    for (const quality of qualities) {
      const buffer = await encodeWebpCandidate(resized, quality);
      const candidate = { buffer, height: resized.height, quality, sourceHeight: decoded.height, sourceWidth: decoded.width, width: resized.width };
      if (!smallest || candidate.buffer.length < smallest.buffer.length) {
        smallest = candidate;
      }
      if (buffer.length <= maxBytes) {
        return { ...candidate, metTarget: true };
      }
    }
  }

  if (!smallest) {
    throw new Error("Could not encode optimized diagram.");
  }

  return { ...smallest, metTarget: false };
}

export async function optimizeDiagramToWebp(term, options = {}) {
  const inputPath = await findSourceDiagramImage(term);
  if (!inputPath) {
    throw new Error(`Diagram image not found for ${term}. Expected ${term}_diagram.png/.jpg/.jpeg/.webp.`);
  }

  const maxBytes = options.maxBytes ?? defaultMaxWebpBytes;
  const optimized = await buildOptimizedDiagram(inputPath, maxBytes);
  if (!optimized.metTarget) {
    throw new Error(`Could not optimize diagram below ${Math.round(maxBytes / 1024)}KB. Best result: ${Math.round(optimized.buffer.length / 1024)}KB.`);
  }

  const outputPath = optimizedDiagramPath(term);
  await fs.writeFile(outputPath, optimized.buffer);
  return { ...optimized, inputPath, outputPath };
}

