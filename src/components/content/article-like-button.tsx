"use client";

import { ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
type ArticleLikeButtonProps = {
  locale: string;
  slug: string;
};

const copy = {
  prompt: "觉得这篇文章有帮助？",
  like: "点赞",
  liked: "已点赞",
  failed: "点赞暂时不可用，请稍后再试。",
};

type LikeState = {
  liked: boolean;
};

export function ArticleLikeButton({ locale, slug }: ArticleLikeButtonProps) {
  const [liked, setLiked] = useState(false);
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
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setError(copy.failed);
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
    } catch {
      setError(copy.failed);
    } finally {
      setSubmitting(false);
    }
  }

  const buttonLabel = liked ? copy.liked : copy.like;

  return (
    <section className="article-like-panel">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">{copy.prompt}</p>
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
      </div>
    </section>
  );
}
