import matter from "gray-matter";
import { z } from "zod";
import type { ArticleRecord } from "@/data/articles";
import { isStandardArticleCategory, normalizeArticleCategory } from "@/lib/article-taxonomy";
import type { Locale } from "@/lib/site";

const importSchema = z.object({
  title: z.string().min(1).catch("未命名文章"),
  slug: z.string().min(1).catch("imported-draft"),
  summary: z.string().catch(""),
  category: z.string().catch("未分类"),
  tags: z.array(z.string()).catch([]),
  locale: z.literal("zh").catch("zh"),
  visibility: z.enum(["public", "login", "hidden"]).catch("public"),
  reading_minutes: z.number().int().positive().catch(5),
  published_at: z.string().catch(""),
  updated_at: z.string().catch(""),
  supports_reading_mode: z.boolean().catch(true),
  default_reading_mode: z.enum(["full", "quick"]).catch("quick"),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().optional(),
  robots: z.string().optional(),
  coverImage: z.string().optional(),
  coverImageAlt: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  ogImageAlt: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().optional(),
  articleType: z.string().optional(),
  difficulty: z.string().optional(),
  primaryTopic: z.string().optional(),
  seoMetadata: z.record(z.string(), z.unknown()).optional(),
  sourceType: z.enum(["original", "ai_assisted", "curated", "mixed"]).optional(),
  sourceNote: z.string().optional(),
  aiAssisted: z.boolean().optional(),
  humanReviewed: z.boolean().optional(),
});

export type ArticleImportResult = {
  article: ArticleRecord;
  frontmatter: Record<string, unknown>;
  warnings: string[];
};

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeStringList(value: unknown) {
  const items = normalizeTags(value);
  return items.length > 0 ? items : undefined;
}

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const normalized = cleanString(value);

    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function recordValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = recordValue(value);

    if (Object.keys(record).length > 0) {
      return record;
    }
  }

  return {};
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return undefined;
}

function normalizeSourceType(value: unknown) {
  const normalized = cleanString(value);

  if (normalized === "original" || normalized === "ai_assisted" || normalized === "curated" || normalized === "mixed") {
    return normalized;
  }

  return undefined;
}

function normalizeLocale(): Locale {
  return "zh";
}

function categoryFallback() {
  return "随手笔记";
}

function buildSeoMetadata(data: Record<string, unknown>) {
  const metadata: Record<string, unknown> = {
    rawFrontmatter: data,
  };
  const sections = [
    ["seo", firstRecord(data.seo, data.seoMetadata)],
    ["openGraph", firstRecord(data.open_graph, data.openGraph)],
    ["twitter", recordValue(data.twitter)],
    ["content", recordValue(data.content)],
    ["source", recordValue(data.source)],
    ["structuredData", firstRecord(data.structured_data, data.structuredData)],
  ] as const;

  for (const [key, value] of sections) {
    if (Object.keys(value).length > 0) {
      metadata[key] = value;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function inferTitle(content: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || "未命名文章";
}

function inferSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || "imported-draft";
}

function estimateReadingMinutes(content: string) {
  const plainLength = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\s+/g, "")
    .length;

  return Math.max(1, Math.ceil(plainLength / 650));
}

export function parseArticleImport(markdown: string): ArticleImportResult {
  const parsed = matter(markdown);
  const seo = firstRecord(parsed.data.seo, parsed.data.seoMetadata);
  const openGraph = firstRecord(parsed.data.open_graph, parsed.data.openGraph);
  const twitter = recordValue(parsed.data.twitter);
  const content = recordValue(parsed.data.content);
  const source = recordValue(parsed.data.source);
  const rawLocale = normalizeLocale();
  const title = parsed.data.title || inferTitle(parsed.content);
  const summary = cleanString(parsed.data.summary) || "";
  const rawCategory = cleanString(parsed.data.category);
  const normalizedCategory = normalizeArticleCategory(rawCategory, rawLocale);
  const seoTitle = firstString(parsed.data.seo_title, parsed.data.seoTitle, seo.title, title);
  const seoDescription = firstString(parsed.data.seo_description, parsed.data.seoDescription, seo.description, summary);
  const ogTitle = firstString(parsed.data.og_title, parsed.data.ogTitle, openGraph.title, seoTitle);
  const ogDescription = firstString(parsed.data.og_description, parsed.data.ogDescription, openGraph.description, seoDescription);
  const twitterTitle = firstString(parsed.data.twitter_title, parsed.data.twitterTitle, twitter.title, ogTitle);
  const twitterDescription = firstString(parsed.data.twitter_description, parsed.data.twitterDescription, twitter.description, ogDescription);
  const ogImage = firstString(parsed.data.og_image, parsed.data.ogImage, openGraph.image);
  const twitterImage = firstString(parsed.data.twitter_image, parsed.data.twitterImage, twitter.image);
  const raw = {
    ...parsed.data,
    locale: rawLocale,
    category: normalizedCategory,
    tags: normalizeTags(parsed.data.tags),
    title,
    slug: parsed.data.slug || inferSlug(String(title)),
    summary,
    reading_minutes: parsed.data.reading_minutes || parsed.data.readingMinutes || estimateReadingMinutes(parsed.content),
    published_at: parsed.data.published_at || parsed.data.publishedAt || today(),
    updated_at: parsed.data.updated_at || parsed.data.updatedAt || today(),
    supports_reading_mode: parsed.data.supports_reading_mode ?? parsed.data.supportsReadingMode ?? true,
    default_reading_mode: parsed.data.default_reading_mode || parsed.data.defaultReadingMode || "quick",
    seoTitle,
    seoDescription,
    seoKeywords: normalizeStringList(parsed.data.seo_keywords ?? parsed.data.seoKeywords ?? seo.keywords),
    canonicalUrl: firstString(parsed.data.canonical_url, parsed.data.canonicalUrl, seo.canonical_url, seo.canonicalUrl),
    robots: firstString(parsed.data.robots, seo.robots),
    coverImage: firstString(parsed.data.cover_image, parsed.data.coverImage, openGraph.image, twitter.image),
    coverImageAlt: firstString(parsed.data.cover_image_alt, parsed.data.coverImageAlt, openGraph.image_alt, openGraph.imageAlt),
    ogTitle,
    ogDescription,
    ogImage,
    ogImageAlt: firstString(parsed.data.og_image_alt, parsed.data.ogImageAlt, openGraph.image_alt, openGraph.imageAlt),
    twitterTitle,
    twitterDescription,
    twitterImage,
    articleType: firstString(parsed.data.article_type, parsed.data.articleType, content.article_type, content.articleType),
    difficulty: firstString(parsed.data.difficulty, content.difficulty),
    primaryTopic: firstString(parsed.data.primary_topic, parsed.data.primaryTopic, content.primary_topic, content.primaryTopic),
    seoMetadata: buildSeoMetadata(parsed.data),
    sourceType: normalizeSourceType(parsed.data.source_type ?? parsed.data.sourceType ?? source.source_type ?? source.sourceType),
    sourceNote: firstString(parsed.data.source_note, parsed.data.sourceNote, source.source_note, source.sourceNote),
    aiAssisted: normalizeBoolean(parsed.data.ai_assisted ?? parsed.data.aiAssisted ?? source.ai_assisted ?? source.aiAssisted),
    humanReviewed: normalizeBoolean(parsed.data.human_reviewed ?? parsed.data.humanReviewed ?? source.human_reviewed ?? source.humanReviewed),
  };
  const data = importSchema.parse(raw);
  const warnings: string[] = [];

  if (!parsed.data.title) warnings.push("Frontmatter 缺少 title，已从一级标题推断。");
  if (!parsed.data.slug) warnings.push("Frontmatter 缺少 slug，已根据标题自动生成。");
  if (!parsed.data.summary) warnings.push("Frontmatter 缺少 summary，发布前建议补充摘要。");
  if (!rawCategory) warnings.push(`Frontmatter 缺少 category，已归入“${categoryFallback()}”。`);
  if (rawCategory && rawCategory !== normalizedCategory) warnings.push(`Frontmatter category 已从“${rawCategory}”归一为“${normalizedCategory}”。`);
  if (rawCategory && rawCategory === normalizedCategory && !isStandardArticleCategory(normalizedCategory, rawLocale)) {
    warnings.push(`Frontmatter category “${normalizedCategory}”不在中文标准分类中，建议改为当前语言的 9 个主分类之一。`);
  }

  return {
    article: {
      slug: data.slug,
      locale: data.locale,
      title: data.title,
      summary: data.summary,
      category: data.category,
      tags: data.tags,
      visibility: data.visibility,
      readingMinutes: data.reading_minutes,
      publishedAt: data.published_at,
      updatedAt: data.updated_at,
      supportsReadingMode: data.supports_reading_mode,
      defaultReadingMode: data.default_reading_mode,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoKeywords: data.seoKeywords,
      canonicalUrl: data.canonicalUrl,
      robots: data.robots,
      coverImage: data.coverImage,
      coverImageAlt: data.coverImageAlt,
      ogTitle: data.ogTitle,
      ogDescription: data.ogDescription,
      ogImage: data.ogImage,
      ogImageAlt: data.ogImageAlt,
      twitterTitle: data.twitterTitle,
      twitterDescription: data.twitterDescription,
      twitterImage: data.twitterImage,
      articleType: data.articleType,
      difficulty: data.difficulty,
      primaryTopic: data.primaryTopic,
      seoMetadata: data.seoMetadata,
      sourceType: data.sourceType,
      sourceNote: data.sourceNote,
      aiAssisted: data.aiAssisted,
      humanReviewed: data.humanReviewed,
      content: parsed.content.trim(),
    },
    frontmatter: parsed.data,
    warnings,
  };
}
