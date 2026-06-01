import type { HashAlgorithm, HashOutputFormat, HashStructuredResultData, JwtStructuredResultData } from "./tool-types";

export function decodeJwtInput(input: string) {
  const token = normalizeJwtInput(input);
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("请输入包含 Header 和 Payload 的有效 JWT。");
  }

  const header = JSON.parse(base64UrlDecode(parts[0])) as unknown;
  const payload = JSON.parse(base64UrlDecode(parts[1])) as unknown;
  if (!isPlainRecord(payload)) {
    throw new Error("JWT Payload 必须是 JSON 对象。");
  }

  const result = formatJwtResult(header, payload, Boolean(parts[2]));
  return { normalizedToken: token, ...result };
}

export function normalizeJwtInput(value: string) {
  return value.trim().replace(/^Bearer\s+/i, "").trim();
}

export function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function formatHashResult(buffer: ArrayBuffer, algorithm: HashAlgorithm, outputFormat: HashOutputFormat, bytes: number, fileName?: string) {
  const base64 = bufferToBase64(buffer);
  const digest = {
    base64,
    base64url: base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""),
    hex: bufferToHex(buffer),
  }[outputFormat];

  const fields = [
    { label: "算法", value: algorithm },
    { label: "格式", value: outputFormat },
    { label: "输入大小", value: formatBytes(bytes) },
  ];
  if (fileName) {
    fields.push({ label: "文件", value: fileName });
  }

  return {
    raw: ["[Hash 摘要]", ...fields.map((field) => `${field.label}: ${field.value}`), "", digest].join("\n"),
    structured: { digest, fields } satisfies HashStructuredResultData,
  };
}

function formatJwtResult(header: unknown, payload: Record<string, unknown>, signaturePresent: boolean) {
  const labels = {
    signatureTitle: "[签名状态]",
    signatureWarning: "未验证签名：此工具只做本地解码，不判断 Token 是否可信。",
    signatureField: `签名字段：${signaturePresent ? "存在" : "缺失"}`,
    expirationTitle: "[过期状态]",
    timeTitle: "[时间字段]",
    headerTitle: "[Header]",
    payloadTitle: "[Payload]",
  };

  const expirationBody = formatJwtExpiration(payload.exp);
  const timeClaimsBody = formatJwtTimeClaims(payload);
  const headerJson = JSON.stringify(header, null, 2);
  const payloadJson = JSON.stringify(payload, null, 2);

  return {
    raw: [
      labels.signatureTitle,
      labels.signatureWarning,
      labels.signatureField,
      "",
      labels.expirationTitle,
      expirationBody,
      "",
      labels.timeTitle,
      timeClaimsBody,
      "",
      labels.headerTitle,
      headerJson,
      "",
      labels.payloadTitle,
      payloadJson,
    ].join("\n"),
    structured: {
      expirationBody,
      headerJson,
      payloadJson,
      signatureBody: [labels.signatureWarning, labels.signatureField].join("\n"),
      timeClaimsBody,
    } satisfies JwtStructuredResultData,
  };
}

function formatJwtExpiration(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "exp：缺失或不是数字。";
  }

  const nowSeconds = Date.now() / 1000;
  const deltaSeconds = value - nowSeconds;
  const timeLine = `exp: ${formatJwtTimestamp(value)}`;
  if (deltaSeconds <= 0) {
    const duration = formatDuration(Math.abs(deltaSeconds));
    return `${timeLine}\n状态：已过期，过期 ${duration}。`;
  }

  const duration = formatDuration(deltaSeconds);
  return `${timeLine}\n状态：未过期，剩余 ${duration}。`;
}

function formatJwtTimeClaims(payload: Record<string, unknown>) {
  const keys = ["iat", "nbf", "exp"] as const;
  const lines = keys.map((key) => {
    const value = payload[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `${key}: 缺失或不是数字`;
    }

    return `${key}: ${formatJwtTimestamp(value)}`;
  });

  return lines.join("\n");
}

function formatJwtTimestamp(value: number) {
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) {
    return `Invalid date (Unix ${value})`;
  }

  return `${date.toISOString()} (Unix ${value})`;
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const units = [
    { label: "天", value: days },
    { label: "小时", value: hours },
    { label: "分钟", value: minutes },
    { label: "秒", value: remainingSeconds },
  ];
  const visibleUnits = units.filter((unit) => unit.value > 0).slice(0, 3);
  if (visibleUnits.length === 0) {
    return "0 秒";
  }

  return visibleUnits.map((unit) => `${unit.value} ${unit.label}`).join(" ");
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
