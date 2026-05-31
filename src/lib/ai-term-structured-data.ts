import type { AiTermDetail } from "@/lib/ai-terms";
import { siteConfig, type Locale } from "@/lib/site";

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
export function buildAiTermJsonLd(term: AiTermDetail, locale: Locale) {
  const path = locale === "en" ? `/en/ai-terms/${term.slug}` : `/ai-terms/${term.slug}`;
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
    inLanguage: asString(structured.in_language) || (locale === "en" ? "en" : "zh-CN"),
    url,
  };

  if (alternateName.length > 0) {
    definedTerm.alternateName = alternateName.length === 1 ? alternateName[0] : alternateName;
  }

  const labels = locale === "en" ? { home: "Home", terms: "AI Terms" } : { home: "首页", terms: "AI 词条" };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: labels.home, item: absoluteUrl(locale === "en" ? "/en" : "/") },
      { "@type": "ListItem", position: 2, name: labels.terms, item: absoluteUrl(locale === "en" ? "/en/ai-terms" : "/ai-terms") },
      { "@type": "ListItem", position: 3, name: term.term, item: url },
    ],
  };

  return [definedTerm, breadcrumb];
}
