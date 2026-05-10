import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { createExternalLink, listAdminExternalLinks } from "@/lib/external-links";

const linkSchema = z.object({
  locale: z.enum(["zh", "en"]),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).nullable(),
  url: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((value) => value.startsWith("https://") || value.startsWith("http://")),
  position: z.enum(["home", "article_footer", "profile", "donate", "site_footer"]),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
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

  return json(
    {
      error: message,
      hint: "请确认本地 D1 已应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    },
    { status: 503 },
  );
}

export async function GET() {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  try {
    const links = await listAdminExternalLinks();
    return json({ links });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = linkSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: "请填写完整且有效的链接信息，链接地址仅支持 http:// 或 https://。" }, { status: 400 });
  }

  try {
    await createExternalLink(parsed.data);
    const links = await listAdminExternalLinks();
    return json({ links }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}
