import type { ArticleRecord } from "@/data/articles";
import type { Locale } from "@/lib/site";

export const standardArticleCategories = [
  {
    key: "ai-practice",
    name: "AI 实践",
    labels: {
      zh: "AI 实践",
      en: "AI Practice",
    },
    aliases: ["AI实践", "AI 应用", "AI应用", "AI 协作", "AI协作", "AI 编程协作", "GPT", "ChatGPT", "AI Practice", "AI Collaboration", "AI Assisted Work", "AI Tools"],
  },
  {
    key: "website-development",
    name: "网站开发",
    labels: {
      zh: "网站开发",
      en: "Website Development",
    },
    aliases: ["网站", "网站搭建", "网站开发实战", "网站上线实战", "技术选型", "编程开发", "Web 开发", "Web开发", "Website Development", "Web Development", "Site Development", "Tech Stack Decisions"],
  },
  {
    key: "development-environment",
    name: "开发环境",
    labels: {
      zh: "开发环境",
      en: "Development Environment",
    },
    aliases: ["环境配置", "本地开发", "开发工具", "Windows", "PowerShell", "Cloudflare 本地开发", "Development Environment", "Local Development", "Developer Tools", "Dev Environment"],
  },
  {
    key: "content-creation",
    name: "内容创作",
    labels: {
      zh: "内容创作",
      en: "Content Creation",
    },
    aliases: ["写作", "文章写作", "AI 写作", "AI写作", "知识管理", "内容生产", "Content Creation", "Writing", "AI Writing", "Knowledge Management", "Content Workflow"],
  },
  {
    key: "project-retrospective",
    name: "项目复盘",
    labels: {
      zh: "项目复盘",
      en: "Project Retrospective",
    },
    aliases: ["复盘", "项目总结", "踩坑复盘", "案例复盘", "经验复盘", "Project Retrospective", "Project Review", "Lessons Learned", "Case Study"],
  },
  {
    key: "growth-practice",
    name: "成长实践",
    labels: {
      zh: "成长实践",
      en: "Growth Practice",
    },
    aliases: ["个人成长", "真实成长", "成长路径", "普通人成长", "经验分享", "Growth Practice", "Personal Growth", "Self Improvement", "Personal Practice"],
  },
  {
    key: "personal-brand",
    name: "个人品牌",
    labels: {
      zh: "个人品牌",
      en: "Personal Brand",
    },
    aliases: ["个人 IP", "个人IP", "IP 打造", "IP打造", "个人技术品牌", "个人品牌全球化", "领英运营", "GitHub 个人品牌", "Personal Branding", "Personal IP", "Professional Brand", "Technical Brand", "LinkedIn", "LinkedIn Operations", "GitHub Personal Brand"],
  },
  {
    key: "global-tools",
    name: "出海工具",
    labels: {
      zh: "出海工具",
      en: "Global Tools",
    },
    aliases: ["出海", "出海教程", "注册教程", "社交媒体", "账号注册", "VPN", "VPM", "海外工具", "工具注册", "Global Tools", "International Tools", "Overseas Tools", "Account Setup", "Social Media Tools"],
  },
  {
    key: "notes",
    name: "随手笔记",
    labels: {
      zh: "随手笔记",
      en: "Notes",
    },
    aliases: ["笔记", "零碎笔记", "随笔", "备忘", "杂记", "碎片记录", "Notes", "Quick Notes", "Memo", "Misc Notes"],
  },
] as const;

export const standardArticleCategoryNames = standardArticleCategories.map((category) => category.name);
export const standardArticleCategoryLabels: Record<Locale, string[]> = {
  zh: standardArticleCategories.map((category) => category.labels.zh),
  en: standardArticleCategories.map((category) => category.labels.en),
};

const categoryAliasMap = new Map<string, (typeof standardArticleCategories)[number]>(
  standardArticleCategories.flatMap((category) => [
    [normalizeCategoryKey(category.name), category],
    [normalizeCategoryKey(category.labels.zh), category],
    [normalizeCategoryKey(category.labels.en), category],
    [normalizeCategoryKey(category.key), category],
    ...category.aliases.map((alias) => [normalizeCategoryKey(alias), category] as const),
  ]),
);

function normalizeCategoryKey(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function normalizeArticleCategory(category: string | null | undefined, locale: Locale = "zh") {
  const normalized = category?.trim();

  if (!normalized) {
    return locale === "en" ? "Notes" : "随手笔记";
  }

  return categoryAliasMap.get(normalizeCategoryKey(normalized))?.labels[locale] ?? normalized;
}

export function isStandardArticleCategory(category: string | null | undefined, locale: Locale = "zh") {
  const normalized = category?.trim();
  const standardCategory = normalized ? categoryAliasMap.get(normalizeCategoryKey(normalized)) : undefined;
  return Boolean(standardCategory?.labels[locale]);
}

export function encodeTaxonomySegment(value: string) {
  return encodeURIComponent(value);
}

export function decodeTaxonomySegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getArticleCategories(articles: ArticleRecord[], locale: Locale = articles[0]?.locale ?? "zh") {
  const standardNames = standardArticleCategoryLabels[locale];
  const extraCategories = Array.from(
    new Set(
      articles
        .map((article) => normalizeArticleCategory(article.category, locale))
        .filter((category) => !standardNames.includes(category)),
    ),
  ).sort((a, b) => a.localeCompare(b, locale === "en" ? "en-US" : "zh-Hans-CN"));

  return [...standardNames, ...extraCategories];
}

export function getArticleTags(articles: ArticleRecord[]) {
  return Array.from(new Set(articles.flatMap((article) => article.tags))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

export function getArticleHref(article: Pick<ArticleRecord, "locale" | "slug">) {
  return article.locale === "en" ? `/en/articles/${article.slug}` : `/articles/${article.slug}`;
}

export function getCategoryHref(category: string, locale: ArticleRecord["locale"] = "zh") {
  if (locale === "en") {
    return `/en/articles/category/${encodeTaxonomySegment(category)}`;
  }

  return `/articles/category/${encodeTaxonomySegment(category)}`;
}

export function getTagHref(tag: string, locale: ArticleRecord["locale"] = "zh") {
  if (locale === "en") {
    return `/en/articles/tag/${encodeTaxonomySegment(tag)}`;
  }

  return `/articles/tag/${encodeTaxonomySegment(tag)}`;
}
