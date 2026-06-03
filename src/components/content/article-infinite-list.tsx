"use client";

import { SearchX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArticleSummaryCard, type ArticleSummaryItem } from "@/components/content/article-summary-card";
import type { PublicArticleSort } from "@/lib/public-article-list";

type ArticleInfiniteListProps = {
  initialArticles: ArticleSummaryItem[];
  total: number;
  sort: PublicArticleSort;
  query: string;
  category: string;
  pageSize: number;
  emptyTitle: string;
  emptyDescription: string;
  loadedLabel: string;
  loadMoreLabel: string;
  loadingLabel: string;
  errorLabel: string;
  completeLabel: string;
};

type ArticleListApiResponse = {
  articles: ArticleSummaryItem[];
  pagination: { total: number; hasMore: boolean };
};

export function ArticleInfiniteList({
  initialArticles,
  total,
  sort,
  query,
  category,
  pageSize,
  emptyTitle,
  emptyDescription,
  loadedLabel,
  loadMoreLabel,
  loadingLabel,
  errorLabel,
  completeLabel,
}: ArticleInfiniteListProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = articles.length < total;

  const loadMore = useCallback(async () => {
    if (loading || articles.length >= total) {
      return;
    }

    setLoading(true);
    setFailed(false);

    try {
      const params = new URLSearchParams({ sort, limit: String(pageSize), offset: String(articles.length) });
      if (query) {
        params.set("q", query);
      }
      if (category) {
        params.set("category", category);
      }

      const response = await fetch(`/api/public/articles?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load more articles.");
      }

      const data = (await response.json()) as ArticleListApiResponse;
      setArticles((current) => {
        const seen = new Set(current.map((article) => article.slug));
        return [...current, ...data.articles.filter((article) => !seen.has(article.slug))];
      });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, articles.length, total, sort, query, category, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore || failed) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, failed, loadMore]);

  if (total === 0) {
    return (
      <div className="index-surface grid gap-5 rounded-md border border-line p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8 md:pl-10">
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-md border border-line bg-paper text-accent shadow-sm">
          <SearchX className="h-5 w-5" />
        </div>
        <div className="relative z-10 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{emptyTitle}</h2>
          <p className="mt-2 max-w-2xl leading-7 text-muted">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {articles.map((article, index) => (
        <ArticleSummaryCard key={`${article.locale}-${article.slug}`} article={article} hot={sort === "popular" && index < 3 && (article.viewCount ?? 0) > 0} />
      ))}
      <div ref={sentinelRef} className="flex min-h-14 flex-col items-center justify-center gap-3 rounded-md px-4 py-3 text-center text-sm font-semibold text-muted sm:flex-row">
        <span>
          {failed ? errorLabel : hasMore ? loadedLabel.replace("{count}", String(articles.length)).replace("{total}", String(total)) : completeLabel}
        </span>
        {hasMore ? (
          <button
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-foreground transition hover:border-accent/45 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? loadingLabel : loadMoreLabel}
          </button>
        ) : null}
      </div>
    </>
  );
}
