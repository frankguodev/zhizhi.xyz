"use client";

import { Link2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

// 与工作台内联工具（JWT/MD 等）统一的面板外观：标题栏（Link2 图标 + 标签 + 指标 + 动作按钮）
// 与输入/输出框框样式。standalone 工具（Diff / JSON→TS）复用，保持全站工具布局一致。

// 高度：clamp(下限, 视口比例 dvh, 上限)，与工作台 getPanelHeightClass 同档同值。内容区随屏放大、
// 宽敞，不减 chrome 偏移、允许自然滚动；下限保证矮屏可用，上限防超大屏稀疏。min-h 保留 resize-y。
const heights = {
  compact: "min-h-[clamp(14rem,36dvh,24rem)]",
  medium: "min-h-[clamp(18rem,48dvh,34rem)]",
  large: "min-h-[clamp(22rem,60dvh,46rem)]",
} as const;

export type ToolPanelHeight = keyof typeof heights;

export function toolPanelHeight(size: ToolPanelHeight): string {
  return heights[size];
}

// 输入框/只读输出框统一框样式（不含高度，由 toolPanelHeight 提供）。
export const toolFieldClass =
  "w-full rounded-md border border-line bg-paper/88 p-3.5 font-mono text-[0.875rem] leading-7 text-foreground shadow-inner outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/15";

export function formatFieldMeta(value: string): string {
  const lines = value ? value.split("\n").length : 0;
  return `${lines} 行 · ${value.length} 字符`;
}

export function ToolPanelHeader({ label, meta, actions }: { label: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Link2 className="h-3 w-3 text-accent" />
        {label}
        {meta != null ? <span className="font-medium text-muted/80">{meta}</span> : null}
      </span>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

export function ToolPanelButton({
  children,
  onClick,
  icon: Icon,
  label,
  active = false,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  label?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-[0.7rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${
        active ? "bg-accent/12 text-accent" : "bg-accent/6 text-muted hover:bg-accent/10 hover:text-accent"
      }`}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}
