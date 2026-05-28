import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Boxes, BrainCircuit, CircuitBoard, Clock3, Cpu, Network, Orbit, Search, Sparkles, TrendingUp } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { AiTermSummary, AiTermTaxonomyItem } from "@/lib/ai-terms";
import { siteConfig, type Locale } from "@/lib/site";

type AiTermsPageProps = {
  categorySlug?: string;
  categories: AiTermTaxonomyItem[];
  locale: Locale;
  query?: string;
  terms: AiTermSummary[];
};

type DisplayTerm = {
  categories: AiTermTaxonomyItem[];
  difficulty: string;
  fullName: string | null;
  heatScore: number;
  shortConcept: string;
  shortDesc: string;
  slug: string;
  tags: AiTermTaxonomyItem[];
  term: string;
  termZh: string | null;
  trending: boolean;
  updatedAt: Date | string | number;
};

export const fallbackAiTerms: DisplayTerm[] = [
  {
    categories: [{ id: "world-coding", name: "AI 编程世界", slug: "ai-coding", description: "工具、概念和趋势", sortOrder: 1 }],
    difficulty: "beginner",
    fullName: "Model Context Protocol",
    heatScore: 98,
    shortConcept: "模型上下文协议",
    shortDesc: "让应用以统一方式把工具、数据和上下文提供给大模型。",
    slug: "mcp",
    tags: [
      { id: "tag-agent", name: "Agent", slug: "agent" },
      { id: "tag-protocol", name: "Protocol", slug: "protocol" },
      { id: "tag-anthropic", name: "Anthropic", slug: "anthropic" },
    ],
    term: "MCP",
    termZh: "模型上下文协议",
    trending: true,
    updatedAt: "2026-05-19",
  },
  {
    categories: [{ id: "world-agent", name: "Agent 世界", slug: "agent-world", description: "自动化和智能体", sortOrder: 2 }],
    difficulty: "beginner",
    fullName: "AI Agent",
    heatScore: 87,
    shortConcept: "AI 智能体",
    shortDesc: "能够感知环境、制定步骤、调用工具并持续完成任务的 AI 系统。",
    slug: "agent",
    tags: [
      { id: "tag-ai", name: "AI", slug: "ai" },
      { id: "tag-autonomy", name: "Autonomy", slug: "autonomy" },
      { id: "tag-workflow", name: "Workflow", slug: "workflow" },
    ],
    term: "Agent",
    termZh: "AI 智能体",
    trending: true,
    updatedAt: "2026-05-19",
  },
  {
    categories: [{ id: "world-infra", name: "AI 基建世界", slug: "ai-infra", description: "模型、检索和平台", sortOrder: 3 }],
    difficulty: "beginner",
    fullName: "Retrieval Augmented Generation",
    heatScore: 72,
    shortConcept: "检索增强生成",
    shortDesc: "先从知识库取回相关资料，再交给大模型生成更可靠的答案。",
    slug: "rag",
    tags: [
      { id: "tag-llm", name: "LLM", slug: "llm" },
      { id: "tag-retrieval", name: "Retrieval", slug: "retrieval" },
      { id: "tag-infra", name: "AI Infra", slug: "ai-infra" },
    ],
    term: "RAG",
    termZh: "检索增强生成",
    trending: false,
    updatedAt: "2026-05-18",
  },
  {
    categories: [{ id: "world-coding", name: "AI 编程世界", slug: "ai-coding", description: "工具、概念和趋势", sortOrder: 1 }],
    difficulty: "intermediate",
    fullName: "AI-first Coding",
    heatScore: 61,
    shortConcept: "氛围编程",
    shortDesc: "用自然语言描述意图，让 AI 承担更多实现、重构和调试工作。",
    slug: "vibe-coding",
    tags: [
      { id: "tag-coding", name: "AI Coding", slug: "ai-coding" },
      { id: "tag-workflow", name: "Workflow", slug: "workflow" },
      { id: "tag-productivity", name: "Productivity", slug: "productivity" },
    ],
    term: "Vibe Coding",
    termZh: "氛围编程",
    trending: true,
    updatedAt: "2026-05-16",
  },
  {
    categories: [{ id: "world-context", name: "上下文工程世界", slug: "context", description: "提示词、上下文和记忆", sortOrder: 4 }],
    difficulty: "intermediate",
    fullName: null,
    heatScore: 58,
    shortConcept: "上下文工程",
    shortDesc: "围绕任务组织上下文，让大模型更稳定地理解目标和边界。",
    slug: "context-engineering",
    tags: [
      { id: "tag-prompting", name: "Prompting", slug: "prompting" },
      { id: "tag-llm", name: "LLM", slug: "llm" },
      { id: "tag-best", name: "Best Practice", slug: "best-practice" },
    ],
    term: "Context Engineering",
    termZh: "上下文工程",
    trending: true,
    updatedAt: "2026-05-15",
  },
  {
    categories: [{ id: "world-agent", name: "Agent 世界", slug: "agent-world", description: "自动化和智能体", sortOrder: 2 }],
    difficulty: "beginner",
    fullName: "Tool Calling",
    heatScore: 54,
    shortConcept: "工具调用",
    shortDesc: "让大模型在回答之外调用函数、API 或外部工具完成动作。",
    slug: "tool-calling",
    tags: [
      { id: "tag-llm", name: "LLM", slug: "llm" },
      { id: "tag-api", name: "API", slug: "api" },
      { id: "tag-integration", name: "Integration", slug: "integration" },
    ],
    term: "Tool Calling",
    termZh: "工具调用",
    trending: false,
    updatedAt: "2026-05-14",
  },
];

const copy = {
  zh: {
    currentPath: "/ai-terms",
    eyebrow: "AI 词条",
    titleStart: "理解 AI 世界的",
    titleAccent: "常用语言",
    description: "把 AI 术语、概念、工具和新兴说法，用普通人能读懂的方式整理成一张安静的知识地图。",
    searchPlaceholder: "搜索 AI 词条、概念、工具...",
    searchLabel: "搜索词条",
    mapTitle: "词条地图",
    mapHint: "从概念、分类和新近更新进入",
    categoryFallback: "围绕一个 AI 方向收纳相关概念、工具和实践路径。",
    trending: "趋势词条",
    worlds: "探索 AI 世界",
    recent: "最近加入",
    allTerms: "全部词条",
    allTermsAnchor: "查看全部词条",
    currentFilter: "当前筛选",
    latest: "最新",
    readTerm: "阅读词条",
    termsCount(count: number) {
      return `${count} 个词条`;
    },
    worldTermCount(count: number) {
      return `${count} 个词条`;
    },
    viewAll: "查看全部",
    heat(value: number) {
      return `热度 ${Math.max(0, value).toLocaleString("zh-CN")} / 100`;
    },
    updated(value: Date | string | number) {
      return `更新 ${formatRelativeDate(value, "zh")}`;
    },
    noResults: "暂时没有匹配的词条",
    noResultsHint: "可以换一个关键词，或回到全部词条重新浏览。后台发布词条后，这里会自动展示真实数据。",
    quote: "让新概念变得可理解，才是真正开始使用它的第一步。",
    methodologyTitle: "整理方式",
    methodologyBody: "每个词条优先回答三个问题：它是什么、为什么重要、普通读者应该怎样理解和使用它。",
  },
  en: {
    currentPath: "/en/ai-terms",
    eyebrow: "AI Terms",
    titleStart: "Understand the",
    titleAccent: "language of AI",
    description: "AI terms, concepts, tools, and emerging ideas explained in a calm map for people learning in public.",
    searchPlaceholder: "Search AI terms, concepts, tools...",
    searchLabel: "Search terms",
    mapTitle: "Term Map",
    mapHint: "Start from concepts, categories, and recent updates",
    categoryFallback: "A focused path for related AI concepts, tools, and practice patterns.",
    trending: "Trending AI Terms",
    worlds: "Explore AI Worlds",
    recent: "Recently Added",
    allTerms: "All Terms",
    allTermsAnchor: "View all terms",
    currentFilter: "Current filter",
    latest: "Latest",
    readTerm: "Read term",
    termsCount(count: number) {
      return `${count} terms`;
    },
    worldTermCount(count: number) {
      return `${count} terms`;
    },
    viewAll: "View all",
    heat(value: number) {
      return `${Math.max(0, value).toLocaleString("en-US")} / 100 heat`;
    },
    updated(value: Date | string | number) {
      return `Updated ${formatRelativeDate(value, "en")}`;
    },
    noResults: "No matching terms yet",
    noResultsHint: "Try another keyword or return to all terms. Published terms will appear here automatically.",
    quote: "Making AI language easier to understand is where real use begins.",
    methodologyTitle: "How Terms Are Organized",
    methodologyBody: "Each term focuses on three questions: what it is, why it matters, and how a reader can understand or use it.",
  },
} satisfies Record<
  Locale,
  {
    allTerms: string;
    currentPath: string;
    currentFilter: string;
    description: string;
    eyebrow: string;
    heat: (value: number) => string;
    noResults: string;
    noResultsHint: string;
    categoryFallback: string;
    mapHint: string;
    mapTitle: string;
    quote: string;
    methodologyTitle: string;
    methodologyBody: string;
    latest: string;
    readTerm: string;
    recent: string;
    searchLabel: string;
    searchPlaceholder: string;
    termsCount: (count: number) => string;
    titleAccent: string;
    titleStart: string;
    allTermsAnchor: string;
    trending: string;
    updated: (value: Date | string | number) => string;
    viewAll: string;
    worldTermCount: (count: number) => string;
    worlds: string;
  }
>;

export function aiTermPath(locale: Locale, slug: string) {
  const base = locale === "en" ? "/en/ai-terms" : "/ai-terms";
  return `${base}/${encodeURIComponent(slug)}`;
}

function categoryPath(locale: Locale, slug: string) {
  const base = locale === "en" ? "/en/ai-terms" : "/ai-terms";
  return `${base}?category=${encodeURIComponent(slug)}#all-terms`;
}

function formatRelativeDate(value: Date | string | number, locale: Locale) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return locale === "en" ? "recently" : "最近";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizeTerms(terms: AiTermSummary[], query?: string, categorySlug?: string): DisplayTerm[] {
  const source = terms.length > 0 ? terms : fallbackAiTerms;
  const normalizedQuery = query?.trim().toLowerCase();
  const normalizedCategory = categorySlug?.trim().toLowerCase();
  let mapped = source.map((term) => ({
    categories: term.categories,
    difficulty: term.difficulty,
    fullName: term.fullName,
    heatScore: term.heatScore,
    shortConcept: term.shortConcept,
    shortDesc: term.shortDesc,
    slug: term.slug,
    tags: term.tags,
    term: term.term,
    termZh: term.termZh,
    trending: term.trending,
    updatedAt: term.updatedAt,
  }));

  if (normalizedCategory) {
    mapped = mapped.filter((term) => term.categories.some((category) => category.slug.toLowerCase() === normalizedCategory));
  }

  if (!normalizedQuery) {
    return mapped;
  }

  return mapped.filter((term) => [term.term, term.termZh, term.fullName, term.shortConcept, term.shortDesc].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery)));
}

function getWorlds(categories: AiTermTaxonomyItem[], terms: DisplayTerm[]) {
  const fromData = categories.length > 0 ? categories : terms.flatMap((term) => term.categories);
  const unique = new Map<string, AiTermTaxonomyItem>();

  for (const category of fromData) {
    unique.set(category.slug, category);
  }

  return Array.from(unique.values()).slice(0, 5);
}

function SectionHeading({ action, actionHref, icon, title }: { action?: string; actionHref?: string; icon: ReactNode; title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-foreground sm:text-xl">
        <span className="text-accent">{icon}</span>
        <span className="break-words">{title}</span>
      </h2>
      {action && actionHref ? (
        <Link className="hidden min-h-9 shrink-0 items-center rounded-md px-2.5 py-1 text-sm font-semibold text-accent transition hover:bg-accent/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 sm:inline-flex" href={actionHref}>
          {action}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function WorldCard({ index, locale, termCount, world }: { index: number; locale: Locale; termCount: number; world: AiTermTaxonomyItem }) {
  const icons = [BrainCircuit, Network, Cpu, CircuitBoard, Orbit];
  const Icon = icons[index % icons.length];

  return (
    <Link className="motion-surface flex aspect-square min-w-0 flex-col justify-between rounded-lg border border-line bg-paper/58 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={categoryPath(locale, world.slug)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/22 bg-accent/8 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 break-words text-base font-semibold leading-6 text-foreground [overflow-wrap:anywhere]">{world.name}</span>
        <span className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{world.description || copy[locale].categoryFallback}</span>
      </span>
      <span className="text-xs font-semibold text-accent">
        {copy[locale].worldTermCount(termCount)}
      </span>
    </Link>
  );
}

function RecentItem({ term, locale }: { locale: Locale; term: DisplayTerm }) {
  return (
    <Link className="block min-w-0 border-b border-line/70 px-3.5 py-3 transition last:border-b-0 hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/35 sm:px-4" href={aiTermPath(locale, term.slug)}>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-accent">
          <Clock3 className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 items-baseline gap-2.5 text-left">
          <span className="max-w-[42%] shrink-0 truncate text-sm font-semibold text-foreground sm:text-base">{term.term}</span>
          <span className="min-w-0 flex-1 truncate text-sm leading-6 text-muted">{term.shortDesc}</span>
        </span>
        <p className="shrink-0 text-right text-xs font-semibold text-muted">{copy[locale].updated(term.updatedAt)}</p>
      </div>
    </Link>
  );
}

function TermCard({ term, locale }: { locale: Locale; term: DisplayTerm }) {
  return (
    <Link className="group block h-full min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" href={aiTermPath(locale, term.slug)}>
      <article id={`term-${term.slug}`} className="home-popular-card flex h-full min-w-0 flex-col rounded-md border border-line p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="break-words text-xl font-semibold text-foreground transition group-hover:text-accent [overflow-wrap:anywhere]">
              {term.term}
              {term.trending ? <TrendingUp className="ml-2 inline h-4 w-4 text-accent" /> : null}
            </h3>
            <p className="mt-3 break-words text-sm font-semibold leading-6 text-muted [overflow-wrap:anywhere]">{term.fullName || term.shortConcept}</p>
          </div>
        </div>
        <p className="mt-4 line-clamp-3 min-h-20 text-sm leading-7 text-muted">{term.shortDesc}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {term.tags.slice(0, 3).map((tag) => (
            <span key={tag.slug} className="rounded-md border border-line/70 bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted">
              {tag.name}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5 text-xs font-semibold text-muted">
          <span>{copy[locale].updated(term.updatedAt)}</span>
          <span className="inline-flex items-center gap-1 rounded-md text-accent transition group-hover:text-foreground">
            {copy[locale].readTerm}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

export function AiTermsPage({ categories, categorySlug, locale, query, terms }: AiTermsPageProps) {
  const pageCopy = copy[locale];
  const displayTerms = normalizeTerms(terms, query, categorySlug);
  const recentTerms = [...displayTerms].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  const worlds = getWorlds(categories, displayTerms);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: locale === "en" ? "AI Terms" : "AI 词条",
    description: pageCopy.description,
    url: `${siteConfig.url}${pageCopy.currentPath}`,
    inLanguage: locale === "en" ? "en" : "zh-CN",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} currentPath={pageCopy.currentPath} />

      <main className="flex-1 bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <section className="site-grid border-b border-line" aria-labelledby="ai-terms-title">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
            <div className="mx-auto max-w-4xl text-center">
              <p className="eyebrow text-accent">{pageCopy.eyebrow}</p>
              <h1 id="ai-terms-title" className="mx-auto mt-5 max-w-3xl break-words text-[2.45rem] font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-5xl md:text-6xl">
                {pageCopy.titleStart}
                <span className="block text-accent">{pageCopy.titleAccent}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted md:text-lg">{pageCopy.description}</p>
            </div>

            <form className="mx-auto mt-8 max-w-3xl" action={pageCopy.currentPath}>
              <label className="sr-only" htmlFor="ai-term-search">
                {pageCopy.searchLabel}
              </label>
              {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
              <div className="flex min-h-14 items-center gap-2 rounded-lg border border-line bg-paper/88 px-3 shadow-[var(--shadow-quiet)] focus-within:border-accent/55 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_12%,transparent)] sm:gap-3 sm:px-4">
                <Search className="h-5 w-5 shrink-0 text-muted" />
                <input id="ai-term-search" name="q" defaultValue={query} className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted" placeholder={pageCopy.searchPlaceholder} />
                <button className="inline-flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-ink transition hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" type="submit">
                  <Search className="h-4 w-4 sm:hidden" />
                  <span className="sr-only sm:not-sr-only">{pageCopy.searchLabel}</span>
                </button>
              </div>
            </form>

          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
            <SectionHeading icon={<Sparkles className="h-5 w-5" />} title={pageCopy.recent} />
            <div className="overflow-hidden rounded-lg border border-line/70 bg-paper/44">
              {recentTerms.map((term) => (
                <RecentItem key={term.slug} locale={locale} term={term} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-surface/30">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
            <SectionHeading action={pageCopy.allTermsAnchor} actionHref="#all-terms" icon={<Boxes className="h-5 w-5" />} title={pageCopy.worlds} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {worlds.map((world, index) => (
                <WorldCard key={world.slug} index={index} locale={locale} termCount={displayTerms.filter((term) => term.categories.some((category) => category.slug === world.slug)).length || 1} world={world} />
              ))}
            </div>
          </div>
        </section>

        <section id="all-terms" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">{pageCopy.allTerms}</h2>
          </div>

          {displayTerms.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {displayTerms.slice(0, 12).map((term) => (
                <TermCard key={term.slug} locale={locale} term={term} />
              ))}
            </div>
          ) : (
            <div className="index-surface rounded-md border border-line p-8 text-center">
              <h3 className="text-xl font-semibold text-foreground">{pageCopy.noResults}</h3>
              <p className="mx-auto mt-3 max-w-2xl leading-7 text-muted">{pageCopy.noResultsHint}</p>
            </div>
          )}
        </section>

        <section className="border-t border-line bg-surface/25">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
            <div className="grid gap-5 md:grid-cols-[0.75fr_1.25fr] md:items-start">
              <div>
                <p className="eyebrow text-accent">{pageCopy.methodologyTitle}</p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">{pageCopy.mapTitle}</h2>
              </div>
              <div className="rounded-lg border border-line bg-paper/52 p-5">
                <p className="text-base leading-8 text-foreground">{pageCopy.methodologyBody}</p>
                <p className="mt-4 text-sm leading-7 text-muted">{pageCopy.quote}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
