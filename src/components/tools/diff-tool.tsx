"use client";

import { ArrowRightLeft, Check, Copy, FileDiff, Trash2, UnfoldVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { computeDiff, createUnifiedPatch, type DiffGranularity, type DiffRow, type DiffSegment } from "./tool-diff";
import { ToolPanelButton, ToolPanelHeader, formatFieldMeta, toolFieldClass, toolPanelHeight } from "./tool-panel";

// C4：对输入做去抖，避免大文本每次按键都同步重算 diff 造成卡顿。
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// C2：把空白字符渲染成可见标记（仅用于改动片段，避免正文噪声）。
function visualizeWhitespace(value: string): string {
  return value.replace(/\t/g, "→").replace(/ /g, "·");
}

const sampleLeft = `function greet(name) {
  console.log("hello " + name);
  return name;
}`;

const sampleRight = `function greet(name, greeting) {
  console.log(greeting + " " + name);
  return name.trim();
}`;

const copy = {
  leftLabel: "原始文本",
  rightLabel: "修改后文本",
  leftPlaceholder: "粘贴原始文本或代码…",
  rightPlaceholder: "粘贴修改后的文本或代码…",
  ignoreWhitespace: "忽略空白",
  ignoreCase: "忽略大小写",
  showWhitespace: "显示空白",
  wordLevel: "词级",
  charLevel: "字符级",
  splitView: "并排",
  unifiedView: "统一",
  sample: "示例",
  swap: "交换两侧",
  clear: "清空",
  result: "差异对照",
  identical: "两侧内容完全一致。",
  empty: "在上方粘贴两段文本，下面会按行显示差异，改动行内的不同字词会高亮。",
  copyResult: "复制为文本",
  copyPatch: "复制为补丁",
  copied: "已复制",
};

type ViewMode = "split" | "unified";

type DisplayItem = { kind: "row"; row: DiffRow } | { kind: "gap"; id: number; rows: DiffRow[] };

const collapseContext = 3;
const collapseMinHidden = 2;

// B6：把连续未变化的长段折叠，只在改动附近保留少量上下文行。
function buildDisplayItems(rows: DiffRow[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  let gapId = 0;
  let i = 0;
  while (i < rows.length) {
    if (rows[i].type !== "equal") {
      items.push({ kind: "row", row: rows[i] });
      i += 1;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j].type === "equal") {
      j += 1;
    }
    const run = rows.slice(i, j);
    const headKeep = i === 0 ? 0 : collapseContext;
    const tailKeep = j === rows.length ? 0 : collapseContext;
    const hidden = run.length - headKeep - tailKeep;
    if (hidden >= collapseMinHidden) {
      for (let k = 0; k < headKeep; k += 1) {
        items.push({ kind: "row", row: run[k] });
      }
      items.push({ kind: "gap", id: gapId, rows: run.slice(headKeep, run.length - tailKeep) });
      gapId += 1;
      for (let k = run.length - tailKeep; k < run.length; k += 1) {
        items.push({ kind: "row", row: run[k] });
      }
    } else {
      for (const row of run) {
        items.push({ kind: "row", row });
      }
    }
    i = j;
  }
  return items;
}

function segmentClassName(kind: DiffSegment["kind"]): string {
  if (kind === "added") {
    return "rounded-[2px] bg-[color-mix(in_srgb,#2ea043_30%,transparent)]";
  }
  if (kind === "removed") {
    return "rounded-[2px] bg-[color-mix(in_srgb,#f85149_30%,transparent)]";
  }
  return "";
}

function cellToneClassName(type: DiffRow["type"], side: "left" | "right"): string {
  if (type === "equal") {
    return "";
  }
  if (type === "modified") {
    return "bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]";
  }
  if (type === "removed") {
    return side === "left" ? "bg-[color-mix(in_srgb,#f85149_12%,transparent)]" : "bg-surface/40";
  }
  return side === "right" ? "bg-[color-mix(in_srgb,#2ea043_12%,transparent)]" : "bg-surface/40";
}

// B4：除颜色外的符号标记（色盲也能辨别）。
const removedSignClass = "text-[color-mix(in_srgb,#f85149_85%,var(--foreground))]";
const addedSignClass = "text-[color-mix(in_srgb,#2ea043_85%,var(--foreground))]";

function sideSign(type: DiffRow["type"], side: "left" | "right"): { ch: string; cls: string } | null {
  if (side === "left" && (type === "removed" || type === "modified")) {
    return { ch: "-", cls: removedSignClass };
  }
  if (side === "right" && (type === "added" || type === "modified")) {
    return { ch: "+", cls: addedSignClass };
  }
  return null;
}

function renderSegments(segments: DiffSegment[], showWhitespace: boolean) {
  if (segments.length === 0) {
    return <span className="text-muted/50"> </span>;
  }
  return segments.map((segment, index) => {
    const display = showWhitespace && segment.kind !== "equal" ? visualizeWhitespace(segment.value) : segment.value;
    return (
      <span key={index} className={segmentClassName(segment.kind)}>
        {display || " "}
      </span>
    );
  });
}

function SideCell({ row, side, showWhitespace }: { row: DiffRow; side: "left" | "right"; showWhitespace: boolean }) {
  const segments = side === "left" ? row.leftSegments : row.rightSegments;
  const sign = sideSign(row.type, side);
  return (
    <div className={`flex gap-1 whitespace-pre-wrap break-words px-2 ${cellToneClassName(row.type, side)}`}>
      <span className={`w-2 shrink-0 select-none ${sign ? sign.cls : ""}`}>{sign ? sign.ch : " "}</span>
      <span className="min-w-0 flex-1">{renderSegments(segments, showWhitespace)}</span>
    </div>
  );
}

// 统一视图：modified 拆成「删除行 + 新增行」两行。
type UnifiedLine = { num: number | null; sign: string; signCls: string; bgCls: string; segments: DiffSegment[] };

function unifiedLines(row: DiffRow): UnifiedLine[] {
  if (row.type === "equal") {
    return [{ num: row.rightLineNumber, sign: " ", signCls: "", bgCls: "", segments: row.leftSegments }];
  }
  if (row.type === "removed") {
    return [{ num: row.leftLineNumber, sign: "-", signCls: removedSignClass, bgCls: "bg-[color-mix(in_srgb,#f85149_12%,transparent)]", segments: row.leftSegments }];
  }
  if (row.type === "added") {
    return [{ num: row.rightLineNumber, sign: "+", signCls: addedSignClass, bgCls: "bg-[color-mix(in_srgb,#2ea043_12%,transparent)]", segments: row.rightSegments }];
  }
  return [
    { num: row.leftLineNumber, sign: "-", signCls: removedSignClass, bgCls: "bg-[color-mix(in_srgb,#f85149_12%,transparent)]", segments: row.leftSegments },
    { num: row.rightLineNumber, sign: "+", signCls: addedSignClass, bgCls: "bg-[color-mix(in_srgb,#2ea043_12%,transparent)]", segments: row.rightSegments },
  ];
}

function diffToText(rows: DiffRow[]): string {
  return rows
    .map((row) => {
      const left = row.leftSegments.map((segment) => segment.value).join("");
      const right = row.rightSegments.map((segment) => segment.value).join("");
      if (row.type === "equal") return `  ${left}`;
      if (row.type === "removed") return `- ${left}`;
      if (row.type === "added") return `+ ${right}`;
      return `- ${left}\n+ ${right}`;
    })
    .join("\n");
}

function DiffResultView({ rows, viewMode, showWhitespace }: { rows: DiffRow[]; viewMode: ViewMode; showWhitespace: boolean }) {
  const displayItems = useMemo(() => buildDisplayItems(rows), [rows]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // render 期重置：rows 引用变化（每次重新 diff 都是新数组）时清空已展开的折叠块，避免 effect。
  const [prevRows, setPrevRows] = useState(rows);
  if (prevRows !== rows) {
    setPrevRows(rows);
    setExpanded(new Set());
  }

  function expandGap(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  const gapBar = (item: Extract<DisplayItem, { kind: "gap" }>) => (
    <button
      key={`gap-${item.id}`}
      type="button"
      className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-b border-line/60 bg-surface/40 px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-accent/8 hover:text-accent"
      onClick={() => expandGap(item.id)}
    >
      <UnfoldVertical className="h-3.5 w-3.5" />
      展开 {item.rows.length} 行未变化
    </button>
  );

  if (viewMode === "split") {
    return (
      <div className="overflow-x-auto rounded-md border border-line">
        {/* 并排视图给最小宽度，窄屏改为横向滚动，避免两列代码被挤变形。 */}
        <div className="min-w-[40rem] font-mono text-xs leading-6">
          {displayItems.map((item, index) =>
            item.kind === "gap" && !expanded.has(item.id)
              ? gapBar(item)
              : (item.kind === "gap" ? item.rows : [item.row]).map((row, rowIndex) => (
                  <div key={`${index}-${rowIndex}`} className="grid grid-cols-[3rem_minmax(0,1fr)_3rem_minmax(0,1fr)] border-b border-line/60 last:border-b-0">
                    <div className="select-none border-r border-line/60 px-2 text-right text-muted/60">{row.leftLineNumber ?? ""}</div>
                    <SideCell row={row} side="left" showWhitespace={showWhitespace} />
                    <div className="select-none border-l border-r border-line/60 px-2 text-right text-muted/60">{row.rightLineNumber ?? ""}</div>
                    <SideCell row={row} side="right" showWhitespace={showWhitespace} />
                  </div>
                )),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <div className="min-w-full font-mono text-xs leading-6">
        {displayItems.map((item, index) =>
          item.kind === "gap" && !expanded.has(item.id)
            ? gapBar(item)
            : (item.kind === "gap" ? item.rows : [item.row]).flatMap((row, rowIndex) =>
                unifiedLines(row).map((line, lineIndex) => (
                  <div key={`${index}-${rowIndex}-${lineIndex}`} className={`grid grid-cols-[3rem_1.25rem_minmax(0,1fr)] border-b border-line/60 last:border-b-0 ${line.bgCls}`}>
                    <div className="select-none border-r border-line/60 px-2 text-right text-muted/60">{line.num ?? ""}</div>
                    <div className={`select-none text-center ${line.signCls}`}>{line.sign}</div>
                    <div className="whitespace-pre-wrap break-words px-2">{renderSegments(line.segments, showWhitespace)}</div>
                  </div>
                )),
              ),
        )}
      </div>
    </div>
  );
}

export function DiffTool() {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [granularity, setGranularity] = useState<DiffGranularity>("word");
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

  const debouncedLeft = useDebouncedValue(leftText, 200);
  const debouncedRight = useDebouncedValue(rightText, 200);

  const result = useMemo(
    () => computeDiff(debouncedLeft, debouncedRight, { ignoreWhitespace, ignoreCase, granularity }),
    [debouncedLeft, debouncedRight, ignoreWhitespace, ignoreCase, granularity],
  );

  const hasInput = leftText.trim().length > 0 || rightText.trim().length > 0;
  const hasChanges = result.addedLines > 0 || result.removedLines > 0 || result.modifiedLines > 0;

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(diffToText(result.rows));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function copyPatch() {
    try {
      await navigator.clipboard.writeText(createUnifiedPatch(debouncedLeft, debouncedRight));
      setCopiedPatch(true);
      setTimeout(() => setCopiedPatch(false), 1500);
    } catch {
      setCopiedPatch(false);
    }
  }

  function loadSample() {
    setLeftText(sampleLeft);
    setRightText(sampleRight);
  }

  function swapSides() {
    setLeftText(rightText);
    setRightText(leftText);
  }

  function clearAll() {
    setLeftText("");
    setRightText("");
  }

  const toggleButtonClass = (active: boolean) =>
    `inline-flex h-8 cursor-pointer items-center px-3 text-xs font-semibold transition ${active ? "bg-accent/12 text-accent" : "text-muted hover:text-accent"}`;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="accent-accent" checked={ignoreWhitespace} onChange={(event) => setIgnoreWhitespace(event.target.checked)} />
          {copy.ignoreWhitespace}
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="accent-accent" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} />
          {copy.ignoreCase}
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="accent-accent" checked={showWhitespace} onChange={(event) => setShowWhitespace(event.target.checked)} />
          {copy.showWhitespace}
        </label>

        <div className="inline-flex overflow-hidden rounded-md border border-line">
          <button type="button" className={toggleButtonClass(viewMode === "split")} onClick={() => setViewMode("split")}>
            {copy.splitView}
          </button>
          <button type="button" className={`border-l border-line ${toggleButtonClass(viewMode === "unified")}`} onClick={() => setViewMode("unified")}>
            {copy.unifiedView}
          </button>
        </div>

        <div className="inline-flex overflow-hidden rounded-md border border-line">
          <button type="button" className={toggleButtonClass(granularity === "word")} onClick={() => setGranularity("word")}>
            {copy.wordLevel}
          </button>
          <button type="button" className={`border-l border-line ${toggleButtonClass(granularity === "char")}`} onClick={() => setGranularity("char")}>
            {copy.charLevel}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasChanges ? (
            <span className="text-xs font-semibold text-muted">
              <span className="text-[color-mix(in_srgb,#2ea043_80%,var(--foreground))]">+{result.addedLines}</span>{" "}
              <span className="text-[color-mix(in_srgb,#f85149_80%,var(--foreground))]">-{result.removedLines}</span>{" "}
              <span className="text-accent">~{result.modifiedLines}</span>
            </span>
          ) : null}
          <button type="button" className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 text-xs font-semibold text-muted transition hover:border-accent/35 hover:text-accent" onClick={loadSample}>
            {copy.sample}
          </button>
          <button type="button" className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 text-xs font-semibold text-muted transition hover:border-accent/35 hover:text-accent" onClick={swapSides}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {copy.swap}
          </button>
          <button type="button" className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 text-xs font-semibold text-muted transition hover:border-accent/35 hover:text-accent" onClick={clearAll}>
            <Trash2 className="h-3.5 w-3.5" />
            {copy.clear}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="block">
          <ToolPanelHeader label={copy.leftLabel} meta={formatFieldMeta(leftText)} />
          <textarea
            className={`${toolPanelHeight("compact")} resize-y ${toolFieldClass}`}
            value={leftText}
            placeholder={copy.leftPlaceholder}
            spellCheck={false}
            onChange={(event) => setLeftText(event.target.value)}
          />
        </div>
        <div className="block">
          <ToolPanelHeader label={copy.rightLabel} meta={formatFieldMeta(rightText)} />
          <textarea
            className={`${toolPanelHeight("compact")} resize-y ${toolFieldClass}`}
            value={rightText}
            placeholder={copy.rightPlaceholder}
            spellCheck={false}
            onChange={(event) => setRightText(event.target.value)}
          />
        </div>
      </div>

      <div className="block">
        <ToolPanelHeader
          label={copy.result}
          actions={
            result.rows.length > 0 ? (
              <>
                <ToolPanelButton icon={copied ? Check : Copy} onClick={copyResult}>{copied ? copy.copied : copy.copyResult}</ToolPanelButton>
                <ToolPanelButton icon={copiedPatch ? Check : FileDiff} onClick={copyPatch}>{copiedPatch ? copy.copied : copy.copyPatch}</ToolPanelButton>
              </>
            ) : null
          }
        />
        {result.error ? (
          <p className="rounded-md border border-line bg-surface/40 px-4 py-8 text-center text-sm font-semibold text-amber" role="alert">{result.error}</p>
        ) : !hasInput ? (
          <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{copy.empty}</p>
        ) : result.identical ? (
          <p className="rounded-md border border-line bg-surface/40 px-4 py-8 text-center text-sm text-muted">{copy.identical}</p>
        ) : (
          <DiffResultView rows={result.rows} viewMode={viewMode} showWhitespace={showWhitespace} />
        )}
      </div>
    </div>
  );
}
