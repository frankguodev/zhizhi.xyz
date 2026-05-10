"use client";

import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type ArticleClearFilterLinkProps = {
  href: string;
  visible: boolean;
  children: ReactNode;
};

export function ArticleClearFilterLink({ href, visible, children }: ArticleClearFilterLinkProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLSpanElement>(null);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!visible) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const root = rootRef.current;

    if (root) {
      root.style.maxHeight = "0";
      root.style.width = "0";
      root.style.opacity = "0";
      root.style.transform = "translateY(-0.25rem)";
      root.style.pointerEvents = "none";
    }

    window.setTimeout(() => {
      router.push(href, { scroll: false });
    }, 180);
  }

  if (!visible) {
    return null;
  }

  return (
    <span
      ref={rootRef}
      className="block max-h-10 w-full overflow-hidden opacity-100 transition-[max-height,width,opacity,transform] duration-200 ease-out sm:w-14 sm:shrink-0"
    >
      <Link
        aria-hidden={!visible}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-paper px-2 text-sm font-semibold text-muted shadow-sm transition duration-200 hover:border-accent/45 hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20",
          visible ? "pointer-events-auto" : "pointer-events-none",
        )}
        href={href}
        onClick={handleClick}
        tabIndex={visible ? undefined : -1}
      >
        {children}
      </Link>
    </span>
  );
}
