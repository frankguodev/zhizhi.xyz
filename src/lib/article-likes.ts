import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articleLikes } from "@/db/schema";
import { hashAnonymousId } from "@/lib/anonymous-identity";
import type { Locale } from "@/lib/site";

const toggleCooldownMs = 800;

export class ArticleLikeRateLimitError extends Error {
  constructor() {
    super("Like action is too frequent.");
    this.name = "ArticleLikeRateLimitError";
  }
}

async function anonymousIdHash(value: string) {
  return hashAnonymousId("article-like", value);
}

async function countArticleLikes(locale: Locale, slug: string) {
  const db = await getDb();
  const rows = await db
    .select({ value: count() })
    .from(articleLikes)
    .where(and(eq(articleLikes.locale, locale), eq(articleLikes.articleSlug, slug), eq(articleLikes.isLiked, true)));

  return rows[0]?.value ?? 0;
}

export async function getArticleLikeState(locale: Locale, slug: string, anonymousId: string) {
  const db = await getDb();
  const deviceHash = await anonymousIdHash(anonymousId);
  const [stateRows, totalCount] = await Promise.all([
    db
      .select({ isLiked: articleLikes.isLiked })
      .from(articleLikes)
      .where(and(eq(articleLikes.locale, locale), eq(articleLikes.articleSlug, slug), eq(articleLikes.anonymousIdHash, deviceHash)))
      .limit(1),
    countArticleLikes(locale, slug),
  ]);

  return {
    liked: Boolean(stateRows[0]?.isLiked),
    count: totalCount,
  };
}

export async function toggleArticleLike(locale: Locale, slug: string, anonymousId: string) {
  const db = await getDb();
  const deviceHash = await anonymousIdHash(anonymousId);
  const now = new Date();
  const rows = await db
    .select({
      id: articleLikes.id,
      isLiked: articleLikes.isLiked,
      updatedAt: articleLikes.updatedAt,
    })
    .from(articleLikes)
    .where(and(eq(articleLikes.locale, locale), eq(articleLikes.articleSlug, slug), eq(articleLikes.anonymousIdHash, deviceHash)))
    .limit(1);

  const existing = rows[0];

  if (existing) {
    if (now.getTime() - existing.updatedAt.getTime() < toggleCooldownMs) {
      throw new ArticleLikeRateLimitError();
    }

    const nextLiked = !existing.isLiked;
    await db.update(articleLikes).set({ isLiked: nextLiked, updatedAt: now }).where(eq(articleLikes.id, existing.id));

    return {
      liked: nextLiked,
      count: await countArticleLikes(locale, slug),
    };
  }

  await db.insert(articleLikes).values({
    id: crypto.randomUUID(),
    locale,
    articleSlug: slug,
    anonymousIdHash: deviceHash,
    isLiked: true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    liked: true,
    count: await countArticleLikes(locale, slug),
  };
}
