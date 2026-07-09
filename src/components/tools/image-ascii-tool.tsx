"use client";

import { Check, Copy, Download, FileUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { clearObjectUrls, downloadBlob, loadSourceImages, stripExtension, type SourceImage } from "./image-source";

type CharsetKey = "standard" | "detailed" | "blocks" | "minimal";

type AsciiResult = {
  colorRows: Array<Array<[number, number, number] | null>>;
  cols: number;
  levels: number[][];
  lines: string[];
  rows: number;
  text: string;
};

const charsets: Record<CharsetKey, string> = {
  standard: "@#S08Xx+=-;:,. ",
  detailed: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  blocks: "█▓▒░ ",
  minimal: "@+. ",
};

const charsetOptions: Array<{ key: CharsetKey; label: string }> = [
  { key: "standard", label: "标准" },
  { key: "detailed", label: "细节" },
  { key: "blocks", label: "方块" },
  { key: "minimal", label: "极简" },
];

const copy = {
  dropHint: "点击选择、拖拽或粘贴图片",
  detail: "细节列数",
  charset: "字符集",
  invert: "反色",
  color: "彩色",
  copyText: "复制文本",
  copied: "已复制",
  download: "下载 PNG",
  replace: "换一张",
  clear: "清空",
  empty: "上传图片后会在这里生成 ASCII 预览。",
  output: "ASCII 文本",
};

const maxBytes = 30 * 1024 * 1024;
const maxPixels = 60 * 1_000_000;
const fontSize = 7;
const charWidthRatio = 0.58;
const charAspect = 0.44;
const shadowCutoff = 0.12;
const gamma = 1.35;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function percentile(values: number[], percent: number) {
  if (values.length === 0) {
    return 0;
  }
  const index = Math.floor((values.length - 1) * percent);
  return values[index];
}

function imageToAscii(bitmap: ImageBitmap, options: { charset: string; color: boolean; columns: number; invert: boolean }): AsciiResult {
  const cols = Math.max(20, options.columns | 0);
  const rows = Math.max(1, Math.round((cols * bitmap.height * charAspect) / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { colorRows: [], cols, levels: [], lines: [], rows, text: "" };
  }
  ctx.drawImage(bitmap, 0, 0, cols, rows);
  const pixels = ctx.getImageData(0, 0, cols, rows).data;

  const lumas: number[] = [];
  for (let index = 0; index < pixels.length; index += 4) {
    lumas.push(0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2]);
  }
  lumas.sort((left, right) => left - right);

  const black = percentile(lumas, 0.04);
  const white = percentile(lumas, 0.995);
  const range = white - black || 1;
  const lines: string[] = [];
  const colorRows: AsciiResult["colorRows"] = [];
  const levels: number[][] = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    const colorRow: Array<[number, number, number] | null> = [];
    const levelRow: number[] = [];
    for (let x = 0; x < cols; x += 1) {
      const index = (y * cols + x) * 4;
      let level = clamp((0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2] - black) / range, 0, 1);
      if (options.invert) {
        level = 1 - level;
      }
      level = level < shadowCutoff ? 0 : Math.pow((level - shadowCutoff) / (1 - shadowCutoff), gamma);
      line += options.charset[Math.min(options.charset.length - 1, Math.floor((1 - level) * (options.charset.length - 1)))];
      colorRow.push(options.color ? [pixels[index], pixels[index + 1], pixels[index + 2]] : null);
      levelRow.push(level);
    }
    lines.push(line);
    colorRows.push(colorRow);
    levels.push(levelRow);
  }

  return { colorRows, cols, levels, lines, rows, text: lines.join("\n") };
}

function renderAscii(result: AsciiResult, canvas: HTMLCanvasElement, options: { bg: string }) {
  const charWidth = fontSize * charWidthRatio;
  const pad = 20;
  canvas.width = Math.round(result.cols * charWidth + pad * 2);
  canvas.height = Math.round(result.rows * fontSize + pad * 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.fillStyle = options.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(123, 197, 165, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace`;
  ctx.textBaseline = "top";
  for (let y = 0; y < result.rows; y += 1) {
    for (let x = 0; x < result.cols; x += 1) {
      const char = result.lines[y][x];
      if (char === " ") {
        continue;
      }
      const color = result.colorRows[y][x];
      const alpha = clamp(0.14 + result.levels[y][x] * 0.86, 0, 1);
      ctx.fillStyle = color ? `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})` : `rgba(214, 149, 62, ${alpha})`;
      ctx.fillText(char, pad + x * charWidth, pad + y * fontSize);
    }
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
  const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.18, canvas.width / 2, canvas.height / 2, canvas.width * 0.72);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.48)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function copyTextFallback(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return false;
  }
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

export function ImageAsciiTool() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [columns, setColumns] = useState(220);
  const [charsetKey, setCharsetKey] = useState<CharsetKey>("standard");
  const [invert, setInvert] = useState(false);
  const [color, setColor] = useState(false);
  const [result, setResult] = useState<AsciiResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const clear = useCallback(() => {
    clearObjectUrls(objectUrlsRef.current);
    bitmapRef.current?.close();
    bitmapRef.current = null;
    setSource(null);
    setResult(null);
    setError("");
    setCopied(false);
  }, []);

  useEffect(() => clear, [clear]);

  const loadFile = useCallback(async (file: File | undefined | null) => {
    if (!file) {
      return;
    }
    const imageFile = file.type.startsWith("image/") ? file : new File([file], file.name || "pasted-image.png", { type: "image/png" });
    const loaded = await loadSourceImages([imageFile], { maxBytes, maxPixels });
    if (loaded.images.length === 0) {
      setError(loaded.tooLarge > 0 ? "图片体积过大。" : loaded.tooManyPixels > 0 ? "图片像素过多。" : "请选择 JPG / PNG / WebP 图片。");
      return;
    }
    const image = loaded.images[0];
    const bitmap = await createImageBitmap(image.file, { imageOrientation: "from-image" });
    clearObjectUrls(objectUrlsRef.current);
    for (const url of loaded.previewUrls) {
      objectUrlsRef.current.add(url);
    }
    bitmapRef.current?.close();
    bitmapRef.current = bitmap;
    setSource(image);
    setError("");
    setCopied(false);
  }, []);

  useEffect(() => {
    const bitmap = bitmapRef.current;
    const canvas = canvasRef.current;
    if (!bitmap || !canvas) {
      return;
    }
    const nextResult = imageToAscii(bitmap, { charset: charsets[charsetKey], color, columns, invert });
    setResult(nextResult);
    renderAscii(nextResult, canvas, { bg: "#060806" });
  }, [charsetKey, color, columns, invert, source]);

  useEffect(() => {
    function onDocPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
        return;
      }
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/")) ?? event.clipboardData?.files[0];
      if (file) {
        event.preventDefault();
        void loadFile(file);
      }
    }
    document.addEventListener("paste", onDocPaste);
    return () => document.removeEventListener("paste", onDocPaste);
  }, [loadFile]);

  async function copyText() {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.text);
    } catch {
      if (!copyTextFallback(textRef.current)) {
        textRef.current?.focus();
        textRef.current?.select();
        setError("复制被浏览器拦截，已选中文本，请按 Ctrl+C。");
        return;
      }
    }
    setError("");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !source) {
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${stripExtension(source.name)}-ascii.png`);
      }
    }, "image/png");
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)] lg:grid-cols-[minmax(18rem,1fr)_14rem_minmax(18rem,0.9fr)] lg:items-end">
        <div className="grid gap-2 text-xs font-semibold text-muted">
          <div className="flex items-center justify-between gap-2">
            <span>{copy.detail}</span>
            <span>{columns}</span>
          </div>
          <input
            className="cursor-pointer accent-[var(--accent)]"
            type="range"
            min={40}
            max={320}
            step={5}
            value={columns}
            onChange={(event) => setColumns(Number(event.target.value))}
            onInput={(event) => setColumns(Number(event.currentTarget.value))}
          />
        </div>

        <div className="grid gap-1.5 text-xs font-semibold text-muted">
          <span>{copy.charset}</span>
          <Select ariaLabel={copy.charset} options={charsetOptions.map((option) => ({ label: option.label, value: option.key }))} size="sm" value={charsetKey} onChange={(value) => setCharsetKey(value as CharsetKey)} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${invert ? "border-accent/45 bg-accent/16 text-accent" : "border-line bg-surface text-muted hover:text-accent"}`}
            type="button"
            aria-pressed={invert}
            onClick={() => setInvert((current) => !current)}
          >
            {copy.invert}
          </button>
          <button
            className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${color ? "border-accent/45 bg-accent/16 text-accent" : "border-line bg-surface text-muted hover:text-accent"}`}
            type="button"
            aria-pressed={color}
            onClick={() => setColor((current) => !current)}
          >
            {copy.color}
          </button>
          <button className="admin-btn admin-btn-primary inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!result} onClick={() => void copyText()}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? copy.copied : copy.copyText}
          </button>
          <button className="admin-btn admin-btn-secondary inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!result} onClick={downloadPng}>
            <Download className="h-3.5 w-3.5" />
            {copy.download}
          </button>
        </div>
      </section>

      <section
        className="grid gap-4 rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void loadFile(event.dataTransfer.files[0]);
        }}
      >
        {!source ? (
          <button
            className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface/60 px-4 py-6 text-sm font-semibold text-muted transition hover:border-accent/45 hover:text-accent"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-7 w-7" />
            {copy.dropHint}
          </button>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{source.name}</p>
                <p className="text-xs font-semibold text-muted">
                  {source.width} × {source.height}px · {result ? `${result.cols} × ${result.rows} 字符` : "处理中"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="admin-btn admin-btn-secondary inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold" type="button" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="h-3.5 w-3.5" />
                  {copy.replace}
                </button>
                <button className="admin-btn admin-btn-secondary inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold" type="button" onClick={clear}>
                  <X className="h-3.5 w-3.5" />
                  {copy.clear}
                </button>
              </div>
            </div>
            <div className="flex min-h-[clamp(24rem,62dvh,44rem)] items-center justify-center overflow-hidden rounded-md border border-line/80 bg-[#060806] p-3 shadow-[inset_0_0_42px_rgba(0,0,0,0.46)] max-sm:min-h-[24rem]">
              <canvas ref={canvasRef} className="block h-auto w-full" aria-label="ASCII 图片预览" />
            </div>
          </>
        )}

        {error ? <p className="text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
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

      {result ? (
        <details className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">{copy.output}</summary>
          <textarea
            ref={textRef}
            className="mt-3 h-44 w-full resize-y rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-xs leading-4 text-foreground outline-none focus:border-accent"
            value={result.text}
            readOnly
            spellCheck={false}
          />
        </details>
      ) : null}
    </div>
  );
}
