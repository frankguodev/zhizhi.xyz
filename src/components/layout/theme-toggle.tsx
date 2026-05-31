"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useSyncExternalStore } from "react";

const storageKey = "zhizhi.theme";
const themeChangeEvent = "zhizhi.theme.change";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // Keep the visual theme working even when storage is unavailable.
  }
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  const current = document.documentElement.dataset.theme;
  if (current === "dark" || current === "light") {
    return current;
  }

  try {
    return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribeToThemeChange(onStoreChange: () => void) {
  window.addEventListener(themeChangeEvent, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToThemeChange, getThemeSnapshot, getServerSnapshot);

  function toggleTheme() {
    applyTheme(theme === "light" ? "dark" : "light");
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return (
    <button
      type="button"
      className="icon-action inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-foreground"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "切换到深色主题" : "切换到正常主题"}
      title={theme === "light" ? "切换到深色主题" : "切换到正常主题"}
    >
      {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
    </button>
  );
}
