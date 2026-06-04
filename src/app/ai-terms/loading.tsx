import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

// force-dynamic + D1 查询，切筛选/翻页有服务端往返；用骨架屏占位避免空白闪烁。
const SIDEBAR_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
const CARD_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6"];

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader currentPath="/ai-terms" />

      <main className="flex-1 bg-background" aria-busy="true">
        <section className="site-grid border-b border-line">
          <div className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 md:pt-16 md:pb-10">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <div className="mx-auto h-4 w-20 animate-pulse rounded bg-line/60" />
              <div className="mx-auto h-10 w-3/4 animate-pulse rounded bg-line/60" />
              <div className="mx-auto h-5 w-2/3 animate-pulse rounded bg-line/40" />
            </div>
            <div className="mx-auto mt-7 h-14 max-w-2xl animate-pulse rounded-lg bg-line/40" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 md:py-9">
          <div className="flex items-center justify-between">
            <div className="h-5 w-28 animate-pulse rounded bg-line/50" />
            <div className="h-8 w-40 animate-pulse rounded-md bg-line/40" />
          </div>

          <div className="mt-6 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
            <aside className="hidden lg:block">
              <div className="space-y-2">
                {SIDEBAR_KEYS.map((key) => (
                  <div key={key} className="h-9 animate-pulse rounded-md bg-line/40" />
                ))}
              </div>
            </aside>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {CARD_KEYS.map((key) => (
                <div key={key} className="h-44 animate-pulse rounded-md border border-line bg-line/20" />
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
