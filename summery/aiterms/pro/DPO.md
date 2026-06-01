---
term: "DPO"
term_zh: "直接偏好优化"
full_name: "Direct Preference Optimization"
slug: "dpo"
locale: "zh"
translation_key: "dpo"

short_concept: "用偏好样本直接训练模型更偏向好回答、远离差回答的对齐方法。"
short_desc: "DPO（Direct Preference Optimization，直接偏好优化）是一种大模型偏好对齐方法，它用同一问题下“更好回答 / 更差回答”的成对数据直接优化模型，不必先单独训练奖励模型再跑强化学习。"
tagline: "让模型从“哪个回答更好”里直接学偏好。"

beginner_notes:
  plain_explanation: "DPO 像给模型看一组组对比答案：同一个问题里，告诉它哪个答案更受偏好，哪个答案不理想，让它以后更倾向生成前一种。"
  analogy: "像老师批改两份作文，不给复杂打分规则，只指出哪份更好，让学生下次朝更好的写法靠近。"
  why_it_matters: "它把偏好对齐流程做得更直接，降低了传统 RLHF 中奖励模型和强化学习训练的工程复杂度，是很多模型后训练流程里的常见方法。"
  common_misconception: "DPO 不是人工偏好的自动来源，也不能保证模型完全安全；它仍依赖高质量偏好数据、参考模型约束和后续评估。"

type: "method"
difficulty: "intermediate"
status: "draft"
visibility: "public"

heat_score: 82
quality_score: 86
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
    relation_type: "upstream"
    description: "DPO 源自对 RLHF 流程的简化，目标同样是让模型更符合人类偏好。"
    sort_order: 10
  - term: "奖励模型"
    slug: "reward-model"
    relation_type: "upstream"
    description: "传统 RLHF 通常先训练奖励模型；DPO 的重点是绕过显式奖励模型训练。"
    sort_order: 20
  - term: "偏好数据"
    slug: "preference-data"
    relation_type: "upstream"
    description: "DPO 依赖同一提示下 chosen / rejected 这类偏好样本。"
    sort_order: 30
  - term: "SFT"
    slug: "sft"
    relation_type: "upstream"
    description: "DPO 通常发生在监督微调之后，用偏好数据继续调整模型行为。"
    sort_order: 40
  - term: "PPO"
    slug: "ppo"
    relation_type: "similar"
    description: "PPO 是 RLHF 中常见的强化学习优化算法，常被用来和 DPO 的简化流程对比。"
    sort_order: 50
  - term: "模型对齐"
    slug: "model-alignment"
    relation_type: "related"
    description: "DPO 是模型对齐方法之一，用来让模型输出更接近偏好目标。"
    sort_order: 60
  - term: "后训练"
    slug: "post-training"
    relation_type: "related"
    description: "DPO 常被放在大模型预训练之后的后训练阶段使用。"
    sort_order: 70

seo:
  title: "DPO 是什么？直接偏好优化的通俗解释"
  description: "DPO（Direct Preference Optimization，直接偏好优化）是一种大模型偏好对齐方法。本文用小白能理解的方式解释 DPO 如何用成对偏好数据直接优化模型，以及它和 RLHF、奖励模型的关系。"
  keywords:
    - "DPO"
    - "Direct Preference Optimization"
    - "直接偏好优化"
    - "偏好对齐"
    - "RLHF"
    - "奖励模型"
    - "偏好数据"
    - "模型后训练"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "DPO 是什么？直接偏好优化的通俗解释"
  description: "用一篇词条理解 DPO 如何用“更好回答 / 更差回答”的偏好样本直接优化大模型。"
  type: "article"
  image: ""
  image_alt: "一张图展示 DPO 如何根据偏好样本拉近好回答、拉远差回答。"

twitter:
  card: "summary_large_image"
  title: "DPO 是什么？直接偏好优化的通俗解释"
  description: "用一篇词条理解 DPO 如何用“更好回答 / 更差回答”的偏好样本直接优化大模型。"
  image: ""

diagram:
  image: ""
  image_alt: "一张手绘图展示 DPO 如何把同一问题下的偏好回答和不偏好回答交给模型训练，让模型更倾向生成被偏好的回答。"

source:
  source_note: "本稿主要参考 DPO 原始论文 arXiv 页面、NeurIPS/OpenReview 页面和 Hugging Face TRL DPOTrainer 文档；发布前建议人工复核数学表述是否需要进一步精简。"
  ai_assisted: true
  human_reviewed: false
  last_verified_at: "2026-06-01"
  published_at: ""

structured_data:
  schema_type: "DefinedTerm"
  name: "DPO"
  alternate_name: "Direct Preference Optimization, 直接偏好优化"
  description: "DPO 是一种用成对偏好数据直接优化大模型偏好行为的训练方法。"
  in_language: "zh-CN"
  publisher_name: "知之"
---

# DPO

## 一句话概念

DPO 是一种用“更好回答 / 更差回答”的偏好样本直接训练模型，让它更倾向生成被偏好回答的对齐方法。

## 快速理解

DPO 的全称是 Direct Preference Optimization，常译作“直接偏好优化”。它关注的不是让模型简单记住标准答案，而是让模型从成对比较里学习：同一个问题下，哪种回答更符合人类或标注规则的偏好，哪种回答应该少生成。

传统 RLHF 流程通常会先收集偏好数据，训练一个奖励模型，再用强化学习方法优化语言模型。DPO 的想法更直接：既然偏好数据已经告诉我们“这个回答比那个回答好”，就把这种对比关系直接写进训练目标里，让模型提高好回答的相对概率，降低差回答的相对概率。

## 它本质上是什么？

DPO 本质上是一种大模型后训练和偏好对齐方法。它通常用在模型已经完成预训练、监督微调之后，再通过偏好数据调整模型行为。训练样本一般包含一个提示词、一个更受偏好的回答，以及一个不那么受偏好的回答。

理解 DPO 时，可以把它看成“用排序关系训练模型”。模型不只是学习“这句话出现过”，而是在学习“面对同一个输入时，哪类输出更应该被提高概率”。同时，DPO 会通过参考模型约束当前模型不要偏离太远，这一点和 RLHF 里常见的 KL 约束思想有关。

它被提出，是因为传统 RLHF 的工程链路比较重：奖励模型要训练，强化学习过程不稳定，超参数和采样成本也更难控制。DPO 用一个更像分类损失的目标直接利用偏好对，让训练流程更简洁，也更容易被放进常规微调工具链。

但“更直接”不等于“没有风险”。如果偏好数据质量差、标注标准混乱、样本覆盖不足，DPO 仍然可能把模型推向错误偏好。它也不是通用安全保证，训练后仍需要评估、红队测试和人工审查。

## 容易误解的地方

### 误解一：DPO 不需要人类偏好数据

更准确的理解是：DPO 不需要先显式训练奖励模型，但仍然需要偏好数据。偏好可以来自人工标注、规则筛选或模型辅助标注，但来源质量会直接影响训练结果。

### 误解二：DPO 完全替代 RLHF

更准确的理解是：DPO 是一种简化偏好优化流程的方法，常被拿来和 PPO 式 RLHF 对比。它在很多场景里更容易训练，但不是所有对齐问题的唯一答案。

### 误解三：DPO 训练后模型一定更安全

更准确的理解是：DPO 可以让模型更贴近偏好数据中的目标，但偏好数据本身未必覆盖所有安全问题。安全性还取决于数据设计、拒答策略、评估和部署护栏。

### 误解四：DPO 只是在做普通监督微调

更准确的理解是：监督微调通常学习一个目标回答本身；DPO 学的是偏好回答相对不偏好回答的优势，并借助参考模型控制偏移。

## 常见使用场景

### 聊天模型偏好对齐

在同一个用户问题下，收集“更有帮助、更符合风格、更少问题”的回答和“不够好”的回答，再用 DPO 调整聊天模型，让它更倾向生成前者。

### 指令模型后训练

模型完成 SFT 后，可以继续用偏好数据做 DPO，让模型在有多个可能回答时更符合人工评价标准，例如更简洁、更遵守格式或更少胡编。

### 开源模型适配

开发者常用 Hugging Face TRL 等工具对开源语言模型进行 DPO 训练。这里的重点是准备好偏好数据、参考模型和训练配置，而不是只套一个算法名称。

### 对齐方法实验

研究和工程团队会把 DPO 与 PPO、IPO、KTO、ORPO 等偏好优化或对齐方法对比，用来评估不同训练目标在质量、稳定性和成本上的取舍。

## 相关概念

- **RLHF**：DPO 试图简化 RLHF 中“奖励模型 + 强化学习”的复杂流程，但目标仍是让模型更符合偏好。
- **奖励模型**：传统 RLHF 常用奖励模型给输出打分；DPO 的特点是不用先训练一个显式奖励模型。
- **偏好数据**：DPO 的核心输入，通常是同一提示下的 chosen / rejected 回答对。
- **SFT**：监督微调常在 DPO 之前进行，先让模型学会基本指令格式和任务行为。
- **PPO**：PPO 是 RLHF 中常见强化学习算法，经常作为 DPO 的对照对象。
- **模型对齐**：DPO 属于模型对齐工具箱的一部分，不能单独代表所有安全和价值对齐工作。
- **后训练**：DPO 常出现在大模型预训练之后，用来继续塑造输出风格和偏好行为。

## 参考资料

- [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290)：DPO 原始论文 arXiv 页面，介绍 DPO 如何用偏好数据直接优化模型。
- [OpenReview: Direct Preference Optimization](https://openreview.net/forum?id=HPuSIXJaa9)：NeurIPS 2023 论文页面，概述 DPO 相比 RLHF 的简化思路和实验结论。
- [Hugging Face TRL DPOTrainer Documentation](https://huggingface.co/docs/trl/dpo_trainer)：介绍 TRL 中 DPOTrainer 的数据格式、损失、参考模型和训练配置。
- [Hugging Face TRL GitHub Repository](https://github.com/huggingface/trl)：TRL 工具库仓库，包含 DPO、SFT、GRPO 等后训练相关能力。
