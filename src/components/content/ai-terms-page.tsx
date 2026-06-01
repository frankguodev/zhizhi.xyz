import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame, Search, TrendingUp, X } from "lucide-react";
import { ArticleFilterSelect } from "@/components/content/article-filter-select";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { AiTermSummary } from "@/lib/ai-terms";
import { cn } from "@/lib/utils";
import { siteConfig, type Locale } from "@/lib/site";

// locale 保留在 props 中供数据层（分类查询）使用，UI 文本固定中文

type CategoryOption = { name: string; slug: string };

type AiTermsPageProps = {
  categories: CategoryOption[];
  categoryCounts?: Record<string, number>;
  categorySlug?: string;
  difficulty?: string;
  locale: Locale;
  page: number;
  pageSize: number;
  popularTerms: { term: string; slug: string }[];
  query?: string;
  sort: string;
  terms: AiTermSummary[];
  total: number;
};

type Copy = {
  currentPath: string;
  eyebrow: string;
  titleStart: string;
  titleAccent: string;
  description: string;
  searchPlaceholder: string;
  searchLabel: string;
  clearSearch: string;
  clearAll: string;
  popular: string;
  resultCount: (count: number) => string;
  sortLabel: string;
  sort: { featured: string; latest: string; heat: string };
  filterAll: string;
  filterSubmit: string;
  categoryLabel: string;
  difficultyLabel: string;
  difficulties: { beginner: string; intermediate: string; advanced: string };
  heat: (value: number) => string;
  trending: string;
  noResults: string;
  noResultsHint: string;
  paginationLabel: string;
  prev: string;
  next: string;
  pageStatus: (page: number, totalPages: number) => string;
};

const copy: Copy = {
  currentPath: "/ai-terms",
  eyebrow: "AI 词条",
  titleStart: "理解 AI 世界的",
  titleAccent: "常用语言",
  description: "把 AI 术语、概念、工具和新兴说法，用普通人能读懂的方式整理成一张安静的知识地图。",
  searchPlaceholder: "搜索 AI 词条、概念、工具...",
  searchLabel: "搜索词条",
  clearSearch: "清除搜索",
  clearAll: "清除全部",
  popular: "热门",
  resultCount: (count) => `共 ${count.toLocaleString("zh-CN")} 个词条`,
  sortLabel: "排序",
  sort: { featured: "趋势", latest: "最新", heat: "最热" },
  filterAll: "全部",
  filterSubmit: "筛选",
  categoryLabel: "分类",
  difficultyLabel: "难度",
  difficulties: { beginner: "入门", intermediate: "进阶", advanced: "高阶" },
  heat: (value) => `热度 ${Math.max(0, value)}`,
  trending: "趋势",
  noResults: "没有匹配的词条",
  noResultsHint: "可以换个关键词，或清除筛选条件重新浏览。后台发布词条后会自动展示真实数据。",
  paginationLabel: "分页",
  prev: "上一页",
  next: "下一页",
  pageStatus: (page, totalPages) => `第 ${page} / ${totalPages} 页`,
};

const SORT_KEYS = ["featured", "latest", "heat"] as const;
const DIFFICULTY_KEYS = ["beginner", "intermediate", "advanced"] as const;

export function aiTermPath(slug: string) {
  return `/ai-terms/${encodeURIComponent(slug)}`;
}

type HrefParams = {
  q?: string;
  category?: string;
  difficulty?: string;
  sort?: string;
  page?: number;
};

function buildHref(basePath: string, params: HrefParams) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.difficulty) sp.set("difficulty", params.difficulty);
  if (params.sort && params.sort !== "featured") sp.set("sort", params.sort);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function paginationItems(current: number, totalPages: number): Array<number | "ellipsis"> {
  const pages = new Set<number>([1, totalPages]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (const value of sorted) {
    if (value - previous > 1) items.push("ellipsis");
    items.push(value);
    previous = value;
  }
  return items;
}


function SidebarLink({ active, count, href, label }: { active: boolean; count?: number; href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        active ? "bg-accent/10 text-accent" : "text-muted hover:bg-accent/6 hover:text-foreground",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {typeof count === "number" ? (
        <span className={cn("ml-2 shrink-0 text-xs font-medium", active ? "text-accent/70" : "text-muted/60")}>{count}</span>
      ) : null}
    </Link>
  );
}

function TermCard({ term }: { term: AiTermSummary }) {
  const pageCopy = copy;
  const subtitle = term.fullName ?? (term.termZh && term.termZh !== term.term ? term.termZh : null);
  const difficultyLabel = pageCopy.difficulties[term.difficulty];

  return (
    <Link className="group block h-full min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={aiTermPath(term.slug)}>
      <article id={`term-${term.slug}`} className="home-popular-card flex h-full min-w-0 flex-col rounded-md border border-line p-5 shadow-sm transition group-hover:border-accent/30">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-lg font-semibold text-foreground transition group-hover:text-accent [overflow-wrap:anywhere]">{term.term}</h3>
          {term.trending ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
              <TrendingUp className="h-3.5 w-3.5" />
              {pageCopy.trending}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-1.5 break-words text-sm font-medium leading-6 text-muted [overflow-wrap:anywhere]">{subtitle}</p> : null}
        <p className="mt-3 line-clamp-3 min-h-16 text-sm leading-7 text-muted">{term.shortDesc}</p>
        <div className="mt-auto flex items-center border-t border-line pt-4 text-xs font-semibold text-muted">
          <span className="rounded border border-line px-1.5 py-0.5">{difficultyLabel}</span>
          {term.heatScore > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-accent" />
              {term.heatScore}
            </span>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

export function AiTermsPage({ categories, categoryCounts = {}, categorySlug, difficulty, locale, page, pageSize, popularTerms, query, sort, terms, total }: AiTermsPageProps) {
  const pageCopy = copy;
  const basePath = pageCopy.currentPath;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const hasFilter = Boolean(query || categorySlug || difficulty);

  const popularDeduped: { term: string; slug: string }[] = [];
  const seenPopular = new Set<string>();
  for (const item of popularTerms) {
    if (seenPopular.has(item.term)) continue;
    seenPopular.add(item.term);
    popularDeduped.push(item);
    if (popularDeduped.length >= 8) break;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AI 词条",
    description: pageCopy.description,
    url: `${siteConfig.url}${basePath}`,
    inLanguage: "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: terms.map((term, index) => ({
        "@type": "ListItem",
        position: offset + index + 1,
        url: `${siteConfig.url}${aiTermPath(term.slug)}`,
        name: term.term,
      })),
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader currentPath={basePath} />

      <main className="flex-1 bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

        {/* Hero + 搜索 */}
        <section className="site-grid border-b border-line" aria-labelledby="ai-terms-title">
          <div className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 md:pt-16 md:pb-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase text-accent">{pageCopy.eyebrow}</p>
              <h1 id="ai-terms-title" className="mx-auto mt-4 max-w-2xl break-words text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl md:text-5xl">
                {pageCopy.titleStart}
                <span className="text-accent"> {pageCopy.titleAccent}</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted md:text-lg">{pageCopy.description}</p>
            </div>

            <form className="mx-auto mt-7 max-w-2xl" action={basePath}>
              <label className="sr-only" htmlFor="ai-term-search">
                {pageCopy.searchLabel}
              </label>
              {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
              {difficulty ? <input type="hidden" name="difficulty" value={difficulty} /> : null}
              {sort !== "featured" ? <input type="hidden" name="sort" value={sort} /> : null}
              <div className="flex min-h-14 items-center gap-2 rounded-lg border border-line bg-paper/88 px-3 shadow-[var(--shadow-quiet)] focus-within:border-accent/55 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_12%,transparent)] sm:gap-3 sm:px-4">
                <Search className="h-5 w-5 shrink-0 text-muted" />
                <input id="ai-term-search" name="q" defaultValue={query} className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted" placeholder={pageCopy.searchPlaceholder} />
                {query ? (
                  <Link
                    href={buildHref(basePath, { category: categorySlug, difficulty, sort })}
                    aria-label={pageCopy.clearSearch}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-accent/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  >
                    <X className="h-4 w-4" />
                  </Link>
                ) : null}
                <button className="inline-flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-ink transition hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" type="submit">
                  <Search className="h-4 w-4 sm:hidden" />
                  <span className="sr-only sm:not-sr-only">{pageCopy.searchLabel}</span>
                </button>
              </div>
            </form>

            {popularDeduped.length > 0 ? (
              <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-semibold uppercase text-muted">{pageCopy.popular}</span>
                {popularDeduped.map((item) => (
                  <Link key={item.slug} href={aiTermPath(item.slug)} className="rounded-md border border-line bg-surface/50 px-2.5 py-1 text-sm font-semibold text-muted transition hover:border-accent/30 hover:text-accent">
                    {item.term}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 md:py-9">
          {/* 移动端筛选表单（桌面隐藏，使用左侧栏） */}
          <form action={basePath} className="mb-5 grid grid-cols-2 gap-3 lg:hidden">
            {query ? <input type="hidden" name="q" value={query} /> : null}
            {sort !== "featured" ? <input type="hidden" name="sort" value={sort} /> : null}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">{pageCopy.categoryLabel}</span>
              <span className="relative block">
                <ArticleFilterSelect
                  name="category"
                  value={categorySlug ?? ""}
                  placeholder={pageCopy.filterAll}
                  options={categories.map((c) => ({ label: c.name, value: c.slug }))}
                />
                <select className="sr-only" defaultValue={categorySlug ?? ""} name="category" tabIndex={-1} aria-hidden="true" data-article-filter="category">
                  <option value="">{pageCopy.filterAll}</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </span>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">{pageCopy.difficultyLabel}</span>
              <span className="relative block">
                <ArticleFilterSelect
                  name="difficulty"
                  value={difficulty ?? ""}
                  placeholder={pageCopy.filterAll}
                  options={DIFFICULTY_KEYS.map((key) => ({ label: pageCopy.difficulties[key], value: key }))}
                />
                <select className="sr-only" defaultValue={difficulty ?? ""} name="difficulty" tabIndex={-1} aria-hidden="true" data-article-filter="difficulty">
                  <option value="">{pageCopy.filterAll}</option>
                  {DIFFICULTY_KEYS.map((key) => (
                    <option key={key} value={key}>{pageCopy.difficulties[key]}</option>
                  ))}
                </select>
              </span>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              >
                {pageCopy.filterSubmit}
              </button>
              {hasFilter ? (
                <Link href={basePath} className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                  {pageCopy.clearAll}
                </Link>
              ) : null}
            </div>
          </form>

          {/* 工具条：计数 + 排序 */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="text-sm font-semibold text-muted">
              <span>{pageCopy.resultCount(total)}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <span className="hidden text-xs font-semibold uppercase text-muted sm:inline">{pageCopy.sortLabel}</span>
              <div className="inline-flex rounded-md border border-line bg-surface/60 p-0.5">
                {SORT_KEYS.map((key) => {
                  const active = sort === key;
                  return (
                    <Link
                      key={key}
                      href={buildHref(basePath, { q: query, category: categorySlug, difficulty, sort: key })}
                      aria-current={active ? "true" : undefined}
                      className={cn("rounded-[0.3rem] px-3 py-1.5 text-sm font-semibold transition", active ? "bg-accent/14 text-accent" : "text-muted hover:text-foreground")}
                    >
                      {pageCopy.sort[key]}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 双栏：左侧筛选栏（桌面） + 右侧词条网格 */}
          <div className="mt-6 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
            {/* 桌面侧栏 */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {categories.length > 0 ? (
                  <div>
                    <p className="px-3 text-xs font-semibold uppercase text-muted">{pageCopy.categoryLabel}</p>
                    <ul className="mt-1 max-h-[55vh] space-y-0.5 overflow-y-auto [scrollbar-width:thin]">
                      <li>
                        <SidebarLink active={!categorySlug} href={buildHref(basePath, { q: query, difficulty, sort })} label={pageCopy.filterAll} />
                      </li>
                      {categories.map((category) => (
                        <li key={category.slug}>
                          <SidebarLink
                            active={categorySlug === category.slug}
                            count={categoryCounts[category.slug]}
                            href={buildHref(basePath, { q: query, category: category.slug, difficulty, sort })}
                            label={category.name}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <p className="px-3 text-xs font-semibold uppercase text-muted">{pageCopy.difficultyLabel}</p>
                  <ul className="mt-1 space-y-0.5">
                    <li>
                      <SidebarLink active={!difficulty} href={buildHref(basePath, { q: query, category: categorySlug, sort })} label={pageCopy.filterAll} />
                    </li>
                    {DIFFICULTY_KEYS.map((key) => (
                      <li key={key}>
                        <SidebarLink
                          active={difficulty === key}
                          href={buildHref(basePath, { q: query, category: categorySlug, difficulty: key, sort })}
                          label={pageCopy.difficulties[key]}
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                {hasFilter ? (
                  <Link
                    href={basePath}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-accent/35 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  >
                    <X className="h-3.5 w-3.5" />
                    {pageCopy.clearAll}
                  </Link>
                ) : null}
              </div>
            </aside>

            {/* 词条网格 + 分页 */}
            <div>
              {terms.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {terms.map((term) => (
                    <TermCard key={term.slug} term={term} />
                  ))}
                </div>
              ) : (
                <div className="index-surface rounded-md border border-line p-8 text-center">
                  <h2 className="text-xl font-semibold text-foreground">{pageCopy.noResults}</h2>
                  <p className="mx-auto mt-3 max-w-2xl leading-7 text-muted">{pageCopy.noResultsHint}</p>
                </div>
              )}

              {totalPages > 1 ? (
                <nav className="mt-9 flex items-center justify-center gap-1.5" aria-label={pageCopy.paginationLabel}>
                  {currentPage > 1 ? (
                    <Link
                      href={buildHref(basePath, { q: query, category: categorySlug, difficulty, sort, page: currentPage - 1 })}
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-2.5 text-sm font-semibold text-muted transition hover:border-accent/30 hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">{pageCopy.prev}</span>
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center gap-1 rounded-md border border-line/60 px-2.5 text-sm font-semibold text-muted/40">
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">{pageCopy.prev}</span>
                    </span>
                  )}

                  <span className="px-2 text-sm font-semibold text-muted sm:hidden">{pageCopy.pageStatus(currentPage, totalPages)}</span>

                  <div className="hidden items-center gap-1.5 sm:flex">
                    {paginationItems(currentPage, totalPages).map((item, index) =>
                      item === "ellipsis" ? (
                        <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted">
                          …
                        </span>
                      ) : item === currentPage ? (
                        <span key={item} aria-current="page" className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-accent/40 bg-accent/12 px-2 text-sm font-semibold text-accent">
                          {item}
                        </span>
                      ) : (
                        <Link
                          key={item}
                          href={buildHref(basePath, { q: query, category: categorySlug, difficulty, sort, page: item })}
                          className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-line px-2 text-sm font-semibold text-muted transition hover:border-accent/30 hover:text-foreground"
                        >
                          {item}
                        </Link>
                      ),
                    )}
                  </div>

                  {currentPage < totalPages ? (
                    <Link
                      href={buildHref(basePath, { q: query, category: categorySlug, difficulty, sort, page: currentPage + 1 })}
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-2.5 text-sm font-semibold text-muted transition hover:border-accent/30 hover:text-foreground"
                    >
                      <span className="hidden sm:inline">{pageCopy.next}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center gap-1 rounded-md border border-line/60 px-2.5 text-sm font-semibold text-muted/40">
                      <span className="hidden sm:inline">{pageCopy.next}</span>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </nav>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
