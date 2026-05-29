import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  FileInput,
  FilePenLine,
  Home,
  LayoutDashboard,
  Link2,
  MessageSquareText,
  Newspaper,
  PanelsTopLeft,
} from "lucide-react";
import { AdminLogoutButton } from "@/components/auth/admin-logout-button";
import { cn } from "@/lib/utils";

export type AdminNavItemKey =
  | "dashboard"
  | "articleImport"
  | "articleDrafts"
  | "articlePublished"
  | "aiTermsAll"
  | "aiTermsImport"
  | "aiTermsDrafts"
  | "aiTermsPublished"
  | "aiTermsTaxonomy"
  | "links"
  | "series"
  | "feedback";

type AdminNavProps = {
  active: AdminNavItemKey;
};

type AdminNavItem = {
  key: AdminNavItemKey;
  href: string;
  label: string;
  icon: typeof FileInput;
};

const adminNavGroups: Array<{
  label: string;
  items: AdminNavItem[];
}> = [
  {
    label: "总览",
    items: [
      {
        key: "dashboard",
        href: "/admin",
        label: "概览",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "文章",
    items: [
      {
        key: "articleImport",
        href: "/admin/articles/import",
        label: "导入",
        icon: FileInput,
      },
      {
        key: "articleDrafts",
        href: "/admin/articles/drafts",
        label: "草稿",
        icon: FilePenLine,
      },
      {
        key: "articlePublished",
        href: "/admin/articles/published",
        label: "已发布",
        icon: Newspaper,
      },
    ],
  },
  {
    label: "AI 词条",
    items: [
      {
        key: "aiTermsAll",
        href: "/admin/ai-terms",
        label: "全部词条",
        icon: BookOpenText,
      },
      {
        key: "aiTermsImport",
        href: "/admin/ai-terms/import",
        label: "导入",
        icon: FileInput,
      },
      {
        key: "aiTermsDrafts",
        href: "/admin/ai-terms/drafts",
        label: "草稿",
        icon: FilePenLine,
      },
      {
        key: "aiTermsPublished",
        href: "/admin/ai-terms/published",
        label: "已发布",
        icon: Newspaper,
      },
      {
        key: "aiTermsTaxonomy",
        href: "/admin/ai-terms/taxonomy",
        label: "词条分类",
        icon: PanelsTopLeft,
      },
    ],
  },
  {
    label: "站点管理",
    items: [
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
    ],
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
      <nav className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:items-start sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0" aria-label="后台导航">
        {adminNavGroups.map((group) => (
          <section key={group.label} className="min-w-[max-content] snap-start space-y-2 sm:min-w-0">
            <h2 className="text-xs font-semibold text-muted">{group.label}</h2>
            <div className="flex gap-2 sm:flex-wrap">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === active;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 border px-3 text-sm font-semibold transition",
                      isActive ? "admin-btn admin-btn-primary border-accent" : "admin-btn admin-btn-secondary text-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}
