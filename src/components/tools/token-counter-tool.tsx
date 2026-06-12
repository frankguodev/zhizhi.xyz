"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { ToolPanelButton, ToolPanelHeader, formatFieldMeta, toolFieldClass, toolMonoContentClass, toolPanelHeight } from "./tool-panel";
import { computeTokenTextStats, estimateTokenCount, getTokenModel, tokenModels, type TokenEncoding } from "./tool-token-counter";

type Encoder = { encode: (text: string) => number[]; decode: (tokens: number[]) => string };

// 每个 BPE 编码独立动态 import，按模型选择懒加载、按需 code-split，不进 /tools 首屏。
const encoderLoaders: Record<TokenEncoding, () => Promise<Encoder>> = {
  o200k_base: () => import("gpt-tokenizer/encoding/o200k_base"),
  cl100k_base: () => import("gpt-tokenizer/encoding/cl100k_base"),
  o200k_harmony: () => import("gpt-tokenizer/encoding/o200k_harmony"),
};

// token 过多时不渲染可视化，避免一次铺太多 span 卡顿（数字仍然准确）。
const maxVizTokens = 4000;

// 分词块循环用的底色（accent / amber 为站点 token，其余取 Tailwind 调色板低透明度）。
const tokenBgs = ["bg-accent/18", "bg-amber/22", "bg-sky-500/18", "bg-emerald-500/18", "bg-violet-500/18"];

const sampleText = `认知架构（Cognitive Architecture）让 Agent 拥有记忆与规划能力。
Hello, world! 🌍 一次请求大约 1k tokens。`;

const copy = {
  modelLabel: "模型",
  showTokens: "显示分词",
  inputLabel: "输入文本",
  inputPlaceholder: "粘贴要计数的文本…",
  sample: "示例",
  clear: "清空",
  resultLabel: "统计",
  copyResult: "复制",
  copied: "已复制",
  tokensUnit: "tokens",
  computing: "计算中…",
  exactBadge: "精确",
  estimateBadge: "估算",
  vizLabel: "分词可视化",
  vizTooMany: "分词较多，已隐藏可视化（计数仍准确）。",
  empty: "在左侧粘贴文本，这里显示 token 数与统计。",
  statChars: "字符",
  statWords: "字 / 词",
  statLines: "行",
  statNoSpace: "无空格",
  localOnly: "全部在浏览器本地计算，不上传。",
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function displaySegment(seg: string): string {
  if (seg === "") {
    return "·"; // 罕见的多字节分片，占位以保留 token 边界
  }
  return seg.replace(/\n/g, "↵\n"); // 换行 token：显示符号并保留换行
}

export function TokenCounterTool() {
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState("o200k");
  const [showTokens, setShowTokens] = useState(true);
  const [copied, setCopied] = useState(false);

  const model = getTokenModel(modelId);
  const debounced = useDebouncedValue(input, 200);
  const stats = useMemo(() => computeTokenTextStats(debounced), [debounced]);
  const estimateCount = useMemo(
    () => (model.kind === "estimate" ? estimateTokenCount(debounced, model.charsPerToken ?? 4) : 0),
    [model, debounced],
  );

  const encoderCache = useRef<Map<TokenEncoding, Encoder>>(new Map());
  const [exact, setExact] = useState<{ signature: string; count: number; segments: string[] | null } | null>(null);

  // 签名只看「编码 + 文本」，不含 showTokens——分词数与统计跟「显示分词」无关。否则勾选/取消会触发
  // 重新分词、计数瞬间变「…」再变回，结果框抖一下。分词块照常算好，可视化只在渲染层按 showTokens 开关。
  const exactSignature = JSON.stringify([model.encoding ?? "", debounced]);

  useEffect(() => {
    if (model.kind !== "exact" || !model.encoding) {
      return;
    }
    const encoding = model.encoding;
    const signature = JSON.stringify([encoding, debounced]);
    let cancelled = false;
    void (async () => {
      let encoder = encoderCache.current.get(encoding);
      if (!encoder) {
        encoder = await encoderLoaders[encoding]();
        if (cancelled) {
          return;
        }
        encoderCache.current.set(encoding, encoder);
      }
      const tokens = encoder.encode(debounced);
      if (cancelled) {
        return;
      }
      const segments = tokens.length > 0 && tokens.length <= maxVizTokens ? tokens.map((token) => encoder.decode([token])) : null;
      setExact({ signature, count: tokens.length, segments });
    })();
    return () => {
      cancelled = true;
    };
  }, [model.kind, model.encoding, debounced]);

  const isExact = model.kind === "exact";
  const exactReady = isExact && exact !== null && exact.signature === exactSignature;
  const computing = isExact && !exactReady;
  const count = isExact ? (exactReady ? exact!.count : null) : estimateCount;
  const segments = isExact && exactReady ? exact!.segments : null;
  const tooManyForViz = isExact && exactReady && exact!.count > maxVizTokens;

  async function copyResult() {
    if (count === null) {
      return;
    }
    const summary = `token ${count} · ${copy.statChars} ${stats.characters} · ${copy.statWords} ${stats.words} · ${copy.statLines} ${stats.lines}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted">{copy.modelLabel}</span>
          <Select
            size="sm"
            className="w-56"
            ariaLabel={copy.modelLabel}
            value={modelId}
            onChange={setModelId}
            options={tokenModels.map((item) => ({ label: item.label, value: item.id }))}
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 self-end pb-1.5 text-xs text-muted">
          <input type="checkbox" className="accent-accent" checked={showTokens} onChange={(event) => setShowTokens(event.target.checked)} />
          {copy.showTokens}
        </label>
        <span className="self-end pb-1.5 text-[0.7rem] text-muted/80">{copy.localOnly}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="block">
          <ToolPanelHeader
            label={copy.inputLabel}
            meta={formatFieldMeta(input)}
            actions={
              <>
                <ToolPanelButton onClick={() => setInput(sampleText)}>{copy.sample}</ToolPanelButton>
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

        <div className="block">
          <ToolPanelHeader
            label={copy.resultLabel}
            actions={count !== null ? <ToolPanelButton icon={copied ? Check : Copy} onClick={copyResult}>{copied ? copy.copied : copy.copyResult}</ToolPanelButton> : null}
          />
          {input.trim() === "" ? (
            <p className={`${toolPanelHeight("large")} flex items-center justify-center rounded-md border border-dashed border-line px-4 text-center text-sm text-muted`}>{copy.empty}</p>
          ) : (
            <div className={`${toolPanelHeight("large")} flex flex-col gap-4 overflow-auto rounded-md border border-line bg-paper/88 p-4 shadow-inner`}>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums text-accent">{computing ? "…" : count?.toLocaleString()}</span>
                  <span className="text-sm font-semibold text-muted">{copy.tokensUnit}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.7rem] font-semibold ${isExact ? "bg-emerald-500/15 text-emerald-600" : "bg-amber/20 text-amber"}`}>
                    {isExact ? `${copy.exactBadge} · ${model.encoding}` : copy.estimateBadge}
                  </span>
                </div>
                {model.note ? <p className="mt-1.5 text-xs leading-5 text-muted">{model.note}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: copy.statChars, value: stats.characters },
                  { label: copy.statWords, value: stats.words },
                  { label: copy.statLines, value: stats.lines },
                  { label: copy.statNoSpace, value: stats.charactersNoSpaces },
                ].map((item) => (
                  <div key={item.label} className="rounded-md border border-line bg-background/54 px-3 py-2">
                    <div className="text-[0.68rem] font-semibold uppercase text-muted">{item.label}</div>
                    <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{item.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showTokens && segments && segments.length > 0 ? (
        <div className="block">
          <ToolPanelHeader label={`${copy.vizLabel} · ${segments.length}`} />
          <div className={`${toolPanelHeight("medium")} overflow-auto rounded-md border border-line bg-paper/88 p-3.5 shadow-inner`}>
            <div className={`whitespace-pre-wrap break-words ${toolMonoContentClass} text-foreground`}>
              {segments.map((seg, index) => (
                <span key={index} className={`rounded-[2px] ${tokenBgs[index % tokenBgs.length]}`}>
                  {displaySegment(seg)}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : showTokens && tooManyForViz ? (
        <p className="text-xs text-muted">{copy.vizTooMany}</p>
      ) : null}
    </div>
  );
}
