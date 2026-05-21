"use client";

import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AdminCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function AdminCheckbox({ className, disabled, ...props }: AdminCheckboxProps) {
  return (
    <span className={cn("relative inline-flex h-5 w-5 shrink-0 items-center justify-center", disabled ? "opacity-55" : "")}>
      <input
        {...props}
        disabled={disabled}
        type="checkbox"
        className={cn(
          "peer h-5 w-5 cursor-pointer appearance-none rounded-[5px] border border-line bg-background transition",
          "checked:border-accent checked:bg-accent disabled:cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/15",
          className,
        )}
      />
      <Check className="pointer-events-none absolute h-3.5 w-3.5 text-accent-ink opacity-0 transition peer-checked:opacity-100" />
    </span>
  );
}
