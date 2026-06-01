import type { AiTermDetail } from "@/lib/ai-terms";
import { siteConfig } from "@/lib/site";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * 构建词条详情页的 JSON-LD：DefinedTerm（优先取 frontmatter structured_data）+ BreadcrumbList。
 */
export function buildAiTermJsonLd(term: AiTermDetail) {
  const path = `/ai-terms/${term.slug}`;
  const url = absoluteUrl(asString(term.canonicalUrl) || path);

  const structured = asRecord(asRecord(term.metadata).structuredData);
  const alternateRaw = asString(structured.alternate_name);
  const alternateName = alternateRaw
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const definedTerm: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: asString(structured.name) || term.term,
    description: asString(structured.description) || term.shortConcept || term.shortDesc,
    inLanguage: asString(structured.in_language) || "zh-CN",
    url,
  };

  if (alternateName.length > 0) {
    definedTerm.alternateName = alternateName.length === 1 ? alternateName[0] : alternateName;
  }

  const labels = { home: "首页", terms: "AI 词条" };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: labels.home, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: labels.terms, item: absoluteUrl("/ai-terms") },
      { "@type": "ListItem", position: 3, name: term.term, item: url },
    ],
  };

  return [definedTerm, breadcrumb];
}
