import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SiteLogoMark } from "@/components/layout/site-logo-mark";
import { SiteMobileMenu } from "@/components/layout/site-mobile-menu";
import { siteConfig } from "@/lib/site";

type SiteHeaderProps = {
  currentPath?: string;
};

const navItems = [
  { href: "/", label: "首页" },
  { href: "/articles", label: "文章" },
  { href: "/series", label: "专题" },
  { href: "/ai-terms", label: "词条" },
  { href: "/about", label: "关于" },
];

export async function SiteHeader({ currentPath = "/" }: SiteHeaderProps = {}) {
  const normalizedPath = normalizePath(currentPath);
  const mobileNavItems = navItems.map((item) => ({
    ...item,
    active: isActivePath(normalizedPath, item.href),
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-10">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <SiteLogoMark className="h-8 w-8 shrink-0 shadow-sm transition group-hover:opacity-90 sm:h-9 sm:w-9" title={siteConfig.name} />
          </Link>
          <nav className="hidden items-center gap-6 text-base font-semibold text-foreground/88 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} className={menuLinkClass(isActivePath(normalizedPath, item.href))} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />
          <SiteMobileMenu
            menuLabel="打开导航菜单"
            navLabel="菜单导航"
            closeLabel="关闭导航菜单"
            items={mobileNavItems}
          />
        </div>
      </div>
    </header>
  );
}

function normalizePath(path: string) {
  if (!path) {
    return "/";
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

function isActivePath(currentPath: string, href: string) {
  const base = normalizePath(href);
  if (base === "/") {
    return currentPath === "/";
  }

  return currentPath === base || currentPath.startsWith(`${base}/`);
}

function menuLinkClass(active: boolean) {
  if (active) {
    return "relative px-2 py-1.5 text-foreground after:absolute after:bottom-0 after:left-2 after:h-0.5 after:w-[calc(100%-1rem)] after:bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]";
  }

  return "relative px-2 py-1.5 transition-colors hover:text-foreground after:absolute after:bottom-0 after:left-2 after:h-0.5 after:w-0 after:bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] after:transition-[width] hover:after:w-[calc(100%-1rem)]";
}
