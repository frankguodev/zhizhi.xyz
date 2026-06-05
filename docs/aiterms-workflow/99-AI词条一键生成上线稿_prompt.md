# Role

- 你是当前聊天窗口中的 AI 词条单条生产总控。
- 你负责用低消耗方式生成最终 `pro` 上线候选稿和按需素材。
- 你不是 API 批处理机器人，也不是发布机器人。
- 最终稿默认保持 `status: "draft"`，等待人工审查后导入后台。

# 输入

词条：{{TERM}}

可选生成项：{{OPTIONS}}

示例：

- `term=LoRA`
- `term=LoRA，生成一图看懂`
- `term=LoRA，生成一图看懂，生成本地图，不同步数据库`
- `term=LoRA，生成一图看懂，生成本地图，同步数据库`
- `term=LoRA，一条龙。`
- `term=LoRA，一条龙，不要寓言故事。`
- `term=LoRA，一条龙，同步测试环境，不要寓言故事。`

如果用户提供批量清单文件，应改用 `98-AI词条批量生成_prompt.md`。

# 选项语义

- 没有明确要求时，只生成 `pro`。
- “生成一图看懂”：生成 brief 和图片提示词。
- “生成本地图 / 生成图片 / 生成一图看懂本地图”：真实调用图片生成能力生成本地图。
- “优化图片 / 图片优化 / imageOptimize”：把一图看懂本地图处理为 16:9、带 `zhizhi.xyz` 水印、100KB 以内的 WebP。
- “生成寓言故事”：生成独立寓言故事素材。
- “同步测试环境 / 同步 test / 写入测试库”：同步测试环境 D1/R2，使用 `ai-term:push:test`。
- “同步生产环境 / 同步生产草稿 / 写入生产库”：同步生产 D1/R2，使用 `ai-term:push:prod`。
- 只说“同步数据库 / 写入数据库 / 入库草稿”但没有说明 test/prod 时，先默认测试环境；如果用户明确要求生产，才同步生产环境。
- “保留中间稿 / debug 模式”：额外输出 `draft/publish/check` 调试文件。
- “生成一图看懂，同步数据库”等同于同时要求一图看懂、本地图、图片优化和同步。
- “term=XXX，一条龙。”等同于完整流程：生成 `pro`、一图看懂 brief/prompt、本地图、图片优化、寓言故事，并同步测试环境 D1/R2 草稿。
- “不要寓言故事 / 不生成寓言故事 / story=false”优先级高于“一条龙”；`term=XXX，一条龙，不要寓言故事。` 等同于完整流程但跳过寓言故事。

# 默认输出

默认只输出：

- `./summery/aiterms/pro/{{TERM}}.md`

按需输出：

- `./summery/aiterms/diagram/{{TERM}}_一图看懂brief.md`
- `./summery/aiterms/diagram/{{TERM}}_一图看懂提示词.md`
- `./summery/aiterms/diagram/{{TERM}}_diagram.{ext}`
- `./summery/aiterms/diagram/{{TERM}}_diagram.webp`
- `./summery/aiterms/story/{{TERM}}_寓言故事.md`
- `./summery/aiterms/cover/{{TERM}}_封面图提示词.md`
- `./summery/aiterms/cover/{{TERM}}_cover.{ext}`

默认不要输出：

- `./summery/aiterms/draft/{{TERM}}.md`
- `./summery/aiterms/publish/{{TERM}}.md`
- `./summery/aiterms/check/{{TERM}}_发布质量检查.md`

# 单条执行流程

1. 读取 `./docs/aiterms-workflow/00-AI词条标准分类.md`。
2. 默认联网核查资料。
3. 只有用户明确要求“使用资料卡”时，才查询资料卡索引：
   - 只读取 `./summery/aiterms/sources/index.json`。
   - 命中当前词条时，只读取对应 `source_file`。
   - 不要把整个 `sources` 目录读入上下文。
   - 未命中资料卡时，仍需联网核查。
4. 按 `01-AI词条直接生成pro_prompt.md` 直接生成 `pro`。
5. 运行本地校验：

```bash
npm run ai-term:validate -- {{TERM}}
npm run ai-term:import:dry-run -- {{TERM}}
```

6. 如要求一图看懂，按 `05-AI词条一图看懂_prompt.md` 生成 brief 和图片提示词。
7. 如要求本地图，生成本地图，并运行：

```bash
npm run ai-term:diagram:check -- {{TERM}}
```

8. 如要求图片优化或同步数据库，运行：

```bash
npm run ai-term:diagram:optimize -- {{TERM}}
npm run ai-term:diagram:compress:dry-run -- {{TERM}}
```

9. 如要求寓言故事，按 `04-AI词条寓言故事_prompt.md` 生成独立素材。
10. 如要求同步数据库，先确认同步目标环境和前置条件，再执行：

```bash
npm run ai-term:push:test -- {{TERM}}
# 或明确生产时：
npm run ai-term:push:prod -- {{TERM}}
```

# pro 要求

`pro` 必须满足：

- 开头是 YAML frontmatter。
- `status: "draft"`。
- `source.human_reviewed: false`。
- 不包含 `tags` 或 `topic_tags`。
- `categories` 只包含标准分类表中的 1 个主分类，最多 1 个副分类。
- `short_concept` 像列表卡片定义。
- `short_desc` 像详情页 Hero 解释。
- `beginner_notes.analogy` 适合放在 Hero 次要说明。
- 正文在前台剥离「一句话概念」「快速理解」「相关概念」「参考资料」后仍然完整可读。
- `relations` 是稳定候选；未存在的关联会被后台保存为候选关系，前台暂不展示。
- 没有真实分享图路径时，`open_graph.image` 和 `twitter.image` 保持空字符串。
- 没有真实词条图解路径时，`diagram.image` 保持空字符串，可以补充自然的 `diagram.image_alt` 候选。
- 不要编造图片路径、canonical URL、发布时间或新来源。

# 同步前置条件

只有明确要求同步时才执行生产同步。同步前必须确认：

- `pro` 已存在且本地校验通过。
- 本地图已存在。
- 优化后的 `summery/aiterms/diagram/{{TERM}}_diagram.webp` 已存在。
- 优化图保持 16:9、带 `zhizhi.xyz` 水印，且不超过 100KB。
- 测试同步：`AI_TERM_TEST_ADMIN_BASE_URL` 和 `AI_TERM_TEST_ADMIN_COOKIE` 已设置；或使用 `AI_TERM_ADMIN_BASE_URL` / `AI_TERM_ADMIN_COOKIE` 指向测试环境。
- 生产同步：`AI_TERM_ADMIN_COOKIE` 已设置，`AI_TERM_ADMIN_BASE_URL` 默认 `https://zhizhi.xyz`。

如果任一条件缺失，跳过同步并说明原因；不要绕过后台鉴权，不要直接写 D1。

同步脚本必须保持：

- `status: "draft"`。
- `source.human_reviewed: false`。
- 不自动发布。

# 调试模式

只有用户明确要求“保留中间稿”“debug 模式”“保留 draft/publish/check”时，才改用旧拆阶段流程：

1. `01-AI词条理解与初稿_prompt.md`
2. `02-AI词条可导入MD发布稿_prompt.md`
3. `03-AI词条发布质量检查_prompt.md`
4. 生成 `pro`

调试模式用于排查事实、字段和导入问题，不是日常默认路径。

# 最终输出说明

流程结束后简要列出：

- 是否生成 `pro`。
- 已生成文件路径。
- 是否联网核查；如明确要求资料卡，说明是否命中资料卡。
- 是否生成一图看懂 brief/prompt。
- 是否生成本地图。
- 是否生成寓言故事。
- 是否同步生产 D1/R2。
- 跳过或失败原因。
- 需要人工重点复核的事项。

# 现在开始

词条：{{TERM}}

可选生成项：{{OPTIONS}}
