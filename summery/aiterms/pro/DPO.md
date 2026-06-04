---
term: "DPO"
term_zh: "直接偏好优化"
full_name: "Direct Preference Optimization"
slug: "dpo"
locale: "zh"
translation_key: "dpo"

short_concept: "DPO 是用成对偏好数据直接微调语言模型、让模型更偏向被偏好回答的对齐方法。"
short_desc: "DPO（Direct Preference Optimization，直接偏好优化）把同一问题下的更好回答和较差回答作为训练信号，直接优化模型策略，避免单独训练显式奖励模型和使用复杂 RLHF 采样流程。它常用于大语言模型偏好对齐，但效果高度依赖偏好数据质量和基础模型状态。"
tagline: "用偏好对直接调整模型回答倾向。"

beginner_notes:
  plain_explanation: "DPO 可以理解为给模型看一组组“同一个问题，哪个回答更好”的样本，让模型学会更倾向生成被偏好的回答。"
  analogy: "它像老师批改两份同题作文：告诉模型哪份更好、哪份少选，再把这种偏好直接写进模型参数。"
  why_it_matters: "DPO 降低了偏好对齐流程的工程复杂度，让团队可以用成对偏好数据更直接地微调语言模型。"
  common_misconception: "DPO 不等于不需要偏好数据，也不等于自动安全；偏好样本偏了，模型也会学偏。"

type: "method"
difficulty: "advanced"
status: "draft"
visibility: "public"

heat_score: 88
quality_score: 90
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
  - name: "安全、评估与对齐"
    slug: "ai-safety"
    description: "让 AI 可靠、可信、可衡量"
    sort_order: 100

relations:
  - term: "RLHF"
    slug: "rlhf"
    relation_type: "related"
    description: "DPO 常被看作 RLHF 偏好对齐流程的一种更直接替代路线。"
    sort_order: 10
  - term: "偏好数据"
    slug: "preference-data"
    relation_type: "upstream"
    description: "DPO 依赖 chosen/rejected 成对偏好样本，数据质量直接影响对齐效果。"
    sort_order: 20
  - term: "奖励模型"
    slug: "reward-model"
    relation_type: "opposite"
    description: "传统 RLHF 常先训练奖励模型；DPO 的卖点之一是避免显式奖励模型训练。"
    sort_order: 30
  - term: "SFT"
    slug: "sft"
    relation_type: "upstream"
    description: "DPO 通常在监督微调后的模型上进行，减少偏好优化时的分布偏移。"
    sort_order: 40
  - term: "对齐"
    slug: "alignment"
    relation_type: "downstream"
    description: "DPO 是语言模型对齐方法之一，用于让输出更符合人类偏好或任务偏好。"
    sort_order: 50
  - term: "PPO"
    slug: "ppo"
    relation_type: "similar"
    description: "PPO 是 RLHF 中常见的强化学习优化算法，DPO 常被拿来与它比较。"
    sort_order: 60

seo:
  title: "DPO 是什么？一文看懂直接偏好优化"
  description: "DPO 是用成对偏好数据直接微调语言模型的对齐方法。本文解释它和 RLHF、奖励模型、偏好数据、SFT、PPO 的关系。"
  keywords:
    - "DPO"
    - "Direct Preference Optimization"
    - "直接偏好优化"
    - "RLHF"
    - "偏好数据"
    - "奖励模型"
    - "SFT"
    - "PPO"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "DPO 是什么？一文看懂直接偏好优化"
  description: "DPO 用同题下的更好回答和较差回答直接训练模型倾向，是语言模型偏好对齐的常见方法。"
  type: "article"
  image: ""
  image_alt: "一张展示 DPO 如何用同一个问题下的更好回答和较差回答训练模型偏好的图。"

twitter:
  card: "summary_large_image"
  title: "DPO 是什么？一文看懂直接偏好优化"
  description: "DPO 用同题下的更好回答和较差回答直接训练模型倾向，是语言模型偏好对齐的常见方法。"
  image: ""

diagram:
  image: ""
  image_alt: "一张手绘对比图展示 DPO 如何用同一个问题下的更好回答和较差回答训练模型，拉高好回答概率、压低差回答概率，并提醒 DPO 不是自动安全保证。"

source:
  source_note: "参考 DPO 原始论文、NeurIPS 2023 论文版本和后续 Diffusion-DPO 等扩展资料；DPO 方法定义相对稳定，但具体实现、数据配方和与 RLHF 的取舍仍需结合项目实验。"
  ai_assisted: true
  human_reviewed: false
  last_verified_at: "2026-06-04"
  published_at: ""

structured_data:
  schema_type: "DefinedTerm"
  name: "DPO"
  alternate_name: "Direct Preference Optimization, 直接偏好优化"
  description: "DPO 是用成对偏好数据直接微调语言模型、让模型更偏向被偏好回答的对齐方法。"
  in_language: "zh-CN"
  publisher_name: "知之"
---

# DPO

## 一句话概念

DPO 是用成对偏好数据直接微调语言模型、让模型更偏向被偏好回答的对齐方法。

## 快速理解

DPO 的全称是 Direct Preference Optimization，中文可译为“直接偏好优化”。它解决的是模型对齐中的一个具体问题：如果同一个问题有两个回答，一个更符合人类偏好，一个更差，怎样让模型更倾向于生成更好的那个？

传统 RLHF 常会先训练一个奖励模型，再用强化学习优化语言模型。DPO 的思路更直接：把偏好关系写成一个分类式训练目标，用 chosen / rejected 成对样本直接更新模型，让更好回答的概率高于较差回答。

## 它本质上是什么？

DPO 本质上是一种语言模型偏好微调方法。它的输入不是单条“标准答案”，而是同一个 prompt 下的一对回答：chosen 表示更被偏好的回答，rejected 表示较差回答。训练目标不是让模型机械复述 chosen，而是拉开模型对两类回答的相对偏好。

它的关键对象包括偏好数据、参考模型、当前策略模型和偏好损失。参考模型通常用来约束微调后的模型不要偏离原模型太远；偏好损失则把“更好回答应该更可能被模型生成”这件事转成可优化目标。

DPO 的吸引力在于流程简化：不必单独拟合奖励模型，也不必在微调时进行复杂的在线采样和 PPO 更新。但简化不代表没有代价。偏好数据是否一致、chosen 是否真的更好、基础模型是否已经具备任务能力，都会直接影响 DPO 后的结果。

## 容易误解的地方

### 误解一：DPO 不需要人类偏好

DPO 不训练显式奖励模型，但仍需要偏好数据。没有可靠的 chosen/rejected 样本，DPO 就没有清楚的学习信号。偏好数据如果来自低质量标注、错误规则或单一审美，模型会把这些偏差一起学进去。

### 误解二：DPO 可以完全替代 RLHF

DPO 在很多语言模型对齐场景中更简单、更稳定，但它不是所有强化学习或偏好优化问题的万能替代品。需要在线探索、复杂环境交互、工具执行反馈或长期奖励的问题，仍可能需要其他 RLHF 或强化学习方法。

### 误解三：DPO 后模型就自动安全

DPO 能让模型更符合训练偏好，但“偏好”不等于“安全”。如果安全、诚实、无害、有帮助等目标没有被正确写进数据和评测，DPO 也可能只学到更讨喜的表达，而不是更可靠的行为。

### 误解四：DPO 只要跑一遍就能解决模型风格

DPO 往往要和 SFT、数据筛选、评测集、拒答策略、红队测试和上线监控配合。一次偏好微调可能改善某些输出，也可能带来过拟合、能力退化或风格变窄。

## 常见使用场景

### 1. 聊天模型偏好对齐

团队可以收集同一问题下的多条回答，让标注者选择更有帮助、更安全或更符合产品风格的版本，再用 DPO 微调模型倾向。

### 2. 指令模型风格调整

在客服、教育、写作助手等场景里，DPO 可用于让模型输出更简洁、礼貌、结构清楚或符合领域规范。关键是偏好样本要覆盖真实用户问题，而不只是少量模板。

### 3. 安全拒答和边界行为优化

DPO 可以把“应该拒答”和“不该过度拒答”的样本做成偏好对，让模型学习更合适的边界。但这类场景必须配合安全评测和红队测试。

### 4. 多模态生成偏好优化

后续研究把 DPO 思路扩展到扩散模型等生成任务，用偏好对优化图片等输出质量。这里的偏好信号、评价标准和语言模型场景并不完全相同。

## 相关概念

- **RLHF**：DPO 常被看作 RLHF 偏好对齐流程的一种更直接替代路线。
- **偏好数据**：DPO 依赖 chosen/rejected 成对偏好样本，数据质量直接影响对齐效果。
- **奖励模型**：传统 RLHF 常先训练奖励模型；DPO 的卖点之一是避免显式奖励模型训练。
- **SFT**：DPO 通常在监督微调后的模型上进行，减少偏好优化时的分布偏移。
- **对齐**：DPO 是语言模型对齐方法之一，用于让输出更符合人类偏好或任务偏好。
- **PPO**：PPO 是 RLHF 中常见的强化学习优化算法，DPO 常被拿来与它比较。

## 参考资料

- [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290)：DPO 原始论文，用于支撑“直接用偏好数据优化策略、避免显式奖励模型”的核心定义。
- [NeurIPS 2023 DPO paper PDF](https://papers.nips.cc/paper_files/paper/2023/file/a85b405ed65c6477a4fe8302b5e06ce7-Paper-Conference.pdf)：会议论文版本，用于核对 DPO 的训练目标和与 RLHF 的关系。
- [Diffusion Model Alignment Using Direct Preference Optimization](https://arxiv.org/abs/2311.12908)：说明 DPO 思路可扩展到扩散模型偏好对齐，用于支撑多模态扩展场景。
