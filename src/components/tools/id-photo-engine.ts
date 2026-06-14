// 证件照工具的人像抠图引擎：用 MediaPipe ImageSegmenter（自拍分割模型）在浏览器本地把人物从背景里分离，
// 输出一张带 alpha 的人像画布，供 id-photo-tool 叠到纯色底上。模型与 WASM 自托管在 /public/mediapipe，
// 不走 Google CDN（国内不可达），且图片只在本地推理、不上传。

import type { ImageSegmenter, ImageSegmenterResult, MPMask } from "@mediapipe/tasks-vision";

// 自托管路径：FilesetResolver 会在该目录下取 vision_wasm_internal.wasm / .js。
const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/selfie_segmenter.tflite";

// 边缘 alpha 重映射区间：低于 lo 视为背景（透明），高于 hi 视为人物（不透明），中间做平滑过渡。
// 收紧中间带能压掉原背景在发丝边缘留下的色边，又不至于啃掉头发。
const alphaLow = 0.35;
const alphaHigh = 0.65;
// 形态学开运算核半径（蒙版原生分辨率像素，一般 256）。注意：256 上削 1px 放大后约削 4-5px，
// 太粗暴会啃掉耳朵等小部位（分不清"天线"和"耳朵"）。设为 0 关闭，护住耳朵等细节，去突起改交给高分辨率开运算。
const maskOpenRadius = 0;
// 引导滤波（联合上采样）：用原图灰度当引导，把低分辨率蒙版的粗糙边界吸附到真实头发/背景轮廓上，
// 是把 256 蒙版变成干净 alpha 的关键步骤。radius 为窗口半径占图像短边比例；eps 为正则项，
// 越小越贴合图像边缘（更锐、细节多）、越大越平滑（更稳、可能糊）。
const guidedRadiusRatio = 0.01;
// eps 偏小会把背景纹理也吸进边缘（产生絮状毛刺/碎斑），偏大更稳更平滑。取折中。
const guidedEps = 1e-3;
// 引导滤波后、阈值前的收尾羽化半径（占短边比例）：很轻的均值模糊，抹平边界残留的横向小抖动。
const finalFeatherRatio = 0.001;
// 高分辨率开运算核半径（占短边比例）：删掉比核细的发丝毛刺和小碎斑，实心部位（如耳朵）只磨掉边缘几像素、不会丢失。
// 取最轻档（半径≈1px）以护住耳朵等实心细节——只清掉极细碎屑，自然发丝保留。需要更干净可调大，但耳朵会多掉边缘。
const edgeOpenRatio = 0.001;

export type PortraitBBox = { x: number; y: number; w: number; h: number };

// 头部估算：头顶 Y、肩线 Y（人物宽度从「脸宽」跳到「肩宽」处）、头部水平中心 X，均为画布像素。
// 证件照取景按头部比例排版（头占约 ⅔、头顶留白、肩部铺到底边），而不是把整个人塞进画面。
export type PortraitHead = { topY: number; bottomY: number; centerX: number };

export type PortraitResult = {
  // 工作分辨率下、已抠出人物（背景透明）的画布。
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  // 人物在画布上的包围盒（alpha≥0.5 的范围），用于自动取景；无人物时为 null。
  bbox: PortraitBBox | null;
  // 头部位置估算，用于证件照取景；无人物时为 null。
  head: PortraitHead | null;
};

let segmenterPromise: Promise<ImageSegmenter> | null = null;

// 懒加载并缓存分割器（首次会下载 ~11MB WASM + ~250KB 模型，之后浏览器缓存）。失败时清空缓存以便重试。
export function prepareSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { ImageSegmenter, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH },
        runningMode: "IMAGE",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    })().catch((error) => {
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}

// 抠图主流程：把原图按 maxEdge 缩放到工作分辨率（证件照输出本就很小，无需全分辨率，省时省内存），
// 跑分割拿到人物置信度蒙版，叠成 alpha，并算出人物包围盒。
export async function segmentPortrait(bitmap: ImageBitmap, maxEdge: number): Promise<PortraitResult> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas 不可用。");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  const segmenter = await prepareSegmenter();
  const result = segmenter.segment(canvas);
  try {
    const mask = pickPersonMask(result);
    if (!mask) {
      throw new Error("分割结果为空。");
    }
    // 粗 alpha（256 蒙版去突起 + 双线性放大）→ 引导滤波用原图边缘精修 → 阈值写回。
    const coarse = maskToCoarseAlpha(mask, width, height);
    const guide = computeGuide(ctx, width, height);
    const radius = Math.max(4, Math.round(Math.min(width, height) * guidedRadiusRatio));
    const refined = guidedFilter(guide, coarse, width, height, radius, guidedEps);
    // 高分辨率开运算去发丝毛刺和小碎斑（实心的耳朵等部位保留），再做收尾羽化。
    const openRadius = Math.max(1, Math.round(Math.min(width, height) * edgeOpenRatio));
    const deburred = morphologicalOpen(refined, width, height, openRadius);
    const featherRadius = Math.max(1, Math.round(Math.min(width, height) * finalFeatherRatio));
    const smoothed = meanBlur(deburred, width, height, featherRadius);
    return applyAlpha(ctx, canvas, smoothed, width, height);
  } finally {
    // 释放 C++ 侧蒙版资源；蒙版只在本次调用内有效。
    result.close();
  }
}

// selfie 模型输出两个置信度蒙版：index0=背景、index1=人物；个别构建只给单通道前景概率，则取 index0。
function pickPersonMask(result: ImageSegmenterResult): MPMask | undefined {
  const masks = result.confidenceMasks;
  if (!masks || masks.length === 0) {
    return undefined;
  }
  return masks.length >= 2 ? masks[1] : masks[0];
}

// 可分离的形态学腐蚀/膨胀（先横后纵，各取窗口内最小/最大值），O(n·radius)。isMin=true 为腐蚀。
function separableMorph(src: Float32Array, width: number, height: number, radius: number, isMin: boolean): Float32Array {
  const horizontal = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let acc = isMin ? Infinity : -Infinity;
      const start = Math.max(0, x - radius);
      const end = Math.min(width - 1, x + radius);
      for (let xi = start; xi <= end; xi += 1) {
        const value = src[row + xi];
        acc = isMin ? Math.min(acc, value) : Math.max(acc, value);
      }
      horizontal[row + x] = acc;
    }
  }
  const out = new Float32Array(width * height);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let acc = isMin ? Infinity : -Infinity;
      const start = Math.max(0, y - radius);
      const end = Math.min(height - 1, y + radius);
      for (let yi = start; yi <= end; yi += 1) {
        const value = horizontal[yi * width + x];
        acc = isMin ? Math.min(acc, value) : Math.max(acc, value);
      }
      out[y * width + x] = acc;
    }
  }
  return out;
}

// 形态学开运算（先腐蚀后膨胀）：删掉比核小的亮区突起，保留大轮廓尺寸。
function morphologicalOpen(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) {
    return src;
  }
  const eroded = separableMorph(src, width, height, radius, true);
  return separableMorph(eroded, width, height, radius, false);
}

// 粗 alpha：在 256 原生分辨率上开运算去突起，再双线性放大到工作分辨率（不再加模糊，平滑交给引导滤波）。返回 0..1。
function maskToCoarseAlpha(mask: MPMask, width: number, height: number): Float32Array {
  const maskWidth = mask.width;
  const maskHeight = mask.height;
  const values = mask.getAsFloat32Array();

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskCtx) {
    throw new Error("Canvas 不可用。");
  }
  const opened = morphologicalOpen(values, maskWidth, maskHeight, maskOpenRadius);
  const maskImage = maskCtx.createImageData(maskWidth, maskHeight);
  for (let i = 0; i < maskWidth * maskHeight; i += 1) {
    const value = Math.max(0, Math.min(1, opened[i])) * 255;
    const offset = i * 4;
    maskImage.data[offset] = value;
    maskImage.data[offset + 1] = value;
    maskImage.data[offset + 2] = value;
    maskImage.data[offset + 3] = 255;
  }
  maskCtx.putImageData(maskImage, 0, 0);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outCtx = out.getContext("2d", { willReadFrequently: true });
  if (!outCtx) {
    throw new Error("Canvas 不可用。");
  }
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(maskCanvas, 0, 0, maskWidth, maskHeight, 0, 0, width, height);

  const data = outCtx.getImageData(0, 0, width, height).data;
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    alpha[i] = data[i * 4] / 255;
  }
  return alpha;
}

// 从原图画布取灰度引导图（0..1），供引导滤波对齐边缘。
function computeGuide(ctx: CanvasRenderingContext2D, width: number, height: number): Float32Array {
  const data = ctx.getImageData(0, 0, width, height).data;
  const guide = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    // Rec. 601 亮度
    guide[i] = (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
  }
  return guide;
}

// 可分离的窗口求和（先横后纵的前缀和），O(n)。配合「全 1 求和」得到边界正确的窗口均值。
function boxSum(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const horizontal = new Float32Array(width * height);
  const prefixRow = new Float64Array(width + 1);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    prefixRow[0] = 0;
    for (let x = 0; x < width; x += 1) {
      prefixRow[x + 1] = prefixRow[x] + src[row + x];
    }
    for (let x = 0; x < width; x += 1) {
      const lo = Math.max(0, x - radius);
      const hi = Math.min(width - 1, x + radius);
      horizontal[row + x] = prefixRow[hi + 1] - prefixRow[lo];
    }
  }
  const out = new Float32Array(width * height);
  const prefixCol = new Float64Array(height + 1);
  for (let x = 0; x < width; x += 1) {
    prefixCol[0] = 0;
    for (let y = 0; y < height; y += 1) {
      prefixCol[y + 1] = prefixCol[y] + horizontal[y * width + x];
    }
    for (let y = 0; y < height; y += 1) {
      const lo = Math.max(0, y - radius);
      const hi = Math.min(height - 1, y + radius);
      out[y * width + x] = prefixCol[hi + 1] - prefixCol[lo];
    }
  }
  return out;
}

// 均值模糊（窗口均值），复用 boxSum，用「全 1 求和」做边界正确的归一化。
function meanBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) {
    return src;
  }
  const ones = new Float32Array(width * height).fill(1);
  const count = boxSum(ones, width, height, radius);
  const sum = boxSum(src, width, height, radius);
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    out[i] = sum[i] / count[i];
  }
  return out;
}

// 引导滤波（He et al.）：以 guide 为引导对 src 做保边平滑，使输出 alpha 边界贴合 guide（原图）的边缘。
// q = meanA · I + meanB，其中 a/b 由局部线性回归得到。全程 O(n)。
function guidedFilter(guide: Float32Array, src: Float32Array, width: number, height: number, radius: number, eps: number): Float32Array {
  const n = width * height;
  const ones = new Float32Array(n).fill(1);
  const count = boxSum(ones, width, height, radius);

  const sumI = boxSum(guide, width, height, radius);
  const sumP = boxSum(src, width, height, radius);
  const II = new Float32Array(n);
  const IP = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    II[i] = guide[i] * guide[i];
    IP[i] = guide[i] * src[i];
  }
  const sumII = boxSum(II, width, height, radius);
  const sumIP = boxSum(IP, width, height, radius);

  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const c = count[i];
    const meanI = sumI[i] / c;
    const meanP = sumP[i] / c;
    const varI = sumII[i] / c - meanI * meanI;
    const covIP = sumIP[i] / c - meanI * meanP;
    const ai = covIP / (varI + eps);
    a[i] = ai;
    b[i] = meanP - ai * meanI;
  }

  const sumA = boxSum(a, width, height, radius);
  const sumB = boxSum(b, width, height, radius);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const value = (sumA[i] / count[i]) * guide[i] + sumB[i] / count[i];
    q[i] = value < 0 ? 0 : value > 1 ? 1 : value;
  }
  return q;
}

// 把 alpha（0..1）写回人像画布，并对边缘做 smoothstep 收紧；同时统计 alpha≥0.5 的人物包围盒。
function applyAlpha(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  alpha: Float32Array,
  width: number,
  height: number,
): PortraitResult {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  // 逐行记录人物左右边界，用于估算头部/肩线。
  const rowMinX = new Int32Array(height).fill(width);
  const rowMaxX = new Int32Array(height).fill(-1);

  for (let i = 0; i < width * height; i += 1) {
    let value = alpha[i];
    if (value <= alphaLow) {
      value = 0;
    } else if (value >= alphaHigh) {
      value = 1;
    } else {
      const t = (value - alphaLow) / (alphaHigh - alphaLow);
      value = t * t * (3 - 2 * t);
    }
    const out = Math.round(value * 255);
    data[i * 4 + 3] = out;
    if (out >= 128) {
      const x = i % width;
      const y = (i / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x < rowMinX[y]) rowMinX[y] = x;
      if (x > rowMaxX[y]) rowMaxX[y] = x;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const bbox = maxX >= minX && maxY >= minY ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null;
  const head = bbox ? estimateHead(rowMinX, rowMaxX, bbox) : null;
  return { canvas, width, height, bbox, head };
}

// 估算头部：从「脸宽」跳到「肩宽」的那一行视为肩线（头部下界）。
// 思路：头部在上方、宽度较窄；肩膀明显更宽。取上部 40% 的最大宽度作为脸宽基准，
// 向下找到首个宽度 ≥ 脸宽 × shoulderWidthRatio 的行作为肩线；找不到（纯大头照）则用包围盒底。
function estimateHead(rowMinX: Int32Array, rowMaxX: Int32Array, bbox: PortraitBBox): PortraitHead {
  const top = bbox.y;
  const bottom = bbox.y + bbox.h - 1;
  const rowWidth = (r: number) => (rowMaxX[r] >= 0 ? rowMaxX[r] - rowMinX[r] + 1 : 0);

  const headScanEnd = top + Math.floor(bbox.h * 0.4);
  let faceWidth = 0;
  let faceRow = top;
  for (let r = top; r <= headScanEnd; r += 1) {
    const w = rowWidth(r);
    if (w > faceWidth) {
      faceWidth = w;
      faceRow = r;
    }
  }

  const shoulderWidthRatio = 1.45;
  // 从越过头顶一小段处开始往下找肩线，避免把脸最宽处误当肩。
  let shoulderRow = -1;
  const scanStart = top + Math.floor(bbox.h * 0.18);
  for (let r = scanStart; r <= bottom; r += 1) {
    if (faceWidth > 0 && rowWidth(r) >= faceWidth * shoulderWidthRatio) {
      shoulderRow = r;
      break;
    }
  }

  const bottomY = shoulderRow > 0 ? shoulderRow : bottom;
  const centerX = faceWidth > 0 ? (rowMinX[faceRow] + rowMaxX[faceRow]) / 2 : bbox.x + bbox.w / 2;
  return { topY: top, bottomY, centerX };
}
