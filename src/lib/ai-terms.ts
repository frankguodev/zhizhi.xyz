import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import matter from "gray-matter";
import { getDb } from "@/db/client";
import {
  aiTermCategories,
  aiTermCategoryRelations,
  aiTermRelations,
  aiTerms,
  aiTermTagRelations,
  aiTermTags,
} from "@/db/schema";

export type AiTermLocale = "zh" | "en";
export type AiTermType = "concept" | "protocol" | "framework" | "product" | "model" | "workflow" | "infra" | "slang" | "company" | "method";
export type AiTermDifficulty = "beginner" | "intermediate" | "advanced";
export type AiTermStatus = "draft" | "published" | "archived";
export type AiTermVisibility = "public" | "login" | "hidden";
export type AiTermRelationType = "related" | "similar" | "opposite" | "upstream" | "downstream" | "ecosystem";

export type AiTermTaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
};

export type AiTermSummary = {
  id: string;
  locale: AiTermLocale;
  term: string;
  termZh: string | null;
  fullName: string | null;
  slug: string;
  shortConcept: string;
  shortDesc: string;
  tagline: string | null;
  type: AiTermType;
  difficulty: AiTermDifficulty;
  heatScore: number;
  qualityScore: number;
  trending: boolean;
  shareImage: string | null;
  shareImageAlt: string | null;
  publishedAt: Date | string | number | null;
  lastVerifiedAt: Date | string | number | null;
  updatedAt: Date | string | number;
  categories: AiTermTaxonomyItem[];
  tags: AiTermTaxonomyItem[];
};

export type AiTermRelationSummary = {
  term: string;
  termZh: string | null;
  slug: string;
  relationType: AiTermRelationType;
  description: string | null;
  sortOrder: number;
};

export type AiTermDetail = AiTermSummary & {
  translationKey: string;
  beginnerNotes: unknown;
  contentMd: string;
  contentVersion: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  canonicalUrl: string | null;
  robots: string | null;
  metadata: unknown;
  sourceNote: string | null;
  aiAssisted: boolean;
  humanReviewed: boolean;
  viewCount: number;
  relations: AiTermRelationSummary[];
};

export type AdminAiTermItem = AiTermSummary & {
  translationKey: string;
  status: AiTermStatus;
  visibility: AiTermVisibility;
  sortOrder: number;
  viewCount: number;
  sourceNote: string | null;
  aiAssisted: boolean;
  humanReviewed: boolean;
  createdAt: Date | string | number;
};

export type AdminAiTermDetail = AiTermDetail & {
  status: AiTermStatus;
  visibility: AiTermVisibility;
  sortOrder: number;
  createdAt: Date | string | number;
};

export type ListPublicAiTermsOptions = {
  locale?: AiTermLocale;
  q?: string;
  categorySlug?: string;
  tagSlug?: string;
  sort?: "featured" | "latest" | "heat" | "quality";
  limit?: number;
  offset?: number;
};

export type ListAdminAiTermsOptions = {
  locale?: AiTermLocale | "all";
  q?: string;
  status?: AiTermStatus | "all";
  visibility?: AiTermVisibility | "all";
  limit?: number;
  offset?: number;
};

export type UpdateAiTermAdminInput = {
  id: string;
  status?: AiTermStatus;
  visibility?: AiTermVisibility;
  heatScore?: number;
  qualityScore?: number;
  trending?: boolean;
  sortOrder?: number;
  humanReviewed?: boolean;
};

export type AiTermAdminAction = "publish" | "archive" | "restore";
export type AiTermTaxonomyKind = "category" | "tag";

export type AdminAiTermTaxonomyItem = {
  id: string;
  locale: AiTermLocale;
  translationKey: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  termCount: number;
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
};

export type SaveAiTermResult = {
  id: string;
  slug: string;
  locale: AiTermLocale;
  skippedRelations: Array<{ slug: string; reason: "missing" | "self" }>;
};

export type SaveAiTermInput = {
  locale: AiTermLocale;
  translationKey: string;
  term: string;
  termZh?: string | null;
  fullName?: string | null;
  slug: string;
  shortConcept: string;
  shortDesc: string;
  tagline?: string | null;
  beginnerNotes?: unknown;
  type: AiTermType;
  difficulty: AiTermDifficulty;
  status: AiTermStatus;
  visibility: AiTermVisibility;
  heatScore?: number;
  qualityScore?: number;
  trending?: boolean;
  sortOrder?: number;
  contentMd: string;
  contentVersion?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  canonicalUrl?: string | null;
  robots?: string | null;
  shareImage?: string | null;
  shareImageAlt?: string | null;
  metadata?: unknown;
  sourceNote?: string | null;
  aiAssisted?: boolean;
  humanReviewed?: boolean;
  publishedAt?: Date | string | number | null;
  lastVerifiedAt?: Date | string | number | null;
  categories?: Array<Omit<AiTermTaxonomyItem, "id"> & { translationKey?: string }>;
  tags?: Array<Omit<AiTermTaxonomyItem, "id" | "description" | "sortOrder"> & { translationKey?: string }>;
  relations?: Array<{ slug: string; relationType: AiTermRelationType; description?: string | null; sortOrder?: number }>;
};

export type UpdateAiTermTaxonomyInput = {
  kind: AiTermTaxonomyKind;
  id: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
};

export type BulkAiTermAction = "publish" | "archive" | "restore" | "delete" | "markReviewed" | "unmarkReviewed" | "setTrending" | "unsetTrending";

function clampLimit(value: number | undefined) {
  return Math.min(Math.max(value ?? 24, 1), 100);
}

function normalizeOffset(value: number | undefined) {
  return Math.max(value ?? 0, 0);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function termIdFor(locale: AiTermLocale, slug: string) {
  return `ai-term:${locale}:${slug}`;
}

function categoryIdFor(locale: AiTermLocale, slug: string) {
  return `ai-term-category:${locale}:${slug}`;
}

function tagIdFor(locale: AiTermLocale, slug: string) {
  return `ai-term-tag:${locale}:${slug}`;
}

function relationIdFor(termId: string, relatedTermId: string, relationType: AiTermRelationType) {
  return `ai-term-relation:${termId}:${relatedTermId}:${relationType}`;
}

function stringifyJson(value: unknown) {
  return value === undefined ? null : value;
}

function parseStringList(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function serializeStringList(values: string[] | undefined) {
  const normalized = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

function toDateString(value: Date | string | number | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toDateValue(value: Date | string | number | null | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function publicVisibilityCondition() {
  return and(eq(aiTerms.status, "published"), eq(aiTerms.visibility, "public"))!;
}

function summaryFromRow(
  row: typeof aiTerms.$inferSelect,
  categoriesByTerm: Map<string, AiTermTaxonomyItem[]>,
  tagsByTerm: Map<string, AiTermTaxonomyItem[]>,
): AiTermSummary {
  return {
    id: row.id,
    locale: row.locale,
    term: row.term,
    termZh: row.termZh,
    fullName: row.fullName,
    slug: row.slug,
    shortConcept: row.shortConcept,
    shortDesc: row.shortDesc,
    tagline: row.tagline,
    type: row.type,
    difficulty: row.difficulty,
    heatScore: row.heatScore,
    qualityScore: row.qualityScore,
    trending: row.trending,
    shareImage: row.shareImage,
    shareImageAlt: row.shareImageAlt,
    publishedAt: row.publishedAt,
    lastVerifiedAt: row.lastVerifiedAt,
    updatedAt: row.updatedAt,
    categories: categoriesByTerm.get(row.id) ?? [],
    tags: tagsByTerm.get(row.id) ?? [],
  };
}

async function taxonomyForTermIds(termIds: string[]) {
  const categoriesByTerm = new Map<string, AiTermTaxonomyItem[]>();
  const tagsByTerm = new Map<string, AiTermTaxonomyItem[]>();

  if (termIds.length === 0) {
    return { categoriesByTerm, tagsByTerm };
  }

  const db = await getDb();
  const categoryRows = await db
    .select({
      termId: aiTermCategoryRelations.termId,
      id: aiTermCategories.id,
      name: aiTermCategories.name,
      slug: aiTermCategories.slug,
      description: aiTermCategories.description,
      sortOrder: aiTermCategoryRelations.sortOrder,
    })
    .from(aiTermCategoryRelations)
    .innerJoin(aiTermCategories, eq(aiTermCategoryRelations.categoryId, aiTermCategories.id))
    .where(inArray(aiTermCategoryRelations.termId, termIds))
    .orderBy(asc(aiTermCategoryRelations.sortOrder), asc(aiTermCategories.name));

  for (const row of categoryRows) {
    const list = categoriesByTerm.get(row.termId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sortOrder,
    });
    categoriesByTerm.set(row.termId, list);
  }

  const tagRows = await db
    .select({
      termId: aiTermTagRelations.termId,
      id: aiTermTags.id,
      name: aiTermTags.name,
      slug: aiTermTags.slug,
    })
    .from(aiTermTagRelations)
    .innerJoin(aiTermTags, eq(aiTermTagRelations.tagId, aiTermTags.id))
    .where(inArray(aiTermTagRelations.termId, termIds))
    .orderBy(asc(aiTermTags.name));

  for (const row of tagRows) {
    const list = tagsByTerm.get(row.termId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
    });
    tagsByTerm.set(row.termId, list);
  }

  return { categoriesByTerm, tagsByTerm };
}

async function relationSummariesForTerm(termId: string) {
  const db = await getDb();
  return db
    .select({
      term: aiTerms.term,
      termZh: aiTerms.termZh,
      slug: aiTerms.slug,
      relationType: aiTermRelations.relationType,
      description: aiTermRelations.description,
      sortOrder: aiTermRelations.sortOrder,
    })
    .from(aiTermRelations)
    .innerJoin(aiTerms, eq(aiTermRelations.relatedTermId, aiTerms.id))
    .where(eq(aiTermRelations.termId, termId))
    .orderBy(asc(aiTermRelations.sortOrder), asc(aiTerms.term));
}

function detailFromRow(
  row: typeof aiTerms.$inferSelect,
  categoriesByTerm: Map<string, AiTermTaxonomyItem[]>,
  tagsByTerm: Map<string, AiTermTaxonomyItem[]>,
  relations: AiTermRelationSummary[],
): AdminAiTermDetail {
  return {
    ...summaryFromRow(row, categoriesByTerm, tagsByTerm),
    translationKey: row.translationKey,
    beginnerNotes: row.beginnerNotesJson,
    contentMd: row.contentMd,
    contentVersion: row.contentVersion,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    seoKeywords: parseStringList(row.seoKeywords),
    canonicalUrl: row.canonicalUrl,
    robots: row.robots,
    metadata: row.metadataJson,
    sourceNote: row.sourceNote,
    aiAssisted: row.aiAssisted,
    humanReviewed: row.humanReviewed,
    viewCount: row.viewCount,
    relations,
    status: row.status,
    visibility: row.visibility,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function aiTermToMarkdown(aiTerm: AdminAiTermDetail) {
  const metadata = metadataRecord(aiTerm.metadata);
  const openGraph = metadataRecord(metadata.openGraph);
  const twitter = metadataRecord(metadata.twitter);
  const structuredData = metadata.structuredData;
  const source: Record<string, unknown> = {
    source_note: aiTerm.sourceNote ?? "",
    ai_assisted: aiTerm.aiAssisted,
    human_reviewed: aiTerm.humanReviewed,
  };

  const lastVerifiedAt = toDateString(aiTerm.lastVerifiedAt);
  const publishedAt = toDateString(aiTerm.publishedAt);

  if (lastVerifiedAt) {
    source.last_verified_at = lastVerifiedAt;
  }

  if (publishedAt) {
    source.published_at = publishedAt;
  }

  const frontmatter: Record<string, unknown> = {
    term: aiTerm.term,
    term_zh: aiTerm.termZh ?? "",
    full_name: aiTerm.fullName ?? "",
    slug: aiTerm.slug,
    locale: aiTerm.locale,
    translation_key: aiTerm.translationKey,
    short_concept: aiTerm.shortConcept,
    short_desc: aiTerm.shortDesc,
    tagline: aiTerm.tagline ?? "",
    beginner_notes: aiTerm.beginnerNotes ?? {},
    type: aiTerm.type,
    difficulty: aiTerm.difficulty,
    status: aiTerm.status,
    visibility: aiTerm.visibility,
    heat_score: aiTerm.heatScore,
    quality_score: aiTerm.qualityScore,
    trending: aiTerm.trending,
    sort_order: aiTerm.sortOrder,
    content: {
      format: "markdown",
      version: aiTerm.contentVersion,
    },
    categories: aiTerm.categories.map((category, index) => ({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sort_order: category.sortOrder ?? index + 1,
    })),
    tags: aiTerm.tags.map((tag) => ({
      name: tag.name,
      slug: tag.slug,
    })),
    relations: aiTerm.relations.map((relation) => ({
      term: relation.term,
      slug: relation.slug,
      relation_type: relation.relationType,
      description: relation.description ?? "",
      sort_order: relation.sortOrder,
    })),
    seo: {
      title: aiTerm.seoTitle ?? "",
      description: aiTerm.seoDescription ?? "",
      keywords: aiTerm.seoKeywords,
      canonical_url: aiTerm.canonicalUrl ?? "",
      robots: aiTerm.robots ?? "index, follow",
    },
    open_graph: {
      title: openGraph.title ?? aiTerm.seoTitle ?? "",
      description: openGraph.description ?? aiTerm.seoDescription ?? "",
      type: openGraph.type ?? "article",
      image: openGraph.image ?? aiTerm.shareImage ?? "",
      image_alt: openGraph.image_alt ?? aiTerm.shareImageAlt ?? "",
    },
    twitter: {
      card: twitter.card ?? "summary_large_image",
      title: twitter.title ?? aiTerm.seoTitle ?? "",
      description: twitter.description ?? aiTerm.seoDescription ?? "",
      image: twitter.image ?? aiTerm.shareImage ?? "",
    },
    source,
  };

  if (structuredData !== undefined) {
    frontmatter.structured_data = structuredData;
  }

  return matter.stringify(aiTerm.contentMd.trim(), frontmatter).trim();
}

async function termIdsForCategory(locale: AiTermLocale, categorySlug: string) {
  const db = await getDb();
  const rows = await db
    .select({ termId: aiTermCategoryRelations.termId })
    .from(aiTermCategoryRelations)
    .innerJoin(aiTermCategories, eq(aiTermCategoryRelations.categoryId, aiTermCategories.id))
    .where(and(eq(aiTermCategories.locale, locale), eq(aiTermCategories.slug, categorySlug)));

  return rows.map((row) => row.termId);
}

async function termIdsForTag(locale: AiTermLocale, tagSlug: string) {
  const db = await getDb();
  const rows = await db
    .select({ termId: aiTermTagRelations.termId })
    .from(aiTermTagRelations)
    .innerJoin(aiTermTags, eq(aiTermTagRelations.tagId, aiTermTags.id))
    .where(and(eq(aiTermTags.locale, locale), eq(aiTermTags.slug, tagSlug)));

  return rows.map((row) => row.termId);
}

export async function listPublicAiTerms(options: ListPublicAiTermsOptions = {}) {
  try {
    const db = await getDb();
    const locale = options.locale ?? "zh";
    const conditions: SQL[] = [eq(aiTerms.locale, locale), publicVisibilityCondition()];
    const q = options.q?.trim();

    if (q) {
      const pattern = `%${q}%`;
      const searchCondition = or(like(aiTerms.term, pattern), like(aiTerms.termZh, pattern), like(aiTerms.fullName, pattern), like(aiTerms.shortDesc, pattern));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (options.categorySlug) {
      const termIds = await termIdsForCategory(locale, options.categorySlug);
      if (termIds.length === 0) {
        return [];
      }
      conditions.push(inArray(aiTerms.id, termIds));
    }

    if (options.tagSlug) {
      const termIds = await termIdsForTag(locale, options.tagSlug);
      if (termIds.length === 0) {
        return [];
      }
      conditions.push(inArray(aiTerms.id, termIds));
    }

    const orderBy =
      options.sort === "latest"
        ? [desc(aiTerms.publishedAt), asc(aiTerms.term)]
        : options.sort === "heat"
          ? [desc(aiTerms.heatScore), asc(aiTerms.term)]
          : options.sort === "quality"
            ? [desc(aiTerms.qualityScore), asc(aiTerms.term)]
            : [desc(aiTerms.trending), asc(aiTerms.sortOrder), asc(aiTerms.term)];

    const rows = await db
      .select()
      .from(aiTerms)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(clampLimit(options.limit))
      .offset(normalizeOffset(options.offset));

    const { categoriesByTerm, tagsByTerm } = await taxonomyForTermIds(rows.map((row) => row.id));
    return rows.map((row) => summaryFromRow(row, categoriesByTerm, tagsByTerm));
  } catch {
    return [];
  }
}

export async function listAdminAiTerms(options: ListAdminAiTermsOptions = {}) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const q = options.q?.trim();

  if (options.locale && options.locale !== "all") {
    conditions.push(eq(aiTerms.locale, options.locale));
  }

  if (options.status && options.status !== "all") {
    conditions.push(eq(aiTerms.status, options.status));
  }

  if (options.visibility && options.visibility !== "all") {
    conditions.push(eq(aiTerms.visibility, options.visibility));
  }

  if (q) {
    const pattern = `%${q}%`;
    const searchCondition = or(like(aiTerms.term, pattern), like(aiTerms.termZh, pattern), like(aiTerms.fullName, pattern), like(aiTerms.slug, pattern));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const rows = await db
    .select()
    .from(aiTerms)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiTerms.updatedAt), asc(aiTerms.term))
    .limit(clampLimit(options.limit))
    .offset(normalizeOffset(options.offset));
  const { categoriesByTerm, tagsByTerm } = await taxonomyForTermIds(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...summaryFromRow(row, categoriesByTerm, tagsByTerm),
    translationKey: row.translationKey,
    status: row.status,
    visibility: row.visibility,
    sortOrder: row.sortOrder,
    viewCount: row.viewCount,
    sourceNote: row.sourceNote,
    aiAssisted: row.aiAssisted,
    humanReviewed: row.humanReviewed,
    createdAt: row.createdAt,
  })) satisfies AdminAiTermItem[];
}

export async function getPublicAiTerm(locale: AiTermLocale, slug: string) {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(aiTerms)
      .where(and(eq(aiTerms.locale, locale), eq(aiTerms.slug, slug), publicVisibilityCondition()))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return null;
    }

    const { categoriesByTerm, tagsByTerm } = await taxonomyForTermIds([row.id]);
    const relationRows = await db
      .select({
        term: aiTerms.term,
        termZh: aiTerms.termZh,
        slug: aiTerms.slug,
        relationType: aiTermRelations.relationType,
        description: aiTermRelations.description,
        sortOrder: aiTermRelations.sortOrder,
      })
      .from(aiTermRelations)
      .innerJoin(aiTerms, eq(aiTermRelations.relatedTermId, aiTerms.id))
      .where(and(eq(aiTermRelations.termId, row.id), eq(aiTerms.locale, locale), publicVisibilityCondition()))
      .orderBy(asc(aiTermRelations.sortOrder), asc(aiTerms.term));

    return {
      ...summaryFromRow(row, categoriesByTerm, tagsByTerm),
      translationKey: row.translationKey,
      beginnerNotes: row.beginnerNotesJson,
      contentMd: row.contentMd,
      contentVersion: row.contentVersion,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      seoKeywords: parseStringList(row.seoKeywords),
      canonicalUrl: row.canonicalUrl,
      robots: row.robots,
      metadata: row.metadataJson,
      sourceNote: row.sourceNote,
      aiAssisted: row.aiAssisted,
      humanReviewed: row.humanReviewed,
      viewCount: row.viewCount,
      relations: relationRows,
    } satisfies AiTermDetail;
  } catch {
    return null;
  }
}

export async function getAdminAiTerm(locale: AiTermLocale, slug: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(aiTerms)
    .where(and(eq(aiTerms.locale, locale), eq(aiTerms.slug, slug)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return null;
  }

  const { categoriesByTerm, tagsByTerm } = await taxonomyForTermIds([row.id]);
  const relations = await relationSummariesForTerm(row.id);
  return detailFromRow(row, categoriesByTerm, tagsByTerm, relations);
}

export async function getAdminAiTermById(id: string) {
  const db = await getDb();
  const rows = await db.select().from(aiTerms).where(eq(aiTerms.id, id)).limit(1);
  const row = rows[0];

  if (!row) {
    return null;
  }

  const { categoriesByTerm, tagsByTerm } = await taxonomyForTermIds([row.id]);
  const relations = await relationSummariesForTerm(row.id);
  return detailFromRow(row, categoriesByTerm, tagsByTerm, relations);
}

export async function listAiTermCategories(locale: AiTermLocale = "zh") {
  try {
    const db = await getDb();
    return await db
      .select({
        id: aiTermCategories.id,
        name: aiTermCategories.name,
        slug: aiTermCategories.slug,
        description: aiTermCategories.description,
        sortOrder: aiTermCategories.sortOrder,
      })
      .from(aiTermCategories)
      .where(eq(aiTermCategories.locale, locale))
      .orderBy(asc(aiTermCategories.sortOrder), asc(aiTermCategories.name));
  } catch {
    return [];
  }
}

export async function listAdminAiTermTaxonomy(options: { locale?: AiTermLocale | "all"; kind?: AiTermTaxonomyKind | "all" } = {}) {
  const db = await getDb();
  const locale = options.locale ?? "all";
  const kind = options.kind ?? "all";
  const items: Array<AdminAiTermTaxonomyItem & { kind: AiTermTaxonomyKind }> = [];

  if (kind === "all" || kind === "category") {
    const conditions = locale === "all" ? undefined : eq(aiTermCategories.locale, locale);
    const rows = await db.select().from(aiTermCategories).where(conditions).orderBy(asc(aiTermCategories.locale), asc(aiTermCategories.sortOrder), asc(aiTermCategories.name));
    const relationRows = await db.select({ categoryId: aiTermCategoryRelations.categoryId }).from(aiTermCategoryRelations);
    const counts = new Map<string, number>();
    for (const row of relationRows) {
      counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
    }

    items.push(
      ...rows.map((row) => ({
        kind: "category" as const,
        id: row.id,
        locale: row.locale,
        translationKey: row.translationKey,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sortOrder,
        termCount: counts.get(row.id) ?? 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    );
  }

  if (kind === "all" || kind === "tag") {
    const conditions = locale === "all" ? undefined : eq(aiTermTags.locale, locale);
    const rows = await db.select().from(aiTermTags).where(conditions).orderBy(asc(aiTermTags.locale), asc(aiTermTags.name));
    const relationRows = await db.select({ tagId: aiTermTagRelations.tagId }).from(aiTermTagRelations);
    const counts = new Map<string, number>();
    for (const row of relationRows) {
      counts.set(row.tagId, (counts.get(row.tagId) ?? 0) + 1);
    }

    items.push(
      ...rows.map((row) => ({
        kind: "tag" as const,
        id: row.id,
        locale: row.locale,
        translationKey: row.translationKey,
        name: row.name,
        slug: row.slug,
        description: null,
        sortOrder: 0,
        termCount: counts.get(row.id) ?? 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    );
  }

  return items;
}

export async function updateAiTermTaxonomy(input: UpdateAiTermTaxonomyInput) {
  const db = await getDb();
  const timestamp = new Date();

  if (input.kind === "category") {
    const set: Partial<typeof aiTermCategories.$inferInsert> = { updatedAt: timestamp };
    if (input.name !== undefined) set.name = input.name;
    if (input.description !== undefined) set.description = input.description;
    if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
    const rows = await db.update(aiTermCategories).set(set).where(eq(aiTermCategories.id, input.id)).returning();
    return rows[0] ?? null;
  }

  const set: Partial<typeof aiTermTags.$inferInsert> = { updatedAt: timestamp };
  if (input.name !== undefined) set.name = input.name;
  const rows = await db.update(aiTermTags).set(set).where(eq(aiTermTags.id, input.id)).returning();
  return rows[0] ?? null;
}

export async function mergeAiTermTaxonomy(kind: AiTermTaxonomyKind, sourceId: string, targetId: string) {
  if (sourceId === targetId) {
    return { merged: 0, deleted: false };
  }

  const db = await getDb();

  if (kind === "category") {
    const sourceRows = await db.select().from(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.categoryId, sourceId));
    for (const row of sourceRows) {
      await db
        .insert(aiTermCategoryRelations)
        .values({ termId: row.termId, categoryId: targetId, sortOrder: row.sortOrder })
        .onConflictDoNothing();
    }
    await db.delete(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.categoryId, sourceId));
    await db.delete(aiTermCategories).where(eq(aiTermCategories.id, sourceId));
    return { merged: sourceRows.length, deleted: true };
  }

  const sourceRows = await db.select().from(aiTermTagRelations).where(eq(aiTermTagRelations.tagId, sourceId));
  for (const row of sourceRows) {
    await db.insert(aiTermTagRelations).values({ termId: row.termId, tagId: targetId }).onConflictDoNothing();
  }
  await db.delete(aiTermTagRelations).where(eq(aiTermTagRelations.tagId, sourceId));
  await db.delete(aiTermTags).where(eq(aiTermTags.id, sourceId));
  return { merged: sourceRows.length, deleted: true };
}

export async function deleteAiTermTaxonomy(kind: AiTermTaxonomyKind, id: string) {
  const db = await getDb();
  const relations =
    kind === "category"
      ? await db.select({ id: aiTermCategoryRelations.termId }).from(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.categoryId, id)).limit(1)
      : await db.select({ id: aiTermTagRelations.termId }).from(aiTermTagRelations).where(eq(aiTermTagRelations.tagId, id)).limit(1);

  if (relations.length > 0) {
    return { deleted: false, reason: "in_use" as const };
  }

  if (kind === "category") {
    await db.delete(aiTermCategories).where(eq(aiTermCategories.id, id));
  } else {
    await db.delete(aiTermTags).where(eq(aiTermTags.id, id));
  }

  return { deleted: true };
}

export async function saveAiTerm(input: SaveAiTermInput): Promise<SaveAiTermResult> {
  const db = await getDb();
  const timestamp = new Date();
  const termId = termIdFor(input.locale, input.slug);
  const skippedRelations: SaveAiTermResult["skippedRelations"] = [];

  await db
    .insert(aiTerms)
    .values({
      id: termId,
      locale: input.locale,
      translationKey: input.translationKey,
      term: input.term,
      termZh: input.termZh ?? null,
      fullName: input.fullName ?? null,
      slug: input.slug,
      shortConcept: input.shortConcept,
      shortDesc: input.shortDesc,
      tagline: input.tagline ?? null,
      beginnerNotesJson: stringifyJson(input.beginnerNotes),
      type: input.type,
      difficulty: input.difficulty,
      status: input.status,
      visibility: input.visibility,
      heatScore: input.heatScore ?? 0,
      qualityScore: input.qualityScore ?? 0,
      trending: input.trending ?? false,
      sortOrder: input.sortOrder ?? 0,
      contentMd: input.contentMd,
      contentFormat: "markdown",
      contentVersion: input.contentVersion ?? "ai-term-md-v1",
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      seoKeywords: serializeStringList(input.seoKeywords),
      canonicalUrl: input.canonicalUrl ?? null,
      robots: input.robots ?? null,
      shareImage: input.shareImage ?? null,
      shareImageAlt: input.shareImageAlt ?? null,
      metadataJson: stringifyJson(input.metadata),
      sourceNote: input.sourceNote ?? null,
      aiAssisted: input.aiAssisted ?? true,
      humanReviewed: input.humanReviewed ?? false,
      viewCount: 0,
      publishedAt: toDateValue(input.publishedAt),
      lastVerifiedAt: toDateValue(input.lastVerifiedAt),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [aiTerms.locale, aiTerms.slug],
      set: {
        translationKey: input.translationKey,
        term: input.term,
        termZh: input.termZh ?? null,
        fullName: input.fullName ?? null,
        shortConcept: input.shortConcept,
        shortDesc: input.shortDesc,
        tagline: input.tagline ?? null,
        beginnerNotesJson: stringifyJson(input.beginnerNotes),
        type: input.type,
        difficulty: input.difficulty,
        status: input.status,
        visibility: input.visibility,
        heatScore: input.heatScore ?? 0,
        qualityScore: input.qualityScore ?? 0,
        trending: input.trending ?? false,
        sortOrder: input.sortOrder ?? 0,
        contentMd: input.contentMd,
        contentVersion: input.contentVersion ?? "ai-term-md-v1",
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        seoKeywords: serializeStringList(input.seoKeywords),
        canonicalUrl: input.canonicalUrl ?? null,
        robots: input.robots ?? null,
        shareImage: input.shareImage ?? null,
        shareImageAlt: input.shareImageAlt ?? null,
        metadataJson: stringifyJson(input.metadata),
        sourceNote: input.sourceNote ?? null,
        aiAssisted: input.aiAssisted ?? true,
        humanReviewed: input.humanReviewed ?? false,
        publishedAt: toDateValue(input.publishedAt),
        lastVerifiedAt: toDateValue(input.lastVerifiedAt),
        updatedAt: timestamp,
      },
    });

  await db.delete(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.termId, termId));

  for (const [index, category] of (input.categories ?? []).entries()) {
    const categorySlug = category.slug || slugify(category.name);
    const categoryId = categoryIdFor(input.locale, categorySlug);

    await db
      .insert(aiTermCategories)
      .values({
        id: categoryId,
        locale: input.locale,
        translationKey: category.translationKey ?? categorySlug,
        name: category.name,
        slug: categorySlug,
        description: category.description ?? null,
        icon: null,
        sortOrder: category.sortOrder ?? index + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [aiTermCategories.locale, aiTermCategories.slug],
        set: {
          name: category.name,
          description: category.description ?? null,
          sortOrder: category.sortOrder ?? index + 1,
          updatedAt: timestamp,
        },
      });

    await db.insert(aiTermCategoryRelations).values({ termId, categoryId, sortOrder: index + 1 }).onConflictDoNothing();
  }

  await db.delete(aiTermTagRelations).where(eq(aiTermTagRelations.termId, termId));

  for (const tag of input.tags ?? []) {
    const tagSlug = tag.slug || slugify(tag.name);
    const tagId = tagIdFor(input.locale, tagSlug);

    await db
      .insert(aiTermTags)
      .values({
        id: tagId,
        locale: input.locale,
        translationKey: tag.translationKey ?? tagSlug,
        name: tag.name,
        slug: tagSlug,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [aiTermTags.locale, aiTermTags.slug],
        set: {
          name: tag.name,
          updatedAt: timestamp,
        },
      });

    await db.insert(aiTermTagRelations).values({ termId, tagId }).onConflictDoNothing();
  }

  await db.delete(aiTermRelations).where(eq(aiTermRelations.termId, termId));

  for (const relation of input.relations ?? []) {
    const rows = await db
      .select({ id: aiTerms.id })
      .from(aiTerms)
      .where(and(eq(aiTerms.locale, input.locale), eq(aiTerms.slug, relation.slug)))
      .limit(1);
    const relatedTermId = rows[0]?.id;

    if (!relatedTermId) {
      skippedRelations.push({ slug: relation.slug, reason: "missing" });
      continue;
    }

    if (relatedTermId === termId) {
      skippedRelations.push({ slug: relation.slug, reason: "self" });
      continue;
    }

    await db
      .insert(aiTermRelations)
      .values({
        id: relationIdFor(termId, relatedTermId, relation.relationType),
        termId,
        relatedTermId,
        relationType: relation.relationType,
        description: relation.description ?? null,
        sortOrder: relation.sortOrder ?? 0,
        createdAt: timestamp,
      })
      .onConflictDoNothing();
  }

  return { id: termId, slug: input.slug, locale: input.locale, skippedRelations };
}

export async function updateAiTermAdminFields(input: UpdateAiTermAdminInput) {
  const db = await getDb();
  const set: Partial<typeof aiTerms.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.status) {
    set.status = input.status;
    if (input.status === "published") {
      set.publishedAt = new Date();
    }
  }

  if (input.visibility) {
    set.visibility = input.visibility;
  }

  if (typeof input.heatScore === "number") {
    set.heatScore = Math.min(Math.max(input.heatScore, 0), 100);
  }

  if (typeof input.qualityScore === "number") {
    set.qualityScore = Math.min(Math.max(input.qualityScore, 0), 100);
  }

  if (typeof input.trending === "boolean") {
    set.trending = input.trending;
  }

  if (typeof input.sortOrder === "number") {
    set.sortOrder = input.sortOrder;
  }

  if (typeof input.humanReviewed === "boolean") {
    set.humanReviewed = input.humanReviewed;
  }

  const rows = await db.update(aiTerms).set(set).where(eq(aiTerms.id, input.id)).returning({
    id: aiTerms.id,
    slug: aiTerms.slug,
    locale: aiTerms.locale,
  });

  return rows[0] ?? null;
}

export async function updateAiTermFromMarkdown(locale: AiTermLocale, slug: string, markdown: string) {
  const parsed = await import("./ai-term-import").then((module) => module.parseAiTermImport(markdown));

  if (parsed.aiTerm.locale !== locale || parsed.aiTerm.slug !== slug) {
    return {
      error: "Frontmatter 中的 locale/slug 与当前词条路径不一致。",
      hint: "为避免公开 URL 意外变更，后台编辑接口暂不支持直接修改 locale 或 slug。",
      status: 409,
    } as const;
  }

  const saved = await saveAiTerm(parsed.aiTerm);
  const aiTerm = await getAdminAiTerm(locale, slug);

  return {
    aiTerm,
    markdown: aiTerm ? aiTermToMarkdown(aiTerm) : markdown,
    importWarnings: [
      ...parsed.warnings,
      ...saved.skippedRelations.map((relation) =>
        relation.reason === "self"
          ? `关联词条 ${relation.slug} 指向自身，已跳过。`
          : `关联词条 ${relation.slug} 未匹配到已存在词条，MVP 阶段已跳过。`,
      ),
    ],
  };
}

export async function applyAiTermAdminAction(locale: AiTermLocale, slug: string, action: AiTermAdminAction) {
  const db = await getDb();
  const timestamp = new Date();
  const next =
    action === "publish"
      ? { status: "published" as const, visibility: "public" as const, publishedAt: timestamp }
      : action === "restore"
        ? { status: "published" as const, visibility: "public" as const }
        : { status: "archived" as const, visibility: "hidden" as const };

  const rows = await db
    .update(aiTerms)
    .set({
      ...next,
      updatedAt: timestamp,
    })
    .where(and(eq(aiTerms.locale, locale), eq(aiTerms.slug, slug)))
    .returning({
      id: aiTerms.id,
      slug: aiTerms.slug,
      locale: aiTerms.locale,
      status: aiTerms.status,
      visibility: aiTerms.visibility,
    });

  return rows[0] ?? null;
}

export async function deleteAiTerm(locale: AiTermLocale, slug: string) {
  const db = await getDb();
  const existing = await getAdminAiTerm(locale, slug);

  if (!existing) {
    return null;
  }

  await db.delete(aiTermRelations).where(or(eq(aiTermRelations.termId, existing.id), eq(aiTermRelations.relatedTermId, existing.id)));
  await db.delete(aiTerms).where(eq(aiTerms.id, existing.id));

  return existing;
}

export async function bulkApplyAiTermAction(ids: string[], action: BulkAiTermAction) {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const results: Array<{ id: string; ok: boolean; message?: string; aiTerm?: AdminAiTermDetail }> = [];

  for (const id of uniqueIds) {
    const aiTerm = await getAdminAiTermById(id);

    if (!aiTerm) {
      results.push({ id, ok: false, message: "AI 词条不存在。" });
      continue;
    }

    try {
      if (action === "delete") {
        if (aiTerm.status !== "archived") {
          results.push({ id, ok: false, message: "只有已归档词条允许物理删除。" });
          continue;
        }
        await deleteAiTerm(aiTerm.locale, aiTerm.slug);
        results.push({ id, ok: true, aiTerm });
        continue;
      }

      if (action === "publish" || action === "archive" || action === "restore") {
        await applyAiTermAdminAction(aiTerm.locale, aiTerm.slug, action);
      } else {
        await updateAiTermAdminFields({
          id,
          humanReviewed: action === "markReviewed" ? true : action === "unmarkReviewed" ? false : undefined,
          trending: action === "setTrending" ? true : action === "unsetTrending" ? false : undefined,
        });
      }

      results.push({ id, ok: true, aiTerm });
    } catch (error) {
      results.push({ id, ok: false, message: error instanceof Error ? error.message : "批量操作失败。" });
    }
  }

  return results;
}
