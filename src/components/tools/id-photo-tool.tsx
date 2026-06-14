"use client";

import { Download, FileUp, Loader2, Minus, Plus, RefreshCw, X } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { clearObjectUrls, downloadBlob, loadSourceImages, stripExtension, type SourceImage } from "./image-source";
import { prepareSegmenter, segmentPortrait, type PortraitResult } from "./id-photo-engine";
import { mediaPrefKeys, readMediaPrefs, writeMediaPrefs } from "./media-preferences";

// 抠图工作分辨率上限：证件照输出最大不过 ~580px，1600px 足够细节又省时省内存。
const workingMaxEdge = 1600;
const maxBytes = 30 * 1024 * 1024;
const maxPixels = 60 * 1_000_000;

const scaleMin = 0.1;
const scaleMax = 8;
const zoomStep = 1.12;
// 自动取景目标（证件照排版）：头部（头顶→肩线）占画面高度 headFillRatio，头顶留白 headTopMargin，
// 头部水平居中。肩部及以下自然铺到底边，不留白。
const headFillRatio = 0.68;
const headTopMargin = 0.1;

type OutputFormat = "jpeg" | "png";
type Status = "idle" | "loading-model" | "segmenting" | "ready";
type Transform = { scale: number; offX: number; offY: number };

// 证件照标准尺寸（按 300DPI 像素）。
const idSizes = [
  { key: "1in", label: "一寸", mm: "25×35mm", w: 295, h: 413 },
  { key: "2in", label: "二寸", mm: "35×49mm", w: 413, h: 579 },
  { key: "small1in", label: "小一寸", mm: "22×32mm", w: 260, h: 378 },
  { key: "small2in", label: "小二寸", mm: "35×45mm", w: 413, h: 531 },
  { key: "big1in", label: "大一寸", mm: "33×48mm", w: 390, h: 567 },
] as const;
type SizeKey = (typeof idSizes)[number]["key"];

// 标准证件照底色：白、证件蓝、证件红。
const bgPresets = [
  { key: "white", label: "白底", color: "#FFFFFF" },
  { key: "blue", label: "蓝底", color: "#438EDB" },
  { key: "red", label: "红底", color: "#D9001B" },
] as const;
type BgKey = (typeof bgPresets)[number]["key"] | "custom";

const formatLabels: Record<OutputFormat, string> = { jpeg: "JPG", png: "PNG" };
const outputFormats: OutputFormat[] = ["jpeg", "png"];

const copy = {
  dropHint: "点击选择、拖拽或粘贴人像照片",
  dropNote: "建议使用正面、光线均匀、背景简单的免冠照",
  loadingModel: "首次使用正在加载抠图引擎（约 11MB），请稍候…",
  segmenting: "正在本地抠图…",
  size: "证件尺寸",
  bg: "背景颜色",
  custom: "自定义",
  format: "输出格式",
  download: "下载证件照",
  replace: "换一张",
  clear: "清空",
  reset: "重新取景",
  zoomOut: "缩小",
  zoomIn: "放大",
  drag: "拖动可调整位置，滚轮缩放",
  privacy: "图片仅在本地处理，不会上传。",
  edgeNote: "边缘为浏览器本地 AI 抠图，发丝等细节可能略有瑕疵。",
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sizeByKey(key: SizeKey) {
  return idSizes.find((item) => item.key === key) ?? idSizes[0];
}

// 自动取景（证件照排版）：按头部（头顶→肩线）高度占 headFillRatio、头顶留白 headTopMargin、头部水平居中。
// 这样头部约占 ⅔、肩部及以下自然铺到底边，不会像「整人居中」那样底部留一大块白。
// 返回与预览/导出共用的归一化变换（scale 为人像宽 / 证件框宽，offX/offY 以证件框宽为单位）。
function framingFor(portrait: PortraitResult, size: { w: number; h: number }): Transform {
  const head = portrait.head;
  if (!head) {
    return { scale: 1, offX: 0, offY: 0 };
  }
  const headHeight = Math.max(1, head.bottomY - head.topY + 1);
  const factor = (size.h * headFillRatio) / headHeight;
  return {
    scale: (factor * portrait.width) / size.w,
    offX: (size.w / 2 - head.centerX * factor) / size.w,
    offY: (size.h * headTopMargin - head.topY * factor) / size.w,
  };
}

type IdPhotoPrefs = { sizeKey: SizeKey; bgKey: BgKey; customColor: string; format: OutputFormat };

function parsePrefs(raw: Record<string, unknown>): IdPhotoPrefs {
  const sizeKey = idSizes.some((item) => item.key === raw.sizeKey) ? (raw.sizeKey as SizeKey) : "1in";
  const bgKey = raw.bgKey === "custom" || bgPresets.some((item) => item.key === raw.bgKey) ? (raw.bgKey as BgKey) : "white";
  const customColor = typeof raw.customColor === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.customColor) ? raw.customColor : "#4f7cff";
  const format = outputFormats.includes(raw.format as OutputFormat) ? (raw.format as OutputFormat) : "jpeg";
  return { sizeKey, bgKey, customColor, format };
}

export function IdPhotoTool() {
  const [original, setOriginal] = useState<SourceImage | null>(null);
  const [portrait, setPortrait] = useState<PortraitResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const [sizeKey, setSizeKey] = useState<SizeKey>("1in");
  const [bgKey, setBgKey] = useState<BgKey>("white");
  const [customColor, setCustomColor] = useState("#4f7cff");
  const [format, setFormat] = useState<OutputFormat>("jpeg");

  const [transform, setTransform] = useState<Transform>({ scale: 1, offX: 0, offY: 0 });
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);
  // 给滚轮/缩放回调读取最新变换与尺寸（在 effect 里同步，避免渲染期写 ref），防止闭包拿到旧值。
  const transformRef = useRef(transform);
  const sizeRef = useRef(sizeByKey(sizeKey));

  const size = sizeByKey(sizeKey);
  const bgColor = bgKey === "custom" ? customColor : (bgPresets.find((item) => item.key === bgKey)?.color ?? "#FFFFFF");
  const busy = status === "loading-model" || status === "segmenting";

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    sizeRef.current = sizeByKey(sizeKey);
  }, [sizeKey]);

  // 偏好：挂载时恢复，变更时写回。
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readMediaPrefs(mediaPrefKeys.idPhoto, parsePrefs);
      if (stored) {
        setSizeKey(stored.sizeKey);
        setBgKey(stored.bgKey);
        setCustomColor(stored.customColor);
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
    writeMediaPrefs(mediaPrefKeys.idPhoto, { sizeKey, bgKey, customColor, format } satisfies IdPhotoPrefs);
  }, [prefsHydrated, sizeKey, bgKey, customColor, format]);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      clearObjectUrls(urls);
    };
  }, []);

  // 量取舞台尺寸，用来把证件框按比例放进可视区。
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    // ResizeObserver 在 observe 时会立即回调一次，初始尺寸由它给出，无需在 effect 体里同步 setState。
    const observer = new ResizeObserver(() => setStageSize({ w: stage.clientWidth, h: stage.clientHeight }));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [portrait]);

  const loadFile = useCallback(async (file: File | undefined | null) => {
    if (!file) {
      return;
    }
    setError("");
    const result = await loadSourceImages([file], { maxBytes, maxPixels });
    if (result.images.length === 0) {
      setError(result.tooLarge > 0 ? "图片体积过大。" : result.tooManyPixels > 0 ? "图片像素过多。" : "请选择 JPG / PNG / WebP 图片。");
      return;
    }
    const image = result.images[0];
    clearObjectUrls(objectUrlsRef.current);
    for (const url of result.previewUrls) {
      objectUrlsRef.current.add(url);
    }
    setOriginal(image);
    setPortrait(null);

    setStatus("loading-model");
    try {
      await prepareSegmenter();
    } catch {
      setError("抠图引擎加载失败，请检查网络或更换为较新的 Chrome / Edge / Safari 后重试。");
      setStatus("idle");
      setOriginal(null);
      return;
    }

    setStatus("segmenting");
    try {
      const bitmap = await createImageBitmap(image.file, { imageOrientation: "from-image" });
      const result = await segmentPortrait(bitmap, workingMaxEdge);
      bitmap.close();
      if (!result.bbox) {
        setError("没有检测到人物，请使用清晰的正面人像照片。");
        setStatus("idle");
        setOriginal(null);
        return;
      }
      setPortrait(result);
      // sizeRef 在 effect 里同步，loadFile 用它读到当前尺寸，避免把 sizeKey 放进 useCallback 依赖。
      setTransform(framingFor(result, sizeRef.current));
      setStatus("ready");
    } catch {
      setError("抠图失败，请换一张更清晰的正面人像照片重试。");
      setStatus("idle");
      setOriginal(null);
    }
  }, []);

  // 换证件尺寸：重新自动取景（不同尺寸的头部位置目标不同），并记录所选尺寸。
  function changeSize(key: SizeKey) {
    setSizeKey(key);
    if (portrait) {
      setTransform(framingFor(portrait, sizeByKey(key)));
    }
  }

  // 缩放：以证件框中心为锚点，保持中心处的人物点不动。
  const zoomTo = useCallback((nextScale: number) => {
    const { scale, offX, offY } = transformRef.current;
    const clamped = clamp(nextScale, scaleMin, scaleMax);
    if (clamped === scale) {
      return;
    }
    const ratio = clamped / scale;
    const current = sizeRef.current;
    const centerY = current.h / current.w / 2;
    setTransform({
      scale: clamped,
      offX: 0.5 - (0.5 - offX) * ratio,
      offY: centerY - (centerY - offY) * ratio,
    });
  }, []);

  // 计算证件框在屏幕上的显示尺寸（按比例放进舞台）。
  const aspect = size.w / size.h;
  let frameWidth = 0;
  let frameHeight = 0;
  if (stageSize && stageSize.w > 0 && stageSize.h > 0) {
    frameWidth = stageSize.w;
    frameHeight = frameWidth / aspect;
    if (frameHeight > stageSize.h) {
      frameHeight = stageSize.h;
      frameWidth = frameHeight * aspect;
    }
  }

  // 重绘预览画布：填底色 + 按归一化变换画人像（与导出同一套公式，所见即所得）。
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !portrait || frameWidth <= 0) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(frameWidth * dpr));
    canvas.height = Math.max(1, Math.round(frameHeight * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, frameWidth, frameHeight);
    const drawW = frameWidth * transform.scale;
    const drawH = drawW * (portrait.height / portrait.width);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(portrait.canvas, frameWidth * transform.offX, frameWidth * transform.offY, drawW, drawH);
  }, [portrait, transform, bgColor, frameWidth, frameHeight]);

  // 滚轮缩放：非被动监听以拦截页面滚动。
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !portrait) {
      return;
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomTo(transformRef.current.scale * (event.deltaY < 0 ? zoomStep : 1 / zoomStep));
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [portrait, zoomTo]);

  // 文档级粘贴换图（焦点不在输入框时）。
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

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!portrait) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, offX: transform.offX, offY: transform.offY };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const fw = frameWidth || 1;
    setTransform((current) => ({
      ...current,
      offX: drag.offX + (event.clientX - drag.startX) / fw,
      offY: drag.offY + (event.clientY - drag.startY) / fw,
    }));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function resetFraming() {
    if (portrait) {
      setTransform(framingFor(portrait, size));
    }
  }

  async function download() {
    if (!portrait || !original) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size.w, size.h);
    const drawW = size.w * transform.scale;
    const drawH = drawW * (portrait.height / portrait.width);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(portrait.canvas, size.w * transform.offX, size.w * transform.offY, drawW, drawH);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format === "png" ? "image/png" : "image/jpeg", 0.95),
    );
    if (blob) {
      downloadBlob(blob, `${stripExtension(original.name)}-证件照-${size.label}.${format === "png" ? "png" : "jpg"}`);
    }
  }

  function clear() {
    clearObjectUrls(objectUrlsRef.current);
    setOriginal(null);
    setPortrait(null);
    setStatus("idle");
    setError("");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section
        className="flex min-h-[28rem] flex-col rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]"
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
            <span className="text-xs font-medium text-muted/80">{copy.dropNote}</span>
          </button>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              {portrait && frameWidth > 0 ? (
                <div className="relative" style={{ width: frameWidth, height: frameHeight }}>
                  <canvas
                    ref={canvasRef}
                    className="block touch-none rounded-sm shadow-[var(--shadow-quiet)]"
                    style={{ width: frameWidth, height: frameHeight, cursor: "grab" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  />
                  {/* 取景参考线：头顶留白线与肩线大致位置，帮助摆正人像。 */}
                  <div className="pointer-events-none absolute inset-0">
                    <span className="absolute left-0 right-0 border-t border-dashed border-white/45" style={{ top: `${headTopMargin * 100}%` }} />
                    <span className="absolute left-0 right-0 border-t border-dashed border-white/30" style={{ top: `${(headTopMargin + headFillRatio) * 100}%` }} />
                  </div>
                </div>
              ) : null}

              {busy ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/70 text-sm font-semibold text-muted backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {status === "loading-model" ? copy.loadingModel : copy.segmenting}
                </div>
              ) : null}
            </div>

            {portrait ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted">
                  {size.label} · {size.w} × {size.h}px · {copy.drag}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-muted transition hover:text-accent"
                    type="button"
                    aria-label={copy.zoomOut}
                    onClick={() => zoomTo(transform.scale / zoomStep)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-line bg-surface px-2 text-xs font-semibold text-muted transition hover:text-accent"
                    type="button"
                    onClick={resetFraming}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {copy.reset}
                  </button>
                  <button
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-muted transition hover:text-accent"
                    type="button"
                    aria-label={copy.zoomIn}
                    onClick={() => zoomTo(transform.scale * zoomStep)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
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
          <span>{copy.size}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {idSizes.map((item) => (
              <button
                key={item.key}
                className={`flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md text-xs font-semibold transition disabled:cursor-not-allowed ${sizeKey === item.key ? "bg-accent/16 text-accent shadow-[var(--shadow-quiet)]" : "bg-accent/8 text-muted hover:text-accent"}`}
                type="button"
                aria-pressed={sizeKey === item.key}
                onClick={() => changeSize(item.key)}
              >
                <span>{item.label}</span>
                <span className="text-[10px] font-medium text-muted/70">{item.mm}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5 text-xs font-semibold text-muted">
          <span>{copy.bg}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {bgPresets.map((item) => (
              <button
                key={item.key}
                className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition ${bgKey === item.key ? "border-accent/45 bg-accent/16 text-accent" : "border-line bg-surface text-muted hover:text-accent"}`}
                type="button"
                aria-pressed={bgKey === item.key}
                onClick={() => setBgKey(item.key)}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ backgroundColor: item.color }} />
                {item.label}
              </button>
            ))}
          </div>
          <label
            className={`mt-0.5 inline-flex h-9 cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 text-xs font-semibold transition ${bgKey === "custom" ? "border-accent/45 bg-accent/16 text-accent" : "border-line bg-surface text-muted hover:text-accent"}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ backgroundColor: customColor }} />
              {copy.custom}
            </span>
            <input
              className="h-6 w-9 cursor-pointer rounded border border-line bg-transparent p-0"
              type="color"
              value={customColor}
              onChange={(event) => {
                setCustomColor(event.target.value);
                setBgKey("custom");
              }}
            />
          </label>
        </div>

        <div className="grid gap-1.5 text-xs font-semibold text-muted">
          <span>{copy.format}</span>
          <div className="grid grid-cols-2 rounded-md bg-accent/8 p-1">
            {outputFormats.map((item) => (
              <button
                key={item}
                className={`h-8 cursor-pointer rounded text-xs font-semibold transition ${format === item ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
                type="button"
                aria-pressed={format === item}
                onClick={() => setFormat(item)}
              >
                {formatLabels[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <button
            className="admin-btn admin-btn-primary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold"
            type="button"
            disabled={!portrait || busy}
            onClick={() => void download()}
          >
            <Download className="h-3.5 w-3.5" />
            {copy.download}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold"
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-3.5 w-3.5" />
              {copy.replace}
            </button>
            <button
              className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold"
              type="button"
              disabled={!original}
              onClick={clear}
            >
              <X className="h-3.5 w-3.5" />
              {copy.clear}
            </button>
          </div>
          <p className="text-xs font-medium leading-5 text-muted">{copy.privacy}</p>
          <p className="text-xs font-medium leading-5 text-muted/80">{copy.edgeNote}</p>
        </div>
      </section>
    </div>
  );
}
