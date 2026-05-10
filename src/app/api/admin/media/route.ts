import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { deleteArticleImage, uploadArticleImage } from "@/lib/media";

const maxMultipartRequestSize = 6 * 1024 * 1024;
const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type CloudflareCacheStorage = CacheStorage & {
  default?: Cache;
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

async function deleteMediaCache(request: Request, key: string) {
  if (typeof caches === "undefined") {
    return;
  }

  const cache = (caches as CloudflareCacheStorage).default;
  if (!cache) {
    return;
  }

  const url = new URL(`/media/${key}`, request.url);
  await cache.delete(new Request(url.toString(), { method: "GET" })).catch(() => null);
}

function uploadErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "图片上传失败。";

  if (message.includes("MEDIA_BUCKET") || message.includes("R2")) {
    return json(
      {
        error: "R2 媒体存储不可用，图片没有上传成功。",
        hint: "请确认当前运行方式提供了 MEDIA_BUCKET binding。本地建议使用 npm run cf:preview 验证媒体上传。",
      },
      { status: 503 },
    );
  }

  if (message.includes("只支持")) {
    return json({ error: message }, { status: 415 });
  }

  if (message.includes("超过")) {
    return json({ error: message }, { status: 413 });
  }

  return json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxMultipartRequestSize) {
    return json({ error: "图片上传请求过大，单张图片不能超过 5MB。" }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return json({ error: "请选择要上传的图片。" }, { status: 400 });
  }

  try {
    const media = await uploadArticleImage(file);
    return json({ media });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";

  if (!key) {
    return json({ error: "请选择要删除的图片。" }, { status: 400 });
  }

  try {
    await deleteArticleImage(key);
    await deleteMediaCache(request, key);
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片删除失败。";

    if (message.includes("MEDIA_BUCKET") || message.includes("R2")) {
      return json(
        {
          error: "R2 媒体存储不可用，图片没有删除成功。",
          hint: "请确认当前运行方式提供了 MEDIA_BUCKET binding。本地建议使用 npm run cf:preview 验证媒体删除。",
        },
        { status: 503 },
      );
    }

    if (message.includes("不存在")) {
      return json({ error: message }, { status: 404 });
    }

    if (message.includes("不合法")) {
      return json({ error: message }, { status: 400 });
    }

    return json({ error: message }, { status: 400 });
  }
}
