import { and, asc, count, desc, eq, inArray, isNull, like, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import matter from "gray-matter";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb } from "@/db/client";
import {
  aiTermCategories,
  aiTermCategoryRelations,
  aiTermRelationCandidates,
  aiTermRelations,
  aiTerms,
} from "@/db/schema";
import { getMediaBucket, isValidAiTermMediaKey } from "@/lib/media";

export type AiTermLocale = "zh";
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
  diagramImage: string | null;
  diagramImageAlt: string | null;
  publishedAt: Date | string | number | null;
  lastVerifiedAt: Date | string | number | null;
  updatedAt: Date | string | number;
  categories: AiTermTaxonomyItem[];
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
  difficulty?: AiTermDifficulty;
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
export type AiTermTaxonomyKind = "category";

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
  skippedRelations: Array<{ slug: string; reason: "self" }>;
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
  diagramImage?: string | null;
  diagramImageAlt?: string | null;
  metadata?: unknown;
  sourceNote?: string | null;
  aiAssisted?: boolean;
  humanReviewed?: boolean;
  publishedAt?: Date | string | number | null;
  lastVerifiedAt?: Date | string | number | null;
  categories?: Array<Omit<AiTermTaxonomyItem, "id"> & { translationKey?: string }>;
  relations?: Array<{ term?: string | null; slug: string; relationType: AiTermRelationType; description?: string | null; sortOrder?: number }>;
};

export type UpdateAiTermTaxonomyInput = {
  kind: AiTermTaxonomyKind;
  id: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
};

export type BulkAiTermAction = "publish" | "archive" | "restore" | "delete" | "markReviewed" | "unmarkReviewed" | "setTrending" | "unsetTrending";

const AI_TERM_CATEGORIES_CACHE_TAG = "ai-term-categories";
const PUBLIC_AI_TERMS_CACHE_TAG = "public-ai-terms";

function revalidatePublicAiTermsCache() {
  revalidateTag(PUBLIC_AI_TERMS_CACHE_TAG, { expire: 0 });
}

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

function relationIdFor(termId: string, relatedTermSlug: string, relationType: AiTermRelationType) {
  return `ai-term-relation:${termId}:${relatedTermSlug}:${relationType}`;
}

function relationCandidateIdFor(termId: string, candidateSlug: string, relationType: AiTermRelationType) {
  return `ai-term-relation-candidate:${termId}:${candidateSlug}:${relationType}`;
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
  return and(
    eq(aiTerms.status, "published"),
    eq(aiTerms.visibility, "public"),
    or(isNull(aiTerms.publishedAt), lte(aiTerms.publishedAt, new Date())),
  )!;
}

function mediaKeyFromUrl(value: string | null | undefined) {
  if (!value?.startsWith("/media/")) return null;
  const key = value.slice("/media/".length);
  return isValidAiTermMediaKey(key) ? key : null;
}

function aiTermMediaKeys(aiTerm: Pick<AdminAiTermDetail, "shareImage" | "diagramImage" | "contentMd">) {
  const keys = new Set<string>();
  for (const value of [aiTerm.shareImage, aiTerm.diagramImage]) {
    const key = mediaKeyFromUrl(value);
    if (key) keys.add(key);
  }
  for (const match of aiTerm.contentMd.matchAll(/\/media\/([^\s)"'<>]+)/g)) {
    const key = mediaKeyFromUrl(`/media/${match[1]}`);
    if (key) keys.add(key);
  }
  return [...keys];
}

async function deleteAiTermMedia(keys: string[]) {
  if (keys.length === 0) return;
  const bucket = await getMediaBucket();
  await Promise.all(keys.map((key) => bucket.delete(key)));
}

/** 列表/摘要所需的列；避免列表查询 SELECT * 带出 contentMd、metadataJson 等大字段。 */
const aiTermSummaryColumns = {
  id: aiTerms.id,
  locale: aiTerms.locale,
  term: aiTerms.term,
  termZh: aiTerms.termZh,
  fullName: aiTerms.fullName,
  slug: aiTerms.slug,
  shortConcept: aiTerms.shortConcept,
  shortDesc: aiTerms.shortDesc,
  tagline: aiTerms.tagline,
  type: aiTerms.type,
  difficulty: aiTerms.difficulty,
  heatScore: aiTerms.heatScore,
  qualityScore: aiTerms.qualityScore,
  trending: aiTerms.trending,
  shareImage: aiTerms.shareImage,
  shareImageAlt: aiTerms.shareImageAlt,
  diagramImage: aiTerms.diagramImage,
  diagramImageAlt: aiTerms.diagramImageAlt,
  publishedAt: aiTerms.publishedAt,
  lastVerifiedAt: aiTerms.lastVerifiedAt,
  updatedAt: aiTerms.updatedAt,
} as const;

type AiTermSummaryRow = Pick<typeof aiTerms.$inferSelect, keyof typeof aiTermSummaryColumns>;

function summaryFromRow(
  row: AiTermSummaryRow,
  categoriesByTerm: Map<string, AiTermTaxonomyItem[]>,
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
    diagramImage: row.diagramImage,
    diagramImageAlt: row.diagramImageAlt,
    publishedAt: row.publishedAt,
    lastVerifiedAt: row.lastVerifiedAt,
    updatedAt: row.updatedAt,
    categories: categoriesByTerm.get(row.id) ?? [],
  };
}

async function taxonomyForTermIds(termIds: string[]) {
  const categoriesByTerm = new Map<string, AiTermTaxonomyItem[]>();

  if (termIds.length === 0) {
    return { categoriesByTerm };
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

  return { categoriesByTerm };
}

async function relationSummariesForTerm(termId: string) {
  const db = await getDb();
  const rows = await db
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

  return rows.map((row) => ({
    term: row.term,
    termZh: row.termZh,
    slug: row.slug,
    relationType: row.relationType,
    description: row.description,
    sortOrder: row.sortOrder,
  }));
}

async function relationCandidatesForTerm(termId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      candidateTerm: aiTermRelationCandidates.candidateTerm,
      candidateSlug: aiTermRelationCandidates.candidateSlug,
      relationType: aiTermRelationCandidates.relationType,
      description: aiTermRelationCandidates.description,
      sortOrder: aiTermRelationCandidates.sortOrder,
    })
    .from(aiTermRelationCandidates)
    .where(eq(aiTermRelationCandidates.termId, termId))
    .orderBy(asc(aiTermRelationCandidates.sortOrder), asc(aiTermRelationCandidates.candidateSlug));

  return rows.map((row) => ({
    term: row.candidateTerm ?? row.candidateSlug,
    termZh: null,
    slug: row.candidateSlug,
    relationType: row.relationType,
    description: row.description,
    sortOrder: row.sortOrder,
  }));
}

function detailFromRow(
  row: typeof aiTerms.$inferSelect,
  categoriesByTerm: Map<string, AiTermTaxonomyItem[]>,
  relations: AiTermRelationSummary[],
): AdminAiTermDetail {
  return {
    ...summaryFromRow(row, categoriesByTerm),
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
  const diagram = metadataRecord(metadata.diagram);
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
    diagram: {
      image: diagram.image ?? aiTerm.diagramImage ?? "",
      image_alt: diagram.image_alt ?? aiTerm.diagramImageAlt ?? "",
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

async function resolveRelationCandidatesForTerm(termId: string, locale: AiTermLocale, slug: string) {
  const db = await getDb();
  const timestamp = new Date();
  const candidateRows = await db.select().from(aiTermRelationCandidates).where(eq(aiTermRelationCandidates.candidateSlug, slug));

  for (const candidate of candidateRows) {
    if (candidate.termId === termId) {
      continue;
    }

    const sourceRows = await db.select({ locale: aiTerms.locale }).from(aiTerms).where(eq(aiTerms.id, candidate.termId)).limit(1);
    if (sourceRows[0]?.locale !== locale) {
      continue;
    }

    await db
      .insert(aiTermRelations)
      .values({
        id: relationIdFor(candidate.termId, slug, candidate.relationType),
        termId: candidate.termId,
        relatedTermId: termId,
        relationType: candidate.relationType,
        description: candidate.description ?? null,
        sortOrder: candidate.sortOrder,
        createdAt: timestamp,
      })
      .onConflictDoNothing();

    await db.update(aiTermRelationCandidates).set({ resolvedAt: timestamp }).where(eq(aiTermRelationCandidates.id, candidate.id));
  }
}

async function adminRelationsForTerm(termId: string) {
  const [relations, candidates] = await Promise.all([relationSummariesForTerm(termId), relationCandidatesForTerm(termId)]);
  return [...relations, ...candidates].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
}

/** 公开词条搜索条件：匹配词条名/中文名/全称/短描述。 */
function publicTermSearchCondition(q: string) {
  const pattern = `%${q}%`;
  return or(like(aiTerms.term, pattern), like(aiTerms.termZh, pattern), like(aiTerms.fullName, pattern), like(aiTerms.shortDesc, pattern));
}

async function buildPublicAiTermConditions(locale: AiTermLocale, options: ListPublicAiTermsOptions): Promise<SQL[] | null> {
  const conditions: SQL[] = [eq(aiTerms.locale, locale), publicVisibilityCondition()];
  const q = options.q?.trim();

  if (q) {
    const searchCondition = publicTermSearchCondition(q);
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (options.difficulty) {
    conditions.push(eq(aiTerms.difficulty, options.difficulty));
  }

  if (options.categorySlug) {
    const termIds = await termIdsForCategory(locale, options.categorySlug);
    if (termIds.length === 0) {
      return null;
    }
    conditions.push(inArray(aiTerms.id, termIds));
  }

  return conditions;
}

async function runCountPublicAiTerms(options: ListPublicAiTermsOptions = {}) {
  try {
    const db = await getDb();
    const locale = options.locale ?? "zh";
    const conditions = await buildPublicAiTermConditions(locale, options);
    if (conditions === null) {
      return 0;
    }
    const rows = await db.select({ value: count() }).from(aiTerms).where(and(...conditions));
    return Number(rows[0]?.value ?? 0);
  } catch {
    return 0;
  }
}

const cachedCountPublicAiTerms = unstable_cache(runCountPublicAiTerms, ["public-ai-terms-count"], {
  revalidate: 120,
  tags: [PUBLIC_AI_TERMS_CACHE_TAG],
});

// 带搜索词时绕过缓存：每个搜索词都会生成独立缓存条目，命中率低且膨胀缓存。
export async function countPublicAiTerms(options: ListPublicAiTermsOptions = {}) {
  return options.q?.trim() ? runCountPublicAiTerms(options) : cachedCountPublicAiTerms(options);
}

/** 分类计数选项：随当前难度/搜索词联动，但不受 categorySlug 限制（保留全部分类可见）。 */
export type CountAiTermsByCategoryOptions = {
  locale?: AiTermLocale;
  q?: string;
  difficulty?: AiTermDifficulty;
};

async function runCountPublicAiTermsByCategory(options: CountAiTermsByCategoryOptions = {}): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const locale = options.locale ?? "zh";
    const conditions: SQL[] = [eq(aiTerms.locale, locale), publicVisibilityCondition()];
    const q = options.q?.trim();
    if (q) {
      const searchCondition = publicTermSearchCondition(q);
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    if (options.difficulty) {
      conditions.push(eq(aiTerms.difficulty, options.difficulty));
    }

    const rows = await db
      .select({ slug: aiTermCategories.slug, value: count(aiTermCategoryRelations.termId) })
      .from(aiTermCategoryRelations)
      .innerJoin(aiTerms, eq(aiTermCategoryRelations.termId, aiTerms.id))
      .innerJoin(aiTermCategories, eq(aiTermCategoryRelations.categoryId, aiTermCategories.id))
      .where(and(...conditions))
      .groupBy(aiTermCategories.slug);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.slug] = Number(row.value);
    }
    return counts;
  } catch {
    return {};
  }
}

const cachedCountPublicAiTermsByCategory = unstable_cache(runCountPublicAiTermsByCategory, ["public-ai-terms-category-counts"], {
  revalidate: 120,
  tags: [PUBLIC_AI_TERMS_CACHE_TAG],
});

/** 各分类下的公开词条数（slug → count），随难度/搜索联动；带搜索词时绕过缓存。 */
export async function countPublicAiTermsByCategory(options: CountAiTermsByCategoryOptions = {}): Promise<Record<string, number>> {
  return options.q?.trim() ? runCountPublicAiTermsByCategory(options) : cachedCountPublicAiTermsByCategory(options);
}

async function runListPublicAiTerms(options: ListPublicAiTermsOptions = {}) {
  try {
    const db = await getDb();
    const locale = options.locale ?? "zh";
    const conditions = await buildPublicAiTermConditions(locale, options);
    if (conditions === null) {
      return [];
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
      .select(aiTermSummaryColumns)
      .from(aiTerms)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(clampLimit(options.limit))
      .offset(normalizeOffset(options.offset));

    const { categoriesByTerm } = await taxonomyForTermIds(rows.map((row) => row.id));
    return rows.map((row) => summaryFromRow(row, categoriesByTerm));
  } catch {
    return [];
  }
}

const cachedListPublicAiTerms = unstable_cache(runListPublicAiTerms, ["public-ai-terms-list"], {
  revalidate: 120,
  tags: [PUBLIC_AI_TERMS_CACHE_TAG],
});

// 带搜索词时绕过缓存，理由同 countPublicAiTerms。
export async function listPublicAiTerms(options: ListPublicAiTermsOptions = {}) {
  return options.q?.trim() ? runListPublicAiTerms(options) : cachedListPublicAiTerms(options);
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
  const { categoriesByTerm } = await taxonomyForTermIds(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...summaryFromRow(row, categoriesByTerm),
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

async function runGetPublicAiTerm(locale: AiTermLocale, slug: string) {
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

    const { categoriesByTerm } = await taxonomyForTermIds([row.id]);
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
      ...summaryFromRow(row, categoriesByTerm),
      translationKey: row.translationKey,
      beginnerNotes: row.beginnerNotesJson,
      contentMd: row.contentMd,
      contentVersion: row.contentVersion,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      seoKeywords: parseStringList(row.seoKeywords),
      canonicalUrl: row.canonicalUrl,
      robots: row.robots,
      diagramImage: row.diagramImage,
      diagramImageAlt: row.diagramImageAlt,
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

// 缓存详情查询：详情页 force-dynamic 但数据按词条缓存（与列表页同方案），
// 同时让单次请求内 generateMetadata 与页面组件的两次调用复用同一结果。
// 注意：经由 unstable_cache 序列化后，Date 字段会变成 ISO 字符串（AiTermDetail 类型已兼容）。
const cachedGetPublicAiTerm = unstable_cache(runGetPublicAiTerm, ["public-ai-term-detail"], {
  revalidate: 120,
  tags: [PUBLIC_AI_TERMS_CACHE_TAG],
});

export async function getPublicAiTerm(locale: AiTermLocale, slug: string) {
  // 不信任缓存的「未命中」：词条刚发布时，详情页可能在 D1 副本同步 / 标签失效生效前被访问
  // （或被列表页 <Link> 预取触发），查到 null 会被 unstable_cache 负缓存最多 120s，
  // 表现为「列表已展示但详情 404」。命中（非 null）走缓存，未命中则回源实查一次兜底。
  const cached = await cachedGetPublicAiTerm(locale, slug);
  return cached ?? runGetPublicAiTerm(locale, slug);
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

  const { categoriesByTerm } = await taxonomyForTermIds([row.id]);
  const relations = await adminRelationsForTerm(row.id);
  return detailFromRow(row, categoriesByTerm, relations);
}

export async function getAdminAiTermById(id: string) {
  const db = await getDb();
  const rows = await db.select().from(aiTerms).where(eq(aiTerms.id, id)).limit(1);
  const row = rows[0];

  if (!row) {
    return null;
  }

  const { categoriesByTerm } = await taxonomyForTermIds([row.id]);
  const relations = await adminRelationsForTerm(row.id);
  return detailFromRow(row, categoriesByTerm, relations);
}

export async function listAiTermCategories(locale: AiTermLocale = "zh") {
  return cachedAiTermCategories(locale);
}

const cachedAiTermCategories = unstable_cache(
  async (locale: AiTermLocale = "zh") => {
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
  },
  [AI_TERM_CATEGORIES_CACHE_TAG],
  { revalidate: 300, tags: [AI_TERM_CATEGORIES_CACHE_TAG] },
);

function revalidateAiTermCategoriesCache() {
  revalidateTag(AI_TERM_CATEGORIES_CACHE_TAG, { expire: 0 });
}

export async function listAiTermCategoriesUncached(locale: AiTermLocale = "zh") {
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

  return items;
}

export async function updateAiTermTaxonomy(input: UpdateAiTermTaxonomyInput) {
  const db = await getDb();
  const timestamp = new Date();

  const set: Partial<typeof aiTermCategories.$inferInsert> = { updatedAt: timestamp };
  if (input.name !== undefined) set.name = input.name;
  if (input.description !== undefined) set.description = input.description;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  const rows = await db.update(aiTermCategories).set(set).where(eq(aiTermCategories.id, input.id)).returning();
  revalidateAiTermCategoriesCache();
  return rows[0] ?? null;
}

export async function mergeAiTermTaxonomy(_kind: AiTermTaxonomyKind, sourceId: string, targetId: string) {
  if (sourceId === targetId) {
    return { merged: 0, deleted: false };
  }

  const db = await getDb();

  const sourceRows = await db.select().from(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.categoryId, sourceId));
  for (const row of sourceRows) {
    await db
      .insert(aiTermCategoryRelations)
      .values({ termId: row.termId, categoryId: targetId, sortOrder: row.sortOrder })
      .onConflictDoNothing();
  }
  await db.delete(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.categoryId, sourceId));
  await db.delete(aiTermCategories).where(eq(aiTermCategories.id, sourceId));
  revalidateAiTermCategoriesCache();
  // 合并改变了各分类词条数，需失效列表页分类计数缓存
  revalidatePublicAiTermsCache();
  return { merged: sourceRows.length, deleted: true };
}

export async function deleteAiTermTaxonomy(_kind: AiTermTaxonomyKind, id: string) {
  const db = await getDb();
  const relations = await db.select({ id: aiTermCategoryRelations.termId }).from(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.categoryId, id)).limit(1);

  if (relations.length > 0) {
    return { deleted: false, reason: "in_use" as const };
  }

  await db.delete(aiTermCategories).where(eq(aiTermCategories.id, id));
  revalidateAiTermCategoriesCache();

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
      diagramImage: input.diagramImage ?? null,
      diagramImageAlt: input.diagramImageAlt ?? null,
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
        diagramImage: input.diagramImage ?? null,
        diagramImageAlt: input.diagramImageAlt ?? null,
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
  revalidateAiTermCategoriesCache();

  await db.delete(aiTermRelations).where(eq(aiTermRelations.termId, termId));
  await db.delete(aiTermRelationCandidates).where(eq(aiTermRelationCandidates.termId, termId));

  for (const relation of input.relations ?? []) {
    const rows = await db
      .select({ id: aiTerms.id })
      .from(aiTerms)
      .where(and(eq(aiTerms.locale, input.locale), eq(aiTerms.slug, relation.slug)))
      .limit(1);
    const relatedTermId = rows[0]?.id;

    if (relatedTermId === termId) {
      skippedRelations.push({ slug: relation.slug, reason: "self" });
      continue;
    }

    if (relatedTermId) {
      await db
        .insert(aiTermRelations)
        .values({
          id: relationIdFor(termId, relation.slug, relation.relationType),
          termId,
          relatedTermId,
          relationType: relation.relationType,
          description: relation.description ?? null,
          sortOrder: relation.sortOrder ?? 0,
          createdAt: timestamp,
        })
        .onConflictDoNothing();
    } else {
      await db
        .insert(aiTermRelationCandidates)
        .values({
          id: relationCandidateIdFor(termId, relation.slug, relation.relationType),
          termId,
          candidateSlug: relation.slug,
          candidateTerm: relation.term ?? relation.slug,
          relationType: relation.relationType,
          description: relation.description ?? null,
          sortOrder: relation.sortOrder ?? 0,
          createdAt: timestamp,
          resolvedAt: null,
        })
        .onConflictDoNothing();
    }
  }

  await resolveRelationCandidatesForTerm(termId, input.locale, input.slug);
  revalidatePublicAiTermsCache();

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

  if (rows[0]) {
    await resolveRelationCandidatesForTerm(rows[0].id, rows[0].locale, rows[0].slug);
    revalidatePublicAiTermsCache();
  }

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
        `关联词条 ${relation.slug} 指向自身，已跳过。`,
      ),
    ],
  };
}

export async function applyAiTermAdminAction(locale: AiTermLocale, slug: string, action: AiTermAdminAction, options: { publishedAt?: Date | string | number } = {}) {
  const db = await getDb();
  const timestamp = new Date();
  const publishedAt = toDateValue(options.publishedAt) ?? timestamp;
  const next =
    action === "publish"
      ? { status: "published" as const, visibility: "public" as const, publishedAt }
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

  if (rows[0]) {
    revalidatePublicAiTermsCache();
  }

  return rows[0] ?? null;
}

export async function deleteAiTerm(locale: AiTermLocale, slug: string) {
  const db = await getDb();
  const existing = await getAdminAiTerm(locale, slug);

  if (!existing) {
    return null;
  }

  await deleteAiTermMedia(aiTermMediaKeys(existing));
  await db.delete(aiTermRelations).where(or(eq(aiTermRelations.termId, existing.id), eq(aiTermRelations.relatedTermId, existing.id)));
  await db.delete(aiTermRelationCandidates).where(eq(aiTermRelationCandidates.termId, existing.id));
  await db.delete(aiTermCategoryRelations).where(eq(aiTermCategoryRelations.termId, existing.id));
  await db.delete(aiTerms).where(eq(aiTerms.id, existing.id));
  revalidatePublicAiTermsCache();

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
        if (aiTerm.status !== "draft" && aiTerm.status !== "archived") {
          results.push({ id, ok: false, message: "只有草稿或已归档词条允许物理删除。" });
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
