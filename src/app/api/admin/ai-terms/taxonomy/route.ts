import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteAiTermTaxonomy,
  listAdminAiTermTaxonomy,
  mergeAiTermTaxonomy,
  updateAiTermTaxonomy,
} from "@/lib/ai-terms";
import { requireAdminApi } from "@/lib/admin-auth";

const updateSchema = z.object({
  kind: z.enum(["category", "tag"]),
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const mergeSchema = z.object({
  kind: z.enum(["category", "tag"]),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

const deleteSchema = z.object({
  kind: z.enum(["category", "tag"]),
  id: z.string().min(1),
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

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "数据库操作失败";
  return json({ error: message, hint: "请确认本地 D1 已应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。" }, { status: 503 });
}

export async function GET(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "all";
  const kind = url.searchParams.get("kind") || "all";

  try {
    const taxonomy = await listAdminAiTermTaxonomy({
      locale: locale === "zh" || locale === "en" ? locale : "all",
      kind: kind === "category" || kind === "tag" ? kind : "all",
    });
    return json({ taxonomy });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return json({ error: "请提供有效的分类/标签更新字段。" }, { status: 400 });

  try {
    const item = await updateAiTermTaxonomy(parsed.data);
    if (!item) return json({ error: "未找到要更新的分类/标签。" }, { status: 404 });
    const taxonomy = await listAdminAiTermTaxonomy();
    return json({ item, taxonomy });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const body = await request.json().catch(() => null);
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) return json({ error: "请提供有效的合并参数。" }, { status: 400 });

  try {
    const result = await mergeAiTermTaxonomy(parsed.data.kind, parsed.data.sourceId, parsed.data.targetId);
    const taxonomy = await listAdminAiTermTaxonomy();
    return json({ result, taxonomy });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return json({ error: "请提供有效的删除参数。" }, { status: 400 });

  try {
    const result = await deleteAiTermTaxonomy(parsed.data.kind, parsed.data.id);
    if (!result.deleted) return json({ error: "该分类/标签仍有关联词条，请先合并或移除关联后再删除。" }, { status: 409 });
    const taxonomy = await listAdminAiTermTaxonomy();
    return json({ result, taxonomy });
  } catch (error) {
    return databaseError(error);
  }
}
