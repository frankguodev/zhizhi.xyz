# Role

- 你是当前聊天窗口中的 AI 词条单条生产总控。
- 你负责用低消耗方式生成最终 `pro` 上线候选稿和按需素材。
- 你不是 API 批处理机器人，也不是发布机器人。
- Skill 不是本流程的默认执行工具；除非用户明确点名某个 skill，否则按项目本地工作流执行。
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
- “生成本地图 / 生成图片 / 生成一图看懂本地图”：在当前环境有可用的原生图片生成能力，生成本地图。
- “优化图片 / 图片优化 / imageOptimize”：把一图看懂本地图处理为100KB 以内的 WebP；优先输出 1600×900，若压缩后无法满足 100KB 以内，再降级为 1280×720。
- “生成寓言故事”：生成独立寓言故事素材。
- “同步测试环境 / 同步 test / 写入测试库”：同步测试环境 D1/R2，使用 `ai-term:push:test`。
- “同步生产环境 / 同步生产草稿 / 写入生产库”：同步生产 D1/R2，使用 `ai-term:push:prod`。
- 只说“同步数据库 / 写入数据库 / 入库草稿”但没有说明 test/prod 时，先默认测试环境；如果用户明确要求生产，才同步生产环境。
- “覆盖已有词条 / 更新已有词条 / force-existing”：允许同步脚本更新目标库中已存在的同 locale + slug 词条；没有这类明确指令时，目标库已存在则停止。
- “保留中间稿 / debug 模式”：额外输出 `draft/publish/check` 调试文件。
- “生成一图看懂，同步数据库”等同于同时要求一图看懂、本地图、图片优化和同步；如果本地图未能按授权路径生成，图片优化和同步随前置条件失败跳过。
- “term=XXX，一条龙。”等同于完整流程：生成 `pro`、一图看懂 brief/prompt、本地图、图片优化、寓言故事，并同步测试环境 D1/R2 草稿；其中本地图仍受上述图片生成边界约束。
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
2. 先做已有内容检查：
   - 如果本地 `./summery/aiterms/pro/{{TERM}}.md` 已存在且不是空文件，说明本地已有 pro 草稿；除非用户明确要求覆盖生成，否则优先复用现有稿件继续后续素材/同步步骤。
   - 如果本地 `./summery/aiterms/pro/{{TERM}}.md` 不存在、是 0 字节空文件，或无法解析为有效 Markdown/frontmatter，则视为缺少可用 pro，先按本文件生成 pro。
   - 如果本地 pro 已存在但本地校验失败，优先做完成当前任务所需的最小修复（例如标准分类 `sort_order`、`source.human_reviewed: false`、明显缺失的必需字段），不要重写正文；修复后重新校验。若无法最小修复，再停止并说明。
   - 如果本次选项包含同步数据库（含“一条龙”默认同步测试环境），先确认目标环境；再查询目标库是否已有同 `locale + slug` 词条。
   - 测试环境查询：
     ```bash
     npm run ai-term:exists:test -- {{TERM}}
     ```
   - 生产环境查询：
     ```bash
     npm run ai-term:exists:prod -- {{TERM}}
     ```
   - 目标库已存在且用户没有明确说“覆盖已有词条 / 更新已有词条 / force-existing”时，输出已有词条状态和后台链接，停止生成、上传和同步，避免覆盖人工编辑内容。
   - 如果只是本地生成 pro 且不要求同步数据库，可以不强制查远程库；此时只做本地文件存在性提醒。
3. 默认联网核查资料。
4. 只有用户明确要求“使用资料卡”时，才查询资料卡索引：
   - 只读取 `./summery/aiterms/sources/index.json`。
   - 命中当前词条时，只读取对应 `source_file`。
   - 不要把整个 `sources` 目录读入上下文。
   - 未命中资料卡时，仍需联网核查。
5. 按 `01-AI词条直接生成pro_prompt.md` 直接生成 `pro`。
6. 运行本地校验：

```bash
npm run ai-term:validate -- {{TERM}}
npm run ai-term:import:dry-run -- {{TERM}}
```

7. 如要求一图看懂，按 `05-AI词条一图看懂_prompt.md` 生成 brief 和图片提示词。若要求本地图、图片优化或同步，但 brief/prompt 不存在，也先补齐 brief/prompt。
8. 如要求本地图，或图片优化/同步需要本地图但本地图不存在，先确认当前环境存在可用的原生图片生成能力，或项目文档/脚本已明确指定可用的图片生成路径；不要自动启用用户未点名的 skill。确认后生成本地图，并运行：

```bash
npm run ai-term:diagram:check -- {{TERM}}
```

   如果图片生成能力不可用、限流、无法保存本地图，则保留 brief 和图片提示词，跳过本地图、图片优化和同步，并说明原因。

9. 如要求图片优化或同步数据库，且本地图已存在，运行：

```bash
npm run ai-term:diagram:optimize -- {{TERM}}
npm run ai-term:diagram:compress:dry-run -- {{TERM}}
```

10. 如要求寓言故事，按 `04-AI词条寓言故事_prompt.md` 生成独立素材。不要因为同步或图片优化自动生成寓言故事。
11. 如要求同步数据库，先确认同步目标环境、目标库不存在同 `locale + slug` 词条（除非用户明确允许覆盖）和前置条件，再执行：

```bash
npm run ai-term:push:test -- {{TERM}}
# 或明确生产时：
npm run ai-term:push:prod -- {{TERM}}
# 只有明确允许更新已有词条时：
npm run ai-term:push:test -- {{TERM}} --force-existing
```

12. 对于已明确为“补齐/修正少量素材产物”的小任务，优先走快速路径：先复用现有 pro、brief、prompt 和本地图；只补缺失文件与必要验证，不展开完整批量生产流程，不生成冗长报告，除非用户明确要求。

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
- 优化图不超过 100KB；尺寸优先 1600×900，若压缩后无法满足 100KB 以内，允许降级为 1280×720。
- 目标库不存在同 `locale + slug` 词条；如果已存在，默认停止并提示后台链接，只有用户明确允许覆盖时才继续。
- 测试同步：`AI_TERM_TEST_ADMIN_API_TOKEN`（优先）或 `AI_TERM_TEST_ADMIN_COOKIE` 已设置，配合 `AI_TERM_TEST_ADMIN_BASE_URL`。
- 生产同步：`AI_TERM_ADMIN_API_TOKEN`（优先）或 `AI_TERM_ADMIN_COOKIE` 已设置，`AI_TERM_ADMIN_BASE_URL` 默认 `https://zhizhi.xyz`。

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
- 是否优化图片。
- 是否调用 skill；未明确要求时必须为“否”。
- 是否生成寓言故事。
- 是否同步生产 D1/R2。
- 是否查到目标库已有词条；如有，说明是否因此停止或是否按明确覆盖指令继续。
- 跳过或失败原因。
- 需要人工重点复核的事项。

# 现在开始

词条：{{TERM}}

可选生成项：{{OPTIONS}}
