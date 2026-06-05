import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { requireAdminApi } from "@/lib/admin-auth";
import { getMediaBucket } from "@/lib/media";

// 一次性迁移：把历史按 ai-terms/{locale}/{slug}/diagram-*.ext 存放的词条图解，
// 搬到统一的 ai-terms/{年}/{月}/diagram-*.ext（年月取对象原始上传时间），并改写数据库中引用的 URL。
// 幂等：迁移完成后再次调用为空操作（旧前缀已无对象）。默认 dryRun，需显式 { dryRun: false } 才会写入。

const legacyPrefixes = ["ai-terms/zh/", "ai-terms/en/"];
const legacyDiagramPattern = /^ai-terms\/(zh|en)\/[^/]+\/diagram-([a-f0-9-]{36})\.(jpg|png|webp|gif)$/;

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...noStoreHeaders, ...init?.headers } });
}

async function listLegacyKeys(bucket: R2Bucket) {
  const keys: Array<{ key: string; uploaded: Date }> = [];

  for (const prefix of legacyPrefixes) {
    let cursor: string | undefined;
    do {
      const result = await bucket.list({ prefix, cursor, limit: 1000 });
      for (const object of result.objects) {
        if (legacyDiagramPattern.test(object.key)) {
          keys.push({ key: object.key, uploaded: object.uploaded });
        }
      }
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
  }

  return keys;
}

function newKeyFor(oldKey: string, uploaded: Date) {
  const match = oldKey.match(legacyDiagramPattern);
  if (!match) {
    return null;
  }
  const uuid = match[2];
  const extension = match[3];
  const year = uploaded.getUTCFullYear();
  const month = String(uploaded.getUTCMonth() + 1).padStart(2, "0");
  return `ai-terms/${year}/${month}/diagram-${uuid}.${extension}`;
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const body = (await request.json().catch(() => null)) as { dryRun?: unknown } | null;
  const dryRun = body?.dryRun !== false; // 默认 dry run，必须显式传 false 才执行写入。

  let bucket: R2Bucket;
  try {
    bucket = await getMediaBucket();
  } catch {
    return json({ error: "R2 媒体存储不可用（缺少 MEDIA_BUCKET binding）。" }, { status: 503 });
  }

  const db = await getDb();
  const legacyKeys = await listLegacyKeys(bucket);

  const migrated: Array<{ oldKey: string; newKey: string }> = [];
  const skipped: Array<{ key: string; reason: string }> = [];

  for (const { key: oldKey, uploaded } of legacyKeys) {
    const newKey = newKeyFor(oldKey, uploaded);
    if (!newKey) {
      skipped.push({ key: oldKey, reason: "无法解析为新路径" });
      continue;
    }

    const oldUrl = `/media/${oldKey}`;
    const newUrl = `/media/${newKey}`;

    if (!dryRun) {
      const object = await bucket.get(oldKey);
      if (!object) {
        skipped.push({ key: oldKey, reason: "对象不存在" });
        continue;
      }

      await bucket.put(newKey, await object.arrayBuffer(), {
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
      });

      // 改写数据库中所有引用旧 URL 的字段（图解、分享图、metadata、正文）。
      await db.run(sql`
        UPDATE ai_terms SET
          diagram_image = replace(diagram_image, ${oldUrl}, ${newUrl}),
          share_image = CASE WHEN share_image IS NULL THEN NULL ELSE replace(share_image, ${oldUrl}, ${newUrl}) END,
          metadata_json = CASE WHEN metadata_json IS NULL THEN NULL ELSE replace(metadata_json, ${oldUrl}, ${newUrl}) END,
          content_md = replace(content_md, ${oldUrl}, ${newUrl})
        WHERE instr(coalesce(diagram_image, '') || coalesce(share_image, '') || coalesce(metadata_json, '') || content_md, ${oldUrl}) > 0
      `);

      await bucket.delete(oldKey);
    }

    migrated.push({ oldKey, newKey });
  }

  return json({ dryRun, total: legacyKeys.length, migratedCount: migrated.length, migrated, skipped });
}
