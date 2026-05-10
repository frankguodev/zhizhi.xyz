import assert from "node:assert/strict";

const baseUrl = process.env.ADMIN_REGRESSION_BASE_URL ?? "http://127.0.0.1:8787";
const email = process.env.ADMIN_REGRESSION_EMAIL ?? "admin-regression@example.com";
const password = process.env.ADMIN_REGRESSION_PASSWORD ?? "Local-regression-12345!";
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const slug = `admin-regression-${stamp}`;
const title = `后台回归测试文章 ${stamp}`;
let cookieHeader = "";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 120000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/admin/login`, { signal: AbortSignal.timeout(2500) });
      if (response.status < 500) {
        return;
      }
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(1500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError}`);
}

function updateCookies(response) {
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const fallback = response.headers.get("set-cookie");
  const values = setCookies.length > 0 ? setCookies : fallback ? [fallback] : [];

  if (values.length === 0) {
    return;
  }

  const current = new Map(
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const index = entry.indexOf("=");
        return [entry.slice(0, index), entry.slice(index + 1)];
      }),
  );

  for (const value of values) {
    const pair = value.split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) {
      current.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }

  cookieHeader = Array.from(current.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function request(pathname, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (cookieHeader && !headers.has("Cookie")) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(`${baseUrl}${pathname}`, { ...init, headers });
  updateCookies(response);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text().catch(() => "");

  return { response, body };
}

function errorMessage(body, fallback) {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    const hint = "hint" in body && typeof body.hint === "string" ? `\n${body.hint}` : "";
    return `${body.error}${hint}`;
  }

  return fallback;
}

async function expectOk(pathname, init, label) {
  const { response, body } = await request(pathname, init);
  assert.ok(response.ok, `${label} failed: ${response.status}\n${errorMessage(body, JSON.stringify(body))}`);
  return body;
}

function articleMarkdown(extra = "") {
  return `---
title: "${title}"
slug: "${slug}"
summary: "这是一篇用于后台完整链路回归测试的临时文章，覆盖 Markdown 导入、草稿保存、编辑、媒体上传、发布、专题挂载和外链展示。"
category: "回归测试"
tags:
  - "后台"
  - "回归测试"
  - "Cloudflare"
visibility: "public"
locale: "zh"
reading_minutes: 3
published_at: "2026-05-06"
updated_at: "2026-05-06"
supports_reading_mode: true
default_reading_mode: "full"

seo:
  title: "${title}"
  description: "用于验证知之后台文章导入、草稿保存、编辑、媒体上传、发布、专题挂载和外链展示的完整回归测试文章。"
  keywords:
    - "后台回归测试"
    - "Markdown 导入"
    - "Cloudflare R2"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "${title}"
  description: "验证知之后台发布链路是否可以端到端跑通。"
  type: "article"
  image: ""
  image_alt: ""

twitter:
  card: "summary_large_image"
  title: "${title}"
  description: "验证知之后台发布链路是否可以端到端跑通。"
  image: ""

content:
  article_type: "方法型"
  difficulty: "beginner"
  audience:
    - "后台回归测试"
  primary_topic: "后台发布链路回归"

source:
  source_type: "mixed"
  ai_assisted: false
  human_reviewed: true
  original_sources:
    - "自动化回归测试"
  source_note: "这是一篇本地/测试环境自动化回归测试文章，不用于正式内容发布。"

structured_data:
  schema_type: "Article"
  author_name: "知之"
  publisher_name: "知之"
  in_language: "zh-CN"
---

# ${title}

## 文章一览

- 验证后台 Markdown 预览是否可用。
- 验证草稿保存和再次编辑是否可用。
- 验证媒体上传和发布文章是否可用。
- 验证专题挂载和文章底部外链是否可用。

## 回归测试目标

这篇临时文章用于验证知之后台完整发布链路。它不会作为正式内容使用，只用于本地或测试环境确认功能是否正常。

:::detail 为什么需要临时文章
后台发布链路跨过 D1、R2、Markdown 解析、质量检查、专题和公开 API。只测单个接口，很容易漏掉真实发布流程中的问题。
:::

## 编辑后的内容

如果你能在公开文章 API 中看到这一段，说明草稿编辑、保存和发布已经生效。

${extra}

:::warning 测试数据不要发布到生产内容区
这篇文章只应该存在于本地或测试环境。正式生产环境回归时，应使用专门的测试数据清理流程。
:::
`;
}

async function login() {
  const body = await expectOk(
    "/api/admin/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    "admin login",
  );

  assert.equal(body.user?.role, "admin");
  assert.match(cookieHeader, /zz_admin_session=/);
  console.log("ok login");
}

async function uploadTinyPng() {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
  const formData = new FormData();
  formData.append("file", new Blob([png], { type: "image/png" }), `${slug}.png`);

  const body = await expectOk(
    "/api/admin/media",
    {
      method: "POST",
      body: formData,
    },
    "media upload",
  );

  assert.match(body.media?.url ?? "", /^\/media\/articles\//);
  console.log("ok media upload");
  return body.media;
}

async function run() {
  await waitForServer();
  await login();

  await expectOk(
    "/api/admin/articles/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: articleMarkdown() }),
    },
    "article preview",
  );
  console.log("ok article preview");

  const saved = await expectOk(
    "/api/admin/articles/drafts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: articleMarkdown() }),
    },
    "save draft",
  );
  assert.equal(saved.draft?.slug, slug);
  console.log("ok save draft");

  const media = await uploadTinyPng();
  const imageMarkdown = media.markdown ?? `![${slug}](${media.url})`;
  const updatedMarkdown = articleMarkdown(imageMarkdown);

  await expectOk(
    `/api/admin/articles/drafts/zh/${slug}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: updatedMarkdown }),
    },
    "edit draft",
  );
  console.log("ok edit draft");

  const published = await expectOk(`/api/admin/articles/drafts/zh/${slug}/publish`, { method: "POST" }, "publish draft");
  assert.equal(published.published?.slug, slug);
  console.log("ok publish draft");

  const articleDetail = await expectOk(`/api/public/articles/${slug}?locale=zh`, undefined, "public article detail");
  assert.equal(articleDetail.article?.slug, slug);
  assert.ok(Array.isArray(articleDetail.content?.blocks));
  console.log("ok public article detail");

  const seriesPayload = await expectOk("/api/admin/series", undefined, "load admin series payload");
  const articleChoice = seriesPayload.articleChoices?.find((item) => item.slug === slug);
  assert.ok(articleChoice?.id, "published article should be available for series choices");

  const seriesSlug = `regression-series-${stamp}`;
  await expectOk(
    "/api/admin/series",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "zh",
        title: `后台回归专题 ${stamp}`,
        slug: seriesSlug,
        description: "用于验证后台专题挂载和公开专题详情的临时专题。",
        coverImage: null,
        status: "published",
        sortOrder: 9999,
        articleIds: [articleChoice.id],
      }),
    },
    "create published series",
  );
  console.log("ok create series");

  const seriesDetail = await expectOk(`/api/public/series/${seriesSlug}?locale=zh`, undefined, "public series detail");
  assert.equal(seriesDetail.series?.slug ?? seriesDetail.slug, seriesSlug);
  assert.ok((seriesDetail.articles ?? []).some((item) => item.slug === slug));
  console.log("ok public series detail");

  const linkTitle = `后台回归外链 ${stamp}`;
  await expectOk(
    "/api/admin/links",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "zh",
        title: linkTitle,
        description: "用于验证文章底部外链读取的临时链接。",
        url: `https://example.com/${slug}`,
        position: "article_footer",
        isActive: true,
        sortOrder: 9999,
      }),
    },
    "create external link",
  );
  console.log("ok create external link");

  const links = await expectOk("/api/public/links?locale=zh&position=article_footer", undefined, "public link list");
  assert.ok((links.links ?? []).some((item) => item.title === linkTitle));

  const articleWithLinks = await expectOk(`/api/public/articles/${slug}?locale=zh`, undefined, "public article detail with links");
  assert.ok((articleWithLinks.externalLinks ?? []).some((item) => item.title === linkTitle));
  console.log("ok external link display");

  console.log(`Admin regression passed for ${slug}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
