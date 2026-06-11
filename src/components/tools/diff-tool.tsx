"use client";

import { Check, ChevronDown, ChevronUp, Copy, Download, FileDiff, MoreHorizontal, Trash2, UnfoldVertical } from "lucide-react";
import type { ComponentType, UIEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  more: "更多",
  result: "差异对照",
  identical: "两侧内容完全一致。",
  empty: "在上方粘贴两段文本，下面会按行显示差异，改动行内的不同字词会高亮。",
  copyResult: "复制为文本",
  copyPatch: "复制为补丁",
  downloadPatch: "下载补丁",
  downloadResult: "下载文本 Diff",
  largeInput: "大文本对比可能需要几秒",
  nearLimit: "接近单侧 200,000 字符上限",
  copied: "已复制",
  copiedPatch: "已复制 Patch",
  copiedResult: "已复制文本 Diff",
  collapseAll: "折叠全部",
  contextLines: "上下文",
  expandAll: "展开全部",
  nextChange: "下一个",
  previousChange: "上一个",
};

type ViewMode = "split" | "unified";

type DisplayItem = { kind: "row"; row: DiffRow } | { kind: "gap"; id: number; rows: DiffRow[] };

type DiffMenuItem = {
  active?: boolean;
  icon?: ComponentType<{ className?: string }>;
  key: string;
  label: string;
  onClick: () => void;
};

type ContextLines = 3 | 5 | 10;

const collapseMinHidden = 2;
const largeDiffInputLength = 80_000;
const nearDiffInputLimit = 180_000;

// B6：把连续未变化的长段折叠，只在改动附近保留少量上下文行。
function buildDisplayItems(rows: DiffRow[], contextLines: ContextLines): DisplayItem[] {
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
    const headKeep = i === 0 ? 0 : contextLines;
    const tailKeep = j === rows.length ? 0 : contextLines;
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

function downloadTextFile(filename: string, body: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function DiffOverflowMenu({ items, label = copy.more }: { items: DiffMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${
          open ? "bg-accent/12 text-accent" : "bg-accent/6 text-muted hover:bg-accent/10 hover:text-accent"
        }`}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[8.5rem] max-w-[calc(100vw-2rem)] rounded-md border border-line bg-paper p-1 shadow-[var(--shadow-quiet)]" role="menu">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-left text-xs font-semibold leading-5 whitespace-nowrap transition hover:bg-accent/8 hover:text-accent focus-visible:outline-none focus-visible:bg-accent/8 ${
                  item.active ? "bg-accent/8 text-accent" : "text-muted"
                }`}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
              >
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DiffSummary({ rows, result }: { rows: DiffRow[]; result: ReturnType<typeof computeDiff> }) {
  const unchanged = rows.reduce((count, row) => count + (row.type === "equal" ? 1 : 0), 0);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-[color-mix(in_srgb,#2ea043_80%,var(--foreground))]">新增 {result.addedLines}</span>
      <span className="text-[color-mix(in_srgb,#f85149_80%,var(--foreground))]">删除 {result.removedLines}</span>
      <span className="text-accent">修改 {result.modifiedLines}</span>
      <span>未变化 {unchanged}</span>
    </span>
  );
}

function DiffResultMeta({ inputSizeHint, rows, result }: { inputSizeHint: string; rows: DiffRow[]; result: ReturnType<typeof computeDiff> }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <DiffSummary rows={rows} result={result} />
      {inputSizeHint ? <span className="text-amber">{inputSizeHint}</span> : null}
    </span>
  );
}

function DiffResultView({
  activeChangeIndex,
  collapseAllToken,
  contextLines,
  expandAllToken,
  rows,
  showWhitespace,
  viewMode,
}: {
  activeChangeIndex: number;
  collapseAllToken: number;
  contextLines: ContextLines;
  expandAllToken: number;
  rows: DiffRow[];
  showWhitespace: boolean;
  viewMode: ViewMode;
}) {
  const displayItems = useMemo(() => buildDisplayItems(rows, contextLines), [contextLines, rows]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // render 期重置：rows 引用变化（每次重新 diff 都是新数组）时清空已展开的折叠块，避免 effect。
  const [prevRows, setPrevRows] = useState(rows);
  const [prevContextLines, setPrevContextLines] = useState(contextLines);
  if (prevRows !== rows || prevContextLines !== contextLines) {
    setPrevRows(rows);
    setPrevContextLines(contextLines);
    setExpanded(new Set());
  }

  const [prevExpandAllToken, setPrevExpandAllToken] = useState(expandAllToken);
  if (prevExpandAllToken !== expandAllToken) {
    setPrevExpandAllToken(expandAllToken);
    setExpanded(new Set(displayItems.filter((item): item is Extract<DisplayItem, { kind: "gap" }> => item.kind === "gap").map((item) => item.id)));
  }

  const [prevCollapseAllToken, setPrevCollapseAllToken] = useState(collapseAllToken);
  if (prevCollapseAllToken !== collapseAllToken) {
    setPrevCollapseAllToken(collapseAllToken);
    setExpanded(new Set());
  }
  let changeIndex = -1;

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
        <div className="min-w-[40rem] font-mono text-[0.875rem] leading-7 min-[1920px]:text-[1rem] min-[1920px]:leading-8">
          {displayItems.map((item, index) =>
            item.kind === "gap" && !expanded.has(item.id)
              ? gapBar(item)
              : (item.kind === "gap" ? item.rows : [item.row]).map((row, rowIndex) => {
                  const rowChangeIndex = row.type === "equal" ? -1 : (changeIndex += 1);
                  const active = rowChangeIndex === activeChangeIndex;
                  return (
                    <div
                      key={`${index}-${rowIndex}`}
                      data-diff-change={row.type !== "equal" ? "true" : undefined}
                      data-diff-active={active ? "true" : undefined}
                      className={`grid grid-cols-[3rem_minmax(0,1fr)_3rem_minmax(0,1fr)] border-b border-line/60 last:border-b-0 ${
                        active ? "outline outline-2 -outline-offset-2 outline-accent/55 ring-2 ring-accent/12" : ""
                      }`}
                    >
                      <div className="select-none border-r border-line/60 px-2 text-right text-muted/60">{row.leftLineNumber ?? ""}</div>
                      <SideCell row={row} side="left" showWhitespace={showWhitespace} />
                      <div className="select-none border-l border-r border-line/60 px-2 text-right text-muted/60">{row.rightLineNumber ?? ""}</div>
                      <SideCell row={row} side="right" showWhitespace={showWhitespace} />
                    </div>
                  );
                }),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <div className="min-w-full font-mono text-[0.875rem] leading-7 min-[1920px]:text-[1rem] min-[1920px]:leading-8">
        {displayItems.map((item, index) =>
          item.kind === "gap" && !expanded.has(item.id)
            ? gapBar(item)
            : (item.kind === "gap" ? item.rows : [item.row]).flatMap((row, rowIndex) => {
                const rowChangeIndex = row.type === "equal" ? -1 : (changeIndex += 1);
                const active = rowChangeIndex === activeChangeIndex;
                return unifiedLines(row).map((line, lineIndex) => (
                  <div
                    key={`${index}-${rowIndex}-${lineIndex}`}
                    data-diff-change={row.type !== "equal" && lineIndex === 0 ? "true" : undefined}
                    data-diff-active={active ? "true" : undefined}
                    className={`grid grid-cols-[3rem_1.25rem_minmax(0,1fr)] border-b border-line/60 last:border-b-0 ${line.bgCls} ${
                      active ? "outline outline-2 -outline-offset-2 outline-accent/55 ring-2 ring-accent/12" : ""
                    }`}
                  >
                    <div className="select-none border-r border-line/60 px-2 text-right text-muted/60">{line.num ?? ""}</div>
                    <div className={`select-none text-center ${line.signCls}`}>{line.sign}</div>
                    <div className="whitespace-pre-wrap break-words px-2">{renderSegments(line.segments, showWhitespace)}</div>
                  </div>
                ));
              }),
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
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [activeChangeIndex, setActiveChangeIndex] = useState(-1);
  const [collapseAllToken, setCollapseAllToken] = useState(0);
  const [contextLines, setContextLines] = useState<ContextLines>(3);
  const [expandAllToken, setExpandAllToken] = useState(0);
  const leftInputRef = useRef<HTMLTextAreaElement | null>(null);
  const rightInputRef = useRef<HTMLTextAreaElement | null>(null);
  const syncingInputScroll = useRef(false);
  const largestInputLength = Math.max(leftText.length, rightText.length);

  const debouncedLeft = useDebouncedValue(leftText, 200);
  const debouncedRight = useDebouncedValue(rightText, 200);

  const result = useMemo(
    () => computeDiff(debouncedLeft, debouncedRight, { ignoreWhitespace, ignoreCase, granularity }),
    [debouncedLeft, debouncedRight, ignoreWhitespace, ignoreCase, granularity],
  );

  const hasInput = leftText.trim().length > 0 || rightText.trim().length > 0;
  const inputSizeHint = largestInputLength >= nearDiffInputLimit ? copy.nearLimit : largestInputLength >= largeDiffInputLength ? copy.largeInput : "";
  const changeCount = result.rows.reduce((count, row) => count + (row.type === "equal" ? 0 : 1), 0);
  const [prevNavigationRows, setPrevNavigationRows] = useState(result.rows);
  if (prevNavigationRows !== result.rows) {
    setPrevNavigationRows(result.rows);
    setActiveChangeIndex(-1);
  }

  async function copyInput(value: string, side: "left" | "right") {
    try {
      await navigator.clipboard.writeText(value);
      if (side === "left") {
        setCopiedLeft(true);
        setTimeout(() => setCopiedLeft(false), 1500);
      } else {
        setCopiedRight(true);
        setTimeout(() => setCopiedRight(false), 1500);
      }
    } catch {
      setCopiedLeft(false);
      setCopiedRight(false);
    }
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(diffToText(result.rows));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function downloadResult() {
    downloadTextFile("diff-result.txt", diffToText(result.rows));
  }

  function downloadPatch() {
    downloadTextFile("changes.patch", createUnifiedPatch(debouncedLeft, debouncedRight), "text/x-diff;charset=utf-8");
  }

  function jumpChange(direction: "next" | "previous") {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-diff-change='true']"));
    if (nodes.length === 0) {
      setActiveChangeIndex(-1);
      return;
    }
    const offset = direction === "next" ? 1 : -1;
    const fallback = direction === "next" ? 0 : nodes.length - 1;
    const nextIndex = activeChangeIndex < 0 ? fallback : (activeChangeIndex + offset + nodes.length) % nodes.length;
    setActiveChangeIndex(nextIndex);
    nodes[nextIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function syncInputScroll(source: "left" | "right", event: UIEvent<HTMLTextAreaElement>) {
    if (syncingInputScroll.current) {
      syncingInputScroll.current = false;
      return;
    }
    const target = source === "left" ? rightInputRef.current : leftInputRef.current;
    if (!target) {
      return;
    }
    syncingInputScroll.current = true;
    target.scrollTop = event.currentTarget.scrollTop;
    target.scrollLeft = event.currentTarget.scrollLeft;
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

  function clearLeft() {
    setLeftText("");
  }

  function clearRight() {
    setRightText("");
  }

  const toggleButtonClass = (active: boolean) =>
    `inline-flex h-8 cursor-pointer items-center px-3 text-xs font-semibold transition ${active ? "bg-accent/12 text-accent" : "text-muted hover:text-accent"}`;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
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
          <DiffOverflowMenu
            items={[
              { key: "sample", label: copy.sample, onClick: loadSample },
              { key: "swap", label: copy.swap, onClick: swapSides },
              { key: "clear", label: copy.clear, icon: Trash2, onClick: clearAll },
              { key: "ignoreWhitespace", label: ignoreWhitespace ? `${copy.ignoreWhitespace} ✓` : copy.ignoreWhitespace, active: ignoreWhitespace, onClick: () => setIgnoreWhitespace(!ignoreWhitespace) },
              { key: "ignoreCase", label: ignoreCase ? `${copy.ignoreCase} ✓` : copy.ignoreCase, active: ignoreCase, onClick: () => setIgnoreCase(!ignoreCase) },
              { key: "showWhitespace", label: showWhitespace ? `${copy.showWhitespace} ✓` : copy.showWhitespace, active: showWhitespace, onClick: () => setShowWhitespace(!showWhitespace) },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="block">
          <ToolPanelHeader
            label={copy.leftLabel}
            meta={formatFieldMeta(leftText)}
            actions={
              <>
                <ToolPanelButton icon={copiedLeft ? Check : Copy} onClick={() => copyInput(leftText, "left")}>{copiedLeft ? copy.copied : "复制"}</ToolPanelButton>
                <DiffOverflowMenu items={[{ key: "clearLeft", label: copy.clear, icon: Trash2, onClick: clearLeft }]} />
              </>
            }
          />
          <textarea
            ref={leftInputRef}
            className={`${toolPanelHeight("compact")} resize-y ${toolFieldClass}`}
            value={leftText}
            placeholder={copy.leftPlaceholder}
            spellCheck={false}
            onChange={(event) => setLeftText(event.target.value)}
            onScroll={(event) => syncInputScroll("left", event)}
          />
        </div>
        <div className="block">
          <ToolPanelHeader
            label={copy.rightLabel}
            meta={formatFieldMeta(rightText)}
            actions={
              <>
                <ToolPanelButton icon={copiedRight ? Check : Copy} onClick={() => copyInput(rightText, "right")}>{copiedRight ? copy.copied : "复制"}</ToolPanelButton>
                <DiffOverflowMenu items={[{ key: "clearRight", label: copy.clear, icon: Trash2, onClick: clearRight }]} />
              </>
            }
          />
          <textarea
            ref={rightInputRef}
            className={`${toolPanelHeight("compact")} resize-y ${toolFieldClass}`}
            value={rightText}
            placeholder={copy.rightPlaceholder}
            spellCheck={false}
            onChange={(event) => setRightText(event.target.value)}
            onScroll={(event) => syncInputScroll("right", event)}
          />
        </div>
      </div>

      <div className="block">
        <ToolPanelHeader
          label={copy.result}
          className="sticky top-0 z-20 bg-paper/95 py-1 backdrop-blur"
          meta={hasInput && !result.error && !result.identical ? <DiffResultMeta inputSizeHint={inputSizeHint} rows={result.rows} result={result} /> : inputSizeHint || undefined}
          actions={
            result.rows.length > 0 ? (
              <>
                <span className="min-w-[3.5rem] text-center text-[0.7rem] font-semibold text-muted">{changeCount > 0 && activeChangeIndex >= 0 ? `${activeChangeIndex + 1} / ${changeCount}` : `0 / ${changeCount}`}</span>
                <ToolPanelButton icon={ChevronUp} disabled={changeCount === 0} onClick={() => jumpChange("previous")}>{copy.previousChange}</ToolPanelButton>
                <ToolPanelButton icon={ChevronDown} disabled={changeCount === 0} onClick={() => jumpChange("next")}>{copy.nextChange}</ToolPanelButton>
                <ToolPanelButton icon={copied ? Check : Copy} onClick={copyResult}>{copied ? copy.copiedResult : copy.copyResult}</ToolPanelButton>
                <ToolPanelButton icon={copiedPatch ? Check : FileDiff} onClick={copyPatch}>{copiedPatch ? copy.copiedPatch : copy.copyPatch}</ToolPanelButton>
                <DiffOverflowMenu
                  items={[
                    { key: "expandAll", label: copy.expandAll, icon: UnfoldVertical, onClick: () => setExpandAllToken((value) => value + 1) },
                    { key: "collapseAll", label: copy.collapseAll, onClick: () => setCollapseAllToken((value) => value + 1) },
                    { key: "context3", label: `${copy.contextLines} 3 行`, active: contextLines === 3, onClick: () => setContextLines(3) },
                    { key: "context5", label: `${copy.contextLines} 5 行`, active: contextLines === 5, onClick: () => setContextLines(5) },
                    { key: "context10", label: `${copy.contextLines} 10 行`, active: contextLines === 10, onClick: () => setContextLines(10) },
                    { key: "downloadResult", label: copy.downloadResult, icon: Download, onClick: downloadResult },
                    { key: "downloadPatch", label: copy.downloadPatch, icon: Download, onClick: downloadPatch },
                  ]}
                />
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
          <DiffResultView activeChangeIndex={activeChangeIndex} collapseAllToken={collapseAllToken} contextLines={contextLines} expandAllToken={expandAllToken} rows={result.rows} viewMode={viewMode} showWhitespace={showWhitespace} />
        )}
      </div>
    </div>
  );
}
