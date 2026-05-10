import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticleQualityReport, QualityIssue, QualityIssueLevel } from "@/lib/article-quality";

const levelTone: Record<QualityIssueLevel, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  suggestion: "border-line bg-surface text-foreground",
};

const levelIcon: Record<QualityIssueLevel, typeof AlertCircle> = {
  error: AlertCircle,
  warning: TriangleAlert,
  suggestion: Info,
};

const levelText: Record<QualityIssueLevel, string> = {
  error: "必须处理",
  warning: "建议处理",
  suggestion: "可以优化",
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function QualityReport({ report, onIssueSelect }: { report: ArticleQualityReport; onIssueSelect?: (issue: QualityIssue) => void }) {
  const errors = report.issues.filter((issue) => issue.level === "error").length;
  const warnings = report.issues.filter((issue) => issue.level === "warning").length;
  const suggestions = report.issues.filter((issue) => issue.level === "suggestion").length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className="border border-line bg-surface p-6">
          <p className="text-sm font-semibold text-muted">质量分</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-6xl font-semibold text-foreground">{report.score}</span>
            <span className="pb-2 text-muted">/ 100</span>
          </div>
          <p className="mt-4 leading-7 text-muted">
            这个分数用于发布前自检，不代表文章价值。它主要提醒结构、分层阅读和 AI 初稿残留问题。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-line bg-surface p-5">
            <p className="text-sm text-muted">必须处理</p>
            <p className="mt-2 text-3xl font-semibold text-red-700">{errors}</p>
          </div>
          <div className="border border-line bg-surface p-5">
            <p className="text-sm text-muted">建议处理</p>
            <p className="mt-2 text-3xl font-semibold text-amber">{warnings}</p>
          </div>
          <div className="border border-line bg-surface p-5">
            <p className="text-sm text-muted">可以优化</p>
            <p className="mt-2 text-3xl font-semibold text-accent">{suggestions}</p>
          </div>
        </div>
      </section>

      <section className="border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold">内容统计</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="正文字符" value={report.stats.words.toString()} />
          <Stat label="二级标题" value={report.stats.h2.toString()} />
          <Stat label="图片" value={report.stats.images.toString()} />
          <Stat label="快速模式主线" value={formatPercent(report.stats.quickModeRatio)} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="detail" value={report.stats.layers.detail.toString()} compact />
          <Stat label="example" value={report.stats.layers.example.toString()} compact />
          <Stat label="warning" value={report.stats.layers.warning.toString()} compact />
          <Stat label="advanced" value={report.stats.layers.advanced.toString()} compact />
          <Stat label="author" value={report.stats.layers.author.toString()} compact />
        </div>
      </section>

      <section className="border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Info className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold">SEO 统计</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="SEO 标题字数" value={report.stats.seo.seoTitleLength.toString()} />
          <Stat label="SEO 描述字数" value={report.stats.seo.seoDescriptionLength.toString()} />
          <Stat label="关键词" value={report.stats.seo.keywords.toString()} />
          <Stat label="正文 H1" value={report.stats.seo.h1.toString()} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Canonical" value={report.stats.seo.hasCanonical ? "已设置" : "自动回退"} compact />
          <Stat label="Robots" value={report.stats.seo.hasRobots ? "已设置" : "默认规则"} compact />
          <Stat label="封面图" value={report.stats.seo.hasCoverImage ? "已设置" : "缺少"} compact />
          <Stat label="分享图" value={report.stats.seo.hasSocialImage ? "已设置" : "缺少"} compact />
          <Stat label="图片说明" value={report.stats.seo.hasImageAlt ? "已设置" : "缺少"} compact />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">检查结果</h2>
        {report.issues.length === 0 ? (
          <div className="border border-line bg-surface p-5 text-muted">没有发现明显问题，可以进入人工终审。</div>
        ) : (
          report.issues.map((issue) => {
            const Icon = levelIcon[issue.level];
            return (
              <article key={issue.id} className={cn("border p-5", levelTone[issue.level])}>
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{levelText[issue.level]}</p>
                        <h3 className="mt-1 text-lg font-semibold">{issue.title}</h3>
                      </div>
                      {onIssueSelect ? (
                        <button
                          className="inline-flex h-9 shrink-0 items-center justify-center border border-current/25 bg-white/50 px-3 text-sm font-semibold transition hover:bg-white/80"
                          type="button"
                          onClick={() => onIssueSelect(issue)}
                        >
                          定位
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 leading-7 opacity-85">{issue.detail}</p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="border border-line bg-background px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("mt-1 font-semibold text-foreground", compact ? "text-xl" : "text-2xl")}>{value}</p>
    </div>
  );
}
