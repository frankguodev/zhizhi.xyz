"use client";

import { Check, Copy, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import {
  analyzeSearchAudit,
  formatSearchAuditMarkdown,
  formatSearchAuditPublishMarkdown,
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
  advanced: "高级选项",
  sample: "示例",
  clear: "清空",
  copyReport: "复制报告",
  copyPublish: "复制发布片段",
  copied: "已复制",
  copyFailed: "复制失败",
  score: "体检分数",
  extracted: "提取信息",
  issues: "优先修改",
  issueSummary: "先改这几项",
  scoreReason: "主要扣分",
  showAllIssues: "查看全部",
  showTopIssues: "收起",
  noIssues: "没有明显问题。发布前仍建议人工检查事实、来源和语气。",
  rewrites: "可复制改稿",
  checklist: "发布前清单",
  summary: "AI 可引用摘要",
  faq: "FAQ 建议",
  jsonLd: "JSON-LD",
  llms: "llms.txt 片段",
  empty: "粘贴一篇文章后，这里会显示 SEO / AEO / GEO 分数、修改建议和可复制产物。",
  emptyAction: "用示例开始",
  targetQuestionSuggestion: "建议目标问题",
};

type CopiedTarget = string | null;

const maxAnalyzeChars = 300_000;
const mainPanelHeaderClass = "min-h-7";
const hintTextClass = "border-l-2 border-accent/35 bg-accent/5 px-3 py-2 text-xs leading-5 text-muted";

const contentTypeHints: Record<SearchAuditContentType, string> = {
  comparison: "对比文章重点检查维度、适用场景、优缺点和选择建议。",
  experience: "个人经验重点检查第一手过程、踩坑、观察和复盘结论。",
  general: "通用文章重点检查标题、首段答案、证据来源和 FAQ。",
  glossary: "词条解释重点检查开头定义、概念边界、例子和 FAQ。",
  listicle: "清单文章重点检查条目数量、每项结论和适用场景。",
  news: "新闻解读重点检查发生时间、信息来源、当事方和影响范围。",
  review: "产品评测重点检查优缺点、适合谁、不适合谁和最终建议。",
  tutorial: "教程内容重点检查步骤、前置条件、结果验证和常见问题。",
};

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
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return copyWithSelection(value);
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
  const [showAllIssues, setShowAllIssues] = useState(false);
  const debouncedInput = useDebouncedValue(input, 350);
  const inputTooLarge = debouncedInput.length > maxAnalyzeChars;
  const analyzedInput = inputTooLarge ? debouncedInput.slice(0, maxAnalyzeChars) : debouncedInput;

  const result = useMemo(
    () => analyzeSearchAudit(analyzedInput, { brandName, contentType, pageUrl, targetKeyword, targetQuestion }),
    [analyzedInput, brandName, contentType, pageUrl, targetKeyword, targetQuestion],
  );
  const hasInput = input.trim().length > 0;
  const orderedIssues = useMemo(() => {
    const issues = result.issues.filter((issue) => issue.level !== "pass");
    return [...issues.filter((issue) => issue.id.startsWith("type-")), ...issues.filter((issue) => !issue.id.startsWith("type-"))];
  }, [result.issues]);
  const visibleIssues = showAllIssues ? orderedIssues : orderedIssues.slice(0, 10);
  const reportMarkdown = useMemo(() => formatSearchAuditMarkdown(result), [result]);
  const publishMarkdown = useMemo(() => formatSearchAuditPublishMarkdown(result), [result]);
  const scoreReason = useMemo(() => buildScoreReason(orderedIssues), [orderedIssues]);
  const suggestedQuestion = useMemo(() => buildSuggestedQuestion(result.extracted.title, result.extracted.h2, targetKeyword), [result.extracted.h2, result.extracted.title, targetKeyword]);
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
        <div className="flex flex-wrap gap-2">
          <ToolPanelButton icon={copiedTarget === "publish" ? Check : Copy} onClick={() => copyText(publishMarkdown, "publish")} disabled={!hasInput}>
            {copiedTarget === "publish" ? copy.copied : copyFailedTarget("publish") ? copy.copyFailed : copy.copyPublish}
          </ToolPanelButton>
          <ToolPanelButton icon={copiedTarget === "report" ? Check : Copy} onClick={() => copyText(reportMarkdown, "report")} disabled={!hasInput}>
            {copiedTarget === "report" ? copy.copied : copyFailedTarget("report") ? copy.copyFailed : copy.copyReport}
          </ToolPanelButton>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
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
        <div className="grid gap-1">
          <Field label={copy.targetQuestion} value={targetQuestion} onChange={setTargetQuestion} placeholder="例如：新手怎么学习 GEO？" />
          {!targetQuestion && suggestedQuestion ? (
            <button
              type="button"
              className="cursor-pointer text-left text-xs font-semibold leading-5 text-accent hover:underline"
              onClick={() => setTargetQuestion(suggestedQuestion)}
            >
              {copy.targetQuestionSuggestion}：{suggestedQuestion}
            </button>
          ) : null}
        </div>
      </div>
      <p className={hintTextClass}>{contentTypeHints[contentType]}</p>
      {inputTooLarge ? (
        <p className="flex min-h-10 items-center rounded-md border border-amber/40 bg-amber/10 px-3 text-xs font-semibold leading-5 text-amber">
          当前输入超过 {maxAnalyzeChars.toLocaleString()} 字符，已先分析前 {maxAnalyzeChars.toLocaleString()} 字符；建议分段体检长文。
        </p>
      ) : null}
      <details className="group rounded-md border border-line bg-background/40 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20">
          {copy.advanced}
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label={copy.brandName} value={brandName} onChange={setBrandName} placeholder="例如：知之" />
          <Field label={copy.pageUrl} value={pageUrl} onChange={setPageUrl} placeholder="https://example.com/page" />
          <p className={`md:col-span-2 ${hintTextClass}`}>
            建议填写目标关键词和目标问题，体检结果会更贴近 SEO / AEO / GEO 发布场景。
          </p>
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
        <div className="flex h-full min-h-0 flex-col">
          <ToolPanelHeader
            label={copy.inputLabel}
            meta={formatFieldMeta(input)}
            className={mainPanelHeaderClass}
            actions={
              <>
                <ToolPanelButton icon={Sparkles} onClick={() => setInput(sampleArticle)}>{copy.sample}</ToolPanelButton>
                <ToolPanelButton icon={Trash2} onClick={() => setInput("")}>{copy.clear}</ToolPanelButton>
              </>
            }
          />
          {hasInput ? <MobileResultSummary score={result.score} scoreReason={scoreReason} issues={orderedIssues.slice(0, 3)} /> : null}
          <textarea
            className={`min-h-[clamp(12rem,34dvh,20rem)] lg:min-h-[clamp(22rem,60dvh,46rem)] lg:flex-1 resize-y ${toolFieldClass}`}
            value={input}
            placeholder={copy.inputPlaceholder}
            spellCheck={false}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>

        <div className="flex h-full min-h-0 flex-col">
          <ToolPanelHeader label={copy.score} className={mainPanelHeaderClass} />
          {!hasInput ? (
            <EmptyResult onSample={() => setInput(sampleArticle)} />
          ) : (
            <div className={`${toolPanelHeight("large")} overflow-auto rounded-md border border-line bg-paper/88 p-4 shadow-inner`}>
              <ScoreOverview score={result.score} />
              <p className="mt-2 rounded-md border border-line/70 bg-background/45 px-3 py-2 text-xs leading-5 text-muted">{copy.scoreReason}：{scoreReason}</p>
              <p className="mt-3 rounded-md border border-line/70 bg-background/55 px-3 py-2 text-sm font-semibold leading-6 text-foreground">{result.verdict}</p>
              <TopIssueSummary issues={orderedIssues.slice(0, 3)} />
              <ExtractedStats
                items={[
                  ["标题", result.extracted.title ?? "未识别"],
                  ["摘要", result.extracted.description ? "已识别" : "未识别"],
                  ["H1 / H2", `${result.extracted.h1.length} / ${result.extracted.h2.length}`],
                  ["链接 / 图片", `${result.extracted.linkCount} / ${result.extracted.imageCount}`],
                  ["来源 / 时间 / 数据", `${result.extracted.evidenceSignals.links} / ${result.extracted.evidenceSignals.datedFacts} / ${result.extracted.evidenceSignals.quantifiedFacts}`],
                  ["FAQ", `${result.extracted.faqCount} 条`],
                  ["字词", result.extracted.wordCount.toLocaleString()],
                ]}
              />
              <IssueList
                issues={visibleIssues}
                issueTotal={orderedIssues.length}
                expanded={showAllIssues}
                copiedTarget={copiedTarget}
                onCopy={copyText}
                onToggleExpanded={() => setShowAllIssues((value) => !value)}
              />
            </div>
          )}
        </div>
      </div>

      {hasInput ? (
        <>
          <RewriteGrid rewrites={result.rewrites} copiedTarget={copiedTarget} onCopy={copyText} />
          <ChecklistPanel items={result.checklist} />
          <div className="grid gap-4 xl:grid-cols-2">
            <CopyPanel title="发布用片段" value={publishMarkdown} copied={copiedTarget === "publishPanel"} failed={copyFailedTarget("publishPanel")} onCopy={() => copyText(publishMarkdown, "publishPanel")} mono />
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

function buildScoreReason(issues: SearchAuditIssue[]) {
  if (issues.length === 0) {
    return "没有明显扣分项，发布前复核事实、来源和语气即可。";
  }
  return issues.slice(0, 3).map((issue) => issue.title).join("、");
}

function buildSuggestedQuestion(title: string | null, h2: string[], targetKeyword: string) {
  const questionHeading = h2.find((heading) => /[?？]|如何|怎么|为什么|是什么|能不能|适合/.test(heading));
  if (questionHeading) return questionHeading;
  const subject = targetKeyword || title;
  return subject ? `${subject} 是什么？` : "";
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

function EmptyResult({ onSample }: { onSample: () => void }) {
  return (
    <div className={`${toolPanelHeight("large")} flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-line px-4 text-center`}>
      <p className="max-w-sm text-sm leading-6 text-muted">{copy.empty}</p>
      <ToolPanelButton icon={Sparkles} onClick={onSample}>{copy.emptyAction}</ToolPanelButton>
    </div>
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

function MobileResultSummary({ score, scoreReason, issues }: { score: SearchAuditScore; scoreReason: string; issues: SearchAuditIssue[] }) {
  return (
    <div className="mt-3 rounded-md border border-accent/18 bg-paper/88 p-3 shadow-inner lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-muted">快速结论</div>
          <div className={`mt-1 text-3xl font-bold tabular-nums ${score.overall >= 80 ? "text-emerald-700" : score.overall >= 60 ? "text-amber" : "text-red-700"}`}>{score.overall}</div>
        </div>
        <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-foreground">{copy.scoreReason}：{scoreReason}</p>
      </div>
      {issues.length > 0 ? (
        <ol className="mt-2 grid gap-1">
          {issues.map((issue) => (
            <li key={issue.id} className="truncate text-xs leading-5 text-muted">
              {dimensionCopy[issue.dimension]}：{issue.title}
            </li>
          ))}
        </ol>
      ) : null}
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

function TopIssueSummary({ issues }: { issues: SearchAuditIssue[] }) {
  if (issues.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 rounded-md border border-accent/18 bg-accent/6 px-3 py-2">
      <h4 className="text-xs font-semibold text-accent">{copy.issueSummary}</h4>
      <ol className="mt-1 grid gap-1">
        {issues.map((issue) => (
          <li key={issue.id} className="text-xs leading-5 text-foreground">
            {dimensionCopy[issue.dimension]}：{issue.title}
          </li>
        ))}
      </ol>
    </div>
  );
}

function IssueList({
  issues,
  issueTotal,
  expanded,
  copiedTarget,
  onCopy,
  onToggleExpanded,
}: {
  issues: SearchAuditIssue[];
  issueTotal: number;
  expanded: boolean;
  copiedTarget: CopiedTarget;
  onCopy: (value: string, target: string) => void;
  onToggleExpanded: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-muted">{copy.issues} · {issueTotal}</h4>
        {issueTotal > 10 ? (
          <ToolPanelButton onClick={onToggleExpanded}>
            {expanded ? copy.showTopIssues : `${copy.showAllIssues} ${issueTotal}`}
          </ToolPanelButton>
        ) : null}
      </div>
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
              <p className="mt-2 text-xs leading-5 text-muted"><span className="font-semibold text-foreground">影响：</span>{issue.detail}</p>
              <p className="mt-1 text-xs leading-5 text-foreground"><span className="font-semibold">怎么改：</span>{issue.fix}</p>
              <p className="mt-1 rounded bg-paper/80 px-2 py-1 text-xs leading-5 text-muted">证据：{issue.evidence}</p>
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
