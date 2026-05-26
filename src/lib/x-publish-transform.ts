import type { ArticleRecord } from "@/data/articles";
import { siteConfig } from "@/lib/site";

export type XPublishMediaItem = {
  alt: string;
  kind: "image" | "video";
  url: string;
};

export type XLongformPreviewBlock =
  | { kind: "callout"; body: string; label: string; title?: string }
  | { kind: "code"; text: string }
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "media"; alt: string; mediaKind: "image" | "video"; url: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string };

export type XPublishCheck = {
  detail: string;
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
};

export type XLongformDraft = {
  articleUrl: string;
  blocks: XLongformPreviewBlock[];
  charCount: number;
  checks: XPublishCheck[];
  copyText: string;
  hashtags: string[];
  lead: string;
  media: XPublishMediaItem[];
  summary: string;
  title: string;
};

const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const markdownImagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)(?:\s+"[^"]*")?\)/g;
const htmlImagePattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const mediaLinkPattern = /(?:^|\s)(https?:\/\/[^\s)]+?\.(?:mp4|webm|mov|m4v))(?:\s|$)/gi;
const orderedListPattern = /^\d+[.)]\s+/;
const unorderedListPattern = /^[-*+]\s+/;
const directiveLabels: Record<string, string> = {
  advanced: "进阶理解",
  author: "作者经验",
  detail: "详细解释",
  example: "示例",
  warning: "注意",
};

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${siteConfig.url}${path}`;
}

function articleUrl(article: ArticleRecord) {
  const path = article.locale === "en" ? `/en/articles/${article.slug}` : `/articles/${article.slug}`;
  return `${siteConfig.url}${path}`;
}

function bodyFromMarkdown(markdown: string) {
  return markdown.replace(frontmatterPattern, "").trim();
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(markdownLinkPattern, (_match, text: string, url: string) => `${text}：${absoluteUrl(url)}`)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function normalizeHashtag(value: string) {
  const normalized = value.replace(/[^\p{L}\p{N}_\u4e00-\u9fa5]/gu, "").trim();
  return normalized ? `#${normalized}` : "";
}

function uniqueMedia(items: XPublishMediaItem[]) {
  const seen = new Set<string>();
  const result: XPublishMediaItem[] = [];

  for (const item of items) {
    const key = `${item.kind}:${item.url}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

function extractMedia(article: ArticleRecord, body: string) {
  const items: XPublishMediaItem[] = [];

  for (const value of [article.coverImage, article.ogImage, article.twitterImage]) {
    if (value) {
      items.push({
        alt: article.coverImageAlt || article.ogImageAlt || article.title,
        kind: "image",
        url: absoluteUrl(value),
      });
    }
  }

  for (const match of body.matchAll(markdownImagePattern)) {
    items.push({
      alt: match[1]?.trim() || "文章图片",
      kind: "image",
      url: absoluteUrl(match[2]),
    });
  }

  for (const match of body.matchAll(htmlImagePattern)) {
    items.push({
      alt: "文章图片",
      kind: "image",
      url: absoluteUrl(match[1]),
    });
  }

  for (const match of body.matchAll(mediaLinkPattern)) {
    items.push({
      alt: "文章视频",
      kind: "video",
      url: match[1],
    });
  }

  return uniqueMedia(items);
}

function firstTextLine(body: string, article: ArticleRecord) {
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(":::") || trimmed.startsWith("!") || trimmed.startsWith("|")) {
      continue;
    }

    const text = cleanInlineMarkdown(trimmed);
    if (text && text !== article.title) {
      return text;
    }
  }

  return "";
}

function pushParagraph(blocks: XLongformPreviewBlock[], paragraph: string[]) {
  const text = paragraph.map(cleanInlineMarkdown).filter(Boolean).join("\n");
  if (text) {
    blocks.push({ kind: "paragraph", text });
  }
  paragraph.length = 0;
}

function pushList(blocks: XLongformPreviewBlock[], list: { items: string[]; ordered: boolean } | null) {
  if (list && list.items.length > 0) {
    blocks.push({ kind: "list", items: list.items, ordered: list.ordered });
  }
}

function buildPreviewBlocks(body: string, article: ArticleRecord) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: XLongformPreviewBlock[] = [];
  const paragraph: string[] = [];
  let list: { items: string[]; ordered: boolean } | null = null;
  let callout: { body: string[]; label: string; title?: string } | null = null;
  let codeLines: string[] = [];
  let inCodeBlock = false;
  let skippedFirstTitle = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ kind: "code", text: codeLines.join("\n").trim() });
        codeLines = [];
        inCodeBlock = false;
      } else {
        pushParagraph(blocks, paragraph);
        pushList(blocks, list);
        list = null;
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!skippedFirstTitle && /^#\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^#\s+/, "").trim();
      if (heading === article.title) {
        skippedFirstTitle = true;
        continue;
      }
    }

    const directive = trimmed.match(/^:::(detail|example|warning|advanced|author)(?:\s+(.+))?\s*$/);
    if (directive) {
      pushParagraph(blocks, paragraph);
      pushList(blocks, list);
      list = null;
      const label = directiveLabels[directive[1]] ?? directive[1];
      callout = { body: [], label, title: directive[2]?.trim() };
      continue;
    }

    if (trimmed === ":::") {
      if (callout) {
        blocks.push({
          kind: "callout",
          body: callout.body.map(cleanInlineMarkdown).filter(Boolean).join("\n"),
          label: callout.label,
          title: callout.title,
        });
        callout = null;
      }
      continue;
    }

    if (callout) {
      if (trimmed) {
        callout.body.push(trimmed);
      }
      continue;
    }

    const imageOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (imageOnly) {
      pushParagraph(blocks, paragraph);
      pushList(blocks, list);
      list = null;
      blocks.push({
        alt: imageOnly[1]?.trim() || "文章图片",
        kind: "media",
        mediaKind: "image",
        url: absoluteUrl(imageOnly[2]),
      });
      continue;
    }

    const heading = trimmed.match(/^(#{2,6})\s+(.+)$/);
    if (heading) {
      pushParagraph(blocks, paragraph);
      pushList(blocks, list);
      list = null;
      blocks.push({ kind: "heading", level: heading[1].length === 2 ? 2 : 3, text: cleanInlineMarkdown(heading[2]) });
      continue;
    }

    if (trimmed.startsWith(">")) {
      pushParagraph(blocks, paragraph);
      pushList(blocks, list);
      list = null;
      blocks.push({ kind: "quote", text: cleanInlineMarkdown(trimmed.replace(/^>\s?/, "")) });
      continue;
    }

    const isOrdered = orderedListPattern.test(trimmed);
    const isUnordered = unorderedListPattern.test(trimmed);
    if (isOrdered || isUnordered) {
      pushParagraph(blocks, paragraph);
      const item = cleanInlineMarkdown(trimmed.replace(isOrdered ? orderedListPattern : unorderedListPattern, ""));
      if (!list || list.ordered !== isOrdered) {
        pushList(blocks, list);
        list = { items: [], ordered: isOrdered };
      }
      if (item) {
        list.items.push(item);
      }
      continue;
    }

    if (!trimmed) {
      pushParagraph(blocks, paragraph);
      pushList(blocks, list);
      list = null;
      continue;
    }

    pushList(blocks, list);
    list = null;
    paragraph.push(line);
  }

  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({ kind: "code", text: codeLines.join("\n").trim() });
  }

  if (callout) {
    blocks.push({
      kind: "callout",
      body: callout.body.map(cleanInlineMarkdown).filter(Boolean).join("\n"),
      label: callout.label,
      title: callout.title,
    });
  }

  pushParagraph(blocks, paragraph);
  pushList(blocks, list);

  return blocks;
}

function blockToCopyText(block: XLongformPreviewBlock) {
  switch (block.kind) {
    case "callout":
      return [`【${block.label}】${block.title ?? ""}`.trim(), block.body].filter(Boolean).join("\n");
    case "code":
      return block.text ? `代码片段：\n${block.text}` : "";
    case "heading":
      return `${"#".repeat(block.level)} ${block.text}`;
    case "list":
      return block.items.map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`)).join("\n");
    case "media":
      return `【${block.mediaKind === "image" ? "图片" : "视频"}：${block.alt}】${block.url}`;
    case "paragraph":
    case "quote":
      return block.text;
    default:
      return "";
  }
}

function checksForDraft(article: ArticleRecord, body: string, copyText: string, media: XPublishMediaItem[], blocks: XLongformPreviewBlock[]): XPublishCheck[] {
  const checks: XPublishCheck[] = [];
  const hasCode = blocks.some((block) => block.kind === "code");
  const hasMissingAlt = media.some((item) => item.kind === "image" && (!item.alt || item.alt === "文章图片"));
  const hasTable = body
    .split(/\r?\n/)
    .some((line) => /^\s*\|.+\|\s*$/.test(line));
  const hasUnresolvedMarker = /TODO|TBD|待补充|需核实|FIXME|\[补充|\[待定/i.test(body);

  checks.push({
    detail: article.title ? "已使用文章标题作为长文开头。" : "文章标题为空，复制稿缺少开头锚点。",
    id: "title",
    label: "标题",
    status: article.title ? "pass" : "fail",
  });
  checks.push({
    detail: article.summary ? "已作为首段导语展示。" : "建议给文章补一段摘要，X 长文首屏会更稳。",
    id: "summary",
    label: "导语",
    status: article.summary ? "pass" : "warn",
  });
  checks.push({
    detail: copyText.length > 12000 ? "内容较长，发布前建议在 X 编辑器里确认折叠和图片位置。" : "长度适合先作为长文草稿粘贴。",
    id: "length",
    label: "长度",
    status: copyText.length > 12000 ? "warn" : "pass",
  });
  checks.push({
    detail: media.length > 0 ? `识别到 ${media.length} 个媒体资源，需在 X 手动上传或核对。` : "没有识别到图片或视频，若原文有媒体请检查 Markdown。",
    id: "media",
    label: "媒体",
    status: media.length > 0 ? "pass" : "warn",
  });
  checks.push({
    detail: hasMissingAlt ? "有图片缺少清晰 alt 文案，发布前建议人工补一句说明。" : "图片说明可用于发布前核对。",
    id: "alt",
    label: "图片说明",
    status: hasMissingAlt ? "warn" : "pass",
  });
  checks.push({
    detail: hasCode ? "X 长文对代码块排版不稳定，建议发布前人工确认。" : "未检测到代码块。",
    id: "code",
    label: "代码块",
    status: hasCode ? "warn" : "pass",
  });
  checks.push({
    detail: hasTable ? "Markdown 表格不会按网站样式进入 X，建议改为列表或截图。" : "未检测到 Markdown 表格。",
    id: "table",
    label: "表格",
    status: hasTable ? "warn" : "pass",
  });
  checks.push({
    detail: hasUnresolvedMarker ? "正文疑似还有待补充或待核实标记。" : "未检测到明显占位标记。",
    id: "markers",
    label: "占位标记",
    status: hasUnresolvedMarker ? "warn" : "pass",
  });

  return checks;
}

export function buildXLongformDraft(article: ArticleRecord, markdown?: string): XLongformDraft {
  const body = markdown ? bodyFromMarkdown(markdown) : article.content;
  const blocks = buildPreviewBlocks(body, article);
  const hashtags = article.tags.map(normalizeHashtag).filter(Boolean).slice(0, 6);
  const url = articleUrl(article);
  const lead = article.summary || firstTextLine(body, article);
  const normalizedBody = blocks.map(blockToCopyText).filter(Boolean).join("\n\n");
  const sections = [
    article.title,
    lead,
    normalizedBody,
    article.locale === "en" ? `Original article: ${url}` : `原文链接：${url}`,
    hashtags.length > 0 ? hashtags.join(" ") : "",
  ].filter((section) => section.trim().length > 0);
  const copyText = sections.join("\n\n").trim();
  const media = extractMedia(article, body);

  return {
    articleUrl: url,
    blocks,
    charCount: copyText.length,
    checks: checksForDraft(article, body, copyText, media, blocks),
    copyText,
    hashtags,
    lead,
    media,
    summary: article.summary,
    title: article.title,
  };
}
