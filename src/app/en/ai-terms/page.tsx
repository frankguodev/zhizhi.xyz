import type { Metadata } from "next";
import { AiTermsPage } from "@/components/content/ai-terms-page";
import { fallbackAiTermCategoriesEn, fallbackAiTermSummaries } from "@/lib/ai-term-fallback";
import { countPublicAiTerms, countPublicAiTermsByCategory, listAiTermCategories, listPublicAiTerms, type AiTermDifficulty } from "@/lib/ai-terms";
import { siteConfig } from "@/lib/site";

const description = "AI terms, concepts, tools, and emerging ideas explained in a calm knowledge map.";

export const metadata: Metadata = {
  title: `AI Terms | ${siteConfig.nameEn}`,
  description,
  alternates: {
    canonical: "/en/ai-terms",
    languages: {
      "zh-CN": "/ai-terms",
      en: "/en/ai-terms",
    },
  },
  openGraph: {
    title: `AI Terms | ${siteConfig.nameEn}`,
    description,
    url: "/en/ai-terms",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `AI Terms | ${siteConfig.nameEn}`,
    description,
  },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const SORTS = ["featured", "latest", "heat"] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

type EnglishAiTermsRouteProps = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
    difficulty?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function EnglishAiTermsRoute({ searchParams }: EnglishAiTermsRouteProps) {
  const params = await searchParams;
  const query = params?.q?.trim() || undefined;
  const categorySlug = params?.category?.trim() || undefined;
  const difficulty = (DIFFICULTIES as readonly string[]).includes(params?.difficulty ?? "") ? (params?.difficulty as AiTermDifficulty) : undefined;
  const sort = (SORTS as readonly string[]).includes(params?.sort ?? "") ? (params?.sort as (typeof SORTS)[number]) : "featured";
  const page = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const filter = { locale: "en" as const, q: query, categorySlug, difficulty };
  const [termsResult, totalResult, categoriesResult, categoryCountsResult, popularResult] = await Promise.all([
    listPublicAiTerms({ ...filter, sort, limit: PAGE_SIZE, offset }),
    countPublicAiTerms(filter),
    listAiTermCategories("en"),
    countPublicAiTermsByCategory("en"),
    listPublicAiTerms({ locale: "en", sort: "featured", limit: 14 }),
  ]);

  let terms = termsResult;
  let total = totalResult;
  let categories = categoriesResult.map((category) => ({ name: category.name, slug: category.slug }));
  let categoryCounts = categoryCountsResult;
  let popularTerms = popularResult.map((term) => ({ term: term.term, slug: term.slug }));

  if (total === 0 && !query && !categorySlug && !difficulty) {
    total = fallbackAiTermSummaries.length;
    terms = fallbackAiTermSummaries.slice(offset, offset + PAGE_SIZE);
    popularTerms = fallbackAiTermSummaries.map((term) => ({ term: term.term, slug: term.slug }));
    if (categories.length === 0) {
      categories = fallbackAiTermCategoriesEn;
      categoryCounts = Object.fromEntries(fallbackAiTermCategoriesEn.map((category) => [category.slug, fallbackAiTermSummaries.length]));
    }
  }

  return (
    <AiTermsPage
      categories={categories}
      categoryCounts={categoryCounts}
      categorySlug={categorySlug}
      difficulty={difficulty}
      locale="en"
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
