import Link from "next/link";
import { ArrowLeft, FileInput, FilePenLine, Home, LayoutDashboard, Link2, MessageSquareText, Newspaper, PanelsTopLeft } from "lucide-react";
import { AdminLogoutButton } from "@/components/auth/admin-logout-button";
import { cn } from "@/lib/utils";

type AdminNavItemKey = "dashboard" | "import" | "drafts" | "published" | "links" | "series" | "feedback";

type AdminNavProps = {
  active: AdminNavItemKey;
};

const adminNavItems: Array<{
  key: AdminNavItemKey;
  href: string;
  label: string;
  icon: typeof FileInput;
}> = [
  {
    key: "dashboard",
    href: "/admin",
    label: "概览",
    icon: LayoutDashboard,
  },
  {
    key: "import",
    href: "/admin/articles/import",
    label: "导入",
    icon: FileInput,
  },
  {
    key: "drafts",
    href: "/admin/articles/drafts",
    label: "草稿",
    icon: FilePenLine,
  },
  {
    key: "published",
    href: "/admin/articles/published",
    label: "已发布",
    icon: Newspaper,
  },
  {
    key: "links",
    href: "/admin/links",
    label: "外部链接",
    icon: Link2,
  },
  {
    key: "series",
    href: "/admin/series",
    label: "专题",
    icon: PanelsTopLeft,
  },
  {
    key: "feedback",
    href: "/admin/feedback",
    label: "反馈",
    icon: MessageSquareText,
  },
];

export function AdminNav({ active }: AdminNavProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
            <Home className="h-4 w-4" />
            返回网站首页
          </Link>
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            回到公开文章
          </Link>
        </div>
        <AdminLogoutButton />
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="后台导航">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 border px-3 text-sm font-semibold transition",
                isActive
                  ? "admin-btn admin-btn-primary border-accent"
                  : "admin-btn admin-btn-secondary text-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
