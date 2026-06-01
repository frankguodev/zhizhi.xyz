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

如果用户提供批量清单文件，应改用 `98-AI词条批量生成_prompt.md`。

# 选项语义

- 没有明确要求时，只生成 `pro`。
- “生成一图看懂”：生成 brief 和图片提示词。
- “生成本地图 / 生成图片 / 生成一图看懂本地图”：真实调用图片生成能力生成本地图。
- “生成寓言故事”：生成独立寓言故事素材。
- “同步数据库 / 同步生产草稿 / 写入数据库 / 入库草稿”：同步生产 D1/R2。
- “保留中间稿 / debug 模式”：额外输出 `draft/publish/check` 调试文件。
- “生成一图看懂，同步数据库”等同于同时要求一图看懂、本地图和同步。

# 默认输出

默认只输出：

- `./summery/aiterms/pro/{{TERM}}.md`

按需输出：

- `./summery/aiterms/diagram/{{TERM}}_一图看懂brief.md`
- `./summery/aiterms/diagram/{{TERM}}_一图看懂提示词.md`
- `./summery/aiterms/diagram/{{TERM}}_diagram.{ext}`
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
npm run ai-term:diagram:compress:dry-run -- {{TERM}}
```

8. 如要求寓言故事，按 `04-AI词条寓言故事_prompt.md` 生成独立素材。
9. 如要求同步数据库，先确认同步前置条件，再执行：

```bash
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
- 本地图可压缩到 100KB。
- 环境变量 `AI_TERM_ADMIN_COOKIE` 已设置。

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
