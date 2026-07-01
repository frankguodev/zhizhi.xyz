"use client";

import { Check, Copy, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import {
  analyzeSearchAudit,
  formatSearchAuditMarkdown,
  searchAuditContentTypeOptions,
  type SearchAuditChecklistItem,
  type SearchAuditContentType,
  type SearchAuditDimension,
  type SearchAuditIssue,
  type SearchAuditRewrite,
  type SearchAuditScore,
} from "./tool-seo-audit";
import { ToolPanelButton, ToolPanelHeader, formatFieldMeta, toolFieldClass, toolMonoContentClass, toolPanelHeight } from "./tool-panel";

const sampleArticle = `---
title: "从 0 开始学习 SEO、GEO、AEO"
description: "这是一份给内容创作者和独立站运营者的 AI 搜索学习路径，帮助你理解传统搜索、答案引擎和生成式搜索的差异。"
---

# 从 0 开始学习 SEO、GEO、AEO

SEO、GEO、AEO 是 2026 年内容创作者需要一起理解的三件事：SEO 解决搜索引擎能不能发现你，AEO 解决答案引擎能不能摘取你，GEO 解决生成式搜索能不能把你当作可信来源引用。

## SEO、GEO、AEO 是什么？

SEO 是搜索引擎优化，重点是让页面被抓取、索引和排序。AEO 是答案引擎优化，重点是让内容能直接回答用户问题。GEO 是生成式搜索优化，重点是让 AI 搜索系统能识别实体、证据和来源。

## 新手应该怎么开始？

1. 先写清楚标题、摘要和 H1。
2. 在开头回答一个具体问题。
3. 给关键判断补上来源、年份、案例或数据。
4. 用 FAQ 和结构化数据整理可摘取内容。

## 我自己的观察

我在整理 AI 词条和独立站文章时发现，只有概念解释还不够。更容易被引用的页面通常有明确问题、直接答案、更新时间、案例和延伸阅读。

参考：https://developers.google.com/search/docs/fundamentals/ai-optimization-guide`;

const dimensionCopy: Record<SearchAuditDimension, string> = {
  aeo: "AEO",
  geo: "GEO",
  risk: "风险",
  schema: "结构化",
  seo: "SEO",
};

const dimensionTone: Record<SearchAuditDimension, string> = {
  aeo: "bg-sky-500/12 text-sky-700",
  geo: "bg-emerald-500/12 text-emerald-700",
  risk: "bg-red-500/12 text-red-700",
  schema: "bg-violet-500/12 text-violet-700",
  seo: "bg-accent/12 text-accent",
};

const copy = {
  title: "AI 搜索体检",
  intro: "SEO / GEO / AEO 一次检查。全部在浏览器本地运行，内容不上传。",
  inputLabel: "文章 / 页面内容",
  inputPlaceholder: "粘贴 Markdown、HTML 或正文…",
  targetKeyword: "目标关键词",
  targetQuestion: "目标问题",
  brandName: "品牌 / 主体",
  pageUrl: "页面 URL",
  contentType: "内容类型",
  sample: "示例",
  clear: "清空",
  copyReport: "复制报告",
  copied: "已复制",
  copyFailed: "复制失败",
  score: "体检分数",
  extracted: "提取信息",
  issues: "优先修改",
  noIssues: "没有明显问题。发布前仍建议人工检查事实、来源和语气。",
  rewrites: "可复制改稿",
  checklist: "发布前清单",
  summary: "AI 可引用摘要",
  faq: "FAQ 建议",
  jsonLd: "JSON-LD",
  llms: "llms.txt 片段",
  empty: "粘贴一篇文章后，这里会显示 SEO / AEO / GEO 分数、修改建议和可复制产物。",
};

type CopiedTarget = string | null;

const maxAnalyzeChars = 300_000;

function copyWithSelection(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

async function writeClipboard(value: string) {
  if (copyWithSelection(value)) return true;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function SeoAeoGeoTool() {
  const [input, setInput] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [targetQuestion, setTargetQuestion] = useState("");
  const [brandName, setBrandName] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [contentType, setContentType] = useState<SearchAuditContentType>("general");
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget>(null);
  const debouncedInput = useDebouncedValue(input, 350);
  const inputTooLarge = debouncedInput.length > maxAnalyzeChars;
  const analyzedInput = inputTooLarge ? debouncedInput.slice(0, maxAnalyzeChars) : debouncedInput;

  const result = useMemo(
    () => analyzeSearchAudit(analyzedInput, { brandName, contentType, pageUrl, targetKeyword, targetQuestion }),
    [analyzedInput, brandName, contentType, pageUrl, targetKeyword, targetQuestion],
  );
  const hasInput = input.trim().length > 0;
  const visibleIssues = useMemo(() => {
    const issues = result.issues.filter((issue) => issue.level !== "pass");
    return [...issues.filter((issue) => issue.id.startsWith("type-")), ...issues.filter((issue) => !issue.id.startsWith("type-"))].slice(0, 10);
  }, [result.issues]);
  const reportMarkdown = useMemo(() => formatSearchAuditMarkdown(result), [result]);
  const faqText = result.faq.map((item) => `### ${item.question}\n${item.answer}`).join("\n\n");
  const faqOutput = faqText || "建议补充 2-5 个真实问题和直接回答。";
  const copyFailedTarget = (target: string) => copiedTarget === `${target}:failed`;

  async function copyText(value: string, target: string) {
    if (!value) return;
    if (await writeClipboard(value)) {
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 1500);
    } else {
      setCopiedTarget(`${target}:failed`);
      window.setTimeout(() => setCopiedTarget(null), 1800);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{copy.title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">{copy.intro}</p>
        </div>
        <ToolPanelButton icon={copiedTarget === "report" ? Check : Copy} onClick={() => copyText(reportMarkdown, "report")} disabled={!hasInput}>
          {copiedTarget === "report" ? copy.copied : copyFailedTarget("report") ? copy.copyFailed : copy.copyReport}
        </ToolPanelButton>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted">{copy.contentType}</span>
          <Select
            size="sm"
            className="w-full"
            ariaLabel={copy.contentType}
            value={contentType}
            onChange={(value) => setContentType(value as SearchAuditContentType)}
            options={searchAuditContentTypeOptions.map((item) => ({ label: item.label, value: item.value }))}
          />
        </div>
        <Field label={copy.targetKeyword} value={targetKeyword} onChange={setTargetKeyword} placeholder="例如：SEO GEO AEO" />
        <Field label={copy.targetQuestion} value={targetQuestion} onChange={setTargetQuestion} placeholder="例如：新手怎么学习 GEO？" />
        <Field label={copy.brandName} value={brandName} onChange={setBrandName} placeholder="例如：知之" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={copy.pageUrl} value={pageUrl} onChange={setPageUrl} placeholder="https://example.com/page" />
        {inputTooLarge ? (
          <p className="flex min-h-10 items-center rounded-md border border-amber/40 bg-amber/10 px-3 text-xs font-semibold leading-5 text-amber">
            当前输入超过 {maxAnalyzeChars.toLocaleString()} 字符，已先分析前 {maxAnalyzeChars.toLocaleString()} 字符；建议分段体检长文。
          </p>
        ) : (
          <p className="flex min-h-10 items-center rounded-md border border-line bg-background/45 px-3 text-xs leading-5 text-muted">
            建议填写目标关键词和目标问题，体检结果会更贴近 SEO / AEO / GEO 发布场景。
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
        <div>
          <ToolPanelHeader
            label={copy.inputLabel}
            meta={formatFieldMeta(input)}
            actions={
              <>
                <ToolPanelButton icon={Sparkles} onClick={() => setInput(sampleArticle)}>{copy.sample}</ToolPanelButton>
                <ToolPanelButton icon={Trash2} onClick={() => setInput("")}>{copy.clear}</ToolPanelButton>
              </>
            }
          />
          <textarea
            className={`${toolPanelHeight("large")} resize-y ${toolFieldClass}`}
            value={input}
            placeholder={copy.inputPlaceholder}
            spellCheck={false}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>

        <div>
          <ToolPanelHeader label={copy.score} />
          {!hasInput ? (
            <p className={`${toolPanelHeight("large")} flex items-center justify-center rounded-md border border-dashed border-line px-4 text-center text-sm text-muted`}>{copy.empty}</p>
          ) : (
            <div className={`${toolPanelHeight("large")} overflow-auto rounded-md border border-line bg-paper/88 p-4 shadow-inner`}>
              <ScoreOverview score={result.score} />
              <p className="mt-3 rounded-md border border-line/70 bg-background/55 px-3 py-2 text-sm font-semibold leading-6 text-foreground">{result.verdict}</p>
              <ExtractedStats
                items={[
                  ["标题", result.extracted.title ?? "未识别"],
                  ["摘要", result.extracted.description ? "已识别" : "未识别"],
                  ["H1 / H2", `${result.extracted.h1.length} / ${result.extracted.h2.length}`],
                  ["链接 / 图片", `${result.extracted.linkCount} / ${result.extracted.imageCount}`],
                  ["FAQ", `${result.extracted.faqCount} 条`],
                  ["字词", result.extracted.wordCount.toLocaleString()],
                ]}
              />
              <IssueList issues={visibleIssues} copiedTarget={copiedTarget} onCopy={copyText} />
            </div>
          )}
        </div>
      </div>

      {hasInput ? (
        <>
          <RewriteGrid rewrites={result.rewrites} copiedTarget={copiedTarget} onCopy={copyText} />
          <ChecklistPanel items={result.checklist} />
          <div className="grid gap-4 xl:grid-cols-2">
            <CopyPanel title={copy.summary} value={result.aiSummary} copied={copiedTarget === "summary"} failed={copyFailedTarget("summary")} onCopy={() => copyText(result.aiSummary, "summary")} />
            <CopyPanel title={copy.faq} value={faqOutput} copied={copiedTarget === "faq"} failed={copyFailedTarget("faq")} onCopy={() => copyText(faqOutput, "faq")} />
            <CopyPanel title={copy.jsonLd} value={result.jsonLd} copied={copiedTarget === "jsonLd"} failed={copyFailedTarget("jsonLd")} onCopy={() => copyText(result.jsonLd, "jsonLd")} mono />
            <CopyPanel title={copy.llms} value={result.llmsText} copied={copiedTarget === "llms"} failed={copyFailedTarget("llms")} onCopy={() => copyText(result.llmsText, "llms")} mono />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input
        className="h-10 rounded-md border border-line bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted/55 focus:border-accent focus:ring-2 focus:ring-accent/15"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ScoreOverview({ score }: { score: SearchAuditScore }) {
  const items = [
    ["总分", score.overall],
    ["SEO", score.seo],
    ["AEO", score.aeo],
    ["GEO", score.geo],
    ["结构化", score.schema],
  ] as const;
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-line bg-background/60 px-3 py-2">
          <div className="text-[0.68rem] font-semibold text-muted">{label}</div>
          <div className={`mt-1 text-2xl font-bold tabular-nums ${value >= 80 ? "text-emerald-700" : value >= 60 ? "text-amber" : "text-red-700"}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function ExtractedStats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-muted">{copy.extracted}</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-md border border-line/70 bg-background/45 px-3 py-2">
            <div className="text-[0.68rem] font-semibold text-muted">{label}</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueList({ issues, copiedTarget, onCopy }: { issues: SearchAuditIssue[]; copiedTarget: CopiedTarget; onCopy: (value: string, target: string) => void }) {
  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-muted">{copy.issues}</h4>
      {issues.length === 0 ? (
        <p className="mt-2 rounded-md border border-line/70 bg-background/45 px-3 py-3 text-sm text-muted">{copy.noIssues}</p>
      ) : (
        <div className="mt-2 grid gap-2">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-md border border-line bg-background/58 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[0.68rem] font-semibold ${dimensionTone[issue.dimension]}`}>{dimensionCopy[issue.dimension]}</span>
                <span className="text-sm font-semibold text-foreground">{issue.title}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{issue.detail}</p>
              <p className="mt-1 rounded bg-paper/80 px-2 py-1 text-xs leading-5 text-muted">证据：{issue.evidence}</p>
              <p className="mt-1 text-xs leading-5 text-foreground">{issue.fix}</p>
              {issue.rewrite ? (
                <div className="mt-2">
                  <ToolPanelButton icon={copiedTarget === `issue:${issue.id}` ? Check : Copy} onClick={() => onCopy(issue.rewrite ?? "", `issue:${issue.id}`)}>
                    {copiedTarget === `issue:${issue.id}` ? copy.copied : copiedTarget === `issue:${issue.id}:failed` ? copy.copyFailed : "复制改法"}
                  </ToolPanelButton>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RewriteGrid({ rewrites, copiedTarget, onCopy }: { rewrites: SearchAuditRewrite[]; copiedTarget: CopiedTarget; onCopy: (value: string, target: string) => void }) {
  return (
    <div>
      <ToolPanelHeader label={copy.rewrites} />
      <div className="grid gap-3 xl:grid-cols-2">
        {rewrites.map((item) => {
          const target = `rewrite:${item.id}`;
          return (
            <div key={item.id} className="rounded-md border border-line bg-paper/88 p-3.5 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                <ToolPanelButton icon={copiedTarget === target ? Check : Copy} onClick={() => onCopy(item.value, target)}>
                  {copiedTarget === target ? copy.copied : copiedTarget === `${target}:failed` ? copy.copyFailed : "复制"}
                </ToolPanelButton>
              </div>
              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-sm leading-7 text-foreground">{item.value}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistPanel({ items }: { items: SearchAuditChecklistItem[] }) {
  const doneCount = items.filter((item) => item.done).length;
  return (
    <div>
      <ToolPanelHeader label={`${copy.checklist} · ${doneCount}/${items.length}`} />
      <div className="grid gap-2 rounded-md border border-line bg-paper/88 p-3.5 shadow-inner sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="flex min-w-0 items-start gap-2 rounded-md border border-line/70 bg-background/45 px-3 py-2">
            <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[0.65rem] ${item.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-line bg-paper text-muted"}`}>
              {item.done ? "✓" : ""}
            </span>
            <span className={`text-sm leading-6 ${item.done ? "text-foreground" : "text-muted"}`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyPanel({ title, value, copied, failed, onCopy, mono = false }: { title: string; value: string; copied: boolean; failed: boolean; onCopy: () => void; mono?: boolean }) {
  return (
    <div>
      <ToolPanelHeader
        label={title}
        actions={<ToolPanelButton icon={copied ? Check : Copy} onClick={onCopy}>{copied ? copy.copied : failed ? copy.copyFailed : "复制"}</ToolPanelButton>}
      />
      <pre className={`${toolPanelHeight("medium")} overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper/88 p-3.5 text-sm leading-7 text-foreground shadow-inner ${mono ? toolMonoContentClass : ""}`}>
        {value}
      </pre>
    </div>
  );
}
