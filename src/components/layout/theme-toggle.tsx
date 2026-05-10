"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

const storageKey = "zhizhi.theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(storageKey, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") {
      return "light";
    }

    const current = document.documentElement.dataset.theme;
    if (current === "dark" || current === "light") {
      return current;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((value) => (value === "light" ? "dark" : "light"));
  }

  return (
    <button
      type="button"
      className="icon-action inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "切换到深色主题" : "切换到正常主题"}
      title={theme === "light" ? "切换到深色主题" : "切换到正常主题"}
    >
      {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
    </button>
  );
}
