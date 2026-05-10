"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function getErrorMessage(data: unknown) {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return "后台登录失败";
}

function normalizeAdminNext(value: string | null) {
  if (!value || value.startsWith("//")) {
    return "/admin";
  }

  try {
    const url = new URL(value, "https://zhizhi.local");
    const isAdminPath = url.pathname === "/admin" || url.pathname.startsWith("/admin/");
    const isLoginPath = url.pathname === "/admin/login";

    if (!isAdminPath || isLoginPath || url.origin !== "https://zhizhi.local") {
      return "/admin";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = normalizeAdminNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      router.push(next);
      router.refresh();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "后台登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-foreground">管理员邮箱</span>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          className="h-11 w-full border border-line bg-background px-3 outline-none focus:border-accent"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={error ? "admin-login-error" : undefined}
          required
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-foreground">后台密码</span>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          className="h-11 w-full border border-line bg-background px-3 outline-none focus:border-accent"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? "admin-login-error" : undefined}
          required
        />
      </label>
      {error ? (
        <p id="admin-login-error" className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="admin-btn admin-btn-primary inline-flex h-11 w-full items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        登录后台
      </button>
    </form>
  );
}
