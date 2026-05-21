import type { Locale } from "@/lib/site";

export const translations = {
  zh: {
    "nav.articles": "文章",
    "nav.series": "专题",
    "nav.tools": "工具",
    "nav.aiTerms": "词条",
    "nav.about": "关于",
    "nav.donate": "捐赠",
    "language.switch": "Switch to English",
  },
  en: {
    "nav.articles": "Articles",
    "nav.series": "Series",
    "nav.tools": "Tools",
    "nav.aiTerms": "Terms",
    "nav.about": "About",
    "nav.donate": "Donate",
    "language.switch": "切换到中文",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["zh"];

export function t(locale: Locale, key: TranslationKey) {
  return translations[locale][key] ?? translations.zh[key];
}
