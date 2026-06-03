import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const skeletonCardKeys = ["a", "b", "c", "d", "e", "f"];

// 根级加载兜底：首页（app/page.tsx）及任何未自带 loading.tsx 的路由在数据加载时显示。
// 故意保持通用的「头部 + 标题区 + 卡片网格」中性骨架，不做成某个页面专属形状。
export default function RootLoading() {
  return (
    <>
      <SiteHeader currentPath="/" />

      <main className="min-h-screen bg-background" aria-busy="true" aria-label="正在加载">
        <section className="site-grid border-b border-line">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-9 pt-[4.5rem] sm:px-6 md:grid-cols-[0.92fr_1.08fr] md:items-start md:pb-14 md:pt-28 lg:pb-16 lg:pt-32">
            <div className="flex min-w-0 flex-col justify-center gap-5">
              <div className="h-12 w-3/4 animate-pulse rounded bg-surface" />
              <div className="h-12 w-2/3 animate-pulse rounded bg-surface" />
              <div className="mt-2 flex gap-3">
                <div className="h-11 w-32 animate-pulse rounded-md bg-surface" />
                <div className="h-11 w-32 animate-pulse rounded-md bg-surface" />
              </div>
            </div>
            <div className="h-48 animate-pulse rounded-md border border-line bg-surface" />
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
            <div className="h-4 w-24 animate-pulse rounded bg-surface" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {skeletonCardKeys.map((key) => (
                <div key={key} className="rounded-md border border-line p-5">
                  <div className="h-5 w-20 animate-pulse rounded bg-surface" />
                  <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-surface" />
                  <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface" />
                  <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-surface" />
                  <div className="mt-5 h-4 w-1/2 animate-pulse rounded bg-surface" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
