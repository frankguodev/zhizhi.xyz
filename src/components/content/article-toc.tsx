"use client";

import { ListTree } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { ArticleTocItem } from "./types";

type ArticleTocProps = {
  items: ArticleTocItem[];
  variant: "mobile" | "desktop";
};

const copy = {
  title: "本文目录",
  summary: "目录",
};

export function ArticleToc({ items, variant }: ArticleTocProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const clickedLockRef = useRef("");
  const clickedLockTimerRef = useRef<number | null>(null);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  function handleTocClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    event.preventDefault();
    clickedLockRef.current = id;
    setActiveId(id);
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    if (variant === "mobile") {
      detailsRef.current?.removeAttribute("open");
    }

    if (clickedLockTimerRef.current) {
      window.clearTimeout(clickedLockTimerRef.current);
    }

    clickedLockTimerRef.current = window.setTimeout(() => {
      if (clickedLockRef.current === id) {
        clickedLockRef.current = "";
        setActiveId(id);
      }
    }, 950);
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let hash = "";

      try {
        hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      } catch {
        hash = window.location.hash.replace(/^#/, "");
      }

      if (hash && items.some((item) => item.id === hash)) {
        setActiveId(hash);
      } else {
        setActiveId(items[0]?.id ?? "");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [items]);

  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.id)).filter((element): element is HTMLElement => Boolean(element));

    if (headings.length === 0) {
      return;
    }

    let ticking = false;
    let frameId = 0;

    function findActiveHeadingId() {
      const documentElement = document.documentElement;
      const nearPageEnd = window.scrollY + window.innerHeight >= documentElement.scrollHeight - 16;
      const topAnchor = Math.min(window.innerHeight * 0.28, 220);

      if (nearPageEnd) {
        return headings[headings.length - 1]?.id ?? "";
      }

      let nextActiveId = headings[0]?.id ?? "";

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= topAnchor) {
          nextActiveId = heading.id;
        } else {
          break;
        }
      }

      return nextActiveId;
    }

    function syncActiveHeading() {
      ticking = false;

      if (clickedLockRef.current) {
        return;
      }

      const nextActiveId = findActiveHeadingId();
      setActiveId((currentId) => (currentId === nextActiveId ? currentId : nextActiveId));
    }

    function requestSync() {
      if (ticking) {
        return;
      }

      ticking = true;
      frameId = window.requestAnimationFrame(syncActiveHeading);
    }

    requestSync();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);

    return () => {
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      window.cancelAnimationFrame(frameId);
      if (clickedLockTimerRef.current) {
        window.clearTimeout(clickedLockTimerRef.current);
      }
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  const nav = (
    <nav aria-label={copy.title}>
      <ol className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className={cn(
                "block border-l py-1.5 pr-2 text-sm leading-5 transition hover:border-accent hover:text-foreground",
                "pl-3 font-semibold",
                activeId === item.id ? "border-l-2 border-accent bg-accent/8 text-accent" : "border-line text-muted",
              )}
              href={`#${item.id}`}
              onClick={(event) => handleTocClick(event, item.id)}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  if (variant === "mobile") {
    return (
      <details ref={detailsRef} className="mb-5 min-w-0 rounded-md border border-line bg-surface p-4 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
          <ListTree className="h-4 w-4 text-accent" />
          {copy.summary}
        </summary>
        <div className="article-mobile-toc-scroll mt-4 max-h-[50dvh] overflow-y-auto pr-1">{nav}</div>
      </details>
    );
  }

  return (
    <aside className="article-toc-scroll sticky top-28 hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-md border border-line bg-surface p-4 lg:block">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ListTree className="h-4 w-4 text-accent" />
        {copy.title}
      </div>
      {nav}
    </aside>
  );
}
