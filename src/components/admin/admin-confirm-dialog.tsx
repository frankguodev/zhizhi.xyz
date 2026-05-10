"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  details?: ReactNode;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  busy = false,
  details,
  tone = "danger",
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) {
    return null;
  }

  const isDanger = tone === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="关闭确认弹窗" onClick={busy ? undefined : onCancel} />
      <div className="admin-surface relative w-full max-w-lg p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center border",
              isDanger ? "border-red-200 bg-red-50 text-red-700" : "border-accent/30 bg-accent/10 text-accent",
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="mt-2 whitespace-pre-line leading-7 text-muted">{description}</p>
          </div>
        </div>

        {details ? <div className="mt-5">{details}</div> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-muted disabled:opacity-60"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className={cn(
              "admin-btn inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-60",
              isDanger ? "bg-red-700 text-white" : "admin-btn-primary",
            )}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
