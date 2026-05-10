import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AnonymousFeedbackWorkbench } from "@/components/admin/anonymous-feedback-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAnonymousFeedback } from "@/lib/anonymous-feedback";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "匿名反馈管理",
  description: "查看和处理读者提交的匿名反馈。",
  robots: {
    index: false,
    follow: false,
  },
};

async function getFeedback() {
  try {
    const feedback = await listAnonymousFeedback({ limit: 120 });
    return { feedback, error: "", hint: "" };
  } catch (error) {
    return {
      feedback: [],
      error: error instanceof Error ? error.message : "数据库读取失败",
      hint: "如果你在本地 next dev 下看到这个错误，请先创建 D1 数据库并应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    };
  }
}

export default async function AdminFeedbackPage() {
  await requireAdminPage("/admin/feedback");
  const { feedback, error, hint } = await getFeedback();

  return (
    <AdminPageShell active="feedback" eyebrow="反馈管理" title="匿名意见反馈" description="查看读者提交的文章反馈和站点体验反馈，支持标记处理、归档和删除。">
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950" role="alert">
          <h2 className="font-semibold">暂时无法读取 D1 匿名反馈</h2>
          <p className="mt-2 whitespace-pre-line leading-7">{error}</p>
          {hint ? <p className="mt-2 whitespace-pre-line leading-7">{hint}</p> : null}
        </div>
      ) : (
        <AnonymousFeedbackWorkbench initialFeedback={feedback} />
      )}
    </AdminPageShell>
  );
}
