---
term: "MCP"
slug: "mcp"
aliases:
  - "Model Context Protocol"
  - "模型上下文协议"
  - "MCP 协议"
last_verified_at: "2026-05-31"
source_count: 6
---

# MCP 资料卡

## 稳定定义

MCP 是 Model Context Protocol 的缩写，中文常译作“模型上下文协议”。它是一种面向 AI 应用的开放协议，用统一方式连接外部工具、数据源、提示词工作流和上下文资源。

MCP 不是模型本身，也不负责生成内容。它更像 AI 应用和外部系统之间的连接协议层。

## 高可信来源

- [Specification - Model Context Protocol](https://modelcontextprotocol.io/specification/latest)：官方最新规范入口，说明 MCP 的协议要求和安全注意事项。
- [Overview - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25/basic)：官方规范基础页，说明 MCP 消息遵循 JSON-RPC 2.0。
- [modelcontextprotocol/modelcontextprotocol](https://github.com/modelcontextprotocol/modelcontextprotocol)：官方 GitHub 仓库，包含 MCP 规范和文档来源。
- [Building MCP servers for ChatGPT and API integrations](https://platform.openai.com/docs/mcp/)：OpenAI 官方文档，说明如何构建远程 MCP Server 并接入 ChatGPT/API 场景。
- [Model Context Protocol (MCP) | OpenAI Agents SDK](https://openai.github.io/openai-agents-js/guides/mcp/)：OpenAI Agents SDK 文档，说明 Hosted MCP server tools 和远程 MCP Server 使用方式。
- [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)：Anthropic 发布 MCP 的官方公告，说明 MCP 的提出背景和目标。

## 易混淆边界

- MCP 不是大模型，也不是 Agent 本身。
- MCP 不自动保证安全；权限、授权、工具边界和 UI 提示仍取决于具体实现。
- MCP Server 可以封装 API，但不等同于普通 API 地址；它还会声明工具、资源、提示词和调用边界。
- MCP 和 Function Calling、插件、连接器可以并存。

## 适合复用到 pro 的事实点

- MCP 角色通常包括 Host、Client、Server。
- MCP 服务器常见能力包括 Tools、Resources、Prompts。
- MCP 基础通信遵循 JSON-RPC 2.0。
- 常见场景包括 AI Coding 工具连接本地项目、企业业务系统接入 AI 助手、个人助手连接工具和可复用 Agent 工具体系。

## 不要直接写死的内容

- 不要把某个平台的 MCP 支持范围写成所有平台通用能力。
- 不要写“MCP 会替代所有插件或函数调用”。
- 不要忽略本地服务器、远程服务器、安全授权之间的差异。

## 生产备注

- 建议分类：`ai-protocol`；可选副分类 `ai-agent`。
- 相关词条：Skill、Agent、Tool Calling、Function Calling、RAG、JSON-RPC、AI Connector。
- 下次复核建议：MCP 生态变化快，建议 1-2 个月复核官方规范和平台支持范围。
