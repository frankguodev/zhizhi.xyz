"use client";

import { Check, ChevronDown, Download, Loader2, QrCode, RefreshCw, X } from "lucide-react";
import QRCode from "qrcode";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { clampInt, mediaPrefKeys, readMediaPrefs, writeMediaPrefs } from "./media-preferences";

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
type QrOutputFormat = "png" | "webp" | "jpeg";
type QrContentMode = "url" | "text" | "wifi" | "email" | "phone" | "sms" | "contact";
type WifiSecurity = "WPA" | "WEP" | "nopass";

const qrOutputFormats: QrOutputFormat[] = ["png", "webp", "jpeg"];
const qrFormatMimes: Record<QrOutputFormat, string> = { png: "image/png", webp: "image/webp", jpeg: "image/jpeg" };
const qrFormatExtensions: Record<QrOutputFormat, string> = { png: "png", webp: "webp", jpeg: "jpg" };
const qrFormatLabels: Record<QrOutputFormat, string> = { png: "PNG", webp: "WebP", jpeg: "JPG" };
const qrFormatQuality = 0.92;

type GeneratedLinkQr = {
  dataUrl: string;
  displayValue: string;
  fileName: string;
  formatLabel: string;
  payloadText: string;
  size: number;
};

type LinkQrCopy = {
  background: string;
  clear: string;
  copied: string;
  copyPayload: string;
  dark: string;
  download: string;
  emptyPayload: string;
  errorCorrection: string;
  errorCorrectionHint: string;
  format: string;
  generate: string;
  generated: string;
  hiddenWifi: string;
  inputHelp: string;
  inputLabel: string;
  margin: string;
  mode: string;
  modeLabels: Record<QrContentMode, string>;
  output: string;
  outputPlaceholder: string;
  phoneNumber: string;
  quietZoneHint: string;
  size: string;
  customColor: string;
  title: string;
  wifiSecurity: string;
};

const copy: LinkQrCopy = {
    background: "背景色",
    clear: "清空",
    copied: "已复制",
    copyPayload: "复制内容",
    dark: "二维码颜色",
    download: "下载",
    emptyPayload: "请先填写当前类型需要的内容。",
    errorCorrection: "纠错等级",
    errorCorrectionHint: "等级越高，二维码越能容忍轻微遮挡或污损；日常使用选 M，带头像或要打印可选 Q/H。",
    format: "输出格式",
    generate: "生成二维码",
    generated: "二维码已生成。",
    hiddenWifi: "隐藏网络",
    inputHelp: "选择类型后填写内容。",
    inputLabel: "内容",
    margin: "留白",
    mode: "二维码类型",
    modeLabels: {
      contact: "名片",
      email: "邮箱",
      phone: "电话",
      sms: "短信",
      text: "文本",
      url: "网址",
      wifi: "Wi-Fi",
    },
    output: "生成结果",
    outputPlaceholder: "填写内容后点击生成，结果会显示在这里。",
    phoneNumber: "号码",
    quietZoneHint: "默认保留二维码留白，打印或截图后更容易识别。",
    size: "输出尺寸",
    customColor: "自定义颜色",
    title: "内容设置",
    wifiSecurity: "加密方式",
};

const errorCorrectionOptions: Array<{ label: string; value: ErrorCorrectionLevel }> = [
  { label: "L 低", value: "L" },
  { label: "M 中", value: "M" },
  { label: "Q 高", value: "Q" },
  { label: "H 最高", value: "H" },
];

const colorSwatches = ["#171920", "#d9b861", "#c59b4a", "#2b2b2a", "#ffffff", "#f7f4ec", "#e6e0d3", "#8f8069"] as const;

const errorCorrectionLevels: ErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
const qrContentModes: QrContentMode[] = ["url", "text", "wifi", "email", "phone", "sms", "contact"];
const wifiSecurityOptions: Array<{ label: string; value: WifiSecurity }> = [
  { label: "WPA/WPA2", value: "WPA" },
  { label: "WEP", value: "WEP" },
  { label: "无密码", value: "nopass" },
];
const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

type LinkQrPrefs = {
  input: string;
  mode: QrContentMode;
  text: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: WifiSecurity;
  wifiHidden: boolean;
  emailAddress: string;
  emailSubject: string;
  emailBody: string;
  phoneNumber: string;
  smsNumber: string;
  smsBody: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactOrg: string;
  size: number;
  margin: number;
  errorCorrection: ErrorCorrectionLevel;
  darkColor: string;
  lightColor: string;
  format: QrOutputFormat;
};

function parseColor(value: unknown, fallback: string): string {
  return typeof value === "string" && hexColorPattern.test(value) ? value : fallback;
}

function parseLinkQrPrefs(raw: Record<string, unknown>): LinkQrPrefs {
  return {
    input: typeof raw.input === "string" ? raw.input : "https://zhizhi.xyz",
    mode: qrContentModes.includes(raw.mode as QrContentMode) ? (raw.mode as QrContentMode) : "url",
    text: typeof raw.text === "string" ? raw.text : "知之工具",
    wifiSsid: typeof raw.wifiSsid === "string" ? raw.wifiSsid : "",
    wifiPassword: typeof raw.wifiPassword === "string" ? raw.wifiPassword : "",
    wifiSecurity: wifiSecurityOptions.some((option) => option.value === raw.wifiSecurity) ? (raw.wifiSecurity as WifiSecurity) : "WPA",
    wifiHidden: typeof raw.wifiHidden === "boolean" ? raw.wifiHidden : false,
    emailAddress: typeof raw.emailAddress === "string" ? raw.emailAddress : "",
    emailSubject: typeof raw.emailSubject === "string" ? raw.emailSubject : "",
    emailBody: typeof raw.emailBody === "string" ? raw.emailBody : "",
    phoneNumber: typeof raw.phoneNumber === "string" ? raw.phoneNumber : "",
    smsNumber: typeof raw.smsNumber === "string" ? raw.smsNumber : "",
    smsBody: typeof raw.smsBody === "string" ? raw.smsBody : "",
    contactName: typeof raw.contactName === "string" ? raw.contactName : "",
    contactPhone: typeof raw.contactPhone === "string" ? raw.contactPhone : "",
    contactEmail: typeof raw.contactEmail === "string" ? raw.contactEmail : "",
    contactOrg: typeof raw.contactOrg === "string" ? raw.contactOrg : "",
    size: clampInt(raw.size, 384, 1600, 1024),
    margin: clampInt(raw.margin, 0, 8, 4),
    errorCorrection: errorCorrectionLevels.includes(raw.errorCorrection as ErrorCorrectionLevel) ? (raw.errorCorrection as ErrorCorrectionLevel) : "M",
    darkColor: parseColor(raw.darkColor, "#171920"),
    lightColor: parseColor(raw.lightColor, "#ffffff"),
    format: qrOutputFormats.includes(raw.format as QrOutputFormat) ? (raw.format as QrOutputFormat) : "png",
  };
}

export function LinkQrTool() {
  const labels = copy;
  const [mode, setMode] = useState<QrContentMode>("url");
  const [input, setInput] = useState("https://zhizhi.xyz");
  const [text, setText] = useState("知之工具");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<WifiSecurity>("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsNumber, setSmsNumber] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactOrg, setContactOrg] = useState("");
  const [size, setSize] = useState(1024);
  const [margin, setMargin] = useState(4);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>("M");
  const [darkColor, setDarkColor] = useState("#171920");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [format, setFormat] = useState<QrOutputFormat>("png");
  const [generatedQr, setGeneratedQr] = useState<GeneratedLinkQr | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState(labels.outputPlaceholder);
  const [messageTone, setMessageTone] = useState<"error" | "muted" | "success">("muted");
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  // 挂载后从本地恢复上次配置与链接（延后到 setTimeout，避免 SSR 首屏水合不一致与 effect 内同步 setState）。
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readMediaPrefs(mediaPrefKeys.linkQr, parseLinkQrPrefs);
      if (stored) {
        setMode(stored.mode);
        setInput(stored.input);
        setText(stored.text);
        setWifiSsid(stored.wifiSsid);
        setWifiPassword(stored.wifiPassword);
        setWifiSecurity(stored.wifiSecurity);
        setWifiHidden(stored.wifiHidden);
        setEmailAddress(stored.emailAddress);
        setEmailSubject(stored.emailSubject);
        setEmailBody(stored.emailBody);
        setPhoneNumber(stored.phoneNumber);
        setSmsNumber(stored.smsNumber);
        setSmsBody(stored.smsBody);
        setContactName(stored.contactName);
        setContactPhone(stored.contactPhone);
        setContactEmail(stored.contactEmail);
        setContactOrg(stored.contactOrg);
        setSize(stored.size);
        setMargin(stored.margin);
        setErrorCorrection(stored.errorCorrection);
        setDarkColor(stored.darkColor);
        setLightColor(stored.lightColor);
        setFormat(stored.format);
      }
      setPrefsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // 配置 / 链接变更后自动写回本地。
  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    writeMediaPrefs(mediaPrefKeys.linkQr, {
      contactEmail,
      contactName,
      contactOrg,
      contactPhone,
      darkColor,
      emailAddress,
      emailBody,
      emailSubject,
      errorCorrection,
      format,
      input,
      margin,
      mode,
      phoneNumber,
      size,
      smsBody,
      smsNumber,
      text,
      lightColor,
      wifiHidden,
      wifiPassword,
      wifiSecurity,
      wifiSsid,
    } satisfies LinkQrPrefs);
  }, [
    prefsHydrated,
    contactEmail,
    contactName,
    contactOrg,
    contactPhone,
    darkColor,
    emailAddress,
    emailBody,
    emailSubject,
    errorCorrection,
    format,
    input,
    margin,
    mode,
    phoneNumber,
    size,
    smsBody,
    smsNumber,
    text,
    lightColor,
    wifiHidden,
    wifiPassword,
    wifiSecurity,
    wifiSsid,
  ]);

  async function generateQr() {
    const payload = buildQrPayload({
      contactEmail,
      contactName,
      contactOrg,
      contactPhone,
      emailAddress,
      emailBody,
      emailSubject,
      input,
      mode,
      phoneNumber,
      smsBody,
      smsNumber,
      text,
      wifiHidden,
      wifiPassword,
      wifiSecurity,
      wifiSsid,
    });
    if (!payload) {
      setGeneratedQr(null);
      setMessage(labels.emptyPayload);
      setMessageTone("error");
      return;
    }

    setBusy(true);
    setCopied(false);
    setMessage(labels.generate);
    setMessageTone("muted");
    try {
      const dataUrl = await QRCode.toDataURL(payload.value, {
        color: {
          dark: ensureHexAlpha(darkColor),
          light: ensureHexAlpha(lightColor),
        },
        errorCorrectionLevel: errorCorrection,
        margin,
        scale: 8,
        width: size,
        type: qrFormatMimes[format] as "image/png" | "image/jpeg" | "image/webp",
        rendererOpts: format === "png" ? undefined : { quality: qrFormatQuality },
      });
      setGeneratedQr({
        dataUrl,
        displayValue: payload.displayValue,
        fileName: buildOutputFileName(payload.fileSeed, qrFormatExtensions[format]),
        formatLabel: qrFormatLabels[format],
        payloadText: payload.value,
        size,
      });
      setMessage(labels.generated);
      setMessageTone("success");
    } catch {
      setGeneratedQr(null);
      setMessage(labels.emptyPayload);
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
      await navigator.clipboard.writeText(generatedQr.payloadText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function clearQr() {
    setInput("");
    setText("");
    setWifiSsid("");
    setWifiPassword("");
    setEmailAddress("");
    setEmailSubject("");
    setEmailBody("");
    setPhoneNumber("");
    setSmsNumber("");
    setSmsBody("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setContactOrg("");
    setGeneratedQr(null);
    setCopied(false);
    setMessage(labels.outputPlaceholder);
    setMessageTone("muted");
  }

  const hasAnyInput = [
    contactEmail,
    contactName,
    contactOrg,
    contactPhone,
    emailAddress,
    emailBody,
    emailSubject,
    input,
    phoneNumber,
    smsBody,
    smsNumber,
    text,
    wifiPassword,
    wifiSsid,
  ].some((value) => value.trim());

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="grid gap-4">
          <div className="flex items-start gap-2.5 border-b border-line/80 pb-4">
            <span className="icon-action mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-accent">
              <QrCode className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted">{labels.inputHelp}</p>
            </div>
          </div>

          <div className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>{labels.mode}</span>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-accent/8 p-1 sm:grid-cols-4" role="tablist" aria-label={labels.mode}>
              {qrContentModes.map((item) => (
                <button
                  key={item}
                  className={`h-8 cursor-pointer rounded text-xs font-semibold transition ${mode === item ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
                  type="button"
                  aria-pressed={mode === item}
                  onClick={() => setMode(item)}
                >
                  {labels.modeLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <QrPayloadFields
            contactEmail={contactEmail}
            contactName={contactName}
            contactOrg={contactOrg}
            contactPhone={contactPhone}
            emailAddress={emailAddress}
            emailBody={emailBody}
            emailSubject={emailSubject}
            input={input}
            labels={labels}
            mode={mode}
            phoneNumber={phoneNumber}
            setContactEmail={setContactEmail}
            setContactName={setContactName}
            setContactOrg={setContactOrg}
            setContactPhone={setContactPhone}
            setEmailAddress={setEmailAddress}
            setEmailBody={setEmailBody}
            setEmailSubject={setEmailSubject}
            setInput={setInput}
            setPhoneNumber={setPhoneNumber}
            setSmsBody={setSmsBody}
            setSmsNumber={setSmsNumber}
            setText={setText}
            setWifiHidden={setWifiHidden}
            setWifiPassword={setWifiPassword}
            setWifiSecurity={setWifiSecurity}
            setWifiSsid={setWifiSsid}
            smsBody={smsBody}
            smsNumber={smsNumber}
            text={text}
            wifiHidden={wifiHidden}
            wifiPassword={wifiPassword}
            wifiSecurity={wifiSecurity}
            wifiSsid={wifiSsid}
          />

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
            <p className="text-xs font-semibold leading-5 text-muted">{labels.errorCorrectionHint}</p>
          </div>

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
              {copied ? labels.copied : labels.copyPayload}
            </button>
            <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={busy || (!generatedQr && !hasAnyInput)} onClick={clearQr}>
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{labels.output}</h3>
          {generatedQr ? <span className="text-xs font-semibold text-muted">{generatedQr.size} x {generatedQr.size} {generatedQr.formatLabel}</span> : null}
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
        {generatedQr ? <p className="mt-3 break-all text-xs font-semibold leading-5 text-muted">{generatedQr.displayValue}</p> : null}
        <p className={`mt-4 text-sm font-semibold leading-6 ${messageTone === "error" ? "text-red-700" : messageTone === "success" ? "text-accent" : "text-muted"}`} role={messageTone === "error" ? "alert" : "status"}>{message}</p>
      </section>
    </div>
  );
}

function QrPayloadFields({
  contactEmail,
  contactName,
  contactOrg,
  contactPhone,
  emailAddress,
  emailBody,
  emailSubject,
  input,
  labels,
  mode,
  phoneNumber,
  setContactEmail,
  setContactName,
  setContactOrg,
  setContactPhone,
  setEmailAddress,
  setEmailBody,
  setEmailSubject,
  setInput,
  setPhoneNumber,
  setSmsBody,
  setSmsNumber,
  setText,
  setWifiHidden,
  setWifiPassword,
  setWifiSecurity,
  setWifiSsid,
  smsBody,
  smsNumber,
  text,
  wifiHidden,
  wifiPassword,
  wifiSecurity,
  wifiSsid,
}: {
  contactEmail: string;
  contactName: string;
  contactOrg: string;
  contactPhone: string;
  emailAddress: string;
  emailBody: string;
  emailSubject: string;
  input: string;
  labels: LinkQrCopy;
  mode: QrContentMode;
  phoneNumber: string;
  setContactEmail: (value: string) => void;
  setContactName: (value: string) => void;
  setContactOrg: (value: string) => void;
  setContactPhone: (value: string) => void;
  setEmailAddress: (value: string) => void;
  setEmailBody: (value: string) => void;
  setEmailSubject: (value: string) => void;
  setInput: (value: string) => void;
  setPhoneNumber: (value: string) => void;
  setSmsBody: (value: string) => void;
  setSmsNumber: (value: string) => void;
  setText: (value: string) => void;
  setWifiHidden: (value: boolean) => void;
  setWifiPassword: (value: string) => void;
  setWifiSecurity: (value: WifiSecurity) => void;
  setWifiSsid: (value: string) => void;
  smsBody: string;
  smsNumber: string;
  text: string;
  wifiHidden: boolean;
  wifiPassword: string;
  wifiSecurity: WifiSecurity;
  wifiSsid: string;
}) {
  if (mode === "text") {
    return <TextAreaField label={labels.inputLabel} value={text} onChange={setText} placeholder="输入要写入二维码的文本" />;
  }

  if (mode === "wifi") {
    return (
      <div className="grid gap-3">
        <TextInput label="网络名 (SSID)" value={wifiSsid} onChange={setWifiSsid} placeholder="Office Wi-Fi" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>{labels.wifiSecurity}</span>
            <div className="grid grid-cols-3 rounded-md bg-accent/8 p-1">
              {wifiSecurityOptions.map((option) => (
                <button
                  key={option.value}
                  className={`h-8 cursor-pointer rounded text-xs font-semibold transition ${wifiSecurity === option.value ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
                  type="button"
                  aria-pressed={wifiSecurity === option.value}
                  onClick={() => setWifiSecurity(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <TextInput label="密码" value={wifiPassword} onChange={setWifiPassword} placeholder="Wi-Fi 密码" disabled={wifiSecurity === "nopass"} />
        </div>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
          <input type="checkbox" className="accent-[var(--accent)]" checked={wifiHidden} onChange={(event) => setWifiHidden(event.target.checked)} />
          {labels.hiddenWifi}
        </label>
      </div>
    );
  }

  if (mode === "email") {
    return (
      <div className="grid gap-3">
        <TextInput label="邮箱地址" value={emailAddress} onChange={setEmailAddress} placeholder="hello@example.com" inputMode="email" />
        <TextInput label="主题" value={emailSubject} onChange={setEmailSubject} placeholder="邮件主题（可选）" />
        <TextAreaField label="正文" value={emailBody} onChange={setEmailBody} placeholder="邮件正文（可选）" rows={4} />
      </div>
    );
  }

  if (mode === "phone") {
    return <TextInput label={labels.phoneNumber} value={phoneNumber} onChange={setPhoneNumber} placeholder="+86 138 0000 0000" inputMode="tel" />;
  }

  if (mode === "sms") {
    return (
      <div className="grid gap-3">
        <TextInput label={labels.phoneNumber} value={smsNumber} onChange={setSmsNumber} placeholder="+86 138 0000 0000" inputMode="tel" />
        <TextAreaField label="短信内容" value={smsBody} onChange={setSmsBody} placeholder="短信内容（可选）" rows={4} />
      </div>
    );
  }

  if (mode === "contact") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label="姓名" value={contactName} onChange={setContactName} placeholder="张三" />
        <TextInput label="电话" value={contactPhone} onChange={setContactPhone} placeholder="+86 138 0000 0000" inputMode="tel" />
        <TextInput label="邮箱" value={contactEmail} onChange={setContactEmail} placeholder="hello@example.com" inputMode="email" />
        <TextInput label="组织" value={contactOrg} onChange={setContactOrg} placeholder="公司或团队（可选）" />
      </div>
    );
  }

  return <TextInput label="网址" value={input} onChange={setInput} placeholder="https://zhizhi.xyz" inputMode="url" />;
}

function TextInput({
  disabled = false,
  inputMode,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  inputMode?: "email" | "tel" | "text" | "url";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted">
      {label}
      <input
        className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  rows = 5,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted">
      {label}
      <textarea
        className="min-h-28 resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm font-semibold leading-6 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
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
  const validColor = normalizeHexColor(value) ?? "#171920";
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
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(20,17,10,0.46)]"
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
              placeholder="#171920"
              spellCheck={false}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

type QrPayloadInput = {
  contactEmail: string;
  contactName: string;
  contactOrg: string;
  contactPhone: string;
  emailAddress: string;
  emailBody: string;
  emailSubject: string;
  input: string;
  mode: QrContentMode;
  phoneNumber: string;
  smsBody: string;
  smsNumber: string;
  text: string;
  wifiHidden: boolean;
  wifiPassword: string;
  wifiSecurity: WifiSecurity;
  wifiSsid: string;
};

function buildQrPayload(fields: QrPayloadInput) {
  if (fields.mode === "url") {
    const normalizedUrl = normalizeUrlInput(fields.input);
    return normalizedUrl ? { displayValue: normalizedUrl, fileSeed: normalizedUrl, value: normalizedUrl } : null;
  }

  if (fields.mode === "text") {
    const value = fields.text.trim();
    return value ? { displayValue: value, fileSeed: "text", value } : null;
  }

  if (fields.mode === "wifi") {
    const ssid = fields.wifiSsid.trim();
    if (!ssid) {
      return null;
    }
    const password = fields.wifiSecurity === "nopass" ? "" : fields.wifiPassword;
    const value = [
      "WIFI:",
      `T:${fields.wifiSecurity};`,
      `S:${escapeWifiValue(ssid)};`,
      password ? `P:${escapeWifiValue(password)};` : "",
      fields.wifiHidden ? "H:true;" : "",
      ";",
    ].join("");
    return { displayValue: `Wi-Fi: ${ssid}`, fileSeed: `wifi-${ssid}`, value };
  }

  if (fields.mode === "email") {
    const email = fields.emailAddress.trim();
    if (!isLikelyEmail(email)) {
      return null;
    }
    const subject = fields.emailSubject.trim();
    const body = fields.emailBody.trim().replace(/\r?\n/g, " ");
    const value = subject || body
      ? `MATMSG:TO:${escapeMatmsgValue(email)};SUB:${escapeMatmsgValue(subject)};BODY:${escapeMatmsgValue(body)};;`
      : `mailto:${email}`;
    return { displayValue: email, fileSeed: `email-${email}`, value };
  }

  if (fields.mode === "phone") {
    const number = cleanPhoneNumber(fields.phoneNumber);
    return number ? { displayValue: number, fileSeed: `tel-${number}`, value: `tel:${number}` } : null;
  }

  if (fields.mode === "sms") {
    const number = cleanPhoneNumber(fields.smsNumber);
    if (!number) {
      return null;
    }
    const body = fields.smsBody.trim().replace(/\r?\n/g, " ");
    const value = `SMSTO:${number}:${body}`;
    return { displayValue: body ? `${number} · ${body}` : number, fileSeed: `sms-${number}`, value };
  }

  const contactParts = [
    ["FN", fields.contactName],
    ["TEL", cleanPhoneNumber(fields.contactPhone)],
    ["EMAIL", fields.contactEmail.trim()],
    ["ORG", fields.contactOrg],
  ] as const;
  const filled = contactParts
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value);
  if (filled.length === 0) {
    return null;
  }
  const value = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    ...filled.map(([key, item]) => `${key}:${escapeVcardValue(item)}`),
    "END:VCARD",
  ].join("\n");
  const name = fields.contactName.trim() || fields.contactPhone.trim() || fields.contactEmail.trim() || "contact";
  return { displayValue: name, fileSeed: `contact-${name}`, value };
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

function buildOutputFileName(seed: string, extension: string) {
  try {
    const url = new URL(seed);
    const host = url.hostname.replace(/^www\./, "").replace(/[^\w.-]+/g, "-") || "link";
    return `${host}-qr.${extension}`;
  } catch {
    const cleaned = seed
      .trim()
      .toLowerCase()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42);
    return `${cleaned || "qr"}-qr.${extension}`;
  }
}

function escapeWifiValue(value: string) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function escapeVcardValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([;,])/g, "\\$1");
}

function escapeMatmsgValue(value: string) {
  return value.replace(/\r?\n/g, " ").replace(/([\\;:])/g, "\\$1");
}

function cleanPhoneNumber(value: string) {
  return value.trim().replace(/[^\d+*#(). -]/g, "");
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
