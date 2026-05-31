import Link from "next/link";
import { ArrowRight, Hammer, Sparkles, UserRound } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const focusAreas = [
  {
    icon: Sparkles,
    title: "AI 探索与应用",
    description: "AI 工具、AI 编程、Agent、Skill、Codex、Claude 等等。",
  },
  {
    icon: Hammer,
    title: "项目开发实践",
    description: "把产品、工程、部署和迭代里的具体问题整理成可复用经验。",
  },
];

const contacts = [
  { label: "邮箱", value: "hello@frankguo.com", href: "mailto:hello@frankguo.com", external: false },
  { label: "X", value: "@frankguodev", href: "https://x.com/frankguodev", external: true },
  { label: "GitHub", value: "frankguodev", href: "https://github.com/frankguodev", external: true },
];

export const metadata = {
  title: "关于",
  description: "关于郭福和知之：一个围绕 AI 探索、项目开发实践和个人知识系统的长期分享空间。",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader currentPath="/about" />

      <main className="site-grid min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6">

          {/* Hero */}
          <section className="py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <UserRound className="h-4 w-4" />
              关于我
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-foreground">你好，我是郭福</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              一名软件工程师，AI 探索者。
            </p>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-muted">
              这里是我的分享网站，用来沉淀问题、方法和实践记录，让零散经验变成可以反复回来的路径。
            </p>
          </section>

          {/* 关注方向 */}
          <section className="border-t border-line/60 py-10">
            <p className="text-sm font-semibold text-accent">关注方向</p>
            <div className="mt-7 grid gap-8 md:grid-cols-2">
              {focusAreas.map((item) => (
                <div key={item.title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 leading-7 text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 为什么做这个网站 */}
          <section className="border-t border-line/60 py-10">
            <p className="text-sm font-semibold text-accent">为什么做这个网站</p>
            <div className="mt-4 max-w-3xl space-y-4">
              <p className="leading-8 text-muted">
                AI 时代已经全面到来，信息开始大爆炸，我每天都会看到很多有用的信息，但这些信息太碎太乱。我的 Notion、Obsidian 上的内容越来越多，可当同一个问题再次出现时，我还是会重新去问，没办法立即从原来的笔记里精确找出想要的内容。
              </p>
              <p className="leading-8 text-muted">
                我需要一个易读、易用、能更好地帮助其他人的知识空间，也能让自己长期回来。
              </p>
              <p className="leading-8 text-muted">
                而真正让我下定决心好好打磨它的契机，是在对 AI 领域的探索实践中发现——AI 时代，每个人都应该拥有自己的系统。这个系统不是普通博客，而是需要认真打磨的个人名片。
              </p>
            </div>
          </section>

          {/* 我的期待 */}
          <section className="border-t border-line/60 py-10">
            <p className="text-sm font-semibold text-accent">我的期待</p>
            <h2 className="mt-4 text-xl font-semibold text-foreground">我希望它有什么用</h2>
            <p className="mt-2 max-w-3xl leading-8 text-muted">帮助读者解决问题、少走弯路，也帮助自己快速回顾问题。</p>
          </section>

          {/* 联系我 */}
          <section className="border-t border-line/60 py-10">
            <p className="text-sm font-semibold text-accent">联系我</p>
            <p className="mt-4 max-w-3xl leading-8 text-muted">有问题、想法或合作，欢迎通过下面任意方式找到我。</p>
            <ul className="mt-5 space-y-3">
              {contacts.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm text-muted">
                  <span className="w-12 shrink-0 font-semibold text-foreground">{item.label}</span>
                  <a
                    className="rounded-md transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {item.value}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* 接下来 */}
          <section className="border-t border-line/60 py-10 pb-16">
            <p className="text-sm font-semibold text-accent">接下来</p>
            <h2 className="mt-4 text-xl font-semibold text-foreground">从这里开始逛逛</h2>
            <p className="mt-2 max-w-3xl leading-8 text-muted">如果你也在用 AI 解决真实问题，下面两个入口可能更适合上手。</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/articles"
                className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              >
                阅读文章
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/ai-terms"
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line px-4 text-sm font-semibold text-muted transition hover:border-accent/35 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              >
                AI 词条
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}
