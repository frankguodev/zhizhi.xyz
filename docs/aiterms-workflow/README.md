# AI 词条工作流

本目录维护 AI 词条从资料核查到 `pro` 上线候选稿、图解素材和生产同步的协作流程。

## 默认路线

默认走“当前聊天窗口协作”路线，不走大模型 API 批处理：

- 用户只提供单个 `term`，或一个批量清单文件。
- Codex 在当前聊天窗口中负责联网核查、生成、校验、图解和可选同步。
- 本地 npm 命令只做文件检查、导入 dry-run、图解检查、压缩测试和同步；不会自动调用大模型。
- 除非用户明确要求，不要设计成 API 批处理。

## 日常入口

单个词条：

```text
term=LoRA，生成一图看懂，生成本地图，不同步数据库
term=LoRA，一条龙。
term=LoRA，一条龙，不要寓言故事。
term=LoRA，一条龙，同步测试环境，不要寓言故事。
```

批量词条：

```text
按照 summery/aiterms/tasks/terms.csv 批量生成词条
```

批量清单推荐格式：

```csv
term,diagram,image,imageOptimize,story,sync,notes
RAG,true,true,true,false,false,"生成 pro、一图看懂本地图和优化 WebP"
MCP,true,false,false,false,false,"只生成一图看懂 brief/prompt"
```

## 输出策略

默认只输出用户真正需要的文件：

- `summery/aiterms/pro/{{TERM}}.md`
- 按需输出 `summery/aiterms/diagram/*`
- 按需输出 `summery/aiterms/story/*`

默认不输出：

- `summery/aiterms/draft/*`
- `summery/aiterms/publish/*`
- `summery/aiterms/check/*`

只有明确要求“保留中间稿”或 “debug 模式”时，才使用旧拆阶段流程。

## 选项语义

- `diagram=true` 或“生成一图看懂”：生成 brief 和图片提示词。
- `image=true` 或“生成本地图”：真实调用图片生成能力生成本地图。
- `imageOptimize=true` 或“优化图片”：生成 16:9、带 `zhizhi.xyz` 水印、100KB 以内的 WebP。
- `story=true` 或“生成寓言故事”：生成独立寓言故事素材。
- `sync=true` 或“同步数据库”：同步目标环境 D1/R2；要求优化后的 WebP 存在、100KB 以内，并且目标环境后台 Cookie 已设置。
- 默认先同步测试环境；只有明确说“同步生产环境 / 同步生产库”时，才使用生产同步。
- `term=XXX，一条龙。`：完整执行 `pro`、一图看懂、本地图、图片优化、寓言故事和生产草稿同步。
- `term=XXX，一条龙，不要寓言故事。`：完整执行 `pro`、一图看懂、本地图、图片优化和测试环境草稿同步，但跳过寓言故事。

## 主要提示词

- `98-AI词条批量生成_prompt.md`：批量清单入口，一次只处理一个词条。
- `99-AI词条一键生成上线稿_prompt.md`：单个词条入口。
- `01-AI词条直接生成pro_prompt.md`：直接生成 `pro`。
- `05-AI词条一图看懂_prompt.md`：生成图解 brief/prompt；明确要求本地图时才生成图片。
- `00-AI词条资料卡_prompt.md`：可选资料卡缓存，仅在用户明确要求“使用资料卡”时使用。

旧拆阶段提示词仅用于 debug：

- `01-AI词条理解与初稿_prompt.md`
- `02-AI词条可导入MD发布稿_prompt.md`
- `03-AI词条发布质量检查_prompt.md`

## 内部检查命令

这些命令主要给 Codex 在流程中自动调用，用户日常不需要手动执行：

```bash
npm run ai-term:validate -- RAG
npm run ai-term:import:dry-run -- RAG
npm run ai-term:diagram:check -- RAG
npm run ai-term:diagram:optimize -- RAG
npm run ai-term:diagram:compress:dry-run -- RAG
npm run ai-term:push:test -- RAG
npm run ai-term:push:prod -- RAG
npm run ai-term:check -- RAG
```

可选资料卡缓存维护：

```bash
npm run ai-term:sources:match -- RAG
npm run ai-term:sources:index
```

## 文件位置

- `summery/aiterms/sources/`：可选资料卡缓存和 `index.json`，默认流程不依赖它。
- `summery/aiterms/pro/`：最终上线候选稿。
- `summery/aiterms/diagram/`：一图看懂 brief、提示词和本地图。
- `summery/aiterms/diagram/{{TERM}}_diagram.webp`：优化后的同步用图，固定 WebP、16:9、带 `zhizhi.xyz` 水印、目标 100KB 以内。
- `summery/aiterms/story/`：寓言故事素材。
- `summery/aiterms/tasks/terms.csv`：批量词条输入清单。

## 关键规则

- 批量生成时，一次只处理一个词条；一个词条完成本地校验后再进入下一个词条。
- 默认联网核查，不使用资料卡；只有用户明确要求“使用资料卡”时，才先读 `sources/index.json`，命中后只读单张资料卡。
- 本地图不是线上路径，不要写入 `diagram.image`。
- 只有优化后的 WebP 上传 R2 后，才把返回的 `/media/...` 路径写入 `diagram.image`。
- 同步生产前必须保持 `status: draft` 与 `source.human_reviewed: false`。
- 同步失败或前置条件缺失时，记录原因并继续处理后续词条。
- 测试环境同步使用 `AI_TERM_TEST_ADMIN_BASE_URL` + `AI_TERM_TEST_ADMIN_COOKIE` 和 `npm run ai-term:push:test -- TERM`。
- 生产环境同步使用 `AI_TERM_ADMIN_COOKIE` 和 `npm run ai-term:push:prod -- TERM`；不要在未明确要求生产时执行。
