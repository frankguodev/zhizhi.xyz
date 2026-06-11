"use client";

import { Check, Copy, ExternalLink, FileUp, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type DetectedCode = { rawValue: string; format: string };
type CodeAction = { label: string; href: string; external: boolean };

// 解码前把超大图按最长边缩到这个上限：省内存、提速，二维码在该尺度通常仍可识别。
const maxDecodeEdge = 2000;
type ParsedCode = { typeLabel: string; fields: { label: string; value: string }[]; actions: CodeAction[] };

const copy = {
  uploadTitle: "上传图片",
  dropHint: "点击选择、拖拽或粘贴二维码 / 条形码图片",
  decoding: "识别中…",
  empty: "没有识别到二维码或条形码，请换一张更清晰的图片。",
  resultTitle: "识别结果",
  copy: "复制",
  copied: "已复制",
  clear: "清空",
  readFailed: "图片读取失败，请重试。",
};

const formatLabels: Record<string, string> = {
  qr_code: "二维码 (QR)",
  data_matrix: "Data Matrix",
  aztec: "Aztec",
  pdf_417: "PDF417",
  maxicode: "MaxiCode",
  ean_13: "条形码 EAN-13",
  ean_8: "条形码 EAN-8",
  upc_a: "条形码 UPC-A",
  upc_e: "条形码 UPC-E",
  code_128: "条形码 Code 128",
  code_39: "条形码 Code 39",
  code_93: "条形码 Code 93",
  codabar: "条形码 Codabar",
  itf: "条形码 ITF",
};

function formatLabel(format: string) {
  return formatLabels[format] ?? format.toUpperCase();
}

function unescapeWifi(value: string) {
  return value.replace(/\\([\\;,:"])/g, "$1");
}

function unescapeStructuredValue(value: string) {
  return value.replace(/\\([\\;,:])/g, "$1");
}

// 识别常见结构化二维码（网址 / WIFI / 电话 / 邮箱 / 短信 / 地理位置 / 名片），给出可读字段和可点操作。
function parseCode(value: string): ParsedCode {
  const v = value.trim();

  if (/^https?:\/\//i.test(v)) {
    return { typeLabel: "网址", fields: [], actions: [{ label: "打开链接", href: v, external: true }] };
  }
  if (/^wifi:/i.test(v)) {
    const get = (key: string) => {
      const match = v.match(new RegExp(`(?:^|;)${key}:((?:\\\\.|[^;])*)`, "i"));
      return match ? unescapeWifi(match[1]) : "";
    };
    const ssid = get("S");
    const password = get("P");
    const auth = get("T");
    const hidden = /(?:^|;)H:true/i.test(v);
    return {
      typeLabel: "WIFI 配网",
      fields: [
        { label: "网络名 (SSID)", value: ssid },
        { label: "加密方式", value: auth || "无加密" },
        ...(password ? [{ label: "密码", value: password }] : []),
        ...(hidden ? [{ label: "隐藏网络", value: "是" }] : []),
      ],
      actions: [],
    };
  }
  if (/^tel:/i.test(v)) {
    const num = v.slice(4);
    return { typeLabel: "电话", fields: [{ label: "号码", value: num }], actions: [{ label: "拨打", href: `tel:${num}`, external: false }] };
  }
  if (/^mailto:/i.test(v)) {
    return { typeLabel: "邮箱", fields: [{ label: "地址", value: v.slice(7) }], actions: [{ label: "发邮件", href: v, external: false }] };
  }
  if (/^matmsg:/i.test(v)) {
    const bodyText = v.replace(/^matmsg:/i, "");
    const get = (key: string) => {
      const match = bodyText.match(new RegExp(`(?:^|;)${key}:((?:\\\\.|[^;])*)`, "i"));
      return match ? unescapeStructuredValue(match[1]) : "";
    };
    const email = get("TO");
    const subject = get("SUB");
    const body = get("BODY");
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const href = email ? `mailto:${email}${params.toString() ? `?${params.toString()}` : ""}` : "";
    return {
      typeLabel: "邮箱",
      fields: [
        ...(email ? [{ label: "地址", value: email }] : []),
        ...(subject ? [{ label: "主题", value: subject }] : []),
        ...(body ? [{ label: "正文", value: body }] : []),
      ],
      actions: href ? [{ label: "发邮件", href, external: false }] : [],
    };
  }
  if (/^smsto:/i.test(v)) {
    const [, num = "", body = ""] = v.split(":");
    return {
      typeLabel: "短信",
      fields: [{ label: "号码", value: num }, ...(body ? [{ label: "内容", value: body }] : [])],
      actions: [{ label: "发短信", href: `sms:${num}`, external: false }],
    };
  }
  if (/^geo:/i.test(v)) {
    const coords = v.slice(4).split("?")[0];
    return {
      typeLabel: "地理位置",
      fields: [{ label: "坐标", value: coords }],
      actions: [{ label: "在地图打开", href: `https://www.google.com/maps?q=${encodeURIComponent(coords)}`, external: true }],
    };
  }
  if (/^begin:vcard/i.test(v) || /^mecard:/i.test(v)) {
    return parseContact(v);
  }
  return { typeLabel: "文本", fields: [], actions: [] };
}

function parseContact(v: string): ParsedCode {
  let name = "";
  let tel = "";
  let email = "";
  let org = "";
  if (/^mecard:/i.test(v)) {
    const bodyText = v.replace(/^mecard:/i, "");
    const get = (key: string) => {
      const match = bodyText.match(new RegExp(`(?:^|;)${key}:((?:\\\\.|[^;])*)`, "i"));
      return match ? unescapeStructuredValue(match[1]) : "";
    };
    name = get("N");
    tel = get("TEL");
    email = get("EMAIL");
    org = get("ORG");
  } else {
    const line = (key: string) => {
      const match = v.match(new RegExp(`(?:^|\\n)${key}[^:\\n]*:(.*)`, "i"));
      return match ? unescapeStructuredValue(match[1].trim()).replace(/\\n/g, "\n") : "";
    };
    name = line("FN") || line("N");
    tel = line("TEL");
    email = line("EMAIL");
    org = line("ORG");
  }
  return {
    typeLabel: "名片",
    fields: [
      ...(name ? [{ label: "姓名", value: name }] : []),
      ...(tel ? [{ label: "电话", value: tel }] : []),
      ...(email ? [{ label: "邮箱", value: email }] : []),
      ...(org ? [{ label: "组织", value: org }] : []),
    ],
    actions: tel ? [{ label: "拨打", href: `tel:${tel}`, external: false }] : [],
  };
}

export function QrDecodeTool() {
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<DetectedCode | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef("");

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  const decodeFile = useCallback(async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    setBusy(true);
    setResult(null);
    setMessage("");
    setCopied(false);
    const url = URL.createObjectURL(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = url;
    setPreviewUrl(url);

    try {
      // ZXing 跨浏览器一致、解码更强（带 logo 的微信码、条形码、轻微旋转都能处理）；按需懒加载。
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType, NotFoundException }] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);

      // 超大图先按最长边缩小再解码（预览仍用原图）。
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDecodeEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        throw new Error("canvas unavailable");
      }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      try {
        const decoded = reader.decodeFromCanvas(canvas);
        const format = (BarcodeFormat[decoded.getBarcodeFormat()] ?? "unknown").toLowerCase();
        const rawValue = decoded.getText().trim();
        if (rawValue) {
          setResult({ rawValue, format });
        } else {
          setMessage(copy.empty);
        }
      } catch (decodeError) {
        if (decodeError instanceof NotFoundException) {
          setMessage(copy.empty);
        } else {
          throw decodeError;
        }
      }
    } catch {
      setMessage(copy.readFailed);
    } finally {
      setBusy(false);
    }
  }, []);

  // 文档级粘贴：焦点不在输入框/文本域时，剪贴板里有图就识别（和其它工具一致）。
  useEffect(() => {
    function onDocPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
        return;
      }
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void decodeFile(file);
      }
    }
    document.addEventListener("paste", onDocPaste);
    return () => document.removeEventListener("paste", onDocPaste);
  }, [decodeFile]);

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function clear() {
    setResult(null);
    setMessage("");
    setCopied(false);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    setPreviewUrl("");
  }

  const parsed = result ? parseCode(result.rawValue) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section
        className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void decodeFile(event.dataTransfer.files[0]);
        }}
      >
        <div className="flex items-center gap-2 border-b border-line/80 pb-4">
          <h3 className="text-sm font-semibold text-foreground">{copy.uploadTitle}</h3>
        </div>

        <button
          className="mt-4 flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface/60 px-4 py-6 text-sm font-semibold text-muted transition hover:border-accent/45 hover:text-accent"
          type="button"
          onClick={() => fileInputRef.current?.click()}
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
            void decodeFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="mt-4 flex max-h-72 items-center justify-center overflow-hidden rounded-md border border-line bg-surface/70 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- 本地对象 URL 预览，无需 next/image。 */}
            <img src={previewUrl} alt="二维码预览" className="max-h-64 max-w-full object-contain" />
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="flex items-center justify-between gap-2 border-b border-line/80 pb-4">
          <h3 className="text-sm font-semibold text-foreground">{copy.resultTitle}</h3>
          {result || previewUrl ? (
            <button className="admin-btn admin-btn-secondary inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold" type="button" onClick={clear}>
              <X className="h-3.5 w-3.5" />
              {copy.clear}
            </button>
          ) : null}
        </div>

        {busy ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted"><Loader2 className="h-4 w-4 animate-spin text-accent" />{copy.decoding}</p>
        ) : null}

        {!busy && result && parsed ? (
          <div className="mt-4 grid gap-3 rounded-md border border-line bg-surface/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="admin-muted-pill inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold text-accent">{parsed.typeLabel}</span>
              <span className="text-xs font-semibold uppercase text-muted">{formatLabel(result.format)}</span>
            </div>

            {parsed.fields.length > 0 ? (
              <dl className="grid gap-1.5">
                {parsed.fields.map((field) => (
                  <div key={field.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm">
                    <dt className="text-xs font-semibold text-muted">{field.label}</dt>
                    <dd className="break-all font-mono leading-6 text-foreground">{field.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="break-all font-mono text-sm leading-6 text-foreground">{result.rawValue}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button className="admin-btn admin-btn-secondary inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold" type="button" onClick={() => void copyValue(result.rawValue)}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? copy.copied : copy.copy}
              </button>
              {parsed.actions.map((action) => (
                <a
                  key={action.label}
                  className="admin-btn admin-btn-secondary inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                  href={action.href}
                  target={action.external ? "_blank" : undefined}
                  rel={action.external ? "noreferrer noopener" : undefined}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {!busy && message ? <p className="mt-4 text-sm font-semibold leading-6 text-muted" role="status">{message}</p> : null}
      </section>
    </div>
  );
}
