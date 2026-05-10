# 项目记忆规则

优先使用短小、结构化的项目记忆，不要反复读取很长的聊天历史。
- 完成有意义的功能或架构变更后，更新 `docs/project-state.md`，记录当前事实、变更文件、验证命令、已知注意点和建议下一步。
- 项目记忆保持简洁、事实化。优先记录稳定事实、文件路径、命令和决策，不记录聊天流水。

每一轮对话，我提出的任何问题都要记录在`docs/question_record.md`。
<!-- END:project-memory-rules -->

<!-- BEGIN:workflow-rules -->
# 工作规则
- App Router 开发要记住：本项目使用 Next.js `16.2.4`，`params` 和 `searchParams` props 是 Promise。
- 完成代码变更前，在可行时运行 `npm run lint` 已包含 UTF-8 BOM 检查。
<!-- END:workflow-rules -->