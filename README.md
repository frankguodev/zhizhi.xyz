# 知之 ZhiZhi

> 一个面向长期内容沉淀的个人知识分享系统。  
> A personal knowledge system for high-quality articles, an AI glossary, layered reading, publishing workflows, and learning paths.

知之不是一个传统按时间倒序排列的博客，而是一个围绕“文章质量、AI 词条库、分层阅读、专题路线、Markdown 发布、SEO 和可持续维护”设计的个人知识网站。

内容由三类形态组成：长篇**文章**、把文章串成阅读路线的**专题**，以及用「一图看懂 + 快速理解」拆解 AI 术语的**词条**。

项目当前运行目标是：

- 让读者可以快速找到、读懂并继续追踪高质量文章，并用词条快速建立 AI 概念。
- 让作者可以从 Obsidian / Markdown / AI 辅助草稿顺畅进入后台发布流程。
- 让内容通过专题、分类、质量检查和结构化 metadata 逐步变成可复用的知识系统。

线上域名规划：`https://zhizhi.xyz`

## 目录

- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [项目结构](#项目结构)
- [本地开发](#本地开发)
- [Cloudflare 部署](#cloudflare-部署)
- [内容发布流程](#内容发布流程)
- [Markdown 文章格式](#markdown-文章格式)
- [后台管理](#后台管理)
- [数据模型](#数据模型)
- [常用命令](#常用命令)
- [验证与质量检查](#验证与质量检查)
- [上线前检查清单](#上线前检查清单)
- [安全与隐私](#安全与隐私)
- [编码规范](#编码规范)
- [路线图](#路线图)
- [常见问题](#常见问题)

## 核心特性

### 公开阅读体验

- 首页展示最新文章、热门文章、精选专题和外部线索。
- 文章列表支持关键词、分类和排序筛选。
- 文章详情支持阅读次数、点赞、更新时间、上一篇/下一篇、目录导航和匿名反馈。
- 专题页把多篇文章组织成连续阅读路线。
- AI 词条库 `/ai-terms` 列表 + `/ai-terms/[slug]` 详情，支持按分类、难度筛选和排序，并展示热度与趋势。
- 工具页 `/tools` 提供 JSON、编码、Diff、LLM Token 计数、图片、二维码等在浏览器本地运行的实用工具。
- 中英文路由已预留并部分实现：`/`、`/en`、`/articles`、`/en/articles`、`/series`、`/en/series`。

### 分层阅读

文章支持自定义 Markdown directive 块：

- `:::detail`：详细解释。
- `:::example`：具体例子。
- `:::warning`：容易踩坑。
- `:::advanced`：进阶理解。
- `:::author`：作者经验。

读者可以在快速阅读和完整阅读之间切换。普通正文保持完整主线，分层块用于补充解释、案例、风险和经验。

### AI 词条库

词条是与文章、专题并列的内容形态，专门拆解 AI 术语：

- 详情页围绕「一图看懂」信息图、一句话概念、快速理解、相关概念和参考资料组织，帮助快速建立概念。
- 列表页支持分类、难度筛选、排序和服务端分页，并展示热度与趋势，适合从几条增长到成百上千条。
- 每条词条带标准分类（主分类 + 可选副分类）和词条间关系；尚未建立的关联会作为候选关系保存，前台暂不展示。
- 「一图看懂」信息图统一压缩为 100KB 以内的优化 WebP（优先 1600×900，必要时降级 1280×720），存储在 R2。
- 数据结构含 `locale` 和 `translation_key`，为中英文词条对照预留。

### 内容后台

- Markdown 导入：解析 frontmatter、正文和分层块。
- 草稿管理：保存草稿、编辑、预览、质量检查和发布。
- 已发布文章管理：更新、下架、恢复和删除。
- 图片上传：上传到 R2，返回可插入正文的 Markdown 图片语法。
- 专题管理：创建专题、排序文章、发布和归档。
- 词条管理：导入、草稿、发布、批量操作、分类（taxonomy）维护和「一图看懂」图上传，发布前同样走质量检查。
- 外部链接管理：首页、文章页、捐赠页和站点底部链接配置。
- 匿名反馈管理：查看、标记、归档和删除读者反馈。

### SEO 与结构化数据

- `sitemap.xml` 和 `robots.txt` 由 App Router 动态生成。
- 文章 frontmatter 支持 `seo`、`open_graph`、`twitter`、`content`、`source`、`structured_data`。
- 文章页生成 canonical、robots、Open Graph、Twitter Card 和 Article 结构化数据。
- 词条同样输出 canonical、Open Graph 和结构化数据，列表页带 `ItemList` JSON-LD。
- 隐藏内容默认不进入公开列表。

### Cloudflare 原生部署

- Next.js 通过 OpenNext Cloudflare 适配到 Cloudflare Workers。
- D1 存储文章、词条、专题、后台配置、统计和反馈。
- R2 存储文章图片、封面图、词条「一图看懂」图和 OpenNext 缓存对象。
- 测试环境和生产环境使用独立 Worker、D1、R2 配置。

## 技术栈

以 `package.json` 为准，当前主要技术栈如下：

| 方向 | 技术 |
| --- | --- |
| 应用框架 | Next.js 16.2.4 App Router |
| UI | React 19.2.4, Tailwind CSS v4, lucide-react |
| 语言 | TypeScript |
| 数据库 | Cloudflare D1 |
| ORM | Drizzle ORM / Drizzle Kit |
| 对象存储 | Cloudflare R2 |
| 部署 | Cloudflare Workers, OpenNext Cloudflare |
| Markdown | unified, remark-parse, remark-gfm, remark-directive, remark-rehype, rehype-stringify, rehype-pretty-code |
| 校验 | Zod |
| 工具 | Wrangler, ESLint |

重要约束：

- 本项目使用 Next.js `16.2.4`，App Router 中 `params` 和 `searchParams` props 是 Promise。
- 普通 `npm run dev` 适合页面和基础交互开发，但不完整模拟 Cloudflare D1/R2 binding。
- 涉及 D1/R2/Worker 行为时，优先使用 Cloudflare preview 或测试环境部署验证。

## 系统架构

```text
Markdown / Obsidian / AI draft
        |
        v
Admin Markdown Import
        |
        +--> Preview / Quality Report
        |
        v
Cloudflare D1
  - articles
  - ai_terms (+ categories / relations)
  - categories
  - series
  - links
  - feedback
  - views / likes
        |
        v
Next.js App Router on Cloudflare Workers
        |
        +--> Public pages: home / articles / ai-terms / series / tools / legal
        +--> Admin pages: import / drafts / published / ai-terms / series / links / feedback
        +--> API routes: public data / admin CRUD / media / likes / views / feedback
        |
        v
Cloudflare R2
  - article media
  - ai-term diagrams
  - OpenNext cache
```

前台普通用户系统目前软下线。公开阅读不依赖读者登录；后台管理员系统独立保留。

## 项目结构

```text
src/
  app/
    page.tsx                         首页
    articles/                        文章列表、详情、分类、标签、质量页
    ai-terms/                        词条列表和词条详情
    series/                          专题列表和专题详情
    tools/                           工具页
    admin/                           后台页面（含 ai-terms 词条工作台）
    api/                             API route
    media/[...key]/                  R2 媒体读取路由
    sitemap.ts                       sitemap.xml
    robots.ts                        robots.txt

  components/
    admin/                           后台工作台组件
    content/                         前台内容、文章阅读器、专题、首页组件
    layout/                          站点导航和页脚
    auth/                            后台登录和保留的认证组件

  db/
    schema.ts                        Drizzle schema
    client.ts                        D1 / Drizzle 客户端

  lib/
    article-import.ts                Markdown frontmatter 解析
    markdown.ts                      Markdown 和分层块解析
    article-quality.ts               文章质量检查
    article-drafts.ts                草稿、发布和后台文章服务
    public-articles.ts               公开文章查询
    public-article-detail.ts         文章详情查询和导航
    ai-terms.ts                      词条查询、列表筛选和详情
    ai-term-import.ts                词条 Markdown / frontmatter 解析
    ai-term-quality.ts               词条质量检查
    ai-term-standard-categories.ts   词条标准分类
    ai-term-structured-data.ts       词条结构化数据
    series.ts                        专题查询和管理
    media.ts                         R2 媒体上传和删除
    admin-auth.ts                    后台鉴权
    article-likes.ts                 匿名点赞
    article-views.ts                 阅读次数
    anonymous-feedback.ts            匿名反馈

drizzle/                             D1 migrations
scripts/                             管理员、测试、编码检查和 ai-term 工作流脚本
docs/                                项目记忆、工作流提示词和问题记录
  aiterms-workflow/                  词条生成工作流提示词（单条 99 / 批量 98 等）
summery/                             内容生产过程文件
  aiterms/                           词条生产产物（pro / diagram / story / sources ...）
public/                              静态资源
wrangler.example.toml                Cloudflare Workers 配置模板
```

## 本地开发

### 环境要求

- Node.js 20 LTS 或更高版本。
- npm。
- Cloudflare 账号，仅在使用 D1/R2、preview 或部署时需要。

检查版本：

```bash
node -v
npm -v
```

### 安装依赖

```bash
npm ci
```

如果没有 `package-lock.json`，或需要重新解析依赖：

```bash
npm install
```

### 环境变量

创建 `.env.local`：

```bash
AUTH_SECRET="replace-with-a-long-random-secret"
```

`AUTH_SECRET` 用于签名后台登录 Cookie。开发环境没有配置时可以使用临时值，但测试和生产环境必须设置强随机密钥。

如果要让 Drizzle Kit 通过 Cloudflare HTTP API 访问远程 D1，还需要：

```bash
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_DATABASE_ID="your-d1-database-id"
CLOUDFLARE_D1_TOKEN="your-api-token"
```

不要把真实密钥提交到 Git。

### 启动普通开发服务器

```bash
npm run dev
```

默认地址：`http://localhost:3000`

普通 dev server 适合开发 UI、路由、组件状态和大部分非 Cloudflare binding 逻辑。涉及 R2 上传、D1 binding 或 Worker 运行时差异时，请使用 Cloudflare preview。

### 初始化本地 D1

```bash
npm run db:migrate:local
```

测试环境的本地 D1：

```bash
npm run db:migrate:test:local
```

### 创建本地管理员

前台普通注册已软下线，后台第一次使用建议直接创建管理员：

```bash
npm run admin:create:local -- your-email@example.com --password your-strong-password
```

如果使用本地 test D1：

```bash
npm run admin:create:test:local -- your-email@example.com --password your-strong-password
```

## Cloudflare 部署

### 登录 Cloudflare

首次使用 Wrangler 前，需要在本机登录 Cloudflare：

```bash
npx wrangler login
```

确认当前登录账号：

```bash
npx wrangler whoami
```

如果需要切换 Cloudflare 账号，可以先退出再重新登录：

```bash
npx wrangler logout
npx wrangler login
```

如果在 CI/CD 或无浏览器环境中部署，不使用 `wrangler login`，而是配置 Cloudflare API Token。Token 不要写进仓库，放到部署平台的环境变量或 secret 里。

### 准备 Wrangler 配置

公开仓库只建议提交 `wrangler.example.toml`，真实 `wrangler.toml` 不提交。首次部署前，先复制模板：

PowerShell：

```powershell
Copy-Item wrangler.example.toml wrangler.toml
```

Bash：

```bash
cp wrangler.example.toml wrangler.toml
```

然后把真实 `account_id`、Worker 名称、D1 `database_id` 和 R2 bucket 名称填入本地 `wrangler.toml`。

如果 `wrangler.toml` 已经被 Git 追踪，公开仓库前需要先从索引中移除它，再保留本地文件：

```bash
git rm --cached wrangler.toml
```

这个命令只取消 Git 追踪，不删除本地 `wrangler.toml`。

### 资源准备

生产环境需要：

- Cloudflare Workers
- Cloudflare D1：`zhizhi`
- Cloudflare R2 bucket：`zhizhi-opennext-cache`
- Cloudflare R2 bucket：`zhizhi-media`
- Wrangler secret：`AUTH_SECRET`

测试环境需要：

- Worker：`zhizhi-test`
- D1：`zhizhi-test`
- R2 bucket：`zhizhi-test-opennext-cache`
- R2 bucket：`zhizhi-test-media`
- Wrangler secret：`AUTH_SECRET --env test`

创建资源示例：

```bash
npx wrangler d1 list
npx wrangler r2 bucket list

npx wrangler d1 create zhizhi
npx wrangler r2 bucket create zhizhi-opennext-cache
npx wrangler r2 bucket create zhizhi-media

npx wrangler d1 create zhizhi-test
npx wrangler r2 bucket create zhizhi-test-opennext-cache
npx wrangler r2 bucket create zhizhi-test-media
```

将 `wrangler d1 create` 返回的真实 `database_id` 填入本地 `wrangler.toml`。`wrangler.example.toml` 中的 `database_id` 是占位值，不能直接用于生产部署。

公开仓库建议不要提交真实 `wrangler.toml`。更稳的做法是提交 `wrangler.example.toml`，真实 `account_id`、`database_id`、bucket 名称和 Worker 名称只保留在本地或部署环境中。

### 设置密钥

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_SECRET --env test
```

### 应用 migration

远程测试 D1：

```bash
npm run db:migrate:test
```

生产 D1：

```bash
npx wrangler d1 migrations apply zhizhi --remote --config wrangler.toml
```

### 测试环境部署

```bash
npm run cf:build:test
npm run cf:deploy:test
```

部署成功后，使用 Cloudflare 返回的 `zhizhi-test.*.workers.dev` 地址进行回归测试。

远程测试环境管理员：

```bash
npm run admin:create:test -- your-email@example.com --password your-strong-password
```

### 生产部署

```bash
npm run cf:build
npm run cf:deploy
```

生产环境管理员：

```bash
npm run admin:create:remote -- your-email@example.com --password your-strong-password
```

### Cloudflare preview

本地模拟 Worker、D1、R2：

```bash
npm run cf:preview
```

测试环境本地 preview：

```bash
npm run cf:preview:test
```

使用远程 test binding 联调：

```bash
npm run dev:remote
```

## 内容发布流程

推荐内容流：

1. 收集资料：AI 对话、网页资料、个人笔记、实操记录。
2. 原始归档：整理到 `summery/00_raw_sources`。
3. 建立任务：保存选题、读者、目标和边界。
4. 初始内容：整理为可继续加工的 Markdown 底稿。
5. 分层大纲：规划普通正文和 `detail/example/warning/advanced/author` 分层块。
6. 初稿：生成可导入后台的 Markdown。
7. 人工二创：补充判断、经验、图片、来源和事实核查。
8. 发布检查：检查快速模式、SEO、来源、风险和 frontmatter。
9. 后台导入：粘贴 Markdown，预览解析结果和质量报告。
10. 保存草稿：进入草稿编辑页继续修订。
11. 发布：通过后台发布到 D1，前台文章列表和详情页自动读取。

`docs/` 中保留了文章生成工作流提示词，可用于半自动推进内容生产：

- `99-文章生成工作流总控_prompt.md`
- `00-文章任务建档_prompt.md`
- `00-原始资料归档_prompt.md`
- `03-初始内容_prompt.md`
- `04-分层阅读大纲_prompt.md`
- `05-初稿_prompt.md`
- `06-快速模式检查_prompt.md`
- `07-预备发布稿_prompt.md`
- `08-发布质量检查_prompt.md`

### 词条生产流程

AI 词条有独立的生成工作流，提示词在 `docs/aiterms-workflow/`，配套脚本统一以 `ai-term:` 为前缀（见[常用命令](#常用命令)）：

- 单条：`99-AI词条一键生成上线稿_prompt.md`，从生成 `pro` 上线候选稿到按需产出「一图看懂」、寓言故事并同步草稿。
- 批量：`98-AI词条批量生成_prompt.md`，读取清单逐条调度，单条流程仍以 99 为准。
- 同步只入草稿（`status: "draft"`），不自动发布；同步前会先查目标库是否已存在同 `locale + slug` 词条，已存在默认停止，避免覆盖人工编辑。

## Markdown 文章格式

后台导入文章需要 frontmatter。示例：

```md
---
title: "文章标题"
slug: "article-slug"
summary: "文章摘要。"
category: "AI实践"
tags:
  - "AI"
visibility: "public"
locale: "zh"
reading_minutes: 8
published_at: "2026-05-10"
updated_at: "2026-05-10"
supports_reading_mode: true
default_reading_mode: "quick"

seo:
  title: "SEO 标题"
  description: "SEO 描述。"
  keywords:
    - "关键词"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "Open Graph 标题"
  description: "Open Graph 描述。"
  type: "article"
  image: ""
  image_alt: ""

twitter:
  card: "summary_large_image"
  title: "Twitter 标题"
  description: "Twitter 描述。"
  image: ""

content:
  article_type: "方法型"
  difficulty: "beginner"
  primary_topic: "主题"

source:
  source_type: "mixed"
  ai_assisted: true
  human_reviewed: true
  source_note: "来源说明。"

structured_data:
  schema_type: "Article"
  author_name: "Frank Guo"
  publisher_name: "知之"
  in_language: "zh-CN"
---

## 文章一览

- 你会看到什么。

正文主线。

:::detail 为什么这样做
这里放详细解释。
:::

:::example 一个例子
这里放具体案例。
:::

:::warning 容易踩坑
这里放风险提醒。
:::

:::advanced 进阶理解
这里放深入内容。
:::

:::author 我的经验
这里放作者实践经验。
:::
```

### visibility

| 值 | 行为 |
| --- | --- |
| `public` | 公开文章，进入列表、专题和详情页。 |
| `login` | 当前前台用户系统软下线期间不形成登录墙；是否索引由 frontmatter 的 robots 决定。 |
| `hidden` | 不进入公开列表和专题，通常用于暂不公开内容。 |

## 后台管理

后台入口：

```text
/admin/login
```

主要页面：

| 页面 | 用途 |
| --- | --- |
| `/admin` | 后台概览 |
| `/admin/articles/import` | Markdown 导入 |
| `/admin/articles/drafts` | 草稿列表 |
| `/admin/articles/drafts/[locale]/[slug]` | 草稿编辑与发布 |
| `/admin/articles/published` | 已发布文章管理 |
| `/admin/articles/published/[locale]/[slug]` | 已发布文章编辑 |
| `/admin/ai-terms` | 词条概览 |
| `/admin/ai-terms/import` | 词条 Markdown 导入 |
| `/admin/ai-terms/drafts` | 词条草稿列表 |
| `/admin/ai-terms/published` | 已发布词条管理 |
| `/admin/ai-terms/[locale]/[slug]` | 词条编辑与发布 |
| `/admin/ai-terms/taxonomy` | 词条分类管理 |
| `/admin/series` | 专题管理 |
| `/admin/links` | 外部链接管理 |
| `/admin/feedback` | 匿名反馈管理 |

后台认证与前台普通用户认证隔离：

- 后台 Cookie：`zz_admin_session`
- 前台保留 Cookie：`zz_session`
- 后台 token 类型：`typ=admin`
- 后台 API：`/api/admin/*`
- 后台页面和 API 都会检查数据库中的 `role === "admin"`

生产环境建议再加一层 Cloudflare Access：

```text
Cloudflare Access -> /admin/login -> zz_admin_session -> role === admin
```

## 数据模型

当前 D1 表包括：

| 表 | 用途 |
| --- | --- |
| `users` | 用户和后台管理员账号 |
| `categories` | 标准分类 |
| `tags` | 标签 |
| `articles` | 文章主体、SEO、发布状态和阅读配置 |
| `article_tags` | 文章和标签关联 |
| `ai_terms` | 词条主体、SEO、发布状态、热度和质量分 |
| `ai_term_categories` | 词条标准分类 |
| `ai_term_category_relations` | 词条和分类关联 |
| `ai_term_relations` | 已建立的词条间关系 |
| `ai_term_relation_candidates` | 尚未建立的候选关系（前台暂不展示） |
| `series` | 专题 |
| `series_articles` | 专题文章排序关系 |
| `external_links` | 首页、文章页、捐赠页和站点底部外链 |
| `article_likes` | 匿名设备维度点赞 |
| `article_views` | 匿名设备维度阅读次数 |
| `anonymous_feedback` | 匿名反馈 |
| `admin_operation_logs` | 后台文章操作记录 |
| `favorites` | 前台收藏能力保留表 |
| `reading_histories` | 前台阅读历史能力保留表 |

当前 migration：

```text
drizzle/
  0000_sturdy_deadpool.sql
  0001_broad_black_knight.sql
  0002_admin_operation_logs.sql
  0003_article_likes.sql
  0004_article_views.sql
  0005_anonymous_feedback.sql
  0006_ai_terms.sql
  0007_ai_term_diagram_image.sql
  0008_remove_ai_term_tags.sql
  0009_seed_ai_term_standard_categories.sql
  0010_ai_term_relation_candidates.sql
```

## 常用命令

### 开发与构建

| 命令 | 实际执行 | 说明 |
| --- | --- | --- |
| `npm run dev` | `next dev` | 启动普通 Next.js 开发服务器，适合页面、组件和大多数前端交互开发。 |
| `npm run dev:next` | `next dev` | `dev` 的显式别名，方便和 Cloudflare dev 命令区分。 |
| `npm run build` | `next build --webpack` | Next.js 生产构建。当前显式使用 webpack，以保持 Next.js 16 + Windows + OpenNext 工作流稳定。 |
| `npm run start` | `next start` | 启动 Next.js 生产服务器。注意它不是 Cloudflare Worker 运行环境。 |
| `npm run lint` | `eslint && npm run encoding:check` | 运行 ESLint，并检查文本文件是否存在 UTF-8 BOM。 |

### Cloudflare / OpenNext

账号和资源基础操作：

| 命令 | 说明 |
| --- | --- |
| `npx wrangler login` | 在本机打开浏览器登录 Cloudflare，首次使用 Wrangler、远程 preview 或部署前需要执行。 |
| `npx wrangler whoami` | 查看当前 Wrangler 登录的 Cloudflare 账号，避免部署到错误账号。 |
| `npx wrangler logout` | 退出当前 Cloudflare 登录状态，切换账号前使用。 |
| `npx wrangler d1 list` | 查看当前账号下的 D1 数据库。 |
| `npx wrangler d1 create zhizhi` | 创建生产 D1，并把返回的 `database_id` 写入真实 `wrangler.toml`。 |
| `npx wrangler d1 create zhizhi-test` | 创建测试 D1，并把返回的 `database_id` 写入 `env.test` 配置。 |
| `npx wrangler r2 bucket list` | 查看当前账号下的 R2 bucket。 |
| `npx wrangler r2 bucket create zhizhi-media` | 创建生产文章媒体 bucket。 |
| `npx wrangler r2 bucket create zhizhi-opennext-cache` | 创建生产 OpenNext 缓存 bucket。 |
| `npx wrangler r2 bucket create zhizhi-test-media` | 创建测试文章媒体 bucket。 |
| `npx wrangler r2 bucket create zhizhi-test-opennext-cache` | 创建测试 OpenNext 缓存 bucket。 |
| `npx wrangler secret put AUTH_SECRET` | 设置生产 Worker 的后台登录签名密钥。 |
| `npx wrangler secret put AUTH_SECRET --env test` | 设置测试 Worker 的后台登录签名密钥。 |

项目脚本：

| 命令 | 实际执行 | 说明 |
| --- | --- | --- |
| `npm run cf:build` | `opennextjs-cloudflare build --config wrangler.toml` | 使用真实生产配置将 Next.js 应用构建为 Cloudflare Workers 可运行产物，输出到 `.open-next/`。 |
| `npm run cf:build:test` | `opennextjs-cloudflare build --config wrangler.toml --env=test` | 使用 `wrangler.toml` 的 `env.test` 配置构建测试环境产物。 |
| `npm run cf:preview` | `npm run cf:build && opennextjs-cloudflare preview --config wrangler.toml` | 使用真实生产配置构建并启动本地 Cloudflare preview，适合验证 D1/R2/Worker binding。 |
| `npm run cf:preview:test` | `npm run cf:build:test && opennextjs-cloudflare preview --config wrangler.toml --env=test` | 使用 test 配置启动本地 preview，默认连接本地 test D1/R2 模拟数据。 |
| `npm run cf:preview:test:remote` | `npm run cf:build:test && opennextjs-cloudflare preview --config wrangler.toml --env=test --remote` | 使用 test 配置和远程 Cloudflare binding 联调，适合验证远程 D1/R2 行为。 |
| `npm run cf:preview:only` | `opennextjs-cloudflare preview --config wrangler.toml` | 复用已有 `.open-next/` 产物并使用真实生产配置直接启动 preview，不重新构建。 |
| `npm run cf:deploy` | `opennextjs-cloudflare deploy --config wrangler.toml` | 使用真实生产配置部署生产 Worker。部署前应确认生产 D1/R2、secret 和 migration 已准备好。 |
| `npm run cf:deploy:test` | `opennextjs-cloudflare deploy --config wrangler.toml --env=test` | 部署测试 Worker，优先用于上线前验证。 |
| `npm run dev:cf:local` | `npm run cf:preview:test` | 本地 test Cloudflare preview 的别名。 |
| `npm run dev:remote` | `npm run cf:preview:test:remote` | 远程 test binding 联调别名。 |
| `npm run dev:remote:restart` | `node scripts/remote-stop.mjs && npm run dev:remote` | 停止残留远程联调进程后重新启动。 |
| `npm run remote:stop` | `node scripts/remote-stop.mjs` | 停止远程联调相关残留进程。 |

### 数据库

| 命令 | 实际执行 | 说明 |
| --- | --- | --- |
| `npm run db:generate` | `drizzle-kit generate` | 根据 `src/db/schema.ts` 生成新的 Drizzle migration。 |
| `npm run db:migrate:local` | `wrangler d1 migrations apply zhizhi --local --config wrangler.toml` | 将 `drizzle/` migrations 应用到本地生产名 D1。 |
| `npm run db:migrate:test:local` | `wrangler d1 migrations apply zhizhi-test --local --env test` | 将 migrations 应用到本地 test D1。 |
| `npm run db:migrate:test` | `wrangler d1 migrations apply zhizhi-test --remote --env test` | 将 migrations 应用到远程 test D1。 |
| `npm run db:studio` | `drizzle-kit studio` | 打开 Drizzle Studio，查看和调试数据库。 |

生产远程 D1 migration 当前建议显式执行：

```bash
npx wrangler d1 migrations apply zhizhi --remote --config wrangler.toml
```

### 管理员账号

| 命令 | 实际执行 | 说明 |
| --- | --- | --- |
| `npm run admin:create:local -- email --password pwd` | `node scripts/create-admin.mjs --local` | 在本地生产名 D1 创建或更新管理员。 |
| `npm run admin:create:test:local -- email --password pwd` | `node scripts/create-admin.mjs --local --db zhizhi-test --env test` | 在本地 test D1 创建或更新管理员。 |
| `npm run admin:create:test -- email --password pwd` | `node scripts/create-admin.mjs --remote --db zhizhi-test --env test --config wrangler.toml` | 在远程 test D1 创建或更新管理员。 |
| `npm run admin:create:remote -- email --password pwd` | `node scripts/create-admin.mjs --remote --config wrangler.toml` | 在远程生产 D1 创建或更新管理员。 |
| `npm run admin:promote:local -- email` | `node scripts/promote-admin.mjs --local` | 将本地生产名 D1 中已有用户提升为管理员。 |
| `npm run admin:promote:test:local -- email` | `node scripts/promote-admin.mjs --local --db zhizhi-test --env test` | 将本地 test D1 中已有用户提升为管理员。 |
| `npm run admin:promote:test -- email` | `node scripts/promote-admin.mjs --remote --db zhizhi-test --env test --config wrangler.toml` | 将远程 test D1 中已有用户提升为管理员。 |
| `npm run admin:promote:remote -- email` | `node scripts/promote-admin.mjs --remote --config wrangler.toml` | 将远程生产 D1 中已有用户提升为管理员。 |

前台普通用户系统当前软下线。第一次使用后台时，优先使用 `admin:create:*` 创建管理员，而不是依赖前台注册。

### 测试与回归

| 命令 | 实际执行 | 说明 |
| --- | --- | --- |
| `npm run test:tools` | `node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-tools.mjs` | 测试工具页核心逻辑。 |
| `npm run test:public-api` | `node scripts/test-public-api.mjs` | 测试公开 API 基础行为。 |
| `npm run test:admin-regression` | `node scripts/test-admin-regression.mjs` | 后台链路回归测试，覆盖登录、导入、草稿、媒体、发布、专题和外链等关键路径。 |

### AI 词条工作流

词条生成和同步的脚本，统一以 `ai-term:` 为前缀，词条名通过 `-- <TERM>` 传入（详见 `docs/aiterms-workflow/`）：

| 命令 | 说明 |
| --- | --- |
| `npm run ai-term:validate -- <TERM>` | 校验 `pro` 上线候选稿字段和结构。 |
| `npm run ai-term:import:dry-run -- <TERM>` | 模拟导入，提前发现解析或字段问题。 |
| `npm run ai-term:check -- <TERM>` | 词条综合检查。 |
| `npm run ai-term:diagram:check -- <TERM>` | 检查「一图看懂」图解文件是否齐全合规。 |
| `npm run ai-term:diagram:optimize -- <TERM>` | 生成 100KB 以内的优化 WebP。 |
| `npm run ai-term:diagram:compress:dry-run -- <TERM>` | 体检优化图的体积和尺寸，不写文件。 |
| `npm run ai-term:sources:index` | 构建资料卡索引。 |
| `npm run ai-term:sources:match -- <TERM>` | 为词条匹配资料卡（仅在使用资料卡时）。 |
| `npm run ai-term:exists:test -- <TERM>` | 查询测试库是否已有同 `locale + slug` 词条。 |
| `npm run ai-term:exists:prod -- <TERM>` | 查询生产库是否已有同 `locale + slug` 词条。 |
| `npm run ai-term:push:test -- <TERM>` | 同步词条草稿到测试 D1/R2（不自动发布）。 |
| `npm run ai-term:push:prod -- <TERM>` | 同步词条草稿到生产 D1/R2（不自动发布）。 |

同步走后台鉴权接口，依赖 `AI_TERM_ADMIN_*` / `AI_TERM_TEST_ADMIN_*` 环境变量；同步前会先查目标库，已存在同 `locale + slug` 词条时默认停止，需明确允许覆盖才追加 `--force-existing`。

### 编码检查

| 命令 | 实际执行 | 说明 |
| --- | --- | --- |
| `npm run encoding:check` | `node scripts/check-encoding.mjs` | 检查仓库文本文件是否包含 UTF-8 BOM。 |
| `npm run encoding:fix` | `node scripts/fix-encoding.mjs` | 自动移除文本文件中的 UTF-8 BOM。执行前建议确认工作区变更。 |

## 验证与质量检查

日常改动建议至少执行：

```bash
npm run lint
npm run build
```

涉及 TypeScript 类型时：

```bash
node_modules\.bin\tsc.cmd --noEmit
```

涉及 Cloudflare binding、D1、R2、媒体上传或 Worker 行为时：

```bash
npm run cf:preview
```

涉及后台完整链路时：

```bash
npm run test:admin-regression
```

涉及 D1 schema 时：

```bash
npm run db:generate
npm run db:migrate:local
```

## 常见问题

### 为什么 `npm run dev` 下图片上传不可用？

图片上传依赖 Cloudflare R2 binding。普通 Next.js dev server 不完整提供 R2。请使用：

```bash
npm run cf:preview
```

### 为什么前台登录、注册、收藏暂时不可用？

当前阶段优先建设公开内容、SEO、文章质量和专题体系。前台普通用户系统已软下线：

- `/login`、`/register`、`/me*` 会跳转首页。
- `/api/auth/*`、收藏和阅读进度 API 返回 410。
- 公开阅读不依赖读者登录。

后台管理员登录不受影响。

### 为什么 `npm run build` 使用 webpack？

当前脚本显式使用：

```bash
next build --webpack
```

这是为了在当前 Next.js 16 + Windows + OpenNext 工作流中保持构建和 preview 更稳定。

### Cloudflare 部署后 D1 不生效怎么办？

检查 `wrangler.toml` 中生产 D1 `database_id` 是否仍是占位值：

```toml
database_id = "00000000-0000-0000-0000-000000000000"
```

生产部署前必须替换为 `npx wrangler d1 create zhizhi` 返回的真实 ID，并执行远程 migration。

### 词条和文章有什么区别？

文章是长篇内容，支持分层阅读、专题串联和完整发布流程；词条是 AI 术语的轻量解释，围绕「一图看懂 + 快速理解」组织，强调一眼建立概念。两者各有独立的页面、数据表、后台工作台和生成工作流，但共用 D1、R2、后台鉴权和 SEO 体系。

### 项目是否可以直接作为通用博客模板？

可以参考架构和代码，但它首先是为“知之”这个个人知识系统设计的。它更适合需要 Markdown 导入、分层阅读、专题路线、后台发布和 Cloudflare 部署的内容项目，而不是最轻量的静态博客。

## 许可证

Private project. All rights reserved.
