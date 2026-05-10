import { and, desc, eq, gte, like, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { anonymousFeedback } from "@/db/schema";
import { hashAnonymousId } from "@/lib/anonymous-identity";
import type { Locale } from "@/lib/site";

export type AnonymousFeedbackStatus = "new" | "reviewed" | "archived";
export type AnonymousFeedbackType = "article" | "site";

export type AdminAnonymousFeedback = {
  id: string;
  locale: Locale;
  pageUrl: string;
  articleSlug: string | null;
  articleTitle: string | null;
  feedbackType: AnonymousFeedbackType;
  content: string;
  contact: string | null;
  status: AnonymousFeedbackStatus;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAnonymousFeedbackInput = {
  locale: Locale;
  pageUrl: string;
  articleSlug?: string | null;
  articleTitle?: string | null;
  feedbackType?: AnonymousFeedbackType;
  content: string;
  contact?: string | null;
  anonymousId: string;
  userAgent?: string | null;
};

export type ListAnonymousFeedbackOptions = {
  status?: AnonymousFeedbackStatus | "all";
  locale?: Locale | "all";
  query?: string;
  limit?: number;
};

const feedbackCooldownMs = 60 * 1000;
const maxContentLength = 1200;
const minContentLength = 2;
const maxContactLength = 160;
const maxUrlLength = 600;
const maxTitleLength = 180;
const maxUserAgentLength = 300;

export class AnonymousFeedbackRateLimitError extends Error {
  constructor() {
    super("Feedback submissions are too frequent.");
    this.name = "AnonymousFeedbackRateLimitError";
  }
}

export class AnonymousFeedbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnonymousFeedbackValidationError";
  }
}

function boundedTrim(value: string | null | undefined, maxLength: number) {
  return (value ?? "").trim().slice(0, maxLength);
}

function validatePageUrl(value: string) {
  const pageUrl = boundedTrim(value, maxUrlLength);

  if (!pageUrl || pageUrl.startsWith("javascript:")) {
    throw new AnonymousFeedbackValidationError("Invalid feedback page URL.");
  }

  return pageUrl;
}

async function anonymousIdHash(value: string) {
  return hashAnonymousId("anonymous-feedback", value);
}

function normalizeFeedback(row: typeof anonymousFeedback.$inferSelect): AdminAnonymousFeedback {
  return {
    id: row.id,
    locale: row.locale,
    pageUrl: row.pageUrl,
    articleSlug: row.articleSlug,
    articleTitle: row.articleTitle,
    feedbackType: row.feedbackType,
    content: row.content,
    contact: row.contact,
    status: row.status,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createAnonymousFeedback(input: CreateAnonymousFeedbackInput) {
  const db = await getDb();
  const now = new Date();
  const content = boundedTrim(input.content, maxContentLength);
  const contact = boundedTrim(input.contact, maxContactLength);
  const deviceHash = await anonymousIdHash(input.anonymousId);
  const recentThreshold = new Date(now.getTime() - feedbackCooldownMs);

  if (content.length < minContentLength) {
    throw new AnonymousFeedbackValidationError("Feedback content is too short.");
  }

  const recentRows = await db
    .select({ id: anonymousFeedback.id })
    .from(anonymousFeedback)
    .where(and(eq(anonymousFeedback.anonymousIdHash, deviceHash), gte(anonymousFeedback.createdAt, recentThreshold)))
    .limit(1);

  if (recentRows.length > 0) {
    throw new AnonymousFeedbackRateLimitError();
  }

  const id = crypto.randomUUID();

  await db.insert(anonymousFeedback).values({
    id,
    locale: input.locale,
    pageUrl: validatePageUrl(input.pageUrl),
    articleSlug: boundedTrim(input.articleSlug, 160) || null,
    articleTitle: boundedTrim(input.articleTitle, maxTitleLength) || null,
    feedbackType: input.feedbackType ?? "article",
    content,
    contact: contact || null,
    anonymousIdHash: deviceHash,
    status: "new",
    userAgent: boundedTrim(input.userAgent, maxUserAgentLength) || null,
    createdAt: now,
    updatedAt: now,
  });

  return { id, status: "new" as const };
}

export async function listAnonymousFeedback(options: ListAnonymousFeedbackOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 80, 1), 200);
  const filters = [];
  const normalizedQuery = boundedTrim(options.query, 80);
  const db = await getDb();

  if (options.status && options.status !== "all") {
    filters.push(eq(anonymousFeedback.status, options.status));
  }

  if (options.locale && options.locale !== "all") {
    filters.push(eq(anonymousFeedback.locale, options.locale));
  }

  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    filters.push(
      or(
        like(anonymousFeedback.content, pattern),
        like(anonymousFeedback.contact, pattern),
        like(anonymousFeedback.articleSlug, pattern),
        like(anonymousFeedback.articleTitle, pattern),
        like(anonymousFeedback.pageUrl, pattern),
      ),
    );
  }

  const rows = await db
    .select()
    .from(anonymousFeedback)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(anonymousFeedback.createdAt))
    .limit(limit);

  return rows.map(normalizeFeedback);
}

export async function updateAnonymousFeedbackStatus(id: string, status: AnonymousFeedbackStatus) {
  const db = await getDb();
  const now = new Date();

  await db.update(anonymousFeedback).set({ status, updatedAt: now }).where(eq(anonymousFeedback.id, id));

  return listAnonymousFeedback();
}

export async function deleteAnonymousFeedback(id: string) {
  const db = await getDb();

  await db.delete(anonymousFeedback).where(eq(anonymousFeedback.id, id));

  return listAnonymousFeedback();
}
