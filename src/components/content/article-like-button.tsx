"use client";

import { ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/site";

type ArticleLikeButtonProps = {
  locale: Locale;
  slug: string;
  shareTitle: string;
  shareUrl: string;
};

const copy = {
  zh: {
    prompt: "觉得这篇文章有帮助？",
    like: "点赞",
    liked: "已点赞",
    count(count: number) {
      return `${count} 次点赞`;
    },
    loading: "读取点赞状态中",
    failed: "点赞暂时不可用，请稍后再试。",
    shareTitle: "分享给需要的人",
    shareText: "如果这篇文章刚好帮你避开一个坑，也可以把它转给同样需要的人。",
    shareAction: "分享到 X / Twitter",
  },
  en: {
    prompt: "Was this article helpful?",
    like: "Like",
    liked: "Liked",
    count(count: number) {
      return `${count} likes`;
    },
    loading: "Loading like state",
    failed: "Likes are temporarily unavailable. Please try again later.",
    shareTitle: "Share it with someone who needs it",
    shareText: "If this article helped you avoid a detour, pass it along to someone working through the same thing.",
    shareAction: "Share to X / Twitter",
  },
} satisfies Record<
  Locale,
  {
    prompt: string;
    like: string;
    liked: string;
    count: (count: number) => string;
    loading: string;
    failed: string;
    shareTitle: string;
    shareText: string;
    shareAction: string;
  }
>;

type LikeState = {
  liked: boolean;
  count: number;
};

function buildTwitterShareUrl(title: string, url: string) {
  const shareUrl = new URL("https://twitter.com/intent/tweet");
  shareUrl.searchParams.set("text", title);
  shareUrl.searchParams.set("url", url);
  return shareUrl.toString();
}

export function ArticleLikeButton({ locale, slug, shareTitle, shareUrl }: ArticleLikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/articles/${encodeURIComponent(slug)}/like?locale=${locale}`;

  useEffect(() => {
    const controller = new AbortController();

    async function loadLikeState() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load article like state.");
        }

        const payload = (await response.json()) as LikeState;
        setLiked(Boolean(payload.liked));
        setCount(Number.isFinite(payload.count) ? payload.count : 0);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setError(copy[locale].failed);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadLikeState();

    return () => controller.abort();
  }, [endpoint, locale]);

  async function toggleLiked() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to update article like state.");
      }

      const payload = (await response.json()) as LikeState;
      setLiked(Boolean(payload.liked));
      setCount(Number.isFinite(payload.count) ? payload.count : 0);
    } catch {
      setError(copy[locale].failed);
    } finally {
      setSubmitting(false);
    }
  }

  const buttonLabel = liked ? copy[locale].liked : copy[locale].like;
  const statusText = loading ? copy[locale].loading : copy[locale].count(count);
  const twitterShareUrl = buildTwitterShareUrl(shareTitle, shareUrl);

  return (
    <section className="article-like-panel mt-10 border-t border-line pt-7">
      <div className="rounded-md border border-line bg-surface/58 px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">{copy[locale].prompt}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{statusText}</p>
          </div>
          <button
            type="button"
            className="article-like-button inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            aria-pressed={liked}
            aria-label={buttonLabel}
            data-liked={liked ? "true" : "false"}
            disabled={loading || submitting}
            onClick={toggleLiked}
          >
            <ThumbsUp className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
          </button>
        </div>
        {error ? <p className="mt-3 text-xs font-semibold text-amber">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">{copy[locale].shareTitle}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{copy[locale].shareText}</p>
          </div>
          <a className="article-share-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition" href={twitterShareUrl} target="_blank" rel="noreferrer" aria-label={copy[locale].shareAction}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M13.9 10.5 21.3 2h-1.8l-6.4 7.4L8 2H2.1l7.8 11.3L2.1 22h1.8l6.8-7.7L16.1 22H22l-8.1-11.5Zm-2.4 2.7-.8-1.1L4.4 3.3h2.8l5 7.1.8 1.1 6.6 9.3h-2.8l-5.3-7.6Z" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
