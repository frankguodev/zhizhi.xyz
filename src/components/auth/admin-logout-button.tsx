"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/admin/login");
  }

  return (
    <button
      type="button"
      className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center gap-2 px-3 text-sm font-semibold text-muted disabled:opacity-60"
      onClick={logout}
      disabled={loading}
      aria-busy={loading}
    >
      <LogOut className="h-4 w-4" />
      退出后台
    </button>
  );
}
