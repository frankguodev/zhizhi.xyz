export const siteConfig = {
  name: "知之",
  nameEn: "ZhiZhi",
  domain: "zhizhi.xyz",
  url: "https://zhizhi.xyz",
  tagline: "把知识整理成可追溯、可复用、可继续生长的路径。",
  description: "知之是一个个人知识分享系统，有高质量文章、术语词条、实用工具等。",
  social: {
    email: "hello@frankguo.com",
    xUrl: "https://x.com/frankguodev",
    githubUrl: "https://github.com/frankguodev",
  },
} as const;

export type Locale = "zh";

export function isLocale(value: string): value is Locale {
  return value === "zh";
}
