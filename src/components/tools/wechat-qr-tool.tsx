"use client";

import { Download, ImageIcon, Loader2, QrCode, RefreshCw, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clampInt, mediaPrefKeys, readMediaPrefs, writeMediaPrefs } from "./media-preferences";

type UploadedImage = {
  file: File;
  height: number;
  name: string;
  previewUrl: string;
  width: number;
};

type AvatarShape = "circle" | "rounded";
type QrOutputFormat = "png" | "webp" | "jpeg";

const qrOutputFormats: QrOutputFormat[] = ["png", "webp", "jpeg"];
const qrFormatMimes: Record<QrOutputFormat, string> = { png: "image/png", webp: "image/webp", jpeg: "image/jpeg" };
const qrFormatExtensions: Record<QrOutputFormat, string> = { png: "png", webp: "webp", jpeg: "jpg" };
const qrFormatLabels: Record<QrOutputFormat, string> = { png: "PNG", webp: "WebP", jpeg: "JPG" };
const qrFormatQuality = 0.92;

type GeneratedQr = {
  blob: Blob;
  fileName: string;
  formatLabel: string;
  previewUrl: string;
  size: number;
};

type WechatQrCopy = {
  avatar: string;
  avatarHint: string;
  avatarSize: string;
  borderSize: string;
  clear: string;
  download: string;
  format: string;
  dropAvatar: string;
  dropQr: string;
  generate: string;
  generated: string;
  inputHint: string;
  output: string;
  outputPlaceholder: string;
  outputSize: string;
  padding: string;
  qr: string;
  readyHint: string;
  rounded: string;
  scanTip: string;
  selectAvatar: string;
  selectQr: string;
  shape: string;
  tooLarge: (limit: string) => string;
  unsupported: string;
};

const copy: WechatQrCopy = {
    avatar: "个人头像",
    avatarHint: "默认头像约占二维码宽度 20%，更稳妥；如果扫不出来，先调小头像。",
    avatarSize: "头像大小",
    borderSize: "白边",
    clear: "清空",
    download: "下载",
    format: "输出格式",
    dropAvatar: "拖拽头像到这里，或点击选择",
    dropQr: "拖拽微信加好友二维码到这里，或点击选择",
    generate: "生成二维码",
    generated: "已生成，请用微信扫一扫测试一次。",
    inputHint: "支持 JPG、PNG、WebP，单张不超过 20 MB。",
    output: "合成结果",
    outputPlaceholder: "上传微信二维码和头像后，一键生成中间带头像的扫一扫图片。",
    outputSize: "输出尺寸",
    padding: "二维码留白",
    qr: "微信二维码",
    readyHint: "二维码和头像已就绪，可以生成。",
    rounded: "圆角",
    scanTip: "微信二维码识别依赖原图纠错能力，头像过大或遮挡关键区域会降低成功率。",
    selectAvatar: "选择头像",
    selectQr: "选择二维码",
    shape: "头像形状",
    tooLarge: (limit) => `图片不能超过 ${limit}，请换一张更小的图片。`,
    unsupported: "当前浏览器无法读取这张图片，请换一张 JPG、PNG 或 WebP。",
};

const maxImageFileBytes = 20 * 1024 * 1024;

type WechatQrPrefs = {
  avatarSize: number;
  borderSize: number;
  padding: number;
  outputSize: number;
  avatarShape: AvatarShape;
  format: QrOutputFormat;
};

function parseWechatQrPrefs(raw: Record<string, unknown>): WechatQrPrefs {
  return {
    avatarSize: clampInt(raw.avatarSize, 12, 28, 20),
    borderSize: clampInt(raw.borderSize, 1, 8, 3),
    padding: clampInt(raw.padding, 0, 10, 4),
    outputSize: clampInt(raw.outputSize, 512, 1600, 1024),
    avatarShape: raw.avatarShape === "rounded" ? "rounded" : "circle",
    format: qrOutputFormats.includes(raw.format as QrOutputFormat) ? (raw.format as QrOutputFormat) : "png",
  };
}

export function WechatQrTool() {
  const labels = copy;
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const sourceUrlsRef = useRef(new Set<string>());
  const resultUrlRef = useRef<string | null>(null);
  const [qrImage, setQrImage] = useState<UploadedImage | null>(null);
  const [avatarImage, setAvatarImage] = useState<UploadedImage | null>(null);
  const [avatarSize, setAvatarSize] = useState(20);
  const [borderSize, setBorderSize] = useState(3);
  const [padding, setPadding] = useState(4);
  const [outputSize, setOutputSize] = useState(1024);
  const [avatarShape, setAvatarShape] = useState<AvatarShape>("circle");
  const [format, setFormat] = useState<QrOutputFormat>("png");
  const [generatedQr, setGeneratedQr] = useState<GeneratedQr | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(labels.outputPlaceholder);
  const [messageTone, setMessageTone] = useState<"error" | "muted" | "success">("muted");
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  // 挂载后从本地恢复上次配置（延后到 setTimeout，避免 SSR 首屏水合不一致与 effect 内同步 setState）。
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readMediaPrefs(mediaPrefKeys.wechatQr, parseWechatQrPrefs);
      if (stored) {
        setAvatarSize(stored.avatarSize);
        setBorderSize(stored.borderSize);
        setPadding(stored.padding);
        setOutputSize(stored.outputSize);
        setAvatarShape(stored.avatarShape);
        setFormat(stored.format);
      }
      setPrefsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // 配置变更后自动写回本地（仅存配置，不存上传的图片）。
  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    writeMediaPrefs(mediaPrefKeys.wechatQr, { avatarSize, borderSize, padding, outputSize, avatarShape, format } satisfies WechatQrPrefs);
  }, [prefsHydrated, avatarSize, borderSize, padding, outputSize, avatarShape, format]);

  const canGenerate = Boolean(qrImage && avatarImage && !busy);
  const outputSummary = useMemo(() => {
    if (!generatedQr) {
      return "";
    }
    return `${formatBytes(generatedQr.size)} · ${outputSize} x ${outputSize} ${generatedQr.formatLabel}`;
  }, [generatedQr, outputSize]);

  useEffect(() => {
    const sourceUrls = sourceUrlsRef.current;
    return () => {
      clearObjectUrls(sourceUrls);
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
    };
  }, []);

  async function chooseImage(files: FileList | null, target: "avatar" | "qr") {
    const file = files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage(labels.unsupported);
      setMessageTone("error");
      return;
    }
    if (file.size > maxImageFileBytes) {
      setMessage(labels.tooLarge(formatBytes(maxImageFileBytes)));
      setMessageTone("error");
      return;
    }

    try {
      const image = await loadUploadedImage(file);
      sourceUrlsRef.current.add(image.previewUrl);
      if (target === "qr") {
        setQrImage((current) => revokeUploadedImage(current));
      } else {
        setAvatarImage((current) => revokeUploadedImage(current));
      }
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
        resultUrlRef.current = null;
      }
      setGeneratedQr(null);
      if (target === "qr") {
        setQrImage(image);
      } else {
        setAvatarImage(image);
      }
      setMessage(labels.readyHint);
      setMessageTone("success");
    } catch {
      setMessage(labels.unsupported);
      setMessageTone("error");
    }
  }

  async function generateQr() {
    if (!qrImage || !avatarImage) {
      setMessage(labels.outputPlaceholder);
      setMessageTone("muted");
      return;
    }

    setBusy(true);
    setMessage(labels.generate);
    setMessageTone("muted");
    try {
      const blob = await composeWechatQr({
        avatarFile: avatarImage.file,
        avatarShape,
        avatarSizePercent: avatarSize,
        borderPercent: borderSize,
        outputSize,
        paddingPercent: padding,
        qrFile: qrImage.file,
        mime: qrFormatMimes[format],
        quality: format === "png" ? undefined : qrFormatQuality,
      });
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
      const previewUrl = URL.createObjectURL(blob);
      resultUrlRef.current = previewUrl;
      setGeneratedQr({
        blob,
        fileName: buildOutputFileName(qrImage.name, qrFormatExtensions[format]),
        formatLabel: qrFormatLabels[format],
        previewUrl,
        size: blob.size,
      });
      setMessage(labels.generated);
      setMessageTone("success");
    } catch {
      setMessage(labels.unsupported);
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
    link.href = generatedQr.previewUrl;
    link.download = generatedQr.fileName;
    link.click();
  }

  function clearAll() {
    setQrImage((current) => revokeUploadedImage(current));
    setAvatarImage((current) => revokeUploadedImage(current));
    clearObjectUrls(sourceUrlsRef.current);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setGeneratedQr(null);
    setMessage(labels.outputPlaceholder);
    setMessageTone("muted");
    if (qrInputRef.current) qrInputRef.current.value = "";
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
          <div className="grid gap-4 lg:grid-cols-2">
            <ImageDropPanel
              image={qrImage}
              icon={QrCode}
              label={labels.qr}
              hint={labels.dropQr}
              button={labels.selectQr}
              onChoose={() => qrInputRef.current?.click()}
              onDrop={(files) => void chooseImage(files, "qr")}
            />
            <ImageDropPanel
              image={avatarImage}
              icon={ImageIcon}
              label={labels.avatar}
              hint={labels.dropAvatar}
              button={labels.selectAvatar}
              onChoose={() => avatarInputRef.current?.click()}
              onDrop={(files) => void chooseImage(files, "avatar")}
            />
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-muted">{labels.inputHint}</p>
        </section>

        <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
          <div className="grid gap-4">
            <SegmentedShapeControl value={avatarShape} onChange={setAvatarShape} />
            <RangeControl label={labels.avatarSize} value={avatarSize} min={12} max={28} suffix="%" onChange={setAvatarSize} />
            <RangeControl label={labels.borderSize} value={borderSize} min={1} max={8} suffix="%" onChange={setBorderSize} />
            <RangeControl label={labels.padding} value={padding} min={0} max={10} suffix="%" onChange={setPadding} />
            <RangeControl label={labels.outputSize} value={outputSize} min={512} max={1600} step={64} suffix="px" onChange={setOutputSize} />
            <div className="grid gap-1.5 text-xs font-semibold text-muted">
              <span>{labels.format}</span>
              <div className="grid grid-cols-3 rounded-md bg-accent/8 p-1">
                {qrOutputFormats.map((item) => (
                  <button
                    key={item}
                    className={`h-8 rounded text-xs font-semibold transition ${format === item ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
                    type="button"
                    aria-pressed={format === item}
                    onClick={() => setFormat(item)}
                  >
                    {qrFormatLabels[item]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 rounded-md bg-accent/8 px-3 py-2 text-xs font-semibold leading-5 text-muted">{labels.avatarHint}</p>
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">{labels.scanTip}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="admin-btn admin-btn-primary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!canGenerate} onClick={() => void generateQr()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {labels.generate}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!generatedQr || busy} onClick={downloadQr}>
              <Download className="h-3.5 w-3.5" />
              {labels.download}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={busy || (!qrImage && !avatarImage && !generatedQr)} onClick={clearAll}>
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{labels.output}</h3>
          {outputSummary ? <span className="text-xs font-semibold text-muted">{outputSummary}</span> : null}
        </div>
        <div className="mt-4 flex min-h-[22rem] items-center justify-center rounded-md border border-line bg-surface/70 p-4">
          {busy ? (
            <span className="grid justify-items-center gap-2 text-sm font-semibold text-muted">
              <Loader2 className="h-7 w-7 animate-spin text-accent" />
              {labels.generate}
            </span>
          ) : generatedQr ? (
            // eslint-disable-next-line @next/next/no-img-element -- Local generated object URL preview.
            <img src={generatedQr.previewUrl} alt={generatedQr.fileName} className="max-h-[34rem] max-w-full rounded object-contain shadow-sm" />
          ) : (
            <div className="max-w-md text-center text-sm font-semibold leading-6 text-muted">{labels.outputPlaceholder}</div>
          )}
        </div>
        <p className={`mt-4 text-sm font-semibold leading-6 ${messageTone === "error" ? "text-red-700" : messageTone === "success" ? "text-accent" : "text-muted"}`} role={messageTone === "error" ? "alert" : "status"}>{message}</p>
      </section>

      <input ref={qrInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseImage(event.target.files, "qr")} />
      <input ref={avatarInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseImage(event.target.files, "avatar")} />
    </div>
  );
}

function ImageDropPanel({
  button,
  hint,
  icon: Icon,
  image,
  label,
  onChoose,
  onDrop,
}: {
  button: string;
  hint: string;
  icon: typeof QrCode;
  image: UploadedImage | null;
  label: string;
  onChoose: () => void;
  onDrop: (files: FileList | null) => void;
}) {
  return (
    <button
      className="group grid min-h-72 cursor-pointer content-start gap-3 rounded-md border border-dashed border-line bg-surface/70 p-3 text-left transition hover:border-accent/40 hover:bg-accent/6"
      type="button"
      onClick={onChoose}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer.files);
      }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-accent" />
          {label}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent/10 px-2.5 text-xs font-semibold text-accent transition group-hover:bg-accent/16">
          <UploadCloud className="h-3.5 w-3.5" />
          {button}
        </span>
      </span>
      {image ? (
        <>
          <span className="flex h-56 items-center justify-center rounded-md border border-line bg-background/70 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- Local selected object URL preview. */}
            <img src={image.previewUrl} alt={image.name} className="max-h-full max-w-full rounded object-contain" />
          </span>
          <span className="grid gap-1 text-xs font-semibold text-muted">
            <span className="truncate text-foreground">{image.name}</span>
            <span>{image.width} x {image.height} · {formatBytes(image.file.size)}</span>
          </span>
        </>
      ) : (
        <span className="flex h-56 items-center justify-center rounded-md border border-line bg-background/70 p-4 text-center text-sm font-semibold leading-6 text-muted">{hint}</span>
      )}
    </button>
  );
}

function SegmentedShapeControl({ onChange, value }: { onChange: (value: AvatarShape) => void; value: AvatarShape }) {
  const options: Array<{ label: string; value: AvatarShape }> = [
    { label: "圆形", value: "circle" },
    { label: "圆角", value: "rounded" },
  ];

  return (
    <div className="grid gap-1.5 text-xs font-semibold text-muted">
      <span>{copy.shape}</span>
      <div className="grid grid-cols-2 rounded-md bg-accent/8 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            className={`h-8 rounded text-xs font-semibold transition ${value === option.value ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
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

async function loadUploadedImage(file: File): Promise<UploadedImage> {
  const bitmap = await createImageBitmap(file);
  const image = {
    file,
    height: bitmap.height,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
    width: bitmap.width,
  };
  bitmap.close();
  return image;
}

function revokeUploadedImage(image: UploadedImage | null) {
  if (image) {
    URL.revokeObjectURL(image.previewUrl);
  }
  return null;
}

async function composeWechatQr({
  avatarFile,
  avatarShape,
  avatarSizePercent,
  borderPercent,
  outputSize,
  paddingPercent,
  qrFile,
  mime,
  quality,
}: {
  avatarFile: File;
  avatarShape: AvatarShape;
  avatarSizePercent: number;
  borderPercent: number;
  outputSize: number;
  paddingPercent: number;
  qrFile: File;
  mime: string;
  quality: number | undefined;
}) {
  const [qrBitmap, avatarBitmap] = await Promise.all([createImageBitmap(qrFile), createImageBitmap(avatarFile)]);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputSize, outputSize);

    const padding = Math.round(outputSize * (paddingPercent / 100));
    const qrSize = outputSize - padding * 2;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(qrBitmap, padding, padding, qrSize, qrSize);

    const avatarSize = Math.round(outputSize * (avatarSizePercent / 100));
    const borderSize = Math.round(outputSize * (borderPercent / 100));
    const plateSize = avatarSize + borderSize * 2;
    const plateX = Math.round((outputSize - plateSize) / 2);
    const plateY = Math.round((outputSize - plateSize) / 2);
    const radius = avatarShape === "circle" ? plateSize / 2 : Math.round(plateSize * 0.18);

    context.save();
    context.shadowColor = "rgba(20, 17, 10, 0.14)";
    context.shadowBlur = Math.max(6, Math.round(outputSize * 0.012));
    context.shadowOffsetY = Math.max(1, Math.round(outputSize * 0.003));
    context.fillStyle = "#ffffff";
    roundedRectPath(context, plateX, plateY, plateSize, plateSize, radius);
    context.fill();
    context.restore();

    const avatarX = plateX + borderSize;
    const avatarY = plateY + borderSize;
    const avatarRadius = avatarShape === "circle" ? avatarSize / 2 : Math.round(avatarSize * 0.16);
    context.save();
    roundedRectPath(context, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
    context.clip();
    drawImageCover(context, avatarBitmap, avatarX, avatarY, avatarSize, avatarSize);
    context.restore();

    return await canvasToBlob(canvas, mime, quality);
  } finally {
    qrBitmap.close();
    avatarBitmap.close();
  }
}

function drawImageCover(context: CanvasRenderingContext2D, image: ImageBitmap, x: number, y: number, width: number, height: number) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number | undefined) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Image export failed."));
        return;
      }
      resolve(blob);
    }, mime, mime === "image/png" ? undefined : quality);
  });
}

function buildOutputFileName(sourceName: string, extension: string) {
  const baseName = sourceName.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]/g, "-") || "wechat-qr";
  return `${baseName}-avatar.${extension}`;
}

function clearObjectUrls(urls: Set<string>) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
  urls.clear();
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
