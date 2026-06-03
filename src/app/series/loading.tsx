import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const skeletonCardKeys = ["a", "b", "c", "d", "e", "f"];

export default function SeriesLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader currentPath="/series" />

      <main className="flex-1 bg-background" aria-busy="true" aria-label="正在加载专题">
        <section className="site-grid">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
            <div className="article-reading-surface overflow-hidden rounded-md border border-line px-4 py-7 sm:px-5 md:px-9 md:py-8">
              <div className="grid gap-6 pl-0 md:grid-cols-[1fr_13rem] md:gap-8 md:pl-7">
                <div className="min-w-0 space-y-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-surface" />
                  <div className="h-10 w-3/4 animate-pulse rounded bg-surface" />
                  <div className="h-4 w-full max-w-3xl animate-pulse rounded bg-surface" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
                </div>
                <div className="h-40 animate-pulse rounded-md border border-line bg-surface" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">
          <div className="grid gap-4 md:grid-cols-3">
            {skeletonCardKeys.map((key) => (
              <div key={key} className="rounded-md border border-line p-5">
                <div className="aspect-[16/9] w-full animate-pulse rounded-md bg-surface" />
                <div className="mt-5 h-4 w-1/2 animate-pulse rounded bg-surface" />
                <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-surface" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
