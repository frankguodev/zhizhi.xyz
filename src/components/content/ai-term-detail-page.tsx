import Link from "next/link";
import { BookOpenText, ChevronRight, Home, Link2, Sparkles } from "lucide-react";
import { AiTermDiagram } from "@/components/content/ai-term-diagram";
import { AiTermToc } from "@/components/content/ai-term-toc";
import { ArticleReader } from "@/components/content/article-reader";
import { BackToTopButton } from "@/components/content/back-to-top-button";
import type { ArticleContentBlock } from "@/components/content/types";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { AiTermDetail, AiTermRelationSummary } from "@/lib/ai-terms";
import type { AiTermFableBlock } from "@/lib/markdown";
import type { Locale } from "@/lib/site";

// 仅列出本组件实际读取的字段（路由传入的是完整 AiTermDetail，多余字段被忽略）。
type AiTermDetailLike = Pick<
  AiTermDetail,
  | "beginnerNotes"
  | "diagramImage"
  | "diagramImageAlt"
  | "relations"
  | "shortConcept"
  | "shortDesc"
  | "slug"
  | "term"
>;

type AiTermDetailPageProps = {
  blocks: ArticleContentBlock[];
  beginnerNotesHtml?: string | null;
  fable?: AiTermFableBlock | null;
  locale: Locale;
  referencesHtml?: string | null;
  term: AiTermDetailLike;
};

const beginnerNoteKeys = ["plain_explanation", "analogy", "why_it_matters", "common_misconception"] as const;

const copy = {
  currentPathPrefix: "/ai-terms",
  diagram: "词条解释信息图",
  fable: "寓言故事",
  home: "首页",
  references: "参考资料",
  related: "相关概念",
  terms: "AI 词条",
  notes: {
    plain_explanation: "普通解释",
    analogy: "类比理解",
    why_it_matters: "为什么重要",
    common_misconception: "常见误区",
  } as Record<string, string>,
  relationTypes: {
    related: "相关",
    similar: "相似",
    opposite: "对照",
    upstream: "前置",
    downstream: "延伸",
    ecosystem: "生态",
  } as Record<AiTermRelationSummary["relationType"], string>,
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function beginnerNoteItems(beginnerNotes: unknown) {
  const labels = copy.notes;
  const notes = asRecord(beginnerNotes);

  return beginnerNoteKeys
    .map((key) => {
      const value = notes[key];
      return typeof value === "string" && value.trim() ? { key, label: labels[key], value: value.trim() } : null;
    })
    .filter((item): item is { key: (typeof beginnerNoteKeys)[number]; label: string; value: string } => Boolean(item));
}

export function aiTermHasBeginnerNotes(beginnerNotes: unknown) {
  return beginnerNoteItems(beginnerNotes).length > 0;
}

function relationHref(relation: AiTermRelationSummary) {
  return `/ai-terms/${relation.slug}`;
}

export function AiTermDetailPage({ blocks, beginnerNotesHtml, fable, locale, referencesHtml, term }: AiTermDetailPageProps) {
  const pageCopy = copy;
  const currentPath = `${pageCopy.currentPathPrefix}/${term.slug}`;
  const listHref = pageCopy.currentPathPrefix;
  const homeHref = "/";
  const lead = term.shortDesc || term.shortConcept;
  const notes = asRecord(term.beginnerNotes);
  const analogy = typeof notes.analogy === "string" ? notes.analogy.trim() : "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader currentPath={currentPath} />
      <main className="flex-1 bg-background">
        <article>
          <header className="site-grid border-b border-line">
            <div className="mx-auto max-w-6xl px-4 pt-7 pb-6 sm:px-6 md:pt-12 md:pb-8">
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

              <div className="mt-9 max-w-4xl">
                <h1 className="max-w-4xl break-words text-2xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl md:text-4xl">{term.term}</h1>
                {lead ? <p className="mt-4 max-w-3xl break-words text-lg font-medium leading-8 text-foreground [overflow-wrap:anywhere] md:text-xl">{lead}</p> : null}
                {analogy ? <p className="mt-3 max-w-3xl break-words text-base leading-7 text-muted [overflow-wrap:anywhere] md:text-lg">{analogy}</p> : null}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-9 md:pb-14">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
              <div data-ai-term-body className="min-w-0 space-y-8">
              {term.diagramImage ? (
                <section aria-labelledby="ai-term-diagram">
                  <h2 id="ai-term-diagram" className="ai-term-section-heading scroll-mt-24 text-2xl font-bold leading-tight text-foreground">
                    一图看懂
                  </h2>
                  <AiTermDiagram src={term.diagramImage} alt={term.diagramImageAlt ?? ""} label={pageCopy.diagram} />
                </section>
              ) : null}

              {beginnerNotesHtml ? (
                <section aria-labelledby="ai-term-quick">
                  <h2 id="ai-term-quick" className="ai-term-section-heading scroll-mt-24 text-2xl font-bold leading-tight text-foreground">
                    快速理解
                  </h2>
                  <div className="article-prose mt-4" dangerouslySetInnerHTML={{ __html: beginnerNotesHtml }} />
                </section>
              ) : null}

              {fable ? (
                <details className="group overflow-hidden rounded-md border border-line bg-[color-mix(in_srgb,var(--accent)_5%,var(--paper))] shadow-[var(--shadow-quiet)]">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 md:p-6">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/28 bg-accent/8 text-accent">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-accent">{pageCopy.fable}</span>
                      <span className="mt-0.5 block break-words font-semibold leading-6 text-foreground [overflow-wrap:anywhere]">{fable.title}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="article-prose mx-4 border-t border-line/70 pb-4 pt-4 md:mx-6 md:pb-6" dangerouslySetInnerHTML={{ __html: fable.html }} />
                </details>
              ) : null}

              <div className="ai-term-prose min-w-0">
                <ArticleReader blocks={blocks} defaultMode="full" locale={locale} supportsReadingMode={false} />
              </div>

              {term.relations.length > 0 ? (
                <section aria-labelledby="ai-term-related">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-accent" />
                    <h2 id="ai-term-related" data-toc-exclude className="scroll-mt-24 text-sm font-semibold text-foreground">
                      {pageCopy.related}
                    </h2>
                  </div>
                  <ul className="mt-3 border-t border-line/70">
                    {term.relations.map((relation) => (
                      <li key={`${relation.relationType}:${relation.slug}`} className="border-b border-line/70">
                        <Link
                          href={relationHref(relation)}
                          className="group block min-w-0 rounded-md py-3.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                        >
                          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                            <span className="break-words text-base font-semibold text-foreground [overflow-wrap:anywhere] group-hover:text-accent">{relation.termZh || relation.term}</span>
                            <span className="text-xs font-medium text-muted">{pageCopy.relationTypes[relation.relationType]}</span>
                          </span>
                          {relation.description ? <span className="mt-1 block text-sm leading-6 text-muted">{relation.description}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {referencesHtml ? (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md text-sm font-semibold text-foreground transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35">
                    <BookOpenText className="h-4 w-4 text-accent" />
                    <span>{pageCopy.references}</span>
                    <ChevronRight className="h-4 w-4 text-muted transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="article-prose mt-3" dangerouslySetInnerHTML={{ __html: referencesHtml }} />
                </details>
              ) : null}
              </div>

              <aside className="hidden lg:block">
                <div className="lg:sticky lg:top-24">
                  <AiTermToc />
                </div>
              </aside>
            </div>
          </div>
        </article>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  );
}
