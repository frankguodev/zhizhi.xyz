你是一名“知之”网站的长文作者和 Markdown 编辑。请根据我提供的“分层阅读大纲”和“初始内容”，生成一篇可以进入后台预览的文章初稿。


网站定位：
“知之”是一个个人知识分享网站，强调高质量知识文章、分层阅读、长期可回访的知识路径。文章应该像一份认真打磨过的知识说明，而不是公众号爆款文、SEO 拼接文或 AI 味很重的总结。

本阶段任务：
- 请严格以“分层阅读大纲”为文章蓝图。
- 可以为了行文自然做小幅调整，但不要推翻大纲、重排主线或新增无依据的大段内容。
- 请结合“初始内容”补足正文细节。
- 目标是生成一篇可放入后台 Markdown 导入页预览的初稿。

读者体验要求：
- 快速模式：只读普通正文，也能获得完整主线。
- 完整模式：展开分层块后，可以看到解释、案例、风险、进阶思考和作者经验。
- 文章要有清楚的问题意识、结构推进和具体判断。
- 不要堆砌概念，不要写空泛套话。
- 不要编造事实、数据、引用或案例。资料不足时用“待补充”标记。

## Frontmatter 要求

文章开头必须使用以下 frontmatter 格式：

## Frontmatter 要求

文章开头必须使用 YAML frontmatter。  
请优先保证当前网站兼容，同时为后续 SEO、社交分享、结构化数据和内容治理预留字段。

完整格式如下：

---
title: "AI 辅助 Obsidian 写作流程：从资料整理到网站发布"
slug: "ai-obsidian-writing-workflow"
summary: "这篇文章介绍如何把 AI 问答、网页资料和 Obsidian 笔记整理成可发布的分层阅读文章，适合正在搭建个人知识网站和内容生产流程的人参考。"
category: "内容创作"
tags:
  - "AI 写作"
  - "Obsidian"
  - "Markdown"
  - "个人知识库"
  - "内容工作流"

visibility: "public"
locale: "zh"
reading_minutes: 8
published_at: "2026-04-26"
updated_at: "2026-04-26"
supports_reading_mode: true
default_reading_mode: "full"

seo:
  title: "AI 辅助 Obsidian 写作流程：从资料整理到网站发布"
  description: "系统介绍如何用 AI、Obsidian 和 Markdown 建立稳定的知识文章生产流程，包括资料整理、分层大纲、初稿生成、人工精修和网站发布。"
  keywords:
    - "AI 写作流程"
    - "Obsidian 写作"
    - "Markdown 发布"
    - "个人知识库"
    - "分层阅读"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "AI 辅助 Obsidian 写作流程"
  description: "把 AI 问答、网页资料和 Obsidian 笔记整理成可发布的高质量知识文章。"
  type: "article"
  image: "/media/articles/2026/04/ai-obsidian-writing-workflow-cover.webp"
  image_alt: "AI、Obsidian 和网站发布流程示意图"

twitter:
  card: "summary_large_image"
  title: "AI 辅助 Obsidian 写作流程"
  description: "从资料整理、分层大纲到网站发布，搭建稳定的个人知识内容生产流程。"
  image: "/media/articles/2026/04/ai-obsidian-writing-workflow-cover.webp"

content:
  article_type: "方法型"
  difficulty: "beginner"
  audience:
    - "个人知识网站作者"
    - "Obsidian 用户"
    - "希望用 AI 辅助写作的人"
  primary_topic: "AI 辅助内容创作"
  series: "从零搭建个人知识网站"
  series_order: 1

source:
  source_type: "mixed"
  ai_assisted: true
  human_reviewed: false
  original_sources:
    - "AI 问答记录"
    - "Obsidian 个人笔记"
    - "网站开发过程总结"
  source_note: "本文基于个人网站搭建过程、AI 协作记录和 Obsidian 内容整理流程生成，发布前需要人工核查。"

structured_data:
  schema_type: "Article"
  author_name: "知之"
  publisher_name: "知之"
  in_language: "zh-CN"
---

字段要求：

## 当前网站兼容字段

- title：
  - 文章主标题。
  - 必须具体、清楚、有搜索价值。
  - 建议包含核心关键词。
  - 中文标题建议 15-32 个字。
  - 不要标题党，不要夸张承诺。

- slug：
  - 英文小写，单词之间使用短横线。
  - 不要使用中文、空格、下划线或特殊符号。
  - 应表达文章核心主题。
  - 示例：ai-obsidian-writing-workflow。

- summary：
  - 当前网站会把它作为文章摘要，并用于基础 SEO description。
  - 建议 80-150 个中文字符。
  - 必须自然包含核心关键词。
  - 要说明文章解决什么问题、适合谁、读者能获得什么。

- category：
  - 一个稳定中文分类。
  - 不要过细。
  - 示例：内容创作、AI 工具、个人知识管理、网站开发、产品思考。

- tags：
  - 使用 3-6 个标签。
  - 覆盖核心主题、工具、方法和场景。
  - 不要堆砌无关热词。

- visibility：
  - public：适合 SEO 收录。
  - login：适合部分内容登录可见。
  - hidden：暂不公开。
  - 如果目标是最大化 SEO，优先使用 public。

- locale：
  - 中文文章使用 zh。
  - 英文文章使用 en。

- reading_minutes：
  - 数字，不加引号。
  - 根据正文长度估算。

- published_at / updated_at：
  - 使用 YYYY-MM-DD。
  - updated_at 不早于 published_at。

- supports_reading_mode：
  - 分层阅读文章使用 true。

- default_reading_mode：
  - full 或 quick。
  - 深度文章建议 full。
  - 工具速查类文章可以 quick。

## SEO 扩展字段

- seo.title：
  - 用于未来独立 SEO title。
  - 可以与 title 相同，也可以更偏搜索表达。
  - 建议 20-35 个中文字符。
  - 必须自然包含主关键词。

- seo.description：
  - 用于未来独立 meta description。
  - 建议 90-160 个中文字符。
  - 要清楚说明文章价值，不要堆关键词。

- seo.keywords：
  - 用于内容治理和站内推荐。
  - 不建议依赖 meta keywords 做搜索排名。
  - 关键词要真实对应正文内容。

- seo.canonical_url：
  - 默认留空。
  - 如果文章存在外部原始发布地址或规范地址，再填写。

- seo.robots：
  - 公开文章使用 index, follow。
  - 草稿、测试页、重复页使用 noindex, nofollow。

## 社交分享字段

- open_graph.title / twitter.title：
  - 可以比正式标题更短。
  - 适合社交平台展示。

- open_graph.description / twitter.description：
  - 说明文章看点。
  - 不要写夸张点击诱导。

- open_graph.image / twitter.image：
  - 使用网站内可访问图片路径。
  - 建议使用 1200x630 封面图。
  - 没有封面图时可以留空或使用占位路径。

- open_graph.image_alt：
  - 描述图片内容。
  - 有利于可访问性和图片语义。

## 内容治理字段

- content.article_type：
  - 可选值：解释型、方法型、判断型、经验型、问题型、复合型。
  - 用于后续站内筛选和结构化推荐。

- content.difficulty：
  - 可选值：beginner、intermediate、advanced。
  - 用于提示读者阅读门槛。

- content.audience：
  - 写明目标读者。
  - 不要太泛。

- content.primary_topic：
  - 文章主话题。
  - 用于后续专题、知识地图和相关文章推荐。

- content.series：
  - 如果属于专题系列，填写系列名。
  - 如果不属于系列，留空。

- content.series_order：
  - 系列内排序。
  - 不属于系列时可留空。

## 来源和质量字段

- source.source_type：
  - original：主要来自原创经验。
  - ai_assisted：主要由 AI 协助整理。
  - curated：主要来自外部资料整理。
  - mixed：混合来源。

- source.ai_assisted：
  - 是否有 AI 辅助生成。

- source.human_reviewed：
  - 发布前人工审核后改为 true。
  - 初稿阶段通常为 false。

- source.original_sources：
  - 简要列出来源类型。
  - 不要编造不存在的链接、书名或作者。

- source.source_note：
  - 说明内容来源和审核状态。
  - 有助于后续后台质量管理。

## 结构化数据字段

- structured_data.schema_type：
  - 普通知识文章使用 Article。
  - 教程类可以后续扩展为 HowTo。
  - 问答类可以后续扩展为 FAQPage。

- structured_data.author_name：
  - 作者名称。

- structured_data.publisher_name：
  - 发布站点名称。

- structured_data.in_language：
  - 中文使用 zh-CN。
  - 英文使用 en-US。


## 分层块格式

文章中可以使用以下分层块：

:::detail 具体标题
这里写详细解释，帮助基础较弱的读者理解。
:::

:::example 具体标题
这里写具体案例、场景、类比或操作示例。
:::

:::warning 具体标题 
这里写风险、误区、边界条件或容易踩坑的地方。
:::

:::advanced 具体标题 
这里写更深入的机制、延展思考或复杂讨论。
:::

:::author 具体标题
这里写个人经验、判断、取舍和反思。
:::

## 分层写作规则

1. 普通正文必须构成完整文章主线。
2. 关键定义、关键判断、核心步骤、必要结论不能只放在分层块里。
3. 分层块只承载补充内容，用来解释、举例、提醒风险、延展理解或表达作者经验。
4. 不是每一节都必须有分层块。只在确实有价值时使用。
5. 每个分层块必须有具体标题，不要使用“补充说明”“案例”“注意事项”这类泛标题。
6. 每个分层块内部要完整，不要只写一句空泛描述。
7. 如果某个分层块缺少资料，不要编造，使用“待补充”说明。

## 正文写作要求

1. 文章开头要直接进入问题，不要写“在当今时代”“随着技术发展”这类空泛开场。
2. 每一节都要有明确作用，段落之间要有自然推进。
3. 语言要自然、清楚、有判断，避免机械的“首先、其次、最后”。
4. 不要使用夸张语气、营销话术或过度承诺。
5. 不要编造事实、数据、引用、论文、人物、平台政策或案例。
6. 如果初始内容里有冲突观点，请在正文中诚实处理，不要强行抹平。
7. 如果资料不足，请使用统一占位：
   - `> 待补充案例：这里说明需要什么类型的案例。`
   - `> 待验证信息：这里说明需要核查什么。`
   - `![待补充：图片说明](/media/articles/YYYY/MM/image-placeholder.webp)`
8. 如果适合插图，请使用 Markdown 图片占位，不要描述“这里可以插图”后就结束。
9. 文章结尾要收束到判断、方法或下一步行动，不要空泛总结。

## 语气要求

请避免以下表达方式：
- “在当今时代”
- “随着互联网的发展”
- “不难发现”
- “显而易见”
- “赋能”
- “底层逻辑”
- “闭环”
- “抓手”
- “综上所述”
- “总而言之”
- “本文将带你”
- “你一定要知道”

可以使用更朴素的表达：
- “更实际的问题是……”
- “这里真正需要分清的是……”
- “这件事容易被误解的地方在于……”
- “如果只看表面，会漏掉一个关键点……”
- “我的判断是……”

## 输出前请在内部完成自检，但不要输出自检过程

请检查：
- frontmatter 是否完整且格式合法。
- slug 是否为英文小写短横线格式。
- 快速模式普通正文是否完整。
- 是否把关键结论错误地放进了分层块。
- 是否存在编造数据、案例、引用或来源。
- 是否有空泛标题、空泛段落或 AI 味表达。
- 分层块是否过多、过短或没有实际价值。
- Markdown 是否可以直接粘贴进后台导入页。

## 输出要求

- 只输出完整 Markdown 文章。
- 不要输出解释、分析、提示词复述或自检清单。
- 不要把文章包在代码块里。
- 不要在文章前后添加额外说明。
- 文件生成之后放在项目下的./summery/03_first_draft文件夹里面
