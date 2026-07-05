import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SiteLogoMark } from "@/components/layout/site-logo-mark";

export function ToolsStandaloneHeader() {
  return (
    <header className="border-b border-line bg-surface/82">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link className="flex min-w-0 cursor-pointer items-center gap-3" href="/" aria-label="在线工具箱首页">
          <SiteLogoMark className="h-8 w-8 shrink-0 shadow-sm sm:h-9 sm:w-9" title="在线工具箱" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-foreground sm:text-base">在线工具箱</span>
            <span className="block truncate text-xs font-semibold text-muted">本地运行，数据不上传</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2 text-sm font-semibold text-muted" aria-label="工具站导航">
          <Link className="cursor-pointer rounded-md px-3 py-2 transition hover:bg-accent/10 hover:text-accent" href="/tools">
            全部工具
          </Link>
          <a
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition hover:bg-accent/10 hover:text-accent"
            href="https://github.com/frankguodev"
            aria-label="GitHub"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </header>
  );
}
