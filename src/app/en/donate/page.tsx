import Link from "next/link";
import {
  ArrowRight,
  Coffee,
  ExternalLink,
  HeartHandshake,
  Lightbulb,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { listExternalLinks } from "@/lib/external-links";

const supportWays = [
  {
    icon: Lightbulb,
    title: "Topic Feedback",
    description: "Tell us which topics are most useful and where deeper clarification would help.",
  },
  {
    icon: ShieldCheck,
    title: "Issue Reports",
    description: "Factual issues, outdated details, or unclear sections are always welcome feedback.",
  },
  {
    icon: Coffee,
    title: "Small Donations",
    description: "Donations support consistent writing, revision work, and long-term maintenance.",
  },
];

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Donate",
  description: "Support the long-term writing and maintenance work behind ZhiZhi.",
};

export default async function EnglishDonatePage() {
  const donateLinks = await listExternalLinks("donate", "en");

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader locale="en" currentPath="/en/donate" />

      <section className="site-grid border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="index-surface rounded-md border border-line px-6 py-7 md:px-8">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <HeartHandshake className="h-4 w-4" />
              Support
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Support ZhiZhi&apos;s long-term knowledge work.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              Support helps keep writing steady, revisions reliable, and the reading experience calm and sustainable over
              time.
            </p>
          </div>
          <aside className="vein-map rounded-md border border-line bg-paper/88 p-6">
            <p className="eyebrow text-accent">How Support Helps</p>
            <ul className="mt-4 grid gap-3 text-sm text-muted">
              <li className="motion-surface home-node rounded-md border border-line/80 bg-surface/78 px-3 py-2.5 pl-5 leading-6">
                Consistent long-form publishing
              </li>
              <li className="motion-surface home-node rounded-md border border-line/80 bg-surface/78 px-3 py-2.5 pl-5 leading-6">
                Ongoing factual and structural revisions
              </li>
              <li className="motion-surface home-node rounded-md border border-line/80 bg-surface/78 px-3 py-2.5 pl-5 leading-6">
                Better bilingual and path-map coverage
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {supportWays.map((way) => (
            <article key={way.title} className="motion-surface node-surface min-h-60 rounded-md border border-line bg-paper/80 p-6">
              <way.icon className="h-7 w-7 text-accent" />
              <h2 className="mt-5 text-xl font-semibold text-foreground">{way.title}</h2>
              <p className="mt-3 leading-7 text-muted">{way.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="index-surface rounded-md border border-line px-6 py-7">
            <h2 className="text-2xl font-semibold text-foreground">Current Support Links</h2>
            <p className="mt-3 max-w-3xl leading-7 text-muted">
              Links below are loaded from admin-managed settings. If none are configured yet, email is still available as
              a direct support channel.
            </p>

            {donateLinks.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {donateLinks.map((link) => (
                  <a
                    key={link.url}
                    className="motion-surface vein-link flex items-start justify-between gap-4 rounded-md border border-line bg-paper/82 px-4 py-3 transition hover:border-accent/55"
                    href={link.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>
                      <span className="block font-semibold text-foreground">{link.title}</span>
                      {link.description ? (
                        <span className="mt-1 block text-sm leading-6 text-muted">{link.description}</span>
                      ) : null}
                    </span>
                    <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-6 article-note-rail rounded-md border border-line p-5">
                <p className="font-semibold text-foreground">Support links are being prepared</p>
                <p className="mt-2 leading-7 text-muted">
                  While payment links are not configured yet, feedback and direct contact still help move the project
                  forward.
                </p>
                <a className="mt-5 inline-flex items-center gap-2 font-semibold text-foreground" href="mailto:hello@zhizhi.xyz">
                  <Mail className="h-4 w-4" />
                  hello@zhizhi.xyz
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:bg-foreground hover:text-background"
            href="/en/articles"
          >
            Keep Reading
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-paper px-5 text-sm font-semibold text-foreground transition hover:border-accent/60"
            href="/en/about"
          >
            About ZhiZhi
          </Link>
        </div>
      </section>

      <SiteFooter locale="en" />
    </main>
  );
}
