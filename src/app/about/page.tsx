import { BookOpenCheck, Compass, GitBranch, Hammer, Layers3, NotebookPen, Sparkles, UserRound } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const focusAreas = [
  {
    icon: Sparkles,
    title: "AI 探索与应用",
    description: "关注 AI 如何进入真实工作流，而不是停留在概念和工具清单里。",
  },
  {
    icon: Compass,
    title: "内容出海",
    description: "记录内容全球化、双语表达、搜索入口和长期分发的实践。",
  },
  {
    icon: Hammer,
    title: "项目开发实践",
    description: "把产品、工程、部署和迭代里的具体问题整理成可复用经验。",
  },
  {
    icon: GitBranch,
    title: "个人品牌",
    description: "记录普通人如何用 AI、内容和项目实践，逐步搭建可信的个人名片和长期影响力。",
  },
];

const methods = [
  {
    icon: NotebookPen,
    title: "我怎么选题",
    description: "题目通常来自真实项目、反复出现的问题、长期笔记和我正在验证的方法。能沉淀成路径的内容，优先级会更高。",
  },
  {
    icon: Layers3,
    title: "我怎么整理",
    description: "我会把背景、主线、案例、风险和进阶理解拆开，让文章既能快速阅读，也能在需要时展开成完整参考。",
  },
  {
    icon: BookOpenCheck,
    title: "我希望它有什么用",
    description: "帮助读者解决问题，少走弯路，帮助自己快速回顾问题。",
  },
];

export const metadata = {
  title: "关于",
  description: "关于 Frank 和知之：一个围绕 AI、内容出海、项目实践、个人品牌和个人知识系统的长期写作空间。",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader currentPath="/about" />

      <main className="min-h-screen bg-background">
        <section className="site-grid border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <UserRound className="h-4 w-4" />
              关于我
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-foreground">你好，我是郭福</h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              一名普通java工程师，AI实践者。
            </p>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              没有大厂和名校背景，也能用AI提升竞争力。这里是我的分享网站，用来沉淀问题、方法和实践记录，让零散经验变成可以反复回来的路径。
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm font-semibold text-accent">关注方向</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {focusAreas.map((item) => (
              <article key={item.title} className="node-surface rounded-md border border-line bg-paper/80 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 leading-7 text-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-5 px-6 py-12">
            <article className="about-surface-no-rail index-surface rounded-md border border-line px-6 py-7">
              <p className="text-sm font-semibold text-accent">为什么做这个网站</p>
              <p className="mt-4 leading-8 text-muted">
                AI时代已经全面到来，信息开始大爆炸，我感觉自己每天都会看到很多不用的信息，但这些信息太碎太乱。我的notion、obsidian上的内容页越来越多，但当我又出现相同的问题时，还是会去问，不能立即从原来的笔记中精确找出自己想要的内容。
              </p>
              <p className="mt-4 leading-8 text-muted">
                我需要一个易读、易用、能更好的帮助其他人的知识内容页，还能长期回来的知识空间。
              </p>
              <p className="mt-4 leading-8 text-muted">
                而真正让我下定决心好好打磨自己的网站的契机，是在我对AI领域的探索实践过程发现——AI时代，每个人都应该拥有自己的系统。这个系统不是普通博客，而是需要好好打磨的个人名片。
              </p>
            </article>
            <div className="node-surface rounded-md border border-line bg-paper/80 p-2">
              {methods.map((item, index) => (
                <article key={item.title} className={`grid gap-4 p-4 md:grid-cols-[2.5rem_1fr] ${index > 0 ? "border-t border-line/80" : ""}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-3 leading-7 text-muted">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
