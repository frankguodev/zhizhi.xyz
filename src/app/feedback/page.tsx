import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AnonymousFeedbackForm } from "@/components/content/anonymous-feedback-form";

const title = "意见反馈";
const description = "对知之的任何建议、问题或想看的内容都可以在这里留言，匿名提交，联系方式可不填。";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "/feedback",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function FeedbackPage() {
  return (
    <>
      <SiteHeader currentPath="/feedback" />

      <main className="site-grid min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6">
          <section className="py-8 md:py-10">
            <p className="eyebrow text-accent">意见反馈</p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>

            <div className="mt-7 rounded-md bg-surface/58 px-4 py-5 sm:px-6 sm:py-6">
              <AnonymousFeedbackForm locale="zh" pageUrl="/feedback" feedbackType="site" variant="page" />
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
