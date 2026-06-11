import type { Metadata } from "next";
import { AiTermsPage } from "@/components/content/ai-terms-page";
import { fallbackAiTermCategories, fallbackAiTermSummaries } from "@/lib/ai-term-fallback";
import { countPublicAiTerms, countPublicAiTermsByCategory, listAiTermCategories, listPublicAiTerms, type AiTermDifficulty } from "@/lib/ai-terms";
import { defaultShareImage, siteConfig } from "@/lib/site";

const description = "用普通人能读懂的方式整理 AI 术语、概念、工具和新兴说法。";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const SORTS = ["latest", "heat"] as const;
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

export async function generateMetadata({ searchParams }: AiTermsRouteProps): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  // 分页页自引用 canonical（让深分页可收录）；其余筛选/排序统一去重到 /ai-terms。
  const canonical = page > 1 ? `/ai-terms?page=${page}` : "/ai-terms";
  const title = page > 1 ? `AI 词条 - 第 ${page} 页` : "AI 词条";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title}｜${siteConfig.name}`,
      description,
      url: canonical,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "zh_CN",
      type: "website",
      images: [defaultShareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜${siteConfig.name}`,
      description,
      images: [defaultShareImage.url],
    },
  };
}

export default async function AiTermsRoute({ searchParams }: AiTermsRouteProps) {
  const params = await searchParams;
  const query = params?.q?.trim() || undefined;
  const categorySlug = params?.category?.trim() || undefined;
  const difficulty = (DIFFICULTIES as readonly string[]).includes(params?.difficulty ?? "") ? (params?.difficulty as AiTermDifficulty) : undefined;
  const sort = (SORTS as readonly string[]).includes(params?.sort ?? "") ? (params?.sort as (typeof SORTS)[number]) : "latest";
  const page = Math.max(1, Number.parseInt(params?.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const filter = { locale: "zh" as const, q: query, categorySlug, difficulty };
  const [termsResult, totalResult, categoriesResult, categoryCountsResult, popularResult] = await Promise.all([
    listPublicAiTerms({ ...filter, sort, limit: PAGE_SIZE, offset }),
    countPublicAiTerms(filter),
    listAiTermCategories("zh"),
    // 分类计数随难度/搜索联动，但不限定 categorySlug（保留全部分类可见）。
    countPublicAiTermsByCategory({ locale: "zh", q: query, difficulty }),
    listPublicAiTerms({ locale: "zh", sort: "featured", limit: 10 }),
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
  // 按词条名去重并截断到 7（原先在组件渲染层处理）。
  const seenPopular = new Set<string>();
  popularTerms = popularTerms
    .filter((item) => {
      if (seenPopular.has(item.term)) return false;
      seenPopular.add(item.term);
      return true;
    })
    .slice(0, 7);

  return (
    <AiTermsPage
      categories={categories}
      categoryCounts={categoryCounts}
      categorySlug={categorySlug}
      difficulty={difficulty}
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
