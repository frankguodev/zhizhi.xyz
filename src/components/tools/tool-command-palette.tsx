"use client";

import { Search, X } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ToolGroup, ToolTab } from "./tool-types";

export type PaletteTool = {
  id: ToolTab;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  group: ToolGroup;
  aliases: string;
};

const copy = {
  title: "切换工具",
  placeholder: "搜索工具，例如 JSON、二维码、diff…",
  empty: "没有匹配的工具。",
  close: "关闭",
  hintNav: "↑↓ 选择",
  hintOpen: "↵ 打开",
  hintClose: "Esc 关闭",
};

export function ToolCommandPalette({
  open,
  tools,
  groups,
  group,
  activeTab,
  onGroupChange,
  onSelect,
  onClose,
}: {
  open: boolean;
  tools: readonly PaletteTool[];
  groups: readonly { id: ToolGroup; label: string }[];
  group: ToolGroup;
  activeTab: ToolTab;
  onGroupChange: (group: ToolGroup) => void;
  onSelect: (id: ToolTab) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const keyword = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      const searchable = `${tool.label} ${tool.description} ${tool.id} ${tool.aliases}`.toLowerCase();
      // 有关键词时跨所有分组搜索；否则只看当前分组（与工具台原过滤逻辑一致）。
      return keyword ? searchable.includes(keyword) : tool.group === group;
    });
  }, [tools, keyword, group]);

  const safeHighlight = filtered.length === 0 ? 0 : Math.min(highlight, filtered.length - 1);
  const activeOption = filtered[safeHighlight];

  // 打开后聚焦搜索框。
  useEffect(() => {
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, []);

  // 打开时锁定页面滚动。
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // 高亮项滚动进可视区。
  useEffect(() => {
    if (!activeOption) {
      return;
    }
    listRef.current?.querySelector(`#tools-palette-option-${activeOption.id}`)?.scrollIntoView({ block: "nearest" });
  }, [activeOption]);

  // 点击面板外关闭（忽略触发按钮，避免点按钮时先关后开）。
  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (target instanceof Element && target.closest('[data-tools-palette-trigger="true"]')) {
        return;
      }
      if (panelRef.current?.contains(target)) {
        return;
      }
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [onClose, open]);

  function moveHighlight(delta: number) {
    if (filtered.length === 0) {
      return;
    }
    setHighlight((current) => {
      const base = Math.min(current, filtered.length - 1);
      return (base + delta + filtered.length) % filtered.length;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlight(Math.max(0, filtered.length - 1));
    } else if (event.key === "Enter") {
      if (activeOption) {
        event.preventDefault();
        onSelect(activeOption.id);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <>
      <button
        className={`fixed inset-0 z-40 cursor-default bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-[240ms] ease-out motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
        type="button"
        aria-label={copy.close}
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pb-4 pt-[12vh]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
          onKeyDown={handleKeyDown}
          className={`pointer-events-auto flex max-h-[72vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-[0_24px_64px_rgba(20,17,10,0.22)] transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-line/75 px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-accent" />
            <input
              ref={inputRef}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              role="combobox"
              aria-expanded
              aria-controls="tools-palette-listbox"
              aria-activedescendant={activeOption ? `tools-palette-option-${activeOption.id}` : undefined}
              aria-label={copy.placeholder}
              placeholder={copy.placeholder}
              spellCheck={false}
            />
            <button
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent/6 text-muted transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
              type="button"
              aria-label={copy.close}
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-line/60 px-3.5 py-2.5" aria-label="工具分组">
            {groups.map((item) => {
              const active = item.id === group && keyword === "";
              return (
                <button
                  key={item.id}
                  className={`inline-flex h-7 cursor-pointer items-center justify-center rounded-md px-2.5 text-xs font-semibold transition ${
                    active ? "bg-accent/22 text-accent shadow-[var(--shadow-quiet)]" : "bg-accent/8 text-muted hover:bg-accent/12 hover:text-accent"
                  }`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setQuery("");
                    setHighlight(0);
                    onGroupChange(item.id);
                    inputRef.current?.focus();
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div ref={listRef} id="tools-palette-listbox" role="listbox" aria-label={copy.title} className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">{copy.empty}</p>
            ) : (
              filtered.map((tool, index) => {
                const Icon = tool.icon;
                const highlighted = index === safeHighlight;
                const current = tool.id === activeTab;
                return (
                  <button
                    key={tool.id}
                    id={`tools-palette-option-${tool.id}`}
                    role="option"
                    aria-selected={highlighted}
                    type="button"
                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition ${
                      highlighted ? "bg-accent/16 text-accent" : "text-foreground hover:bg-accent/8"
                    }`}
                    onMouseMove={() => setHighlight(index)}
                    onClick={() => onSelect(tool.id)}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/8 text-accent">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{tool.label}</span>
                        {current ? <span className="rounded bg-accent/12 px-1.5 py-0.5 text-[0.62rem] font-semibold text-accent">当前</span> : null}
                      </span>
                      <span className="line-clamp-1 text-[0.7rem] leading-4 text-muted">{tool.description}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/60 px-3.5 py-2 text-[0.68rem] font-medium text-muted">
            <span>{copy.hintNav}</span>
            <span>{copy.hintOpen}</span>
            <span>{copy.hintClose}</span>
            <span className="ml-auto">共 {tools.length} 个工具</span>
          </div>
        </div>
      </div>
    </>
  );
}
