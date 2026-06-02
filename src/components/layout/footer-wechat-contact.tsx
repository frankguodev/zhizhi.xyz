"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const copy = {
  trigger: "微信扫码添加好友",
  title: "微信扫码添加好友",
  close: "关闭二维码",
  note: "加好友前请备注",
};

export function FooterWechatContact() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        className="icon-action inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted"
        aria-label={copy.trigger}
        title={copy.trigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M9.28 3.5C4.8 3.5 1.2 6.54 1.2 10.28c0 2.12 1.17 4.03 3 5.26l-.55 1.85a.55.55 0 0 0 .82.62l2.32-1.36c.78.21 1.62.32 2.49.32.38 0 .75-.02 1.12-.07a6.32 6.32 0 0 1-.25-1.76c0-3.42 3.08-6.21 6.88-6.21h.33C16.62 5.83 13.3 3.5 9.28 3.5Z"
          />
          <path
            fill="currentColor"
            d="M16.93 10.1c-3.17 0-5.73 2.2-5.73 4.9s2.56 4.9 5.73 4.9c.63 0 1.24-.09 1.8-.25l1.62.96a.48.48 0 0 0 .72-.54l-.38-1.3c1.22-.9 1.97-2.25 1.97-3.77 0-2.7-2.57-4.9-5.73-4.9Z"
          />
          <path
            fill="var(--background)"
            d="M6.38 8.35a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm5.05 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm3.6 5.5a.73.73 0 1 0 0-1.46.73.73 0 0 0 0 1.46Zm3.56 0a.73.73 0 1 0 0-1.46.73.73 0 0 0 0 1.46Z"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-3 w-64 -translate-x-1/2 rounded-md border border-line bg-paper p-4 shadow-lg"
          role="dialog"
          aria-label={copy.title}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{copy.title}</p>
            <button
              type="button"
              className="icon-action inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted"
              aria-label={copy.close}
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 rounded-md border border-line bg-surface/40 p-3">
            <Image src="/ower_wx.jpg" alt={copy.title} width={320} height={320} className="mx-auto h-auto w-full rounded-md" />
          </div>

          <p className="mt-3 text-center text-sm font-medium text-muted">{copy.note}</p>
        </div>
      ) : null}
    </div>
  );
}
