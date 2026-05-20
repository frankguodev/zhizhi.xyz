import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Route, SearchX } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { PublicSeriesDetail, PublicSeriesSummary } from "@/lib/series";
import { siteConfig, type Locale } from "@/lib/site";

const copy = {
  zh: {
    currentPath: "/series",
    eyebrow: "专题路线",
    title: "专题路径地图",
    description: "专题不是文章合集，而是围绕同一问题逐步展开的学习路径。适合从一个入口进入，沿着上下文连续阅读，把零散知识接成完整脉络。",
    publishedRoutes: "已发布路径",
    routeHint: "每条路径都可以继续补文章、调整顺序和扩展主题。",
    articleCount(count: number) {
      return `${count} 篇文章`;
    },
    updatedAt(value: string) {
      return `更新于 ${value}`;
    },
    enter: "进入专题",
    emptyTitle: "还没有已发布专题",
    emptyDescription: "可以先进入文章索引阅读单篇内容，等相关主题积累稳定后，再把它们整理成连续路线。",
    backToSeries: "返回专题",
    detailEyebrow: "知识路径",
    routeNodes: "路径节点",
    minutes(value: number) {
      return `${value} 分钟`;
    },
    totalMinutes: "预计总时长",
    read: "阅读",
    detailEmptyTitle: "专题结构已建立",
    detailEmptyDescription: "专题已经创建，但相关文章还在整理或审核中。",
  },
  en: {
    currentPath: "/en/series",
    eyebrow: "Series routes",
    title: "English series map",
    description: "Series are not just grouped posts. They are routes built around one evolving topic so readers can continue with context.",
    publishedRoutes: "Published routes",
    routeHint: "Each route can grow with new articles, reordered steps, and wider scope.",
    articleCount(count: number) {
      return `${count} articles`;
    },
    updatedAt(value: string) {
      return `Updated ${value}`;
    },
    enter: "Enter route",
    emptyTitle: "No published series yet",
    emptyDescription: "Start from the article index for now. Once related topics settle, they can be connected into a continuous route.",
    backToSeries: "Back to series",
    detailEyebrow: "Series Path",
    routeNodes: "Route articles",
    minutes(value: number) {
      return `${value} min`;
    },
    totalMinutes: "Estimated total",
    read: "Read",
    detailEmptyTitle: "This route is being assembled",
    detailEmptyDescription: "Published English articles will appear here once they are attached to the route.",
  },
} satisfies Record<
  Locale,
  {
    currentPath: string;
    eyebrow: string;
    title: string;
    description: string;
    publishedRoutes: string;
    routeHint: string;
    articleCount: (count: number) => string;
    updatedAt: (value: string) => string;
    enter: string;
    emptyTitle: string;
    emptyDescription: string;
    backToSeries: string;
    detailEyebrow: string;
    routeNodes: string;
    minutes: (value: number) => string;
    totalMinutes: string;
    read: string;
    detailEmptyTitle: string;
    detailEmptyDescription: string;
  }
>;

function seriesPath(locale: Locale, slug: string) {
  return locale === "en" ? `/en/series/${slug}` : `/series/${slug}`;
}

function articlePath(locale: Locale, slug: string) {
  return locale === "en" ? `/en/articles/${slug}` : `/articles/${slug}`;
}

function coverStyle(coverImage: string | null): CSSProperties | undefined {
  const normalized = coverImage?.trim();

  if (!normalized) {
    return undefined;
  }

  return {
    backgroundImage: `linear-gradient(135deg, rgba(15, 17, 21, 0.14), rgba(20, 17, 10, 0.44)), url(${JSON.stringify(normalized)})`,
  };
}

function absoluteMediaUrl(value: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `${siteConfig.url}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

function buildSeriesListJsonLd(locale: Locale, seriesList: PublicSeriesSummary[]) {
  const pageUrl = locale === "en" ? `${siteConfig.url}/en/series` : `${siteConfig.url}/series`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: locale === "en" ? "Series" : "专题",
    description: copy[locale].description,
    url: pageUrl,
    inLanguage: locale === "en" ? "en" : "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: seriesList.slice(0, 20).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}${seriesPath(locale, item.slug)}`,
        name: item.title,
        description: item.description,
      })),
    },
  };
}

function buildSeriesDetailJsonLd(locale: Locale, item: PublicSeriesDetail, totalReadingMinutes: number) {
  const detailUrl = `${siteConfig.url}${seriesPath(locale, item.slug)}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: item.title,
      description: item.description,
      url: detailUrl,
      image: absoluteMediaUrl(item.coverImage),
      inLanguage: locale === "en" ? "en" : "zh-CN",
      timeRequired: `PT${totalReadingMinutes}M`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: item.articles.length,
        itemListElement: item.articles.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteConfig.url}${articlePath(locale, article.slug)}`,
          name: article.title,
          description: article.summary,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: locale === "en" ? "Series" : "专题",
          item: `${siteConfig.url}${copy[locale].currentPath}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: item.title,
          item: detailUrl,
        },
      ],
    },
  ];
}

function CoverMark({ coverImage, title }: { coverImage: string | null; title: string }) {
  const style = coverStyle(coverImage);

  if (style) {
    return (
      <div
        className="aspect-[16/9] w-full rounded-md border border-line bg-surface bg-cover bg-center shadow-sm"
        style={style}
        role="img"
        aria-label={title}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
      <Route className="h-5 w-5" />
    </span>
  );
}

export function SeriesIndexPage({ locale, seriesList }: { locale: Locale; seriesList: PublicSeriesSummary[] }) {
  const pageCopy = copy[locale];
  const listJsonLd = buildSeriesListJsonLd(locale, seriesList);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} currentPath={pageCopy.currentPath} />

      <main className="flex-1 bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />

        <section className="site-grid border-b border-line" aria-labelledby="series-index-title">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-14">
            <div className="article-reading-surface overflow-hidden rounded-md border border-line px-4 py-7 sm:px-5 md:px-9 md:py-8">
              <div className="grid gap-6 pl-0 md:grid-cols-[1fr_13rem] md:gap-8 md:pl-7">
                <div className="min-w-0">
                  <p className="eyebrow text-accent">{pageCopy.eyebrow}</p>
                  <h1 id="series-index-title" className="mt-3 break-words text-3xl font-semibold text-foreground [overflow-wrap:anywhere] md:text-5xl">
                    {pageCopy.title}
                  </h1>
                  <p className="mt-5 max-w-3xl break-words text-base leading-8 text-muted [overflow-wrap:anywhere] md:text-lg">{pageCopy.description}</p>
                </div>
                <aside className="article-note-rail rounded-md border border-line p-5" aria-label={pageCopy.publishedRoutes}>
                  <Route className="h-7 w-7 text-accent" />
                  <p className="mt-4 text-3xl font-semibold text-foreground">{seriesList.length}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{pageCopy.publishedRoutes}</p>
                  <p className="mt-4 text-sm leading-6 text-muted">{pageCopy.routeHint}</p>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12" aria-labelledby="series-list-title">
          <h2 id="series-list-title" className="sr-only">
            {pageCopy.publishedRoutes}
          </h2>
          {seriesList.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {seriesList.map((item) => (
                <article key={`${item.locale}-${item.slug}`} className="home-popular-card min-w-0 rounded-md border border-line p-5">
                  <CoverMark coverImage={item.coverImage} title={item.title} />
                  <div className="min-w-0">
                    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {pageCopy.articleCount(item.articleCount)}
                      </span>
                      {item.updatedAt ? <span>{pageCopy.updatedAt(item.updatedAt)}</span> : null}
                    </div>
                    <h3 className="mt-3 break-words text-2xl font-semibold text-foreground [overflow-wrap:anywhere]">
                      <Link href={seriesPath(locale, item.slug)}>{item.title}</Link>
                    </h3>
                    <p className="mt-3 break-words leading-7 text-muted [overflow-wrap:anywhere]">{item.description}</p>
                  </div>
                  <Link className="motion-inline mt-5 inline-flex items-center gap-2 font-semibold text-foreground transition hover:text-accent" href={seriesPath(locale, item.slug)}>
                    {pageCopy.enter}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="index-surface grid gap-5 rounded-md border border-line p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8 md:pl-10">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-md border border-line bg-paper text-accent shadow-sm">
                <SearchX className="h-5 w-5" />
              </div>
              <div className="relative z-10 min-w-0">
                <h2 className="break-words text-xl font-semibold text-foreground [overflow-wrap:anywhere]">{pageCopy.emptyTitle}</h2>
                <p className="mt-2 max-w-2xl break-words leading-7 text-muted [overflow-wrap:anywhere]">{pageCopy.emptyDescription}</p>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

export function SeriesDetailContent({ locale, item }: { locale: Locale; item: PublicSeriesDetail }) {
  const pageCopy = copy[locale];
  const totalReadingMinutes = item.articles.reduce((total, article) => total + article.readingMinutes, 0);
  const detailJsonLd = buildSeriesDetailJsonLd(locale, item, totalReadingMinutes);
  const coverImageStyle = coverStyle(item.coverImage);

  return (
    <>
      <SiteHeader locale={locale} currentPath={seriesPath(locale, item.slug)} />

      <main className="min-h-screen bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(detailJsonLd) }} />

        <section className="site-grid border-b border-line" aria-labelledby="series-detail-title">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-14">
            <div className="index-surface overflow-hidden rounded-md border border-line px-4 py-7 sm:px-5 md:px-9 md:py-8">
              {coverImageStyle ? <div className="mb-7 aspect-[16/9] rounded-md border border-line bg-surface bg-cover bg-center shadow-sm sm:aspect-[21/9] md:aspect-[21/8]" style={coverImageStyle} role="img" aria-label={item.title} /> : null}
              <div className="grid gap-6 pl-0 md:grid-cols-[1fr_15rem] md:items-center md:gap-8 md:pl-7">
                <div className="min-w-0">
                  <Link className="motion-inline inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground" href={pageCopy.currentPath}>
                    <ArrowLeft className="h-4 w-4" />
                    {pageCopy.backToSeries}
                  </Link>
                  <p className="mt-6 eyebrow text-accent md:mt-8">{pageCopy.detailEyebrow}</p>
                  <h1 id="series-detail-title" className="mt-3 max-w-4xl break-words text-3xl font-semibold text-foreground [overflow-wrap:anywhere] md:text-5xl">
                    {item.title}
                  </h1>
                  <p className="mt-5 max-w-3xl break-words text-base leading-8 text-muted [overflow-wrap:anywhere] md:text-lg">{item.description}</p>
                </div>
                <aside className="node-surface rounded-md border border-line bg-paper/70 p-4" aria-label={pageCopy.routeNodes}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                    <Route className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-2xl font-semibold text-foreground">{item.articleCount}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{pageCopy.routeNodes}</p>
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Clock className="h-4 w-4 text-accent" />
                      {pageCopy.minutes(totalReadingMinutes)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted">{pageCopy.totalMinutes}</p>
                  </div>
                  {item.updatedAt ? <p className="mt-3 text-sm leading-6 text-muted">{pageCopy.updatedAt(item.updatedAt)}</p> : null}
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12" aria-labelledby="series-articles-title">
          <h2 id="series-articles-title" className="sr-only">
            {pageCopy.routeNodes}
          </h2>
          {item.articles.length > 0 ? (
            <div className="grid gap-4">
              {item.articles.map((article, index) => (
                <article key={article.slug} className="home-popular-card grid min-w-0 gap-5 rounded-md border border-line p-5 md:grid-cols-[3rem_1fr_auto] md:items-start md:p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-sm font-semibold text-accent md:self-center">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {pageCopy.minutes(article.readingMinutes)}
                      </span>
                    </div>
                    <h3 className="mt-3 break-words text-2xl font-semibold text-foreground [overflow-wrap:anywhere]">
                      <Link href={articlePath(locale, article.slug)}>{article.title}</Link>
                    </h3>
                    <p className="mt-3 line-clamp-3 max-w-3xl break-words leading-7 text-muted [overflow-wrap:anywhere]">{article.summary}</p>
                  </div>
                  <div className="md:pt-3">
                    <Link className="motion-inline inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-accent focus-visible:text-accent" href={articlePath(locale, article.slug)}>
                      {pageCopy.read}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="motion-surface rounded-md border border-line bg-paper px-6 py-12 text-center shadow-sm md:py-14">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                <Route className="h-7 w-7" />
              </div>
              <h2 className="mt-5 break-words text-2xl font-semibold text-foreground [overflow-wrap:anywhere]">{pageCopy.detailEmptyTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl break-words leading-7 text-muted [overflow-wrap:anywhere]">{pageCopy.detailEmptyDescription}</p>
              <Link className="motion-inline mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-accent" href={pageCopy.currentPath}>
                {pageCopy.backToSeries}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
