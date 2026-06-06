"use client";

import Link from "next/link";
import { Eye, FilePenLine, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";

export type DraftListItem = {
  id: string;
  title: string;
  slug: string;
  locale: string;
  summary: string;
  status: string;
  workflowStatus: string;
  visibility: string;
  readingMinutes: number;
  publishedAt?: string | number;
  updatedAt: string | number;
  qualityErrors?: number;
  qualityWarnings?: number;
  qualitySuggestions?: number;
};

const allValue = "all";
const sortOptions = [
  { value: "updated-desc", label: "最近更新" },
  { value: "updated-asc", label: "最早更新" },
  { value: "published-desc", label: "发布时间新" },
  { value: "reading-desc", label: "阅读时间长" },
] as const;

function formatDate(value: string | number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN");
}

function includesText(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function DraftsListWorkbench({ drafts }: { drafts: DraftListItem[] }) {
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState(allValue);
  const [workflowStatus, setWorkflowStatus] = useState(allValue);
  const [visibility, setVisibility] = useState(allValue);
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("updated-desc");

  const localeOptions = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.locale))).sort(), [drafts]);
  const workflowOptions = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.workflowStatus))).sort(), [drafts]);
  const visibilityOptions = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.visibility))).sort(), [drafts]);

  const filteredDrafts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = drafts.filter((draft) => {
      if (locale !== allValue && draft.locale !== locale) {
        return false;
      }

      if (workflowStatus !== allValue && draft.workflowStatus !== workflowStatus) {
        return false;
      }

      if (visibility !== allValue && draft.visibility !== visibility) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        includesText(draft.title, normalizedQuery) ||
        includesText(draft.slug, normalizedQuery) ||
        includesText(draft.summary, normalizedQuery)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "updated-asc") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      if (sortBy === "published-desc") {
        return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
      }

      if (sortBy === "reading-desc") {
        return b.readingMinutes - a.readingMinutes;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [drafts, locale, query, sortBy, visibility, workflowStatus]);

  return (
    <div className="space-y-4">
      <section className="admin-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
          <label className="relative block">
            <span className="sr-only">搜索草稿</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="h-11 w-full border border-line bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、slug 或摘要"
            />
          </label>

          <SelectFilter label="语言" value={locale} onChange={setLocale} options={localeOptions} />
          <SelectFilter label="流程" value={workflowStatus} onChange={setWorkflowStatus} options={workflowOptions} />
          <SelectFilter label="权限" value={visibility} onChange={setVisibility} options={visibilityOptions} />
          <div className="grid gap-1">
            <span className="text-xs font-semibold text-muted">排序</span>
            <Select className="min-w-32" ariaLabel="排序" value={sortBy} onChange={(next) => setSortBy(next as typeof sortBy)} options={[...sortOptions]} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span aria-live="polite">
            当前显示 <strong className="text-foreground">{filteredDrafts.length}</strong> / {drafts.length} 篇草稿
          </span>
          {query || locale !== allValue || workflowStatus !== allValue || visibility !== allValue ? (
            <button
              className="font-semibold text-accent"
              type="button"
              onClick={() => {
                setQuery("");
                setLocale(allValue);
                setWorkflowStatus(allValue);
                setVisibility(allValue);
                setSortBy("updated-desc");
              }}
            >
              清空筛选
            </button>
          ) : null}
        </div>
      </section>

      {filteredDrafts.length === 0 ? (
        <div className="admin-surface p-8 text-muted">没有匹配的草稿。换个关键词或清空筛选再试。</div>
      ) : (
        <div className="grid gap-4">
          {filteredDrafts.map((draft) => (
            <article key={draft.id} className="admin-card min-w-0 p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1 font-semibold text-accent">
                  <FilePenLine className="h-4 w-4" />
                  {draft.workflowStatus}
                </span>
                <span>{draft.locale}</span>
                <span>{draft.visibility}</span>
                <span>{draft.readingMinutes} 分钟</span>
                <span>更新于 {formatDate(draft.updatedAt)}</span>
                <QualityBadge draft={draft} />
              </div>
              <h2 className="mt-3 break-words text-2xl font-semibold text-foreground [overflow-wrap:anywhere]">
                <Link href={`/admin/articles/drafts/${draft.locale}/${draft.slug}`}>{draft.title}</Link>
              </h2>
              <p className="mt-2 break-words leading-7 text-muted [overflow-wrap:anywhere]">{draft.summary || "暂无摘要"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <p className="break-all font-mono text-sm text-muted">{draft.slug}</p>
                <Link className="font-semibold text-accent transition hover:text-foreground" href={`/admin/articles/drafts/${draft.locale}/${draft.slug}`}>
                  继续编辑
                </Link>
                <Link className="font-semibold text-accent transition hover:text-foreground" href={`/admin/articles/drafts/${draft.locale}/${draft.slug}?panel=quality`}>
                  打开质量报告
                </Link>
                <Link className="inline-flex items-center gap-1 font-semibold text-accent transition hover:text-foreground" href={`/admin/articles/drafts/${draft.locale}/${draft.slug}?panel=preview`}>
                  <Eye className="h-4 w-4" />
                  预览草稿
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function QualityBadge({ draft }: { draft: DraftListItem }) {
  const errors = draft.qualityErrors ?? 0;
  const warnings = draft.qualityWarnings ?? 0;

  if (errors > 0) {
    return <span className="border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700">错误 {errors}</span>;
  }

  if (warnings > 0) {
    return <span className="border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">警告 {warnings}</span>;
  }

  const suggestions = draft.qualitySuggestions ?? 0;

  if (suggestions > 0) {
    return <span className="border border-line bg-surface px-2 py-0.5 font-semibold text-muted">建议 {suggestions}</span>;
  }

  return <span className="border border-accent/30 bg-accent/8 px-2 py-0.5 font-semibold text-accent">可发布</span>;
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <Select
        className="min-w-32"
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={[{ value: allValue, label: "全部" }, ...options.map((option) => ({ value: option, label: option }))]}
      />
    </div>
  );
}
