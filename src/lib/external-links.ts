import { revalidateTag, unstable_cache } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import type { Locale } from "@/lib/site";
import { getDb } from "@/db/client";
import { externalLinks } from "@/db/schema";

const PUBLIC_EXTERNAL_LINKS_CACHE_TAG = "public-external-links";

function revalidatePublicExternalLinksCache() {
  revalidateTag(PUBLIC_EXTERNAL_LINKS_CACHE_TAG, { expire: 0 });
}

export type ExternalLinkPosition = "home" | "article_footer" | "profile" | "donate" | "site_footer";

export type PublicExternalLink = {
  title: string;
  description: string | null;
  url: string;
};

export type AdminExternalLink = PublicExternalLink & {
  id: string;
  locale: Locale;
  position: ExternalLinkPosition;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date | string | number;
};

export type ExternalLinkInput = {
  locale: Locale;
  title: string;
  description: string | null;
  url: string;
  position: ExternalLinkPosition;
  isActive: boolean;
  sortOrder: number;
};

function now() {
  return new Date();
}

export async function listExternalLinks(position: ExternalLinkPosition, locale: Locale = "zh") {
  return cachedListExternalLinks(position, locale);
}

const cachedListExternalLinks = unstable_cache(
  async (position: ExternalLinkPosition, locale: Locale = "zh") => {
    try {
      const db = await getDb();

      return await db
        .select({
          title: externalLinks.title,
          description: externalLinks.description,
          url: externalLinks.url,
        })
        .from(externalLinks)
        .where(and(eq(externalLinks.locale, locale), eq(externalLinks.position, position), eq(externalLinks.isActive, true)))
        .orderBy(asc(externalLinks.sortOrder), asc(externalLinks.title));
    } catch {
      return [] satisfies PublicExternalLink[];
    }
  },
  ["public-external-links"],
  { revalidate: 300, tags: [PUBLIC_EXTERNAL_LINKS_CACHE_TAG] },
);

export async function listAdminExternalLinks() {
  const db = await getDb();

  return db
    .select({
      id: externalLinks.id,
      locale: externalLinks.locale,
      title: externalLinks.title,
      description: externalLinks.description,
      url: externalLinks.url,
      position: externalLinks.position,
      isActive: externalLinks.isActive,
      sortOrder: externalLinks.sortOrder,
      updatedAt: externalLinks.updatedAt,
    })
    .from(externalLinks)
    .orderBy(asc(externalLinks.position), asc(externalLinks.sortOrder), asc(externalLinks.title));
}

export async function createExternalLink(input: ExternalLinkInput) {
  const db = await getDb();
  const timestamp = now();
  const id = `external-link:${crypto.randomUUID()}`;

  await db.insert(externalLinks).values({
    id,
    locale: input.locale,
    title: input.title,
    description: input.description,
    url: input.url,
    position: input.position,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  revalidatePublicExternalLinksCache();

  return { id };
}

export async function updateExternalLink(id: string, input: ExternalLinkInput) {
  const db = await getDb();
  const result = await db
    .update(externalLinks)
    .set({
      locale: input.locale,
      title: input.title,
      description: input.description,
      url: input.url,
      position: input.position,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      updatedAt: now(),
    })
    .where(eq(externalLinks.id, id))
    .returning({ id: externalLinks.id });

  const updated = result[0] ?? null;

  if (updated) {
    revalidatePublicExternalLinksCache();
  }

  return updated;
}

export async function deleteExternalLink(id: string) {
  const db = await getDb();
  const result = await db.delete(externalLinks).where(eq(externalLinks.id, id)).returning({ id: externalLinks.id });
  const deleted = result[0] ?? null;

  if (deleted) {
    revalidatePublicExternalLinksCache();
  }

  return deleted;
}
