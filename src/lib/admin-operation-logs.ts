import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { adminOperationLogs } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";

export type AdminOperationAction =
  | "article_publish"
  | "article_update"
  | "article_archive"
  | "article_restore"
  | "article_delete"
  | "ai_term_import"
  | "ai_term_update"
  | "ai_term_publish"
  | "ai_term_archive"
  | "ai_term_restore"
  | "ai_term_delete";

type ArticleLogTarget = {
  id: string | null;
  locale: "zh" | "en";
  slug: string;
  title: string;
};

type AiTermLogTarget = {
  id: string | null;
  locale: "zh" | "en";
  slug: string;
  term: string;
};

type WriteAdminOperationLogInput = {
  admin: AuthUser;
  action: Extract<AdminOperationAction, `article_${string}`>;
  article: ArticleLogTarget;
  details?: Record<string, unknown>;
};

type WriteAdminAiTermOperationLogInput = {
  admin: AuthUser;
  action: Extract<AdminOperationAction, `ai_term_${string}`>;
  aiTerm: AiTermLogTarget;
  details?: Record<string, unknown>;
};

function operationLogId() {
  return `admin-log:${crypto.randomUUID()}`;
}

export async function writeAdminArticleOperationLog({
  action,
  admin,
  article,
  details,
}: WriteAdminOperationLogInput) {
  const db = await getDb();

  await db.insert(adminOperationLogs).values({
    id: operationLogId(),
    adminUserId: admin.id,
    adminEmail: admin.email,
    action,
    targetType: "article",
    targetId: article.id,
    targetLocale: article.locale,
    targetSlug: article.slug,
    targetTitle: article.title,
    details: details ?? null,
    createdAt: new Date(),
  });
}

export async function writeAdminAiTermOperationLog({
  action,
  admin,
  aiTerm,
  details,
}: WriteAdminAiTermOperationLogInput) {
  const db = await getDb();

  await db.insert(adminOperationLogs).values({
    id: operationLogId(),
    adminUserId: admin.id,
    adminEmail: admin.email,
    action,
    targetType: "ai_term",
    targetId: aiTerm.id,
    targetLocale: aiTerm.locale,
    targetSlug: aiTerm.slug,
    targetTitle: aiTerm.term,
    details: details ?? null,
    createdAt: new Date(),
  });
}

export async function listArticleOperationLogs(articleId: string, limit = 20) {
  const db = await getDb();

  return db
    .select({
      id: adminOperationLogs.id,
      adminEmail: adminOperationLogs.adminEmail,
      action: adminOperationLogs.action,
      targetTitle: adminOperationLogs.targetTitle,
      details: adminOperationLogs.details,
      createdAt: adminOperationLogs.createdAt,
    })
    .from(adminOperationLogs)
    .where(eq(adminOperationLogs.targetId, articleId))
    .orderBy(desc(adminOperationLogs.createdAt))
    .limit(limit);
}

export async function listAiTermOperationLogs(aiTermId: string, limit = 20) {
  const db = await getDb();

  return db
    .select({
      id: adminOperationLogs.id,
      adminEmail: adminOperationLogs.adminEmail,
      action: adminOperationLogs.action,
      targetTitle: adminOperationLogs.targetTitle,
      details: adminOperationLogs.details,
      createdAt: adminOperationLogs.createdAt,
    })
    .from(adminOperationLogs)
    .where(eq(adminOperationLogs.targetId, aiTermId))
    .orderBy(desc(adminOperationLogs.createdAt))
    .limit(limit);
}
