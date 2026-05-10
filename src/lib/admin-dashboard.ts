import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, externalLinks, series, users } from "@/db/schema";

export type AdminDashboardMetrics = {
  draftCount: number;
  publishedArticleCount: number;
  archivedArticleCount: number;
  externalLinkCount: number;
  activeExternalLinkCount: number;
  userCount: number;
  adminUserCount: number;
  seriesCount: number;
  publishedSeriesCount: number;
};

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const db = await getDb();

  const [
    draftRows,
    publishedArticleRows,
    archivedArticleRows,
    externalLinkRows,
    activeExternalLinkRows,
    userRows,
    adminUserRows,
    seriesRows,
    publishedSeriesRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(articles).where(eq(articles.status, "draft")),
    db.select({ value: count() }).from(articles).where(eq(articles.status, "published")),
    db.select({ value: count() }).from(articles).where(eq(articles.status, "archived")),
    db.select({ value: count() }).from(externalLinks),
    db.select({ value: count() }).from(externalLinks).where(eq(externalLinks.isActive, true)),
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(eq(users.role, "admin")),
    db.select({ value: count() }).from(series),
    db.select({ value: count() }).from(series).where(eq(series.status, "published")),
  ]);

  return {
    draftCount: draftRows[0]?.value ?? 0,
    publishedArticleCount: publishedArticleRows[0]?.value ?? 0,
    archivedArticleCount: archivedArticleRows[0]?.value ?? 0,
    externalLinkCount: externalLinkRows[0]?.value ?? 0,
    activeExternalLinkCount: activeExternalLinkRows[0]?.value ?? 0,
    userCount: userRows[0]?.value ?? 0,
    adminUserCount: adminUserRows[0]?.value ?? 0,
    seriesCount: seriesRows[0]?.value ?? 0,
    publishedSeriesCount: publishedSeriesRows[0]?.value ?? 0,
  };
}
