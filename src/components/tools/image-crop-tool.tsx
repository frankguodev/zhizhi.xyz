"use client";

import { Circle, Download, FileUp, FlipHorizontal2, Lock, RotateCcw, RotateCw, Square, Unlock, X } from "lucide-react";
import { type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { mediaPrefKeys, readMediaPrefs, writeMediaPrefs } from "./media-preferences";
import { clearObjectUrls, downloadBlob, loadSourceImages, stripExtension, type SourceImage } from "./image-source";

type Rect = { x: number; y: number; w: number; h: number };
type OutputFormat = "png" | "jpeg" | "webp";
type CornerKind = "nw" | "ne" | "sw" | "se";
type EdgeKind = "n" | "e" | "s" | "w";
type DragKind = "move" | CornerKind | EdgeKind;
type WorkImage = { url: string; width: number; height: number };

const corners: CornerKind[] = ["nw", "ne", "sw", "se"];
const edges: EdgeKind[] = ["n", "e", "s", "w"];

const maxBytes = 30 * 1024 * 1024;
const maxPixels = 60 * 1_000_000;
const minCrop = 16;
const quality = 0.92;
const zoomMin = 1;
const zoomMax = 4;
const zoomStep = 0.5;

const formatMimes: Record<OutputFormat, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
const formatExtensions: Record<OutputFormat, string> = { png: "png", jpeg: "jpg", webp: "webp" };
const formatLabels: Record<OutputFormat, string> = { png: "PNG", jpeg: "JPG", webp: "WebP" };
const outputFormats: OutputFormat[] = ["png", "jpeg", "webp"];

const aspectPresets: Array<{ key: string; label: string; ratio: number | null }> = [
  { key: "free", label: "自由", ratio: null },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "3:4", label: "3:4", ratio: 3 / 4 },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
  { key: "9:16", label: "9:16", ratio: 9 / 16 },
  // 原比例：锁回原图宽高比并铺满。比例随图片动态变化，由 ratioForKey 在运行时计算。
  { key: "original", label: "原比例", ratio: null },
];

function ratioForKey(key: string, dimensions: { width: number; height: number } | null): number | null {
  if (key === "original") {
    return dimensions ? dimensions.width / dimensions.height : null;
  }
  return aspectPresets.find((preset) => preset.key === key)?.ratio ?? null;
}

const copy = {
  dropHint: "点击选择、拖拽或粘贴图片",
  transform: "旋转 / 翻转",
  rotateLeft: "左转 90°",
  rotateRight: "右转 90°",
  flip: "水平翻转",
  preparing: "处理中…",
  aspect: "裁剪比例",
  circle: "圆形输出（头像）",
  format: "输出格式",
  download: "下载裁剪图",
  replace: "换一张",
  clear: "清空",
  circleNote: "圆形输出需要透明背景，已强制使用 PNG。",
  outputSize: "输出尺寸",
  size: "裁剪尺寸（px）",
  lockRatio: "锁定比例",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function centeredRect(natW: number, natH: number, ratio: number | null): Rect {
  if (ratio === null) {
    return { x: 0, y: 0, w: natW, h: natH };
  }
  let w = natW;
  let h = w / ratio;
  if (h > natH) {
    h = natH;
    w = h * ratio;
  }
  return { x: (natW - w) / 2, y: (natH - h) / 2, w, h };
}

// 把已解码的原图按旋转/翻转画到一张工作画布（90°/270° 交换宽高）。预览和导出共用，避免各写一份变换逻辑。
function renderWorkCanvas(bitmap: ImageBitmap, rotation: number, flipH: boolean): HTMLCanvasElement | null {
  const swapped = rotation === 90 || rotation === 270;
  const w = swapped ? bitmap.height : bitmap.width;
  const h = swapped ? bitmap.width : bitmap.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flipH) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return canvas;
}

type CropPrefs = { aspectKey: string; circle: boolean; format: OutputFormat };

function parseCropPrefs(raw: Record<string, unknown>): CropPrefs {
  return {
    aspectKey: aspectPresets.some((preset) => preset.key === raw.aspectKey) ? (raw.aspectKey as string) : "free",
    circle: raw.circle === true,
    format: outputFormats.includes(raw.format as OutputFormat) ? (raw.format as OutputFormat) : "png",
  };
}

export function ImageCropTool() {
  const [original, setOriginal] = useState<SourceImage | null>(null);
  const [work, setWork] = useState<WorkImage | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [zoom, setZoom] = useState(1);
  const [baseSize, setBaseSize] = useState<{ w: number; h: number } | null>(null);
  const [cropFocused, setCropFocused] = useState(false);
  const [lockRatio, setLockRatio] = useState(false);
  const [aspectKey, setAspectKey] = useState("free");
  const [circle, setCircle] = useState(false);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [error, setError] = useState("");
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const workUrlRef = useRef("");
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const aspectKeyRef = useRef(aspectKey);
  const dragRef = useRef<{ kind: DragKind; startX: number; startY: number; startRect: Rect } | null>(null);
  // 记录上一次的图/旋转/翻转，用来判断「仅水平翻转」这种情况，好镜像保留裁剪框而不是重置。
  const prevTransformRef = useRef<{ original: SourceImage | null; rotation: number; flipH: boolean }>({ original: null, rotation: 0, flipH: false });

  useEffect(() => {
    aspectKeyRef.current = aspectKey;
  }, [aspectKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readMediaPrefs(mediaPrefKeys.crop, parseCropPrefs);
      if (stored) {
        setAspectKey(stored.aspectKey);
        setCircle(stored.circle);
        setFormat(stored.format);
      }
      setPrefsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    writeMediaPrefs(mediaPrefKeys.crop, { aspectKey, circle, format } satisfies CropPrefs);
  }, [prefsHydrated, aspectKey, circle, format]);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      clearObjectUrls(urls);
      if (workUrlRef.current) {
        URL.revokeObjectURL(workUrlRef.current);
        workUrlRef.current = "";
      }
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, []);

  // 旋转 / 翻转改写「工作图」：始终从原图重画（避免画质累积损失），90°/270° 交换宽高。
  // 裁剪框、坐标换算、导出都作用在这张工作图上，核心裁剪逻辑无需感知旋转。
  useEffect(() => {
    const bitmap = bitmapRef.current;
    if (!original || !bitmap) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const canvas = renderWorkCanvas(bitmap, rotation, flipH);
      if (!canvas) {
        return;
      }
      const w = canvas.width;
      const h = canvas.height;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (cancelled || !blob) {
        return;
      }
      if (workUrlRef.current) {
        URL.revokeObjectURL(workUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      workUrlRef.current = url;
      setWork({ url, width: w, height: h });
      // 仅水平翻转（图和旋转角不变）：宽高不变，把裁剪框沿 x 镜像保留；其它情况（换图/旋转）按当前比例重置。
      const prev = prevTransformRef.current;
      const flipOnly = prev.original === original && prev.rotation === rotation && prev.flipH !== flipH;
      setCrop((currentCrop) =>
        flipOnly && currentCrop
          ? { x: w - currentCrop.x - currentCrop.w, y: currentCrop.y, w: currentCrop.w, h: currentCrop.h }
          : centeredRect(w, h, ratioForKey(aspectKeyRef.current, { width: w, height: h })),
      );
      prevTransformRef.current = { original, rotation, flipH };
    })();

    return () => {
      cancelled = true;
    };
  }, [original, rotation, flipH]);

  const loadFile = useCallback(async (file: File | undefined | null) => {
    if (!file) {
      return;
    }
    const result = await loadSourceImages([file], { maxBytes, maxPixels });
    if (result.images.length === 0) {
      setError(result.tooLarge > 0 ? "图片体积过大。" : result.tooManyPixels > 0 ? "图片像素过多。" : "请选择 JPG / PNG / WebP 图片。");
      return;
    }
    const image = result.images[0];
    // 只在加载时解码一次原图，旋转/翻转/导出都复用这张 bitmap，避免反复解码大图。
    const bitmap = await createImageBitmap(image.file, { imageOrientation: "from-image" });
    clearObjectUrls(objectUrlsRef.current);
    for (const url of result.previewUrls) {
      objectUrlsRef.current.add(url);
    }
    bitmapRef.current?.close();
    bitmapRef.current = bitmap;
    setError("");
    setRotation(0);
    setFlipH(false);
    setZoom(1);
    setOriginal(image);
  }, []);

  // 量取「适应显示」的基准尺寸（不含 transform 缩放），缩放用它 × zoom 撑出滚动空间；容器变化时重量。
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const observer = new ResizeObserver(() => setBaseSize({ w: stage.offsetWidth, h: stage.offsetHeight }));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [work]);

  // 文档级粘贴：焦点不在输入框/文本域时，剪贴板里有图就换图（加载后虚线框消失也能粘贴换图）。
  useEffect(() => {
    function onDocPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
        return;
      }
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void loadFile(file);
      }
    }
    document.addEventListener("paste", onDocPaste);
    return () => document.removeEventListener("paste", onDocPaste);
  }, [loadFile]);

  function applyAspect(key: string) {
    setAspectKey(key);
    if (!work) {
      return;
    }
    const ratio = ratioForKey(key, work);
    if (ratio !== null) {
      setCrop(centeredRect(work.width, work.height, ratio));
    }
  }

  // 数值输入改尺寸：锚定左上角，锁比例时由改动的一边推算另一边，最后夹到画布边界内。
  function resizeCropTo(nextWidth: number | null, nextHeight: number | null) {
    setCrop((current) => {
      if (!work || !current) {
        return current;
      }
      // 有效比例：选了比例预设用预设；否则若开了「锁定比例」用当前裁剪框的比例。
      const ratio = ratioForKey(aspectKey, work) ?? (lockRatio ? current.w / current.h : null);
      let w = nextWidth ?? current.w;
      let h = nextHeight ?? current.h;
      if (ratio !== null) {
        if (nextWidth !== null) {
          h = w / ratio;
        } else if (nextHeight !== null) {
          w = h * ratio;
        }
      }
      w = clamp(w, minCrop, work.width - current.x);
      h = clamp(h, minCrop, work.height - current.y);
      if (ratio !== null) {
        if (nextWidth !== null) {
          h = clamp(w / ratio, minCrop, work.height - current.y);
          w = h * ratio;
        } else {
          w = clamp(h * ratio, minCrop, work.width - current.x);
          h = w / ratio;
        }
      }
      return { ...current, w, h };
    });
  }

  // 键盘可访问：聚焦裁剪框后，方向键移动；Shift + 方向键缩放右/下边。
  function onCropKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!work || !crop) {
      return;
    }
    // 步长按自然像素，但跟图尺寸成比例，避免大图上每次只挪 1px（缩小显示后看不出来）。
    const base = Math.max(2, Math.round(Math.max(work.width, work.height) / 200));
    const step = event.shiftKey ? base * 5 : base;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;

    event.preventDefault();
    if (event.shiftKey) {
      const locked = ratioForKey(aspectKey, work) !== null || lockRatio;
      resizeCropTo(crop.w + dx, locked ? null : crop.h + dy);
      return;
    }
    setCrop((current) =>
      current
        ? {
            ...current,
            x: clamp(current.x + dx, 0, work.width - current.w),
            y: clamp(current.y + dy, 0, work.height - current.h),
          }
        : current,
    );
  }

  function zoomBy(delta: number) {
    setZoom((current) => clamp(Math.round((current + delta) * 100) / 100, zoomMin, zoomMax));
  }

  function natFromClient(clientX: number, clientY: number) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || !work) {
      return { x: 0, y: 0 };
    }
    return {
      x: clamp(((clientX - rect.left) / rect.width) * work.width, 0, work.width),
      y: clamp(((clientY - rect.top) / rect.height) * work.height, 0, work.height),
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>, kind: DragKind) {
    if (!crop) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = natFromClient(event.clientX, event.clientY);
    dragRef.current = { kind, startX: point.x, startY: point.y, startRect: crop };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || !work) {
      return;
    }
    const point = natFromClient(event.clientX, event.clientY);
    setCrop(computeRect(drag, point, work.width, work.height, ratioForKey(aspectKey, work)));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function rotateBy(delta: 90 | -90) {
    setRotation((current) => (current + delta + 360) % 360);
  }

  async function download() {
    const bitmap = bitmapRef.current;
    if (!original || !work || !crop || !bitmap) {
      return;
    }
    // 从缓存 bitmap 重新合成工作图再裁剪，不依赖 DOM <img> 是否已加载完，避免旋转后立刻导出的竞态。
    const workCanvas = renderWorkCanvas(bitmap, rotation, flipH);
    if (!workCanvas) {
      return;
    }
    const outW = Math.max(1, Math.round(crop.w));
    const outH = Math.max(1, Math.round(crop.h));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const useCircle = circle;
    const exportFormat: OutputFormat = useCircle ? "png" : format;
    // JPEG 不支持透明，先铺白底，避免源图透明区域导出成黑色。
    if (exportFormat === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    }
    if (useCircle) {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(workCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, formatMimes[exportFormat], quality));
    if (blob) {
      downloadBlob(blob, `${stripExtension(original.name)}-crop.${formatExtensions[exportFormat]}`);
    }
  }

  function clear() {
    clearObjectUrls(objectUrlsRef.current);
    if (workUrlRef.current) {
      URL.revokeObjectURL(workUrlRef.current);
      workUrlRef.current = "";
    }
    bitmapRef.current?.close();
    bitmapRef.current = null;
    setOriginal(null);
    setWork(null);
    setCrop(null);
    setRotation(0);
    setFlipH(false);
    setZoom(1);
    setError("");
  }

  const outDims = crop ? `${Math.round(crop.w)} × ${Math.round(crop.h)} px` : "";
  const freeMode = !!work && ratioForKey(aspectKey, work) === null;

  function edgeHandleStyle(edge: EdgeKind) {
    if (edge === "n") return { left: "50%", top: "-12px", transform: "translateX(-50%)", cursor: "ns-resize" } as const;
    if (edge === "s") return { left: "50%", bottom: "-12px", transform: "translateX(-50%)", cursor: "ns-resize" } as const;
    if (edge === "w") return { top: "50%", left: "-12px", transform: "translateY(-50%)", cursor: "ew-resize" } as const;
    return { top: "50%", right: "-12px", transform: "translateY(-50%)", cursor: "ew-resize" } as const;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section
        className="flex flex-col rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void loadFile(event.dataTransfer.files[0]);
        }}
      >
        {!original ? (
          <button
            className="flex min-h-48 w-full flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface/60 px-4 py-6 text-sm font-semibold text-muted transition hover:border-accent/45 hover:text-accent"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-7 w-7" />
            {copy.dropHint}
          </button>
        ) : work ? (
          <div className="flex flex-1 flex-col gap-3">
            <div className={`flex min-h-0 flex-1 ${zoom > 1 ? "overflow-auto" : "items-center justify-center"}`}>
            <div className="m-auto" style={zoom > 1 ? { width: baseSize ? baseSize.w * zoom : "max-content", height: baseSize ? baseSize.h * zoom : "max-content" } : undefined}>
            <div
              ref={stageRef}
              className="relative inline-block select-none overflow-hidden rounded-md border border-line bg-surface/70"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 本地对象 URL，裁剪需读原始像素，不用 next/image。 */}
              <img
                ref={imgRef}
                src={work.url}
                alt={original.name}
                className="block max-h-[74vh] w-auto max-w-full"
                draggable={false}
              />
              {crop ? (
                <div
                  className="absolute cursor-move touch-none outline-none"
                  tabIndex={0}
                  role="group"
                  aria-label="裁剪区域：方向键移动，Shift + 方向键缩放"
                  style={{
                    left: `${(crop.x / work.width) * 100}%`,
                    top: `${(crop.y / work.height) * 100}%`,
                    width: `${(crop.w / work.width) * 100}%`,
                    height: `${(crop.h / work.height) * 100}%`,
                    boxShadow: "0 0 0 9999px rgba(20,17,10,0.46)",
                    outline: cropFocused ? "2px solid var(--accent)" : "1px solid var(--accent)",
                    borderRadius: circle ? "9999px" : undefined,
                  }}
                  onKeyDown={onCropKeyDown}
                  onFocus={() => setCropFocused(true)}
                  onBlur={() => setCropFocused(false)}
                  onPointerDown={(event) => onPointerDown(event, "move")}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  {corners.map((corner) => (
                    <span
                      key={corner}
                      className="absolute flex h-6 w-6 touch-none items-center justify-center"
                      style={{
                        left: corner === "nw" || corner === "sw" ? "-12px" : undefined,
                        right: corner === "ne" || corner === "se" ? "-12px" : undefined,
                        top: corner === "nw" || corner === "ne" ? "-12px" : undefined,
                        bottom: corner === "sw" || corner === "se" ? "-12px" : undefined,
                        cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                      }}
                      onPointerDown={(event) => onPointerDown(event, corner)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                    >
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-accent bg-paper" />
                    </span>
                  ))}
                  {freeMode
                    ? edges.map((edge) => (
                        <span
                          key={edge}
                          className="absolute flex h-6 w-6 touch-none items-center justify-center"
                          style={edgeHandleStyle(edge)}
                          onPointerDown={(event) => onPointerDown(event, edge)}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                        >
                          <span className={`rounded-full border-2 border-accent bg-paper ${edge === "n" || edge === "s" ? "h-1.5 w-4" : "h-4 w-1.5"}`} />
                        </span>
                      ))
                    : null}
                </div>
              ) : null}
            </div>
            </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">{copy.outputSize}：{outDims}</span>
              <div className="flex items-center gap-1">
                <button className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-sm font-semibold text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-40" type="button" aria-label="缩小" disabled={zoom <= zoomMin} onClick={() => zoomBy(-zoomStep)}>−</button>
                <button className="inline-flex h-7 min-w-14 cursor-pointer items-center justify-center rounded-md border border-line bg-surface px-2 text-xs font-semibold text-muted transition hover:text-accent" type="button" aria-label="重置缩放" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
                <button className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-sm font-semibold text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-40" type="button" aria-label="放大" disabled={zoom >= zoomMax} onClick={() => zoomBy(zoomStep)}>+</button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm font-semibold text-muted">{copy.preparing}</p>
        )}

        {error ? <p className="mt-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}

        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            void loadFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </section>

      <section className="grid h-max gap-4 rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="grid gap-1.5 text-xs font-semibold text-muted">
          <span>{copy.transform}</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line bg-surface text-xs font-semibold text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!work}
              onClick={() => rotateBy(-90)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {copy.rotateLeft}
            </button>
            <button
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line bg-surface text-xs font-semibold text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!work}
              onClick={() => rotateBy(90)}
            >
              <RotateCw className="h-3.5 w-3.5" />
              {copy.rotateRight}
            </button>
            <button
              className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${flipH ? "border-accent/45 bg-accent/16 text-accent" : "border-line bg-surface text-muted hover:text-accent"}`}
              type="button"
              aria-pressed={flipH}
              disabled={!work}
              onClick={() => setFlipH((current) => !current)}
            >
              <FlipHorizontal2 className="h-3.5 w-3.5" />
              {copy.flip}
            </button>
          </div>
        </div>

        <div className="grid gap-1.5 text-xs font-semibold text-muted">
          <span>{copy.aspect}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {aspectPresets.map((preset) => (
              <button
                key={preset.key}
                className={`h-8 cursor-pointer rounded-md text-xs font-semibold transition disabled:cursor-not-allowed ${aspectKey === preset.key ? "bg-accent/16 text-accent shadow-[var(--shadow-quiet)]" : "bg-accent/8 text-muted hover:text-accent"}`}
                type="button"
                aria-pressed={aspectKey === preset.key}
                disabled={!work}
                onClick={() => applyAspect(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5 text-xs font-semibold text-muted">
          <div className="flex items-center justify-between gap-2">
            <span>{copy.size}</span>
            <button
              className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs font-semibold transition disabled:cursor-not-allowed ${lockRatio ? "border-accent/45 bg-accent/16 text-accent" : "border-line bg-surface text-muted hover:text-accent"}`}
              type="button"
              aria-pressed={lockRatio}
              disabled={!crop}
              onClick={() => setLockRatio((current) => !current)}
            >
              {lockRatio ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {copy.lockRatio}
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              className="h-8 w-full rounded-md border border-line bg-surface px-2 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:opacity-50"
              type="number"
              min={minCrop}
              inputMode="numeric"
              aria-label="裁剪宽度（像素）"
              disabled={!crop}
              value={crop ? Math.round(crop.w) : ""}
              onChange={(event) => resizeCropTo(Number(event.target.value) || minCrop, null)}
            />
            <span className="text-muted">×</span>
            <input
              className="h-8 w-full rounded-md border border-line bg-surface px-2 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:opacity-50"
              type="number"
              min={minCrop}
              inputMode="numeric"
              aria-label="裁剪高度（像素）"
              disabled={!crop}
              value={crop ? Math.round(crop.h) : ""}
              onChange={(event) => resizeCropTo(null, Number(event.target.value) || minCrop)}
            />
          </div>
        </div>

        <button
          className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${circle ? "border-accent/45 bg-accent/16 text-accent" : "border-line bg-surface text-muted hover:text-accent"}`}
          type="button"
          aria-pressed={circle}
          onClick={() => setCircle((current) => !current)}
        >
          {circle ? <Circle className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {copy.circle}
        </button>

        <div className="grid gap-1.5 text-xs font-semibold text-muted">
          <span>{copy.format}</span>
          <div className="grid grid-cols-3 rounded-md bg-accent/8 p-1">
            {outputFormats.map((item) => (
              <button
                key={item}
                className={`h-8 cursor-pointer rounded text-xs font-semibold transition disabled:cursor-not-allowed ${(circle ? "png" : format) === item ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"} ${circle && item !== "png" ? "opacity-40" : ""}`}
                type="button"
                aria-pressed={(circle ? "png" : format) === item}
                disabled={circle}
                onClick={() => setFormat(item)}
              >
                {formatLabels[item]}
              </button>
            ))}
          </div>
          {circle ? <p className="text-xs font-medium leading-5 text-muted">{copy.circleNote}</p> : null}
        </div>

        <div className="grid gap-2">
          <button className="admin-btn admin-btn-primary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!crop} onClick={() => void download()}>
            <Download className="h-3.5 w-3.5" />
            {copy.download}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!original} onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-3.5 w-3.5" />
              {copy.replace}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!original} onClick={clear}>
              <X className="h-3.5 w-3.5" />
              {copy.clear}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function computeRect(
  drag: { kind: DragKind; startX: number; startY: number; startRect: Rect },
  point: { x: number; y: number },
  natW: number,
  natH: number,
  ratio: number | null,
): Rect {
  const { kind, startX, startY, startRect } = drag;

  if (kind === "move") {
    const x = clamp(startRect.x + (point.x - startX), 0, natW - startRect.w);
    const y = clamp(startRect.y + (point.y - startY), 0, natH - startRect.h);
    return { x, y, w: startRect.w, h: startRect.h };
  }

  // 边手柄：单轴自由缩放（仅自由比例下显示，不涉及锁比例）。
  if (kind === "n" || kind === "e" || kind === "s" || kind === "w") {
    let left = startRect.x;
    let right = startRect.x + startRect.w;
    let top = startRect.y;
    let bottom = startRect.y + startRect.h;
    if (kind === "w") left = clamp(point.x, 0, right - minCrop);
    if (kind === "e") right = clamp(point.x, left + minCrop, natW);
    if (kind === "n") top = clamp(point.y, 0, bottom - minCrop);
    if (kind === "s") bottom = clamp(point.y, top + minCrop, natH);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  const movesLeft = kind === "nw" || kind === "sw";
  const movesTop = kind === "nw" || kind === "ne";
  const fixedX = movesLeft ? startRect.x + startRect.w : startRect.x;
  const fixedY = movesTop ? startRect.y + startRect.h : startRect.y;

  const maxW = movesLeft ? fixedX : natW - fixedX;
  const maxH = movesTop ? fixedY : natH - fixedY;

  let w = clamp(movesLeft ? fixedX - point.x : point.x - fixedX, minCrop, maxW);
  let h = clamp(movesTop ? fixedY - point.y : point.y - fixedY, minCrop, maxH);

  if (ratio !== null) {
    h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    if (w < minCrop) {
      w = minCrop;
      h = w / ratio;
    }
  }

  const x = movesLeft ? fixedX - w : fixedX;
  const y = movesTop ? fixedY - h : fixedY;
  return { x, y, w, h };
}
