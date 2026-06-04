"use client";

import { useEffect, useState } from "react";
type TocHeading = {
  id: string;
  text: string;
};

export function AiTermToc() {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    const frame = window.requestAnimationFrame(() => {
      const container = document.querySelector("[data-ai-term-body]");
      if (!container) {
        return;
      }

      // 收正文大节标题和「一图看懂」；寓言故事/相关概念等元区块标题用 data-toc-exclude 排除。
      const nodes = Array.from(container.querySelectorAll<HTMLElement>("h2[id]:not([data-toc-exclude])"));
      const items = nodes
        .map((node) => ({ id: node.id, text: node.textContent?.trim() ?? "" }))
        .filter((heading) => heading.id && heading.text);

      setHeadings(items);

      if (nodes.length === 0) {
        return;
      }

      setActiveId(nodes[0].id);

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          if (visible[0]) {
            setActiveId((visible[0].target as HTMLElement).id);
          }
        },
        { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
      );

      nodes.forEach((node) => observer?.observe(node));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  if (headings.length === 0) {
    return null;
  }

  const label = "目录";

  return (
    <nav aria-label={label} className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <ul className="border-l border-line/70">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={activeId === heading.id ? "true" : undefined}
              className={`-ml-px block border-l-2 py-1.5 pl-3 leading-6 transition [overflow-wrap:anywhere] ${
                activeId === heading.id ? "border-l-accent font-semibold text-accent" : "border-l-transparent text-muted hover:border-l-line hover:text-foreground"
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
