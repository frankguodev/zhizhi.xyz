import { LibraryBig } from "lucide-react";
import { ArticleClearFilterLink } from "@/components/content/article-clear-filter-link";
import { ArticleFilterForm } from "@/components/content/article-filter-form";
import { ArticleFilterSelect } from "@/components/content/article-filter-select";
import { ArticleInfiniteList } from "@/components/content/article-infinite-list";
import { ArticleSearchInput } from "@/components/content/article-search-input";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { ArticleRecord } from "@/data/articles";
import { getArticleCategories, normalizeArticleCategory } from "@/lib/article-taxonomy";
import { getPublicArticles } from "@/lib/public-articles";
import type { PublicArticleSort } from "@/lib/public-article-list";
import { siteConfig, type Locale } from "@/lib/site";

type ArticlesSearchParams = {
  q?: string | string[];
  category?: string | string[];
  sort?: string | string[];
};

type ArticleIndexPageProps = {
  locale: Locale;
  searchParams: ArticlesSearchParams;
};

const copy = {
  zh: {
    currentPath: "/articles",
    action: "/articles",
    eyebrow: "全部文章",
    title: "知识文章索引",
    description: "按分类和关键词整理的公开文章入口。你可以从一个问题、一类主题或一篇常读文章开始，继续进入完整阅读。",
    readableArticles: "可读文章",
    facetSummary(categoryCount: number) {
      return `${categoryCount} 个分类可用于筛选，专题路线会继续串起更长的阅读路径。`;
    },
    search: "搜索",
    searchPlaceholder: "输入标题、摘要或分类",
    clearSearch: "清空搜索",
    category: "分类",
    allCategories: "全部分类",
    sort: "排序",
    sortPopular: "热门阅读",
    sortLatest: "最新发布",
    filter: "筛选",
    all: "全部",
    resultPrefix: "当前展示",
    resultSuffix: "篇文章",
    noArticlesTitle: "文章正在准备",
    noArticlesDescription: "发布文章后，这里会自动形成可搜索、可筛选的文章索引。",
    emptyTitle: "没有找到符合条件的文章",
    emptyDescription: "换一个关键词，或者清空分类后再看一眼。",
    loadedLabel: "已展示 {count} / {total} 篇，继续向下滚动加载更多",
    loadMoreLabel: "加载更多",
    completeLabel: "已经展示全部文章",
  },
  en: {
    currentPath: "/en/articles",
    action: "/en/articles",
    eyebrow: "All articles",
    title: "English article index",
    description: "A public article index organized by categories and keywords. Start from a question, a theme, or a frequently read article, then move into full reading.",
    readableArticles: "Readable articles",
    facetSummary(categoryCount: number) {
      return `${categoryCount} categories are available for filtering, while series routes connect longer reading paths.`;
    },
    search: "Search",
    searchPlaceholder: "Search title, summary, or category",
    clearSearch: "Clear search",
    category: "Category",
    allCategories: "All categories",
    sort: "Sort",
    sortPopular: "Popular",
    sortLatest: "Latest",
    filter: "Filter",
    all: "All",
    resultPrefix: "Showing",
    resultSuffix: "articles",
    noArticlesTitle: "English articles are in preparation",
    noArticlesDescription: "Published articles will automatically become searchable and filterable here.",
    emptyTitle: "No matching articles found",
    emptyDescription: "Try another keyword, or clear the category filter to broaden the result set.",
    loadedLabel: "Showing {count} / {total}. Keep scrolling to load more.",
    loadMoreLabel: "Load more",
    completeLabel: "All articles are visible.",
  },
} satisfies Record<
  Locale,
  {
    currentPath: string;
    action: string;
    eyebrow: string;
    title: string;
    description: string;
    readableArticles: string;
    facetSummary: (categoryCount: number) => string;
    search: string;
    searchPlaceholder: string;
    clearSearch: string;
    category: string;
    allCategories: string;
    sort: string;
    sortPopular: string;
    sortLatest: string;
    filter: string;
    all: string;
    resultPrefix: string;
    resultSuffix: string;
    noArticlesTitle: string;
    noArticlesDescription: string;
    emptyTitle: string;
    emptyDescription: string;
    loadedLabel: string;
    loadMoreLabel: string;
    completeLabel: string;
  }
>;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeFilter(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSort(value: string): PublicArticleSort {
  return value === "latest" ? "latest" : "popular";
}

function compareArticles(sort: PublicArticleSort) {
  return (a: ArticleRecord, b: ArticleRecord) => {
    if (sort === "latest") {
      return b.publishedAt.localeCompare(a.publishedAt) || (b.viewCount ?? 0) - (a.viewCount ?? 0);
    }

    return (b.viewCount ?? 0) - (a.viewCount ?? 0) || b.publishedAt.localeCompare(a.publishedAt);
  };
}

function buildItemListJsonLd(locale: Locale, articles: ArticleRecord[]) {
  const baseUrl = locale === "en" ? `${siteConfig.url}/en/articles` : `${siteConfig.url}/articles`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: locale === "en" ? "Articles" : "文章",
    url: baseUrl,
    inLanguage: locale === "en" ? "en" : "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.slice(0, 20).map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}${article.locale === "en" ? `/en/articles/${article.slug}` : `/articles/${article.slug}`}`,
        name: article.title,
      })),
    },
  };
}

export async function ArticleIndexPage({ locale, searchParams }: ArticleIndexPageProps) {
  const pageCopy = copy[locale];
  const articles = await getPublicArticles(locale);
  const query = firstParam(searchParams.q).trim().slice(0, 80);
  const rawSelectedCategory = firstParam(searchParams.category).trim().slice(0, 80);
  const selectedCategory = rawSelectedCategory ? normalizeArticleCategory(rawSelectedCategory, locale) : "";
  const sort = normalizeSort(firstParam(searchParams.sort));
  const normalizedQuery = normalizeFilter(query);
  const categories = getArticleCategories(articles, locale);
  const filteredArticles = articles
    .filter((article) => {
      const articleCategory = normalizeArticleCategory(article.category, locale);
      const matchesQuery =
        !normalizedQuery ||
        [article.title, article.summary, articleCategory].some((value) => normalizeFilter(value).includes(normalizedQuery));
      const matchesCategory = !selectedCategory || articleCategory === selectedCategory;

      return matchesQuery && matchesCategory;
    })
    .sort(compareArticles(sort));
  const hasFilters = Boolean(query || selectedCategory || sort !== "popular");
  const filterKey = `${query}:${selectedCategory}:${sort}`;
  const sortOptions = [
    { label: pageCopy.sortPopular, value: "popular" },
    { label: pageCopy.sortLatest, value: "latest" },
  ];
  const noArticles = articles.length === 0;
  const listJsonLd = buildItemListJsonLd(locale, filteredArticles);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} currentPath={pageCopy.currentPath} />

      <main className="flex-1 bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />

        <section className="site-grid" aria-labelledby="article-index-title">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
            <div className="article-reading-surface overflow-hidden rounded-md border border-line px-4 py-7 sm:px-5 md:px-9 md:py-8">
              <div className="grid gap-6 pl-0 md:grid-cols-[1fr_13rem] md:gap-8 md:pl-7">
                <div className="min-w-0">
                  <p className="eyebrow text-accent">{pageCopy.eyebrow}</p>
                  <h1 id="article-index-title" className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
                    {pageCopy.title}
                  </h1>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-muted md:text-lg">{pageCopy.description}</p>
                </div>
                <aside className="article-note-rail rounded-md border border-line p-5" aria-label={pageCopy.readableArticles}>
                  <LibraryBig className="h-7 w-7 text-accent" />
                  <p className="mt-4 text-3xl font-semibold text-foreground">{articles.length}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{pageCopy.readableArticles}</p>
                  <p className="mt-4 text-sm leading-6 text-muted">{pageCopy.facetSummary(categories.length)}</p>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-5 pb-8 sm:px-6 md:pt-6 md:pb-10" aria-labelledby="article-index-filter-title">
          <h2 id="article-index-filter-title" className="sr-only">
            {pageCopy.filter}
          </h2>
          <ArticleFilterForm key={filterKey} action={pageCopy.action} className="">
            <div className="grid gap-4 md:grid-cols-[1.35fr_0.85fr_0.75fr_auto] md:items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-muted">{pageCopy.search}</span>
                <ArticleSearchInput name="q" placeholder={pageCopy.searchPlaceholder} clearLabel={pageCopy.clearSearch} value={query} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-muted">{pageCopy.category}</span>
                <span className="relative block">
                  <ArticleFilterSelect name="category" options={categories} placeholder={pageCopy.allCategories} value={selectedCategory} />
                  <select className="sr-only" defaultValue={selectedCategory} name="category" tabIndex={-1} aria-hidden="true" data-article-filter="category">
                    <option value="">{pageCopy.allCategories}</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-muted">{pageCopy.sort}</span>
                <span className="relative block">
                  <ArticleFilterSelect allowEmpty={false} name="sort" options={sortOptions} placeholder={pageCopy.sortPopular} value={sort} />
                  <select className="sr-only" defaultValue={sort} name="sort" tabIndex={-1} aria-hidden="true" data-article-filter="sort">
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-accent/40 bg-accent/12 px-5 text-sm font-semibold text-accent shadow-sm transition hover:border-accent/55 hover:bg-accent/18 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 sm:min-w-24 sm:w-auto" type="submit">
                  {pageCopy.filter}
                </button>
                <ArticleClearFilterLink href={pageCopy.action} visible={hasFilters}>
                  {pageCopy.all}
                </ArticleClearFilterLink>
              </div>
            </div>
          </ArticleFilterForm>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              {pageCopy.resultPrefix}{" "}
              <span className="font-semibold text-foreground">{filteredArticles.length}</span>
              {" "}{pageCopy.resultSuffix}
            </p>
          </div>

          <div className="mt-5 grid gap-5">
            <ArticleInfiniteList
              key={`${filterKey}:${filteredArticles.map((article) => article.slug).join("|")}`}
              articles={filteredArticles}
              sort={sort}
              emptyTitle={noArticles ? pageCopy.noArticlesTitle : pageCopy.emptyTitle}
              emptyDescription={noArticles ? pageCopy.noArticlesDescription : pageCopy.emptyDescription}
              loadedLabel={pageCopy.loadedLabel}
              loadMoreLabel={pageCopy.loadMoreLabel}
              completeLabel={pageCopy.completeLabel}
            />
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
