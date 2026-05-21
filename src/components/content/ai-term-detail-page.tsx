import Link from "next/link";
import { ArrowLeft, CalendarDays, Flame, LibraryBig, Tag } from "lucide-react";
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
    difficulty: "难度",
    heat: "热度",
    related: "相关标签",
    updated: "更新",
  },
  en: {
    back: "Back to AI terms",
    currentPathPrefix: "/en/ai-terms",
    difficulty: "Difficulty",
    heat: "Heat",
    related: "Related tags",
    updated: "Updated",
  },
} satisfies Record<
  Locale,
  {
    back: string;
    currentPathPrefix: string;
    difficulty: string;
    heat: string;
    related: string;
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

export function AiTermDetailPage({ blocks, locale, term, tocItems }: AiTermDetailPageProps) {
  const pageCopy = copy[locale];
  const currentPath = `${pageCopy.currentPathPrefix}/${term.slug}`;
  const listHref = pageCopy.currentPathPrefix;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} currentPath={currentPath} />
      <main className="flex-1 bg-background">
        <article>
          <header className="site-grid border-b border-line">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-12">
              <div className="article-reading-surface article-reading-surface-no-rail overflow-hidden rounded-md border border-line px-4 py-6 sm:px-5 md:px-10 md:py-10">
                <Link href={listHref} className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
                  <ArrowLeft className="h-4 w-4" />
                  {pageCopy.back}
                </Link>
                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
                  {term.categories.map((category) => (
                    <Link key={category.slug} className="vein-link px-2.5 py-1 text-accent transition hover:text-foreground" href={taxonomyHref(locale, category)}>
                      {category.name}
                    </Link>
                  ))}
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface/70 px-2.5 py-1">
                    <LibraryBig className="h-4 w-4 text-accent" />
                    {pageCopy.difficulty}: {term.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface/70 px-2.5 py-1">
                    <Flame className="h-4 w-4 text-accent" />
                    {pageCopy.heat}: {term.heatScore}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface/70 px-2.5 py-1">
                    <CalendarDays className="h-4 w-4 text-accent" />
                    {pageCopy.updated} {formatDate(term.updatedAt, locale)}
                  </span>
                </div>
                <h1 className="mt-6 max-w-4xl break-words text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl md:text-6xl">{term.term}</h1>
                {term.fullName || term.termZh ? <p className="mt-3 max-w-4xl text-base font-semibold leading-7 text-accent md:text-lg">{term.fullName || term.termZh}</p> : null}
                <p className="mt-4 max-w-4xl text-base leading-8 text-muted md:text-lg">{term.shortDesc || term.shortConcept}</p>
                {term.tags.length > 0 ? (
                  <div className="mt-6 flex flex-wrap items-center gap-2" aria-label={pageCopy.related}>
                    {term.tags.map((tag) => (
                      <span key={tag.slug} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper/76 px-2.5 py-1 text-xs font-semibold text-muted">
                        <Tag className="h-3.5 w-3.5 text-accent" />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-12">
            <div className={tocItems.length > 0 ? "grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start" : "mx-auto max-w-6xl"}>
              <div className="min-w-0">
                <ArticleToc items={tocItems} locale={locale} variant="mobile" />
                <div className="article-reading-surface article-reading-surface-no-rail min-w-0 rounded-md border border-line px-4 py-6 sm:px-5 md:px-10 md:py-10">
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
