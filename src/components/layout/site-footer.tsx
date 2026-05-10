import Link from "next/link";
import { ExternalLink as ExternalLinkIcon, Mail } from "lucide-react";
import { ExternalLinkList } from "@/components/content/external-link-list";
import { SiteLogoMark } from "@/components/layout/site-logo-mark";
import { listExternalLinks } from "@/lib/external-links";
import { localePath } from "@/lib/i18n";
import { siteConfig, type Locale } from "@/lib/site";
import { t } from "@/lib/translations";

type SiteFooterProps = {
  locale?: Locale;
};

export async function SiteFooter({ locale = "zh" }: SiteFooterProps = {}) {
  const links = await listExternalLinks("site_footer", locale);
  const isEnglish = locale === "en";
  const brandName = isEnglish ? siteConfig.nameEn : siteConfig.name;
  const year = new Date().getFullYear();
  const primaryLinks = [
    { href: localePath(locale), label: isEnglish ? "Home" : "首页" },
    { href: localePath(locale, "/articles"), label: t(locale, "nav.articles") },
    { href: localePath(locale, "/series"), label: t(locale, "nav.series") },
    { href: localePath(locale, "/tools"), label: t(locale, "nav.tools") },
    { href: localePath(locale, "/about"), label: t(locale, "nav.about") },
  ];
  const legalLinks = [
    { href: localePath(locale, "/privacy"), label: isEnglish ? "Privacy Policy" : "隐私政策" },
    { href: localePath(locale, "/terms"), label: isEnglish ? "Terms of Use" : "使用条款" },
    { href: localePath(locale, "/disclaimer"), label: isEnglish ? "Disclaimer" : "免责声明" },
    { href: localePath(locale, "/cookies"), label: isEnglish ? "Cookie Notice" : "Cookie 说明" },
  ];

  return (
    <footer className="footer-surface border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-11">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.8fr_1fr]">
          <div>
            <Link href={localePath(locale)} className="inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <SiteLogoMark className="h-10 w-10 shrink-0" />
              <span className="text-xl font-semibold text-foreground">{brandName}</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">{isEnglish ? siteConfig.description.en : siteConfig.description.zh}</p>
            <div className="mt-5 flex items-center gap-2">
              <a
                className="icon-action inline-flex h-10 w-10 items-center justify-center rounded-md text-muted"
                href={`mailto:${siteConfig.social.email}`}
                aria-label={isEnglish ? "Email Frank" : "邮件联系 Frank"}
                title={isEnglish ? "Email Frank" : "邮件联系 Frank"}
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                className="icon-action inline-flex h-10 w-10 items-center justify-center rounded-md text-muted"
                href={siteConfig.social.xUrl}
                rel="noreferrer"
                target="_blank"
                aria-label={isEnglish ? "Follow on X / Twitter" : "关注 X / Twitter"}
                title={isEnglish ? "Follow on X / Twitter" : "关注 X / Twitter"}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path fill="currentColor" d="M13.9 10.5 21.3 2h-1.8l-6.4 7.4L8 2H2.1l7.8 11.3L2.1 22h1.8l6.8-7.7L16.1 22H22l-8.1-11.5Zm-2.4 2.7-.8-1.1L4.4 3.3h2.8l5 7.1.8 1.1 6.6 9.3h-2.8l-5.3-7.6Z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-accent">{isEnglish ? "Navigate" : "站点入口"}</p>
            <nav className="mt-4 grid gap-2 text-sm font-semibold text-muted">
              {primaryLinks.map((item) => (
                <Link key={item.href} className="inline-flex items-center transition hover:text-accent" href={item.href}>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-accent">{isEnglish ? "Legal" : "合规声明"}</p>
            <nav className="mt-4 grid gap-2 text-sm font-semibold text-muted">
              {legalLinks.map((item) => (
                <Link key={item.href} className="inline-flex items-center transition hover:text-accent" href={item.href}>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {links.length > 0 ? (
          <div className="mt-10 border-t border-line/85 pt-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted">
              <ExternalLinkIcon className="h-4 w-4 text-accent" />
              <span>{isEnglish ? "Elsewhere" : "外部入口"}</span>
            </div>
            <ExternalLinkList links={links} compact />
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line/85 pt-5 text-xs font-medium text-muted">
          <p>© {year} {siteConfig.nameEn}. All rights reserved.</p>
          <p>{isEnglish ? "A calm place for structured knowledge sharing." : "一个沉静、结构化的知识分享空间。"}</p>
        </div>
      </div>
    </footer>
  );
}
