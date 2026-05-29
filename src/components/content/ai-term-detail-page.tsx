import Link from "next/link";
import { ArrowLeft, BookOpenText, CheckCircle2, ChevronRight, Home, Lightbulb, Link2, Sparkles } from "lucide-react";
import { ArticleReader } from "@/components/content/article-reader";
import { BackToTopButton } from "@/components/content/back-to-top-button";
import type { ArticleContentBlock } from "@/components/content/types";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { AiTermDetail, AiTermRelationSummary } from "@/lib/ai-terms";
import type { AiTermFableBlock } from "@/lib/markdown";
import type { Locale } from "@/lib/site";

type AiTermDetailLike = Pick<
  AiTermDetail,
  | "aiAssisted"
  | "beginnerNotes"
  | "contentMd"
  | "diagramImage"
  | "diagramImageAlt"
  | "fullName"
  | "humanReviewed"
  | "lastVerifiedAt"
  | "relations"
  | "shortConcept"
  | "shortDesc"
  | "slug"
  | "sourceNote"
  | "term"
  | "termZh"
  | "updatedAt"
>;

type AiTermDetailPageProps = {
  blocks: ArticleContentBlock[];
  fable?: AiTermFableBlock | null;
  locale: Locale;
  term: AiTermDetailLike;
};

const copy = {
  zh: {
    aiAssisted: "AI 辅助整理",
    back: "返回词条列表",
    currentPathPrefix: "/ai-terms",
    diagram: "词条解释信息图",
    fable: "寓言故事",
    home: "首页",
    humanReviewed: "人工审核",
    quick: "快速理解",
    related: "相关概念",
    source: "来源与校验",
    summary: "一句话理解",
    terms: "AI 词条",
    updated: "最近校验",
    verifiedFallback: "最近更新",
    notes: {
      plain_explanation: "普通解释",
      analogy: "类比理解",
      why_it_matters: "为什么重要",
      common_misconception: "常见误区",
    },
    relationTypes: {
      related: "相关",
      similar: "相似",
      opposite: "对照",
      upstream: "前置",
      downstream: "延伸",
      ecosystem: "生态",
    },
  },
  en: {
    aiAssisted: "AI-assisted",
    back: "Back to AI terms",
    currentPathPrefix: "/en/ai-terms",
    diagram: "Term explanation diagram",
    fable: "Fable",
    home: "Home",
    humanReviewed: "Human reviewed",
    quick: "Quick understanding",
    related: "Related concepts",
    source: "Source and review",
    summary: "In one line",
    terms: "AI Terms",
    updated: "Last verified",
    verifiedFallback: "Recently updated",
    notes: {
      plain_explanation: "Plain explanation",
      analogy: "Analogy",
      why_it_matters: "Why it matters",
      common_misconception: "Common misconception",
    },
    relationTypes: {
      related: "Related",
      similar: "Similar",
      opposite: "Opposite",
      upstream: "Upstream",
      downstream: "Downstream",
      ecosystem: "Ecosystem",
    },
  },
} satisfies Record<
  Locale,
  {
    aiAssisted: string;
    back: string;
    currentPathPrefix: string;
    diagram: string;
    fable: string;
    home: string;
    humanReviewed: string;
    notes: Record<string, string>;
    quick: string;
    related: string;
    relationTypes: Record<AiTermRelationSummary["relationType"], string>;
    source: string;
    summary: string;
    terms: string;
    updated: string;
    verifiedFallback: string;
  }
>;

function formatDate(value: Date | string | number | null | undefined, locale: Locale) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function beginnerNoteItems(term: AiTermDetailLike, locale: Locale) {
  const labels = copy[locale].notes;
  const notes = asRecord(term.beginnerNotes);

  return Object.entries(labels)
    .map(([key, label]) => {
      const value = notes[key];
      return typeof value === "string" && value.trim() ? { key, label, value: value.trim() } : null;
    })
    .filter((item): item is { key: string; label: string; value: string } => Boolean(item));
}

function relationHref(locale: Locale, relation: AiTermRelationSummary) {
  return locale === "en" ? `/en/ai-terms/${relation.slug}` : `/ai-terms/${relation.slug}`;
}

export function AiTermDetailPage({ blocks, fable, locale, term }: AiTermDetailPageProps) {
  const pageCopy = copy[locale];
  const currentPath = `${pageCopy.currentPathPrefix}/${term.slug}`;
  const listHref = pageCopy.currentPathPrefix;
  const homeHref = locale === "en" ? "/en" : "/";
  const displaySubtitle = term.fullName || term.termZh;
  const summary = term.shortConcept || term.shortDesc;
  const description = term.shortDesc || term.shortConcept;
  const noteItems = beginnerNoteItems(term, locale);
  const verifiedDate = formatDate(term.lastVerifiedAt, locale) || formatDate(term.updatedAt, locale);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} currentPath={currentPath} />
      <main className="flex-1 bg-background">
        <article>
          <header className="site-grid border-b border-line">
            <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 md:py-12">
              <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold text-muted" aria-label={pageCopy.terms}>
                <Link className="inline-flex items-center gap-1 rounded-md transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={homeHref}>
                  <Home className="h-3.5 w-3.5" />
                  {pageCopy.home}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-muted/70" />
                <Link className="rounded-md transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={listHref}>
                  {pageCopy.terms}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-muted/70" />
                <span className="max-w-full truncate text-foreground">{term.term}</span>
              </nav>

              <div className={term.diagramImage ? "mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)] lg:items-start" : "mt-9 max-w-4xl"}>
                <div className="min-w-0">
                  <Link href={listHref} className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-accent transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
                    <ArrowLeft className="h-4 w-4" />
                    {pageCopy.back}
                  </Link>

                  <h1 className="mt-7 max-w-4xl break-words text-[3rem] font-semibold leading-none text-foreground [overflow-wrap:anywhere] sm:text-6xl md:text-7xl">{term.term}</h1>
                  {displaySubtitle ? <p className="mt-4 max-w-3xl break-words text-lg leading-7 text-muted [overflow-wrap:anywhere] md:text-xl">{displaySubtitle}</p> : null}
                  {summary ? (
                    <div className="mt-7 max-w-3xl">
                      <p className="text-xs font-semibold uppercase text-muted">{pageCopy.summary}</p>
                      <p className="mt-2 break-words text-2xl font-semibold leading-snug text-accent [overflow-wrap:anywhere] md:text-3xl">{summary}</p>
                    </div>
                  ) : null}
                  {description && description !== summary ? <p className="mt-5 max-w-3xl text-base leading-8 text-muted md:text-lg">{description}</p> : null}
                </div>

                {term.diagramImage ? (
                  <figure className="overflow-hidden rounded-md border border-line bg-paper/82 shadow-[var(--shadow-quiet)]" aria-label={pageCopy.diagram}>
                    <div className="border-b border-line px-4 py-3 text-sm font-semibold text-foreground sm:px-5">{pageCopy.diagram}</div>
                    <div className="aspect-video bg-background/45 p-3 sm:p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={term.diagramImage} alt={term.diagramImageAlt ?? ""} className="mx-auto h-full w-full object-contain" loading="eager" />
                    </div>
                    {term.diagramImageAlt ? <figcaption className="border-t border-line px-4 py-3 text-sm leading-6 text-muted sm:px-5">{term.diagramImageAlt}</figcaption> : null}
                  </figure>
                ) : null}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
            {noteItems.length > 0 ? (
              <section className="mb-8 rounded-md border border-line bg-paper/82 p-4 shadow-[var(--shadow-quiet)] md:p-5" aria-labelledby="ai-term-quick-understanding">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  <h2 id="ai-term-quick-understanding" className="text-sm font-semibold text-foreground">
                    {pageCopy.quick}
                  </h2>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {noteItems.map((item) => (
                    <div key={item.key} className="min-w-0 rounded-md border border-line bg-background/68 p-4">
                      <p className="text-xs font-semibold text-accent">{item.label}</p>
                      <p className="mt-2 break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {fable ? (
              <section className="mb-8 rounded-md border border-line bg-[color-mix(in_srgb,var(--accent)_5%,var(--paper))] p-4 shadow-[var(--shadow-quiet)] md:p-6" aria-labelledby="ai-term-fable">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <p className="text-xs font-semibold uppercase text-accent">{pageCopy.fable}</p>
                </div>
                <h2 id="ai-term-fable" className="mt-2 break-words text-2xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
                  {fable.title}
                </h2>
                <div className="article-prose mt-4" dangerouslySetInnerHTML={{ __html: fable.html }} />
              </section>
            ) : null}

            <div className="article-reading-surface article-reading-surface-no-rail min-w-0 rounded-md border border-line px-4 py-7 sm:px-5 md:px-10 md:py-11">
              <ArticleReader blocks={blocks} defaultMode="full" locale={locale} supportsReadingMode={false} />
            </div>

            {term.relations.length > 0 ? (
              <section className="mt-8 rounded-md border border-line bg-paper/82 p-4 shadow-[var(--shadow-quiet)] md:p-5" aria-labelledby="ai-term-related">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-accent" />
                  <h2 id="ai-term-related" className="text-sm font-semibold text-foreground">
                    {pageCopy.related}
                  </h2>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {term.relations.map((relation) => (
                    <Link
                      key={`${relation.relationType}:${relation.slug}`}
                      href={relationHref(locale, relation)}
                      className="group min-w-0 rounded-md border border-line bg-background/68 p-4 transition hover:border-accent/35 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                    >
                      <span className="text-xs font-semibold text-accent">{pageCopy.relationTypes[relation.relationType]}</span>
                      <span className="mt-1 block break-words text-base font-semibold text-foreground [overflow-wrap:anywhere] group-hover:text-accent">{relation.termZh || relation.term}</span>
                      {relation.description ? <span className="mt-2 block text-sm leading-6 text-muted">{relation.description}</span> : null}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {(term.sourceNote || verifiedDate || term.humanReviewed || term.aiAssisted) ? (
              <section className="mt-8 rounded-md border border-line bg-surface/72 p-4 text-sm text-muted md:p-5" aria-label={pageCopy.source}>
                <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                  <BookOpenText className="h-4 w-4 text-accent" />
                  {pageCopy.source}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {verifiedDate ? <span className="rounded-md border border-line bg-background px-3 py-1.5">{term.lastVerifiedAt ? pageCopy.updated : pageCopy.verifiedFallback}：{verifiedDate}</span> : null}
                  {term.humanReviewed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-background px-3 py-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                      {pageCopy.humanReviewed}
                    </span>
                  ) : null}
                  {term.aiAssisted ? <span className="rounded-md border border-line bg-background px-3 py-1.5">{pageCopy.aiAssisted}</span> : null}
                </div>
                {term.sourceNote ? <p className="mt-3 leading-6">{term.sourceNote}</p> : null}
              </section>
            ) : null}
          </div>
        </article>
      </main>
      <BackToTopButton locale={locale} />
      <SiteFooter locale={locale} />
    </div>
  );
}
