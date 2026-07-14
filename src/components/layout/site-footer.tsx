import Link from "next/link";
import { ExternalLink as ExternalLinkIcon, Mail } from "lucide-react";
import { ExternalLinkList } from "@/components/content/external-link-list";
import { FooterWechatContact } from "@/components/layout/footer-wechat-contact";
import { SiteLogoMark } from "@/components/layout/site-logo-mark";
import { listExternalLinks } from "@/lib/external-links";
import { siteConfig } from "@/lib/site";

const primaryLinks = [
  { href: "/articles", label: "文章" },
  { href: "/ai-terms", label: "词条" },
  { href: "/series", label: "专题" },
  { href: "/about", label: "关于" },
];

const siteInfoLinks = [
  { href: "/feedback", label: "意见反馈" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/terms", label: "使用条款" },
  { href: "/disclaimer", label: "免责声明" },
  { href: "/cookies", label: "Cookie 说明" },
];

export async function SiteFooter() {
  const links = await listExternalLinks("site_footer", "zh");
  const year = new Date().getFullYear();

  return (
    <footer className="footer-surface mt-8 md:mt-10">
      <div className="mx-auto max-w-6xl px-6 py-11">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-[1.15fr_0.8fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <SiteLogoMark className="h-10 w-10 shrink-0" />
              <span className="text-xl font-semibold text-foreground">{siteConfig.name}</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">{siteConfig.description}</p>
            <div className="mt-5 flex items-center gap-2">
              <a
                className="icon-action inline-flex h-10 w-10 items-center justify-center rounded-md text-muted"
                href={siteConfig.social.xUrl}
                rel="noreferrer"
                target="_blank"
                aria-label="关注 X / Twitter"
                title="关注 X / Twitter"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path fill="currentColor" d="M13.9 10.5 21.3 2h-1.8l-6.4 7.4L8 2H2.1l7.8 11.3L2.1 22h1.8l6.8-7.7L16.1 22H22l-8.1-11.5Zm-2.4 2.7-.8-1.1L4.4 3.3h2.8l5 7.1.8 1.1 6.6 9.3h-2.8l-5.3-7.6Z" />
                </svg>
              </a>
              <a
                className="icon-action inline-flex h-10 w-10 items-center justify-center rounded-md text-muted"
                href={siteConfig.social.githubUrl}
                rel="noreferrer"
                target="_blank"
                aria-label="GitHub 主页"
                title="GitHub 主页"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.57.11.78-.25.78-.55v-2c-3.18.69-3.85-1.36-3.85-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.33.95.1-.74.4-1.25.73-1.54-2.54-.29-5.21-1.27-5.21-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.16 1.17A10.95 10.95 0 0 1 12 6.24c.98 0 1.95.13 2.87.38 2.19-1.48 3.15-1.17 3.15-1.17.63 1.58.24 2.74.12 3.03.73.8 1.18 1.82 1.18 3.07 0 4.4-2.68 5.37-5.23 5.65.41.35.78 1.05.78 2.12v3.03c0 .3.21.66.79.55A11.5 11.5 0 0 0 12 .5Z"
                  />
                </svg>
              </a>
              <a
                className="icon-action inline-flex h-10 w-10 items-center justify-center rounded-md text-muted"
                href={`mailto:${siteConfig.social.email}`}
                aria-label="邮件联系 Frank"
                title="邮件联系 Frank"
              >
                <Mail className="h-4 w-4" />
              </a>
              <FooterWechatContact />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-accent">站点入口</p>
            <nav className="mt-4 grid gap-2 text-sm font-semibold text-muted">
              {primaryLinks.map((item) => (
                <Link key={item.href} className="inline-flex items-center transition hover:text-accent" href={item.href}>
                  <span>{item.label}</span>
                </Link>
              ))}
              <a
                className="inline-flex cursor-pointer items-center transition hover:text-accent"
                href="https://tooldb.cn/"
                rel="noopener"
                target="_blank"
              >
                <span>ToolDB</span>
              </a>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-accent">站点信息</p>
            <nav className="mt-4 grid gap-2 text-sm font-semibold text-muted">
              {siteInfoLinks.map((item) => (
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
              <span>外部入口</span>
            </div>
            <ExternalLinkList links={links} compact />
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line/85 pt-5 text-xs font-medium text-muted">
          <p>© {year} {siteConfig.nameEn}. All rights reserved.</p>
          <p>一个沉静、结构化的知识分享空间。</p>
        </div>
      </div>
    </footer>
  );
}
