import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, RefreshCw } from "lucide-react";
import { ArticleLikeButton } from "@/components/content/article-like-button";
import { AnonymousFeedbackForm } from "@/components/content/anonymous-feedback-form";
import { ArticleReader } from "@/components/content/article-reader";
import { ArticleToc } from "@/components/content/article-toc";
import { ArticleViewCount } from "@/components/content/article-view-count";
import { BackToTopButton } from "@/components/content/back-to-top-button";
import type { ArticleContentBlock, ArticleTocItem } from "@/components/content/types";
import { ExternalLinkList } from "@/components/content/external-link-list";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCategoryHref, normalizeArticleCategory } from "@/lib/article-taxonomy";
import type { PublicExternalLink } from "@/lib/external-links";
import type { PublicArticleDetail, PublicArticleNavigationItem } from "@/lib/public-article-detail";
import type { Locale } from "@/lib/site";

type ArticleDetailPageProps = {
  article: PublicArticleDetail;
  blocks: ArticleContentBlock[];
  tocItems: ArticleTocItem[];
  navigation: {
    previous: PublicArticleNavigationItem | null;
    next: PublicArticleNavigationItem | null;
  };
  externalLinks: PublicExternalLink[];
  locale: Locale;
};

const copy = {
  currentPathPrefix: "/articles",
  articlesHref: "/articles",
  back: "返回文章列表",
  published: "发布",
  updated: "更新",
  relatedEyebrow: "延伸链接",
  relatedTitle: "文章之外的延伸入口",
  relatedDescription: "这些链接由后台配置在文章底部位置，适合放资料来源、项目入口或进一步阅读。",
  previousArticle: "上一篇",
  nextArticle: "下一篇",
};

function articleHref(article: Pick<PublicArticleNavigationItem, "slug">) {
  return `/articles/${article.slug}`;
}

function ArticleAdjacentLink({
  item,
  label,
  direction,
}: {
  item: PublicArticleNavigationItem;
  label: string;
  direction: "previous" | "next";
}) {
  const isPrevious = direction === "previous";

  return (
    <Link className="home-popular-card group grid min-w-0 gap-3 rounded-md border border-line bg-paper/76 p-5 transition hover:border-accent/40" href={articleHref(item)}>
      <span className={`flex items-center gap-2 text-sm font-semibold text-accent ${isPrevious ? "" : "justify-start md:justify-end"}`}>
        {isPrevious ? <ArrowLeft className="h-4 w-4" /> : null}
        {label}
        {isPrevious ? null : <ArrowRight className="h-4 w-4" />}
      </span>
      <span className={`home-card-title block break-words text-xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere] ${isPrevious ? "" : "md:text-right"}`}>{item.title}</span>
    </Link>
  );
}

function ArticleAdjacentNavigation({ navigation }: Pick<ArticleDetailPageProps, "navigation">) {
  const pageCopy = copy;

  if (!navigation.previous && !navigation.next) {
    return null;
  }

  return (
    <nav className="mt-6 grid gap-4 md:grid-cols-2" aria-label="相邻文章">
      {navigation.previous ? <ArticleAdjacentLink item={navigation.previous} label={pageCopy.previousArticle} direction="previous" /> : <div className="hidden md:block" aria-hidden="true" />}
      {navigation.next ? <ArticleAdjacentLink item={navigation.next} label={pageCopy.nextArticle} direction="next" /> : <div className="hidden md:block" aria-hidden="true" />}
    </nav>
  );
}

export function ArticleDetailPage({ article, blocks, tocItems, navigation, externalLinks, locale }: ArticleDetailPageProps) {
  const pageCopy = copy;
  const currentPath = `${pageCopy.currentPathPrefix}/${article.slug}`;
  const category = normalizeArticleCategory(article.category, locale);
  const categoryHref = getCategoryHref(category);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader currentPath={currentPath} />
      <main className="flex-1 bg-background">
        <article>
          <header className="site-grid border-b border-line">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-12">
              <div className="article-reading-surface overflow-hidden rounded-md border border-line px-4 py-6 sm:px-5 md:px-10 md:py-10">
                <div className="relative pl-0 md:pl-7">
                  <Link href={pageCopy.articlesHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    {pageCopy.back}
                  </Link>
                  <div className="mt-5 flex flex-col gap-3 md:mt-8">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold leading-6 text-muted md:gap-x-4">
                      <Link className="vein-link shrink-0 px-2.5 py-1 font-semibold text-accent hover:text-foreground" href={categoryHref}>
                        {category}
                      </Link>
                      <ArticleViewCount locale={locale} slug={article.slug} initialCount={article.viewCount} />
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-accent" />
                        {pageCopy.published} {article.publishedAt}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 text-accent md:h-4 md:w-4" />
                        {pageCopy.updated} {article.updatedAt}
                      </span>
                    </div>
                  </div>
                  <h1 className="mt-5 max-w-4xl text-2xl font-semibold leading-tight text-foreground sm:text-3xl md:text-5xl">{article.title}</h1>
                  <p className="mt-4 max-w-4xl text-base leading-7 text-muted md:mt-5 md:text-lg md:leading-8">{article.summary}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-12">
            <div className={tocItems.length > 0 ? "grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start" : "mx-auto max-w-6xl"}>
              <div className="min-w-0">
                <ArticleToc items={tocItems} variant="mobile" />
                <div className="min-w-0 px-4 pb-6 sm:px-5 md:px-10 md:pb-10">
                  <div className="min-w-0">
                    <ArticleReader blocks={blocks} defaultMode={article.defaultReadingMode} locale={locale} supportsReadingMode={article.supportsReadingMode} />
                    <div className="mt-10 rounded-md bg-surface/58 px-4 py-5 sm:px-5">
                      <ArticleLikeButton locale={locale} slug={article.slug} />
                      <AnonymousFeedbackForm locale={locale} pageUrl={currentPath} articleSlug={article.slug} articleTitle={article.title} />
                    </div>
                  </div>
                </div>
                <ArticleAdjacentNavigation navigation={navigation} />
                {externalLinks.length > 0 ? (
                  <section className="mt-10 border-t border-line pt-8">
                    <p className="eyebrow text-accent">{pageCopy.relatedEyebrow}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-foreground">{pageCopy.relatedTitle}</h2>
                    <p className="mt-3 leading-7 text-muted">{pageCopy.relatedDescription}</p>
                    <div className="mt-5">
                      <ExternalLinkList links={externalLinks} />
                    </div>
                  </section>
                ) : null}
              </div>
              <ArticleToc items={tocItems} variant="desktop" />
            </div>
          </div>
        </article>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  );
}
