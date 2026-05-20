# MCP 发布质量检查

## 0. 总体结论

- 结论：基本通过，建议小修后导入
- 是否建议进入后台导入：建议先小修 `tagline` 后再导入
- 主要原因：发布稿结构完整，现有后台解析逻辑可读取 frontmatter 和正文，分类、标签、关联词、SEO、来源字段整体可用；正文也符合普通用户理解和 AI 世界语境要求。
- 最大风险：frontmatter 中 `tagline` 行存在引号书写不规范，并且“被广泛称为 AI 领域的 USB 接口或 AI 世界的 HTTP 协议”这一表述偏夸张、来源支撑不足，建议改为更克制的表达或恢复为“让 AI 应用接入外部世界的通用连接协议”。

## 1. 必须修复的问题

未发现会导致当前后台解析器直接失败的问题。

但建议在导入前修复以下接近阻塞的问题：

- `tagline` 字段当前写作：`"MCP 被广泛称为 AI 领域的“USB 接口”或“AI 世界的 HTTP 协议"`。虽然现有解析器没有报错，但该行英文双引号不成对，属于 YAML 稳定性风险。
- `tagline` 中“被广泛称为”和“AI 世界的 HTTP 协议”容易把社区类比写成事实判断，资料归档只支持“USB-C 类比常见但不能当严格定义”，不支持“HTTP 协议”这一强类比。

## 2. 建议优化的问题

- 建议把 `tagline` 改为更克制的短句，例如“让 AI 应用接入外部世界的通用连接协议”。
- 建议发布前补充或确认 `aliases` 字段策略。当前发布稿没有 `aliases` 顶层字段；项目 MVP 阶段可接受，但如果后续后台希望保留别名候选，可放入 metadata 或按最终导入规则补充。
- 未提供分享图，后台导入后可补充。当前 `open_graph.image` 与 `twitter.image` 都为空，且保持一致，不构成阻塞。
- `seo.description` 自然可用，但略偏长且信息密度高，后续人工发布时可以稍微压缩，让搜索结果展示更利落。
- `source.human_reviewed: true` 与存在 `review/MCP.md` 的流程一致；如果该 review 文件并非真实人工二创稿，发布前应改回 `false`。

## 3. Frontmatter 检查结果

核心字段完整：包含 `term`、`slug`、`locale`、`translation_key`、`short_concept`、`short_desc`、`type`、`difficulty`、`status`、`visibility`、`heat_score`、`quality_score`、`trending`、`content.format`、`content.version`、`categories`、`tags`、`seo`、`source`、`structured_data`。

推荐字段方面：包含 `term_zh`、`full_name`、`tagline`、`beginner_notes`、`relations`、`open_graph`、`twitter`；未包含 `aliases` 和 `cover`。结合当前项目记忆中 MVP 阶段不单独入库 aliases、封面图就是分享图的决策，这两个缺失不阻塞导入。

字段合法性整体通过：

- `slug: model-context-protocol` 合法，小写、中划线、无中文、无空格。
- `type: protocol` 属于允许值。
- `difficulty: intermediate` 属于允许值。
- `status: draft` 属于允许值。
- `visibility: public` 属于允许值。
- `heat_score: 90`、`quality_score: 88` 均为 0-100 整数。
- `trending: true` 是布尔值。
- `content.format: markdown`、`content.version: ai-term-md-v1` 正确。
- `categories` 为 2 个，`tags` 为 7 个，`relations` 为 8 个，数量符合要求。
- 所有 `relation_type` 均属于允许值。

YAML 风险：`tagline` 行引号不成对。现有 gray-matter/js-yaml 解析没有报错，但这是应修复的格式风险。

## 4. 正文内容检查结果

正文结构完整，包含提示词要求的主要章节：一句话概念、小白理解、详细解释、本质、出现背景、误解、场景、AI 世界位置、相关概念、普通人价值、未来发展和参考资料。

小白理解质量较好：

- 一句话概念准确克制。
- “通用连接方式”和“插头/接口”类比自然，适合入门理解。
- 多次强调 MCP 不是模型、不是万能工具、不能自动保证安全，能帮助新手避坑。
- 正文没有明显百科腔、论文腔或营销腔。

AI 世界语境充足：

- 解释了 MCP 与 Agent、AI Coding、AI Infra、企业集成、工具调用的关系。
- 说明了大模型应用从问答走向工具和工作流后，为什么需要连接协议。
- 相关概念部分能帮助后续站内关联词条建设。

未发现“初稿说明”“初稿字段提炼参考”“字段候选”“待人工确认”“本提示词”等内部生产内容残留。

## 5. 事实与来源检查结果

参考资料主要来自 MCP 官方文档、官方规范、GitHub、Anthropic 公告、OpenAI Agents SDK 文档、Cloudflare 文档和安全讨论文章，来源层级整体可靠。

正文事实整体与资料归档一致，没有发现编造具体人物发言、编造数据或编造产品功能的问题。

需要注意的事实风险：

- “Anthropic 在 2024 年 11 月公开推出 MCP”与资料归档一致。
- “OpenAI Agents SDK、Cloudflare 等资料显示 MCP 进入更广泛的开发者工具和基础设施语境”表述克制，可接受。
- 资料归档提示 Anthropic 将 MCP 捐赠给 Linux Foundation / Agentic AI Foundation 的治理细节建议交叉核对。发布稿正文没有展开这一点，降低了风险；参考资料中保留 Anthropic 链接是可接受的。
- `tagline` 的“被广泛称为 AI 领域的 USB 接口或 AI 世界的 HTTP 协议”缺少资料归档支撑，建议改掉。

发布前建议联网复核：

- MCP 官方规范 latest 版本是否有重大变化。
- OpenAI Agents SDK 与 Cloudflare MCP 文档链接是否仍有效。
- Anthropic 关于 Linux Foundation / Agentic AI Foundation 的公告是否有对应基金会侧资料可交叉引用。

## 6. SEO 与分享检查结果

SEO：

- `seo.title` 自然，适合搜索场景。
- `seo.description` 信息完整，能说明 MCP 是什么、为什么值得了解、适合谁看；长度大体可用，但可以略压缩。
- `seo.keywords` 为 7 个，无明显关键词堆砌。
- `canonical_url` 为空，在尚未确定线上 URL 时可接受。
- `robots: index, follow` 合理。

Open Graph / Twitter：

- `open_graph.title` 和 `open_graph.description` 适合社交分享。
- `open_graph.type: article` 合理。
- `open_graph.image` 与 `twitter.image` 都为空且一致，未编造图片路径。
- 未提供分享图，后台导入后可补充。
- `twitter.card: summary_large_image` 合理，但如果长期没有图片，后续也可以按前端策略降级为普通摘要卡。

结构化数据：

- `structured_data.schema_type: DefinedTerm` 合理。
- `structured_data.name` 与 `term` 一致。
- `alternate_name` 包含英文全称、中文译名和常见别名，合理。
- `description` 与 `short_concept` / `short_desc` 一致。
- `in_language: zh-CN` 与 `locale: zh` 对应。
- `publisher_name: 知之` 合理。

## 7. 后台导入检查结果

使用现有 `src/lib/ai-term-import.ts` 解析 `summery/aiterms/publish/MCP.md`，结果通过：

- 解析到 `term: MCP`
- 解析到 `slug: model-context-protocol`
- 解析到 2 个分类
- 解析到 7 个标签
- 解析到 8 个关联词条
- warnings 为空

没有发现空字符串数组项、结构不稳定的 categories / tags / relations、正文内额外 frontmatter 结束符等明显导入风险。

仍建议修复 `tagline` 引号与措辞后再导入，避免不同 YAML 解析器或后续编辑器出现兼容问题。

## 8. 修改建议清单

- [ ] 修复 `tagline` 行的英文双引号不成对问题。
- [ ] 将 `tagline` 改成更克制且有来源支撑的表达，例如“让 AI 应用接入外部世界的通用连接协议”。
- [ ] 发布前复核 MCP 官方规范、OpenAI Agents SDK、Cloudflare MCP 文档链接是否仍有效。
- [ ] 发布前确认 `source.human_reviewed: true` 是否符合真实人工审核状态。
- [ ] 后台导入后如有分享图，再补充 `open_graph.image`、`open_graph.image_alt` 和 `twitter.image`。
