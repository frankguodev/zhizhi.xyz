"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function getErrorMessage(data: unknown) {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return "操作失败";
}
type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/articles";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
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
      setError(exception instanceof Error ? exception.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="border border-line bg-surface p-6" onSubmit={submit}>
      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="email">邮箱</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="mt-2 h-11 w-full border border-line bg-background px-3 outline-none focus:border-accent"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="mt-4">
        <label className="text-sm font-semibold text-foreground" htmlFor="password">密码</label>
        <input
          id="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          className="mt-2 h-11 w-full border border-line bg-background px-3 outline-none focus:border-accent"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={isRegister ? 8 : 1}
          required
        />
      </div>
      {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 bg-accent px-5 font-semibold text-accent-ink disabled:opacity-60"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isRegister ? "注册" : "登录"}
      </button>
      <p className="mt-5 text-center text-sm text-muted">
        {isRegister ? "已经有账号？" : "还没有账号？"}
        <Link className="ml-2 font-semibold text-accent" href={isRegister ? `/login?next=${encodeURIComponent(next)}` : `/register?next=${encodeURIComponent(next)}`}>
          {isRegister ? "去登录" : "去注册"}
        </Link>
      </p>
    </form>
  );
}

