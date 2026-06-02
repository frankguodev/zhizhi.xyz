"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

const labels = {
  close: "关闭图片",
  dialog: "词条解释信息图预览",
  open: "放大图片",
  zoomIn: "放大图片",
  zoomOut: "还原图片",
};

export function AiTermDiagram({ alt, label, src }: { alt: string; label: string; src: string }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePreview();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function openPreview() {
    setZoomed(false);
    setOpen(true);
  }

  function closePreview() {
    setOpen(false);
    setZoomed(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <figure className="mt-4 overflow-hidden rounded-md border border-line bg-paper/82 shadow-[var(--shadow-quiet)]" aria-label={label}>
        <button
          ref={triggerRef}
          type="button"
          onClick={openPreview}
          aria-label={alt ? `${labels.open}：${alt}` : labels.open}
          className="block w-full cursor-zoom-in bg-background/45 p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:p-4"
        >
          <span className="block aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="mx-auto h-full w-full object-contain" loading="eager" />
          </span>
        </button>
      </figure>

      {open ? (
        <div className="article-image-preview" role="dialog" aria-modal="true" aria-label={labels.dialog} onClick={closePreview}>
          <button ref={closeButtonRef} type="button" className="article-image-preview-close" aria-label={labels.close} onClick={closePreview}>
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="article-image-preview-zoom"
            aria-label={zoomed ? labels.zoomOut : labels.zoomIn}
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((value) => !value);
            }}
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <div className="article-image-preview-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              data-zoomed={zoomed ? "true" : "false"}
              onClick={(event) => {
                event.stopPropagation();
                setZoomed((value) => !value);
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
