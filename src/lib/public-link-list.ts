import { listExternalLinks, type ExternalLinkPosition, type PublicExternalLink } from "@/lib/external-links";
import type { Locale } from "@/lib/site";

export const publicExternalLinkPositions = ["home", "article_footer", "site_footer"] as const;

export type PublicExternalLinkPosition = (typeof publicExternalLinkPositions)[number];

export type PublicLinkListInput = {
  locale: Locale;
  position: PublicExternalLinkPosition;
  limit: number;
};

export type PublicLinkListPayload = {
  locale: Locale;
  position: PublicExternalLinkPosition;
  total: number;
  links: PublicExternalLink[];
};

export function isPublicExternalLinkPosition(value: string): value is PublicExternalLinkPosition {
  return publicExternalLinkPositions.includes(value as PublicExternalLinkPosition);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toPublicLink(link: PublicExternalLink): PublicExternalLink | null {
  if (!isHttpUrl(link.url)) {
    return null;
  }

  return {
    title: link.title.slice(0, 120),
    description: link.description ? link.description.slice(0, 300) : null,
    url: link.url.slice(0, 500),
  };
}

export async function getPublicLinkListPayload(input: PublicLinkListInput): Promise<PublicLinkListPayload> {
  const links = await listExternalLinks(input.position as ExternalLinkPosition, input.locale);
  const publicLinks = links.map(toPublicLink).filter((link): link is PublicExternalLink => link !== null);

  return {
    locale: input.locale,
    position: input.position,
    total: publicLinks.length,
    links: publicLinks.slice(0, input.limit),
  };
}
