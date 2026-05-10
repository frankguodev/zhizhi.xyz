"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";

type ArticleSearchInputProps = {
  name: string;
  placeholder: string;
  clearLabel: string;
  value: string;
};

export function ArticleSearchInput({ name, placeholder, clearLabel, value }: ArticleSearchInputProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function clearValue() {
    setCurrentValue("");
    inputRef.current?.focus();
  }

  return (
    <span className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        className="h-10 w-full rounded-md border border-line bg-paper pl-10 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent"
        name={name}
        onChange={(event) => setCurrentValue(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={currentValue}
      />
      {currentValue ? (
        <button
          aria-label={clearLabel}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-accent/12 hover:text-accent focus-visible:bg-accent/12 focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
          type="button"
          onClick={clearValue}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </span>
  );
}
