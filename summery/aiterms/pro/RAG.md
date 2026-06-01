---
term: "RAG"
term_zh: "检索增强生成"
full_name: "Retrieval-Augmented Generation"
slug: "rag"
locale: "zh"
translation_key: "rag"

short_concept: "让模型先检索外部资料，再基于资料生成回答的方法。"
short_desc: "RAG（检索增强生成）是一种把外部知识库、检索系统和大模型组合起来的 AI 应用方法，让模型回答时可以参考当前、可维护、可追溯的资料。"
tagline: "让模型回答前先翻资料。"

beginner_notes:
  plain_explanation: "RAG 像给 AI 配一个资料柜：用户提问后，系统先从资料柜里找相关内容，再让模型根据这些内容回答。"
  analogy: "像开卷考试：模型不是只凭记忆答题，而是先翻到相关资料，再组织成回答。"
  why_it_matters: "它让 AI 更容易使用私有知识、最新资料和可追溯来源，是很多知识库问答和企业 AI 应用的基础架构。"
  common_misconception: "RAG 不是向量数据库本身，也不能保证完全消除幻觉；检索质量和资料质量同样关键。"

type: "method"
difficulty: "beginner"
status: "draft"
visibility: "public"

heat_score: 86
quality_score: 88
trending: true
sort_order: 0

content:
  format: "markdown"
  version: "ai-term-md-v1"

categories:
  - name: "检索与知识(RAG)"
    slug: "rag"
    description: "让模型用外部知识回答"
    sort_order: 40
  - name: "大语言模型"
    slug: "llm"
    description: "LLM 的原理与关键术语"
    sort_order: 20

relations:
  - term: "Embedding"
    slug: "embedding"
    relation_type: "upstream"
    description: "Embedding 常用于把文本转成可检索向量，是许多 RAG 系统的基础能力。"
    sort_order: 10
  - term: "向量数据库"
    slug: "vector-database"
    relation_type: "upstream"
    description: "向量数据库常用于存储和查询 RAG 的文档向量。"
    sort_order: 20
  - term: "语义检索"
    slug: "semantic-search"
    relation_type: "upstream"
    description: "语义检索帮助 RAG 找到含义相关的资料片段。"
    sort_order: 30
  - term: "知识库"
    slug: "knowledge-base"
    relation_type: "related"
    description: "知识库是 RAG 常见外部资料来源。"
    sort_order: 40
  - term: "微调"
    slug: "fine-tuning"
    relation_type: "similar"
    description: "微调和 RAG 都能增强模型在特定场景中的表现，但机制不同。"
    sort_order: 50
  - term: "MCP"
    slug: "mcp"
    relation_type: "related"
    description: "MCP 可用于连接外部数据源和工具，RAG 偏检索外部知识增强回答。"
    sort_order: 60
  - term: "Agent"
    slug: "agent"
    relation_type: "downstream"
    description: "Agent 可以把 RAG 当作查资料能力，在多步任务中使用。"
    sort_order: 70

seo:
  title: "RAG 是什么？检索增强生成的通俗解释"
  description: "RAG（检索增强生成）是一种让大模型先检索外部资料，再基于资料生成回答的方法。本文用小白能理解的方式解释 RAG 的流程、价值、场景和常见误解。"
  keywords:
    - "RAG"
    - "检索增强生成"
    - "Retrieval-Augmented Generation"
    - "向量数据库"
    - "语义检索"
    - "Embedding"
    - "知识库"
    - "大语言模型"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "RAG 是什么？检索增强生成的通俗解释"
  description: "用一篇词条理解 RAG 如何让模型先检索外部资料，再基于资料生成回答。"
  type: "article"
  image: ""
  image_alt: "抽象的 AI 模型先从知识库检索资料，再生成回答。"

twitter:
  card: "summary_large_image"
  title: "RAG 是什么？检索增强生成的通俗解释"
  description: "用一篇词条理解 RAG 如何让模型先检索外部资料，再基于资料生成回答。"
  image: ""

diagram:
  image: ""
  image_alt: "一张手绘图展示 RAG 如何从用户问题出发，检索知识库资料，并把资料交给大模型生成回答。"

source:
  source_note: "本稿主要参考 NIST 术语表、RAG 原始论文、OpenAI Retrieval 文档和 LangChain 检索/RAG 文档；发布前建议再次检查链接和当前工程实践表述。"
  ai_assisted: true
  human_reviewed: false
  last_verified_at: "2026-06-01"
  published_at: ""

structured_data:
  schema_type: "DefinedTerm"
  name: "RAG"
  alternate_name: "Retrieval-Augmented Generation, 检索增强生成"
  description: "RAG 是一种让模型先检索外部资料，再基于资料生成回答的方法。"
  in_language: "zh-CN"
  publisher_name: "知之"
---

# RAG

## 一句话概念

RAG 是让模型先检索外部资料，再带着这些资料生成回答的一种方法。

## 快速理解

RAG 的全称是 Retrieval-Augmented Generation，常译作“检索增强生成”。它解决的是一个很现实的问题：大模型本身知道很多通用知识，但它不一定知道你的公司文档、最新政策、内部产品说明或某个项目里的细节。

RAG 的做法不是把模型重新训练一遍，而是在用户提问时，先去知识库、文档库、向量数据库或搜索系统里找相关资料，再把这些资料连同问题一起交给模型生成回答。这样，模型回答时就不只是凭“记忆”说话，而是多了一份可被检查的上下文。

## 它本质上是什么？

RAG 本质上是一种把“检索系统”和“生成模型”组合起来的应用架构。它通常包含两条链路：一条是把文档整理成可检索的知识库，例如清洗文档、切块、生成向量、建立索引；另一条是在用户提问时执行检索，把相关片段放进模型上下文，再生成回答。

AI 世界需要 RAG，是因为模型参数里的知识不容易随时更新，也不适合承载每个组织的私有资料。相比重新训练或微调模型，RAG 更像是在回答前给模型临时翻资料：资料可以更新，来源可以追踪，成本和风险通常也更容易控制。

在工程实践中，RAG 的质量很大程度取决于“检索”而不只是“生成”。知识库是否干净、文档是否切得合适、Embedding 是否适合、向量搜索和关键词搜索是否需要结合、返回片段是否足够相关，都会影响最终回答。

## 容易误解的地方

### 误解一：RAG 等于向量数据库

更准确的理解是：向量数据库常用于 RAG，但它只是其中一部分。RAG 还包括文档处理、切块、检索策略、重排、提示词组织、生成回答和结果评估。

### 误解二：用了 RAG 就不会幻觉

更准确的理解是：RAG 可以降低模型凭空回答的概率，但不能保证完全正确。检索错了、资料过期了、上下文太长或模型没有正确使用资料，仍然会导致错误回答。

### 误解三：RAG 一定比微调更好

更准确的理解是：RAG 适合接入可更新、可追溯的外部知识；微调更适合改变模型风格、任务习惯或特定行为。两者不是简单替代关系，也可能组合使用。

### 误解四：把所有资料塞进知识库就够了

更准确的理解是：RAG 很依赖知识整理质量。重复、过期、权限不清、结构混乱的资料，会让检索结果变差，最终影响模型回答。

## 常见使用场景

### 企业知识库问答

把产品文档、制度说明、FAQ、工单经验等资料放进可检索系统，用户提问时先找相关片段，再生成回答。这样比让模型凭训练记忆回答更适合企业内部知识。

### AI Coding 和项目文档助手

在代码库、README、接口文档和历史 issue 中检索上下文，再让模型解释代码、定位问题或生成修改建议。RAG 在这里的价值是让模型更贴近当前项目。

### 客服和运营支持

客服机器人可以先检索最新政策、商品说明和服务规则，再组织回答。它的重点不是让模型自由发挥，而是让回答尽量贴近可维护的知识来源。

### Agent 调用外部知识

Agent 在多步任务中可能需要多次查资料、查数据库或调用搜索工具。此时 RAG 可以作为“找资料”的能力，被 Agent 在需要时调用。

## 相关概念

- **Embedding**：RAG 常用 Embedding 把文本转成向量，方便按语义相似度检索。
- **向量数据库**：常用于存储和查询文本向量，是许多 RAG 系统的知识索引组件。
- **语义检索**：RAG 常见检索方式之一，目标是找到含义相关而不只是关键词相同的内容。
- **知识库**：RAG 的外部知识来源，质量直接影响回答质量。
- **微调**：微调改变模型参数或行为习惯；RAG 更偏在回答时接入外部资料。
- **MCP**：MCP 偏连接工具和数据源；RAG 偏检索外部知识并增强回答，两者可以在 Agent 系统中配合。
- **Agent**：Agent 可以把 RAG 当作查资料工具，在多步任务中决定何时检索。

## 参考资料

- [NIST CSRC Glossary: RAG](https://csrc.nist.gov/glossary/term/rag)：给出 RAG 的权威定义，强调模型与独立检索系统或知识库配合，并把相关信息提供给模型上下文。
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)：RAG 早期代表论文，提出把预训练模型的参数记忆与非参数外部记忆结合。
- [OpenAI Retrieval Guide](https://developers.openai.com/api/docs/guides/retrieval)：说明语义搜索、向量存储和检索结果如何与模型响应结合。
- [LangChain Retrieval Documentation](https://docs.langchain.com/oss/python/langchain/retrieval)：说明检索如何在运行时获取外部知识，并成为 RAG 的基础。
- [LangChain RAG Tutorial](https://docs.langchain.com/oss/python/langchain/rag)：展示常见 RAG 应用如何先检索相关文档，再让模型基于检索内容生成回答。
