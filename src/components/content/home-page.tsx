import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Milestone, Radar, RefreshCw, SearchX } from "lucide-react";
import { ExternalLinkList } from "@/components/content/external-link-list";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { PublicHomeArticle, PublicHomePayload } from "@/lib/public-home";
import { siteConfig, type Locale } from "@/lib/site";

type HomePageProps = {
  payload: PublicHomePayload;
};

const copy = {
  zh: {
    currentPath: "/",
    articlesHref: "/articles",
    seriesHref: "/series",
    heroTitle: "免费分享",
    heroDescription: "分享普通人也能复制的实战经验和真实成长路径",
    startReading: "开始阅读",
    topicRoutes: "专题路线",
    knowledgeBase: "个人知识库",
    liveUpdates: "持续更新",
    contentOverview: "内容概览",
    publicArticles: "公开文章",
    seriesRoutes: "专题路线",
    longTermThemes: "长期主题",
    focusAreas: "关注方向",
    focusDescription: "长期沉淀的主题",
    latestEyebrow: "最新发布",
    popularEyebrow: "热门文章",
    viewAllArticles: "查看全部文章",
    readingMinutes(minutes: number) {
      return `${minutes} 分钟`;
    },
    viewCount(count: string) {
      return `累计 ${count} 次阅读`;
    },
    published(date: string) {
      return `发布 ${date}`;
    },
    updated(date: string) {
      return `更新 ${date}`;
    },
    read: "阅读",
    articlesPreparingTitle: "文章正在准备",
    articlesPreparingDescription: "发布文章后，首页会自动展示真实内容入口。",
    seriesEyebrow: "精选专题",
    seriesDescription: "把相关文章连成一条路。",
    viewAllSeries: "查看全部专题",
    seriesEmptyTitle: "专题正在整理",
    seriesEmptyDescription: "相关主题积累稳定后，首页会展示连续阅读路线。",
    seriesArticleCount(count: number) {
      return `${count} 篇文章`;
    },
    externalEyebrow: "外部线索",
    externalTitle: "继续沿着外部线索探索",
    externalDescription: "一些适合继续追踪的资料、项目和公开入口，会放在这里集中收纳。",
  },
  en: {
    currentPath: "/en",
    articlesHref: "/en/articles",
    seriesHref: "/en/series",
    heroTitle: "Guest. This may save you a few detours.",
    heroDescription: "Sharing practical experience ordinary people can replicate, along with honest paths of real growth.",
    startReading: "Start reading",
    topicRoutes: "Topic routes",
    knowledgeBase: "Personal knowledge base",
    liveUpdates: "Live updates",
    contentOverview: "Content overview",
    publicArticles: "Public articles",
    seriesRoutes: "Topic routes",
    longTermThemes: "Long-term themes",
    focusAreas: "Focus areas",
    focusDescription: "Themes built over time.",
    latestEyebrow: "Latest",
    popularEyebrow: "Popular articles",
    viewAllArticles: "View all articles",
    readingMinutes(minutes: number) {
      return `${minutes} min`;
    },
    viewCount(count: string) {
      return `${count} views`;
    },
    published(date: string) {
      return `Published ${date}`;
    },
    updated(date: string) {
      return `Updated ${date}`;
    },
    read: "Read",
    articlesPreparingTitle: "English articles are in preparation",
    articlesPreparingDescription: "Published English articles will appear here automatically.",
    seriesEyebrow: "Featured series",
    seriesDescription: "Turn related articles into a route.",
    viewAllSeries: "View all series",
    seriesEmptyTitle: "English series are being assembled",
    seriesEmptyDescription: "Once related English articles are connected into routes, they will appear here.",
    seriesArticleCount(count: number) {
      return `${count} articles`;
    },
    externalEyebrow: "Elsewhere",
    externalTitle: "Continue from external signals",
    externalDescription: "A small set of useful resources, projects, and public channels kept close to the site.",
  },
} satisfies Record<
  Locale,
  {
    currentPath: string;
    articlesHref: string;
    seriesHref: string;
    heroTitle: string;
    heroDescription: string;
    startReading: string;
    topicRoutes: string;
    knowledgeBase: string;
    liveUpdates: string;
    contentOverview: string;
    publicArticles: string;
    seriesRoutes: string;
    longTermThemes: string;
    focusAreas: string;
    focusDescription: string;
    latestEyebrow: string;
    popularEyebrow: string;
    viewAllArticles: string;
    readingMinutes: (minutes: number) => string;
    viewCount: (count: string) => string;
    published: (date: string) => string;
    updated: (date: string) => string;
    read: string;
    articlesPreparingTitle: string;
    articlesPreparingDescription: string;
    seriesEyebrow: string;
    seriesDescription: string;
    viewAllSeries: string;
    seriesEmptyTitle: string;
    seriesEmptyDescription: string;
    seriesArticleCount: (count: number) => string;
    externalEyebrow: string;
    externalTitle: string;
    externalDescription: string;
  }
>;

function formatViewCount(count: number | undefined, locale: Locale) {
  const safeCount = Math.max(0, count ?? 0);

  if (locale === "zh") {
    if (safeCount >= 10000) {
      return `${(safeCount / 10000).toFixed(1)}w`;
    }

    return safeCount.toLocaleString("zh-CN");
  }

  if (safeCount >= 1000) {
    return `${(safeCount / 1000).toFixed(1)}k`;
  }

  return safeCount.toLocaleString("en-US");
}

function articleHref(article: PublicHomeArticle) {
  return article.locale === "en" ? `/en/articles/${article.slug}` : `/articles/${article.slug}`;
}

function seriesHref(locale: Locale, slug: string) {
  return locale === "en" ? `/en/series/${slug}` : `/series/${slug}`;
}

function buildHomeJsonLd(locale: Locale) {
  const isEnglish = locale === "en";
  const url = isEnglish ? `${siteConfig.url}/en` : siteConfig.url;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: isEnglish ? siteConfig.nameEn : siteConfig.name,
    alternateName: isEnglish ? siteConfig.name : siteConfig.nameEn,
    url,
    inLanguage: isEnglish ? "en" : "zh-CN",
    description: isEnglish ? siteConfig.description.en : siteConfig.description.zh,
    publisher: {
      "@type": "Person",
      name: siteConfig.name,
    },
  };
}

export function HomePage({ payload }: HomePageProps) {
  const locale = payload.locale;
  const pageCopy = copy[locale];
  const homeJsonLd = buildHomeJsonLd(locale);

  return (
    <>
      <SiteHeader locale={locale} currentPath={pageCopy.currentPath} />

      <main className="min-h-screen bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />

        <section className="site-grid border-b border-line" aria-labelledby="home-hero-title">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-9 sm:px-6 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-14 lg:py-16">
            <div className="flex min-w-0 flex-col justify-center">
              <h1 id="home-hero-title" className="max-w-3xl text-[2rem] font-semibold leading-tight text-foreground sm:text-5xl md:text-6xl">
                {pageCopy.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted md:text-lg">{pageCopy.heroDescription}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link className="hero-action hero-primary-action inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold shadow-sm transition sm:w-auto" href={pageCopy.articlesHref}>
                  {pageCopy.startReading}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link className="hero-action inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-paper px-5 text-sm font-semibold text-foreground transition hover:border-accent/60 hover:text-accent sm:w-auto" href={pageCopy.seriesHref}>
                  {pageCopy.topicRoutes}
                </Link>
              </div>
            </div>

            <aside className="glass-surface tech-border vein-map min-h-0 rounded-md p-4 sm:min-h-[24rem] sm:p-5 md:min-h-[31rem] md:p-6" aria-labelledby="home-overview-title">
              <div className="relative z-10 border-b border-line pb-5">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  {pageCopy.knowledgeBase}
                  <span className="status-light h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" />
                  {pageCopy.liveUpdates}
                </span>
              </div>

              <div className="relative z-10 mt-6">
                <p id="home-overview-title" className="text-sm font-semibold text-muted">
                  {pageCopy.contentOverview}
                </p>
              </div>

              <div className="relative z-10 mt-3 rounded-md border border-line bg-surface/58 p-3 shadow-sm">
                <div className="grid divide-y divide-line text-center sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="hero-stat px-3 py-3">
                    <p className="text-2xl font-semibold text-foreground">{payload.stats.articleCount}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{pageCopy.publicArticles}</p>
                  </div>
                  <div className="hero-stat px-3 py-3">
                    <p className="text-2xl font-semibold text-foreground">{payload.stats.seriesCount}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{pageCopy.seriesRoutes}</p>
                  </div>
                  <div className="hero-stat px-3 py-3">
                    <p className="text-2xl font-semibold text-foreground">{payload.stats.focusTopicCount}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{pageCopy.longTermThemes}</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-6">
                <p className="text-sm font-semibold text-muted">{pageCopy.focusAreas}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{pageCopy.focusDescription}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {payload.focusTopics.map((topic) => (
                    <span key={topic} className="rounded-md border border-accent/18 bg-accent/6 px-3 py-3 text-sm font-semibold text-foreground">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {payload.latestArticles.length > 0 ? (
          <section className="border-b border-line bg-background" aria-labelledby="home-latest-title">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
              <div>
                <h2 id="home-latest-title" className="eyebrow text-accent">
                  {pageCopy.latestEyebrow}
                </h2>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {payload.latestArticles.map((article) => (
                  <Link key={article.slug} className="home-latest-card flex h-full flex-col rounded-md border border-line p-5" href={articleHref(article)}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="vein-link inline-flex px-2 py-1 text-sm font-semibold text-accent">{article.category}</span>
                    </span>
                    <span className="home-card-title mt-4 block text-xl font-semibold leading-snug text-foreground">{article.title}</span>
                    <span className="mt-3 line-clamp-3 block leading-7 text-muted">{article.summary}</span>
                    <span className="mt-auto flex flex-wrap items-center gap-3 pt-5 text-sm font-semibold text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4 text-accent" />
                        {pageCopy.published(article.publishedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4 text-accent" />
                        {pageCopy.readingMinutes(article.readingMinutes)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-b border-line bg-background" aria-labelledby="home-popular-title">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="home-popular-title" className="eyebrow text-accent">
                  {pageCopy.popularEyebrow}
                </h2>
              </div>
              <Link className="motion-inline hidden items-center gap-2 text-sm font-semibold text-foreground md:inline-flex" href={pageCopy.articlesHref}>
                {pageCopy.viewAllArticles}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {payload.popularArticles.length > 0 ? (
              <div className="mt-8 grid gap-3">
                {payload.popularArticles.map((article) => {
                  const showUpdatedAt = article.updatedAt !== article.publishedAt;

                  return (
                    <Link key={article.slug} className="home-popular-card grid min-w-0 gap-4 rounded-md border border-line p-5 md:grid-cols-[1fr_auto] md:items-center" href={articleHref(article)}>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="vein-link inline-flex px-2 py-1 text-sm font-semibold text-accent">{article.category}</span>
                        </span>
                        <span className="home-card-title mt-2 block text-xl font-semibold leading-snug text-foreground">{article.title}</span>
                        <span className="mt-2 line-clamp-2 block leading-7 text-muted">{article.summary}</span>
                        <span className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4 text-accent" />
                            {pageCopy.readingMinutes(article.readingMinutes)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Radar className="h-4 w-4 text-accent" />
                            {pageCopy.viewCount(formatViewCount(article.viewCount, locale))}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-accent" />
                            {pageCopy.published(article.publishedAt)}
                          </span>
                          {showUpdatedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs md:text-sm">
                              <RefreshCw className="h-3.5 w-3.5 text-accent md:h-4 md:w-4" />
                              {pageCopy.updated(article.updatedAt)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="motion-inline inline-flex items-center gap-2 justify-self-start text-sm font-semibold text-foreground md:justify-self-end">
                        {pageCopy.read}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="node-surface mt-8 rounded-md border border-line bg-paper/82 p-6">
                <p className="text-xl font-semibold text-foreground">{pageCopy.articlesPreparingTitle}</p>
                <p className="mt-2 leading-7 text-muted">{pageCopy.articlesPreparingDescription}</p>
              </div>
            )}

            <Link className="motion-inline mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground md:hidden" href={pageCopy.articlesHref}>
              {pageCopy.viewAllArticles}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="border-b border-line bg-surface/72" aria-labelledby="home-series-title">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="home-series-title" className="eyebrow text-accent">
                  {pageCopy.seriesEyebrow}
                </h2>
                <p className="mt-4 max-w-2xl leading-7 text-muted">{pageCopy.seriesDescription}</p>
              </div>
              <Link className="motion-inline hidden items-center gap-2 text-sm font-semibold text-foreground md:inline-flex" href={pageCopy.seriesHref}>
                {pageCopy.viewAllSeries}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {payload.featuredSeries.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {payload.featuredSeries.map((item) => (
                  <Link key={item.slug} className="home-popular-card rounded-md border border-line p-5" href={seriesHref(locale, item.slug)}>
                    <span className="flex items-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                        <Milestone className="h-5 w-5" />
                      </span>
                    </span>
                    <span className="home-card-title mt-5 block text-xl font-semibold leading-snug text-foreground">{item.title}</span>
                    <span className="mt-3 line-clamp-3 block leading-7 text-muted">{item.description}</span>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      {pageCopy.seriesArticleCount(item.articleCount)}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="index-surface mt-8 grid gap-5 rounded-md border border-line bg-paper/70 p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8 md:pl-10">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-md border border-line bg-paper text-accent shadow-sm">
                  <SearchX className="h-5 w-5" />
                </div>
                <div className="relative z-10 min-w-0">
                  <h3 className="break-words text-xl font-semibold text-foreground [overflow-wrap:anywhere]">{pageCopy.seriesEmptyTitle}</h3>
                  <p className="mt-2 max-w-2xl break-words leading-7 text-muted [overflow-wrap:anywhere]">{pageCopy.seriesEmptyDescription}</p>
                </div>
              </div>
            )}

            <Link className="motion-inline mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground md:hidden" href={pageCopy.seriesHref}>
              {pageCopy.viewAllSeries}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {payload.externalLinks.length > 0 ? (
          <section className="border-t border-line bg-surface/72" aria-labelledby="home-external-title">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.82fr_1.18fr] md:py-14">
              <div>
                <p className="eyebrow text-accent">{pageCopy.externalEyebrow}</p>
                <h2 id="home-external-title" className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  {pageCopy.externalTitle}
                </h2>
                <p className="mt-4 leading-7 text-muted">{pageCopy.externalDescription}</p>
              </div>
              <ExternalLinkList links={payload.externalLinks} />
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
