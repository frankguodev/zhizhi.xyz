"use client";

import { Check, ChevronDown, Download, Link2, Loader2, QrCode, RefreshCw, X } from "lucide-react";
import QRCode from "qrcode";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/site";

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

type GeneratedLinkQr = {
  dataUrl: string;
  fileName: string;
  normalizedUrl: string;
  size: number;
};

type LinkQrCopy = {
  background: string;
  clear: string;
  copied: string;
  copyLink: string;
  dark: string;
  download: string;
  errorCorrection: string;
  generate: string;
  generated: string;
  inputLabel: string;
  inputPlaceholder: string;
  invalidUrl: string;
  localOnly: string;
  margin: string;
  output: string;
  outputPlaceholder: string;
  quietZoneHint: string;
  size: string;
  customColor: string;
  title: string;
};

const copy: Record<Locale, LinkQrCopy> = {
  zh: {
    background: "背景色",
    clear: "清空",
    copied: "已复制",
    copyLink: "复制链接",
    dark: "二维码颜色",
    download: "下载 PNG",
    errorCorrection: "纠错等级",
    generate: "生成二维码",
    generated: "二维码已生成。",
    inputLabel: "链接地址",
    inputPlaceholder: "https://zhizhi.xyz",
    invalidUrl: "请输入有效链接。没有协议时会自动补全 https://。",
    localOnly: "二维码在当前浏览器本地生成，不会上传服务器。",
    margin: "留白",
    output: "生成结果",
    outputPlaceholder: "输入链接后点击生成，结果会显示在这里。",
    quietZoneHint: "默认保留二维码留白，打印或截图后更容易识别。",
    size: "输出尺寸",
    customColor: "自定义颜色",
    title: "链接二维码生成",
  },
  en: {
    background: "Background",
    clear: "Clear",
    copied: "Copied",
    copyLink: "Copy link",
    dark: "QR color",
    download: "Download PNG",
    errorCorrection: "Error correction",
    generate: "Generate QR",
    generated: "QR code generated.",
    inputLabel: "URL",
    inputPlaceholder: "https://zhizhi.xyz",
    invalidUrl: "Enter a valid URL. Missing protocols are completed with https://.",
    localOnly: "The QR code is generated locally in this browser and is never uploaded.",
    margin: "Margin",
    output: "Result",
    outputPlaceholder: "Enter a URL and generate a QR code preview here.",
    quietZoneHint: "The default margin keeps the QR easier to scan after screenshots or printing.",
    size: "Output size",
    customColor: "Custom color",
    title: "Link QR generator",
  },
};

const errorCorrectionOptions: Array<{ label: string; value: ErrorCorrectionLevel }> = [
  { label: "L", value: "L" },
  { label: "M", value: "M" },
  { label: "Q", value: "Q" },
  { label: "H", value: "H" },
];

const colorSwatches = ["#16251f", "#2f8f6b", "#4f7f6d", "#1f2937", "#ffffff", "#f7f4ec", "#f1f5f2", "#d9eadf"] as const;

export function LinkQrTool({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const [input, setInput] = useState("https://zhizhi.xyz");
  const [size, setSize] = useState(1024);
  const [margin, setMargin] = useState(4);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>("M");
  const [darkColor, setDarkColor] = useState("#16251f");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [generatedQr, setGeneratedQr] = useState<GeneratedLinkQr | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState(labels.outputPlaceholder);
  const [messageTone, setMessageTone] = useState<"error" | "muted" | "success">("muted");

  async function generateQr() {
    const normalizedUrl = normalizeUrlInput(input);
    if (!normalizedUrl) {
      setGeneratedQr(null);
      setMessage(labels.invalidUrl);
      setMessageTone("error");
      return;
    }

    setBusy(true);
    setCopied(false);
    setMessage(labels.generate);
    setMessageTone("muted");
    try {
      const dataUrl = await QRCode.toDataURL(normalizedUrl, {
        color: {
          dark: ensureHexAlpha(darkColor),
          light: ensureHexAlpha(lightColor),
        },
        errorCorrectionLevel: errorCorrection,
        margin,
        scale: 8,
        width: size,
      });
      setGeneratedQr({
        dataUrl,
        fileName: buildOutputFileName(normalizedUrl),
        normalizedUrl,
        size,
      });
      setMessage(labels.generated);
      setMessageTone("success");
    } catch {
      setGeneratedQr(null);
      setMessage(labels.invalidUrl);
      setMessageTone("error");
    } finally {
      setBusy(false);
    }
  }

  function downloadQr() {
    if (!generatedQr) {
      return;
    }
    const link = document.createElement("a");
    link.href = generatedQr.dataUrl;
    link.download = generatedQr.fileName;
    link.click();
  }

  async function copyGeneratedLink() {
    if (!generatedQr) {
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedQr.normalizedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function clearQr() {
    setInput("");
    setGeneratedQr(null);
    setCopied(false);
    setMessage(labels.outputPlaceholder);
    setMessageTone("muted");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="grid gap-4">
          <div className="flex items-start gap-2.5 border-b border-line/80 pb-4">
            <span className="icon-action mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-accent">
              <Link2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-accent">{labels.localOnly}</p>
            </div>
          </div>

          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {labels.inputLabel}
            <input
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={labels.inputPlaceholder}
              inputMode="url"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <RangeControl label={labels.size} value={size} min={384} max={1600} step={64} suffix="px" onChange={setSize} />
            <RangeControl label={labels.margin} value={margin} min={0} max={8} suffix="" onChange={setMargin} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ColorInput customLabel={labels.customColor} label={labels.dark} value={darkColor} onChange={setDarkColor} />
            <ColorInput customLabel={labels.customColor} label={labels.background} value={lightColor} onChange={setLightColor} />
          </div>

          <div className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>{labels.errorCorrection}</span>
            <div className="grid grid-cols-4 rounded-md bg-accent/8 p-1">
              {errorCorrectionOptions.map((option) => (
                <button
                  key={option.value}
                  className={`h-8 rounded text-xs font-semibold transition ${errorCorrection === option.value ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
                  type="button"
                  aria-pressed={errorCorrection === option.value}
                  onClick={() => setErrorCorrection(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="rounded-md bg-accent/8 px-3 py-2 text-xs font-semibold leading-5 text-muted">{labels.quietZoneHint}</p>

          <div className="flex flex-wrap gap-2">
            <button className="admin-btn admin-btn-primary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={busy} onClick={() => void generateQr()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {labels.generate}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!generatedQr || busy} onClick={downloadQr}>
              <Download className="h-3.5 w-3.5" />
              {labels.download}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!generatedQr || busy} onClick={() => void copyGeneratedLink()}>
              <Check className="h-3.5 w-3.5" />
              {copied ? labels.copied : labels.copyLink}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={busy || (!generatedQr && !input)} onClick={clearQr}>
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{labels.output}</h3>
          {generatedQr ? <span className="text-xs font-semibold text-muted">{generatedQr.size} x {generatedQr.size} PNG</span> : null}
        </div>
        <div className="mt-4 flex aspect-square items-center justify-center rounded-md border border-line bg-surface/70 p-4">
          {busy ? (
            <span className="grid justify-items-center gap-2 text-sm font-semibold text-muted">
              <Loader2 className="h-7 w-7 animate-spin text-accent" />
              {labels.generate}
            </span>
          ) : generatedQr ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR code is generated as a local data URL.
            <img src={generatedQr.dataUrl} alt={generatedQr.fileName} className="max-h-full max-w-full rounded object-contain shadow-sm" />
          ) : null}
          {!busy && !generatedQr ? (
            <div className="max-w-xs text-center text-sm font-semibold leading-6 text-muted">
              <QrCode className="mx-auto mb-3 h-10 w-10 text-accent/70" />
              {labels.outputPlaceholder}
            </div>
          ) : null}
        </div>
        {generatedQr ? <p className="mt-3 break-all text-xs font-semibold leading-5 text-muted">{generatedQr.normalizedUrl}</p> : null}
        <p className={`mt-4 text-sm font-semibold leading-6 ${messageTone === "error" ? "text-red-700" : messageTone === "success" ? "text-accent" : "text-muted"}`} role={messageTone === "error" ? "alert" : "status"}>{message}</p>
      </section>
    </div>
  );
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  step = 1,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  suffix: string;
  value: number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="text-foreground">{value}{suffix}</span>
      </span>
      <input className="w-full accent-[var(--accent)]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ColorInput({ customLabel, label, onChange, value }: { customLabel: string; label: string; onChange: (value: string) => void; value: string }) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const saturationRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const validColor = normalizeHexColor(value) ?? "#16251f";
  const hsv = hexToHsv(validColor);
  const hueColor = hsvToHex({ h: hsv.h, s: 100, v: 100 });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (pickerRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function updateSaturationFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const element = saturationRef.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const x = clampNumber((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clampNumber((event.clientY - rect.top) / rect.height, 0, 1);
    onChange(hsvToHex({ h: hsv.h, s: Math.round(x * 100), v: Math.round((1 - y) * 100) }));
  }

  function startSaturationDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSaturationFromPointer(event);
  }

  return (
    <div ref={pickerRef} className="relative grid gap-1.5 text-xs font-semibold text-muted">
      <span>{label}</span>
      <button
        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-2 text-left transition hover:border-accent/40 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/15"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="h-6 w-8 rounded border border-line shadow-sm" style={{ backgroundColor: validColor }} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-accent transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[4.25rem] z-20 grid gap-3 rounded-md border border-line bg-paper p-3 shadow-[var(--shadow-quiet)]">
          <div
            ref={saturationRef}
            className="relative h-36 cursor-crosshair overflow-hidden rounded-md border border-line"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            }}
            onPointerDown={startSaturationDrag}
            onPointerMove={(event) => {
              if (event.buttons === 1) {
                updateSaturationFromPointer(event);
              }
            }}
          >
            <span
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.45)]"
              style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
            />
          </div>
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>Hue</span>
            <input
              className="h-3 w-full cursor-pointer appearance-none rounded-full border border-line"
              type="range"
              min="0"
              max="360"
              value={hsv.h}
              onChange={(event) => onChange(hsvToHex({ h: Number(event.target.value), s: hsv.s, v: hsv.v }))}
              style={{
                background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                accentColor: "var(--accent)",
              }}
            />
          </label>
          <div className="grid grid-cols-4 gap-2">
            {colorSwatches.map((color) => (
              <button
                key={color}
                className={`h-9 cursor-pointer rounded-md border transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${
                  validColor.toLowerCase() === color ? "border-accent shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_18%,transparent)]" : "border-line"
                }`}
                type="button"
                aria-label={color}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {customLabel}
            <input
              className="h-9 rounded-md border border-line bg-surface px-2.5 text-sm font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              value={value}
              onChange={(event) => onChange(cleanHexInput(event.target.value))}
              onBlur={() => onChange(normalizeHexColor(value) ?? validColor)}
              placeholder="#16251f"
              spellCheck={false}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function normalizeUrlInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  const candidate = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function buildOutputFileName(urlText: string) {
  try {
    const url = new URL(urlText);
    const host = url.hostname.replace(/^www\./, "").replace(/[^\w.-]+/g, "-") || "link";
    return `${host}-qr.png`;
  } catch {
    return "link-qr.png";
  }
}

function cleanHexInput(value: string) {
  const cleaned = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(cleaned)) {
    return cleaned;
  }
  if (/^[0-9a-f]{6}$/i.test(cleaned)) {
    return `#${cleaned}`;
  }
  return cleaned.startsWith("#") ? cleaned.slice(0, 7) : `#${cleaned.slice(0, 6)}`;
}

function ensureHexAlpha(value: string) {
  const normalized = normalizeHexColor(value);
  return normalized ? `${normalized}ff` : "#000000ff";
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[0]}${trimmed[0]}${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}`.toLowerCase();
  }
  return null;
}

function hexToHsv(hex: string) {
  const normalized = normalizeHexColor(hex) ?? "#000000";
  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  return {
    h: Math.round(h < 0 ? h + 360 : h),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  };
}

function hsvToHex({ h, s, v }: { h: number; s: number; v: number }) {
  const hue = (((h % 360) + 360) % 360) / 60;
  const saturation = clampNumber(s, 0, 100) / 100;
  const value = clampNumber(v, 0, 100) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const m = value - chroma;
  const [r1, g1, b1] =
    hue < 1 ? [chroma, x, 0] :
    hue < 2 ? [x, chroma, 0] :
    hue < 3 ? [0, chroma, x] :
    hue < 4 ? [0, x, chroma] :
    hue < 5 ? [x, 0, chroma] :
    [chroma, 0, x];
  return `#${[r1, g1, b1].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
