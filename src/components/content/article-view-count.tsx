"use client";

import { Radar } from "lucide-react";
import { useEffect, useState } from "react";

type ArticleViewCountProps = {
  locale: string;
  slug: string;
  initialCount: number | undefined;
};

type ViewPayload = {
  counted?: boolean;
  viewCount: number;
};

function formatViewCount(count: number | undefined) {
  const safeCount = Math.max(0, count ?? 0);

  if (safeCount >= 10000) {
    return `${(safeCount / 10000).toFixed(1)}w`;
  }

  return safeCount.toLocaleString("zh-CN");
}

export function ArticleViewCount({ locale, slug, initialCount }: ArticleViewCountProps) {
  const [viewCount, setViewCount] = useState(() => Math.max(0, initialCount ?? 0));
  const endpoint = `/api/articles/${encodeURIComponent(slug)}/view?locale=${locale}`;

  useEffect(() => {
    const controller = new AbortController();
    const sessionKey = `zhizhi.article-view.recorded.${locale}.${slug}`;
    let timer: number | null = null;

    async function recordView() {
      if (controller.signal.aborted || window.sessionStorage.getItem(sessionKey) === "1") {
        return;
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ViewPayload;
        if (Number.isFinite(payload.viewCount)) {
          setViewCount(Math.max(0, payload.viewCount));
        }
        window.sessionStorage.setItem(sessionKey, "1");
      } catch {
        // 阅读数失败不打断正文阅读。
      }
    }

    function scheduleRecord() {
      if (timer !== null) {
        return;
      }

      timer = window.setTimeout(() => {
        timer = null;
        void recordView();
      }, 1800);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        scheduleRecord();
      }
    }

    if (document.visibilityState === "visible") {
      scheduleRecord();
    } else {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      controller.abort();
    };
  }, [endpoint, locale, slug]);

  return (
    <span className="inline-flex items-center gap-1.5">
      <Radar className="h-3.5 w-3.5 text-accent" />
      {`累计 ${formatViewCount(viewCount)} 次阅读`}
    </span>
  );
}
