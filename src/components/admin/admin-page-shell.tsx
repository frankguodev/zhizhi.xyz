import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";

type AdminSection = "dashboard" | "import" | "drafts" | "published" | "links" | "series" | "feedback";

type AdminPageShellProps = {
  active: AdminSection;
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  maxWidth?: "6xl" | "7xl";
  children: ReactNode;
};

export function AdminPageShell({
  active,
  eyebrow,
  title,
  description,
  actions,
  maxWidth = "7xl",
  children,
}: AdminPageShellProps) {
  const widthClass = maxWidth === "6xl" ? "max-w-6xl" : "max-w-7xl";

  return (
    <main className="admin-page min-h-screen bg-background">
      <header className="border-b border-line bg-surface">
        <div className={`mx-auto ${widthClass} px-4 py-8 sm:px-6 sm:py-10`}>
          <AdminNav active={active} />
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-accent">{eyebrow}</p>
              <h1 className="mt-3 break-words text-3xl font-semibold text-foreground [overflow-wrap:anywhere] sm:text-4xl">{title}</h1>
              {description ? <p className="mt-4 max-w-3xl break-words leading-7 text-muted [overflow-wrap:anywhere]">{description}</p> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      </header>

      <section className={`mx-auto ${widthClass} px-4 py-8 sm:px-6 sm:py-10`}>{children}</section>
    </main>
  );
}
