import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { type AuthUser, getCurrentAdminUser } from "@/lib/auth";

// 脚本专用服务账号：通过 Authorization: Bearer Token 鉴权时返回此合成身份，
// 用于审计日志区分"脚本提交"与真实管理员。
const scriptServiceAccount: AuthUser = {
  id: "script:ai-term",
  email: "script@zhizhi.xyz",
  displayName: "AI 词条脚本",
  role: "admin",
  status: "active",
};

async function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

function timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer) {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const viewA = new Uint8Array(a);
  const viewB = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < viewA.length; i += 1) {
    diff |= viewA[i] ^ viewB[i];
  }

  return diff === 0;
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : "";
}

// 双 Token 零停机轮换：同时接受主 Token 和 _NEXT 候选 Token。
async function matchesScriptToken(presented: string) {
  if (!presented) {
    return false;
  }

  const candidates = [process.env.AI_TERM_ADMIN_API_TOKEN, process.env.AI_TERM_ADMIN_API_TOKEN_NEXT]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (candidates.length === 0) {
    return false;
  }

  const presentedHash = await sha256(presented);
  let matched = false;
  for (const candidate of candidates) {
    if (timingSafeEqual(presentedHash, await sha256(candidate))) {
      matched = true;
    }
  }

  return matched;
}

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

// 仅供 AI 词条脚本白名单接口（建草稿 / 查重 / 上传图）使用：
// 先认后台管理员 Cookie，未登录时再认脚本专用 Bearer Token。
// 不要把它接到其他后台接口，否则 Token 会获得越权能力。
export async function requireAdminApiOrScriptToken(request: Request) {
  const user = await getCurrentAdminUser().catch(() => null);

  if (user) {
    return { user, response: null };
  }

  if (await matchesScriptToken(readBearerToken(request))) {
    return { user: scriptServiceAccount, response: null };
  }

  return {
    user: null,
    response: NextResponse.json({ error: "需要后台管理员登录或有效的脚本 Token。" }, { status: 401 }),
  };
}
