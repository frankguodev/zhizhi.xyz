"use client";

import { ChevronRight } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

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

// 带行号槽的代码块：行号槽水平 sticky，与内容一起纵向滚动，行号能对上「第 N 行」报错。
function CodeBlock({ text, children }: { text: string; children: ReactNode }) {
  const lineCount = useMemo(() => (text === "" ? 1 : text.split("\n").length), [text]);
  const gutter = useMemo(
    () => (lineCount > maxGutterLines ? null : Array.from({ length: lineCount }, (_, index) => index + 1).join("\n")),
    [lineCount],
  );

  return (
    <div className="h-full overflow-auto rounded-md border border-line bg-paper/88 shadow-inner">
      <div className="flex min-h-full min-w-full">
        {gutter !== null ? (
          <pre
            aria-hidden="true"
            className="sticky left-0 z-10 shrink-0 select-none border-r border-line/60 bg-paper px-2 py-3.5 text-right font-mono text-[0.8125rem] leading-6 text-muted/55"
          >
            {gutter}
          </pre>
        ) : null}
        <pre className="grow whitespace-pre px-3.5 py-3.5 font-mono text-[0.8125rem] leading-6 text-foreground">{children}</pre>
      </div>
    </div>
  );
}

function HighlightView({ text }: { text: string }) {
  const tokens = useMemo(() => (text.length > maxHighlightChars ? null : tokenizeForHighlight(text)), [text]);

  return (
    <CodeBlock text={text}>
      {tokens
        ? tokens.map((token, index) =>
            token.cls === "plain" ? (
              <Fragment key={index}>{token.text}</Fragment>
            ) : (
              <span key={index} style={{ color: tokenColor[token.cls] }}>
                {token.text}
              </span>
            ),
          )
        : text}
    </CodeBlock>
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
    <div className="h-full overflow-auto rounded-md border border-line bg-paper/88 p-3.5 font-mono text-[0.8125rem] leading-6 text-foreground shadow-inner">
      <TreeNode name={null} value={value} depth={0} />
    </div>
  );
}

type PathSegment = { type: "key"; key: string } | { type: "index"; index: number } | { type: "wildcard" };

function parsePathSegments(path: string): PathSegment[] | null {
  const segments: PathSegment[] = [];
  let index = 0;

  while (index < path.length) {
    const char = path[index];

    if (char === ".") {
      index += 1;
      continue;
    }

    if (char === "[") {
      const close = path.indexOf("]", index);
      if (close === -1) {
        return null;
      }
      const inner = path.slice(index + 1, close).trim();
      if (inner === "*") {
        segments.push({ type: "wildcard" });
      } else if (/^\d+$/.test(inner)) {
        segments.push({ type: "index", index: Number(inner) });
      } else if (/^"(.*)"$/.test(inner) || /^'(.*)'$/.test(inner)) {
        segments.push({ type: "key", key: inner.slice(1, -1) });
      } else {
        return null;
      }
      index = close + 1;
      continue;
    }

    if (char === "*") {
      segments.push({ type: "wildcard" });
      index += 1;
      continue;
    }

    const bareKey = /^[^.[]+/.exec(path.slice(index));
    if (!bareKey) {
      return null;
    }
    segments.push({ type: "key", key: bareKey[0] });
    index += bareKey[0].length;
  }

  return segments.length ? segments : null;
}

export function evaluateJsonPath(root: unknown, rawPath: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const path = rawPath.trim().replace(/^\$/, "").replace(/^\./, "");
  if (!path) {
    return { ok: true, value: root };
  }

  const segments = parsePathSegments(path);
  if (!segments) {
    return { ok: false, error: "路径语法无效，示例：data.items[0].name 或 users[*].id" };
  }

  let current: unknown[] = [root];
  let wildcardUsed = false;

  for (const segment of segments) {
    const next: unknown[] = [];
    for (const node of current) {
      if (segment.type === "wildcard") {
        if (Array.isArray(node)) {
          next.push(...node);
        } else if (node !== null && typeof node === "object") {
          next.push(...Object.values(node as Record<string, unknown>));
        } else {
          return { ok: false, error: "[*] 只能用于数组或对象" };
        }
      } else if (segment.type === "index") {
        if (Array.isArray(node) && segment.index < node.length) {
          next.push(node[segment.index]);
        } else {
          return { ok: false, error: `索引 [${segment.index}] 越界，或目标不是数组` };
        }
      } else if (node !== null && typeof node === "object" && !Array.isArray(node) && segment.key in (node as Record<string, unknown>)) {
        next.push((node as Record<string, unknown>)[segment.key]);
      } else {
        return { ok: false, error: `找不到键「${segment.key}」` };
      }
    }
    wildcardUsed = wildcardUsed || segment.type === "wildcard";
    current = next;
  }

  return { ok: true, value: wildcardUsed ? current : current[0] };
}

export function JsonViewer({
  value,
  text,
  indent,
  heightClass,
}: {
  value: unknown;
  text: string;
  indent: number;
  heightClass: string;
}) {
  const [view, setView] = useState<JsonView>("highlight");
  const [path, setPath] = useState("");

  const result = useMemo(() => evaluateJsonPath(value, path), [value, path]);
  const displayValue = result.ok ? result.value : undefined;
  const displayText = useMemo(() => {
    if (!result.ok) {
      return "";
    }
    if (!path.trim()) {
      return text;
    }
    return JSON.stringify(result.value, null, indent);
  }, [result, path, text, indent]);

  const stats = useMemo(
    () => (result.ok && displayValue !== null && typeof displayValue === "object" ? computeJsonStats(displayValue) : null),
    [result.ok, displayValue],
  );

  const views: Array<{ id: JsonView; label: string }> = [
    { id: "highlight", label: "高亮" },
    { id: "tree", label: "树形" },
    { id: "text", label: "文本" },
  ];

  return (
    <div className={`flex ${heightClass} flex-col gap-2`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md bg-accent/8 p-0.5">
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
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{"JSON 路径查询"}</span>
          <input
            className={`h-8 w-full rounded-md border bg-paper/88 px-2.5 font-mono text-xs text-foreground outline-none transition placeholder:text-muted/70 focus:ring-2 focus:ring-accent/15 ${
              !result.ok ? "border-[color-mix(in_srgb,var(--accent-2)_55%,var(--line))] focus:border-[color-mix(in_srgb,var(--accent-2)_62%,var(--line))]" : "border-line focus:border-accent/55"
            }`}
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder="路径查询：data.items[0].name、users[*].id"
            spellCheck={false}
          />
        </label>
      </div>

      {!result.ok && path.trim() ? (
        <p className="text-xs font-medium text-[var(--accent-2)]">{result.error}</p>
      ) : stats ? (
        <p className="text-xs text-muted/80">
          {`对象 ${stats.objects} · 数组 ${stats.arrays} · 键 ${stats.keys} · 最深 ${stats.depth} 层`}
        </p>
      ) : null}

      <div className="min-h-0 flex-1">
        {result.ok ? (
          view === "tree" ? (
            <TreeView value={displayValue} />
          ) : view === "text" ? (
            <CodeBlock text={displayText}>{displayText}</CodeBlock>
          ) : (
            <HighlightView text={displayText} />
          )
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-line bg-paper/88 text-xs text-muted shadow-inner">
            {"没有匹配到内容，请检查路径。"}
          </div>
        )}
      </div>
    </div>
  );
}
