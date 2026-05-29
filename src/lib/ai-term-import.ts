import matter from "gray-matter";
import { z } from "zod";
import type { AiTermDifficulty, AiTermLocale, AiTermRelationType, AiTermStatus, AiTermType, AiTermVisibility, SaveAiTermInput } from "./ai-terms";

const aiTermTypes = ["concept", "protocol", "framework", "product", "model", "workflow", "infra", "slang", "company", "method"] as const;
const aiTermDifficulties = ["beginner", "intermediate", "advanced"] as const;
const aiTermStatuses = ["draft", "published", "archived"] as const;
const aiTermVisibilities = ["public", "login", "hidden"] as const;
const aiTermRelationTypes = ["related", "similar", "opposite", "upstream", "downstream", "ecosystem"] as const;

const categorySchema = z.object({
  name: z.string().catch(""),
  slug: z.string().catch(""),
  description: z.string().optional().catch(undefined),
  sort_order: z.coerce.number().int().catch(0),
  translation_key: z.string().optional().catch(undefined),
});

const relationSchema = z.object({
  term: z.string().optional().catch(undefined),
  slug: z.string().catch(""),
  relation_type: z.enum(aiTermRelationTypes).catch("related"),
  description: z.string().optional().catch(undefined),
  sort_order: z.coerce.number().int().catch(0),
});

const frontmatterSchema = z.object({
  term: z.string().min(1).catch("未命名词条"),
  term_zh: z.string().optional().catch(undefined),
  full_name: z.string().optional().catch(undefined),
  slug: z.string().optional().catch(undefined),
  locale: z.enum(["zh", "en"]).catch("zh"),
  translation_key: z.string().optional().catch(undefined),
  short_concept: z.string().min(1).catch(""),
  short_desc: z.string().min(1).catch(""),
  tagline: z.string().optional().catch(undefined),
  beginner_notes: z.record(z.string(), z.unknown()).optional().catch(undefined),
  type: z.enum(aiTermTypes).catch("concept"),
  difficulty: z.enum(aiTermDifficulties).catch("beginner"),
  status: z.enum(aiTermStatuses).catch("draft"),
  visibility: z.enum(aiTermVisibilities).catch("public"),
  heat_score: z.coerce.number().int().min(0).max(100).catch(0),
  quality_score: z.coerce.number().int().min(0).max(100).catch(0),
  trending: z.boolean().catch(false),
  sort_order: z.coerce.number().int().catch(0),
  content: z
    .object({
      format: z.string().catch("markdown"),
      version: z.string().catch("ai-term-md-v1"),
    })
    .catch({ format: "markdown", version: "ai-term-md-v1" }),
  categories: z.array(categorySchema).catch([]),
  aliases: z.array(z.string()).optional().catch(undefined),
  relations: z.array(relationSchema).catch([]),
  seo: z
    .object({
      title: z.string().optional().catch(undefined),
      description: z.string().optional().catch(undefined),
      keywords: z.array(z.string()).optional().catch(undefined),
      canonical_url: z.string().optional().catch(undefined),
      robots: z.string().optional().catch(undefined),
    })
    .catch({}),
  open_graph: z
    .object({
      title: z.string().optional().catch(undefined),
      description: z.string().optional().catch(undefined),
      type: z.string().optional().catch(undefined),
      image: z.string().optional().catch(undefined),
      image_alt: z.string().optional().catch(undefined),
    })
    .catch({}),
  twitter: z
    .object({
      card: z.string().optional().catch(undefined),
      title: z.string().optional().catch(undefined),
      description: z.string().optional().catch(undefined),
      image: z.string().optional().catch(undefined),
    })
    .catch({}),
  diagram: z
    .object({
      image: z.string().optional().catch(undefined),
      image_alt: z.string().optional().catch(undefined),
    })
    .catch({}),
  source: z
    .object({
      source_note: z.string().optional().catch(undefined),
      ai_assisted: z.boolean().optional().catch(undefined),
      human_reviewed: z.boolean().optional().catch(undefined),
      last_verified_at: z.string().optional().catch(undefined),
      published_at: z.string().optional().catch(undefined),
    })
    .catch({}),
  structured_data: z.record(z.string(), z.unknown()).optional().catch(undefined),
});

export type AiTermImportResult = {
  aiTerm: SaveAiTermInput;
  frontmatter: Record<string, unknown>;
  warnings: string[];
};

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
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function inferTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || "未命名词条";
}

function inferSlug(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ai-term"
  );
}

function normalizeStringList(values: string[] | undefined) {
  const normalized = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNullable(value: unknown) {
  return cleanString(value) ?? null;
}

function normalizeDate(value: unknown) {
  return cleanString(value) ?? null;
}

function buildMetadata(data: Record<string, unknown>) {
  const metadata: Record<string, unknown> = {
    rawFrontmatter: data,
  };
  const sections = [
    ["openGraph", recordValue(data.open_graph ?? data.openGraph)],
    ["twitter", recordValue(data.twitter)],
    ["diagram", recordValue(data.diagram)],
    ["structuredData", recordValue(data.structured_data ?? data.structuredData)],
  ] as const;
  const aliases = Array.isArray(data.aliases) ? data.aliases.map(String).map((item) => item.trim()).filter(Boolean) : [];

  for (const [key, value] of sections) {
    if (Object.keys(value).length > 0) {
      metadata[key] = value;
    }
  }

  if (aliases.length > 0) {
    metadata.aliases = aliases;
  }

  return metadata;
}

export function parseAiTermImport(markdown: string): AiTermImportResult {
  const parsed = matter(markdown);
  const rawFrontmatter = parsed.data;
  const warnings: string[] = [];
  const inferredTerm = inferTitle(parsed.content);
  const data = frontmatterSchema.parse({
    ...rawFrontmatter,
    term: rawFrontmatter.term || inferredTerm,
  });
  const term = data.term;
  const slug = cleanString(data.slug) || inferSlug(firstString(data.full_name, data.term, inferredTerm) ?? term);
  const translationKey = cleanString(data.translation_key) || slug;
  const shareImageFromOpenGraph = cleanString(data.open_graph.image);
  const shareImageFromTwitter = cleanString(data.twitter.image);
  const shareImage = shareImageFromOpenGraph || shareImageFromTwitter || null;

  if (!rawFrontmatter.term) {
    warnings.push("Frontmatter 缺少 term，已从正文一级标题推断。");
  }

  if (!rawFrontmatter.slug) {
    warnings.push("Frontmatter 缺少 slug，已根据词条名自动生成。");
  }

  if (data.content.format !== "markdown") {
    warnings.push("content.format 不是 markdown，已按 markdown 入库。");
  }

  if (shareImageFromOpenGraph && shareImageFromTwitter && shareImageFromOpenGraph !== shareImageFromTwitter) {
    warnings.push("open_graph.image 与 twitter.image 不一致，已优先使用 open_graph.image 作为 share_image。");
  }

  if (data.aliases && data.aliases.length > 0) {
    warnings.push("MVP 阶段不单独入库 aliases，已保留在 metadata_json.rawFrontmatter 中。");
  }

  const categories = data.categories
    .map((category, index) => {
      const name = cleanString(category.name);
      const categorySlug = cleanString(category.slug) || (name ? inferSlug(name) : undefined);

      if (!name || !categorySlug) {
        return null;
      }

      return {
        name,
        slug: categorySlug,
        description: normalizeNullable(category.description),
        sortOrder: category.sort_order || index + 1,
        translationKey: cleanString(category.translation_key) || categorySlug,
      };
    })
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  const relations = data.relations
    .map((relation) => {
      const relationSlug = cleanString(relation.slug) || (relation.term ? inferSlug(relation.term) : undefined);

      if (!relationSlug) {
        return null;
      }

      return {
        slug: relationSlug,
        relationType: relation.relation_type as AiTermRelationType,
        description: normalizeNullable(relation.description),
        sortOrder: relation.sort_order,
      };
    })
    .filter((relation): relation is NonNullable<typeof relation> => Boolean(relation));

  if (categories.length === 0) {
    warnings.push("未解析到有效 categories，保存时不会建立词条分类关系。");
  }

  return {
    aiTerm: {
      locale: data.locale as AiTermLocale,
      translationKey,
      term,
      termZh: normalizeNullable(data.term_zh),
      fullName: normalizeNullable(data.full_name),
      slug,
      shortConcept: data.short_concept || term,
      shortDesc: data.short_desc || data.short_concept || term,
      tagline: normalizeNullable(data.tagline),
      beginnerNotes: data.beginner_notes,
      type: data.type as AiTermType,
      difficulty: data.difficulty as AiTermDifficulty,
      status: data.status as AiTermStatus,
      visibility: data.visibility as AiTermVisibility,
      heatScore: data.heat_score,
      qualityScore: data.quality_score,
      trending: data.trending,
      sortOrder: data.sort_order,
      contentMd: parsed.content.trim(),
      contentVersion: data.content.version || "ai-term-md-v1",
      seoTitle: normalizeNullable(data.seo.title),
      seoDescription: normalizeNullable(data.seo.description),
      seoKeywords: normalizeStringList(data.seo.keywords),
      canonicalUrl: normalizeNullable(data.seo.canonical_url),
      robots: cleanString(data.seo.robots) || "index, follow",
      shareImage,
      shareImageAlt: normalizeNullable(data.open_graph.image_alt),
      diagramImage: normalizeNullable(data.diagram.image),
      diagramImageAlt: normalizeNullable(data.diagram.image_alt),
      metadata: buildMetadata(rawFrontmatter),
      sourceNote: normalizeNullable(data.source.source_note),
      aiAssisted: data.source.ai_assisted ?? true,
      humanReviewed: data.source.human_reviewed ?? false,
      publishedAt: normalizeDate(data.source.published_at),
      lastVerifiedAt: normalizeDate(data.source.last_verified_at),
      categories,
      relations,
    },
    frontmatter: rawFrontmatter,
    warnings,
  };
}
