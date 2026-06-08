"use client";

import { ChevronDown, MessageSquareText, Send } from "lucide-react";
import { useMemo, useState } from "react";
type AnonymousFeedbackFormProps = {
  locale: string;
  pageUrl: string;
  articleSlug?: string;
  articleTitle?: string;
  feedbackType?: "article" | "site";
  variant?: "article" | "page";
};

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const copy = {
  eyebrow: "匿名反馈",
  description: "欢迎留一句真实反馈：错别字、没讲清楚的地方、想继续看的方向都可以。联系方式可不填。",
  contentLabel: "反馈内容",
  contentPlaceholder: "例如：这里的步骤 3 我没看懂；或者这个主题还想看一篇部署实战。",
  contactLabel: "联系方式（可选）",
  contactPlaceholder: "邮箱、X / Twitter、微信备注等，可不填",
  privacy: "会记录当前页面和提交时间；请不要提交密码、验证码、身份证等敏感信息。",
  submit: "提交反馈",
  submitting: "提交中",
  success: "收到啦，感谢你认真留下这一句。",
  contentRequired: "请先写一点反馈内容。",
  contentTooLong: "反馈内容最多 1200 个字符。",
  failed: "反馈暂时提交失败，请稍后再试。",
  tooFrequent: "提交得有点快，稍等一会儿再试。",
};

function getErrorMessage(status: number) {
  if (status === 429) {
    return copy.tooFrequent;
  }

  return copy.failed;
}

export function AnonymousFeedbackForm({ locale, pageUrl, articleSlug, articleTitle, feedbackType = "article", variant = "article" }: AnonymousFeedbackFormProps) {
  const pageCopy = copy;
  const isPageVariant = variant === "page";
  const [expanded, setExpanded] = useState(isPageVariant);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });
  const trimmedContent = content.trim();
  const remaining = 1200 - content.length;
  const canSubmit = trimmedContent.length > 0 && content.length <= 1200 && submitState.status !== "submitting";
  const statusClass = submitState.status === "error" ? "text-amber" : "text-accent";
  const submitLabel = submitState.status === "submitting" ? pageCopy.submitting : pageCopy.submit;
  const payload = useMemo(
    () => ({
      locale,
      pageUrl,
      articleSlug: articleSlug ?? "",
      articleTitle: articleTitle ?? "",
      feedbackType,
    }),
    [articleSlug, articleTitle, feedbackType, locale, pageUrl],
  );

  async function submitFeedback() {
    if (!trimmedContent) {
      setSubmitState({ status: "error", message: pageCopy.contentRequired });
      return;
    }

    if (content.length > 1200) {
      setSubmitState({ status: "error", message: pageCopy.contentTooLong });
      return;
    }

    setSubmitState({ status: "submitting", message: "" });

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...payload,
          content: trimmedContent,
          contact: contact.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(getErrorMessage(response.status));
      }

      setContent("");
      setContact("");
      setSubmitState({ status: "success", message: pageCopy.success });
    } catch (error) {
      setSubmitState({ status: "error", message: error instanceof Error ? error.message : pageCopy.failed });
    }
  }

  const body = (
      <div id="anonymous-feedback-body">
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{pageCopy.description}</p>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">{pageCopy.contentLabel}</span>
            <textarea
              className="min-h-28 resize-y rounded-md border border-line bg-background p-3 text-sm leading-6 text-foreground outline-none transition focus:border-accent"
              value={content}
              maxLength={1300}
              placeholder={pageCopy.contentPlaceholder}
              onChange={(event) => setContent(event.target.value)}
            />
            <span className={remaining < 0 ? "text-xs font-semibold text-amber" : "text-xs font-semibold text-muted"}>{remaining}</span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">{pageCopy.contactLabel}</span>
            <input
              className="h-11 rounded-md border border-line bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent"
              value={contact}
              maxLength={160}
              placeholder={pageCopy.contactPlaceholder}
              onChange={(event) => setContact(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs font-semibold leading-5 text-muted">{pageCopy.privacy}</p>
          <button
            type="button"
            className="hero-action hero-primary-action inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit}
            aria-busy={submitState.status === "submitting"}
            onClick={submitFeedback}
          >
            <Send className="h-4 w-4" />
            {submitLabel}
          </button>
        </div>

        {submitState.message ? (
          <p className={`mt-3 text-sm font-semibold ${statusClass}`} role={submitState.status === "error" ? "alert" : "status"}>
            {submitState.message}
          </p>
        ) : null}
      </div>
  );

  if (isPageVariant) {
    return (
      <section aria-labelledby="anonymous-feedback-title">
        <h2 id="anonymous-feedback-title" className="sr-only">
          {pageCopy.eyebrow}
        </h2>
        {body}
      </section>
    );
  }

  return (
    <section className="mt-7 border-t border-line pt-7" aria-labelledby="anonymous-feedback-title">
      <div>
        <button
          type="button"
          className="-mx-2 flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          aria-expanded={expanded}
          aria-controls="anonymous-feedback-body"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-accent/24 bg-accent/8 text-accent">
            <MessageSquareText className="h-5 w-5" />
          </span>
          <p id="anonymous-feedback-title" className="min-w-0 flex-1 text-sm font-semibold text-accent">
            {pageCopy.eyebrow}
          </p>
          <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded ? body : null}
      </div>
    </section>
  );
}
