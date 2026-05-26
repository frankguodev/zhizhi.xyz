"use client";

import { AlertTriangle, Check, CheckCircle2, Clipboard, ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, MessageSquareText, Video } from "lucide-react";
import { useMemo, useState } from "react";
import type { ArticleRecord } from "@/data/articles";
import { buildXLongformDraft, type XLongformDraft, type XLongformPreviewBlock, type XPublishCheck, type XPublishMediaItem } from "@/lib/x-publish-transform";

type XLongformPreviewProps = {
  article: ArticleRecord;
  markdown: string;
};

type CopyTarget = "lead" | "full";

function formatCount(value: number) {
  return value.toLocaleString("zh-CN");
}

export function XLongformPreview({ article, markdown }: XLongformPreviewProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyTarget, setCopyTarget] = useState<CopyTarget>("full");
  const draft = useMemo(() => buildXLongformDraft(article, markdown), [article, markdown]);
  const warningCount = draft.checks.filter((check) => check.status === "warn").length;
  const failCount = draft.checks.filter((check) => check.status === "fail").length;
  const passCount = draft.checks.filter((check) => check.status === "pass").length;

  async function copyText(value: string, target: CopyTarget) {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is unavailable.");
      }

      setCopyTarget(target);
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyTarget(target);
      setCopyState("error");
    }

    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  const leadCopyText = [draft.title, draft.lead, draft.articleUrl].filter(Boolean).join("\n\n");
  const copiedLabel = copyTarget === "lead" ? "导语已复制" : "全文已复制";

  return (
    <section className="admin-surface p-4 sm:p-5" aria-labelledby="x-longform-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">X 长文模板</p>
          <h2 id="x-longform-title" className="mt-2 text-2xl font-semibold text-foreground">
            X 发布准备台
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            从当前文章 Markdown 实时生成预览、复制稿、媒体清单和发布检查。这里不写回文章，也不保存人工微调后的社交稿。
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary inline-flex h-11 shrink-0 items-center justify-center gap-2 px-4 text-sm font-semibold"
          type="button"
          onClick={() => void copyText(draft.copyText, "full")}
        >
          {copyState === "copied" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
          {copyState === "copied" ? copiedLabel : copyState === "error" ? "复制失败" : "复制全文"}
        </button>
      </div>
      {copyState === "error" ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" role="alert">
          浏览器没有完成复制。请在下方复制稿正文中手动选中内容复制。
        </p>
      ) : null}

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Meta label="准备状态" value={failCount > 0 ? `${failCount} 项需处理` : warningCount > 0 ? `${warningCount} 项建议复核` : "可复制"} tone={failCount > 0 ? "fail" : warningCount > 0 ? "warn" : "pass"} />
        <Meta label="复制稿字符" value={`${formatCount(draft.charCount)} 字符`} />
        <Meta label="媒体资源" value={`${draft.media.length} 个`} />
        <Meta label="检查通过" value={`${passCount}/${draft.checks.length} 项`} />
      </dl>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 rounded-md border border-line bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">站内预览</p>
              <p className="mt-1 text-xs font-semibold text-muted">模拟 X 长文阅读节奏，帮助你先看结构和媒体位置。</p>
            </div>
            <MessageSquareText className="h-5 w-5 shrink-0 text-accent" />
          </div>
          <XArticlePreview draft={draft} />
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-md border border-line bg-background">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-foreground">发布检查</p>
              <p className="mt-1 text-xs font-semibold text-muted">复制到 X 前先处理 warn / fail 项。</p>
            </div>
            <div className="grid gap-2 p-3">
              {draft.checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-background">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-foreground">复制动作</p>
              <p className="mt-1 text-xs font-semibold text-muted">先复制全文；只发引导帖时可复制导语。</p>
            </div>
            <div className="grid gap-2 p-3">
              <button className="admin-btn admin-btn-primary inline-flex h-10 items-center justify-center gap-2 px-3 text-sm font-semibold" type="button" onClick={() => void copyText(draft.copyText, "full")}>
                <Clipboard className="h-4 w-4" />
                复制长文全文
              </button>
              <button className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center gap-2 px-3 text-sm font-semibold" type="button" onClick={() => void copyText(leadCopyText, "lead")}>
                <FileText className="h-4 w-4" />
                只复制标题导语
              </button>
            </div>
          </div>

          <MediaList items={draft.media} />
        </aside>
      </div>

      <details className="mt-5 rounded-md border border-line bg-background">
        <summary className="flex cursor-pointer list-none flex-col gap-1 border-b border-line px-4 py-3 text-sm font-semibold text-foreground marker:hidden sm:flex-row sm:items-center sm:justify-between">
          <span>复制稿正文</span>
          <span className="text-xs font-semibold text-muted">保留标题、导语、正文、媒体占位、原文链接和话题。</span>
        </summary>
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-4 text-sm leading-7 text-foreground">{draft.copyText}</pre>
        <div className="border-t border-line px-4 py-3">
          <button className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold" type="button" onClick={() => void copyText(draft.copyText, "full")}>
            <Clipboard className="h-4 w-4" />
            复制全文
          </button>
        </div>
      </details>
    </section>
  );
}

function XArticlePreview({ draft }: { draft: XLongformDraft }) {
  const previewMedia = draft.media.slice(0, 4);

  return (
    <article className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <div className="flex items-start gap-3 border-b border-line pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold text-accent">知</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-foreground">知之</span>
            <span className="text-muted">@zhizhi</span>
            <span className="text-muted">Draft</span>
          </div>
          <h3 className="mt-3 break-words text-2xl font-semibold leading-9 text-foreground">{draft.title}</h3>
          {draft.lead ? <p className="mt-3 text-base leading-8 text-muted">{draft.lead}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 py-5">
        {draft.blocks.map((block, index) => (
          <PreviewBlock key={`${block.kind}-${index}`} block={block} />
        ))}
      </div>

      {previewMedia.length > 0 ? (
        <div className="grid gap-2 overflow-hidden rounded-md border border-line bg-surface p-2 sm:grid-cols-2">
          {previewMedia.map((item) => (
            <MediaTile key={`${item.kind}-${item.url}`} item={item} />
          ))}
        </div>
      ) : null}

      <a className="mt-4 flex min-w-0 items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 text-sm transition hover:border-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={draft.articleUrl} target="_blank" rel="noreferrer">
        <LinkIcon className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">原文链接</span>
          <span className="mt-1 block break-words text-xs leading-5 text-muted">{draft.articleUrl}</span>
        </span>
      </a>

      {draft.hashtags.length > 0 ? <p className="mt-4 break-words text-sm font-semibold leading-6 text-accent">{draft.hashtags.join(" ")}</p> : null}
    </article>
  );
}

function PreviewBlock({ block }: { block: XLongformPreviewBlock }) {
  switch (block.kind) {
    case "callout":
      return (
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <p className="text-xs font-semibold text-accent">{block.label}</p>
          {block.title ? <p className="mt-1 font-semibold text-foreground">{block.title}</p> : null}
          {block.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">{block.body}</p> : null}
        </div>
      );
    case "code":
      return <pre className="overflow-auto rounded-md border border-line bg-surface p-3 text-xs leading-6 text-foreground">{block.text || "代码片段"}</pre>;
    case "heading":
      return block.level === 2 ? <h4 className="pt-1 text-xl font-semibold leading-8 text-foreground">{block.text}</h4> : <h5 className="pt-1 text-base font-semibold leading-7 text-foreground">{block.text}</h5>;
    case "list":
      return block.ordered ? (
        <ol className="grid list-decimal gap-2 pl-5 text-sm leading-7 text-foreground">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="grid list-disc gap-2 pl-5 text-sm leading-7 text-foreground">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      );
    case "media":
      return <MediaTile item={{ alt: block.alt, kind: block.mediaKind, url: block.url }} compact />;
    case "paragraph":
      return <p className="whitespace-pre-wrap text-base leading-8 text-foreground">{block.text}</p>;
    case "quote":
      return <blockquote className="border-l-2 border-accent/65 bg-surface px-4 py-3 text-sm leading-7 text-muted">{block.text}</blockquote>;
    default:
      return null;
  }
}

function MediaTile({ compact = false, item }: { compact?: boolean; item: XPublishMediaItem }) {
  return (
    <a className="group relative block min-h-32 overflow-hidden rounded-md border border-line bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={item.url} target="_blank" rel="noreferrer">
      {item.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-full max-h-64 min-h-32 w-full object-cover transition group-hover:scale-[1.02]" src={item.url} alt={item.alt} loading="lazy" />
      ) : (
        <div className="flex h-36 items-center justify-center bg-surface text-accent">
          <Video className="h-8 w-8" />
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-background/90 px-3 py-2 text-xs font-semibold text-foreground">
        {compact ? "" : item.kind === "image" ? "图片 · " : "视频 · "}
        {item.alt}
      </span>
    </a>
  );
}

function MediaList({ items }: { items: XPublishMediaItem[] }) {
  return (
    <div className="rounded-md border border-line bg-background">
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-foreground">媒体清单</p>
        <p className="mt-1 text-xs font-semibold text-muted">MVP 先提供顺序和链接，用于你在 X 手动上传或核对。</p>
      </div>
      {items.length > 0 ? (
        <div className="grid gap-2 p-3">
          {items.map((item, index) => (
            <a
              key={`${item.kind}-${item.url}`}
              className="flex min-w-0 items-start gap-3 rounded-md border border-line bg-surface px-3 py-3 text-sm transition hover:border-accent/35 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-background text-accent">
                {item.kind === "image" ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">
                  {index + 1}. {item.kind === "image" ? "图片" : "视频"} · {item.alt}
                </span>
                <span className="mt-1 block break-words text-xs leading-5 text-muted">{item.url}</span>
              </span>
              <ExternalLink className="mt-1 h-4 w-4 shrink-0" />
            </a>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted">当前文章没有识别到图片或视频链接。</p>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: XPublishCheck }) {
  const icon =
    check.status === "pass" ? (
      <CheckCircle2 className="h-4 w-4 text-accent" />
    ) : (
      <AlertTriangle className={check.status === "fail" ? "h-4 w-4 text-red-700" : "h-4 w-4 text-amber-700"} />
    );

  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-3 py-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{check.label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{check.detail}</span>
      </span>
    </div>
  );
}

function Meta({ label, tone = "neutral", value }: { label: string; tone?: "fail" | "neutral" | "pass" | "warn"; value: string }) {
  const toneClass =
    tone === "pass"
      ? "border-accent/35 bg-accent/10"
      : tone === "warn"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : tone === "fail"
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-line bg-background";

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <dt className={tone === "neutral" ? "text-xs text-muted" : "text-xs font-semibold"}>{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}
