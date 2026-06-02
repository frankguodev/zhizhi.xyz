---
term: "LoRA"
term_zh: "低秩适配"
full_name: "Low-Rank Adaptation"
slug: "lora"
locale: "zh"
translation_key: "lora"

short_concept: "冻结大模型原始权重，只训练少量低秩适配参数的微调方法。"
short_desc: "LoRA（Low-Rank Adaptation）是一种参数高效微调方法，它让基础模型主体保持不动，只训练额外的小型低秩矩阵，从而更低成本地适配新任务、领域或风格。"
tagline: "给大模型加一组可拆卸的小调节片。"

beginner_notes:
  plain_explanation: "LoRA 像给一台已经造好的机器加小调节片：机器主体不拆，只训练这些小配件，让它更适合某个任务。"
  analogy: "像不重装整台机器，只在关键旋钮上加微调装置。"
  why_it_matters: "它让普通团队更容易定制大模型，也让不同任务可以保存和切换较小的适配器。"
  common_misconception: "LoRA 不是一个能单独运行的小模型，而是依附在基础模型上的适配参数。"

type: "method"
difficulty: "intermediate"
status: "draft"
visibility: "public"

heat_score: 84
quality_score: 87
trending: true
sort_order: 0

content:
  format: "markdown"
  version: "ai-term-md-v1"

categories:
  - name: "模型训练与微调"
    slug: "model-training"
    description: "模型怎么练出来/怎么调"
    sort_order: 70

relations:
  - term: "微调"
    slug: "fine-tuning"
    relation_type: "upstream"
    description: "LoRA 是微调的一种参数高效实现方式。"
    sort_order: 10
  - term: "参数高效微调"
    slug: "parameter-efficient-fine-tuning"
    relation_type: "upstream"
    description: "LoRA 属于 PEFT 方法家族。"
    sort_order: 20
  - term: "QLoRA"
    slug: "qlora"
    relation_type: "downstream"
    description: "QLoRA 通常把量化基础模型与 LoRA 微调结合。"
    sort_order: 30
  - term: "全量微调"
    slug: "full-fine-tuning"
    relation_type: "similar"
    description: "全量微调是理解 LoRA 成本优势和能力边界的对照方法。"
    sort_order: 40
  - term: "量化"
    slug: "quantization"
    relation_type: "related"
    description: "量化常与 LoRA 组合使用，但两者解决的问题不同。"
    sort_order: 50
  - term: "Adapter"
    slug: "adapter"
    relation_type: "similar"
    description: "Adapter 和 LoRA 都是适配大模型的参数高效方法。"
    sort_order: 60

seo:
  title: "LoRA 是什么？低秩适配和大模型微调的通俗解释"
  description: "LoRA（Low-Rank Adaptation）是一种参数高效微调方法。本文用小白能理解的方式解释 LoRA 如何冻结基础模型、训练低秩适配参数，以及它和全量微调、QLoRA 的区别。"
  keywords:
    - "LoRA"
    - "Low-Rank Adaptation"
    - "低秩适配"
    - "大模型微调"
    - "参数高效微调"
    - "PEFT"
    - "QLoRA"
    - "全量微调"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "LoRA 是什么？低秩适配和大模型微调的通俗解释"
  description: "用一篇词条理解 LoRA 如何让基础模型保持不动，只训练少量低秩适配参数。"
  type: "article"
  image: ""
  image_alt: "一张图展示基础模型保持冻结，并通过 LoRA 适配器学习新任务。"

twitter:
  card: "summary_large_image"
  title: "LoRA 是什么？低秩适配和大模型微调的通俗解释"
  description: "用一篇词条理解 LoRA 如何让基础模型保持不动，只训练少量低秩适配参数。"
  image: ""

diagram:
  image: ""
  image_alt: "一张手绘图展示 LoRA 如何冻结基础模型原始权重，只训练低秩适配器来适配新任务。"

source:
  source_note: "本稿主要参考 LoRA 原始论文、Microsoft Research 页面、官方 GitHub 仓库和 Hugging Face PEFT 文档；发布前建议再次核查 PEFT 文档当前 API 表述。"
  ai_assisted: true
  human_reviewed: false
  last_verified_at: "2026-06-01"
  published_at: ""

structured_data:
  schema_type: "DefinedTerm"
  name: "LoRA"
  alternate_name: "Low-Rank Adaptation, 低秩适配"
  description: "LoRA 是一种冻结大模型原始权重，只训练少量低秩适配参数的微调方法。"
  in_language: "zh-CN"
  publisher_name: "知之"
---

# LoRA

## 一句话概念

LoRA 是一种冻结大模型原始权重，只训练少量低秩适配参数的微调方法。

## 快速理解

如果把一个大模型看成一台已经造好的复杂机器，全量微调就像把机器里大量零件都重新调一遍；LoRA 更像是在关键位置加上几块可拆卸的小调节片，让机器适应新任务，但不直接改动原来的主体结构。

它的核心想法是：很多微调任务不一定需要改动模型里的全部参数，可以把需要学习的“变化量”压缩成低秩矩阵。训练时，原模型权重保持冻结，只训练这些额外的小矩阵；部署或合并时，再把这些变化应用到模型对应层上。

## 它本质上是什么？

LoRA 本质上是一种参数高效微调方法。它不是一个单独模型，也不是某个厂商产品，而是一种训练和适配大模型的技术思路。

传统全量微调会更新模型中大量原始参数。对于参数规模很大的模型，这会带来高训练成本、高显存占用，也会让不同任务各自维护一整套模型权重。LoRA 的做法是冻结预训练模型的原始权重，在部分层里加入可训练的低秩矩阵，用这些小矩阵去学习任务需要的权重变化。

用更直观的话说：模型主体不动，LoRA 只学习“怎么轻轻拨动模型的部分行为”。这些额外参数通常比原模型小得多，因此更容易训练、保存、分享和切换。Hugging Face PEFT 等工具也把 LoRA 作为常见适配方式之一，方便开发者在 Transformer、扩散模型等场景里使用。

AI 世界需要 LoRA，是因为模型越来越大，而很多团队只想让模型适应一个领域、一种风格或一批任务，并不一定有资源重新训练或全量微调整个模型。LoRA 提供了一条更轻量的路径：保留基础模型能力，用较小的适配参数完成定制。

## 容易误解的地方

### 误解一：LoRA 是一个小模型

LoRA 通常是一组附加在基础模型上的适配参数。它本身不能脱离基础模型独立完成推理，需要和对应的 base model 配合使用。

### 误解二：用了 LoRA 就等于免费微调

LoRA 能显著减少可训练参数和训练资源需求，但仍然需要数据、算力、训练经验和评估。数据脏、任务目标不清或超参数不合适，结果仍然可能很差。

### 误解三：LoRA 一定不如全量微调

LoRA 在许多任务中可以接近或达到全量微调效果，但它不是所有任务的绝对最优解。任务复杂度、模型结构、rank 设置、训练数据和评估方式都会影响结果。

### 误解四：LoRA 和 QLoRA 是一回事

LoRA 关注用低秩适配参数做高效微调；QLoRA 则把量化基础模型与 LoRA 微调结合起来，目标是进一步降低显存占用。两者相关，但不是同一个概念。

### 误解五：AI 里的 LoRA 和无线通信 LoRa 是同一个东西

不是。AI 里的 LoRA 是 Low-Rank Adaptation；无线通信里的 LoRa 通常指 Long Range 调制技术。大小写和语境都容易让人混淆，发布时要明确说明。

## 常见使用场景

### 1. 领域模型微调

团队可以在医学、法律、客服、企业知识等垂直数据上训练 LoRA 适配器，让基础模型更适应特定表达、格式或任务习惯，同时不必保存一整份全量微调模型。

### 2. 开源大模型本地微调

个人开发者或小团队常用 LoRA 在有限显存下微调开源模型，例如让模型适应某种指令格式、写作风格或分类任务。它降低了入门门槛，但仍需要认真处理数据和评估。

### 3. 文生图风格或角色适配

在扩散模型社区里，LoRA 也常被用来学习某种画风、角色特征或视觉概念。这里的原理仍是用较少适配参数调整基础模型行为，但版权、肖像和数据来源需要额外注意。

### 4. 多任务适配器管理

同一个基础模型可以对应多个 LoRA 适配器，不同任务加载不同适配器。这让模型服务有机会在不复制整套大模型权重的情况下，支持多种定制能力。

## 相关概念

- **微调**：LoRA 是微调的一种高效方式，重点是减少需要训练和保存的参数。
- **参数高效微调**：LoRA 属于 PEFT 家族，和 Adapter、Prefix Tuning、IA3 等方法都在解决“少改参数也能适配任务”的问题。
- **QLoRA**：QLoRA 通常把量化后的基础模型与 LoRA 训练结合，用来进一步降低显存需求。
- **全量微调**：全量微调会更新模型大量原始参数，是理解 LoRA 优势和边界的对照概念。
- **量化**：量化主要压缩或降低模型权重表示精度，常和 LoRA 组合使用，但目标和机制不同。
- **Adapter**：Adapter 也是常见适配方法之一，LoRA 原论文将其与 LoRA 做过对比。

## 参考资料

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)：LoRA 原始论文，提出冻结预训练权重并注入低秩可训练矩阵的做法。
- [Microsoft Research: LoRA: Low-Rank Adaptation of Large Language Models](https://www.microsoft.com/en-us/research/?p=759361)：Microsoft Research 对 LoRA 论文和研究背景的介绍。
- [microsoft/LoRA GitHub repository](https://github.com/microsoft/LoRA)：LoRA 官方代码仓库，提供 loralib 实现和论文相关代码。
- [Hugging Face PEFT LoRA documentation](https://huggingface.co/docs/peft/developer_guides/lora)：说明 LoRA 在 PEFT 中的用法、配置和常见扩展。
- [Hugging Face PEFT documentation](https://huggingface.co/docs/peft/index)：介绍参数高效微调的整体背景和工具定位。
