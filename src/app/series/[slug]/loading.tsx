import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const skeletonArticleKeys = ["a", "b", "c", "d"];

export default function SeriesDetailLoading() {
  return (
    <>
      <SiteHeader currentPath="/series" />

      <main className="min-h-screen bg-background" aria-busy="true" aria-label="正在加载专题">
        <section className="site-grid">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
            <div className="index-surface overflow-hidden rounded-md border border-line px-4 py-7 sm:px-5 md:px-9 md:py-8">
              <div className="grid gap-6 pl-0 md:grid-cols-[1fr_15rem] md:items-center md:gap-8 md:pl-7">
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
          <div className="grid gap-4">
            {skeletonArticleKeys.map((key) => (
              <div key={key} className="grid gap-5 rounded-md border border-line p-5 md:grid-cols-[3rem_1fr] md:p-6">
                <div className="h-9 w-9 animate-pulse rounded-md bg-surface" />
                <div className="min-w-0 space-y-3">
                  <div className="h-4 w-20 animate-pulse rounded bg-surface" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-surface" />
                  <div className="h-4 w-full animate-pulse rounded bg-surface" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
