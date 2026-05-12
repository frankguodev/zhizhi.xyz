export const siteConfig = {
  name: "知之",
  nameEn: "ZhiZhi",
  domain: "zhizhi.xyz",
  url: "https://zhizhi.xyz",
  defaultLocale: "zh",
  locales: ["zh", "en"],
  tagline: {
    zh: "把知识整理成可追溯、可复用、可继续生长的路径。",
    en: "A personal knowledge system where ideas branch into usable paths.",
  },
  description: {
    zh: "知之是一个个人知识分享系统，整理高质量文章、专题路线、分层阅读和可复用的创作方法。",
    en: "ZhiZhi is a personal knowledge system for high-quality articles, learning paths, layered reading, and reusable writing workflows.",
  },
  social: {
    email: "hello@zhizhi.xyz",
    xUrl: "https://x.com",
    githubUrl: "https://github.com/frankguodev",
  },
} as const;

export type Locale = (typeof siteConfig.locales)[number];

export function isLocale(value: string): value is Locale {
  return siteConfig.locales.includes(value as Locale);
}
