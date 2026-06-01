# AI 词条资料卡

本目录用于保存可复用的 AI 词条资料卡，目的是减少重复联网核查和重复消耗 GPT 上下文。

## 使用规则

- 生成新词条时，先读取 `index.json` 做轻量命中判断。
- 只有命中当前词条或高度相关资料卡时，才读取对应 `source_file`。
- 不要把整个 `sources` 目录一次性读入上下文。
- 没有命中资料卡时，再联网核查资料。

## 资料卡模板

```md
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

## 高可信来源

- [来源标题](https://example.com)：说明它能证明什么。

## 易混淆边界

## 生产备注
```

## 维护命令

```bash
npm run ai-term:sources:index
```

常用配套检查：

```bash
npm run ai-term:validate -- RAG
npm run ai-term:import:dry-run -- RAG
npm run ai-term:diagram:check -- RAG
```
