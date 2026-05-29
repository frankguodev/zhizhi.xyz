import type { SaveAiTermInput } from "@/lib/ai-terms";
import { scanAiTermFable } from "@/lib/markdown";

export type AiTermQualityLevel = "error" | "warning" | "suggestion";

export type AiTermQualityIssue = {
  id: string;
  level: AiTermQualityLevel;
  title: string;
  detail: string;
  target?: "frontmatter" | "content";
};

export type AiTermQualityReport = {
  issues: AiTermQualityIssue[];
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
};

function textLength(value: string | null | undefined) {
  return (value ?? "").trim().length;
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function nestedRecord(value: unknown, key: string) {
  return metadataRecord(metadataRecord(value)[key]);
}

function nestedString(value: unknown, key: string) {
  const result = metadataRecord(value)[key];
  return typeof result === "string" ? result.trim() : "";
}

export function checkAiTermQuality(aiTerm: SaveAiTermInput): AiTermQualityReport {
  const issues: AiTermQualityIssue[] = [];
  const metadata = metadataRecord(aiTerm.metadata);
  const openGraph = nestedRecord(metadata, "openGraph");
  const twitter = nestedRecord(metadata, "twitter");
  const ogImage = nestedString(openGraph, "image");
  const twitterImage = nestedString(twitter, "image");
  const fable = scanAiTermFable(aiTerm.contentMd, aiTerm.locale);

  function add(issue: AiTermQualityIssue) {
    issues.push(issue);
  }

  if (!aiTerm.term.trim()) {
    add({ id: "missing-term", level: "error", title: "缺少词条名", detail: "Frontmatter 必须提供 term。", target: "frontmatter" });
  }

  if (!aiTerm.slug.trim()) {
    add({ id: "missing-slug", level: "error", title: "缺少 slug", detail: "Frontmatter 必须提供稳定 slug。", target: "frontmatter" });
  }

  if (!aiTerm.shortConcept.trim()) {
    add({ id: "missing-short-concept", level: "error", title: "缺少一句话概念", detail: "short_concept 不能为空。", target: "frontmatter" });
  }

  if (!aiTerm.shortDesc.trim()) {
    add({ id: "missing-short-desc", level: "error", title: "缺少简短解释", detail: "short_desc 不能为空。", target: "frontmatter" });
  }

  if (textLength(aiTerm.contentMd) < 300) {
    add({ id: "content-too-short", level: "error", title: "正文过短", detail: "AI 词条正文建议至少 300 字，避免发布空壳词条。", target: "content" });
  }

  if (!/^#\s+.+$/m.test(aiTerm.contentMd)) {
    add({ id: "missing-h1", level: "warning", title: "缺少一级标题", detail: "正文建议保留一个清晰的 # 一级标题。", target: "content" });
  }

  if (fable.exists && !fable.closed) {
    add({ id: "unclosed-fable-block", level: "error", title: "寓言故事块未闭合", detail: "检测到 :::fable 但缺少闭合的 :::，会导致后续正文被误判为寓言故事。", target: "content" });
  }

  if ((aiTerm.categories ?? []).length === 0) {
    add({ id: "missing-categories", level: "error", title: "缺少分类", detail: "至少需要一个 categories 项，方便前台聚合和导航。", target: "frontmatter" });
  }

  if (!aiTerm.seoTitle || textLength(aiTerm.seoTitle) < 10) {
    add({ id: "seo-title-short", level: "warning", title: "SEO 标题偏短", detail: "seo.title 建议更具体，便于搜索结果理解。", target: "frontmatter" });
  }

  if (textLength(aiTerm.seoTitle) > 70) {
    add({ id: "seo-title-long", level: "warning", title: "SEO 标题偏长", detail: "seo.title 建议控制在 70 字以内。", target: "frontmatter" });
  }

  if (!aiTerm.seoDescription || textLength(aiTerm.seoDescription) < 50) {
    add({ id: "seo-description-short", level: "warning", title: "SEO 描述偏短", detail: "seo.description 建议说明词条价值和读者能获得什么。", target: "frontmatter" });
  }

  if (textLength(aiTerm.seoDescription) > 160) {
    add({ id: "seo-description-long", level: "warning", title: "SEO 描述偏长", detail: "seo.description 建议控制在 160 字以内。", target: "frontmatter" });
  }

  if ((aiTerm.seoKeywords ?? []).length < 2) {
    add({ id: "seo-keywords-few", level: "suggestion", title: "SEO 关键词较少", detail: "建议提供 2 个以上关键词。", target: "frontmatter" });
  }

  if (ogImage && twitterImage && ogImage !== twitterImage) {
    add({
      id: "share-image-mismatch",
      level: "warning",
      title: "分享图不一致",
      detail: "open_graph.image 和 twitter.image 建议保持一致。",
      target: "frontmatter",
    });
  }

  if ((ogImage || twitterImage || aiTerm.shareImage) && !aiTerm.shareImageAlt) {
    add({ id: "missing-share-image-alt", level: "suggestion", title: "缺少分享图说明", detail: "建议提供 open_graph.image_alt。", target: "frontmatter" });
  }

  if (!aiTerm.diagramImage) {
    add({ id: "missing-diagram-image", level: "warning", title: "缺少词条解释信息图", detail: "每个 AI 词条详情页都应提供 diagram.image，用于顶部解释信息图。", target: "frontmatter" });
  }

  if (aiTerm.diagramImage && !aiTerm.diagramImageAlt) {
    add({ id: "missing-diagram-image-alt", level: "suggestion", title: "缺少词条图解说明", detail: "有 diagram.image 时建议提供 diagram.image_alt。", target: "frontmatter" });
  }

  if (aiTerm.status === "published" && !aiTerm.humanReviewed) {
    add({ id: "published-not-reviewed", level: "warning", title: "未标记人工审核", detail: "发布前建议将 source.human_reviewed 设为 true。", target: "frontmatter" });
  }

  const errorCount = issues.filter((issue) => issue.level === "error").length;
  const warningCount = issues.filter((issue) => issue.level === "warning").length;
  const suggestionCount = issues.filter((issue) => issue.level === "suggestion").length;

  return { issues, errorCount, warningCount, suggestionCount };
}
