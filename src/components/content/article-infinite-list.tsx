"use client";

import { SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArticleSummaryCard, type ArticleSummaryItem } from "@/components/content/article-summary-card";
import type { PublicArticleSort } from "@/lib/public-article-list";

const BATCH_SIZE = 10;

type ArticleInfiniteListProps = {
  articles: ArticleSummaryItem[];
  sort: PublicArticleSort;
  emptyTitle: string;
  emptyDescription: string;
  loadedLabel: string;
  loadMoreLabel: string;
  completeLabel: string;
};

export function ArticleInfiniteList({ articles, sort, emptyTitle, emptyDescription, loadedLabel, loadMoreLabel, completeLabel }: ArticleInfiniteListProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleArticles = useMemo(() => articles.slice(0, visibleCount), [articles, visibleCount]);
  const hasMore = visibleCount < articles.length;

  function loadMore() {
    setVisibleCount((current) => Math.min(current + BATCH_SIZE, articles.length));
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => Math.min(current + BATCH_SIZE, articles.length));
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [articles.length, hasMore]);

  if (articles.length === 0) {
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
      {visibleArticles.map((article, index) => (
        <ArticleSummaryCard key={`${article.locale}-${article.slug}`} article={article} hot={sort === "popular" && index < 3 && (article.viewCount ?? 0) > 0} />
      ))}
      <div ref={sentinelRef} className="flex min-h-14 flex-col items-center justify-center gap-3 rounded-md px-4 py-3 text-center text-sm font-semibold text-muted sm:flex-row">
        <span>{hasMore ? loadedLabel.replace("{count}", String(visibleArticles.length)).replace("{total}", String(articles.length)) : completeLabel}</span>
        {hasMore ? (
          <button
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-foreground transition hover:border-accent/45 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            type="button"
            onClick={loadMore}
          >
            {loadMoreLabel}
          </button>
        ) : null}
      </div>
    </>
  );
}
