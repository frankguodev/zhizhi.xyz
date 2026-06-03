import Link from "next/link";
import { CalendarDays, Clock, RefreshCw } from "lucide-react";
import type { ArticleRecord } from "@/data/articles";
import { getArticleHref, getCategoryHref, normalizeArticleCategory } from "@/lib/article-taxonomy";

export type ArticleSummaryItem = Pick<
  ArticleRecord,
  "slug" | "locale" | "title" | "summary" | "category" | "readingMinutes" | "viewCount" | "publishedAt" | "updatedAt"
>;

export function ArticleSummaryCard({ article, hot = false }: { article: ArticleSummaryItem; hot?: boolean }) {
  const articleHref = getArticleHref(article);
  const category = normalizeArticleCategory(article.category, "zh");

  return (
    <article className="article-index-card index-surface relative grid gap-4 rounded-md border border-line p-5 md:p-6 md:pl-10">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-muted">
          <Link className="vein-link relative z-10 px-2 py-1 text-accent hover:text-foreground" href={getCategoryHref(category)}>
            {category}
          </Link>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4 text-accent" />
            {article.readingMinutes} 分钟
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4 text-accent" />
            发布 {article.publishedAt}
          </span>
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5 text-accent md:h-4 md:w-4" />
            更新 {article.updatedAt}
          </span>
          {hot ? (
            <span className="inline-flex items-center rounded-md border border-accent/35 bg-accent/12 px-2 py-0.5 text-xs font-semibold text-accent">
              热门
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 text-xl font-semibold text-foreground">
          <Link className="transition-colors after:absolute after:inset-0 hover:text-accent" href={articleHref}>{article.title}</Link>
        </h2>
        <p className="mt-2 line-clamp-2 max-w-3xl leading-7 text-muted">{article.summary}</p>
      </div>
    </article>
  );
}
