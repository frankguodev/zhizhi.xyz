---
term: "LoRA"
slug: "lora"
aliases:
  - "Low-Rank Adaptation"
  - "低秩适配"
  - "低秩自适应"
last_verified_at: "2026-06-01"
source_count: 5
---

# LoRA 资料卡

## 稳定定义

LoRA 是 Low-Rank Adaptation 的缩写，常译作“低秩适配”。它是一种参数高效微调方法：冻结基础模型原始权重，只训练额外的低秩适配矩阵，用较少参数让模型适应新任务、领域或风格。

AI 语境中的 LoRA 不要和无线通信里的 LoRa 混淆。

## 高可信来源

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)：LoRA 原始论文，提出冻结预训练权重并注入低秩可训练矩阵的做法。
- [Microsoft Research: LoRA: Low-Rank Adaptation of Large Language Models](https://www.microsoft.com/en-us/research/?p=759361)：Microsoft Research 对 LoRA 论文和研究背景的介绍。
- [microsoft/LoRA GitHub repository](https://github.com/microsoft/LoRA)：LoRA 官方代码仓库，提供 loralib 实现和论文相关代码。
- [Hugging Face PEFT LoRA documentation](https://huggingface.co/docs/peft/developer_guides/lora)：说明 LoRA 在 PEFT 中的用法、配置和常见扩展。
- [Hugging Face PEFT documentation](https://huggingface.co/docs/peft/index)：介绍参数高效微调的整体背景和工具定位。

## 易混淆边界

- LoRA 不是一个能独立运行的小模型；它通常需要依附基础模型。
- LoRA 能减少可训练参数和资源需求，但不是免费微调。
- LoRA 不一定总是优于或劣于全量微调，效果取决于任务、数据、rank、插入层和评估方式。
- LoRA 与 QLoRA 相关但不同；QLoRA 通常结合量化基础模型和 LoRA 微调。

## 适合复用到 pro 的事实点

- LoRA 属于参数高效微调方法。
- LoRA 的典型做法是冻结预训练权重，在部分层加入可训练的低秩矩阵。
- LoRA 常用于开源大模型本地微调、领域任务适配、文生图风格/角色适配和多任务适配器管理。

## 不要直接写死的内容

- 不要写死 rank 推荐值、默认插入层或框架 API。
- 不要写“完全替代全量微调”。
- 不要写未经核实的性能或显存节省比例。

## 生产备注

- 建议分类：`model-training`。
- 相关词条：微调、参数高效微调、QLoRA、全量微调、量化、Adapter。
- 下次复核建议：核心论文稳定；Hugging Face PEFT 用法和扩展变体建议发布前复核。
