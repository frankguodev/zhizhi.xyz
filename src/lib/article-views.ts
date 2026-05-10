import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, articleViews } from "@/db/schema";
import { hashAnonymousId } from "@/lib/anonymous-identity";
import type { Locale } from "@/lib/site";

const viewCooldownMs = 1000 * 60 * 60 * 6;

async function anonymousIdHash(value: string) {
  return hashAnonymousId("article-view", value);
}

async function getStoredArticleViewCount(locale: Locale, slug: string) {
  const db = await getDb();
  const rows = await db
    .select({ viewCount: articles.viewCount })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);

  return rows[0]?.viewCount ?? null;
}

export async function getArticleViewCount(locale: Locale, slug: string) {
  return getStoredArticleViewCount(locale, slug);
}

export async function recordArticleView(locale: Locale, slug: string, anonymousId: string) {
  const db = await getDb();
  const deviceHash = await anonymousIdHash(anonymousId);
  const now = new Date();
  const articleRows = await db
    .select({ id: articles.id, viewCount: articles.viewCount })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);
  const article = articleRows[0];

  if (!article) {
    return null;
  }

  const viewRows = await db
    .select({
      id: articleViews.id,
      viewCount: articleViews.viewCount,
      lastViewedAt: articleViews.lastViewedAt,
    })
    .from(articleViews)
    .where(and(eq(articleViews.locale, locale), eq(articleViews.articleSlug, slug), eq(articleViews.anonymousIdHash, deviceHash)))
    .limit(1);
  const existing = viewRows[0];

  if (existing && now.getTime() - existing.lastViewedAt.getTime() < viewCooldownMs) {
    return {
      counted: false,
      viewCount: article.viewCount,
    };
  }

  if (existing) {
    await db
      .update(articleViews)
      .set({
        viewCount: existing.viewCount + 1,
        lastViewedAt: now,
        updatedAt: now,
      })
      .where(eq(articleViews.id, existing.id));
  } else {
    await db.insert(articleViews).values({
      id: crypto.randomUUID(),
      locale,
      articleSlug: slug,
      anonymousIdHash: deviceHash,
      viewCount: 1,
      lastViewedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db
    .update(articles)
    .set({
      viewCount: sql`${articles.viewCount} + 1`,
    })
    .where(eq(articles.id, article.id));

  const nextViewCount = await getStoredArticleViewCount(locale, slug);

  return {
    counted: true,
    viewCount: nextViewCount ?? article.viewCount + 1,
  };
}
