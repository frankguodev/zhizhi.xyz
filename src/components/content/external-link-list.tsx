import { ExternalLink } from "lucide-react";
import type { PublicExternalLink } from "@/lib/external-links";

type ExternalLinkListProps = {
  links: PublicExternalLink[];
  compact?: boolean;
};

export function ExternalLinkList({ links, compact = false }: ExternalLinkListProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "flex flex-wrap gap-3" : "grid gap-3"}>
      {links.map((link) => (
        <a
          key={link.url}
          className={
            compact
              ? "motion-surface inline-flex items-center gap-2 rounded-md border border-line bg-paper/70 px-3 py-2 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:text-accent"
              : "motion-surface node-surface flex items-start justify-between gap-4 rounded-md border border-line bg-paper/82 p-4 transition hover:border-accent/50"
          }
          href={link.url}
          rel="noreferrer"
          target="_blank"
        >
          <span>
            <span className="block font-semibold text-foreground">{link.title}</span>
            {!compact && link.description ? <span className="mt-1 block text-sm leading-6 text-muted">{link.description}</span> : null}
          </span>
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        </a>
      ))}
    </div>
  );
}
