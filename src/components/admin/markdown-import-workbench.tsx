"use client";

import Link from "next/link";
import { ArrowRight, Database, FileText, FileUp, Loader2, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArticleMediaManager } from "@/components/admin/article-media-manager";
import { handleAdminUnauthorized } from "@/components/admin/admin-api";
import { MediaUploadPanel } from "@/components/admin/media-upload-panel";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";
import { ArticleReader } from "@/components/content/article-reader";
import { QualityReport } from "@/components/content/quality-report";
import type { ArticleContentBlock } from "@/components/content/types";
import type { ArticleRecord } from "@/data/articles";
import type { ArticleQualityReport } from "@/lib/article-quality";

type PreviewResult = {
  article: ArticleRecord;
  blocks: ArticleContentBlock[];
  quality: ArticleQualityReport;
  importWarnings: string[];
  frontmatter: Record<string, unknown>;
};

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type SavedDraftLink = {
  slug: string;
  locale: ArticleRecord["locale"];
};

type PreviewTab = "summary" | "quality" | "preview";

const maxMarkdownChars = 800_000;

function formatSavedTime(date: Date) {
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const knownFrontmatterRoots = new Set([
  "title",
  "slug",
  "summary",
  "category",
  "tags",
  "visibility",
  "locale",
  "reading_minutes",
  "readingMinutes",
  "published_at",
  "publishedAt",
  "updated_at",
  "updatedAt",
  "supports_reading_mode",
  "supportsReadingMode",
  "default_reading_mode",
  "defaultReadingMode",
  "seo",
  "seoMetadata",
  "open_graph",
  "openGraph",
  "twitter",
  "content",
  "source",
  "structured_data",
  "structuredData",
]);

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

const sampleMarkdown = `---
title: "AI 辅助 Obsidian 写作流程：从资料到发布"
slug: "ai-obsidian-writing-workflow-draft"
summary: "这是一篇从 Obsidian 原始资料到 AI 初稿、人工精修和网站发布的流程说明。"
category: "内容创作"
tags:
  - "AI 写作"
  - "Obsidian"
  - "Markdown"
visibility: "public"
locale: "zh"
reading_minutes: 8
published_at: "2026-04-26"
updated_at: "2026-04-26"
supports_reading_mode: true
default_reading_mode: "full"

seo:
  title: "AI 辅助 Obsidian 写作流程：从资料到网站发布"
  description: "这篇文章介绍如何把 Obsidian 原始资料、AI 初稿、人工精修和网站后台发布连接成稳定的知识文章生产流程，适合搭建个人知识网站的人参考。"
  keywords:
    - "AI 写作流程"
    - "Obsidian 写作"
    - "Markdown 发布"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "AI 辅助 Obsidian 写作流程"
  description: "把资料整理、分层大纲、初稿生成和网站发布串成可复用流程。"
  type: "article"
  image: ""
  image_alt: ""

twitter:
  card: "summary_large_image"
  title: "AI 辅助 Obsidian 写作流程"
  description: "从资料整理到网站发布，建立稳定的个人知识内容生产流程。"
  image: ""

content:
  article_type: "方法型"
  difficulty: "beginner"
  audience:
    - "个人知识网站作者"
    - "Obsidian 用户"
  primary_topic: "AI 辅助内容创作"

source:
  source_type: "mixed"
  ai_assisted: true
  human_reviewed: false
  original_sources:
    - "AI 问答记录"
    - "Obsidian 个人笔记"
  source_note: "示例文章，发布前需要替换为真实资料和人工判断。"

structured_data:
  schema_type: "Article"
  author_name: "知之"
  publisher_name: "知之"
  in_language: "zh-CN"
---

# AI 辅助 Obsidian 写作流程：从资料到发布

## 先给结论

这套流程的核心不是让 AI 替你写作，而是让 AI 帮你把已经沉淀的资料整理成结构清晰的初稿。

:::detail 为什么不直接让 AI 写？
如果没有原始知识库和作者判断，AI 生成的文章容易完整但空泛。
:::

## 操作步骤

1. 把资料收集到 Obsidian。
2. 建立选题文件夹。
3. 让 AI 生成大纲和初稿。
4. 人工精修后导入网站后台。

:::warning 发布前一定要检查
删除所有 [需核实] 标记，确认图片路径和来源说明都已经处理。
:::

:::author 我的判断
个人知识网站真正有辨识度的地方，是作者自己的判断和经验，而不是资料的堆叠。
:::
`;

export function MarkdownImportWorkbench() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [dirty, setDirty] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [importedFileName, setImportedFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewedMarkdown, setPreviewedMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [savedDraft, setSavedDraft] = useState<SavedDraftLink | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("summary");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backupKey = "zhizhi.admin.import-markdown.backup";
  const frontmatterEntries = useMemo(() => Object.entries(preview?.frontmatter ?? {}), [preview]);
  const frontmatterSummary = useMemo(() => summarizeFrontmatter(preview?.frontmatter ?? {}), [preview]);
  const markdownStats = useMemo(
    () => ({
      lines: markdown ? markdown.split(/\r?\n/).length : 0,
      chars: markdown.length,
      slug: preview?.article.slug ?? savedDraft?.slug ?? "未解析",
    }),
    [markdown, preview?.article.slug, savedDraft?.slug],
  );
  const previewFresh = Boolean(preview && previewedMarkdown === markdown);
  const isSampleMarkdown = markdown.trim() === sampleMarkdown.trim();
  const saving = saveState.status === "saving";
  const canSaveDraft = previewFresh && !isSampleMarkdown;
  const { UnsavedChangesDialog } = useUnsavedChangesGuard({
    dirty,
    description: "导入工作台还有未保存修改。离开后数据库草稿不会更新；本地临时稿会尽量保留，方便下次恢复。",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const backup = window.localStorage.getItem(backupKey);
      if (backup && backup !== sampleMarkdown) {
        setBackupText(backup);
        setBackupAvailable(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!dirty || markdown === sampleMarkdown) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(backupKey, markdown);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [dirty, markdown]);

  function insertMarkdown(snippet: string) {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? markdown.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const before = markdown.slice(0, selectionStart);
    const after = markdown.slice(selectionEnd);
    const prefix = before && !before.endsWith("\n") ? "\n\n" : before.endsWith("\n\n") || !before ? "" : "\n";
    const suffix = after && !after.startsWith("\n") ? "\n\n" : after.startsWith("\n\n") || !after ? "" : "\n";
    const inserted = `${prefix}${snippet}${suffix}`;
    const nextCursor = selectionStart + inserted.length;

    setMarkdown(`${before}${inserted}${after}`);
    setDirty(true);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  }

  function replaceMarkdownFromMedia(nextMarkdown: string) {
    setMarkdown(nextMarkdown);
    setDirty(true);
    setSavedDraft(null);
    setPreview(null);
    setPreviewedMarkdown("");
  }

  function restoreBackup() {
    setMarkdown(backupText);
    setDirty(true);
    setBackupAvailable(false);
    setSaveState({ status: "idle", message: "已恢复本地临时稿，保存前不会写入数据库。" });
  }

  function discardBackup() {
    window.localStorage.removeItem(backupKey);
    setBackupText("");
    setBackupAvailable(false);
  }

  async function importMarkdownFile(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      if (text.length > maxMarkdownChars) {
        throw new Error(`Markdown 文件过大，请控制在 ${maxMarkdownChars.toLocaleString("zh-CN")} 字符以内。`);
      }
      setMarkdown(text);
      setDirty(true);
      setImportedFileName(file.name);
      setPreview(null);
      setPreviewedMarkdown("");
      setError(null);
      setSavedDraft(null);
      setSaveState({ status: "idle", message: `已导入文件：${file.name}` });
    } catch (exception) {
      setSaveState({ status: "error", message: exception instanceof Error ? exception.message : "读取 Markdown 文件失败" });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function runPreview() {
    setLoading(true);
    setError(null);
    setSaveState({ status: "idle", message: "" });
    setSavedDraft(null);

    try {
      const response = await fetch("/api/admin/articles/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "解析失败"));
      }

      setPreview(data as PreviewResult);
      setPreviewedMarkdown(markdown);
      setPreviewTab("summary");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "解析失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!previewFresh) {
      setSaveState({ status: "error", message: "请先点击“解析并检查”，确认预览与当前 Markdown 一致后再保存草稿。" });
      return;
    }

    if (isSampleMarkdown) {
      setSaveState({ status: "error", message: "当前仍是示例稿。请先替换为真实文章 Markdown，再保存草稿。" });
      return;
    }

    setSaveState({ status: "saving", message: "正在保存草稿..." });
    setSavedDraft(null);

    try {
      const response = await fetch("/api/admin/articles/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(data);
        const message = getErrorMessage(data, "保存失败");
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      const saved = data as { draft?: { slug?: string; locale?: ArticleRecord["locale"] } };
      const draftSlug = saved.draft?.slug ?? "";
      const draftLocale = saved.draft?.locale ?? preview?.article.locale ?? "zh";
      window.localStorage.removeItem(backupKey);
      setBackupAvailable(false);
      setDirty(false);
      setSavedDraft(draftSlug ? { slug: draftSlug, locale: draftLocale } : null);
      const savedAt = formatSavedTime(new Date());
      setLastSavedAt(savedAt);
      setSaveState({ status: "saved", message: `已保存草稿：${draftSlug || "未命名草稿"} · ${savedAt}` });
    } catch (exception) {
      setSaveState({ status: "error", message: exception instanceof Error ? exception.message : "保存失败" });
    }
  }

  return (
    <>
      <UnsavedChangesDialog />
      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-4">
        <div className="admin-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-accent">Markdown 导入</p>
              <h2 className="mt-1 text-2xl font-semibold">粘贴 final.md</h2>
            </div>
            <FileText className="h-6 w-6 text-muted" />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".md,.markdown,text/markdown,text/plain"
              onChange={(event) => {
                void importMarkdownFile(event.target.files?.[0]);
              }}
            />
            <button
              className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4" />
              导入 Markdown 文件
            </button>
            {importedFileName ? <span className="text-sm text-muted">{importedFileName}</span> : null}
          </div>
          <MediaUploadPanel onInsertMarkdown={insertMarkdown} />
          <ArticleMediaManager markdown={markdown} onMarkdownChange={replaceMarkdownFromMedia} />
          {backupAvailable ? (
            <div className="mt-4 flex flex-col gap-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <p>检测到导入工作台有本地临时稿，可能是上次离开前没有保存。</p>
              <div className="flex shrink-0 gap-2">
                <button className="h-9 border border-amber-300 bg-white px-3 font-semibold" type="button" onClick={restoreBackup}>
                  恢复
                </button>
                <button className="h-9 border border-amber-300 bg-amber-100 px-3 font-semibold" type="button" onClick={discardBackup}>
                  忽略
                </button>
              </div>
            </div>
          ) : null}
          <div className="admin-card-flat sticky top-20 z-20 mt-4 space-y-3 bg-surface/95 p-3 backdrop-blur">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="admin-btn admin-btn-primary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
                onClick={runPreview}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                解析并检查
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
                onClick={saveDraft}
                disabled={saving || !canSaveDraft}
                title={canSaveDraft ? "保存为数据库草稿" : isSampleMarkdown ? "请先替换示例稿" : "请先解析并检查当前 Markdown"}
                aria-disabled={!canSaveDraft}
              >
                {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                保存草稿
              </button>
              <Link className="admin-btn admin-btn-secondary inline-flex h-11 items-center justify-center px-5 font-semibold text-muted" href="/admin/articles/drafts">
                查看草稿
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-medium text-muted">
              <span>{markdownStats.lines.toLocaleString("zh-CN")} 行</span>
              <span>{markdownStats.chars.toLocaleString("zh-CN")} 字符</span>
              <span>Slug：{markdownStats.slug}</span>
              <span>{preview ? (previewFresh ? "预览已同步" : "预览已过期") : "尚未解析"}</span>
              <span>{lastSavedAt ? `上次保存：${lastSavedAt}` : dirty ? "尚未保存到数据库" : "当前为示例稿"}</span>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            className="mt-4 min-h-[560px] w-full resize-y border border-line bg-background p-4 font-mono text-sm leading-6 outline-none focus:border-accent"
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              setDirty(true);
              setSavedDraft(null);
            }}
            spellCheck={false}
          />
          {preview && !previewFresh ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900" role="status">
              Markdown 已修改，右侧预览和质量报告可能不是最新结果。请重新解析并检查。
            </p>
          ) : null}
          {error ? <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p> : null}
          {saveState.message ? (
            <p className={saveState.status === "error" ? "mt-3 whitespace-pre-line text-sm font-medium text-red-700" : "mt-3 text-sm font-medium text-accent"} role={saveState.status === "error" ? "alert" : "status"}>
              {saveState.message}
            </p>
          ) : null}
          {savedDraft ? (
            <Link
              className="admin-btn inline-flex h-10 items-center justify-center gap-2 border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-accent"
              href={`/admin/articles/drafts/${savedDraft.locale}/${savedDraft.slug}`}
            >
              打开草稿编辑
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        {!preview ? (
          <div className="admin-surface p-8 text-muted">
            点击“解析并检查”后，这里会显示 Frontmatter、质量报告和文章预览。
          </div>
        ) : (
          <>
            <div className="admin-surface p-3">
              <div className="grid grid-cols-3 gap-2">
                <WorkbenchTabButton active={previewTab === "summary"} label="解析结果" onClick={() => setPreviewTab("summary")} />
                <WorkbenchTabButton
                  active={previewTab === "quality"}
                  label={`质量 ${preview.quality.issues.length}`}
                  onClick={() => setPreviewTab("quality")}
                />
                <WorkbenchTabButton active={previewTab === "preview"} label="文章预览" onClick={() => setPreviewTab("preview")} />
              </div>
            </div>

            {previewTab === "summary" ? (
            <div className="admin-surface p-5">
              <p className="text-sm font-semibold text-accent">解析结果</p>
              <h2 className="mt-2 text-2xl font-semibold">{preview.article.title}</h2>
              <p className="mt-3 leading-7 text-muted">{preview.article.summary || "暂无摘要"}</p>
              {preview.importWarnings.length > 0 ? (
                <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {preview.importWarnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <Meta label="Slug" value={preview.article.slug} />
                <Meta label="分类" value={preview.article.category} />
                <Meta label="权限" value={preview.article.visibility} />
                <Meta label="阅读时间" value={`${preview.article.readingMinutes} 分钟`} />
              </dl>
              <div className="admin-card-flat mt-4 bg-accent/6 p-3 text-sm text-muted">
                <p className="font-semibold text-foreground">Frontmatter 保留检查</p>
                <p className="mt-2 leading-6">
                  已读取 {frontmatterSummary.rootCount} 个顶层字段。常用字段会写入数据库结构化列；原始 Frontmatter 会作为快照随草稿保存，
                  重新打开草稿时会继续保留未结构化字段。
                </p>
                {frontmatterSummary.extendedPaths.length > 0 ? (
                  <p className="mt-2 break-words leading-6">
                    已检测到扩展字段：{frontmatterSummary.extendedPaths.slice(0, 10).join("、")}
                    {frontmatterSummary.extendedPaths.length > 10 ? " 等" : ""}
                  </p>
                ) : null}
                {frontmatterSummary.extraRootKeys.length > 0 ? (
                  <p className="mt-2 break-words leading-6">
                    其他顶层字段：{frontmatterSummary.extraRootKeys.join("、")}
                  </p>
                ) : null}
              </div>
              {frontmatterEntries.length > 0 ? (
                <details className="admin-card-flat mt-4 p-3">
                  <summary className="cursor-pointer font-semibold">查看原始 Frontmatter</summary>
                  <pre className="mt-3 overflow-x-auto text-xs text-muted">{JSON.stringify(preview.frontmatter, null, 2)}</pre>
                </details>
              ) : null}
            </div>
            ) : null}

            {previewTab === "quality" ? <QualityReport report={preview.quality} /> : null}

            {previewTab === "preview" ? (
            <div className="admin-surface p-5">
              <p className="text-sm font-semibold text-accent">文章预览</p>
              <div className="mt-5">
                <ArticleReader blocks={preview.blocks} defaultMode={preview.article.defaultReadingMode} locale={preview.article.locale} />
              </div>
            </div>
            ) : null}
          </>
        )}
      </section>
    </div>
    </>
  );
}

function WorkbenchTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={active ? "admin-btn h-10 bg-accent px-3 text-sm font-semibold text-accent-ink" : "admin-btn h-10 px-3 text-sm font-semibold text-muted"}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectNestedPaths(value: unknown, prefix: string, paths: string[]) {
  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const path = `${prefix}.${key}`;
    paths.push(path);

    if (isRecord(child)) {
      collectNestedPaths(child, path, paths);
    }
  }
}

function summarizeFrontmatter(frontmatter: Record<string, unknown>) {
  const rootKeys = Object.keys(frontmatter);
  const extraRootKeys = rootKeys.filter((key) => !knownFrontmatterRoots.has(key));
  const extendedPaths: string[] = [];

  for (const section of ["content", "source", "structured_data", "structuredData"]) {
    collectNestedPaths(frontmatter[section], section, extendedPaths);
  }

  return {
    rootCount: rootKeys.length,
    extraRootKeys,
    extendedPaths,
  };
}
