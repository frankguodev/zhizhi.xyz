---
term: "RAG"
slug: "rag"
aliases:
  - "Retrieval-Augmented Generation"
  - "检索增强生成"
last_verified_at: "2026-06-01"
source_count: 5
---

# RAG 资料卡

## 稳定定义

RAG 是 Retrieval-Augmented Generation 的缩写，常译作“检索增强生成”。它是一种让模型在生成回答前先从外部检索系统或知识库取回相关资料，再把这些资料放进上下文辅助生成的方法。

RAG 的核心不是某个数据库产品，而是“检索 + 生成”的应用架构。它通常用于让模型使用可更新、可维护、可追溯的外部知识。

## 高可信来源

- [NIST CSRC Glossary: RAG](https://csrc.nist.gov/glossary/term/rag)：给出 RAG 的权威定义，强调模型与独立检索系统或知识库配合，并把相关信息提供给模型上下文。
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)：RAG 早期代表论文，提出把预训练模型的参数记忆与非参数外部记忆结合。
- [OpenAI Retrieval Guide](https://developers.openai.com/api/docs/guides/retrieval)：说明语义搜索、向量存储和检索结果如何与模型响应结合。
- [LangChain Retrieval Documentation](https://docs.langchain.com/oss/python/langchain/retrieval)：说明检索如何在运行时获取外部知识，并成为 RAG 的基础。
- [LangChain RAG Tutorial](https://docs.langchain.com/oss/python/langchain/rag)：展示常见 RAG 应用如何先检索相关文档，再让模型基于检索内容生成回答。

## 易混淆边界

- RAG 不等于向量数据库；向量数据库只是许多 RAG 系统的组件之一。
- RAG 不能保证完全消除幻觉；资料质量、切块、检索和提示组织都会影响结果。
- RAG 和微调不是简单替代关系；RAG 偏运行时接入外部知识，微调偏改变模型参数或行为习惯。

## 适合复用到 pro 的事实点

- RAG 通常包含文档整理、切块、索引、检索、上下文组织和生成回答。
- RAG 适合企业知识库问答、项目文档助手、客服支持和 Agent 查资料能力。
- RAG 的质量很大程度取决于检索质量，而不只是大模型生成能力。

## 不要直接写死的内容

- 不要写死某个框架或向量数据库是 RAG 的必要条件。
- 不要写“用了 RAG 就不会幻觉”。
- 不要写未经核实的性能提升百分比。

## 生产备注

- 建议分类：`rag`；可选副分类 `llm`。
- 相关词条：Embedding、向量数据库、语义检索、知识库、微调、MCP、Agent。
- 下次复核建议：稳定概念，6 个月复核一次；如 OpenAI 或 LangChain 文档路径变化，发布前检查链接。
