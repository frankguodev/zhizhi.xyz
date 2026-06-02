import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import type { ArticleContentBlock, LayeredBlockType } from "@/components/content/types";
import type { Locale } from "@/lib/site";

const directivePattern = /^:::(detail|example|warning|advanced|author)(?:\s+(.+))?\s*$/;
const fableDirectivePattern = /^:::fable(?:\s+(.+))?\s*$/;
const closingPattern = /^:::$/;

export type AiTermFableBlock = {
  id: string;
  title: string;
  html: string;
};

export type AiTermFableScan = {
  exists: boolean;
  title: string | null;
  closed: boolean;
};

export type AiTermBodyDedup = {
  /** 剥离正文首个一级标题（与详情页 hero 标题重复）。 */
  stripLeadingTitle?: boolean;
  /** 剥离「一句话概念」段落（已在 hero 展示）。 */
  stripSummary?: boolean;
  /** 剥离「快速理解」段落（已由快速理解卡片承载）。 */
  stripBeginnerNotes?: boolean;
  /** 剥离「相关概念」段落（已由相关概念卡片承载）。 */
  stripRelations?: boolean;
  /** 抽取「参考资料」段落，折叠进来源与校验卡片。 */
  extractReferences?: boolean;
};

const beginnerNoteDedupKeys = ["plain_explanation", "analogy", "why_it_matters", "common_misconception"] as const;

function hasBeginnerNotesContent(beginnerNotes: unknown) {
  if (!beginnerNotes || typeof beginnerNotes !== "object" || Array.isArray(beginnerNotes)) {
    return false;
  }
  const notes = beginnerNotes as Record<string, unknown>;
  return beginnerNoteDedupKeys.some((key) => typeof notes[key] === "string" && (notes[key] as string).trim().length > 0);
}

/**
 * 词条正文去重配置，与公开详情页 `src/app/ai-terms/[slug]/page.tsx` 保持一致，
 * 供后台编辑/导入的解析预览复用，确保预览效果与发布后一致。
 */
export function buildAiTermBodyDedup(term: { beginnerNotes?: unknown; relations?: unknown[] }): AiTermBodyDedup {
  return {
    stripLeadingTitle: true,
    stripSummary: true,
    stripBeginnerNotes: hasBeginnerNotesContent(term.beginnerNotes),
    stripRelations: Array.isArray(term.relations) && term.relations.length > 0,
    extractReferences: true,
  };
}

const dedupHeadings: Record<Locale, { summary: string[]; beginnerNotes: string[]; relations: string[]; references: string[] }> = {
  zh: {
    summary: ["一句话概念"],
    beginnerNotes: ["快速理解"],
    relations: ["相关概念"],
    references: ["参考资料"],
  },
};

function normalizeHeading(value: string) {
  return value
    .trim()
    .replace(/[?？.。:：!！]+$/u, "")
    .trim()
    .toLowerCase();
}

function applyAiTermDedup(body: string, locale: Locale, dedup: AiTermBodyDedup): { body: string; referencesMarkdown: string | null } {
  const headings = dedupHeadings[locale];
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let referenceLines: string[] | null = null;
  let mode: "keep" | "strip" | "references" = "keep";
  let leadingTitleStripped = false;

  const matchesHeading = (title: string, set: string[]) => set.some((entry) => normalizeHeading(entry) === normalizeHeading(title));

  for (const line of lines) {
    const h1 = line.match(/^#(?!#)\s+(.+)$/);
    if (h1) {
      mode = "keep";
      if (dedup.stripLeadingTitle && !leadingTitleStripped) {
        leadingTitleStripped = true;
        continue;
      }
      out.push(line);
      continue;
    }

    const h2 = line.match(/^##(?!#)\s+(.+?)\s*$/);
    if (h2) {
      const title = h2[1];

      if (dedup.stripSummary && matchesHeading(title, headings.summary)) {
        mode = "strip";
        continue;
      }
      if (dedup.stripBeginnerNotes && matchesHeading(title, headings.beginnerNotes)) {
        mode = "strip";
        continue;
      }
      if (dedup.stripRelations && matchesHeading(title, headings.relations)) {
        mode = "strip";
        continue;
      }
      if (dedup.extractReferences && matchesHeading(title, headings.references)) {
        mode = "references";
        referenceLines = referenceLines ?? [];
        continue;
      }

      mode = "keep";
      out.push(line);
      continue;
    }

    if (mode === "keep") {
      out.push(line);
    } else if (mode === "references" && referenceLines) {
      referenceLines.push(line);
    }
  }

  const referencesMarkdown = referenceLines && referenceLines.join("\n").trim() ? referenceLines.join("\n").trim() : null;
  return {
    body: out.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    referencesMarkdown,
  };
}

type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function enhanceArticleOverview(html: string) {
  const titlePattern = "文章一览";
  const overviewPattern = new RegExp(`<h2\\b[^>]*>\\s*(${titlePattern})\\s*</h2>\\s*<ul>([\\s\\S]*?)</ul>`, "i");
  const match = html.match(overviewPattern);

  if (!match) {
    return html;
  }

  const title = match[1];
  const listItems = match[2];
  const kicker = "阅读导图";

  return html.replace(
    overviewPattern,
    `<section id="article-overview" class="article-overview" aria-labelledby="article-overview-title"><p class="article-overview-kicker">${kicker}</p><p id="article-overview-title" class="article-overview-title">${title}</p><ul>${listItems}</ul></section>`,
  );
}

function enhanceOfficialResourceLinks(html: string) {
  const resourceParagraphPattern =
    /<p>([^<]*(?:官方资料|官方文档|资料入口|官方入口|Official resources|Official docs|Official documentation)[^<]*?)(<a\b[\s\S]*?<\/a>[\s\S]*?)<\/p>/gi;
  const linkPattern = /<a\b[\s\S]*?<\/a>/gi;
  const resourceBlocks: string[] = [];

  const htmlWithoutResources = html.replace(resourceParagraphPattern, (paragraph, rawTitle: string, rawLinks: string) => {
    const links = rawLinks.match(linkPattern) ?? [];

    if (links.length < 3) {
      return paragraph;
    }

    const title = rawTitle.trim().replace(/[：:，,。.\s]+$/u, "");
    const label = "官方资料";
    const items = links.map((link) => `<li>${link}</li>`).join("");

    resourceBlocks.push(`<section class="article-official-resources" aria-label="${label}"><p class="article-official-resources-title">${title}</p><ul>${items}</ul></section>`);
    return "";
  });

  return resourceBlocks.length > 0 ? `${htmlWithoutResources}${resourceBlocks.join("")}` : html;
}

function rehypeArticleExternalLinks() {
  return function transform(tree: HastNode) {
    function visit(node: HastNode) {
      if (node.type === "element" && node.tagName === "a") {
        const properties = node.properties ?? {};
        const href = properties.href;

        if (typeof href === "string" && /^https?:\/\//i.test(href)) {
          properties.target = "_blank";
          properties.rel = "noreferrer";
          node.properties = properties;
        }
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    }

    visit(tree);
  };
}

async function markdownToHtml(markdown: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeArticleExternalLinks)
    .use(rehypeStringify)
    .process(markdown);

  return enhanceOfficialResourceLinks(enhanceArticleOverview(String(file)));
}

function fallbackTitle(type: LayeredBlockType, locale: Locale) {
  const titles: Record<Locale, Record<LayeredBlockType, string>> = {
    zh: {
      detail: "详细解释",
      example: "示例",
      warning: "注意",
      advanced: "进阶内容",
      author: "作者判断",
    },
  };

  return titles[locale][type];
}

export async function parseLayeredMarkdown(markdown: string, locale: Locale = "zh"): Promise<ArticleContentBlock[]> {
  const lines = markdown.split(/\r?\n/);
  const blocks: ArticleContentBlock[] = [];
  const pending: string[] = [];
  let index = 0;

  async function flushMarkdown() {
    const raw = pending.join("\n").trim();
    pending.length = 0;

    if (!raw) {
      return;
    }

    blocks.push({
      id: `md-${index++}`,
      kind: "markdown",
      html: await markdownToHtml(raw),
    });
  }

  for (let cursor = 0; cursor < lines.length; cursor++) {
    const match = lines[cursor].match(directivePattern);

    if (!match) {
      pending.push(lines[cursor]);
      continue;
    }

    await flushMarkdown();

    const type = match[1] as LayeredBlockType;
    const title = match[2]?.trim() || fallbackTitle(type, locale);
    const inner: string[] = [];
    cursor++;

    while (cursor < lines.length && !closingPattern.test(lines[cursor].trim())) {
      inner.push(lines[cursor]);
      cursor++;
    }

    blocks.push({
      id: `${type}-${index++}`,
      kind: "layer",
      type,
      title,
      html: await markdownToHtml(inner.join("\n").trim()),
    });
  }

  await flushMarkdown();
  return blocks;
}

function extractFableTitle(rawTitle: string | undefined, inner: string[]) {
  if (rawTitle?.trim()) {
    return { title: rawTitle.trim(), content: inner };
  }

  const firstMeaningfulLine = inner.findIndex((line) => line.trim());
  if (firstMeaningfulLine >= 0) {
    const line = inner[firstMeaningfulLine].trim();
    const titleMatch = line.match(/^title:\s*["']?(.+?)["']?\s*$/i);
    if (titleMatch?.[1]) {
      return {
        title: titleMatch[1].trim(),
        content: inner.filter((_, index) => index !== firstMeaningfulLine),
      };
    }

    const headingMatch = line.match(/^#{2,4}\s+(.+)$/);
    if (headingMatch?.[1]) {
      return {
        title: headingMatch[1].trim(),
        content: inner.filter((_, index) => index !== firstMeaningfulLine),
      };
    }
  }

  return {
    title: "寓言故事",
    content: inner,
  };
}

export async function parseAiTermMarkdown(
  markdown: string,
  locale: Locale = "zh",
  dedup: AiTermBodyDedup = {},
): Promise<{ blocks: ArticleContentBlock[]; fable: AiTermFableBlock | null; referencesHtml: string | null }> {
  const lines = markdown.split(/\r?\n/);
  const withoutFable: string[] = [];
  let fable: AiTermFableBlock | null = null;

  for (let cursor = 0; cursor < lines.length; cursor++) {
    const match = lines[cursor].match(fableDirectivePattern);

    if (!match) {
      withoutFable.push(lines[cursor]);
      continue;
    }

    const inner: string[] = [];
    cursor++;

    while (cursor < lines.length && !closingPattern.test(lines[cursor].trim())) {
      inner.push(lines[cursor]);
      cursor++;
    }

    if (!fable) {
      const extracted = extractFableTitle(match[1], inner);
      const content = extracted.content.join("\n").trim();

      if (content) {
        fable = {
          id: "fable-0",
          title: extracted.title,
          html: await markdownToHtml(content),
        };
      }
    }
  }

  let body = withoutFable.join("\n");
  let referencesHtml: string | null = null;
  const hasDedup = Boolean(
    dedup.stripLeadingTitle || dedup.stripSummary || dedup.stripBeginnerNotes || dedup.stripRelations || dedup.extractReferences,
  );

  if (hasDedup) {
    const result = applyAiTermDedup(body, locale, dedup);
    body = result.body;
    if (result.referencesMarkdown) {
      referencesHtml = await markdownToHtml(result.referencesMarkdown);
    }
  }

  return {
    blocks: await parseLayeredMarkdown(body, locale),
    fable,
    referencesHtml,
  };
}

export function scanAiTermFable(markdown: string): AiTermFableScan {
  const lines = markdown.split(/\r?\n/);

  for (let cursor = 0; cursor < lines.length; cursor++) {
    const match = lines[cursor].match(fableDirectivePattern);

    if (!match) {
      continue;
    }

    const inner: string[] = [];
    cursor++;

    while (cursor < lines.length && !closingPattern.test(lines[cursor].trim())) {
      inner.push(lines[cursor]);
      cursor++;
    }

    const closed = cursor < lines.length;
    const extracted = extractFableTitle(match[1], inner);

    return {
      exists: true,
      title: extracted.title,
      closed,
    };
  }

  return {
    exists: false,
    title: null,
    closed: true,
  };
}
