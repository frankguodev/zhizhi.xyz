import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import type { ArticleContentBlock, LayeredBlockType } from "@/components/content/types";
import type { Locale } from "@/lib/site";

const directivePattern = /^:::(detail|example|warning|advanced|author)(?:\s+(.+))?\s*$/;
const closingPattern = /^:::$/;

type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function enhanceArticleOverview(html: string, locale: Locale) {
  const titlePattern = locale === "en" ? "(?:Article overview|Overview|At a glance)" : "文章一览";
  const overviewPattern = new RegExp(`<h2\\b[^>]*>\\s*(${titlePattern})\\s*</h2>\\s*<ul>([\\s\\S]*?)</ul>`, "i");
  const match = html.match(overviewPattern);

  if (!match) {
    return html;
  }

  const title = match[1];
  const listItems = match[2];
  const kicker = locale === "en" ? "Reading map" : "阅读导图";

  return html.replace(
    overviewPattern,
    `<section id="article-overview" class="article-overview" aria-labelledby="article-overview-title"><p class="article-overview-kicker">${kicker}</p><p id="article-overview-title" class="article-overview-title">${title}</p><ul>${listItems}</ul></section>`,
  );
}

function enhanceOfficialResourceLinks(html: string, locale: Locale) {
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
    const label = locale === "en" ? "Official resources" : "官方资料";
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

async function markdownToHtml(markdown: string, locale: Locale) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeArticleExternalLinks)
    .use(rehypeStringify)
    .process(markdown);

  return enhanceOfficialResourceLinks(enhanceArticleOverview(String(file), locale), locale);
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
    en: {
      detail: "Detailed explanation",
      example: "Example",
      warning: "Watch out",
      advanced: "Advanced understanding",
      author: "My experience",
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
      html: await markdownToHtml(raw, locale),
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
      html: await markdownToHtml(inner.join("\n").trim(), locale),
    });
  }

  await flushMarkdown();
  return blocks;
}
