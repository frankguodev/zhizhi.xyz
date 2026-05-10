export type ArticleMeta = {
  slug: string;
  locale: "zh" | "en";
  title: string;
  summary: string;
  category: string;
  tags: string[];
  visibility: "public" | "login" | "hidden";
  readingMinutes: number;
  viewCount?: number;
  publishedAt: string;
  updatedAt: string;
  supportsReadingMode: boolean;
  defaultReadingMode: "full" | "quick";
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  robots?: string;
  coverImage?: string;
  coverImageAlt?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  articleType?: string;
  difficulty?: string;
  primaryTopic?: string;
  seoMetadata?: Record<string, unknown>;
  sourceType?: "original" | "ai_assisted" | "curated" | "mixed";
  sourceNote?: string;
  aiAssisted?: boolean;
  humanReviewed?: boolean;
};

export type ArticleRecord = ArticleMeta & {
  content: string;
};

const aiObsidianWorkflow = [
  "# AI 辅助 Obsidian 写作流程：从资料到发布",
  "",
  "## 先给结论",
  "",
  "这套流程的核心不是让 AI 代替你写作，而是让 AI 帮你把已经沉淀的资料整理成结构清晰的初稿。真正决定文章质量的，仍然是你的选题判断、资料来源、个人经验和最后的人工精修。",
  "",
  "最小流程可以分成五步：",
  "",
  "1. 把资料收集到 Obsidian。",
  "2. 为目标文章建立选题文件夹。",
  "3. 让 AI 先提炼素材，再生成大纲。",
  "4. 让 AI 生成带分层标记的初稿。",
  "5. 你人工精修后，把 Markdown 导入网站后台发布。",
  "",
  ":::detail 为什么不建议直接把资料丢给 AI？",
  "直接把一堆网页摘录、聊天记录和临时笔记丢给 AI，短期看很快，但 AI 很难判断哪些内容是你的观点，哪些只是外部材料，也不知道最终文章要服务哪类读者。结果往往是文章看起来完整，但主线松散、判断感不足。",
  ":::",
  "",
  "## 第一步：资料先进入 Obsidian",
  "",
  "所有原始资料都应该先进入 Obsidian，而不是散落在浏览器收藏夹、聊天窗口、本地临时文档和截图文件夹里。Obsidian 的角色是原始知识库，不是最终发布系统。",
  "",
  "建议先用这几个目录：",
  "",
  "- `00-Inbox`：临时收集。",
  "- `01-AI-Dialogues`：与 AI 问答产生的知识。",
  "- `02-Web-Clippings`：网站、文章、报告和网页摘录。",
  "- `03-Personal-Summaries`：你自己的总结。",
  "- `05-Topics`：准备写文章时整理好的选题包。",
  "- `07-Published`：已经发布的最终稿备份。",
  "",
  ":::warning 不要把外部资料直接变成最终文章",
  "从网站或其他文章收集来的内容，只能作为素材、线索或参考。发布前需要改写、核实和加入你自己的判断，避免版权风险和低质量拼贴感。",
  ":::",
  "",
  "## 第二步：每篇文章建立选题文件夹",
  "",
  "准备写一篇文章时，先在 `05-Topics` 里建立独立文件夹。这个文件夹负责把资料、任务、初稿和最终稿放在一起。",
  "",
  "推荐结构：",
  "",
  "```text",
  "05-Topics/ai-obsidian-writing-workflow/",
  "  brief.md",
  "  sources.md",
  "  notes.md",
  "  outline.md",
  "  draft.md",
  "  final.md",
  "  assets/",
  "```",
  "",
  ":::example 一个 brief.md 应该包含什么？",
  "`brief.md` 至少要写清楚目标读者、读者痛点、文章目标、必须包含的内容、不要写成什么样，以及你的核心观点。它相当于你和 AI 之间的创作合同。",
  ":::",
  "",
  "## 第三步：先让 AI 整理素材，不要马上写正文",
  "",
  "把素材喂给 AI 后，第一步不是让它写文章，而是让它提炼可用信息。你可以要求它输出：",
  "",
  "- 核心观点",
  "- 可用于文章的事实",
  "- 需要核实的内容",
  "- 适合展开的章节",
  "- 可以加入图片或流程图的位置",
  "",
  "这样做的好处是，你可以先检查 AI 对素材的理解是否准确，再决定大纲怎么写。",
  "",
  ":::author 我的判断",
  "AI 最适合做“整理者”和“初稿助手”，不适合直接做“最终作者”。你要把最重要的判断留在自己手里，这也是个人知识网站和批量 AI 内容站的区别。",
  ":::",
  "",
  "## 第四步：生成支持分层阅读的初稿",
  "",
  "让 AI 生成初稿时，要明确要求它保留主线内容，并把背景解释、额外案例、基础概念和进阶讨论放入可折叠块。",
  "",
  "可以使用这样的标记：",
  "",
  "```markdown",
  ":::detail 为什么要这样做？",
  "这里放详细解释。",
  ":::",
  "",
  ":::example 示例",
  "这里放额外示例。",
  ":::",
  "",
  ":::advanced 进阶方案",
  "这里放高阶内容。",
  ":::",
  "```",
  "",
  "快速掌握模式下，这些内容会默认折叠；完整阅读模式下，它们会展开。",
  "",
  ":::detail 快速掌握模式不是摘要",
  "快速掌握模式仍然应该是一篇完整文章。它隐藏的是背景、延伸和额外解释，不应该隐藏关键步骤、重要提醒和核心结论。读者切到快速掌握后，仍然要能照着做。",
  ":::",
  "",
  "## 第五步：人工精修后导入后台",
  "",
  "AI 初稿完成后，你要处理这些内容：",
  "",
  "- 删除空泛段落。",
  "- 核实事实和来源。",
  "- 加入真实经验和判断。",
  "- 添加图片、截图或流程图。",
  "- 检查快速模式下文章是否仍然完整。",
  "- 删除所有 `[需核实]` 和 `[补充个人经验]` 标记。",
  "",
  "最终形成 `final.md`，再通过后台导入网站。",
  "",
  ":::advanced 后续可以自动化哪些环节？",
  "第一版建议手动导入 Markdown。等流程稳定后，可以再做 zip 导入、图片自动上传到 R2、Obsidian 文件夹同步、AI 辅助生成 SEO 描述和发布前质量检查。",
  ":::",
  "",
  "## 发布前检查清单",
  "",
  "发布之前，至少检查这些项：",
  "",
  "- 标题是否清楚。",
  "- 摘要是否能说明文章价值。",
  "- 分类和标签是否正确。",
  "- 是否有完整阅读和快速掌握两种体验。",
  "- 快速模式是否仍然能读懂、看会。",
  "- 图片路径是否已经替换成网站可访问路径。",
  "- 来源说明是否清楚。",
  "- SEO 标题和描述是否填写。",
  "",
  "这套流程跑顺以后，你的网站就不是普通博客，而是一个能持续生产、沉淀和展示高质量内容的个人知识系统。",
].join("\n");

export const articles: ArticleRecord[] = [
  {
    slug: "ai-obsidian-writing-workflow",
    locale: "zh",
    title: "AI 辅助 Obsidian 写作流程：从资料到发布",
    summary:
      "这篇示例文章演示如何把 Obsidian 原始知识库、AI 初稿、人工精修和网站后台发布连接成一条稳定的内容生产流程。",
    category: "内容创作",
    tags: ["AI 写作", "Obsidian", "Markdown", "个人知识库"],
    visibility: "public",
    readingMinutes: 9,
    publishedAt: "2026-04-22",
    updatedAt: "2026-04-22",
    supportsReadingMode: true,
    defaultReadingMode: "full",
    content: aiObsidianWorkflow,
  },
];

export function getPublishedArticles(locale: "zh" | "en" = "zh") {
  return articles.filter((article) => article.locale === locale);
}

export function getArticleBySlug(slug: string, locale: "zh" | "en" = "zh") {
  return articles.find((article) => article.slug === slug && article.locale === locale);
}
