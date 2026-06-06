"use client";

import { Download, ImageIcon, Loader2, Maximize2, RefreshCw, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { encodeImage, fitWithin, formatMimeTypes, type ImageOutputFormat } from "./image-codec";
import {
  clearObjectUrls,
  createZipBlob,
  downloadBlob,
  downloadBlobUrl,
  formatBytes,
  formatDateForFileName,
  formatMegapixels,
  loadSourceImages,
  stripExtension,
  type SourceImage,
} from "./image-source";
import { clampInt, mediaPrefKeys, readMediaPrefs, writeMediaPrefs } from "./media-preferences";

type ProcessedImage = {
  blob: Blob;
  execution: "main" | "worker";
  fileName: string;
  format: ImageOutputFormat;
  height: number;
  lossless: boolean;
  maxHeight: number | null;
  maxWidth: number | null;
  method: "canvas" | "wasm";
  previewUrl: string;
  quality: number;
  size: number;
  sourceId: string;
  targetBytes: number | null;
  width: number;
};

type ImageToolCopy = {
  avifHint: string;
  byQuality: string;
  byTarget: string;
  clear: string;
  compressBy: string;
  convert: string;
  convertAll: string;
  done: string;
  download: string;
  downloadAll: string;
  downloadZipReady: string;
  drop: string;
  dropActive: string;
  fallback: string;
  format: string;
  input: string;
  limitHint: (limit: string) => string;
  lossless: string;
  losslessHint: string;
  maxHeight: string;
  maxWidth: string;
  noImage: string;
  originalSize: string;
  output: string;
  outputPlaceholder: string;
  processedCount: (count: number, total: number) => string;
  processing: string;
  processingBatch: (current: number, total: number) => string;
  quality: string;
  ratio: string;
  ready: string;
  removeImage: string;
  select: string;
  selectedImages: (count: number) => string;
  source: string;
  stale: string;
  target: string;
  targetBatch: (met: number, total: number) => string;
  targetMet: (size: string) => string;
  targetMissed: (size: string) => string;
  targetSize: string;
  targetSizeKb: string;
  title: string;
  tooLarge: (limit: string) => string;
  tooManyPixels: (limit: string) => string;
  transparentWarning: string;
  unsupported: string;
  wasm: string;
  workerFallback: string;
};

const copy: ImageToolCopy = {
    avifHint: "AVIF 体积更小，但编码较慢，且仅 Safari 16+ 等较新浏览器支持。",
    byQuality: "按质量",
    byTarget: "按目标体积",
    clear: "清空",
    compressBy: "压缩方式",
    convert: "开始处理",
    convertAll: "全部处理",
    done: "已完成",
    download: "下载图片",
    downloadAll: "打包下载",
    downloadZipReady: "ZIP 已生成，开始下载。",
    drop: "把图片拖到这里，或点击上传（支持多张）",
    dropActive: "松开后读取这张图片",
    fallback: "WASM 不可用时会自动回退到浏览器原生导出。",
    format: "输出格式",
    input: "原图",
    limitHint: (limit) => `支持 JPG、PNG、WebP，可一次导入多张批量处理，单张不超过 ${limit}。`,
    lossless: "WebP 无损（图标 / 线框图更合适）",
    losslessHint: "无损模式忽略质量与目标体积设置。",
    maxHeight: "最大高度",
    maxWidth: "最大宽度",
    noImage: "选择一张 JPG、PNG 或 WebP 图片后开始处理。",
    originalSize: "原尺寸",
    output: "处理结果",
    outputPlaceholder: "处理后会在这里预览，并显示体积、尺寸和编码方式。",
    processedCount: (count, total) => `已处理 ${count} / ${total} 张`,
    processing: "正在处理图片...",
    processingBatch: (current, total) => `正在处理第 ${current} / ${total} 张图片...`,
    quality: "质量",
    ratio: "压缩率",
    ready: "图片已处理完成。",
    removeImage: "移除这张图片",
    select: "选择图片",
    selectedImages: (count) => `已选择 ${count} 张图片`,
    source: "原始大小",
    stale: "参数已更改，当前结果不是最新设置，请重新处理。",
    target: "输出大小",
    targetBatch: (met, total) => `${met} / ${total} 张达到目标体积`,
    targetMet: (size) => `已压到 ${size}，满足目标体积。`,
    targetMissed: (size) => `已尽力压到 ${size}，仍超过目标，建议调小最大宽度或放宽目标体积。`,
    targetSize: "预计尺寸",
    targetSizeKb: "目标体积 (KB)",
    title: "图片压缩 / 转换",
    tooLarge: (limit) => `图片不能超过 ${limit}，请先选择更小的图片。`,
    tooManyPixels: (limit) => `图片像素过多（超过 ${limit}），请先缩小尺寸再处理。`,
    transparentWarning: "转 JPG 会铺白透明背景；需要保留透明背景请选择 PNG 或 WebP。",
    unsupported: "当前浏览器无法读取这张图片，请换一张 JPG、PNG 或 WebP。",
    wasm: "优先使用 jSquash / Squoosh WASM 编码器。",
    workerFallback: "Worker 不可用，已自动回退到主线程处理。",
};

const formatLabels: Record<ImageOutputFormat, string> = {
  avif: "AVIF",
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
};

const formatExtensions: Record<ImageOutputFormat, string> = {
  avif: "avif",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const imageOutputFormats: ImageOutputFormat[] = ["avif", "jpeg", "png", "webp"];

type ImagePrefs = {
  format: ImageOutputFormat;
  quality: number;
  compressMode: "quality" | "target";
  targetKb: string;
  webpLossless: boolean;
  maxWidth: string;
  maxHeight: string;
};

function parseImagePrefs(raw: Record<string, unknown>): ImagePrefs {
  return {
    format: imageOutputFormats.includes(raw.format as ImageOutputFormat) ? (raw.format as ImageOutputFormat) : "webp",
    quality: clampInt(raw.quality, 35, 95, 78),
    compressMode: raw.compressMode === "target" ? "target" : "quality",
    targetKb: typeof raw.targetKb === "string" ? raw.targetKb : "100",
    webpLossless: typeof raw.webpLossless === "boolean" ? raw.webpLossless : false,
    maxWidth: typeof raw.maxWidth === "string" ? raw.maxWidth : "1600",
    maxHeight: typeof raw.maxHeight === "string" ? raw.maxHeight : "",
  };
}

const maxImageFileBytes = 30 * 1024 * 1024;
const maxImagePixels = 40 * 1000 * 1000;
const minTargetQuality = 35;
const maxTargetQuality = 95;
const maxTargetAttempts = 6;

type ImageProcessOptions = {
  format: ImageOutputFormat;
  lossless: boolean;
  maxHeight: number | null;
  maxWidth: number | null;
  quality: number;
};

type ImageProcessResult = {
  buffer: ArrayBuffer;
  execution: "main" | "worker";
  height: number;
  method: "canvas" | "wasm";
  width: number;
};

type PendingWorkerRequest = {
  reject: (error: Error) => void;
  resolve: (result: ImageProcessResult) => void;
};

export function ImageTool() {
  const labels = copy;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageWorkerRef = useRef<Worker | null>(null);
  const pendingWorkerRequestsRef = useRef(new Map<number, PendingWorkerRequest>());
  const processedPreviewUrlsRef = useRef(new Set<string>());
  const sourcePreviewUrlsRef = useRef(new Set<string>());
  const workerRequestIdRef = useRef(0);
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [format, setFormat] = useState<ImageOutputFormat>("webp");
  const [quality, setQuality] = useState(78);
  const [compressMode, setCompressMode] = useState<"quality" | "target">("quality");
  const [targetKb, setTargetKb] = useState("100");
  const [webpLossless, setWebpLossless] = useState(false);
  const [maxWidth, setMaxWidth] = useState("1600");
  const [maxHeight, setMaxHeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState(labels.noImage);
  const [messageTone, setMessageTone] = useState<"error" | "muted" | "success">("muted");
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  // 挂载后从本地恢复上次配置（延后到 setTimeout，避免 SSR 首屏水合不一致与 effect 内同步 setState）。
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readMediaPrefs(mediaPrefKeys.image, parseImagePrefs);
      if (stored) {
        setFormat(stored.format);
        setQuality(stored.quality);
        setCompressMode(stored.compressMode);
        setTargetKb(stored.targetKb);
        setWebpLossless(stored.webpLossless);
        setMaxWidth(stored.maxWidth);
        setMaxHeight(stored.maxHeight);
      }
      setPrefsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // 配置变更后自动写回本地（仅存配置，不存图片）。
  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    writeMediaPrefs(mediaPrefKeys.image, { format, quality, compressMode, targetKb, webpLossless, maxWidth, maxHeight } satisfies ImagePrefs);
  }, [prefsHydrated, format, quality, compressMode, targetKb, webpLossless, maxWidth, maxHeight]);

  const parsedMaxWidth = parseDimension(maxWidth);
  const parsedMaxHeight = parseDimension(maxHeight);
  const parsedTargetBytes = parseTargetBytes(targetKb);
  const losslessActive = format === "webp" && webpLossless;
  const targetModeActive = compressMode === "target" && format !== "png" && parsedTargetBytes !== null && !losslessActive;
  const sourceImage = sourceImages.find((item) => item.id === activeSourceId) ?? sourceImages[0] ?? null;
  const processedImage = sourceImage ? (processedImages.find((item) => item.sourceId === sourceImage.id) ?? null) : null;
  const processedCount = sourceImages.filter((item) => processedImages.some((processed) => processed.sourceId === item.id)).length;

  useEffect(() => {
    const processedPreviewUrls = processedPreviewUrlsRef.current;
    const pendingWorkerRequests = pendingWorkerRequestsRef.current;
    const sourcePreviewUrls = sourcePreviewUrlsRef.current;
    return () => {
      for (const previewUrl of sourcePreviewUrls) URL.revokeObjectURL(previewUrl);
      for (const previewUrl of processedPreviewUrls) URL.revokeObjectURL(previewUrl);
      imageWorkerRef.current?.terminate();
      for (const pending of pendingWorkerRequests.values()) {
        pending.reject(new Error("Image worker closed."));
      }
      pendingWorkerRequests.clear();
    };
  }, []);

  const stats = useMemo(() => {
    if (!sourceImage || !processedImage) {
      return null;
    }
    const saved = sourceImage.file.size - processedImage.size;
    const ratio = sourceImage.file.size > 0 ? Math.round((saved / sourceImage.file.size) * 100) : 0;
    return {
      ratio,
      saved,
    };
  }, [processedImage, sourceImage]);

  const targetDimensions = useMemo(() => {
    if (!sourceImage) {
      return null;
    }
    return fitWithin(sourceImage.width, sourceImage.height, parsedMaxWidth, parsedMaxHeight);
  }, [parsedMaxHeight, parsedMaxWidth, sourceImage]);

  const isResultStale = Boolean(
    processedImage
      && (processedImage.format !== format
        || processedImage.maxWidth !== parsedMaxWidth
        || processedImage.maxHeight !== parsedMaxHeight
        || processedImage.lossless !== losslessActive
        || (losslessActive
          ? false
          : targetModeActive
            ? processedImage.targetBytes !== parsedTargetBytes
            : processedImage.targetBytes !== null || processedImage.quality !== quality)),
  );

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
      clearObjectUrls(processedPreviewUrlsRef.current);
      for (const previewUrl of newPreviewUrls) {
        sourcePreviewUrlsRef.current.add(previewUrl);
      }
      setSourceImages(loadedImages);
      setActiveSourceId(loadedImages[0].id);
      setProcessedImages([]);
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

  async function processImage() {
    if (!sourceImage || busy) {
      return;
    }

    setBusy(true);
    setMessage(labels.wasm);
    setMessageTone("muted");

    try {
      const options = {
        format,
        lossless: losslessActive,
        maxHeight: parsedMaxHeight,
        maxWidth: parsedMaxWidth,
        quality,
      };
      const { fallbackMessage, met, processed } = await produceProcessed(sourceImage, options);
      storeProcessedImage(processed);
      if (targetModeActive) {
        setMessage(met ? labels.targetMet(formatBytes(processed.size)) : labels.targetMissed(formatBytes(processed.size)));
        setMessageTone(met ? "success" : "error");
      } else {
        setMessage(`${labels.ready} ${processed.method === "wasm" ? labels.wasm : labels.fallback}${fallbackMessage}`);
        setMessageTone("success");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.unsupported);
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  async function processAllImages() {
    if (sourceImages.length === 0 || busy) {
      return;
    }

    setBusy(true);
    setMessageTone("muted");
    const options = {
      format,
      lossless: losslessActive,
      maxHeight: parsedMaxHeight,
      maxWidth: parsedMaxWidth,
      quality,
    };

    try {
      let lastFallbackMessage = "";
      let metCount = 0;
      for (const [index, image] of sourceImages.entries()) {
        setActiveSourceId(image.id);
        setMessage(labels.processingBatch(index + 1, sourceImages.length));
        const { fallbackMessage, met, processed } = await produceProcessed(image, options);
        lastFallbackMessage = fallbackMessage;
        if (met) {
          metCount += 1;
        }
        storeProcessedImage(processed);
      }
      setMessage(
        targetModeActive
          ? `${labels.processedCount(sourceImages.length, sourceImages.length)} · ${labels.targetBatch(metCount, sourceImages.length)}`
          : `${labels.processedCount(sourceImages.length, sourceImages.length)} ${lastFallbackMessage || labels.ready}`,
      );
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.unsupported);
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  function clearImage() {
    clearObjectUrls(sourcePreviewUrlsRef.current);
    clearObjectUrls(processedPreviewUrlsRef.current);
    setSourceImages([]);
    setActiveSourceId(null);
    setProcessedImages([]);
    setMessage(labels.noImage);
    setMessageTone("muted");
  }

  function removeSourceImage(id: string) {
    const target = sourceImages.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      sourcePreviewUrlsRef.current.delete(target.previewUrl);
    }
    const processed = processedImages.find((item) => item.sourceId === id);
    if (processed) {
      URL.revokeObjectURL(processed.previewUrl);
      processedPreviewUrlsRef.current.delete(processed.previewUrl);
    }

    const remaining = sourceImages.filter((item) => item.id !== id);
    setSourceImages(remaining);
    setProcessedImages((current) => current.filter((item) => item.sourceId !== id));
    if (activeSourceId === id) {
      setActiveSourceId(remaining[0]?.id ?? null);
    }
    setMessage(remaining.length === 0 ? labels.noImage : labels.selectedImages(remaining.length));
    setMessageTone("muted");
  }

  function restoreOriginalSize() {
    setMaxWidth("");
    setMaxHeight("");
  }

  async function produceProcessed(image: SourceImage, options: ImageProcessOptions) {
    if (targetModeActive && parsedTargetBytes) {
      const result = await processToTargetSize(image, options, parsedTargetBytes);
      result.processed.targetBytes = parsedTargetBytes;
      return result;
    }
    const { fallbackMessage, processed } = await processSourceImage(image, options);
    return { fallbackMessage, met: true, processed };
  }

  async function processToTargetSize(image: SourceImage, baseOptions: ImageProcessOptions, targetBytes: number) {
    let lo = minTargetQuality;
    let hi = maxTargetQuality;
    const attempts: Array<{ fallbackMessage: string; processed: ProcessedImage }> = [];
    for (let i = 0; i < maxTargetAttempts && lo <= hi; i += 1) {
      const mid = Math.round((lo + hi) / 2);
      const attempt = await processSourceImage(image, { ...baseOptions, quality: mid });
      attempts.push(attempt);
      if (attempt.processed.size <= targetBytes) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    const meeting = attempts.filter((item) => item.processed.size <= targetBytes);
    const winner = meeting.length > 0
      ? meeting.reduce((best, item) => (item.processed.size > best.processed.size ? item : best))
      : attempts.reduce((best, item) => (item.processed.size < best.processed.size ? item : best));
    for (const item of attempts) {
      if (item !== winner) {
        URL.revokeObjectURL(item.processed.previewUrl);
      }
    }
    return { fallbackMessage: winner.fallbackMessage, met: winner.processed.size <= targetBytes, processed: winner.processed };
  }

  async function processSourceImage(image: SourceImage, options: ImageProcessOptions) {
    let result: ImageProcessResult;
    let fallbackMessage = "";
    try {
      result = await processImageInWorker(image.file, options);
    } catch {
      result = await processImageInMainThread(image.file, options);
      fallbackMessage = ` ${labels.workerFallback}`;
    }
    const blob = new Blob([result.buffer], { type: formatMimeTypes[options.format] });
    const previewUrl = URL.createObjectURL(blob);
    const fileName = `${stripExtension(image.name)}.${formatExtensions[options.format]}`;

    return {
      fallbackMessage,
      processed: {
        blob,
        execution: result.execution,
        fileName,
        format: options.format,
        height: result.height,
        lossless: options.lossless,
        maxHeight: options.maxHeight,
        maxWidth: options.maxWidth,
        method: result.method,
        previewUrl,
        quality: options.quality,
        size: blob.size,
        sourceId: image.id,
        targetBytes: null,
        width: result.width,
      } satisfies ProcessedImage,
    };
  }

  function storeProcessedImage(processed: ProcessedImage) {
    setProcessedImages((current) => {
      const existing = current.find((item) => item.sourceId === processed.sourceId);
      if (existing) {
        URL.revokeObjectURL(existing.previewUrl);
        processedPreviewUrlsRef.current.delete(existing.previewUrl);
      }
      processedPreviewUrlsRef.current.add(processed.previewUrl);
      return [...current.filter((item) => item.sourceId !== processed.sourceId), processed];
    });
  }

  function getImageWorker() {
    if (imageWorkerRef.current) {
      return imageWorkerRef.current;
    }
    const worker = new Worker(new URL("./image-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer; error?: string; height?: number; id: number; method?: "canvas" | "wasm"; ok: boolean; width?: number }>) => {
      const pending = pendingWorkerRequestsRef.current.get(event.data.id);
      if (!pending) {
        return;
      }
      pendingWorkerRequestsRef.current.delete(event.data.id);
      if (!event.data.ok || !event.data.buffer || !event.data.method || !event.data.width || !event.data.height) {
        pending.reject(new Error(event.data.error ?? "Image processing failed."));
        return;
      }
      pending.resolve({
        buffer: event.data.buffer,
        execution: "worker",
        height: event.data.height,
        method: event.data.method,
        width: event.data.width,
      });
    };
    worker.onerror = () => {
      for (const pending of pendingWorkerRequestsRef.current.values()) {
        pending.reject(new Error("Image worker failed."));
      }
      pendingWorkerRequestsRef.current.clear();
      worker.terminate();
      imageWorkerRef.current = null;
    };
    imageWorkerRef.current = worker;
    return worker;
  }

  async function processImageInWorker(file: File, options: ImageProcessOptions) {
    const worker = getImageWorker();
    const fileBuffer = await file.arrayBuffer();
    const id = workerRequestIdRef.current + 1;
    workerRequestIdRef.current = id;
    return new Promise<ImageProcessResult>((resolve, reject) => {
      pendingWorkerRequestsRef.current.set(id, { reject, resolve });
      try {
        worker.postMessage(
          {
            fileBuffer,
            fileType: file.type,
            format: options.format,
            id,
            lossless: options.lossless,
            maxHeight: options.maxHeight,
            maxWidth: options.maxWidth,
            quality: options.quality,
          },
          [fileBuffer],
        );
      } catch (error) {
        pendingWorkerRequestsRef.current.delete(id);
        reject(error instanceof Error ? error : new Error("Image worker failed."));
      }
    });
  }

  function downloadImage() {
    if (!processedImage) {
      return;
    }
    downloadProcessedImage(processedImage);
  }

  async function downloadAllImages() {
    const images = sourceImages
      .map((image) => processedImages.find((item) => item.sourceId === image.id))
      .filter((image): image is ProcessedImage => Boolean(image));

    if (images.length === 0 || busy) {
      return;
    }

    setBusy(true);
    setMessageTone("muted");
    try {
      const zipBlob = await createZipBlob(
        await Promise.all(
          images.map(async (image) => ({
            data: new Uint8Array(await image.blob.arrayBuffer()),
            name: image.fileName,
          })),
        ),
      );
      downloadBlob(zipBlob, `images-${formatDateForFileName(new Date())}.zip`);
      setMessage(labels.downloadZipReady);
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.unsupported);
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

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
            className={`mt-4 flex aspect-[16/10] w-full cursor-pointer items-center justify-center rounded-md border border-dashed p-4 text-center transition ${dragActive ? "border-accent bg-accent/12 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)]" : "border-[color-mix(in_srgb,var(--accent)_34%,var(--line))] bg-accent/5 hover:border-accent/60 hover:bg-accent/8"}`}
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
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              if (busy) {
                return;
              }
              void chooseFiles(event.dataTransfer.files);
            }}
            disabled={busy}
          >
            {sourceImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- Local object URL preview.
              <img src={sourceImage.previewUrl} alt={sourceImage.name} className="max-h-full max-w-full rounded object-contain shadow-sm" />
            ) : (
              <span className="grid justify-items-center gap-2 text-sm font-semibold text-muted">
                <ImageIcon className="h-8 w-8 text-accent" />
                {dragActive ? labels.dropActive : labels.drop}
              </span>
            )}
          </button>

          {sourceImage ? (
            <div className="mt-3 grid gap-2 rounded-md bg-surface/80 p-3 text-xs font-semibold text-muted">
              <div className="flex justify-between gap-3">
                <span className="truncate">{sourceImage.name}</span>
                <span>{formatBytes(sourceImage.file.size)}</span>
              </div>
              <div>
                {sourceImage.width} x {sourceImage.height}
              </div>
              {targetDimensions ? (
                <div className="text-accent">
                  {labels.targetSize}: {targetDimensions.width} x {targetDimensions.height}
                </div>
              ) : null}
            </div>
          ) : null}
          {sourceImages.length > 1 ? (
            <div className="mt-3 grid max-h-44 gap-2 overflow-auto rounded-md border border-line bg-paper/70 p-2">
              <div className="px-1 text-xs font-semibold text-muted">
                {labels.selectedImages(sourceImages.length)} · {labels.processedCount(processedCount, sourceImages.length)}
              </div>
              {sourceImages.map((image) => {
                const itemProcessed = processedImages.some((item) => item.sourceId === image.id);
                const active = image.id === sourceImage?.id;
                return (
                  <div
                    key={image.id}
                    className={`flex min-w-0 items-center gap-2 rounded-md p-1 transition ${active ? "bg-accent/10" : "hover:bg-surface"}`}
                  >
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
                        <span className={`text-[0.7rem] font-semibold ${itemProcessed ? "text-accent" : "text-muted"}`}>{itemProcessed ? labels.done : `${image.width} x ${image.height}`}</span>
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
          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
              <span>{labels.format}</span>
              <Select
                ariaLabel={labels.format}
                size="sm"
                disabled={busy}
                value={format}
                onChange={(next) => setFormat(next as ImageOutputFormat)}
                options={(["webp", "avif", "jpeg", "png"] as const).map((item) => ({ value: item, label: formatLabels[item] }))}
              />
            </div>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
              {labels.maxWidth}
              <input className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70" inputMode="numeric" value={maxWidth} disabled={busy} onChange={(event) => setMaxWidth(cleanDimensionInput(event.target.value))} placeholder="1600" />
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
              {labels.maxHeight}
              <input className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70" inputMode="numeric" value={maxHeight} disabled={busy} onChange={(event) => setMaxHeight(cleanDimensionInput(event.target.value))} placeholder="自动" />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted">
            <span>
              {targetDimensions ? `${labels.targetSize}: ${targetDimensions.width} x ${targetDimensions.height}` : labels.outputPlaceholder}
            </span>
            <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-accent transition hover:bg-accent/8 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={busy || (!maxWidth && !maxHeight)} onClick={restoreOriginalSize}>
              <Maximize2 className="h-3.5 w-3.5" />
              {labels.originalSize}
            </button>
          </div>

          <div className="mt-4 rounded-md bg-accent/8 p-3">
            {format === "webp" ? (
              <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                <input type="checkbox" className="accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60" checked={webpLossless} disabled={busy} onChange={(event) => setWebpLossless(event.target.checked)} />
                {labels.lossless}
              </label>
            ) : null}
            {losslessActive ? (
              <p className="mt-2 text-xs font-semibold leading-5 text-muted">{labels.losslessHint}</p>
            ) : (
              <>
                <div className={`flex items-center justify-between gap-3 text-xs font-semibold text-muted${format === "webp" ? " mt-3" : ""}`}>
                  <span>{labels.compressBy}</span>
                  <div className="inline-flex overflow-hidden rounded-md border border-line">
                    {(["quality", "target"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        disabled={busy || format === "png"}
                        onClick={() => setCompressMode(item)}
                        className={`px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${compressMode === item ? "bg-accent text-white" : "bg-surface text-muted hover:bg-accent/8"}`}
                      >
                        {item === "quality" ? labels.byQuality : labels.byTarget}
                      </button>
                    ))}
                  </div>
                </div>
                {compressMode === "target" && format !== "png" ? (
                  <label className="mt-3 grid gap-1.5 text-xs font-semibold text-muted">
                    {labels.targetSizeKb}
                    <input className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70" inputMode="numeric" value={targetKb} disabled={busy} onChange={(event) => setTargetKb(cleanDimensionInput(event.target.value))} placeholder="100" />
                  </label>
                ) : (
                  <>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-muted">
                      <span>{labels.quality}</span>
                      <span>{quality}</span>
                    </div>
                    <input className="mt-2 w-full accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60" type="range" min="35" max="95" step="1" value={quality} disabled={format === "png" || busy} onChange={(event) => setQuality(Number(event.target.value))} />
                  </>
                )}
              </>
            )}
            <p className="mt-2 text-xs font-semibold leading-5 text-muted">{format === "jpeg" ? labels.transparentWarning : format === "avif" ? labels.avifHint : labels.fallback}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="admin-btn admin-btn-primary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!sourceImage || busy} onClick={() => void processImage()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {labels.convert}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={sourceImages.length < 2 || busy} onClick={() => void processAllImages()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {labels.convertAll}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!processedImage || busy} onClick={downloadImage}>
              <Download className="h-3.5 w-3.5" />
              {labels.download}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={processedImages.length < 2 || busy} onClick={downloadAllImages}>
              <Download className="h-3.5 w-3.5" />
              {labels.downloadAll}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={busy || (!sourceImage && !processedImage)} onClick={clearImage}>
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          </div>

          <p className={`mt-4 text-sm font-semibold leading-6 ${messageTone === "error" ? "text-red-700" : messageTone === "success" ? "text-accent" : "text-muted"}`} role={messageTone === "error" ? "alert" : "status"}>{message}</p>
          {isResultStale ? (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800" role="status">{labels.stale}</p>
          ) : null}

          {processedImage || busy ? (
            <div className="mt-4 grid gap-3">
              <div className="flex aspect-[16/10] items-center justify-center rounded-md border border-line bg-surface/80 p-3">
                {busy ? (
                  <span className="grid justify-items-center gap-2 text-sm font-semibold text-muted">
                    <Loader2 className="h-7 w-7 animate-spin text-accent" />
                    {labels.processing}
                  </span>
                ) : processedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Local processed object URL preview.
                  <img src={processedImage.previewUrl} alt={processedImage.fileName} className={`max-h-full max-w-full rounded object-contain shadow-sm ${isResultStale ? "opacity-70" : ""}`} />
                ) : null}
              </div>
              {processedImage ? (
                <div className="grid gap-2 rounded-md bg-surface/80 p-3 text-xs font-semibold text-muted sm:grid-cols-2">
                <Stat label={labels.target} value={`${formatBytes(processedImage.size)} · ${processedImage.width} x ${processedImage.height}`} />
                <Stat label={labels.ratio} value={stats ? `${stats.ratio}% (${formatSignedBytes(stats.saved)})` : "-"} />
                <Stat label={labels.format} value={`${formatLabels[processedImage.format]}${processedImage.lossless ? " · 无损" : ""} · ${processedImage.method === "wasm" ? "WASM" : "Canvas"} · ${processedImage.execution === "worker" ? "Worker" : "Main"}`} />
                <Stat label={labels.download} value={processedImage.fileName} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 flex aspect-[16/10] items-center justify-center rounded-md border border-line bg-surface/60 p-4 text-center text-sm font-semibold leading-6 text-muted">
              {labels.outputPlaceholder}
            </div>
          )}
        </section>
      </div>
      <input ref={fileInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void chooseFiles(event.target.files)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-muted">{label}</div>
      <div className="mt-1 truncate text-foreground">{value}</div>
    </div>
  );
}

async function processImageInMainThread(file: File, options: ImageProcessOptions): Promise<ImageProcessResult> {
  const rendered = await renderImageData(file, options);
  const encoded = await encodeImage(rendered.imageData, options.format, options.quality, options.lossless, encodeWithCanvas);
  return {
    buffer: encoded.buffer,
    execution: "main",
    height: rendered.height,
    method: encoded.method,
    width: rendered.width,
  };
}

async function renderImageData(file: File, options: { format: ImageOutputFormat; maxHeight: number | null; maxWidth: number | null }) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const size = fitWithin(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }
    if (options.format === "jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size.width, size.height);
    }
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return {
      height: size.height,
      imageData: context.getImageData(0, 0, size.width, size.height),
      width: size.width,
    };
  } finally {
    bitmap.close();
  }
}

function encodeWithCanvas(imageData: ImageData, format: ImageOutputFormat, quality: number, lossless: boolean) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Canvas is not available."));
      return;
    }
    context.putImageData(imageData, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Image export failed."));
          return;
        }
        resolve(await blob.arrayBuffer());
      },
      formatMimeTypes[format],
      format === "png" ? undefined : lossless ? 1 : quality / 100,
    );
  });
}

function parseDimension(value: string) {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function cleanDimensionInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 5);
}

function parseTargetBytes(value: string) {
  const kb = Number(value.trim());
  return Number.isFinite(kb) && kb > 0 ? Math.round(kb * 1024) : null;
}

function downloadProcessedImage(image: ProcessedImage) {
  downloadBlobUrl(image.previewUrl, image.fileName);
}

function formatSignedBytes(bytes: number) {
  const prefix = bytes >= 0 ? "-" : "+";
  return `${prefix}${formatBytes(Math.abs(bytes))}`;
}
