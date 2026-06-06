"use client";

import { Check, Copy, Download, FileUp, ImageIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { downloadBlob, formatBytes } from "./image-source";

type Mode = "encode" | "decode";

type EncodeResult = {
  dataUrl: string;
  base64: string;
  mime: string;
  name: string;
  byteSize: number;
  width?: number;
  height?: number;
  svgText?: string;
};

// 按头部 magic bytes 识别真实图片类型；裸 Base64 没有 data: 前缀声明类型时用它，避免一律当 PNG。
function sniffImageMime(base64: string): string | null {
  try {
    const head = atob(base64.slice(0, 32));
    const byte = (index: number) => head.charCodeAt(index);
    if (byte(0) === 0x89 && byte(1) === 0x50 && byte(2) === 0x4e && byte(3) === 0x47) return "image/png";
    if (byte(0) === 0xff && byte(1) === 0xd8 && byte(2) === 0xff) return "image/jpeg";
    if (head.startsWith("GIF8")) return "image/gif";
    if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return "image/webp";
    if (byte(0) === 0x42 && byte(1) === 0x4d) return "image/bmp";
    return null;
  } catch {
    return null;
  }
}

function base64ToUtf8(base64: string) {
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
}

// SVG 用 URL 编码的 Data URI 比 Base64 更小、更可读，内联进 CSS 更友好（只编码必要字符，引号转单引号）。
function svgToUrlDataUri(svg: string) {
  const encoded = svg
    .trim()
    .replace(/\s+/g, " ")
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/{/g, "%7B")
    .replace(/}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
  return `data:image/svg+xml,${encoded}`;
}

const copy = {
  modeTitle: "转换方向",
  encodeTab: "图片 → Base64",
  decodeTab: "Base64 → 图片",
  dropHint: "点击选择、拖拽或粘贴图片",
  decodePlaceholder: "粘贴 data:image/...;base64,... 或纯 Base64 文本",
  decode: "解析预览",
  clear: "清空",
  copy: "复制",
  copied: "已复制",
  copyAs: "复制为",
  download: "下载图片",
  tooLarge: "图片超过 10MB，转 Base64 会生成超大字符串并拖慢页面，请换更小的图。",
  largeHint: "图片较大：Data URI 会比原文件膨胀约 33%，不适合内联进 CSS / HTML。",
  decodeError: "无法识别为图片，请检查 Base64 内容是否完整。",
  snippetDataUri: "Data URI",
  snippetBase64: "纯 Base64",
  snippetCss: "CSS background",
  snippetHtml: "HTML <img>",
  snippetMarkdown: "Markdown",
  snippetSvg: "SVG Data URI",
};

const largeThresholdBytes = 1024 * 1024;
const maxEncodeBytes = 10 * 1024 * 1024;

export function ImageBase64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [encoded, setEncoded] = useState<EncodeResult | null>(null);
  const [encodeError, setEncodeError] = useState("");
  const [decodeInput, setDecodeInput] = useState("");
  const [decodedUrl, setDecodedUrl] = useState("");
  const [decodeError, setDecodeError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setEncoded(null);
    setEncodeError("");
    setDecodeInput("");
    setDecodedUrl("");
    setDecodeError("");
    setCopiedKey("");
  }

  const readImageFile = useCallback((file: File | undefined | null) => {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setEncoded(null);
      setEncodeError("请选择图片文件。");
      return;
    }
    if (file.size > maxEncodeBytes) {
      setEncoded(null);
      setEncodeError(copy.tooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : "";
      let svgText: string | undefined;
      if (file.type === "image/svg+xml") {
        try {
          svgText = base64ToUtf8(base64);
        } catch {
          svgText = undefined;
        }
      }
      setEncodeError("");
      setEncoded({ dataUrl, base64, mime: file.type, name: file.name, byteSize: file.size, svgText });
    };
    reader.onerror = () => {
      setEncoded(null);
      setEncodeError("文件读取失败，请重试。");
    };
    reader.readAsDataURL(file);
  }, []);

  // 文档级粘贴兜底：encode 模式下，只要不是粘进输入框 / 文本域，剪贴板里有图片就直接转。
  useEffect(() => {
    function onDocPaste(event: ClipboardEvent) {
      if (mode !== "encode") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
        return;
      }
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        readImageFile(file);
      }
    }
    document.addEventListener("paste", onDocPaste);
    return () => document.removeEventListener("paste", onDocPaste);
  }, [mode, readImageFile]);

  function normalizeDecodeInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed.startsWith("data:")) {
      return trimmed;
    }
    const cleaned = trimmed.replace(/\s+/g, "");
    const mime = sniffImageMime(cleaned) ?? "image/png";
    return `data:${mime};base64,${cleaned}`;
  }

  function decode() {
    const normalized = normalizeDecodeInput(decodeInput);
    if (!normalized) {
      setDecodedUrl("");
      setDecodeError("");
      return;
    }
    setDecodedUrl(normalized);
    setDecodeError("");
  }

  async function downloadDecoded() {
    if (!decodedUrl) {
      return;
    }
    try {
      const response = await fetch(decodedUrl);
      const blob = await response.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      downloadBlob(blob, `base64-image.${ext}`);
    } catch {
      setDecodeError(copy.decodeError);
    }
  }

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? "" : current)), 1600);
    } catch {
      setCopiedKey("");
    }
  }

  // 仅 Data URI / 纯 Base64 常驻 textarea；CSS / HTML / Markdown 改为点击时即时拼接复制，
  // 避免大图时把完整 Data URL 在 DOM 里重复好几份拖慢渲染。
  const textSnippets = encoded
    ? [
        { key: "dataUri", label: copy.snippetDataUri, value: encoded.dataUrl },
        { key: "base64", label: copy.snippetBase64, value: encoded.base64 },
      ]
    : [];
  const copySnippets = encoded
    ? [
        { key: "css", label: copy.snippetCss, build: () => `background-image: url("${encoded.dataUrl}");` },
        { key: "html", label: copy.snippetHtml, build: () => `<img src="${encoded.dataUrl}" alt="" />` },
        { key: "markdown", label: copy.snippetMarkdown, build: () => `![](${encoded.dataUrl})` },
        ...(encoded.svgText ? [{ key: "svg", label: copy.snippetSvg, build: () => svgToUrlDataUri(encoded.svgText ?? "") }] : []),
      ]
    : [];

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-4">
          <h3 className="text-sm font-semibold text-foreground">{copy.modeTitle}</h3>
          <div className="grid grid-cols-2 rounded-md bg-accent/8 p-1">
            {([["encode", copy.encodeTab], ["decode", copy.decodeTab]] as const).map(([value, label]) => (
              <button
                key={value}
                className={`h-8 cursor-pointer rounded px-3 text-xs font-semibold transition ${mode === value ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "encode" ? (
          <div className="mt-4 grid gap-4">
            <button
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface/60 px-4 py-6 text-sm font-semibold text-muted transition hover:border-accent/45 hover:text-accent"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                readImageFile(event.dataTransfer.files[0]);
              }}
            >
              <FileUp className="h-7 w-7" />
              {copy.dropHint}
            </button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(event) => {
                readImageFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            {encodeError ? <p className="text-sm font-semibold text-red-700" role="alert">{encodeError}</p> : null}

            {encoded ? (
              <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
                <div className="grid gap-2">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-line bg-surface/70 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 本地 Data URL 预览，无需 next/image。 */}
                    <img
                      src={encoded.dataUrl}
                      alt={encoded.name}
                      className="max-h-full max-w-full object-contain"
                      onLoad={(event) => {
                        const { naturalWidth, naturalHeight } = event.currentTarget;
                        setEncoded((current) =>
                          current && current.width === undefined
                            ? { ...current, width: naturalWidth, height: naturalHeight }
                            : current,
                        );
                      }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-muted">
                    {encoded.mime.replace("image/", "").toUpperCase()}
                    {encoded.width ? ` · ${encoded.width}×${encoded.height}` : ""} · 原图 {formatBytes(encoded.byteSize)} · Base64 {formatBytes(encoded.base64.length)}
                  </p>
                  <button className="admin-btn admin-btn-secondary inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold" type="button" onClick={reset}>
                    <X className="h-3.5 w-3.5" />
                    {copy.clear}
                  </button>
                </div>
                <div className="grid gap-2.5">
                  {encoded.byteSize > largeThresholdBytes ? (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">{copy.largeHint}</p>
                  ) : null}
                  {textSnippets.map((snippet) => (
                    <div key={snippet.key} className="grid gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted">{snippet.label}</span>
                        <button
                          className="admin-btn admin-btn-secondary inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold"
                          type="button"
                          onClick={() => void copyValue(snippet.key, snippet.value)}
                        >
                          {copiedKey === snippet.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === snippet.key ? copy.copied : copy.copy}
                        </button>
                      </div>
                      <textarea
                        className="h-16 w-full resize-none rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-xs leading-5 text-foreground outline-none focus:border-accent"
                        value={snippet.value}
                        readOnly
                        spellCheck={false}
                        aria-label={snippet.label}
                      />
                    </div>
                  ))}
                  <div className="grid gap-1.5">
                    <span className="text-xs font-semibold text-muted">{copy.copyAs}</span>
                    <div className="flex flex-wrap gap-2">
                      {copySnippets.map((snippet) => (
                        <button
                          key={snippet.key}
                          className="admin-btn admin-btn-secondary inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                          type="button"
                          onClick={() => void copyValue(snippet.key, snippet.build())}
                        >
                          {copiedKey === snippet.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {snippet.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <textarea
              className="h-40 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs leading-5 text-foreground outline-none focus:border-accent"
              value={decodeInput}
              onChange={(event) => setDecodeInput(event.target.value)}
              placeholder={copy.decodePlaceholder}
              spellCheck={false}
              aria-label={copy.decodePlaceholder}
            />
            <div className="flex flex-wrap gap-2">
              <button className="admin-btn admin-btn-primary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!decodeInput.trim()} onClick={decode}>
                <ImageIcon className="h-3.5 w-3.5" />
                {copy.decode}
              </button>
              <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!decodedUrl} onClick={() => void downloadDecoded()}>
                <Download className="h-3.5 w-3.5" />
                {copy.download}
              </button>
              <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!decodeInput && !decodedUrl} onClick={reset}>
                <X className="h-3.5 w-3.5" />
                {copy.clear}
              </button>
            </div>
            {decodeError ? <p className="text-sm font-semibold text-red-700" role="alert">{decodeError}</p> : null}
            {decodedUrl ? (
              <div className="flex max-h-96 items-center justify-center overflow-hidden rounded-md border border-line bg-surface/70 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- 本地 Data URL 预览，无需 next/image。 */}
                <img src={decodedUrl} alt="Base64 预览" className="max-h-full max-w-full object-contain" onError={() => setDecodeError(copy.decodeError)} />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
