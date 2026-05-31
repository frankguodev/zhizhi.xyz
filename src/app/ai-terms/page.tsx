import type { Metadata } from "next";
import { AiTermsPage } from "@/components/content/ai-terms-page";
import { fallbackAiTermCategories, fallbackAiTermSummaries } from "@/lib/ai-term-fallback";
import { countPublicAiTerms, countPublicAiTermsByCategory, listAiTermCategories, listPublicAiTerms, type AiTermDifficulty } from "@/lib/ai-terms";
import { siteConfig } from "@/lib/site";

const description = "用普通人能读懂的方式整理 AI 术语、概念、工具和新兴说法。";

export const metadata: Metadata = {
  title: `AI 词条｜${siteConfig.name}`,
  description,
  alternates: {
    canonical: "/ai-terms",
    languages: {
      "zh-CN": "/ai-terms",
      en: "/en/ai-terms",
    },
  },
  openGraph: {
    title: `AI 词条｜${siteConfig.name}`,
    description,
    url: "/ai-terms",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `AI 词条｜${siteConfig.name}`,
    description,
  },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const SORTS = ["featured", "latest", "heat"] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

type AiTermsRouteProps = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
    difficulty?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function AiTermsRoute({ searchParams }: AiTermsRouteProps) {
  const params = await searchParams;
  const query = params?.q?.trim() || undefined;
  const categorySlug = params?.category?.trim() || undefined;
  const difficulty = (DIFFICULTIES as readonly string[]).includes(params?.difficulty ?? "") ? (params?.difficulty as AiTermDifficulty) : undefined;
  const sort = (SORTS as readonly string[]).includes(params?.sort ?? "") ? (params?.sort as (typeof SORTS)[number]) : "featured";
  const page = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const filter = { locale: "zh" as const, q: query, categorySlug, difficulty };
  const [termsResult, totalResult, categoriesResult, categoryCountsResult, popularResult] = await Promise.all([
    listPublicAiTerms({ ...filter, sort, limit: PAGE_SIZE, offset }),
    countPublicAiTerms(filter),
    listAiTermCategories("zh"),
    countPublicAiTermsByCategory("zh"),
    listPublicAiTerms({ locale: "zh", sort: "featured", limit: 14 }),
  ]);

  let terms = termsResult;
  let total = totalResult;
  let categories = categoriesResult.map((category) => ({ name: category.name, slug: category.slug }));
  let categoryCounts = categoryCountsResult;
  let popularTerms = popularResult.map((term) => ({ term: term.term, slug: term.slug }));

  // 调试回退：无真实数据且未筛选时用 fixture（接入真实 D1 后自动覆盖）。
  if (total === 0 && !query && !categorySlug && !difficulty) {
    total = fallbackAiTermSummaries.length;
    terms = fallbackAiTermSummaries.slice(offset, offset + PAGE_SIZE);
    if (categories.length === 0) {
      categories = fallbackAiTermCategories;
      categoryCounts = Object.fromEntries(fallbackAiTermCategories.map((category) => [category.slug, fallbackAiTermSummaries.length]));
    }
  }
  // 热门词条单独兜底：无论筛选状态如何，DB 查不到时总用 fallback 填充。
  if (popularTerms.length === 0) {
    popularTerms = fallbackAiTermSummaries.map((term) => ({ term: term.term, slug: term.slug }));
  }

  return (
    <AiTermsPage
      categories={categories}
      categoryCounts={categoryCounts}
      categorySlug={categorySlug}
      difficulty={difficulty}
      locale="zh"
      page={page}
      pageSize={PAGE_SIZE}
      popularTerms={popularTerms}
      query={query}
      sort={sort}
      terms={terms}
      total={total}
    />
  );
}
