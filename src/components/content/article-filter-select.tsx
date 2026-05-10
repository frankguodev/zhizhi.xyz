"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ArticleFilterSelectProps = {
  allowEmpty?: boolean;
  name: string;
  options: Array<string | { label: string; value: string }>;
  placeholder: string;
  value: string;
};

function normalizeOption(option: string | { label: string; value: string }) {
  return typeof option === "string" ? { label: option, value: option } : option;
}

export function ArticleFilterSelect({ allowEmpty = true, name, options, placeholder, value }: ArticleFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const normalizedOptions = useMemo(() => {
    const mappedOptions = options.map(normalizeOption);
    return allowEmpty ? [{ label: placeholder, value: "" }, ...mappedOptions] : mappedOptions;
  }, [allowEmpty, options, placeholder]);
  const selectedOptionIndex = Math.max(0, normalizedOptions.findIndex((option) => option.value === selectedValue));
  const selectedLabel = normalizedOptions[selectedOptionIndex]?.label ?? placeholder;

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

  function updateNativeSelect(nextValue: string) {
    const nativeSelect = document.querySelector(`select[data-article-filter="${name}"]`) as HTMLSelectElement | null;

    if (!nativeSelect) {
      return;
    }

    nativeSelect.value = nextValue;
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function selectOption(nextValue: string) {
    setSelectedValue(nextValue);
    updateNativeSelect(nextValue);
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  }

  function openList(nextIndex = selectedOptionIndex) {
    setActiveIndex(nextIndex);
    setOpen(true);
  }

  function moveActive(delta: number) {
    setActiveIndex((current) => {
      const next = current + delta;
      if (next < 0) {
        return normalizedOptions.length - 1;
      }

      if (next >= normalizedOptions.length) {
        return 0;
      }

      return next;
    });
  }

  function handleButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openList(Math.min(selectedOptionIndex + 1, normalizedOptions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openList(Math.max(selectedOptionIndex - 1, 0));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openList(selectedOptionIndex);
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
      setActiveIndex(normalizedOptions.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(normalizedOptions[activeIndex]?.value ?? "");
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border bg-surface/80 px-3 text-left text-sm font-medium text-foreground shadow-sm outline-none transition",
          open ? "border-accent/55 bg-paper ring-2 ring-accent/12" : "border-line hover:border-accent/40 hover:bg-paper",
        )}
        type="button"
        onKeyDown={handleButtonKeyDown}
        onClick={() => {
          if (!open) {
            setActiveIndex(selectedOptionIndex);
          }

          setOpen((current) => !current);
        }}
      >
        <span className={cn("min-w-0 flex-1 truncate", selectedValue ? "text-foreground" : "text-muted")}>{selectedLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open ? "rotate-180 text-accent" : "")} />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-md border border-accent/25 bg-paper p-1.5 shadow-lg shadow-foreground/10"
          onKeyDown={handleListKeyDown}
        >
          {normalizedOptions.map((option, index) => (
            <button
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              key={option.value}
              className={cn(
                "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm font-medium transition",
                selectedValue === option.value ? "bg-accent/12 text-accent" : "text-foreground hover:bg-surface hover:text-accent",
                index === activeIndex && selectedValue !== option.value ? "bg-surface text-accent" : "",
              )}
              role="option"
              aria-selected={selectedValue === option.value}
              tabIndex={index === activeIndex ? 0 : -1}
              type="button"
              onClick={() => selectOption(option.value)}
            >
              <span className="truncate">{option.label}</span>
              {selectedValue === option.value ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
