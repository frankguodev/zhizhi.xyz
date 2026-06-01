"use client";

import { Download, ImageIcon, Loader2, Maximize2, RefreshCw, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ToolLocale as Locale } from "./tool-types";

type ImageOutputFormat = "jpeg" | "png" | "webp";

type SourceImage = {
  file: File;
  height: number;
  id: string;
  name: string;
  previewUrl: string;
  width: number;
};

type ProcessedImage = {
  blob: Blob;
  execution: "main" | "worker";
  fileName: string;
  format: ImageOutputFormat;
  height: number;
  maxHeight: number | null;
  maxWidth: number | null;
  method: "canvas" | "wasm";
  previewUrl: string;
  quality: number;
  size: number;
  sourceId: string;
  width: number;
};

type ImageToolCopy = {
  clear: string;
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
  localOnly: string;
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
  select: string;
  selectedImages: (count: number) => string;
  source: string;
  stale: string;
  target: string;
  targetSize: string;
  title: string;
  tooLarge: (limit: string) => string;
  transparentWarning: string;
  unsupported: string;
  wasm: string;
  workerFallback: string;
};

const copy: Record<Locale, ImageToolCopy> = {
  zh: {
    clear: "清空",
    convert: "开始处理",
    convertAll: "全部处理",
    done: "已完成",
    download: "下载图片",
    downloadAll: "打包下载",
    downloadZipReady: "ZIP 已生成，开始下载。",
    drop: "拖拽图片到这里，或点击选择文件",
    dropActive: "松开后读取这张图片",
    fallback: "WASM 不可用时会自动回退到浏览器原生导出。",
    format: "输出格式",
    input: "原图",
    limitHint: (limit) => `支持 JPG、PNG、WebP，单张不超过 ${limit}。`,
    localOnly: "图片只在当前浏览器本地处理，不会上传服务器。",
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
    select: "选择图片",
    selectedImages: (count) => `已选择 ${count} 张图片`,
    source: "原始大小",
    stale: "参数已更改，当前结果不是最新设置，请重新处理。",
    target: "输出大小",
    targetSize: "预计尺寸",
    title: "图片压缩 / 转换",
    tooLarge: (limit) => `图片不能超过 ${limit}，请先选择更小的图片。`,
    transparentWarning: "转 JPG 会铺白透明背景；需要保留透明背景请选择 PNG 或 WebP。",
    unsupported: "当前浏览器无法读取这张图片，请换一张 JPG、PNG 或 WebP。",
    wasm: "优先使用 jSquash / Squoosh WASM 编码器。",
    workerFallback: "Worker 不可用，已自动回退到主线程处理。",
  },
  en: {
    clear: "Clear",
    convert: "Process image",
    convertAll: "Process all",
    done: "Done",
    download: "Download image",
    downloadAll: "Download ZIP",
    downloadZipReady: "ZIP created. Download started.",
    drop: "Drop an image here, or click to choose a file",
    dropActive: "Release to load this image",
    fallback: "Falls back to native browser export if a WASM encoder is unavailable.",
    format: "Output format",
    input: "Original",
    limitHint: (limit) => `Supports JPG, PNG, and WebP up to ${limit}.`,
    localOnly: "Images are processed locally in this browser and are never uploaded.",
    maxHeight: "Max height",
    maxWidth: "Max width",
    noImage: "Choose a JPG, PNG, or WebP image to start.",
    originalSize: "Original size",
    output: "Result",
    outputPlaceholder: "The processed preview, size, dimensions, and encoder will appear here.",
    processedCount: (count, total) => `Processed ${count} / ${total}`,
    processing: "Processing image...",
    processingBatch: (current, total) => `Processing image ${current} / ${total}...`,
    quality: "Quality",
    ratio: "Savings",
    ready: "Image processed.",
    select: "Choose image",
    selectedImages: (count) => `${count} image${count === 1 ? "" : "s"} selected`,
    source: "Original size",
    stale: "Settings changed. Process again to update this result.",
    target: "Output size",
    targetSize: "Estimated size",
    title: "Image compression / conversion",
    tooLarge: (limit) => `Images must be ${limit} or smaller. Choose a smaller file first.`,
    transparentWarning: "JPEG uses a white background for transparency. Choose PNG or WebP to preserve alpha.",
    unsupported: "This image cannot be read by the current browser. Try a JPG, PNG, or WebP file.",
    wasm: "Uses jSquash / Squoosh WASM encoders first.",
    workerFallback: "Worker unavailable. Fell back to main-thread processing.",
  },
};

const formatLabels: Record<ImageOutputFormat, string> = {
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
};

const formatMimeTypes: Record<ImageOutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const formatExtensions: Record<ImageOutputFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const maxImageFileBytes = 30 * 1024 * 1024;

type ImageProcessOptions = {
  format: ImageOutputFormat;
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

export function ImageTool({ locale }: { locale: Locale }) {
  const labels = copy[locale];
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
  const [maxWidth, setMaxWidth] = useState("1600");
  const [maxHeight, setMaxHeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState(labels.noImage);
  const [messageTone, setMessageTone] = useState<"error" | "muted" | "success">("muted");

  const parsedMaxWidth = parseDimension(maxWidth);
  const parsedMaxHeight = parseDimension(maxHeight);
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
        || processedImage.quality !== quality
        || processedImage.maxWidth !== parsedMaxWidth
        || processedImage.maxHeight !== parsedMaxHeight),
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
    const newPreviewUrls = new Set<string>();
    try {
      const loadedImages: SourceImage[] = [];
      let skippedCount = 0;
      let tooLargeCount = 0;
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          skippedCount += 1;
          continue;
        }
        if (file.size > maxImageFileBytes) {
          skippedCount += 1;
          tooLargeCount += 1;
          continue;
        }
        try {
          const bitmap = await createImageBitmap(file);
          const previewUrl = URL.createObjectURL(file);
          newPreviewUrls.add(previewUrl);
          loadedImages.push({
            file,
            height: bitmap.height,
            id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
            name: file.name,
            previewUrl,
            width: bitmap.width,
          });
          bitmap.close();
        } catch {
          skippedCount += 1;
        }
      }

      if (loadedImages.length === 0) {
        setMessage(tooLargeCount > 0 ? labels.tooLarge(formatBytes(maxImageFileBytes)) : labels.unsupported);
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
      setMessage(`${labels.selectedImages(loadedImages.length)}${skippedCount > 0 ? ` · ${labels.tooLarge(formatBytes(maxImageFileBytes))}` : ""}`);
      setMessageTone(skippedCount > 0 ? "error" : "muted");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      clearObjectUrls(newPreviewUrls);
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
        maxHeight: parsedMaxHeight,
        maxWidth: parsedMaxWidth,
        quality,
      };
      const { fallbackMessage, processed } = await processSourceImage(sourceImage, options);
      storeProcessedImage(processed);
      setMessage(`${labels.ready} ${processed.method === "wasm" ? labels.wasm : labels.fallback}${fallbackMessage}`);
      setMessageTone("success");
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
      maxHeight: parsedMaxHeight,
      maxWidth: parsedMaxWidth,
      quality,
    };

    try {
      let lastFallbackMessage = "";
      for (const [index, image] of sourceImages.entries()) {
        setActiveSourceId(image.id);
        setMessage(labels.processingBatch(index + 1, sourceImages.length));
        const { fallbackMessage, processed } = await processSourceImage(image, options);
        lastFallbackMessage = fallbackMessage;
        storeProcessedImage(processed);
      }
      setMessage(`${labels.processedCount(sourceImages.length, sourceImages.length)} ${lastFallbackMessage || labels.ready}`);
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

  function restoreOriginalSize() {
    setMaxWidth("");
    setMaxHeight("");
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
        maxHeight: options.maxHeight,
        maxWidth: options.maxWidth,
        method: result.method,
        previewUrl,
        quality: options.quality,
        size: blob.size,
        sourceId: image.id,
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
      const previewUrl = URL.createObjectURL(zipBlob);
      try {
        downloadBlobUrl(previewUrl, `images-${formatDateForFileName(new Date())}.zip`);
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(previewUrl), 1000);
      }
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
              <p className="mt-1 text-xs font-semibold leading-5 text-muted">{labels.localOnly}</p>
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
                  <button
                    key={image.id}
                    className={`flex min-w-0 items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-xs font-semibold transition ${active ? "bg-accent/10 text-foreground" : "text-muted hover:bg-surface"}`}
                    type="button"
                    disabled={busy}
                    onClick={() => setActiveSourceId(image.id)}
                  >
                    <span className="min-w-0 truncate">{image.name}</span>
                    <span className={itemProcessed ? "text-accent" : "text-muted"}>{itemProcessed ? labels.done : `${image.width} x ${image.height}`}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-md border border-line bg-paper/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">{labels.output}</h3>
          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
              {labels.format}
              <select className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70" value={format} disabled={busy} onChange={(event) => setFormat(event.target.value as ImageOutputFormat)}>
                {(["webp", "jpeg", "png"] as const).map((item) => (
                  <option key={item} value={item}>{formatLabels[item]}</option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
              {labels.maxWidth}
              <input className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70" inputMode="numeric" value={maxWidth} disabled={busy} onChange={(event) => setMaxWidth(cleanDimensionInput(event.target.value))} placeholder="1600" />
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
              {labels.maxHeight}
              <input className="h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70" inputMode="numeric" value={maxHeight} disabled={busy} onChange={(event) => setMaxHeight(cleanDimensionInput(event.target.value))} placeholder={locale === "en" ? "Auto" : "自动"} />
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
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
              <span>{labels.quality}</span>
              <span>{quality}</span>
            </div>
            <input className="mt-2 w-full accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60" type="range" min="35" max="95" step="1" value={quality} disabled={format === "png" || busy} onChange={(event) => setQuality(Number(event.target.value))} />
            <p className="mt-2 text-xs font-semibold leading-5 text-muted">{format === "jpeg" ? labels.transparentWarning : labels.fallback}</p>
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
                <Stat label={labels.format} value={`${formatLabels[processedImage.format]} · ${processedImage.method === "wasm" ? "WASM" : "Canvas"} · ${processedImage.execution === "worker" ? "Worker" : "Main"}`} />
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
  const encoded = await encodeImage(rendered.imageData, options.format, options.quality);
  return {
    buffer: encoded.buffer,
    execution: "main",
    height: rendered.height,
    method: encoded.method,
    width: rendered.width,
  };
}

async function renderImageData(file: File, options: { format: ImageOutputFormat; maxHeight: number | null; maxWidth: number | null }) {
  const bitmap = await createImageBitmap(file);
  try {
    const size = fitWithin(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
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

async function encodeImage(imageData: ImageData, format: ImageOutputFormat, quality: number): Promise<{ buffer: ArrayBuffer; method: "canvas" | "wasm" }> {
  try {
    if (format === "jpeg") {
      const { encode } = await import("@jsquash/jpeg");
      return {
        buffer: await encode(imageData, {
          optimize_coding: true,
          progressive: true,
          quality,
        }),
        method: "wasm",
      };
    }
    if (format === "webp") {
      const { encode } = await import("@jsquash/webp");
      return {
        buffer: await encode(imageData, {
          alpha_quality: 100,
          method: 4,
          quality,
        }),
        method: "wasm",
      };
    }
    const { encode } = await import("@jsquash/png");
    return {
      buffer: await encode(imageData),
      method: "wasm",
    };
  } catch {
    return {
      buffer: await encodeWithCanvas(imageData, format, quality),
      method: "canvas",
    };
  }
}

function encodeWithCanvas(imageData: ImageData, format: ImageOutputFormat, quality: number) {
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
      format === "png" ? undefined : quality / 100,
    );
  });
}

function fitWithin(width: number, height: number, maxWidth: number | null, maxHeight: number | null) {
  const widthRatio = maxWidth && maxWidth > 0 ? maxWidth / width : 1;
  const heightRatio = maxHeight && maxHeight > 0 ? maxHeight / height : 1;
  const scale = Math.min(1, widthRatio, heightRatio);
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

function parseDimension(value: string) {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function cleanDimensionInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 5);
}

function clearObjectUrls(urls: Set<string>) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
  urls.clear();
}

function downloadProcessedImage(image: ProcessedImage) {
  downloadBlobUrl(image.previewUrl, image.fileName);
}

function downloadBlobUrl(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}

async function createZipBlob(files: Array<{ data: Uint8Array; name: string }>) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let offset = 0;

  for (const [index, file] of files.entries()) {
    const fileNameBytes = encoder.encode(uniqueZipFileName(file.name, index));
    const crc = crc32(file.data);
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.data.byteLength, true);
    localView.setUint32(22, file.data.byteLength, true);
    localView.setUint16(26, fileNameBytes.length, true);
    localHeader.set(fileNameBytes, 30);
    parts.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.data.byteLength, true);
    centralView.setUint32(24, file.data.byteLength, true);
    centralView.setUint16(28, fileNameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(fileNameBytes, 46);
    centralDirectoryParts.push(centralHeader);
    offset += localHeader.byteLength + file.data.byteLength;
  }

  const centralDirectorySize = centralDirectoryParts.reduce((sum, item) => sum + item.byteLength, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, offset, true);

  return new Blob([concatUint8Arrays([...parts, ...centralDirectoryParts, endRecord])], { type: "application/zip" });
}

function uniqueZipFileName(fileName: string, index: number) {
  const normalized = fileName.replace(/[\\/:*?"<>|]/g, "-") || `image-${index + 1}`;
  if (index === 0) {
    return normalized;
  }
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${normalized}-${index + 1}`;
  }
  return `${normalized.slice(0, dotIndex)}-${index + 1}${normalized.slice(dotIndex)}`;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function formatDateForFileName(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}${month}${day}-${hour}${minute}`;
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatSignedBytes(bytes: number) {
  const prefix = bytes >= 0 ? "-" : "+";
  return `${prefix}${formatBytes(Math.abs(bytes))}`;
}
