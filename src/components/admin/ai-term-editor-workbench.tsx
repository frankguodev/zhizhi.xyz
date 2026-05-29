"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, CheckCircle2, Eye, Loader2, RotateCcw, Save, ScanSearch, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { adminApiErrorMessage, handleAdminUnauthorized } from "@/components/admin/admin-api";
import { MediaUploadPanel } from "@/components/admin/media-upload-panel";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";
import type { AdminAiTermDetail } from "@/lib/ai-terms";
import type { AiTermQualityReport } from "@/lib/ai-term-quality";
import type { AiTermFableScan } from "@/lib/markdown";

type AiTermEditorData = {
  aiTerm: AdminAiTermDetail;
  fable: AiTermFableScan;
  markdown: string;
  quality: AiTermQualityReport;
  importWarnings?: string[];
  logs?: Array<{
    id: string;
    adminEmail: string | null;
    action: string;
    targetTitle: string | null;
    createdAt: Date | string | number;
  }>;
};

type SaveState = {
  status: "idle" | "checking" | "saving" | "publishing" | "archiving" | "restoring" | "deleting" | "saved" | "error";
  message: string;
};

type EditorMode = "full" | "frontmatter" | "content";
type PreviewTab = "info" | "quality" | "preview";
type ConfirmAction = "publish" | "archive" | "restore" | "delete";

type UploadedDiagramMedia = {
  url: string;
  alt?: string;
};

function splitMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return { hasFrontmatter: false, frontmatter: "", content: normalized };
  }

  return {
    hasFrontmatter: true,
    frontmatter: match[1],
    content: normalized.slice(match[0].length),
  };
}

function joinMarkdown(frontmatter: string, content: string) {
  const cleanFrontmatter = frontmatter.trim();
  const normalizedContent = content.replace(/^\n+/, "");
  return cleanFrontmatter ? `---\n${cleanFrontmatter}\n---\n\n${normalizedContent}` : normalizedContent;
}

function upsertYamlScalar(source: string, key: string, value: string) {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const line = `  ${key}: "${escaped}"`;
  const pattern = new RegExp(`(^|\\n)\\s{2}${key}:.*(?=\\n|$)`);

  if (pattern.test(source)) {
    return source.replace(pattern, (match, prefix: string) => `${prefix}${line}`);
  }

  return `${source.replace(/\s+$/g, "")}\n${line}`;
}

function upsertDiagramFrontmatter(markdown: string, image: string, imageAlt: string) {
  const parts = splitMarkdown(markdown);
  const diagramBlock = parts.frontmatter.match(/(^|\n)diagram:\n((?:  .*(?:\n|$))*)/);
  let nextFrontmatter = parts.frontmatter;

  if (diagramBlock) {
    const block = diagramBlock[0].replace(/^\n/, "");
    let nextBlock = upsertYamlScalar(block, "image", image);
    nextBlock = upsertYamlScalar(nextBlock, "image_alt", imageAlt);
    nextFrontmatter = nextFrontmatter.replace(block, nextBlock);
  } else {
    const diagram = `diagram:\n  image: "${image.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"\n  image_alt: "${imageAlt.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
    nextFrontmatter = nextFrontmatter.includes("\nsource:")
      ? nextFrontmatter.replace(/\nsource:/, `\n${diagram}\n\nsource:`)
      : `${nextFrontmatter.trim()}\n\n${diagram}`;
  }

  return parts.hasFrontmatter ? joinMarkdown(nextFrontmatter, parts.content) : markdown;
}

function countLines(value: string) {
  return value ? value.split(/\r?\n/).length : 0;
}

function publicPath(term: Pick<AdminAiTermDetail, "locale" | "slug">) {
  return term.locale === "en" ? `/en/ai-terms/${term.slug}` : `/ai-terms/${term.slug}`;
}

function statusText(status: AdminAiTermDetail["status"]) {
  return status === "published" ? "已发布" : status === "archived" ? "已归档" : "草稿";
}

function qualityTone(level: "error" | "warning" | "suggestion") {
  return level === "error" ? "text-red-700" : level === "warning" ? "text-amber-800" : "text-muted";
}

export function AiTermEditorWorkbench({ initialData }: { initialData: AiTermEditorData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [markdown, setMarkdown] = useState(initialData.markdown);
  const [editorMode, setEditorMode] = useState<EditorMode>("full");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("quality");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const apiBase = `/api/admin/ai-terms/${data.aiTerm.locale}/${data.aiTerm.slug}`;
  const dirty = markdown !== data.markdown;
  const busy = ["checking", "saving", "publishing", "archiving", "restoring", "deleting"].includes(saveState.status);
  const parts = splitMarkdown(markdown);
  const editorValue = editorMode === "frontmatter" ? parts.frontmatter : editorMode === "content" ? parts.content : markdown;
  const qualityErrors = data.quality.errorCount;
  const { UnsavedChangesDialog } = useUnsavedChangesGuard({
    dirty,
    description: "这条 AI 词条还有未保存修改。离开后数据库内容不会更新。",
  });

  function updateEditorValue(value: string) {
    if (editorMode === "frontmatter") {
      setMarkdown(joinMarkdown(value, parts.content));
      return;
    }

    if (editorMode === "content") {
      setMarkdown(parts.hasFrontmatter ? joinMarkdown(parts.frontmatter, value) : value);
      return;
    }

    setMarkdown(value);
  }

  async function refreshPreview() {
    setSaveState({ status: "checking", message: "正在解析和检查..." });

    try {
      const response = await fetch("/api/admin/ai-terms/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const result = await response.json();

      if (handleAdminUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(adminApiErrorMessage(result, "AI 词条检查失败。"));
      }

      const preview = result as {
        aiTerm: Partial<AdminAiTermDetail>;
        fable: AiTermFableScan;
        quality: AiTermQualityReport;
        importWarnings?: string[];
      };
      setData((value) => ({
        ...value,
        aiTerm: {
          ...value.aiTerm,
          ...preview.aiTerm,
          id: value.aiTerm.id,
          createdAt: value.aiTerm.createdAt,
          updatedAt: value.aiTerm.updatedAt,
          viewCount: value.aiTerm.viewCount,
        },
        fable: preview.fable,
        quality: preview.quality,
        importWarnings: preview.importWarnings,
      }));
      setPreviewTab("quality");
      setSaveState({ status: "idle", message: "检查完成，未写入数据库。" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "AI 词条检查失败。" });
    }
  }

  async function saveMarkdown() {
    setSaveState({ status: "saving", message: "正在保存 AI 词条..." });

    try {
      const response = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const result = await response.json();

      if (handleAdminUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(adminApiErrorMessage(result, "保存 AI 词条失败。"));
      }

      const next = result as AiTermEditorData;
      setData(next);
      setMarkdown(next.markdown);
      setSaveState({ status: "saved", message: "AI 词条已保存。" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "保存 AI 词条失败。" });
    }
  }

  async function runAction(action: ConfirmAction) {
    const status: SaveState["status"] =
      action === "publish" ? "publishing" : action === "archive" ? "archiving" : action === "restore" ? "restoring" : "deleting";
    setSaveState({ status, message: "正在执行操作..." });

    try {
      const response = await fetch(apiBase, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      const result = await response.json();

      if (handleAdminUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(adminApiErrorMessage(result, "AI 词条操作失败。"));
      }

      if (action === "delete") {
        router.push("/admin/ai-terms");
        return;
      }

      const next = result as { aiTerm?: AdminAiTermDetail };
      if (next.aiTerm) {
        const nextMarkdownResponse = await fetch(apiBase);
        const nextMarkdownData = await nextMarkdownResponse.json();
        const payload = nextMarkdownData as AiTermEditorData;
        setData(payload);
        setMarkdown(payload.markdown);
      }

      setSaveState({ status: "saved", message: "AI 词条操作已完成。" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "AI 词条操作失败。" });
    }
  }

  function applyDiagramUpload(media: UploadedDiagramMedia) {
    setMarkdown((value) => upsertDiagramFrontmatter(value, media.url, media.alt ?? ""));
    setSaveState({ status: "idle", message: "词条图解已写入 Frontmatter，保存后生效。" });
  }

  function requestAction(action: ConfirmAction) {
    if (action === "publish") {
      if (dirty) {
        setSaveState({ status: "error", message: "当前有未保存修改。请先保存并检查，再发布词条。" });
        return;
      }

      if (qualityErrors > 0) {
        setSaveState({ status: "error", message: `质量报告还有 ${qualityErrors} 个错误，已阻止发布。` });
        return;
      }
    }

    setConfirmAction(action);
  }

  const confirmMeta = confirmAction
    ? {
        publish: { title: "发布 AI 词条", description: "发布后，公开可见的词条会进入前台读取范围。", label: "发布", tone: "primary" as const },
        archive: { title: "归档 AI 词条", description: "归档后词条会被隐藏，不再作为公开内容展示。", label: "归档", tone: "danger" as const },
        restore: { title: "恢复 AI 词条", description: "恢复后词条会重新变为已发布公开状态。", label: "恢复", tone: "primary" as const },
        delete: { title: "删除 AI 词条", description: "这会物理删除词条和关联关系，操作不可撤销。", label: "确认删除", tone: "danger" as const },
      }[confirmAction]
    : null;

  return (
    <>
      <UnsavedChangesDialog />
      <AdminConfirmDialog
        open={Boolean(confirmAction && confirmMeta)}
        title={confirmMeta?.title ?? ""}
        description={confirmMeta?.description ?? ""}
        confirmLabel={confirmMeta?.label ?? "确认"}
        tone={confirmMeta?.tone ?? "danger"}
        busy={busy}
        details={
          <div className="grid gap-2 border border-line bg-background p-3 text-sm">
            <Meta label="词条" value={data.aiTerm.term} />
            <Meta label="Slug" value={`${data.aiTerm.locale}/${data.aiTerm.slug}`} />
          </div>
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action) void runAction(action);
        }}
      />

      <div className="mb-5 flex flex-col gap-3 border border-line bg-surface p-4 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-line bg-background px-3 py-1 font-semibold text-foreground">{statusText(data.aiTerm.status)}</span>
          <span className="text-muted">{dirty ? "有未保存修改" : "内容已同步"}</span>
          <span className={qualityErrors > 0 ? "text-red-700" : "text-accent"}>{qualityErrors > 0 ? `质量错误 ${qualityErrors} 个` : "质量检查无错误"}</span>
        </div>
        <Link href="/admin/ai-terms" className="inline-flex items-center gap-2 font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回全部词条
        </Link>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          <div className="border border-line bg-surface p-5">
            <p className="text-sm font-semibold text-accent">AI 词条编辑</p>
            <h2 className="mt-2 break-words text-3xl font-semibold text-foreground">{data.aiTerm.term}</h2>
            <p className="mt-3 leading-7 text-muted">{data.aiTerm.shortDesc}</p>

            <div className="mt-5 flex flex-wrap gap-2 border border-line bg-background p-3">
              <EditorModeButton active={editorMode === "full"} label="完整稿" onClick={() => setEditorMode("full")} />
              <EditorModeButton active={editorMode === "frontmatter"} label="Frontmatter" onClick={() => setEditorMode("frontmatter")} />
              <EditorModeButton active={editorMode === "content"} label="正文" onClick={() => setEditorMode("content")} />
              <span className="ml-auto self-center text-sm text-muted">
                {countLines(editorValue)} 行 · {editorValue.length.toLocaleString("zh-CN")} 字符
              </span>
            </div>

            <div className="sticky bottom-3 top-auto z-20 mt-4 grid grid-cols-2 gap-3 border border-line bg-surface/95 p-3 backdrop-blur sm:flex sm:flex-wrap md:bottom-auto md:top-3">
              <button type="button" onClick={refreshPreview} disabled={busy} className="admin-btn admin-btn-secondary inline-flex h-11 items-center gap-2 px-4 font-semibold disabled:opacity-60">
                {saveState.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                检查
              </button>
              <button type="button" onClick={saveMarkdown} disabled={busy} className="admin-btn admin-btn-primary inline-flex h-11 items-center gap-2 px-4 font-semibold disabled:opacity-60">
                {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </button>
              <button type="button" onClick={() => requestAction("publish")} disabled={busy} className="admin-btn admin-btn-primary inline-flex h-11 items-center gap-2 px-4 font-semibold disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4" />
                发布
              </button>
              {data.aiTerm.status === "archived" ? (
                <button type="button" onClick={() => requestAction("restore")} disabled={busy} className="admin-btn admin-btn-secondary inline-flex h-11 items-center gap-2 px-4 font-semibold disabled:opacity-60">
                  <RotateCcw className="h-4 w-4" />
                  恢复
                </button>
              ) : (
                <button type="button" onClick={() => requestAction("archive")} disabled={busy} className="admin-btn admin-btn-secondary inline-flex h-11 items-center gap-2 px-4 font-semibold disabled:opacity-60">
                  <Archive className="h-4 w-4" />
                  归档
                </button>
              )}
            </div>

            <textarea
              className="mt-5 min-h-[640px] w-full resize-y border border-line bg-background p-4 font-mono text-sm leading-6 outline-none focus:border-accent"
              value={editorValue}
              onChange={(event) => updateEditorValue(event.target.value)}
              spellCheck={false}
            />

            <div className="mt-4">
              <MediaUploadPanel
                altPlaceholder="例如：MCP 连接 AI 应用、工具和数据源的图解"
                applyLabel="设为图解"
                description="上传后会写入 Frontmatter 的 diagram.image，不会插入正文。"
                insertOnUpload={false}
                onUpload={applyDiagramUpload}
                scope="ai-term"
                targetLocale={data.aiTerm.locale}
                targetRole="diagram"
                targetSlug={data.aiTerm.slug}
                title="词条图解上传"
              />
            </div>

            {saveState.message ? (
              <p
                className={saveState.status === "error" ? "mt-3 whitespace-pre-line text-sm font-medium text-red-700" : "mt-3 text-sm font-medium text-accent"}
                role={saveState.status === "error" ? "alert" : "status"}
              >
                {saveState.message}
              </p>
            ) : null}

            {data.aiTerm.status === "archived" ? (
              <div className="mt-5 border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">危险区</p>
                <p className="mt-2 text-sm leading-6 text-red-700">物理删除会删除词条和关联关系，日常下架请优先使用归档。</p>
                <button
                  type="button"
                  onClick={() => requestAction("delete")}
                  disabled={busy}
                  className="admin-btn mt-3 inline-flex h-10 items-center gap-2 bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  物理删除
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="border border-line bg-surface p-3">
            <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="AI 词条预览面板">
              <TabButton active={previewTab === "info"} label="词条信息" onClick={() => setPreviewTab("info")} />
              <TabButton active={previewTab === "quality"} label={`质量 ${data.quality.issues.length}`} onClick={() => setPreviewTab("quality")} />
              <TabButton active={previewTab === "preview"} label="解析预览" onClick={() => setPreviewTab("preview")} />
            </div>
          </div>

          {previewTab === "info" ? <InfoPanel aiTerm={data.aiTerm} fable={data.fable} logs={data.logs ?? []} /> : null}
          {previewTab === "quality" ? <QualityPanel report={data.quality} warnings={data.importWarnings ?? []} /> : null}
          {previewTab === "preview" ? <PreviewPanel aiTerm={data.aiTerm} /> : null}
        </section>
      </div>
    </>
  );
}

function EditorModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={active ? "admin-btn h-9 bg-accent px-3 text-sm font-semibold text-accent-ink" : "admin-btn h-9 px-3 text-sm font-semibold text-muted"}>
      {label}
    </button>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={active ? "admin-btn h-10 bg-accent px-3 text-sm font-semibold text-accent-ink" : "admin-btn h-10 px-3 text-sm font-semibold text-muted"}
    >
      {label}
    </button>
  );
}

function InfoPanel({
  aiTerm,
  fable,
  logs,
}: {
  aiTerm: AdminAiTermDetail;
  fable: AiTermFableScan;
  logs: NonNullable<AiTermEditorData["logs"]>;
}) {
  return (
    <div className="space-y-5">
      <div className="border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-accent">词条信息</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Meta label="Slug" value={aiTerm.slug} />
          <Meta label="语言" value={aiTerm.locale} />
          <Meta label="状态" value={statusText(aiTerm.status)} />
          <Meta label="可见性" value={aiTerm.visibility} />
          <Meta label="热度" value={String(aiTerm.heatScore)} />
          <Meta label="质量分" value={String(aiTerm.qualityScore)} />
          <Meta label="词条图解" value={aiTerm.diagramImage ?? "未设置"} />
          <Meta label="图解说明" value={aiTerm.diagramImageAlt ?? "未设置"} />
          <Meta label="寓言故事" value={fable.exists ? fable.title ?? "已检测到" : "未检测到"} />
          <Meta label="寓言块闭合" value={fable.closed ? "正常" : "缺少闭合 :::"} />
        </dl>
        <Link href={publicPath(aiTerm)} className="admin-btn admin-btn-secondary mt-4 inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold">
          <Eye className="h-4 w-4" />
          前台路径
        </Link>
      </div>

      <div className="border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-accent">最近操作</p>
        <div className="mt-4 space-y-2">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="border border-line bg-background p-3 text-sm">
                <div className="font-semibold text-foreground">{log.action}</div>
                <div className="mt-1 text-xs text-muted">
                  {log.adminEmail ?? "未知管理员"} · {new Date(log.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>
            ))
          ) : (
            <p className="border border-line bg-background p-3 text-sm text-muted">暂无操作记录。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QualityPanel({ report, warnings }: { report: AiTermQualityReport; warnings: string[] }) {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-sm font-semibold text-accent">质量检查</p>
      <div className="mt-4 grid gap-2 text-sm">
        <Meta label="错误" value={String(report.errorCount)} />
        <Meta label="警告" value={String(report.warningCount)} />
        <Meta label="建议" value={String(report.suggestionCount)} />
      </div>
      <div className="mt-5 space-y-3">
        {report.issues.length > 0 ? (
          report.issues.map((issue) => (
            <div key={issue.id} className="border border-line bg-background p-3">
              <div className={`text-sm font-semibold ${qualityTone(issue.level)}`}>{issue.title}</div>
              <p className="mt-1 text-sm leading-6 text-muted">{issue.detail}</p>
            </div>
          ))
        ) : (
          <p className="border border-line bg-background p-3 text-sm text-muted">质量检查未发现问题。</p>
        )}
        {warnings.map((warning) => (
          <p key={warning} className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {warning}
          </p>
        ))}
      </div>
    </div>
  );
}

function PreviewPanel({ aiTerm }: { aiTerm: AdminAiTermDetail }) {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-sm font-semibold text-accent">解析预览</p>
      <h2 className="mt-4 text-3xl font-semibold text-foreground">{aiTerm.term}</h2>
      <p className="mt-3 text-lg font-semibold text-foreground">{aiTerm.shortConcept}</p>
      <p className="mt-3 break-words leading-7 text-muted [overflow-wrap:anywhere]">{aiTerm.shortDesc}</p>
      {aiTerm.diagramImage ? (
        <figure className="mt-5 overflow-hidden border border-line bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aiTerm.diagramImage} alt={aiTerm.diagramImageAlt ?? ""} className="max-h-72 w-full object-contain" />
          {aiTerm.diagramImageAlt ? <figcaption className="border-t border-line px-3 py-2 text-xs text-muted">{aiTerm.diagramImageAlt}</figcaption> : null}
        </figure>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {aiTerm.categories.map((category) => (
          <span key={category.slug} className="border border-line bg-background px-2 py-1 text-xs text-muted">
            {category.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-background px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
