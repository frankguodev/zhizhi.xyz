"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, ExternalLink, Loader2, Rocket, Save, ScanSearch } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { ArticleMediaManager } from "@/components/admin/article-media-manager";
import { handleAdminUnauthorized } from "@/components/admin/admin-api";
import { MediaUploadPanel } from "@/components/admin/media-upload-panel";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";
import { XLongformPreview } from "@/components/admin/x-longform-preview";
import { ArticleReader } from "@/components/content/article-reader";
import { QualityReport } from "@/components/content/quality-report";
import type { ArticleContentBlock } from "@/components/content/types";
import type { ArticleRecord } from "@/data/articles";
import type { ArticleQualityReport, QualityIssue } from "@/lib/article-quality";

type DraftEditorData = {
  article: ArticleRecord;
  markdown: string;
  blocks: ArticleContentBlock[];
  quality: ArticleQualityReport;
  importWarnings?: string[];
  logs?: Array<{
    id: string;
    adminEmail: string | null;
    action: string;
    targetTitle: string | null;
    createdAt: string | number;
  }>;
};

type SaveState = {
  status: "idle" | "checking" | "previewing" | "saving" | "publishing" | "saved" | "checked" | "previewed" | "published" | "error";
  message: string;
};

type EditorMode = "full" | "frontmatter" | "content";
type PreviewTab = "info" | "quality" | "preview" | "xLongform";

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return fallback;
}

function getHintMessage(data: unknown) {
  if (typeof data === "object" && data !== null && "hint" in data && typeof data.hint === "string") {
    return data.hint;
  }

  return "";
}

function splitMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return {
      hasFrontmatter: false,
      frontmatter: "",
      content: normalized,
    };
  }

  return {
    hasFrontmatter: true,
    frontmatter: match[1],
    content: normalized.slice(match[0].length),
  };
}

function joinMarkdown(frontmatter: string, content: string) {
  const cleanFrontmatter = frontmatter.trim();
  const normalizedContent = content.replace(/^\n+/, "");

  if (!cleanFrontmatter) {
    return normalizedContent;
  }

  return `---\n${cleanFrontmatter}\n---\n\n${normalizedContent}`;
}

function countLines(value: string) {
  return value ? value.split(/\r?\n/).length : 0;
}

function issueTarget(issue: QualityIssue): { mode: EditorMode; needles: string[]; patterns?: RegExp[] } {
  const id = issue.id;

  if (id.startsWith("marker-")) {
    return { mode: "content", needles: [id.slice("marker-".length)] };
  }

  const frontmatterTargets: Record<string, string[]> = {
    "short-title": ["title:"],
    "short-summary": ["summary:"],
    "missing-category": ["category:"],
    "few-tags": ["tags:"],
    "seo-slug-format": ["slug:"],
    "seo-title-short": ["seo:\n  title:", "seo:\r\n  title:", "title:"],
    "seo-title-long": ["seo:\n  title:", "seo:\r\n  title:", "title:"],
    "seo-description-short": ["description:", "seo:\n  description:", "seo:\r\n  description:"],
    "seo-description-long": ["description:", "seo:\n  description:", "seo:\r\n  description:"],
    "seo-keywords-few": ["keywords:"],
    "invalid-canonical": ["canonical_url:", "canonicalUrl:"],
    "public-noindex": ["robots:"],
    "private-index": ["robots:"],
    "missing-social-image": ["open_graph:", "image:", "cover_image:", "coverImage:"],
    "missing-social-image-alt": ["image_alt:", "imageAlt:", "cover_image_alt:", "coverImageAlt:"],
    "missing-article-type": ["article_type:", "articleType:", "content:"],
    "missing-primary-topic": ["primary_topic:", "primaryTopic:", "content:"],
    "missing-schema-type": ["schema_type:", "schemaType:", "structured_data:", "structuredData:"],
  };

  if (frontmatterTargets[id]) {
    return { mode: "frontmatter", needles: frontmatterTargets[id] };
  }

  const contentTargets: Record<string, string[]> = {
    "h1-count": ["# "],
    "keyword-opening": ["# ", "## "],
    "weak-structure": ["## "],
    "short-content": ["# ", "## "],
    "missing-layer-blocks": [":::"],
    "untitled-layer": [":::detail", ":::example", ":::warning", ":::advanced", ":::author"],
    "unclosed-layer": [":::"],
    "thin-quick-mode": [":::detail", ":::example", ":::advanced", ":::author", "## "],
    "no-warning": [":::warning"],
    "no-author-note": [":::author"],
    "no-images": ["!["],
  };

  const contentPatterns: Partial<Record<string, RegExp[]>> = {
    "h1-count": [/^#\s+.+$/m],
    "weak-structure": [/^##\s+.+$/m],
    "missing-layer-blocks": [/^:::(detail|example|warning|advanced|author)\b.*$/m],
    "untitled-layer": [/^:::(detail|example|warning|advanced|author)\s*$/m],
    "unclosed-layer": [/^:::(detail|example|warning|advanced|author)\b.*$/m],
    "thin-quick-mode": [/^:::(detail|example|advanced|author)\b.*$/m, /^##\s+.+$/m],
    "no-warning": [/^:::(warning)\b.*$/m, /^##\s+.+$/m],
    "no-author-note": [/^:::(author)\b.*$/m, /^##\s+.+$/m],
    "no-images": [/!\[[^\]]*\]\([^)]+\)/m],
  };

  return { mode: "content", needles: contentTargets[id] ?? ["# ", "## "], patterns: contentPatterns[id] };
}

function findTargetIndex(value: string, needles: string[], patterns?: RegExp[]) {
  for (const pattern of patterns ?? []) {
    const match = pattern.exec(value);
    if (match?.index !== undefined) {
      return { index: match.index, length: match[0].length };
    }
  }

  for (const needle of needles) {
    const index = value.indexOf(needle);
    if (index >= 0) {
      return { index, length: needle.length };
    }
  }

  return { index: 0, length: 0 };
}

function lineAndColumn(value: string, index: number) {
  const before = value.slice(0, index);
  const lines = before.split(/\r?\n/);

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function hasExtendedFrontmatter(markdown: string) {
  const { frontmatter } = splitMarkdown(markdown);
  return /\n\s+(audience|series|series_order|original_sources|schema_type|author_name|publisher_name|in_language):/m.test(`\n${frontmatter}`);
}

function publicArticleUrl(article: ArticleRecord) {
  return `/articles/${article.slug}`;
}

function formatSavedTime(date: Date) {
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function DraftEditorWorkbench({ initialData, mode = "draft" }: { initialData: DraftEditorData; mode?: "draft" | "published" }) {
  const searchParams = useSearchParams();
  const isPublishedMode = mode === "published";
  const requestedPanel = searchParams.get("panel");
  const [markdown, setMarkdown] = useState(initialData.markdown);
  const [data, setData] = useState<DraftEditorData>(initialData);
  const [backupText, setBackupText] = useState("");
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState<{ label: string } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [publishedArticleUrl, setPublishedArticleUrl] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("full");
  const [previewTab, setPreviewTab] = useState<PreviewTab>(
    requestedPanel === "info" || requestedPanel === "preview" || requestedPanel === "quality" || requestedPanel === "xLongform" ? requestedPanel : "quality",
  );
  const [xLongformSyncedMarkdown, setXLongformSyncedMarkdown] = useState(initialData.markdown);
  const [lastSavedAt, setLastSavedAt] = useState(initialData.article.updatedAt || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const routeLocale = initialData.article.locale;
  const routeSlug = initialData.article.slug;
  const backupKey = `zhizhi.admin.${mode}.${initialData.article.locale}.${initialData.article.slug}.backup`;
  const apiBase = isPublishedMode
    ? `/api/admin/articles/published/${routeLocale}/${routeSlug}`
    : `/api/admin/articles/drafts/${routeLocale}/${routeSlug}`;
  const dirty = markdown !== data.markdown;
  const markdownParts = splitMarkdown(markdown);
  const editorValue = editorMode === "frontmatter" ? markdownParts.frontmatter : editorMode === "content" ? markdownParts.content : markdown;
  const infoTabLabel = isPublishedMode ? "文章信息" : "草稿信息";
  const qualityErrorCount = data.quality.issues.filter((issue) => issue.level === "error").length;
  const qualityWarningCount = data.quality.issues.filter((issue) => issue.level === "warning").length;
  const qualitySuggestionCount = data.quality.issues.filter((issue) => issue.level === "suggestion").length;
  const publishUrl = publicArticleUrl(data.article);
  const busy = saveState.status === "checking" || saveState.status === "previewing" || saveState.status === "saving" || saveState.status === "publishing";
  const { UnsavedChangesDialog } = useUnsavedChangesGuard({
    dirty,
    description: isPublishedMode
      ? "这篇已发布文章还有未保存修改。离开后公开文章不会更新；本地临时稿会尽量保留。"
      : "这篇草稿还有未保存修改。离开后数据库里的草稿不会更新；本地临时稿会尽量保留，方便下次恢复。",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const backup = window.localStorage.getItem(backupKey);
      if (backup && backup !== initialData.markdown) {
        setBackupText(backup);
        setBackupAvailable(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [backupKey, initialData.markdown]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(backupKey, markdown);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [backupKey, dirty, markdown]);

  function insertMarkdown(snippet: string) {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? editorValue.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const before = editorValue.slice(0, selectionStart);
    const after = editorValue.slice(selectionEnd);
    const prefix = before && !before.endsWith("\n") ? "\n\n" : before.endsWith("\n\n") || !before ? "" : "\n";
    const suffix = after && !after.startsWith("\n") ? "\n\n" : after.startsWith("\n\n") || !after ? "" : "\n";
    const inserted = `${prefix}${snippet}${suffix}`;
    const nextValue = `${before}${inserted}${after}`;
    const nextCursor = selectionStart + inserted.length;

    if (editorMode === "frontmatter") {
      setMarkdown(joinMarkdown(nextValue, markdownParts.content));
    } else if (editorMode === "content") {
      setMarkdown(markdownParts.hasFrontmatter ? joinMarkdown(markdownParts.frontmatter, nextValue) : nextValue);
    } else {
      setMarkdown(nextValue);
    }
    setPublishedArticleUrl("");
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  }

  function updateEditorValue(value: string) {
    if (editorMode === "frontmatter") {
      setMarkdown(joinMarkdown(value, markdownParts.content));
      setPublishedArticleUrl("");
      return;
    }

    if (editorMode === "content") {
      setMarkdown(markdownParts.hasFrontmatter ? joinMarkdown(markdownParts.frontmatter, value) : value);
      setPublishedArticleUrl("");
      return;
    }

    setMarkdown(value);
    setPublishedArticleUrl("");
  }

  function replaceMarkdownFromMedia(nextMarkdown: string) {
    setMarkdown(nextMarkdown);
    setPublishedArticleUrl("");
  }

  function locateIssue(issue: QualityIssue) {
    const target = issueTarget(issue);
    const targetParts = splitMarkdown(markdown);
    const targetValue =
      target.mode === "frontmatter" ? targetParts.frontmatter : target.mode === "content" ? targetParts.content : markdown;
    const match = findTargetIndex(targetValue, target.needles, target.patterns);
    const position = lineAndColumn(targetValue, match.index);

    setEditorMode(target.mode);
    setSaveState({
      status: "idle",
      message: `已定位到${target.mode === "frontmatter" ? " Frontmatter" : "正文"}第 ${position.line} 行：${issue.title}`,
    });

    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(match.index, match.index + match.length);

      const lineHeight = 24;
      textarea.scrollTop = Math.max(0, (position.line - 6) * lineHeight);
    }, 0);
  }

  function restoreBackup() {
    setMarkdown(backupText);
    setBackupAvailable(false);
    setSaveState({
      status: "idle",
      message: isPublishedMode ? "已恢复本地临时稿，更新前不会覆盖公开文章。" : "已恢复本地临时稿，保存前不会覆盖数据库草稿。",
    });
  }

  function discardBackup() {
    window.localStorage.removeItem(backupKey);
    setBackupText("");
    setBackupAvailable(false);
  }

  async function updateDraft(label: string) {
    setSaveState({ status: "saving", message: `${label}中...` });
    setPublishedArticleUrl("");

    try {
      const response = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const result = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(result);
        const message = getErrorMessage(result, `${label}失败`);
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      const nextData = result as DraftEditorData;
      setData(nextData);
      setMarkdown(nextData.markdown);
      setXLongformSyncedMarkdown(nextData.markdown);
      window.localStorage.removeItem(backupKey);
      setBackupAvailable(false);
      const savedAt = formatSavedTime(new Date());
      setLastSavedAt(savedAt);
      setSaveState({ status: "saved", message: `${label}完成 · ${savedAt}` });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : `${label}失败` });
    }
  }

  async function refreshPreview(label: string, tab: "quality" | "preview") {
    setSaveState({ status: tab === "quality" ? "checking" : "previewing", message: `${label}中...` });
    setPublishedArticleUrl("");

    try {
      const response = await fetch("/api/admin/articles/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const result = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(result);
        const message = getErrorMessage(result, `${label}失败`);
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      const previewData = result as Omit<DraftEditorData, "markdown" | "logs">;
      setData({
        ...previewData,
        markdown: data.markdown,
        logs: data.logs,
      });
      setXLongformSyncedMarkdown(markdown);
      setSaveState({
        status: tab === "quality" ? "checked" : "previewed",
        message: tab === "quality" ? "检查完成，未写入数据库。" : "预览已刷新，未写入数据库。",
      });
      setPreviewTab(tab);
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : `${label}失败` });
    }
  }

  const refreshXLongformPreview = useCallback(async () => {
    setSaveState({ status: "previewing", message: "正在同步 X 长文预览..." });
    setPublishedArticleUrl("");

    try {
      const response = await fetch("/api/admin/articles/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const result = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(result);
        const message = getErrorMessage(result, "X 长文预览同步失败");
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      const previewData = result as Omit<DraftEditorData, "markdown" | "logs">;
      setData({
        ...previewData,
        markdown: data.markdown,
        logs: data.logs,
      });
      setXLongformSyncedMarkdown(markdown);
      setSaveState({ status: "previewed", message: "X 长文预览已根据当前 Markdown 同步，未写入数据库。" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "X 长文预览同步失败" });
    }
  }, [data.logs, data.markdown, markdown]);

  useEffect(() => {
    if (previewTab !== "xLongform" || !markdown.trim() || xLongformSyncedMarkdown === markdown || busy) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshXLongformPreview();
    }, 650);

    return () => window.clearTimeout(timer);
  }, [busy, markdown, previewTab, refreshXLongformPreview, xLongformSyncedMarkdown]);

  async function publishDraft() {
    setSaveState({ status: "publishing", message: "正在发布..." });

    try {
      const response = await fetch(`/api/admin/articles/drafts/${data.article.locale}/${data.article.slug}/publish`, {
        method: "POST",
      });
      const result = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(result);
        const message = getErrorMessage(result, "发布失败");
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      const payload = result as { articleUrl?: string };
      const articleUrl = payload.articleUrl ?? publishUrl;
      window.localStorage.removeItem(backupKey);
      setBackupAvailable(false);
      setPublishedArticleUrl(articleUrl);
      setSaveState({ status: "published", message: `发布完成：${articleUrl}` });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "发布失败" });
    }
  }

  function requestPublishDraft() {
    if (dirty) {
      setSaveState({ status: "error", message: "当前有未保存修改。请先保存并检查，再发布文章。" });
      return;
    }

    if (qualityErrorCount > 0) {
      setSaveState({
        status: "error",
        message: `质量报告还有 ${qualityErrorCount} 个错误，已阻止发布。请先处理错误并保存检查，再发布文章。`,
      });
      return;
    }

    setConfirmPublish(true);
  }

  function requestUpdatePublished(label: string) {
    setConfirmUpdate({ label });
  }

  return (
    <>
      <UnsavedChangesDialog />
      <AdminConfirmDialog
        open={Boolean(confirmUpdate)}
        title="更新已发布文章"
        description="确认后会直接改动公开文章内容，并写入后台操作记录。建议先确认右侧质量报告和预览。"
        confirmLabel="确认更新"
        tone="primary"
        busy={saveState.status === "saving"}
        details={
          <div className="grid gap-2 border border-line bg-background p-3 text-sm">
            <Meta label="文章" value={data.article.title} />
            <Meta label="Slug" value={`${data.article.locale}/${data.article.slug}`} />
          </div>
        }
        onCancel={() => setConfirmUpdate(null)}
        onConfirm={() => {
          const label = confirmUpdate?.label ?? "更新已发布文章";
          setConfirmUpdate(null);
          void updateDraft(label);
        }}
      />
      <AdminConfirmDialog
        open={confirmPublish}
        title="发布文章"
        description="发布后前台文章页会立即读取这篇文章。请确认下面的发布前检查结果。"
        confirmLabel="发布文章"
        tone={qualityErrorCount > 0 ? "danger" : "primary"}
        busy={saveState.status === "publishing"}
        details={
          <PublishChecklist
            article={data.article}
            dirty={dirty}
            extendedFrontmatter={hasExtendedFrontmatter(markdown)}
            publishUrl={publishUrl}
            qualityErrors={qualityErrorCount}
            qualitySuggestions={qualitySuggestionCount}
            qualityWarnings={qualityWarningCount}
          />
        }
        onCancel={() => setConfirmPublish(false)}
        onConfirm={() => {
          setConfirmPublish(false);
          void publishDraft();
        }}
      />

      <DraftStatusBar
        backupAvailable={backupAvailable}
        dirty={dirty}
        lastSavedAt={lastSavedAt}
        isPublishedMode={isPublishedMode}
        qualityErrorCount={qualityErrorCount}
        saveState={saveState}
      />

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-4">
        <div className="admin-surface p-5">
          <Link href={isPublishedMode ? "/admin/articles/published" : "/admin/articles/drafts"} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {isPublishedMode ? "返回已发布文章" : "返回草稿列表"}
          </Link>
          <div className="mt-6">
            <p className="text-sm font-semibold text-accent">{isPublishedMode ? "已发布文章编辑" : "正文编辑"}</p>
            <h2 className="mt-2 break-words text-3xl font-semibold text-foreground [overflow-wrap:anywhere]">{data.article.title}</h2>
            <p className="mt-3 break-words leading-7 text-muted [overflow-wrap:anywhere]">{data.article.summary}</p>
          </div>
          <div className="mt-5">
            <MediaUploadPanel onInsertMarkdown={insertMarkdown} />
            <ArticleMediaManager markdown={markdown} onMarkdownChange={replaceMarkdownFromMedia} />
          </div>
          {backupAvailable ? (
            <div className="mt-4 flex flex-col gap-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p>{isPublishedMode ? "检测到这篇已发布文章有本地临时稿，可能是上次离开前没有更新。" : "检测到这篇草稿有本地临时稿，可能是上次离开前没有保存。"}</p>
              <div className="flex shrink-0 gap-2">
                <button className="admin-btn h-9 border border-amber-300 bg-white px-3 font-semibold" type="button" onClick={restoreBackup}>
                  恢复
                </button>
                <button className="admin-btn h-9 border border-amber-300 bg-amber-100 px-3 font-semibold" type="button" onClick={discardBackup}>
                  忽略
                </button>
              </div>
            </div>
          ) : null}
          <div className="admin-card-flat mt-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-3 rounded-md border border-line bg-surface p-1">
              <EditorModeButton active={editorMode === "full"} label="完整稿" onClick={() => setEditorMode("full")} />
              <EditorModeButton active={editorMode === "frontmatter"} label="Frontmatter" onClick={() => setEditorMode("frontmatter")} />
              <EditorModeButton active={editorMode === "content"} label="正文" onClick={() => setEditorMode("content")} />
            </div>
            <div className="text-sm text-muted">
              当前视图 {countLines(editorValue)} 行 · {editorValue.length.toLocaleString("zh-CN")} 字符
            </div>
          </div>
          {editorMode === "frontmatter" && !markdownParts.hasFrontmatter ? (
            <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              当前 Markdown 没有检测到 Frontmatter。你可以在这里写入字段，保存时会自动补上 `---` 分隔符。
            </p>
          ) : null}
          <div className="admin-card-flat sticky bottom-3 top-auto z-20 mt-4 grid grid-cols-2 gap-3 bg-surface/95 p-3 backdrop-blur sm:flex sm:flex-wrap md:bottom-auto md:top-3">
              {isPublishedMode ? (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
                    onClick={() => void refreshPreview("检查", "quality")}
                    disabled={busy}
                  >
                    {saveState.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                    检查
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
                    onClick={() => void refreshPreview("预览", "preview")}
                    disabled={busy}
                  >
                    {saveState.status === "previewing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    预览
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
                    onClick={() => requestUpdatePublished("更新文章")}
                    disabled={busy}
                  >
                    {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    更新
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className={`${isPublishedMode ? "hidden" : "inline-flex"} admin-btn admin-btn-primary h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60`}
                onClick={() => {
                  setPreviewTab("quality");
                  if (isPublishedMode) {
                    requestUpdatePublished("更新并检查");
                  } else {
                    void updateDraft("保存并检查");
                  }
                }}
                disabled={busy}
              >
                {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isPublishedMode ? "更新并检查" : "保存并检查"}
              </button>
              <button
                type="button"
                className={`${isPublishedMode ? "hidden" : "inline-flex"} admin-btn admin-btn-secondary h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60`}
                onClick={() => {
                  setPreviewTab("preview");
                  if (isPublishedMode) {
                    requestUpdatePublished("更新并预览");
                  } else {
                    void updateDraft("刷新预览");
                  }
                }}
                disabled={busy}
              >
                <ScanSearch className="h-4 w-4" />
                {isPublishedMode ? "更新并预览" : "刷新预览"}
              </button>
              {!isPublishedMode ? <button
                type="button"
                className="admin-btn admin-btn-primary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
                onClick={requestPublishDraft}
                disabled={busy}
              >
                {saveState.status === "publishing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                发布文章
              </button> : null}
          </div>
          <textarea
            ref={textareaRef}
            className="mt-5 min-h-[640px] w-full resize-y border border-line bg-background p-4 font-mono text-sm leading-6 outline-none focus:border-accent"
            value={editorValue}
            onChange={(event) => updateEditorValue(event.target.value)}
            spellCheck={false}
          />
          {saveState.message ? (
            <p
              className={saveState.status === "error" ? "mt-3 whitespace-pre-line text-sm font-medium text-red-700" : "mt-3 text-sm font-medium text-accent"}
              role={saveState.status === "error" ? "alert" : "status"}
            >
              {saveState.message}
            </p>
          ) : null}
          {publishedArticleUrl ? (
            <Link
              className="admin-btn mt-3 inline-flex h-10 items-center justify-center gap-2 border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-accent"
              href={publishedArticleUrl}
              target="_blank"
              rel="noreferrer"
            >
              查看前台文章
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
          {data.importWarnings?.length ? (
            <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {data.importWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        <div className="admin-surface p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="文章编辑预览面板">
            <WorkbenchTabButton active={previewTab === "info"} label={infoTabLabel} onClick={() => setPreviewTab("info")} />
            <WorkbenchTabButton
              active={previewTab === "quality"}
              label={`质量 ${data.quality.issues.length}`}
              onClick={() => setPreviewTab("quality")}
            />
            <WorkbenchTabButton active={previewTab === "preview"} label="文章预览" onClick={() => setPreviewTab("preview")} />
            <WorkbenchTabButton active={previewTab === "xLongform"} label="X 长文" onClick={() => setPreviewTab("xLongform")} />
          </div>
        </div>

        {previewTab === "info" ? (
        <div className="admin-surface p-5">
          <p className="text-sm font-semibold text-accent">{infoTabLabel}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Meta label="Slug" value={data.article.slug} />
            <Meta label="语言" value={data.article.locale} />
            <Meta label="分类" value={data.article.category} />
            <Meta label="权限" value={data.article.visibility} />
          </dl>
        </div>
        ) : null}

        {previewTab === "quality" ? <QualityReport report={data.quality} onIssueSelect={locateIssue} /> : null}

        {previewTab === "preview" ? (
        <div className="admin-surface p-5">
          <p className="text-sm font-semibold text-accent">文章预览</p>
          <div className="mt-5">
            <ArticleReader blocks={data.blocks} defaultMode={data.article.defaultReadingMode} locale={data.article.locale} />
          </div>
        </div>
        ) : null}

        {previewTab === "xLongform" ? <XLongformPreview article={data.article} markdown={markdown} /> : null}
      </section>
      </div>
    </>
  );
}

function DraftStatusBar({
  backupAvailable,
  dirty,
  lastSavedAt,
  isPublishedMode,
  qualityErrorCount,
  saveState,
}: {
  backupAvailable: boolean;
  dirty: boolean;
  lastSavedAt: string;
  isPublishedMode: boolean;
  qualityErrorCount: number;
  saveState: SaveState;
}) {
  const status =
    saveState.status === "publishing"
      ? { label: "正在发布", tone: "border-accent/30 bg-accent/8 text-accent" }
      : saveState.status === "saving"
        ? { label: "正在保存", tone: "border-accent/30 bg-accent/8 text-accent" }
        : saveState.status === "published"
          ? { label: "已发布", tone: "border-accent/30 bg-accent/10 text-accent" }
          : saveState.status === "error"
            ? { label: "需要处理", tone: "border-red-200 bg-red-50 text-red-700" }
            : backupAvailable
              ? { label: "发现本地临时稿", tone: "border-amber-200 bg-amber-50 text-amber-900" }
              : dirty
                ? { label: "有未保存修改", tone: "border-amber-200 bg-amber-50 text-amber-900" }
                : { label: "已保存", tone: "border-line bg-surface text-muted" };

  return (
    <div className="admin-surface mb-5 flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`admin-muted-pill inline-flex h-8 items-center px-3 font-semibold ${status.tone}`}>{status.label}</span>
        <span className="text-muted">
          {dirty
            ? isPublishedMode
              ? "当前编辑器内容还没有更新到公开文章。"
              : "当前编辑器内容还没有写入数据库。"
            : isPublishedMode
              ? "当前编辑器内容已和公开文章同步。"
              : "当前编辑器内容已和数据库草稿同步。"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-muted">
        <span>{lastSavedAt ? `上次保存 ${lastSavedAt}` : "暂无保存时间"}</span>
        <span>{qualityErrorCount > 0 ? `质量错误 ${qualityErrorCount} 个` : "质量检查无错误"}</span>
        <span>{backupAvailable ? "可恢复本地稿" : "无本地临时稿"}</span>
      </div>
    </div>
  );
}

function EditorModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={
        active
          ? "admin-btn h-9 bg-accent px-3 text-sm font-semibold text-accent-ink"
          : "admin-btn h-9 px-3 text-sm font-semibold text-muted transition hover:text-foreground"
      }
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function WorkbenchTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={active ? "admin-btn h-10 bg-accent px-3 text-sm font-semibold text-accent-ink" : "admin-btn h-10 px-3 text-sm font-semibold text-muted"}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PublishChecklist({
  article,
  dirty,
  extendedFrontmatter,
  publishUrl,
  qualityErrors,
  qualitySuggestions,
  qualityWarnings,
}: {
  article: ArticleRecord;
  dirty: boolean;
  extendedFrontmatter: boolean;
  publishUrl: string;
  qualityErrors: number;
  qualitySuggestions: number;
  qualityWarnings: number;
}) {
  const hasSocialImage = Boolean(article.ogImage || article.twitterImage || article.coverImage);
  const hasImageAlt = Boolean(article.ogImageAlt || article.coverImageAlt);

  return (
    <div className="grid gap-2 border border-line bg-background p-3 text-sm">
      <ChecklistRow ok={!dirty} label={dirty ? "还有未保存修改" : "草稿内容已保存"} />
      <ChecklistRow
        ok={qualityErrors === 0}
        label={qualityErrors > 0 ? `质量错误 ${qualityErrors} 个` : "无质量错误"}
        muted={qualityErrors === 0 && qualityWarnings + qualitySuggestions > 0 ? `警告 ${qualityWarnings} 个，建议 ${qualitySuggestions} 个` : undefined}
      />
      <ChecklistRow ok={hasSocialImage} label={hasSocialImage ? "已设置社交分享图" : "缺少社交分享图"} />
      <ChecklistRow ok={!hasSocialImage || hasImageAlt} label={hasImageAlt ? "已设置图片说明" : "缺少图片说明"} />
      <ChecklistRow ok={extendedFrontmatter} label={extendedFrontmatter ? "检测到扩展 Frontmatter" : "未检测到扩展 Frontmatter"} />
      <div className="mt-2 border-t border-line pt-2 text-muted">
        发布地址：<span className="font-mono text-foreground">{publishUrl}</span>
      </div>
    </div>
  );
}

function ChecklistRow({ ok, label, muted }: { ok: boolean; label: string; muted?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className={ok ? "font-semibold text-accent" : "font-semibold text-amber-900"}>{ok ? "通过" : "注意"}</span>
      <span className="min-w-0 flex-1 text-foreground">{label}</span>
      {muted ? <span className="shrink-0 text-muted">{muted}</span> : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-background px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
