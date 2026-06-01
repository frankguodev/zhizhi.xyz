"use client";

import { Database, FileText, Loader2, ScanSearch, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { adminApiErrorMessage, handleAdminUnauthorized } from "@/components/admin/admin-api";
import { MediaUploadPanel } from "@/components/admin/media-upload-panel";
import { ArticleReader } from "@/components/content/article-reader";
import type { ArticleContentBlock } from "@/components/content/types";
import type { SaveAiTermInput } from "@/lib/ai-terms";
import type { AiTermFableBlock, AiTermFableScan } from "@/lib/markdown";

type PreviewResult = {
  aiTerm: SaveAiTermInput;
  fable: AiTermFableScan;
  importWarnings: string[];
  frontmatter: Record<string, unknown>;
  renderedBlocks: ArticleContentBlock[];
  renderedFable: AiTermFableBlock | null;
};

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type SaveResponse = {
  aiTerm?: {
    locale?: string;
    slug?: string;
  };
};

type UploadedDiagramMedia = {
  url: string;
  alt?: string;
};

const sampleMarkdown = `---
term: "MCP"
term_zh: "模型上下文协议"
full_name: "Model Context Protocol"
slug: "model-context-protocol"
locale: "zh"
translation_key: "model-context-protocol"

short_concept: "MCP 是一种让 AI 应用连接外部工具和数据源的协议。"
short_desc: "MCP 帮助 AI 应用用相对统一的方式连接工具、文件、数据库和服务，让 Agent 和 AI 应用更容易使用外部能力。"
tagline: "AI 应用连接外部世界的一种接口约定。"

beginner_notes:
  plain_explanation: "它让 AI 工具更容易接上外部工具和数据。"
  analogy: "像给 AI 应用准备统一插口。"
  why_it_matters: "减少每个工具重复接入的成本。"
  common_misconception: "MCP 不是模型，也不是单一产品。"

type: "protocol"
difficulty: "beginner"
status: "draft"
visibility: "public"

heat_score: 70
quality_score: 80
trending: true
sort_order: 10

content:
  format: "markdown"
  version: "ai-term-md-v1"

categories:
  - name: "AI Infra"
    slug: "ai-infra"
    description: "AI 基础设施、协议和连接能力相关词条。"
    sort_order: 10

relations:
  - term: "Tool Calling"
    slug: "tool-calling"
    relation_type: "related"
    description: "都和 AI 使用外部工具有关。"
    sort_order: 10

seo:
  title: "MCP 是什么？一篇看懂它在 AI 世界里的意思"
  description: "这是一份用于后台导入测试的 MCP 词条发布稿示例，说明 MCP 是什么、为什么会在 AI 世界中被讨论，以及普通人应该如何理解它。"
  keywords:
    - "MCP"
    - "Model Context Protocol"
    - "AI Agent"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "MCP 是什么？"
  description: "理解 MCP 在 AI 世界里的位置。"
  type: "article"
  image: ""
  image_alt: ""

twitter:
  card: "summary_large_image"
  title: "MCP 是什么？"
  description: "理解 MCP 在 AI 世界里的位置。"
  image: ""

diagram:
  image: ""
  image_alt: ""

source:
  source_note: "示例词条，发布前需要替换为真实资料归档和人工审核内容。"
  ai_assisted: true
  human_reviewed: false
  last_verified_at: "2026-05-19"
  published_at: ""

structured_data:
  schema_type: "DefinedTerm"
  name: "MCP"
  alternate_name: "Model Context Protocol"
  description: "MCP 是一种让 AI 应用连接外部工具和数据源的协议。"
  in_language: "zh-CN"
  publisher_name: "知之"
---

# MCP

## 一句话概念

MCP 是一种让 AI 应用连接外部工具和数据源的协议。

## 快速理解

你可以先把 MCP 理解成一种接口约定。它不是模型本身，而是让 AI 应用更容易和外部工具、文件、数据库、服务对接的一种方式。
`;

function getErrorMessage(data: unknown, fallback: string) {
  return adminApiErrorMessage(data, fallback);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "未填写";
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  if (Array.isArray(value)) {
    return value.length.toString();
  }

  return String(value);
}

function splitMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return { hasFrontmatter: false, frontmatter: "", content: normalized };
  }

  return {
    hasFrontmatter: true,
    frontmatter: match[1],
    content: normalized.slice(match[0].length),
  };
}

function frontmatterString(markdown: string, key: string) {
  const { frontmatter } = splitMarkdown(markdown);
  const pattern = new RegExp(`(^|\\n)${key}:\\s*["']?([^"'\\n]+)["']?(?=\\n|$)`);
  return frontmatter.match(pattern)?.[2]?.trim() ?? "";
}

function joinMarkdown(frontmatter: string, content: string) {
  const cleanFrontmatter = frontmatter.trim();
  const normalizedContent = content.replace(/^\n+/, "");
  return cleanFrontmatter ? `---\n${cleanFrontmatter}\n---\n\n${normalizedContent}` : normalizedContent;
}

function upsertYamlScalar(source: string, key: string, value: string) {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const line = `  ${key}: "${escaped}"`;
  const pattern = new RegExp(`(^|\\n)\\s{2}${key}:.*(?=\\n|$)`);

  if (pattern.test(source)) {
    return source.replace(pattern, (match, prefix: string) => `${prefix}${line}`);
  }

  return `${source.replace(/\s+$/g, "")}\n${line}`;
}

function upsertDiagramFrontmatter(markdown: string, image: string, imageAlt: string) {
  const parts = splitMarkdown(markdown);
  const diagramBlock = parts.frontmatter.match(/(^|\n)diagram:\n((?:  .*(?:\n|$))*)/);
  let nextFrontmatter = parts.frontmatter;

  if (diagramBlock) {
    const block = diagramBlock[0].replace(/^\n/, "");
    let nextBlock = upsertYamlScalar(block, "image", image);
    // 只在用户上传时明确填写了 alt 时才更新，避免覆盖 Frontmatter 中已有的 image_alt
    if (imageAlt) {
      nextBlock = upsertYamlScalar(nextBlock, "image_alt", imageAlt);
    }
    nextFrontmatter = nextFrontmatter.replace(block, nextBlock);
  } else {
    const diagram = `diagram:\n  image: "${image.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"\n  image_alt: "${imageAlt.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
    nextFrontmatter = nextFrontmatter.includes("\nsource:")
      ? nextFrontmatter.replace(/\nsource:/, `\n${diagram}\n\nsource:`)
      : `${nextFrontmatter.trim()}\n\n${diagram}`;
  }

  return parts.hasFrontmatter ? joinMarkdown(nextFrontmatter, parts.content) : markdown;
}

export function AiTermImportWorkbench() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewedMarkdown, setPreviewedMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  const previewFresh = Boolean(preview && previewedMarkdown === markdown);
  const markdownStats = useMemo(
    () => ({
      chars: markdown.length,
      lines: markdown ? markdown.split(/\r?\n/).length : 0,
      slug: preview?.aiTerm.slug ?? "未解析",
    }),
    [markdown, preview?.aiTerm.slug],
  );
  const frontmatterKeys = useMemo(() => Object.keys(preview?.frontmatter ?? {}), [preview]);
  const uploadTarget = useMemo(
    () => ({
      locale: preview?.aiTerm.locale ?? frontmatterString(markdown, "locale"),
      slug: preview?.aiTerm.slug ?? frontmatterString(markdown, "slug"),
    }),
    [markdown, preview?.aiTerm.locale, preview?.aiTerm.slug],
  );

  async function handlePreview() {
    setLoading(true);
    setError(null);
    setSaveState({ status: "idle", message: "" });

    try {
      const response = await fetch("/api/admin/ai-terms/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });

      if (handleAdminUnauthorized(response)) {
        return;
      }

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "AI 词条解析失败。"));
        return;
      }

      setPreview(data as PreviewResult);
      setPreviewedMarkdown(markdown);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "AI 词条解析失败。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaveState({ status: "saving", message: "正在保存 AI 词条..." });
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });

      if (handleAdminUnauthorized(response)) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setSaveState({ status: "error", message: getErrorMessage(data, "AI 词条保存失败。") });
        return;
      }

      const saved = data as SaveResponse;
      setSaveState({
        status: "saved",
        message: `已保存：${saved.aiTerm?.locale ?? "zh"} / ${saved.aiTerm?.slug ?? preview?.aiTerm.slug ?? "未解析"}`,
      });
      setPreviewedMarkdown(markdown);
    } catch (saveError) {
      setSaveState({ status: "error", message: saveError instanceof Error ? saveError.message : "AI 词条保存失败。" });
    }
  }

  function applyDiagramUpload(media: UploadedDiagramMedia) {
    setMarkdown((value) => upsertDiagramFrontmatter(value, media.url, media.alt ?? ""));
    setPreview(null);
    setPreviewedMarkdown("");
    setSaveState({ status: "idle", message: "词条图解已写入 Frontmatter，请重新解析预览后保存。" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Markdown 发布稿</h2>
            <p className="mt-1 text-sm text-muted">粘贴 `summery/aiterms/publish/*.md` 里的完整发布稿。</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMarkdown(sampleMarkdown);
              setPreview(null);
              setPreviewedMarkdown("");
              setError(null);
              setSaveState({ status: "idle", message: "" });
            }}
            className="admin-btn admin-btn-secondary inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold"
          >
            <FileText className="h-4 w-4" />
            填入示例
          </button>
        </div>

        <label className="block">
          <span className="sr-only">AI 词条 Markdown 发布稿</span>
          <textarea
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              setSaveState({ status: "idle", message: "" });
            }}
            spellCheck={false}
            className="min-h-[640px] w-full resize-y border border-line bg-surface p-4 font-mono text-sm leading-6 text-foreground outline-none transition focus:border-accent"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className="admin-btn admin-btn-primary inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            解析预览
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!previewFresh || saveState.status === "saving"}
            className="admin-btn admin-btn-secondary inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            保存为词条草稿
          </button>
          <span className="text-sm text-muted">
            {markdownStats.lines} 行 / {markdownStats.chars} 字符 / slug：{markdownStats.slug}
          </span>
        </div>

        {error ? <p className="whitespace-pre-line border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {saveState.message ? (
          <p
            className={`whitespace-pre-line border px-4 py-3 text-sm ${
              saveState.status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-surface text-muted"
            }`}
          >
            {saveState.message}
          </p>
        ) : null}

        <MediaUploadPanel
          altPlaceholder="例如：MCP 连接 AI 应用、工具和数据源的图解"
          applyLabel="设为图解"
          description="上传后会写入 Frontmatter 的 diagram.image，不会插入正文。"
          insertOnUpload={false}
          onUpload={applyDiagramUpload}
          scope="ai-term"
          targetLocale={uploadTarget.locale}
          targetRole="diagram"
          targetSlug={uploadTarget.slug}
          title="词条图解上传"
        />
      </section>

      <aside className="space-y-4">
        <section className="border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-foreground">正文预览（渲染效果）</h2>
          <p className="mt-1 text-sm text-muted">所见即所得：标题、列表、寓言块等按前台样式排版。</p>
          {preview ? (
            <div className="mt-4">
              {preview.renderedFable ? (
                <section className="mb-6 rounded-md border border-line bg-[color-mix(in_srgb,var(--accent)_5%,var(--paper))] p-4 shadow-[var(--shadow-quiet)] md:p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <p className="text-xs font-semibold uppercase text-accent">寓言故事</p>
                  </div>
                  <h3 className="mt-2 break-words text-xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{preview.renderedFable.title}</h3>
                  <div className="article-prose mt-3" dangerouslySetInnerHTML={{ __html: preview.renderedFable.html }} />
                </section>
              ) : null}

              {preview.renderedBlocks.length > 0 ? (
                <div className="ai-term-prose min-w-0 rounded-md border border-line px-4 py-5 md:px-6 md:py-7">
                  <ArticleReader
                    blocks={preview.renderedBlocks}
                    defaultMode="full"
                    locale="zh"
                    supportsReadingMode={false}
                  />
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted">正文为空，请检查发布稿是否包含一级标题以下的正文内容。</p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">点击“解析预览”后，这里会按前台样式渲染词条正文。</p>
          )}
        </section>

        <section className="border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-foreground">解析结果</h2>
          {preview ? (
            <div className="mt-4 space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                {[
                  ["词条", preview.aiTerm.term],
                  ["Slug", preview.aiTerm.slug],
                  ["语言", preview.aiTerm.locale],
                  ["类型", preview.aiTerm.type],
                  ["难度", preview.aiTerm.difficulty],
                  ["状态", preview.aiTerm.status],
                  ["可见性", preview.aiTerm.visibility],
                  ["分享图", preview.aiTerm.shareImage],
                  ["词条图解", preview.aiTerm.diagramImage],
                  ["图解说明", preview.aiTerm.diagramImageAlt],
                  ["寓言故事", preview.fable.exists ? preview.fable.title ?? "已检测到" : "未检测到"],
                  ["寓言块闭合", preview.fable.closed ? "正常" : "缺少闭合 :::"],
                  ["分类数", preview.aiTerm.categories?.length ?? 0],
                  ["关联数", preview.aiTerm.relations?.length ?? 0],
                  ["Frontmatter", frontmatterKeys.length],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border border-line bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">{label}</dt>
                    <dd className="mt-1 break-words font-semibold text-foreground [overflow-wrap:anywhere]">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <h3 className="text-sm font-semibold text-foreground">一句话概念</h3>
                <p className="mt-2 leading-6 text-muted">{preview.aiTerm.shortConcept}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">给普通人的描述</h3>
                <p className="mt-2 leading-6 text-muted">{preview.aiTerm.shortDesc}</p>
              </div>

              {preview.aiTerm.diagramImage ? (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">词条图解预览</h3>
                  <figure className="mt-2 overflow-hidden border border-line bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.aiTerm.diagramImage} alt={preview.aiTerm.diagramImageAlt ?? ""} className="max-h-72 w-full object-contain" />
                    {preview.aiTerm.diagramImageAlt ? <figcaption className="border-t border-line px-3 py-2 text-xs text-muted">{preview.aiTerm.diagramImageAlt}</figcaption> : null}
                  </figure>
                </div>
              ) : null}

              {preview.importWarnings.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">导入提醒</h3>
                  <ul className="mt-2 space-y-2 text-muted">
                    {preview.importWarnings.map((warning) => (
                      <li key={warning} className="border border-line bg-background px-3 py-2">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">点击“解析预览”后，这里会展示词条字段映射结果、warning 和保存前检查信息。</p>
          )}
        </section>

        {preview ? (
          <section className="border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">分类</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-muted">分类</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(preview.aiTerm.categories ?? []).map((category) => (
                    <span key={category.slug} className="border border-line bg-background px-3 py-1 font-semibold text-foreground">
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
