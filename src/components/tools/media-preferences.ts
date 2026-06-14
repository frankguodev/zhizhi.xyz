// 媒体工具（图片压缩转换 / 微信二维码 / 二维码生成）的本地配置持久化。
// 与 tool-preferences.ts 同思路：SSR 安全、逐字段由各组件自行校验，仅存配置与用户输入，不存图片二进制。
// 每个工具一个独立 key，组件挂载时恢复、配置变更时写回（默认自动保存，无 UI 控件）。

export const mediaPrefKeys = {
  image: "zhizhi.tools.media.image",
  wechatQr: "zhizhi.tools.media.wechatQr",
  linkQr: "zhizhi.tools.media.linkQr",
  watermark: "zhizhi.tools.media.watermark",
  crop: "zhizhi.tools.media.crop",
  idPhoto: "zhizhi.tools.media.idPhoto",
} as const;

export function readMediaPrefs<T>(key: string, parse: (raw: Record<string, unknown>) => T): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parse(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** 还原数值配置时夹取到控件允许的范围，并防止 NaN / 手改 localStorage 造成的越界。 */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

export function writeMediaPrefs(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 本地偏好为非关键数据，忽略写入失败（隐私模式 / 配额已满）。
  }
}
