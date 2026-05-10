"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-semibold text-muted disabled:opacity-60"
      onClick={logout}
      disabled={loading}
    >
      <LogOut className="h-4 w-4" />
      退出
    </button>
  );
}
