"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectSize = "md" | "sm";

type SelectProps = {
  ariaLabel?: string;
  className?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: SelectSize;
};

// 全站共享的自定义下拉框：可访问的 listbox（方向键 / Home / End / Enter / Esc、外点关闭、焦点管理），
// 用全局主题 token，size="md" 给后台筛选，size="sm" 给工具紧凑控件。
const sizeStyles: Record<SelectSize, string> = {
  md: "h-11 gap-3 text-sm",
  sm: "h-10 gap-2 text-xs",
};

export function Select({ ariaLabel, className, options, value, onChange, disabled = false, size = "md" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = useMemo(() => Math.max(0, options.findIndex((option) => option.value === value)), [options, value]);
  const selectedLabel = options[selectedIndex]?.label ?? options[0]?.label ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function openList(nextIndex = selectedIndex) {
    setActiveIndex(nextIndex);
    setOpen(true);
  }

  function moveActive(delta: number) {
    setActiveIndex((current) => {
      const next = current + delta;

      if (next < 0) {
        return options.length - 1;
      }

      if (next >= options.length) {
        return 0;
      }

      return next;
    });
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  }

  function handleButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openList(Math.min(selectedIndex + 1, options.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openList(Math.max(selectedIndex - 1, 0));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openList(selectedIndex);
    }
  }

  function handleListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(options[activeIndex]?.value ?? value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-background px-3 text-left outline-none transition",
          sizeStyles[size],
          disabled
            ? "cursor-not-allowed border-line opacity-60"
            : open
              ? "cursor-pointer border-accent bg-paper shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
              : "cursor-pointer border-line hover:border-accent/45",
        )}
        type="button"
        onClick={() => {
          if (!open) {
            setActiveIndex(selectedIndex);
          }

          setOpen((current) => !current);
        }}
        onKeyDown={handleButtonKeyDown}
      >
        <span className="min-w-0 flex-1 truncate text-foreground">{selectedLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open ? "rotate-180 text-accent" : "")} />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 max-h-64 overflow-auto rounded-md border border-accent/25 bg-paper p-1.5 shadow-lg shadow-foreground/10"
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => (
            <button
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              key={option.value}
              aria-selected={value === option.value}
              className={cn(
                "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition",
                value === option.value ? "bg-accent/12 text-accent" : "text-foreground hover:bg-surface hover:text-accent",
                index === activeIndex && value !== option.value ? "bg-surface text-accent" : "",
              )}
              role="option"
              tabIndex={index === activeIndex ? 0 : -1}
              type="button"
              onClick={() => selectOption(option.value)}
            >
              <span className="truncate">{option.label}</span>
              {value === option.value ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
