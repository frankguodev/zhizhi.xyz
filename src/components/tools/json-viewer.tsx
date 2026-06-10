"use client";

import { ChevronDown, ChevronRight, ChevronUp, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { toolMonoContentClass } from "./tool-panel";

type JsonView = "highlight" | "tree" | "text";

// 超过该字符数时关闭高亮视图，避免一次渲染过多 span 卡顿；文本/树形仍可用。
const maxHighlightChars = 200_000;
// 行数过多时不渲染行号槽，避免极端体积下的额外开销。
const maxGutterLines = 50_000;

const tokenColor: Record<string, string> = {
  key: "var(--json-key)",
  string: "var(--json-string)",
  number: "var(--json-number)",
  boolean: "var(--json-boolean)",
  punct: "var(--json-punct)",
};

type HighlightToken = { cls: keyof typeof tokenColor | "plain"; text: string };

// 对“格式良好”的 JSON 文本做轻量 tokenize：字符串区分键/值（看后面是否紧跟冒号）。
function tokenizeForHighlight(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  const pattern = /("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\]:,])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ cls: "plain", text: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      const isKey = /^\s*:/.test(text.slice(pattern.lastIndex));
      tokens.push({ cls: isKey ? "key" : "string", text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ cls: "number", text: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ cls: "boolean", text: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ cls: "punct", text: match[4] });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ cls: "plain", text: text.slice(lastIndex) });
  }

  return tokens;
}

type Match = { start: number; end: number };

// 命中数上限，防止超大文本里常见关键词产生过多 <mark> 卡顿。
const maxMatches = 5000;

// 内容搜索：在文本里逐个找子串（大小写不敏感、字面量匹配，不走正则避免特殊字符干扰）。
function findMatches(text: string, rawQuery: string): Match[] {
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const result: Match[] = [];
  let index = haystack.indexOf(needle);
  while (index !== -1 && result.length < maxMatches) {
    result.push({ start: index, end: index + needle.length });
    index = haystack.indexOf(needle, index + needle.length);
  }
  return result;
}

// 把语法高亮 token（或纯文本单 token）按命中区间切片，命中处包 <mark>，当前命中标 data 属性供滚动定位。
function renderTokensWithSearch(tokens: HighlightToken[], matches: Match[], activeIndex: number): ReactNode {
  const renderPlainToken = (token: HighlightToken, key: number) =>
    token.cls === "plain" ? (
      <Fragment key={key}>{token.text}</Fragment>
    ) : (
      <span key={key} style={{ color: tokenColor[token.cls] }}>
        {token.text}
      </span>
    );

  if (matches.length === 0) {
    return tokens.map((token, index) => renderPlainToken(token, index));
  }

  const nodes: ReactNode[] = [];
  let pos = 0;
  let mi = 0;

  tokens.forEach((token, ti) => {
    const tokenStart = pos;
    const tokenEnd = pos + token.text.length;
    pos = tokenEnd;

    while (mi < matches.length && matches[mi].end <= tokenStart) {
      mi += 1;
    }

    if (mi >= matches.length || matches[mi].start >= tokenEnd) {
      nodes.push(renderPlainToken(token, ti));
      return;
    }

    const color = token.cls === "plain" ? undefined : tokenColor[token.cls];
    const pieces: ReactNode[] = [];
    let local = 0;
    let k = mi;

    while (k < matches.length && matches[k].start < tokenEnd) {
      const sliceStart = Math.max(matches[k].start, tokenStart) - tokenStart;
      const sliceEnd = Math.min(matches[k].end, tokenEnd) - tokenStart;
      if (sliceStart > local) {
        pieces.push(<Fragment key={`b${local}`}>{token.text.slice(local, sliceStart)}</Fragment>);
      }
      const isActive = k === activeIndex;
      pieces.push(
        <mark
          key={`m${k}-${sliceStart}`}
          data-json-active-match={isActive ? "true" : undefined}
          className={`rounded-[2px] ${isActive ? "bg-amber/55 text-foreground ring-1 ring-amber" : "bg-amber/25 text-foreground"}`}
        >
          {token.text.slice(sliceStart, sliceEnd)}
        </mark>,
      );
      local = sliceEnd;
      if (matches[k].end <= tokenEnd) {
        k += 1;
      } else {
        break;
      }
    }

    if (local < token.text.length) {
      pieces.push(<Fragment key={`a${local}`}>{token.text.slice(local)}</Fragment>);
    }

    nodes.push(
      color ? (
        <span key={ti} style={{ color }}>
          {pieces}
        </span>
      ) : (
        <Fragment key={ti}>{pieces}</Fragment>
      ),
    );
  });

  return nodes;
}

// 带行号槽的代码块：行号槽水平 sticky，与内容一起纵向滚动，行号能对上「第 N 行」报错。
function CodeBlock({ text, children }: { text: string; children: ReactNode }) {
  const lineCount = useMemo(() => (text === "" ? 1 : text.split("\n").length), [text]);
  const gutter = useMemo(
    () => (lineCount > maxGutterLines ? null : Array.from({ length: lineCount }, (_, index) => index + 1).join("\n")),
    [lineCount],
  );

  return (
    <div className="flex min-h-full min-w-full">
      {gutter !== null ? (
        <pre
          aria-hidden="true"
          className={`sticky left-0 z-10 shrink-0 select-none border-r border-line/60 bg-paper px-2 py-3.5 text-right ${toolMonoContentClass} text-muted/55`}
        >
          {gutter}
        </pre>
      ) : null}
      <pre className={`grow whitespace-pre px-3.5 py-3.5 ${toolMonoContentClass} text-foreground`}>{children}</pre>
    </div>
  );
}

type JsonStats = { objects: number; arrays: number; keys: number; depth: number };

function computeJsonStats(value: unknown): JsonStats {
  let objects = 0;
  let arrays = 0;
  let keys = 0;
  let depth = 0;

  const walk = (node: unknown, level: number) => {
    if (level > depth) {
      depth = level;
    }
    if (Array.isArray(node)) {
      arrays += 1;
      node.forEach((item) => walk(item, level + 1));
    } else if (node !== null && typeof node === "object") {
      objects += 1;
      const entries = Object.keys(node as Record<string, unknown>);
      keys += entries.length;
      entries.forEach((key) => walk((node as Record<string, unknown>)[key], level + 1));
    }
  };

  walk(value, 0);
  return { objects, arrays, keys, depth };
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return <span style={{ color: tokenColor.string }}>{JSON.stringify(value)}</span>;
  }
  if (typeof value === "number") {
    return <span style={{ color: tokenColor.number }}>{String(value)}</span>;
  }
  if (typeof value === "boolean" || value === null) {
    return <span style={{ color: tokenColor.boolean }}>{String(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

function TreeNode({ name, value, depth }: { name: string | number | null; value: unknown; depth: number }) {
  const isContainer = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < 1);
  const indentStyle: CSSProperties = { paddingLeft: `${depth * 14}px` };
  const keyNode =
    name === null ? null : (
      <span style={{ color: typeof name === "number" ? tokenColor.punct : tokenColor.key }}>
        {typeof name === "number" ? `[${name}]` : JSON.stringify(name)}
      </span>
    );

  if (!isContainer) {
    return (
      <div style={indentStyle} className="whitespace-pre-wrap break-words">
        {keyNode}
        {keyNode ? <span style={{ color: tokenColor.punct }}>{": "}</span> : null}
        <PrimitiveValue value={value} />
      </div>
    );
  }

  const entries: Array<[string | number, unknown]> = Array.isArray(value)
    ? value.map((item, index) => [index, item])
    : Object.entries(value as Record<string, unknown>);
  const summary = Array.isArray(value) ? `Array(${entries.length})` : `Object(${entries.length})`;
  const openBracket = Array.isArray(value) ? "[" : "{";
  const closeBracket = Array.isArray(value) ? "]" : "}";

  return (
    <div>
      <div
        style={indentStyle}
        className="flex cursor-pointer items-center gap-1 rounded transition hover:bg-accent/8"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
      >
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted transition ${open ? "rotate-90" : ""}`} />
        {keyNode}
        {keyNode ? <span style={{ color: tokenColor.punct }}>{": "}</span> : null}
        <span style={{ color: tokenColor.punct }}>{open ? openBracket : `${openBracket} … ${closeBracket}`}</span>
        {open ? null : <span className="ml-1 text-muted/80">{summary}</span>}
      </div>
      {open ? (
        <>
          {entries.map(([childName, childValue]) => (
            <TreeNode key={childName} name={childName} value={childValue} depth={depth + 1} />
          ))}
          <div style={indentStyle} className="pl-[14px]">
            <span style={{ color: tokenColor.punct }}>{closeBracket}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TreeView({ value }: { value: unknown }) {
  return (
    <div className={`min-h-full p-3.5 ${toolMonoContentClass} text-foreground`}>
      <TreeNode name={null} value={value} depth={0} />
    </div>
  );
}

export function JsonViewer({
  value,
  text,
  heightClass,
}: {
  value: unknown;
  text: string;
  heightClass: string;
}) {
  const [view, setView] = useState<JsonView>("highlight");
  const [query, setQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(
    () => (value !== null && typeof value === "object" ? computeJsonStats(value) : null),
    [value],
  );

  const searchable = view !== "tree";
  const matches = useMemo(() => findMatches(text, query), [text, query]);
  const count = matches.length;
  const safeActive = count === 0 ? 0 : Math.min(activeMatch, count - 1);

  const renderNodes = useMemo(() => {
    if (!searchable) {
      return null;
    }
    const tokens: HighlightToken[] =
      view === "highlight" && text.length <= maxHighlightChars ? tokenizeForHighlight(text) : [{ cls: "plain", text }];
    return renderTokensWithSearch(tokens, matches, safeActive);
  }, [searchable, view, text, matches, safeActive]);

  useEffect(() => {
    if (searchable && count > 0) {
      contentRef.current?.querySelector('[data-json-active-match="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [searchable, safeActive, count]);

  // Ctrl/⌘+F 拦掉浏览器原生查找、聚焦站内内容搜索框。仅在 JsonViewer 挂载（即有合法 JSON 结果）期间生效。
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && (event.key === "f" || event.key === "F")) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const views: Array<{ id: JsonView; label: string }> = [
    { id: "highlight", label: "高亮" },
    { id: "tree", label: "树形" },
    { id: "text", label: "文本" },
  ];

  function goToMatch(delta: number) {
    if (count === 0) {
      return;
    }
    setActiveMatch((current) => {
      const base = Math.min(current, count - 1);
      return (base + delta + count) % count;
    });
  }

  return (
    <div className={`flex ${heightClass} flex-col overflow-hidden rounded-md border border-line bg-paper/88 shadow-inner`}>
      {/* 吸顶工具条：视图切换 + 内容搜索 + 统计，作为结果框内部的一条 bar，让结果框外框与左侧输入框对齐。 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line/60 bg-paper/70 px-2 py-1.5">
        <div className="inline-flex shrink-0 rounded-md bg-accent/8 p-0.5">
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={view === item.id}
              className={`h-7 cursor-pointer rounded px-2.5 text-xs font-semibold transition ${
                view === item.id ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"
              }`}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted" />
          <input
            ref={searchInputRef}
            className="h-7 w-full rounded-md border border-line bg-background pl-8 pr-2.5 font-mono text-xs text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/55 focus:ring-2 focus:ring-accent/15"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveMatch(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchable) {
                event.preventDefault();
                goToMatch(event.shiftKey ? -1 : 1);
              } else if (event.key === "Escape") {
                event.currentTarget.blur();
              }
            }}
            placeholder="内容搜索：键名或值…"
            spellCheck={false}
            aria-label="内容搜索"
          />
        </div>
        {query.trim() ? (
          searchable ? (
            <div className="flex shrink-0 items-center gap-1">
              <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted">
                {count === 0 ? "0/0" : `${safeActive + 1}/${count}`}
              </span>
              <button
                type="button"
                aria-label="上一处"
                disabled={count === 0}
                onClick={() => goToMatch(-1)}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-accent/6 text-muted transition hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="下一处"
                disabled={count === 0}
                onClick={() => goToMatch(1)}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-accent/6 text-muted transition hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span className="shrink-0 text-xs text-muted/80">{`${count} 处（切到文本/高亮可定位）`}</span>
          )
        ) : stats ? (
          <span className="shrink-0 text-xs text-muted/80">
            {`对象 ${stats.objects} · 数组 ${stats.arrays} · 键 ${stats.keys} · 最深 ${stats.depth} 层`}
          </span>
        ) : null}
      </div>

      <div ref={contentRef} className="min-h-0 flex-1 overflow-auto">
        {view === "tree" ? (
          <TreeView value={value} />
        ) : (
          <CodeBlock text={text}>{renderNodes}</CodeBlock>
        )}
      </div>
    </div>
  );
}
