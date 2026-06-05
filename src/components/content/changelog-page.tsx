import { History } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { changelog, type ChangelogChangeType } from "@/lib/changelog";

const copy = {
  currentPath: "/changelog",
  eyebrow: "更新日志",
  title: "更新日志",
  description: "记录知之每一次上线带来的新增、优化与修复。",
  lastUpdated(date: string) {
    return `最后更新：${date}`;
  },
  latest: "最新",
  empty: "更新日志正在整理，稍后这里会记录每一次上线的变化。",
};

const typeMeta: Record<ChangelogChangeType, { label: string; className: string }> = {
  added: { label: "新增", className: "border-accent/30 bg-accent/10 text-accent" },
  improved: { label: "优化", className: "border-sky-500/30 bg-sky-500/10 text-sky-600" },
  fixed: { label: "修复", className: "border-amber-500/30 bg-amber-500/10 text-amber-600" },
  removed: { label: "下线", className: "border-line bg-surface text-muted" },
};

function releaseAnchor(date: string, version?: string) {
  return `release-${version ?? date}`;
}

export function ChangelogPage() {
  const pageCopy = copy;
  const latestDate = changelog[0]?.date;

  return (
    <>
      <SiteHeader currentPath={pageCopy.currentPath} />

      <main className="min-h-screen bg-background">
        <section className="site-grid border-b border-line">
          <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <History className="h-4 w-4" />
              {pageCopy.eyebrow}
            </p>
            <h1 className="mt-4 break-words text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">{pageCopy.title}</h1>
            <p className="mt-5 max-w-3xl break-words text-lg leading-8 text-muted [overflow-wrap:anywhere]">{pageCopy.description}</p>
            {latestDate ? <p className="mt-4 text-sm font-medium text-muted">{pageCopy.lastUpdated(latestDate)}</p> : null}
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-10 md:py-12">
            {changelog.length > 0 ? (
              <ol className="relative ml-1 border-l border-line">
                {changelog.map((release, index) => (
                  <li key={releaseAnchor(release.date, release.version)} id={releaseAnchor(release.date, release.version)} className="relative scroll-mt-24 pb-9 pl-6 last:pb-0 md:pl-7">
                    <span className="absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-accent" aria-hidden="true" />

                    <div className="flex flex-wrap items-center gap-2">
                      <time dateTime={release.date} className="text-sm font-semibold text-foreground">{release.date}</time>
                      {release.version ? (
                        <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{release.version}</span>
                      ) : null}
                      {index === 0 ? (
                        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">{pageCopy.latest}</span>
                      ) : null}
                    </div>

                    {release.title ? <p className="mt-1.5 break-words text-base font-semibold text-foreground [overflow-wrap:anywhere]">{release.title}</p> : null}

                    <ul className="mt-3 grid gap-2.5">
                      {release.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-2.5">
                          {change.type ? (
                            <span className={`mt-0.5 inline-flex shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${typeMeta[change.type].className}`}>
                              {typeMeta[change.type].label}
                            </span>
                          ) : (
                            <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" aria-hidden="true" />
                          )}
                          <span className="break-words text-sm leading-7 text-muted [overflow-wrap:anywhere]">
                            {change.label ? <span className="font-semibold text-foreground">{change.label}：</span> : null}
                            {change.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-md border border-dashed border-line bg-paper/60 px-5 py-8 text-center text-sm font-semibold text-muted">{pageCopy.empty}</p>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
