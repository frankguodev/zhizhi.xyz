import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { deleteAnonymousFeedback, updateAnonymousFeedbackStatus, type AnonymousFeedbackStatus } from "@/lib/anonymous-feedback";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function parseStatus(value: unknown): AnonymousFeedbackStatus | null {
  return value === "new" || value === "reviewed" || value === "archived" ? value : null;
}

function databaseError() {
  return NextResponse.json(
    {
      error: "暂时无法更新反馈。",
      hint: "请确认 D1 已应用 anonymous_feedback migration，并在 Cloudflare preview/Worker 环境下验证。",
    },
    { status: 503, headers: noStoreHeaders },
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400, headers: noStoreHeaders });
  }

  const status = parseStatus(typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).status : null);

  if (!status) {
    return NextResponse.json({ error: "反馈状态无效。" }, { status: 400, headers: noStoreHeaders });
  }

  try {
    const feedback = await updateAnonymousFeedbackStatus(id, status);
    return NextResponse.json({ feedback }, { headers: noStoreHeaders });
  } catch {
    return databaseError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const feedback = await deleteAnonymousFeedback(id);
    return NextResponse.json({ feedback }, { headers: noStoreHeaders });
  } catch {
    return databaseError();
  }
}
