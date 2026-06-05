export const siteConfig = {
  name: "知之",
  nameEn: "ZHIZHI",
  domain: "zhizhi.xyz",
  url: "https://zhizhi.xyz",
  tagline: "帮助志同道合的朋友解决问题，帮助自己回顾问题。",
  description: "知之是一个个人知识分享系统，有高质量文章、术语词条、实用工具等。",
  social: {
    email: "hello@frankguo.com",
    xUrl: "https://x.com/frankguodev",
    githubUrl: "https://github.com/frankguodev",
  },
} as const;

// 站点默认社交分享图（1200×630）。页面未配置自己的分享图时统一兜底用它。
export const defaultShareImage = {
  url: "/social-share.jpg",
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} ${siteConfig.nameEn}`,
} as const;

export type Locale = "zh";

export function isLocale(value: string): value is Locale {
  return value === "zh";
}
