import { Suspense } from "react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { SiteLogoMark } from "@/components/layout/site-logo-mark";

export const metadata = {
  title: "后台登录",
  description: "登录知之后台管理系统。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <main className="admin-page site-grid min-h-screen bg-background">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_26rem]">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <SiteLogoMark className="h-11 w-11" />
            <div>
              <p className="text-sm font-semibold text-accent">ZhiZhi Admin</p>
              <p className="text-sm text-muted">知之后台管理</p>
            </div>
          </div>
          <h1 className="mt-8 text-4xl font-semibold text-foreground sm:text-5xl">回到内容中枢</h1>
          <p className="mt-5 max-w-xl leading-7 text-muted">
            后台登录沿用网站的知识脉络视觉系统，但使用独立管理员会话。生产环境建议在 `/admin/*` 前再叠加 Cloudflare Access。
          </p>
          <div className="vein-map glass-surface tech-border mt-8 grid gap-3 rounded-md p-4 text-sm text-muted sm:grid-cols-3">
            <span className="admin-muted-pill px-3 py-2 font-semibold text-accent">Markdown 导入</span>
            <span className="admin-muted-pill px-3 py-2 font-semibold text-accent">发布审核</span>
            <span className="admin-muted-pill px-3 py-2 font-semibold text-accent">内容维护</span>
          </div>
        </div>
        <div className="admin-surface bg-surface/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
          <div className="mb-5">
            <p className="text-sm font-semibold text-accent">Admin Console</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">后台登录</h2>
          </div>
          <Suspense>
            <AdminLoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
