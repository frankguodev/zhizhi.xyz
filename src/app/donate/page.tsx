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
    title: "反馈选题",
    description: "告诉我们哪些主题真正有帮助，哪些地方还需要更清晰的解释。",
  },
  {
    icon: ShieldCheck,
    title: "指出问题",
    description: "事实错误、表达含混或信息过时，都欢迎直接指出，这本身就是重要支持。",
  },
  {
    icon: Coffee,
    title: "小额赞助",
    description: "通过赞助支持长期写作与维护，让高质量内容持续更新。",
  },
];

export const dynamic = "force-dynamic";

export const metadata = {
  title: "捐赠",
  description: "支持知之持续整理高质量知识内容。",
};

export default async function DonatePage() {
  const donateLinks = await listExternalLinks("donate", "zh");

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader currentPath="/donate" />

      <section className="site-grid border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="index-surface rounded-md border border-line px-6 py-7 md:px-8">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <HeartHandshake className="h-4 w-4" />
              Support
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              支持知之，继续把知识整理成路径。
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              我们优先打磨内容质量与阅读体验。你的支持会直接用于持续创作、校对核验和站点长期维护。
            </p>
          </div>
          <aside className="vein-map rounded-md border border-line bg-paper/88 p-6">
            <p className="eyebrow text-accent">How Support Helps</p>
            <ul className="mt-4 grid gap-3 text-sm text-muted">
              <li className="motion-surface home-node rounded-md border border-line/80 bg-surface/78 px-3 py-2.5 pl-5 leading-6">
                稳定更新长文与专题
              </li>
              <li className="motion-surface home-node rounded-md border border-line/80 bg-surface/78 px-3 py-2.5 pl-5 leading-6">
                持续修订旧文与误差
              </li>
              <li className="motion-surface home-node rounded-md border border-line/80 bg-surface/78 px-3 py-2.5 pl-5 leading-6">
                维护双语与知识地图
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
            <h2 className="text-2xl font-semibold text-foreground">当前支持入口</h2>
            <p className="mt-3 max-w-3xl leading-7 text-muted">
              这里会读取后台维护的捐赠链接。若暂未配置入口，页面会保留反馈和联系通道，确保支持路径始终可达。
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
                <p className="font-semibold text-foreground">捐赠入口准备中</p>
                <p className="mt-2 leading-7 text-muted">
                  目前可通过反馈、分享或邮件联系支持项目。你的每次反馈都会直接影响后续选题和内容迭代。
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
            href="/articles"
          >
            继续阅读
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-paper px-5 text-sm font-semibold text-foreground transition hover:border-accent/60"
            href="/about"
          >
            了解知之
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
