"use client";

type AdminApiErrorPayload = {
  error?: string;
  hint?: string;
};

export function redirectToAdminLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
}

export function adminApiErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) {
    return fallback;
  }

  const data = payload as AdminApiErrorPayload;
  const message = typeof data.error === "string" && data.error ? data.error : fallback;
  const hint = typeof data.hint === "string" && data.hint ? data.hint : "";

  return hint ? `${message}\n${hint}` : message;
}

export function handleAdminUnauthorized(response: Response) {
  if (response.status !== 401) {
    return false;
  }

  redirectToAdminLogin();
  return true;
}
