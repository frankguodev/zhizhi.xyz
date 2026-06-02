"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = "zhizhi.cookie-notice";

const copy = {
  message: "知之仅使用保障网站基本功能所需的 Cookie，不用于广告或跨站追踪。",
  detail: "了解更多",
  accept: "知道了",
};

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) !== "dismissed") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, "dismissed");
    } catch {
      // 忽略隐私模式等无法写入本地存储的情况。
    }
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div
        className="mx-auto flex max-w-6xl flex-col gap-3 rounded-md border border-line bg-paper px-5 py-5 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:py-6"
        role="region"
        aria-label="Cookie 使用提示"
      >
        <p className="text-sm leading-6 text-muted">
          {copy.message}
          <Link href="/cookies" className="ml-1 font-semibold text-accent transition hover:underline">
            {copy.detail}
          </Link>
        </p>
        <button
          type="button"
          className="hero-action hero-primary-action inline-flex h-10 shrink-0 items-center justify-center rounded-md px-5 text-sm font-semibold transition sm:w-auto"
          onClick={dismiss}
        >
          {copy.accept}
        </button>
      </div>
    </div>
  );
}
