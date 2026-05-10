import type { ArticleContentBlock, ArticleTocItem } from "@/components/content/types";

const headingPattern = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
const idPattern = /\sid="([^"]+)"/i;
const overviewPattern = /<section\b[^>]*\bid="article-overview"[^>]*>[\s\S]*?<p\b[^>]*\bclass="[^"]*\barticle-overview-title\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toPlainText(html: string) {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

export function buildArticleToc(blocks: ArticleContentBlock[]) {
  const items: ArticleTocItem[] = [];

  for (const block of blocks) {
    const html = block.html;
    const overviewMatch = html.match(overviewPattern);

    if (overviewMatch && !items.some((item) => item.id === "article-overview")) {
      const overviewTitle = toPlainText(overviewMatch[1]);

      if (overviewTitle) {
        items.push({ id: "article-overview", title: overviewTitle, level: 2 });
      }
    }

    headingPattern.lastIndex = 0;

    for (const match of html.matchAll(headingPattern)) {
      const id = match[1].match(idPattern)?.[1];
      const title = toPlainText(match[2]);

      if (id && title) {
        items.push({ id, title, level: 2 });
      }
    }
  }

  const h2Count = items.filter((item) => item.level === 2).length;
  return h2Count >= 3 ? items : [];
}
