import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

// 工具页两个路由（/tools 与 /tools/[tool]）共用的外层布局，避免改一个漏一个。
// 页头+main 单独撑满一屏（min-h-[100dvh]），页脚作为后继兄弟被挤到折叠线以下，桌面大屏首屏不露页脚；
// main / section 走 flex 撑满链，让内部工具面板可按需吃满视口高度。
export function ToolsPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-background">
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader currentPath="/tools" />

        <main className="flex flex-1 flex-col bg-background">
          <section className="flex min-h-0 flex-1 flex-col px-6 py-6 md:py-8">
            <h1 className="sr-only">{title}</h1>
            {children}
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
