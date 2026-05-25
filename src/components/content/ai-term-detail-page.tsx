import Link from "next/link";
import { ArrowLeft, BookOpenText, ChevronRight, Home, Tag } from "lucide-react";
import { ArticleReader } from "@/components/content/article-reader";
import { ArticleToc } from "@/components/content/article-toc";
import { BackToTopButton } from "@/components/content/back-to-top-button";
import type { ArticleContentBlock, ArticleTocItem } from "@/components/content/types";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { AiTermDetail, AiTermTaxonomyItem } from "@/lib/ai-terms";
import type { Locale } from "@/lib/site";

type AiTermDetailLike = Pick<
  AiTermDetail,
  "categories" | "contentMd" | "difficulty" | "fullName" | "heatScore" | "shortConcept" | "shortDesc" | "slug" | "tags" | "term" | "termZh" | "updatedAt"
>;

type AiTermDetailPageProps = {
  blocks: ArticleContentBlock[];
  locale: Locale;
  term: AiTermDetailLike;
  tocItems: ArticleTocItem[];
};

const copy = {
  zh: {
    back: "返回词条列表",
    currentPathPrefix: "/ai-terms",
    home: "首页",
    terms: "AI 词条",
    difficulty: "难度",
    heat: "热度",
    information: "词条信息",
    category: "所属世界",
    related: "相关标签",
    relatedCount: "相关标签",
    summary: "一句话理解",
    updated: "更新",
    difficulties: {
      beginner: "入门",
      intermediate: "进阶",
      advanced: "高阶",
    },
  },
  en: {
    back: "Back to AI terms",
    currentPathPrefix: "/en/ai-terms",
    home: "Home",
    terms: "AI Terms",
    difficulty: "Difficulty",
    heat: "Heat",
    information: "Term Info",
    category: "World",
    related: "Related tags",
    relatedCount: "Related tags",
    summary: "In one line",
    updated: "Updated",
    difficulties: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
  },
} satisfies Record<
  Locale,
  {
    back: string;
    category: string;
    currentPathPrefix: string;
    difficulty: string;
    difficulties: Record<AiTermDetailLike["difficulty"], string>;
    heat: string;
    home: string;
    information: string;
    related: string;
    relatedCount: string;
    summary: string;
    terms: string;
    updated: string;
  }
>;

function formatDate(value: Date | string | number, locale: Locale) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return locale === "en" ? "Recently" : "最近";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function taxonomyHref(locale: Locale, item: AiTermTaxonomyItem) {
  const base = locale === "en" ? "/en/ai-terms" : "/ai-terms";
  return `${base}?category=${encodeURIComponent(item.slug)}#all-terms`;
}

function formatHeatScore(score: number) {
  return `${score} / 100`;
}

function categoryNames(categories: AiTermTaxonomyItem[]) {
  return categories.map((category) => category.name).join(" / ");
}

export function AiTermDetailPage({ blocks, locale, term, tocItems }: AiTermDetailPageProps) {
  const pageCopy = copy[locale];
  const currentPath = `${pageCopy.currentPathPrefix}/${term.slug}`;
  const listHref = pageCopy.currentPathPrefix;
  const homeHref = locale === "en" ? "/en" : "/";
  const displaySubtitle = term.fullName || term.termZh;
  const summary = term.shortConcept || term.shortDesc;
  const description = term.shortDesc || term.shortConcept;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} currentPath={currentPath} />
      <main className="flex-1 bg-background">
        <article>
          <header className="site-grid border-b border-line">
            <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 md:py-12">
              <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold text-muted" aria-label={pageCopy.terms}>
                <Link className="inline-flex items-center gap-1 rounded-md transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={homeHref}>
                  <Home className="h-3.5 w-3.5" />
                  {pageCopy.home}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-muted/70" />
                <Link className="rounded-md transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={listHref}>
                  {pageCopy.terms}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-muted/70" />
                <span className="max-w-full truncate text-foreground">{term.term}</span>
              </nav>

              <div className="mt-9 grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0">
                  <Link href={listHref} className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-accent transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
                    <ArrowLeft className="h-4 w-4" />
                    {pageCopy.back}
                  </Link>

                  <h1 className="mt-7 max-w-4xl break-words text-[3rem] font-semibold leading-none text-foreground [overflow-wrap:anywhere] sm:text-6xl md:text-7xl">{term.term}</h1>
                  {displaySubtitle ? <p className="mt-4 max-w-3xl break-words text-lg leading-7 text-muted [overflow-wrap:anywhere] md:text-xl">{displaySubtitle}</p> : null}
                  {summary ? (
                    <div className="mt-6 max-w-3xl">
                      <p className="text-xs font-semibold uppercase text-muted">{pageCopy.summary}</p>
                      <p className="mt-2 break-words text-2xl font-semibold leading-snug text-accent [overflow-wrap:anywhere] md:text-3xl">{summary}</p>
                    </div>
                  ) : null}
                  {description && description !== summary ? <p className="mt-5 max-w-3xl text-base leading-8 text-muted md:text-lg">{description}</p> : null}

                  {term.tags.length > 0 ? (
                    <div className="mt-7 flex flex-wrap items-center gap-2" aria-label={pageCopy.related}>
                      {term.tags.map((tag) => (
                        <span key={tag.slug} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper/76 px-3 py-1.5 text-xs font-semibold text-muted shadow-sm">
                          <Tag className="h-3.5 w-3.5 text-accent" />
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <aside className="rounded-md border border-line bg-paper/82 p-4 shadow-[var(--shadow-quiet)] md:p-5" aria-label={pageCopy.information}>
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BookOpenText className="h-4 w-4 text-accent" />
                    {pageCopy.information}
                  </div>
                  <dl className="divide-y divide-line text-sm">
                    <div className="grid grid-cols-[minmax(6.5rem,0.78fr)_minmax(0,1fr)] gap-4 py-3">
                      <dt className="font-semibold text-muted">{pageCopy.category}</dt>
                      <dd className="min-w-0 text-right font-semibold text-foreground">
                        {term.categories.length > 0 ? (
                          <span className="break-words [overflow-wrap:anywhere]">{categoryNames(term.categories)}</span>
                        ) : (
                          <span>-</span>
                        )}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[minmax(6.5rem,0.78fr)_minmax(0,1fr)] gap-4 py-3">
                      <dt className="font-semibold text-muted">{pageCopy.difficulty}</dt>
                      <dd className="text-right font-semibold text-foreground">{pageCopy.difficulties[term.difficulty]}</dd>
                    </div>
                    <div className="grid grid-cols-[minmax(6.5rem,0.78fr)_minmax(0,1fr)] gap-4 py-3">
                      <dt className="font-semibold text-muted">{pageCopy.heat}</dt>
                      <dd className="text-right font-semibold text-accent">{formatHeatScore(term.heatScore)}</dd>
                    </div>
                    <div className="grid grid-cols-[minmax(6.5rem,0.78fr)_minmax(0,1fr)] gap-4 py-3">
                      <dt className="font-semibold text-muted">{pageCopy.updated}</dt>
                      <dd className="text-right font-semibold text-foreground">{formatDate(term.updatedAt, locale)}</dd>
                    </div>
                    <div className="grid grid-cols-[minmax(6.5rem,0.78fr)_minmax(0,1fr)] gap-4 py-3">
                      <dt className="font-semibold text-muted">{pageCopy.relatedCount}</dt>
                      <dd className="text-right font-semibold text-foreground">{term.tags.length}</dd>
                    </div>
                  </dl>
                  {term.categories.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {term.categories.map((category) => (
                        <Link key={category.slug} className="rounded-md border border-accent/22 bg-accent/8 px-3 py-1.5 text-xs font-semibold text-accent transition hover:border-accent/45 hover:bg-accent/12 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={taxonomyHref(locale, category)}>
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </aside>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
            <div className={tocItems.length > 0 ? "grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start" : "mx-auto max-w-4xl"}>
              <div className="min-w-0">
                <ArticleToc items={tocItems} locale={locale} variant="mobile" />
                <div className="article-reading-surface article-reading-surface-no-rail min-w-0 rounded-md border border-line px-4 py-7 sm:px-5 md:px-10 md:py-11">
                  <ArticleReader blocks={blocks} defaultMode="full" locale={locale} supportsReadingMode={false} />
                </div>
              </div>
              <ArticleToc items={tocItems} locale={locale} variant="desktop" />
            </div>
          </div>
        </article>
      </main>
      <BackToTopButton locale={locale} />
      <SiteFooter locale={locale} />
    </div>
  );
}
