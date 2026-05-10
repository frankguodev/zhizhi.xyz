import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/auth";

export async function requireAdminPage(next = "/admin") {
  const user = await getCurrentAdminUser().catch(() => null);

  if (!user) {
    redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  }

  return user;
}

export async function requireAdminApi() {
  const user = await getCurrentAdminUser().catch(() => null);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "请先登录后台管理员账号。" }, { status: 401 }),
    };
  }

  return { user, response: null };
}
