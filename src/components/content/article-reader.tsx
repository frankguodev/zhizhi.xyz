"use client";

import { AlertTriangle, BookOpenText, Brain, ChevronDown, ChevronRight, Gauge, Layers3, Lightbulb, UserRound, X, ZoomIn, ZoomOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/site";
import type { ArticleContentBlock, LayeredBlockType, ReadingMode } from "./types";

const storageKeyPrefix = "zhizhi.reading-mode";

const blockLabels: Record<Locale, Record<LayeredBlockType, string>> = {
  zh: {
    detail: "详细解释",
    example: "具体例子",
    warning: "容易踩坑",
    advanced: "进阶理解",
    author: "我的经验",
  },
  en: {
    detail: "Detailed explanation",
    example: "Example",
    warning: "Watch out",
    advanced: "Advanced understanding",
    author: "My experience",
  },
};

const detailLayerTone = {
  tone: "border-line border-l-accent bg-[color-mix(in_srgb,var(--accent)_4%,var(--paper))]",
  iconTone: "border-accent/28 bg-accent/8 text-accent",
  labelTone: "text-accent",
  triggerTone: "hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--accent)_7%,transparent)]",
};

const blockMeta: Record<LayeredBlockType, { icon: LucideIcon } & typeof detailLayerTone> = {
  detail: {
    icon: BookOpenText,
    ...detailLayerTone,
  },
  example: {
    icon: Lightbulb,
    ...detailLayerTone,
  },
  warning: {
    icon: AlertTriangle,
    ...detailLayerTone,
  },
  advanced: {
    icon: Brain,
    ...detailLayerTone,
  },
  author: {
    icon: UserRound,
    ...detailLayerTone,
  },
};

const modeCopy: Record<Locale, Record<ReadingMode, string>> = {
  zh: {
    full: "完整阅读：展开全部分层内容，适合系统阅读",
    quick: "快速阅读：保留关键提示，适合先建立主线",
  },
  en: {
    full: "Full reading: expand every layered note for a systematic read",
    quick: "Quick reading: keep key signals to build the main thread first",
  },
};

const modeLabels: Record<Locale, Record<ReadingMode, string>> = {
  zh: {
    full: "完整阅读",
    quick: "快速阅读",
  },
  en: {
    full: "Full reading",
    quick: "Quick reading",
  },
};

const codeCopyLabels: Record<Locale, { copy: string; copied: string; failed: string }> = {
  zh: {
    copy: "复制代码",
    copied: "已复制",
    failed: "复制失败",
  },
  en: {
    copy: "Copy code",
    copied: "Copied",
    failed: "Copy failed",
  },
};

const imagePreviewLabels: Record<Locale, { close: string; dialog: string; zoomIn: string; zoomOut: string }> = {
  zh: {
    close: "关闭图片预览",
    dialog: "图片预览",
    zoomIn: "放大图片",
    zoomOut: "还原图片",
  },
  en: {
    close: "Close image preview",
    dialog: "Image preview",
    zoomIn: "Zoom image",
    zoomOut: "Reset image zoom",
  },
};

function shouldOpenByDefault(_type: LayeredBlockType, mode: ReadingMode) {
  if (mode === "full") {
    return true;
  }

  return false;
}

function LayerBlock({
  block,
  mode,
  locale,
}: {
  block: Extract<ArticleContentBlock, { kind: "layer" }>;
  mode: ReadingMode;
  locale: Locale;
}) {
  const [open, setOpen] = useState(() => shouldOpenByDefault(block.type, mode));
  const meta = blockMeta[block.type];
  const Icon = meta.icon;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOpen(shouldOpenByDefault(block.type, mode));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [block.type, mode]);

  return (
    <section className={cn("my-7 min-w-0 overflow-hidden rounded-md border border-l-4 px-4 py-4 shadow-sm transition md:px-5", meta.tone)} data-layer-type={block.type}>
      <button
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-4 rounded-md px-2 py-2 text-left transition focus-visible:outline-none",
          meta.triggerTone,
        )}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border", meta.iconTone)}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block text-xs font-semibold", meta.labelTone)}>{blockLabels[locale][block.type]}</span>
            <span className="mt-0.5 block break-words font-semibold leading-6 text-foreground [overflow-wrap:anywhere]">{block.title}</span>
          </span>
        </span>
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-muted">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>
      {open ? <div className="article-prose mt-4 border-t border-line pt-4" dangerouslySetInnerHTML={{ __html: block.html }} /> : null}
    </section>
  );
}

export function ArticleReader({
  blocks,
  defaultMode = "quick",
  locale = "zh",
  supportsReadingMode = true,
}: {
  blocks: ArticleContentBlock[];
  defaultMode?: ReadingMode;
  locale?: Locale;
  supportsReadingMode?: boolean;
}) {
  const initialMode = supportsReadingMode ? defaultMode : "full";
  const [mode, setMode] = useState<ReadingMode>(initialMode);
  const [previewImage, setPreviewImage] = useState<{ alt: string; src: string } | null>(null);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const storageKey = `${storageKeyPrefix}.${locale}`;

  useEffect(() => {
    const root = document.querySelector("[data-article-reader]");

    if (!root) {
      return;
    }

    const codeBlocks = Array.from(root.querySelectorAll("pre"));

    for (const preElement of codeBlocks) {
      const code = preElement.querySelector("code")?.textContent ?? "";
      const existingWrapper = preElement.parentElement instanceof HTMLElement && preElement.parentElement.dataset.articleCodeBlock === "true" ? preElement.parentElement : null;

      if (!code.trim()) {
        (existingWrapper ?? preElement).remove();
        continue;
      }

      if (existingWrapper?.querySelector("[data-code-copy]")) {
        continue;
      }

      preElement.querySelectorAll("[data-code-copy]").forEach((copyButton) => copyButton.remove());

      const wrapper = existingWrapper ?? document.createElement("div");

      if (!existingWrapper) {
        wrapper.className = "article-code-block";
        wrapper.dataset.articleCodeBlock = "true";
        preElement.parentNode?.insertBefore(wrapper, preElement);
        wrapper.appendChild(preElement);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "article-code-copy";
      button.setAttribute("data-code-copy", "true");
      button.setAttribute("aria-label", codeCopyLabels[locale].copy);

      button.addEventListener("click", async () => {
        const currentCode = preElement.querySelector("code")?.textContent ?? "";

        try {
          await window.navigator.clipboard.writeText(currentCode);
          button.dataset.state = "copied";
          button.setAttribute("aria-label", codeCopyLabels[locale].copied);
          window.setTimeout(() => {
            delete button.dataset.state;
            button.setAttribute("aria-label", codeCopyLabels[locale].copy);
          }, 1400);
        } catch {
          button.dataset.state = "failed";
          button.setAttribute("aria-label", codeCopyLabels[locale].failed);
          window.setTimeout(() => {
            delete button.dataset.state;
            button.setAttribute("aria-label", codeCopyLabels[locale].copy);
          }, 1400);
        }
      });

      wrapper.appendChild(button);
    }
  }, [blocks, locale, mode]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!supportsReadingMode) {
        setMode("full");
        return;
      }

      const stored = window.localStorage.getItem(storageKey);
      if (stored === "full" || stored === "quick") {
        setMode(stored);
      } else {
        setMode(defaultMode);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [defaultMode, storageKey, supportsReadingMode]);

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewImage]);

  function chooseMode(nextMode: ReadingMode) {
    setMode(nextMode);
    window.localStorage.setItem(storageKey, nextMode);
  }

  function closeImagePreview() {
    setPreviewImage(null);
    setPreviewZoomed(false);
  }

  function openImagePreview(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    if (!(target instanceof HTMLImageElement)) {
      return;
    }

    if (!target.closest(".article-prose") || !window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }

    event.preventDefault();
    setPreviewZoomed(false);
    setPreviewImage({
      alt: target.alt,
      src: target.currentSrc || target.src,
    });
  }

  return (
    <div className="min-w-0" data-article-reader onClick={openImagePreview}>
      {supportsReadingMode ? (
        <div className="z-10 mb-6 rounded-md border border-line bg-paper/86 p-2 shadow-sm backdrop-blur-sm sm:sticky sm:top-0 md:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 px-2 text-sm font-medium leading-6 text-muted">
              {mode === "full" ? <Layers3 className="h-4 w-4 text-accent" /> : <Gauge className="h-4 w-4 text-accent" />}
              <span className="min-w-0">{modeCopy[locale][mode]}</span>
            </div>
            <div className="grid grid-cols-2 rounded-md border border-line bg-surface/70 p-1">
              <button
                type="button"
                className={cn(
                  "cursor-pointer rounded-[0.28rem] border px-4 py-2 text-sm font-semibold transition",
                  mode === "quick" ? "border-accent/30 bg-accent/16 text-accent" : "border-transparent text-muted hover:text-foreground",
                )}
                onClick={() => chooseMode("quick")}
              >
                {modeLabels[locale].quick}
              </button>
              <button
                type="button"
                className={cn(
                  "cursor-pointer rounded-[0.28rem] border px-4 py-2 text-sm font-semibold transition",
                  mode === "full" ? "border-accent/30 bg-accent/16 text-accent" : "border-transparent text-muted hover:text-foreground",
                )}
                onClick={() => chooseMode("full")}
              >
                {modeLabels[locale].full}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {blocks.map((block) =>
        block.kind === "markdown" ? (
          <div key={block.id} className="article-prose" dangerouslySetInnerHTML={{ __html: block.html }} />
        ) : (
          <LayerBlock key={block.id} block={block} mode={mode} locale={locale} />
        ),
      )}

      {previewImage ? (
        <div className="article-image-preview" role="dialog" aria-modal="true" aria-label={imagePreviewLabels[locale].dialog} onClick={closeImagePreview}>
          <button type="button" className="article-image-preview-close" aria-label={imagePreviewLabels[locale].close} onClick={closeImagePreview}>
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="article-image-preview-zoom"
            aria-label={previewZoomed ? imagePreviewLabels[locale].zoomOut : imagePreviewLabels[locale].zoomIn}
            onClick={(event) => {
              event.stopPropagation();
              setPreviewZoomed((value) => !value);
            }}
          >
            {previewZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <div className="article-image-preview-frame">
            {/* eslint-disable-next-line @next/next/no-img-element -- Markdown preview images can be external and dimensionless. */}
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              data-zoomed={previewZoomed ? "true" : "false"}
              onClick={(event) => {
                event.stopPropagation();
                setPreviewZoomed((value) => !value);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
