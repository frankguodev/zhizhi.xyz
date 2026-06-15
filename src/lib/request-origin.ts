export function absoluteUrl(value: string, origin: string) {
  const normalized = value.trim();

  if (!normalized) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `${origin}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}
