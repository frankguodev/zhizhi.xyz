import { type Locale, isLocale, siteConfig } from "@/lib/site";

export const defaultLocale = siteConfig.defaultLocale;

export function normalizeLocale(value: string | undefined): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

export function localePath(locale: Locale, path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (locale === defaultLocale) {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function stripLocalePrefix(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const segments = normalizedPath.split("/");
  const maybeLocale = segments[1];

  if (isLocale(maybeLocale) && maybeLocale !== defaultLocale) {
    const stripped = `/${segments.slice(2).join("/")}`;
    return stripped === "/" ? "/" : stripped.replace(/\/$/, "");
  }

  return normalizedPath;
}

export function alternateLocalePath(currentLocale: Locale, currentPath: string) {
  const nextLocale: Locale = currentLocale === "zh" ? "en" : "zh";
  return localePath(nextLocale, stripLocalePrefix(currentPath));
}
