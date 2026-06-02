import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Milestone, SearchX } from "lucide-react";
import { ExternalLinkList } from "@/components/content/external-link-list";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { PublicHomeAiTerm, PublicHomeArticle, PublicHomePayload } from "@/lib/public-home";
import { siteConfig } from "@/lib/site";

const difficultyLabels: Record<PublicHomeAiTerm["difficulty"], string> = {
  beginner: "入门",
  intermediate: "进阶",
  advanced: "高级",
};

type HomePageProps = {
  payload: PublicHomePayload;
};

const copy = {
  currentPath: "/",
  articlesHref: "/articles",
  aiTermsHref: "/ai-terms",
  heroTitle: "分享有用、有趣的东西",
  startReading: "文章阅读",
  aiTermsNav: "AI 词条",
  knowledgeBase: "个人知识库",
  liveUpdates: "持续更新",
  contentOverview: "内容概览",
  publicArticles: "公开文章",
  seriesRoutes: "专题路线",
  aiTermsStat: "AI 词条",
  aiTermsEyebrow: "最新词条",
  viewAllAiTerms: "查看全部词条",
  latestEyebrow: "最新文章",
  viewAllArticles: "查看全部文章",
  readingMinutes(minutes: number) {
    return `${minutes} 分钟`;
  },
  published(date: string) {
    return `发布 ${date}`;
  },
  seriesEyebrow: "精选专题",
  viewAllSeries: "查看全部专题",
  seriesEmptyTitle: "专题正在整理",
  seriesEmptyDescription: "相关主题积累稳定后，首页会展示连续阅读路线。",
  seriesArticleCount(count: number) {
    return `${count} 篇文章`;
  },
  externalEyebrow: "外部线索",
  externalTitle: "继续沿着外部线索探索",
  externalDescription: "一些适合继续追踪的资料、项目和公开入口，会放在这里集中收纳。",
};

function articleHref(article: PublicHomeArticle) {
  return `/articles/${article.slug}`;
}

function seriesHref(slug: string) {
  return `/series/${slug}`;
}

function aiTermHref(slug: string) {
  return `/ai-terms/${slug}`;
}

function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: siteConfig.nameEn,
    url: siteConfig.url,
    inLanguage: "zh-CN",
    description: siteConfig.description,
    publisher: {
      "@type": "Person",
      name: siteConfig.name,
    },
  };
}

export function HomePage({ payload }: HomePageProps) {
  const pageCopy = copy;
  const homeJsonLd = buildHomeJsonLd();

  return (
    <>
      <SiteHeader currentPath={pageCopy.currentPath} />

      <main className="min-h-screen bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />

        <section className="site-grid border-b border-line" aria-labelledby="home-hero-title">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-9 pt-[4.5rem] sm:px-6 md:grid-cols-[0.92fr_1.08fr] md:items-start md:pb-14 md:pt-28 lg:pb-16 lg:pt-32">
            <div className="flex min-w-0 flex-col justify-center">
              <h1 id="home-hero-title" className="max-w-3xl text-[2rem] font-semibold leading-tight text-foreground sm:text-5xl md:text-6xl">
                {pageCopy.heroTitle}
              </h1>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link className="hero-action hero-primary-action inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold shadow-sm transition sm:w-auto" href={pageCopy.articlesHref}>
                  {pageCopy.startReading}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link className="hero-action inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-paper px-5 text-sm font-semibold text-foreground transition hover:border-accent/60 hover:text-accent sm:w-auto" href={pageCopy.aiTermsHref}>
                  {pageCopy.aiTermsNav}
                </Link>
              </div>
            </div>

            <aside className="glass-surface tech-border vein-map rounded-md p-4 sm:p-5 md:p-6" aria-labelledby="home-overview-title">
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
                    <p className="text-2xl font-semibold text-foreground">{payload.stats.aiTermCount}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{pageCopy.aiTermsStat}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {payload.latestArticles.length > 0 ? (
          <section aria-labelledby="home-latest-title">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="home-latest-title" className="eyebrow text-accent">
                  {pageCopy.latestEyebrow}
                </h2>
                <Link className="motion-inline inline-flex items-center gap-2 text-sm font-semibold text-foreground" href={pageCopy.articlesHref}>
                  {pageCopy.viewAllArticles}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {payload.latestArticles.map((article, index) => (
                  <Link key={`${article.slug}-${index}`} className="home-latest-card flex h-full flex-col rounded-md border border-line p-5" href={articleHref(article)}>
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

        {payload.aiTerms.length > 0 ? (
          <section aria-labelledby="home-aiterms-title">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="home-aiterms-title" className="eyebrow text-accent">
                    {pageCopy.aiTermsEyebrow}
                  </h2>
                </div>
                <Link className="motion-inline inline-flex items-center gap-2 text-sm font-semibold text-foreground" href={pageCopy.aiTermsHref}>
                  {pageCopy.viewAllAiTerms}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {payload.aiTerms.map((term) => (
                  <Link key={term.slug} className="home-latest-card flex h-full flex-col rounded-md border border-line p-5" href={aiTermHref(term.slug)}>
                    <span className="flex flex-wrap items-center gap-2">
                      {term.categories[0] ? (
                        <span className="vein-link inline-flex px-2 py-1 text-sm font-semibold text-accent">{term.categories[0].name}</span>
                      ) : null}
                      <span className="rounded-md border border-accent/18 bg-accent/6 px-2 py-1 text-xs font-semibold text-muted">{difficultyLabels[term.difficulty]}</span>
                    </span>
                    <span className="home-card-title mt-4 block text-xl font-semibold leading-snug text-foreground">{term.term}</span>
                    {term.termZh ? <span className="mt-1 block text-sm font-semibold text-muted">{term.termZh}</span> : null}
                    <span className="mt-3 line-clamp-3 block leading-7 text-muted">{term.shortConcept}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="home-series-title">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
            <div>
              <h2 id="home-series-title" className="eyebrow text-accent">
                {pageCopy.seriesEyebrow}
              </h2>
            </div>

            {payload.featuredSeries.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {payload.featuredSeries.map((item) => (
                  <Link key={item.slug} className="home-popular-card rounded-md border border-line p-5" href={seriesHref(item.slug)}>
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

          </div>
        </section>

        {payload.externalLinks.length > 0 ? (
          <section aria-labelledby="home-external-title">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[0.82fr_1.18fr] md:py-10">
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

      <SiteFooter />
    </>
  );
}
