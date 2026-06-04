"use client";

import { Download, ImageIcon, Loader2, Type, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearObjectUrls,
  createZipBlob,
  downloadBlob,
  formatBytes,
  formatDateForFileName,
  formatMegapixels,
  loadSourceImages,
  stripExtension,
  type SourceImage,
} from "./image-source";
import { clampInt, mediaPrefKeys, readMediaPrefs, writeMediaPrefs } from "./media-preferences";

type GridPosition = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
type WatermarkLayout = "single" | "tiled";
type OutputFormat = "original" | "webp" | "jpeg" | "png";

type WatermarkConfig = {
  text: string;
  fontScale: number;
  color: string;
  opacity: number;
  layout: WatermarkLayout;
  position: GridPosition;
  offsetX: number;
  offsetY: number;
  angle: number;
  margin: number;
  shadow: boolean;
};

const copy = {
  angle: "倾斜角度",
  clear: "清空",
  color: "文字颜色",
  done: "已加水印",
  download: "下载当前",
  downloadAll: "打包下载全部",
  downloadZipReady: "ZIP 已生成，开始下载。",
  drop: "把图片拖到这里，或点击上传（支持多张）",
  dropActive: "松开后读取图片",
  estimatedOutput: "预计输出",
  estimatingSize: "体积计算中…",
  fontScale: "文字大小",
  format: "输出格式",
  input: "原图",
  layout: "水印排布",
  layoutSingle: "单个",
  layoutTiled: "平铺",
  limitHint: (limit: string) => `支持 JPG、PNG、WebP，可一次导入多张批量加水印，单张不超过 ${limit}。`,
  margin: "边距",
  noImage: "选择图片后，在右侧调整文字水印。",
  offsetX: "水平偏移",
  offsetY: "垂直偏移",
  opacity: "不透明度",
  output: "水印设置与预览",
  outputPlaceholder: "导入图片后这里会实时预览水印效果。",
  position: "位置",
  positionHint: "先选锚点，再用偏移微调到任意位置。",
  processing: "正在处理图片...",
  processingBatch: (current: number, total: number) => `正在处理第 ${current} / ${total} 张...`,
  quality: "质量",
  ready: (count: number) => `已为 ${count} 张图片加水印。`,
  removeImage: "移除这张图片",
  select: "选择图片",
  selectedImages: (count: number) => `已选择 ${count} 张图片`,
  shadow: "文字阴影（深浅背景都清晰）",
  text: "水印文字",
  textPlaceholder: "知之 zhizhi.xyz",
  tooLarge: (limit: string) => `图片不能超过 ${limit}，请先选择更小的图片。`,
  tooManyPixels: (limit: string) => `图片像素过多（超过 ${limit}），请先缩小尺寸再处理。`,
  transparentWarning: "转 JPG 会铺白透明背景；需保留透明请选 PNG 或 WebP。",
  unsupported: "当前浏览器无法读取这张图片，请换一张 JPG、PNG 或 WebP。",
};

const maxImageFileBytes = 30 * 1024 * 1024;
const maxImagePixels = 40 * 1000 * 1000;
const previewMaxSide = 1400;

const positionGrid: GridPosition[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
const positionLabels: Record<GridPosition, string> = {
  tl: "左上",
  tc: "上中",
  tr: "右上",
  ml: "左中",
  mc: "居中",
  mr: "右中",
  bl: "左下",
  bc: "下中",
  br: "右下",
};

const watermarkFont = '"Noto Sans SC", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
const outputFormats: OutputFormat[] = ["original", "webp", "jpeg", "png"];
const outputFormatLabels: Record<OutputFormat, string> = {
  original: "原格式",
  webp: "WebP",
  jpeg: "JPG",
  png: "PNG",
};
const formatMimes: Record<Exclude<OutputFormat, "original">, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};
const mimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function paintWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, config: WatermarkConfig) {
  const text = config.text.trim();
  if (!text) {
    return;
  }
  const fontPx = Math.max(8, Math.round(Math.min(width, height) * (config.fontScale / 100)));
  ctx.save();
  ctx.font = `600 ${fontPx}px ${watermarkFont}`;
  ctx.fillStyle = config.color;
  ctx.globalAlpha = clamp01(config.opacity / 100);
  ctx.textBaseline = "middle";
  if (config.shadow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = Math.max(1, Math.round(fontPx * 0.08));
    ctx.shadowOffsetY = Math.max(1, Math.round(fontPx * 0.04));
  }
  if (config.layout === "tiled") {
    paintTiled(ctx, text, width, height, fontPx, config.angle);
  } else {
    paintSingle(ctx, text, width, height, fontPx, config);
  }
  ctx.restore();
}

function paintSingle(ctx: CanvasRenderingContext2D, text: string, width: number, height: number, fontPx: number, config: WatermarkConfig) {
  const margin = Math.round(Math.min(width, height) * (config.margin / 100));
  const vertical = config.position[0];
  const horizontal = config.position[1];

  let x: number;
  if (horizontal === "l") {
    x = margin;
    ctx.textAlign = "left";
  } else if (horizontal === "r") {
    x = width - margin;
    ctx.textAlign = "right";
  } else {
    x = width / 2;
    ctx.textAlign = "center";
  }

  let y: number;
  if (vertical === "t") {
    y = margin + fontPx / 2;
  } else if (vertical === "b") {
    y = height - margin - fontPx / 2;
  } else {
    y = height / 2;
  }

  // 锚点基础上叠加偏移微调（按图宽/高百分比），实现「随意定位」。
  x += width * (config.offsetX / 100);
  y += height * (config.offsetY / 100);

  ctx.fillText(text, x, y);
}

function paintTiled(ctx: CanvasRenderingContext2D, text: string, width: number, height: number, fontPx: number, angleDeg: number) {
  ctx.textAlign = "center";
  ctx.translate(width / 2, height / 2);
  ctx.rotate((angleDeg * Math.PI) / 180);

  const textWidth = Math.max(ctx.measureText(text).width, fontPx);
  const stepX = textWidth + fontPx * 2.6;
  const stepY = fontPx * 3.2;
  const reach = Math.ceil(Math.sqrt(width * width + height * height));

  let row = 0;
  for (let y = -reach; y <= reach; y += stepY) {
    const rowOffset = (row % 2) * (stepX / 2);
    for (let x = -reach; x <= reach; x += stepX) {
      ctx.fillText(text, x + rowOffset, y);
    }
    row += 1;
  }
}

function resolveOutputMime(format: OutputFormat, sourceType: string) {
  if (format === "original") {
    return mimeExtensions[sourceType] ? sourceType : "image/png";
  }
  return formatMimes[format];
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("图片导出失败。"));
        }
      },
      mime,
      mime === "image/png" ? undefined : clamp01(quality / 100),
    );
  });
}

async function renderWatermarkedBlob(image: SourceImage, config: WatermarkConfig, mime: string, quality: number) {
  const bitmap = await createImageBitmap(image.file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 不可用。");
    }
    ctx.drawImage(bitmap, 0, 0);
    paintWatermark(ctx, bitmap.width, bitmap.height, config);
    return canvasToBlob(canvas, mime, quality);
  } finally {
    bitmap.close();
  }
}

type WatermarkPrefs = WatermarkConfig & { format: OutputFormat; quality: number };

const defaultPrefs: WatermarkPrefs = {
  text: "知之 zhizhi.xyz",
  fontScale: 5,
  color: "#ffffff",
  opacity: 35,
  layout: "tiled",
  position: "br",
  offsetX: 0,
  offsetY: 0,
  angle: -30,
  margin: 4,
  shadow: true,
  format: "original",
  quality: 92,
};

function isGridPosition(value: unknown): value is GridPosition {
  return typeof value === "string" && (positionGrid as string[]).includes(value);
}

function parseWatermarkPrefs(raw: Record<string, unknown>): WatermarkPrefs {
  return {
    text: typeof raw.text === "string" ? raw.text.slice(0, 120) : defaultPrefs.text,
    fontScale: clampInt(raw.fontScale, 2, 15, defaultPrefs.fontScale),
    color: typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : defaultPrefs.color,
    opacity: clampInt(raw.opacity, 5, 100, defaultPrefs.opacity),
    layout: raw.layout === "single" ? "single" : "tiled",
    position: isGridPosition(raw.position) ? raw.position : defaultPrefs.position,
    offsetX: clampInt(raw.offsetX, -50, 50, defaultPrefs.offsetX),
    offsetY: clampInt(raw.offsetY, -50, 50, defaultPrefs.offsetY),
    angle: clampInt(raw.angle, -90, 90, defaultPrefs.angle),
    margin: clampInt(raw.margin, 0, 20, defaultPrefs.margin),
    shadow: typeof raw.shadow === "boolean" ? raw.shadow : defaultPrefs.shadow,
    format: outputFormats.includes(raw.format as OutputFormat) ? (raw.format as OutputFormat) : defaultPrefs.format,
    quality: clampInt(raw.quality, 10, 100, defaultPrefs.quality),
  };
}

export function ImageWatermarkTool() {
  const labels = copy;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeBitmapRef = useRef<ImageBitmap | null>(null);
  const renderPreviewRef = useRef<() => void>(() => {});
  const sourcePreviewUrlsRef = useRef(new Set<string>());

  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [text, setText] = useState(defaultPrefs.text);
  const [fontScale, setFontScale] = useState(defaultPrefs.fontScale);
  const [color, setColor] = useState(defaultPrefs.color);
  const [opacity, setOpacity] = useState(defaultPrefs.opacity);
  const [layout, setLayout] = useState<WatermarkLayout>(defaultPrefs.layout);
  const [position, setPosition] = useState<GridPosition>(defaultPrefs.position);
  const [offsetX, setOffsetX] = useState(defaultPrefs.offsetX);
  const [offsetY, setOffsetY] = useState(defaultPrefs.offsetY);
  const [angle, setAngle] = useState(defaultPrefs.angle);
  const [margin, setMargin] = useState(defaultPrefs.margin);
  const [shadow, setShadow] = useState(defaultPrefs.shadow);
  const [format, setFormat] = useState<OutputFormat>(defaultPrefs.format);
  const [quality, setQuality] = useState(defaultPrefs.quality);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState(labels.noImage);
  const [messageTone, setMessageTone] = useState<"error" | "muted" | "success">("muted");
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [estimatingSize, setEstimatingSize] = useState(false);

  const sourceImage = sourceImages.find((item) => item.id === activeSourceId) ?? sourceImages[0] ?? null;
  const config = useMemo<WatermarkConfig>(
    () => ({ text, fontScale, color, opacity, layout, position, offsetX, offsetY, angle, margin, shadow }),
    [angle, color, fontScale, layout, margin, offsetX, offsetY, opacity, position, shadow, text],
  );
  const usesQuality = format === "jpeg" || format === "webp" || (format === "original" && sourceImage?.file.type !== "image/png");

  // 恢复 / 写回水印配置（不存图片），与其它媒体工具一致：setTimeout 延后避免水合不一致。
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readMediaPrefs(mediaPrefKeys.watermark, parseWatermarkPrefs);
      if (stored) {
        setText(stored.text);
        setFontScale(stored.fontScale);
        setColor(stored.color);
        setOpacity(stored.opacity);
        setLayout(stored.layout);
        setPosition(stored.position);
        setOffsetX(stored.offsetX);
        setOffsetY(stored.offsetY);
        setAngle(stored.angle);
        setMargin(stored.margin);
        setShadow(stored.shadow);
        setFormat(stored.format);
        setQuality(stored.quality);
      }
      setPrefsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    writeMediaPrefs(mediaPrefKeys.watermark, { ...config, format, quality } satisfies WatermarkPrefs);
  }, [config, format, quality, prefsHydrated]);

  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const bitmap = activeBitmapRef.current;
    if (!bitmap) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    const scale = Math.min(1, previewMaxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    paintWatermark(ctx, width, height, config);
  }, [config]);

  // 把最新的渲染函数放到 ref，供「切图」effect 调用而不必把它列进依赖（否则配置一变就重新解码）。
  useEffect(() => {
    renderPreviewRef.current = renderPreview;
  }, [renderPreview]);

  // 配置变更 → 重绘预览（renderPreview 随 config 变化）。
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // 仅在切换图片时解码（缓存 bitmap），配置变更只重绘、不重新解码。
  useEffect(() => {
    let cancelled = false;
    const file = sourceImage?.file ?? null;
    if (!file) {
      activeBitmapRef.current?.close();
      activeBitmapRef.current = null;
      renderPreviewRef.current();
      return;
    }
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        activeBitmapRef.current?.close();
        activeBitmapRef.current = bitmap;
        renderPreviewRef.current();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sourceImage]);

  // 卸载清理：关闭 bitmap、释放源预览 URL。
  useEffect(() => {
    const sourcePreviewUrls = sourcePreviewUrlsRef.current;
    return () => {
      activeBitmapRef.current?.close();
      activeBitmapRef.current = null;
      clearObjectUrls(sourcePreviewUrls);
    };
  }, []);

  // 估算当前图片按当前格式/质量加水印后的输出体积（防抖，复用已缓存的 bitmap 避免重复解码）。
  // setState 全部放进 setTimeout 回调，规避 react-hooks/set-state-in-effect。
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!sourceImage) {
        setOutputSize(null);
        setEstimatingSize(false);
        return;
      }
      setEstimatingSize(true);
      const mime = resolveOutputMime(format, sourceImage.file.type);
      const bitmap = activeBitmapRef.current;
      let blobPromise: Promise<Blob>;
      if (bitmap) {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          paintWatermark(ctx, bitmap.width, bitmap.height, config);
          blobPromise = canvasToBlob(canvas, mime, quality);
        } else {
          blobPromise = renderWatermarkedBlob(sourceImage, config, mime, quality);
        }
      } else {
        blobPromise = renderWatermarkedBlob(sourceImage, config, mime, quality);
      }
      blobPromise
        .then((blob) => {
          if (!cancelled) {
            setOutputSize(blob.size);
            setEstimatingSize(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOutputSize(null);
            setEstimatingSize(false);
          }
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [config, format, quality, sourceImage]);

  async function chooseFiles(fileList: FileList | File[] | null) {
    if (busy) {
      return;
    }
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }

    setBusy(true);
    setMessageTone("muted");
    try {
      const { images: loadedImages, previewUrls: newPreviewUrls, skipped, tooLarge, tooManyPixels } = await loadSourceImages(files, {
        maxBytes: maxImageFileBytes,
        maxPixels: maxImagePixels,
      });

      const skipNote = tooLarge > 0
        ? labels.tooLarge(formatBytes(maxImageFileBytes))
        : tooManyPixels > 0
          ? labels.tooManyPixels(formatMegapixels(maxImagePixels))
          : "";

      if (loadedImages.length === 0) {
        clearObjectUrls(newPreviewUrls);
        setMessage(skipNote || labels.unsupported);
        setMessageTone("error");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      clearObjectUrls(sourcePreviewUrlsRef.current);
      for (const previewUrl of newPreviewUrls) {
        sourcePreviewUrlsRef.current.add(previewUrl);
      }
      setSourceImages(loadedImages);
      setActiveSourceId(loadedImages[0].id);
      setMessage(`${labels.selectedImages(loadedImages.length)}${skipNote ? ` · ${skipNote}` : ""}`);
      setMessageTone(skipped > 0 ? "error" : "muted");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setMessage(labels.unsupported);
      setMessageTone("error");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setBusy(false);
    }
  }

  function clearImages() {
    clearObjectUrls(sourcePreviewUrlsRef.current);
    setSourceImages([]);
    setActiveSourceId(null);
    setMessage(labels.noImage);
    setMessageTone("muted");
  }

  function removeSourceImage(id: string) {
    const target = sourceImages.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      sourcePreviewUrlsRef.current.delete(target.previewUrl);
    }
    const remaining = sourceImages.filter((item) => item.id !== id);
    setSourceImages(remaining);
    if (activeSourceId === id) {
      setActiveSourceId(remaining[0]?.id ?? null);
    }
    setMessage(remaining.length === 0 ? labels.noImage : labels.selectedImages(remaining.length));
    setMessageTone("muted");
  }

  function outputNameFor(image: SourceImage, mime: string) {
    return `${stripExtension(image.name)}-watermark.${mimeExtensions[mime] ?? "png"}`;
  }

  async function downloadCurrent() {
    if (!sourceImage || busy) {
      return;
    }
    setBusy(true);
    setMessage(labels.processing);
    setMessageTone("muted");
    try {
      const mime = resolveOutputMime(format, sourceImage.file.type);
      const blob = await renderWatermarkedBlob(sourceImage, config, mime, quality);
      downloadBlob(blob, outputNameFor(sourceImage, mime));
      setMessage(labels.ready(1));
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.unsupported);
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  async function downloadAll() {
    if (sourceImages.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setMessageTone("muted");
    try {
      const files: Array<{ data: Uint8Array; name: string }> = [];
      for (const [index, image] of sourceImages.entries()) {
        setMessage(labels.processingBatch(index + 1, sourceImages.length));
        const mime = resolveOutputMime(format, image.file.type);
        const blob = await renderWatermarkedBlob(image, config, mime, quality);
        files.push({ data: new Uint8Array(await blob.arrayBuffer()), name: outputNameFor(image, mime) });
      }
      const zipBlob = await createZipBlob(files);
      downloadBlob(zipBlob, `watermark-${formatDateForFileName(new Date())}.zip`);
      setMessage(labels.downloadZipReady);
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.unsupported);
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  const showTransparentWarning = (format === "jpeg" || (format === "original" && sourceImage?.file.type === "image/png")) && sourceImage?.file.type !== "image/jpeg";

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="min-w-0 rounded-md border border-line bg-paper/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{labels.input}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted">{labels.limitHint(formatBytes(maxImageFileBytes))}</p>
            </div>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="h-3.5 w-3.5" />
              {labels.select}
            </button>
          </div>

          <button
            className={`mt-4 flex aspect-[16/10] w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed p-4 text-center transition ${dragActive ? "border-accent bg-accent/12 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)]" : "border-[color-mix(in_srgb,var(--accent)_34%,var(--line))] bg-accent/5 hover:border-accent/60 hover:bg-accent/8"}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) {
                setDragActive(false);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void chooseFiles(event.dataTransfer.files);
            }}
          >
            {sourceImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- 本地对象 URL 预览。
              <img src={sourceImage.previewUrl} alt={sourceImage.name} className="max-h-full max-w-full rounded object-contain shadow-sm" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-xs font-semibold text-muted">
                <ImageIcon className="h-6 w-6 text-accent" />
                {dragActive ? labels.dropActive : labels.drop}
              </span>
            )}
          </button>

          {sourceImages.length > 1 ? (
            <div className="mt-3 grid max-h-72 gap-2 overflow-auto rounded-md border border-line bg-paper/70 p-2">
              <div className="px-1 text-xs font-semibold text-muted">{labels.selectedImages(sourceImages.length)}</div>
              {sourceImages.map((image) => {
                const active = image.id === sourceImage?.id;
                return (
                  <div key={image.id} className={`flex min-w-0 items-center gap-2 rounded-md p-1 transition ${active ? "bg-accent/10" : "hover:bg-surface"}`}>
                    <button
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md text-left transition disabled:cursor-not-allowed"
                      type="button"
                      disabled={busy}
                      onClick={() => setActiveSourceId(image.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- 本地对象 URL 缩略图。 */}
                      <img src={image.previewUrl} alt={image.name} className="h-10 w-10 shrink-0 rounded border border-line object-cover" />
                      <span className="grid min-w-0 flex-1">
                        <span className={`min-w-0 truncate text-xs font-semibold ${active ? "text-foreground" : "text-muted"}`}>{image.name}</span>
                        <span className="text-[0.7rem] font-semibold text-muted">{image.width} x {image.height}</span>
                      </span>
                    </button>
                    <button
                      className="mr-1 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={busy}
                      aria-label={labels.removeImage}
                      title={labels.removeImage}
                      onClick={() => removeSourceImage(image.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-md border border-line bg-paper/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.output}</h3>

          <div className="mt-3 overflow-hidden rounded-md border border-line bg-[repeating-conic-gradient(var(--surface)_0_25%,transparent_0_50%)] bg-[length:18px_18px]">
            {sourceImage ? (
              <canvas ref={previewCanvasRef} className="mx-auto block h-auto max-h-[26rem] w-auto max-w-full" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center px-4 text-center text-xs font-semibold text-muted">{labels.outputPlaceholder}</div>
            )}
          </div>

          <label className="mt-4 grid gap-1.5 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5 text-accent" />
              {labels.text}
            </span>
            <input
              className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent"
              value={text}
              maxLength={120}
              placeholder={labels.textPlaceholder}
              onChange={(event) => setText(event.target.value)}
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 text-xs font-semibold text-muted">
              <span>{labels.layout}</span>
              <div className="inline-flex overflow-hidden rounded-md border border-line">
                {(["tiled", "single"] as const).map((item) => (
                  <button
                    key={item}
                    className={`h-9 flex-1 cursor-pointer px-3 text-xs font-semibold transition ${layout === item ? "bg-accent/12 text-accent" : "text-muted hover:bg-surface"}`}
                    type="button"
                    onClick={() => setLayout(item)}
                  >
                    {item === "tiled" ? labels.layoutTiled : labels.layoutSingle}
                  </button>
                ))}
              </div>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold text-muted">
              {labels.color}
              <input
                className="h-9 w-full cursor-pointer rounded-md border border-line bg-surface px-1"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
          </div>

          {layout === "single" ? (
            <>
              <div className="mt-4 grid gap-1.5 text-xs font-semibold text-muted">
                <span>{labels.position}</span>
                <div className="grid w-28 grid-cols-3 gap-1">
                  {positionGrid.map((item) => (
                    <button
                      key={item}
                      className={`h-8 cursor-pointer rounded-md border text-[0.65rem] font-semibold transition ${position === item ? "border-accent bg-accent/12 text-accent" : "border-line text-muted hover:bg-surface"}`}
                      type="button"
                      aria-label={positionLabels[item]}
                      title={positionLabels[item]}
                      onClick={() => setPosition(item)}
                    >
                      ·
                    </button>
                  ))}
                </div>
                <p className="text-[0.7rem] font-medium leading-5 text-muted">{labels.positionHint}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RangeRow label={labels.offsetX} value={offsetX} min={-50} max={50} suffix="%" onChange={setOffsetX} />
                <RangeRow label={labels.offsetY} value={offsetY} min={-50} max={50} suffix="%" onChange={setOffsetY} />
              </div>
            </>
          ) : (
            <RangeRow label={labels.angle} value={angle} min={-90} max={90} suffix="°" onChange={setAngle} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <RangeRow label={labels.fontScale} value={fontScale} min={2} max={15} suffix="%" onChange={setFontScale} />
            <RangeRow label={labels.opacity} value={opacity} min={5} max={100} suffix="%" onChange={setOpacity} />
          </div>
          {layout === "single" ? <RangeRow label={labels.margin} value={margin} min={0} max={20} suffix="%" onChange={setMargin} /> : null}

          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
            <input type="checkbox" className="cursor-pointer accent-[var(--accent)]" checked={shadow} onChange={(event) => setShadow(event.target.checked)} />
            {labels.shadow}
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
              {labels.format}
              <select
                className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent"
                value={format}
                onChange={(event) => setFormat(event.target.value as OutputFormat)}
              >
                {outputFormats.map((item) => (
                  <option key={item} value={item}>{outputFormatLabels[item]}</option>
                ))}
              </select>
            </label>
            {usesQuality ? <RangeRow label={labels.quality} value={quality} min={10} max={100} suffix="" onChange={setQuality} /> : <div />}
          </div>

          {sourceImage ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-muted">
              {labels.estimatedOutput}：{sourceImage.width} × {sourceImage.height} · {estimatingSize || outputSize === null ? labels.estimatingSize : `≈ ${formatBytes(outputSize)}`}
            </p>
          ) : null}

          {showTransparentWarning ? <p className="mt-2 text-xs font-semibold leading-5 text-amber-600">{labels.transparentWarning}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="admin-btn admin-btn-primary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!sourceImage || busy} onClick={() => void downloadCurrent()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {labels.download}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={sourceImages.length < 2 || busy} onClick={() => void downloadAll()}>
              <Download className="h-3.5 w-3.5" />
              {labels.downloadAll}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={sourceImages.length === 0 || busy} onClick={clearImages}>
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          </div>

          <p className={`mt-3 text-xs font-semibold leading-5 ${messageTone === "error" ? "text-red-500" : messageTone === "success" ? "text-accent" : "text-muted"}`}>{message}</p>
        </section>
      </div>

      <input ref={fileInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void chooseFiles(event.target.files)} />
    </div>
  );
}

function RangeRow({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <div className="mt-4 grid gap-1.5 text-xs font-semibold text-muted">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-foreground">{value}{suffix}</span>
      </div>
      <input className="w-full cursor-pointer accent-[var(--accent)]" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}
