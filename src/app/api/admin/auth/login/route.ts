import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, setAdminSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
});

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...init?.headers,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "后台登录信息无效" }, { status: 400 });
  }

  let user;
  try {
    user = await authenticateUser(parsed.data.email, parsed.data.password);
  } catch {
    return json(
      {
        error: "暂时无法连接后台数据库。",
        hint: "请确认生产 Worker 已使用 wrangler.toml 部署，并且 DB binding 指向生产 D1。",
      },
      { status: 503 },
    );
  }

  if (!user || user.role !== "admin") {
    return json({ error: "后台账号或密码不正确。" }, { status: 401 });
  }

  await setAdminSessionCookie(user);
  return json({ user });
}
