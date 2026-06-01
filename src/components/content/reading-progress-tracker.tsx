"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ReadingProgressTrackerProps = {
  slug: string;
  locale?: "zh";
  enabled: boolean;
  initialProgress: number;
  resumeOnLoad?: boolean;
};

function currentProgress() {
  const root = document.documentElement;
  const maxScroll = root.scrollHeight - root.clientHeight;

  if (maxScroll <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
}

function targetScrollY(progress: number) {
  const root = document.documentElement;
  const maxScroll = root.scrollHeight - root.clientHeight;

  if (maxScroll <= 0) {
    return 0;
  }

  return Math.round((Math.min(95, Math.max(0, progress)) / 100) * maxScroll);
}

export function ReadingProgressTracker({ slug, locale = "zh", enabled, initialProgress, resumeOnLoad = false }: ReadingProgressTrackerProps) {
  const [progress, setProgress] = useState(initialProgress);
  const lastSyncedRef = useRef(initialProgress);
  const pendingRef = useRef(false);
  const resumedRef = useRef(false);
  const canResume = initialProgress >= 5 && initialProgress < 95;

  const resumeReading = useCallback(() => {
    if (!canResume) {
      return;
    }

    window.scrollTo({ top: targetScrollY(initialProgress), behavior: "smooth" });
  }, [canResume, initialProgress]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function sync(nextProgress: number) {
      if (pendingRef.current || Math.abs(nextProgress - lastSyncedRef.current) < 5) {
        return;
      }

      pendingRef.current = true;
      const response = await fetch(`/api/articles/${slug}/reading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: nextProgress, locale }),
      }).catch(() => null);

      if (response?.ok) {
        lastSyncedRef.current = nextProgress;
      }
      pendingRef.current = false;
    }

    function update() {
      const nextProgress = currentProgress();
      setProgress((value) => Math.max(value, nextProgress));
      void sync(nextProgress);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled, locale, slug]);

  useEffect(() => {
    if (!enabled || !resumeOnLoad || !canResume || resumedRef.current) {
      return;
    }

    resumedRef.current = true;
    const timeout = window.setTimeout(() => {
      window.requestAnimationFrame(() => resumeReading());
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [canResume, enabled, resumeOnLoad, resumeReading]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="mt-5 max-w-sm">
      <div className="flex items-center justify-between text-xs font-semibold text-muted">
        <span>阅读进度</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full border border-line bg-paper p-0.5">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-all" style={{ width: `${progress}%` }} />
      </div>
      {canResume ? (
        <button className="mt-3 border-b border-accent/40 text-sm font-semibold text-accent hover:text-foreground" type="button" onClick={resumeReading}>
          从上次位置继续
        </button>
      ) : null}
    </div>
  );
}
