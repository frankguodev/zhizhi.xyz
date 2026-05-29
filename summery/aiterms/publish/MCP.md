---
term: "MCP"
term_zh: "模型上下文协议"
full_name: "Model Context Protocol"
slug: "mcp"
locale: "zh"
translation_key: "mcp"

short_concept: "连接 AI 应用与外部工具、数据源和工作流的开放协议。"
short_desc: "MCP（Model Context Protocol）是一种开放协议，用统一方式让 AI 应用连接外部数据源、工具和提示词工作流，常用于 Agent、AI Coding 和企业 AI 集成。"
tagline: "让 AI 应用更标准地连接外部世界。"

beginner_notes:
  plain_explanation: "MCP 可以理解为 AI 应用连接外部工具和数据的一套通用接口，让不同 AI 客户端和不同工具服务器按同一套规则沟通。"
  analogy: "像 AI 应用世界里的 USB-C 接口：不是设备本身，而是一种更统一的连接方式。"
  why_it_matters: "它降低了 AI 应用接入文件、数据库、业务系统和工具的重复集成成本，也让权限、安全和生态复用更容易被讨论和实现。"
  common_misconception: "MCP 不是大模型，也不自动保证安全；它只是协议层的连接方式，具体安全性取决于客户端、服务器和授权实现。"

type: "protocol"
difficulty: "beginner"
status: "draft"
visibility: "public"

heat_score: 88
quality_score: 86
trending: true
sort_order: 0

content:
  format: "markdown"
  version: "ai-term-md-v1"

categories:
  - name: "AI 基础概念"
    slug: "ai-basics"
    description: "帮助普通用户理解 AI 世界中的基础术语和关键概念。"
    sort_order: 10
  - name: "AI Agent"
    slug: "ai-agent"
    description: "围绕 Agent、工具调用和多步任务执行的概念。"
    sort_order: 20
  - name: "开发者工具"
    slug: "developer-tools"
    description: "与开发者工作流、AI Coding 和工具生态相关的内容。"
    sort_order: 30
tags:
  - name: "MCP"
    slug: "mcp"
  - name: "Model Context Protocol"
    slug: "model-context-protocol"
  - name: "模型上下文协议"
    slug: "model-context-protocol-zh"
  - name: "Agent"
    slug: "agent"
  - name: "AI Coding"
    slug: "ai-coding"
  - name: "工具调用"
    slug: "tool-calling"
  - name: "JSON-RPC"
    slug: "json-rpc"
  - name: "连接器"
    slug: "connector"
relations:
  - term: "Agent"
    slug: "agent"
    relation_type: "related"
    description: "Agent 通常需要读取上下文和调用工具，MCP 是其连接外部能力的一种协议方式。"
    sort_order: 10
  - term: "Tool Calling"
    slug: "tool-calling"
    relation_type: "related"
    description: "MCP 中的 Tools 与模型工具调用密切相关。"
    sort_order: 20
  - term: "Function Calling"
    slug: "function-calling"
    relation_type: "similar"
    description: "Function Calling 与 MCP 都涉及外部能力调用，但层级和生态范围不同。"
    sort_order: 30
  - term: "RAG"
    slug: "rag"
    relation_type: "related"
    description: "RAG 关注检索增强，MCP 可用于暴露资源和数据源，是更广的连接协议。"
    sort_order: 40
  - term: "JSON-RPC"
    slug: "json-rpc"
    relation_type: "upstream"
    description: "MCP 的基础消息通信遵循 JSON-RPC 2.0。"
    sort_order: 50
  - term: "AI Connector"
    slug: "ai-connector"
    relation_type: "ecosystem"
    description: "MCP 可作为 AI 连接器的一种标准化实现方式。"
    sort_order: 60

seo:
  title: "MCP 是什么？模型上下文协议的通俗解释"
  description: "MCP（Model Context Protocol）是连接 AI 应用与外部工具、数据源和工作流的开放协议。本文用小白能理解的方式解释 MCP 的作用、架构、使用场景和常见误解。"
  keywords: ["MCP", "Model Context Protocol", "模型上下文协议", "AI Agent", "AI Coding", "工具调用", "AI 连接器"]
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "MCP 是什么？模型上下文协议的通俗解释"
  description: "理解 MCP 如何让 AI 应用以统一方式连接工具、数据源和工作流。"
  type: "article"
  image: ""
  image_alt: "抽象的 AI 应用通过统一接口连接工具、数据源和工作流。"

twitter:
  card: "summary_large_image"
  title: "MCP 是什么？模型上下文协议的通俗解释"
  description: "理解 MCP 如何让 AI 应用以统一方式连接工具、数据源和工作流。"
  image: ""

source:
  source_note: "本稿主要参考 MCP 官方文档、官方规范、官方 GitHub 仓库、Anthropic 发布公告和 OpenAI 官方 MCP 文档；发布前建议再次检查 MCP 规范版本和各平台支持范围。"
  ai_assisted: true
  human_reviewed: false
  last_verified_at: "2026-05-29"
  published_at: ""

structured_data:
  schema_type: "DefinedTerm"
  name: "MCP"
  alternate_name: "Model Context Protocol, 模型上下文协议, MCP 协议"
  description: "MCP 是一种让 AI 应用以统一方式连接外部工具、数据源和工作流的开放协议。"
  in_language: "zh-CN"
  publisher_name: "知之"
---

# MCP

## 一句话概念

MCP 是一种让 AI 应用以统一方式连接外部工具、数据源和工作流的开放协议。

## 给小白的理解

MCP 的全称是 Model Context Protocol，常被中文语境称为“模型上下文协议”。如果把 AI 应用想象成一台电脑，MCP 有点像给这台电脑准备了一种统一接口：通过这个接口，AI 可以在用户授权和应用控制下连接文件、数据库、搜索、设计工具、代码仓库、业务系统，甚至调用某些可执行工具。

它解决的不是“模型变聪明”本身，而是“模型怎样可靠地接触外部世界”。过去每接一个服务，开发者往往要为这个服务单独写一套集成逻辑；MCP 希望把这种连接方式标准化，让 MCP 客户端和 MCP 服务器之间按同一套规则沟通。

更通俗地说，MCP 不是某个单一产品，也不是一个新模型。它是一套协议和生态：有规范、有 SDK、有客户端、有服务器，也有围绕安全、授权、工具调用和上下文传递的一整套开发实践。

## 它本质上是什么？

MCP 本质上是一个面向 AI 应用的开放协议，重点标准化“AI 应用如何发现、读取和调用外部能力”。官方规范把参与者分成几类：MCP Host 是承载 AI 体验的应用，例如 AI 编程工具或聊天应用；MCP Client 是 Host 内部负责连接某个服务器的组件；MCP Server 则提供上下文或能力，例如暴露文件、数据库、API、提示词模板或可执行工具。

在协议层面，MCP 使用 JSON-RPC 2.0 消息进行通信，并包含生命周期管理、能力协商、工具、资源、提示词、日志、进度、错误处理等机制。服务器侧最常见的三类能力是 Tools、Resources、Prompts：Tools 偏“能做什么”，Resources 偏“能读什么”，Prompts 偏“怎样组织一段可复用工作流或提示模板”。

AI 世界需要 MCP，是因为 Agent 和 AI Coding 工具越来越依赖外部上下文。模型如果只停留在聊天窗口里，很难理解真实项目、业务数据和用户环境；但如果每个工具都用完全不同的接入方式，生态会变得碎片化、难维护，也更难做权限控制和安全审查。MCP 试图在“模型能力”和“现实系统”之间提供一层相对统一的连接方式。

## 容易误解的地方

### 误解一：MCP 是一个新的大模型

更准确的理解是：MCP 不是模型，也不负责生成文本。它是一种连接协议，让 AI 应用能以标准方式接入外部数据源、工具和工作流。

### 误解二：只要用了 MCP，AI 就能安全地调用任何工具

更准确的理解是：MCP 能提供协议层面的连接方式，但安全仍依赖具体实现。官方规范也强调，工具调用、数据访问和采样请求都需要明确的用户授权、权限控制和清晰的用户界面。尤其是能执行代码、读写文件或访问私有数据的 MCP Server，要谨慎配置。

### 误解三：MCP Server 就等于一个普通 API

更准确的理解是：MCP Server 可以封装 API，但它不是简单把 API 地址暴露给模型。它通常还会声明可用工具、资源、提示词、参数结构、返回内容和调用边界，使 AI 客户端能够发现和使用这些能力。

### 误解四：MCP 会替代所有现有插件和函数调用

更准确的理解是：MCP 更像一层标准化连接方式。它可能与函数调用、插件、连接器、Agent SDK 等能力并存。不同平台对 MCP 支持范围不同，有的只支持远程 MCP 工具，有的还支持资源、提示词或本地服务器。

## 常见使用场景

### AI Coding 工具连接本地项目

开发者可以通过 MCP Server 暴露文件系统、Git 仓库、数据库 schema、错误监控系统等信息，让 AI 编程工具在更完整的上下文中分析代码、定位问题或生成修改建议。

### 企业知识库和业务系统接入 AI 助手

企业可以把内部文档、CRM、数据仓库、工单系统等能力包装成 MCP Server，再由 AI 助手按权限访问。这样做的目标不是让模型“记住”所有数据，而是在需要时读取当前、可控的业务上下文。

### 个人 AI 助手连接日常工具

在合适的授权和平台支持下，AI 应用可以通过 MCP 连接日历、笔记、任务管理、搜索或设计工具，帮助用户完成跨应用任务，例如整理资料、查询日程或生成工作流草稿。

### 构建可复用的 Agent 工具生态

工具开发者可以把某项能力做成 MCP Server。只要不同 AI 客户端支持同一协议，这个能力就有机会被多个 AI 应用复用，而不是为每个平台单独写适配。

## 相关概念

- **Agent**：MCP 常出现在 Agent 语境中，因为 Agent 需要读取上下文、调用工具和执行多步任务。
- **Tool Calling**：工具调用是模型使用外部函数或工具的能力；MCP 可以为工具发现、调用和返回提供更标准化的协议层。
- **Function Calling**：函数调用通常是模型厂商 API 内部的工具描述和调用方式；MCP 更偏跨应用、跨工具生态的连接协议。
- **RAG**：RAG 主要关注检索外部知识并增强回答；MCP 的范围更广，还包括工具调用、提示词模板和上下文资源。
- **JSON-RPC**：MCP 的基础通信消息遵循 JSON-RPC 2.0，理解它有助于理解 MCP 的请求、响应和通知机制。
- **AI Connector**：连接器通常是面向具体服务的集成；MCP 可以作为构建连接器的一种标准化方式。

## 参考资料

- [What is the Model Context Protocol (MCP)?](https://modelcontextprotocol.io/docs/getting-started/intro)：官方入门页，说明 MCP 是连接 AI 应用与外部系统的开放标准，并给出 USB-C 类比和典型场景。
- [Model Context Protocol Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18)：官方规范页，说明 MCP 使用 JSON-RPC 2.0，定义 Host、Client、Server，以及 tools、resources、prompts 等核心能力。
- [Architecture overview - Model Context Protocol](https://modelcontextprotocol.io/docs/learn/architecture)：官方架构说明，解释 Host、Client、Server、数据层、传输层、STDIO 和 Streamable HTTP 等概念。
- [modelcontextprotocol/modelcontextprotocol](https://github.com/modelcontextprotocol/modelcontextprotocol)：官方 GitHub 仓库，包含 MCP 规范、协议 schema 和官方文档。
- [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)：Anthropic 于 2024-11-25 发布 MCP 的官方公告，说明 MCP 的提出背景、目标和早期组成部分。
- [Building MCP servers for ChatGPT and API integrations](https://platform.openai.com/docs/mcp/overview)：OpenAI 官方文档，说明如何构建远程 MCP Server 并用于 ChatGPT connectors、deep research 或 API 集成。
- [Connectors and MCP servers](https://platform.openai.com/docs/guides/tools-remote-mcp)：OpenAI 官方文档，说明远程 MCP Server 与 connectors 可为模型提供外部能力。
