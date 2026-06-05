---
term: "DPO"
term_zh: "直接偏好优化"
full_name: "Direct Preference Optimization"
slug: "dpo"
locale: "zh"
translation_key: "dpo"

short_concept: "DPO 是一种用偏好样本直接微调语言模型的方法，让模型更偏向被选中的回答，同时避开单独训练奖励模型和 PPO 强化学习流程。"
short_desc: "DPO（Direct Preference Optimization，直接偏好优化）常用于大语言模型对齐和后训练：给同一个提示词配一组“更好回答 / 更差回答”，模型直接学习拉开二者概率差距。它比传统 RLHF 流程更简单，但仍依赖高质量偏好数据、参考模型约束和训练参数选择。"
tagline: "把偏好样本直接变成微调信号。"

beginner_notes:
  plain_explanation: "DPO 不要求先训练一个奖励模型再用强化学习更新模型，而是直接拿“这个回答比那个回答好”的成对数据来训练。"
  analogy: "它像老师批改同一道题的两个答案：不是重新设计一套打分系统，而是直接让学生学会更接近被选中的答案风格。"
  why_it_matters: "DPO 降低了偏好对齐的工程复杂度，让团队可以用成对偏好数据改善模型风格、安全性和回答质量，但数据偏差会直接影响模型学到什么。"
  common_misconception: "DPO 不是“没有奖励”的魔法；它把奖励模型隐式写进目标函数里，仍然在优化偏好，而不是保证事实正确。"

type: "method"
difficulty: "advanced"
status: "draft"
visibility: "public"

heat_score: 87
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
    relation_type: "related"
    description: "DPO 源自 RLHF 问题的重新参数化，目标同样是利用偏好反馈对齐模型行为。"
    sort_order: 10
  - term: "PPO"
    slug: "ppo"
    relation_type: "opposite"
    description: "传统 RLHF 常用 PPO 做策略优化；DPO 的卖点之一是绕开在线强化学习式的 PPO 更新。"
    sort_order: 20
  - term: "Reward Model"
    slug: "reward-model"
    relation_type: "upstream"
    description: "DPO 不单独训练显式奖励模型，但它的推导利用了奖励模型与最优策略之间的关系。"
    sort_order: 30
  - term: "Preference Dataset"
    slug: "preference-dataset"
    relation_type: "upstream"
    description: "DPO 依赖成对偏好样本，通常包含 prompt、chosen response 和 rejected response。"
    sort_order: 40
  - term: "SFT"
    slug: "sft"
    relation_type: "upstream"
    description: "DPO 常接在监督微调之后，用偏好数据继续调整模型输出风格和对齐行为。"
    sort_order: 50
  - term: "Model Alignment"
    slug: "model-alignment"
    relation_type: "downstream"
    description: "DPO 是模型对齐的常用后训练方法之一，适合把人类偏好转成可训练目标。"
    sort_order: 60
  - term: "KL Constraint"
    slug: "kl-constraint"
    relation_type: "related"
    description: "DPO 通过参考模型和温度系数控制策略偏离程度，和 RLHF 中的 KL 约束有对应关系。"
    sort_order: 70

seo:
  title: "DPO 是什么？直接偏好优化和 RLHF 的区别"
  description: "DPO 是用于大语言模型对齐的直接偏好优化方法。本文解释它如何使用 chosen/rejected 偏好样本，为什么能绕开奖励模型和 PPO，以及它的数据和训练边界。"
  keywords:
    - "DPO"
    - "Direct Preference Optimization"
    - "直接偏好优化"
    - "RLHF"
    - "PPO"
    - "Reward Model"
    - "Preference Dataset"
    - "模型对齐"
  canonical_url: ""
  robots: "index, follow"

open_graph:
  title: "DPO 是什么？直接偏好优化和 RLHF 的区别"
  description: "DPO 用成对偏好样本直接训练模型偏向更好的回答，工程上比传统 RLHF 简化，但仍依赖数据质量和参考模型约束。"
  type: "article"
  image: ""
  image_alt: "一张对比流程图展示 RLHF 需要训练奖励模型和 PPO，而 DPO 直接用 chosen/rejected 偏好对训练模型，并保留参考模型约束。"

twitter:
  card: "summary_large_image"
  title: "DPO 是什么？直接偏好优化和 RLHF 的区别"
  description: "DPO 把“哪个回答更好”的偏好对直接变成语言模型微调信号。"
  image: ""

diagram:
  image: ""
  image_alt: "一张对比流程图展示 DPO 用同一提示词下的 chosen 和 rejected 回答直接训练模型，区别于先训练奖励模型再 PPO 的 RLHF 流程。"

source:
  source_note: "本稿参考 DPO 原论文、Hugging Face TRL 文档、Azure OpenAI fine-tuning 文档和相关偏好优化资料；DPO 实现细节会随训练框架、模型和数据格式变化，发布前建议人工复核公式、参数和实践建议。"
  ai_assisted: true
  human_reviewed: false
  last_verified_at: "2026-06-04"
  published_at: ""

structured_data:
  schema_type: "DefinedTerm"
  name: "DPO"
  alternate_name: "Direct Preference Optimization, 直接偏好优化"
  description: "DPO 是一种用成对偏好样本直接微调语言模型、使模型更偏向被选中回答的后训练方法。"
  in_language: "zh-CN"
  publisher_name: "知之"
---

# DPO

## 一句话概念

DPO 是一种用偏好样本直接微调语言模型的方法，让模型更偏向被选中的回答，同时避开单独训练奖励模型和 PPO 强化学习流程。

## 快速理解

如果你想让模型回答得更有帮助、更安全、更符合某种风格，常见做法是收集人类偏好：同一个问题下，A 回答比 B 回答更好。传统 RLHF 通常会先训练一个奖励模型，再用 PPO 这类强化学习方法更新语言模型。DPO 走的是更短的路：直接把这组成对偏好样本变成训练损失。

这也是 DPO 受欢迎的原因。它不是让模型“自己领悟人类偏好”，而是把 chosen response 和 rejected response 的概率差距拉开；同时用参考模型限制新模型不要偏离太远。工程上少了奖励模型和在线采样环节，训练更像普通微调，但偏好数据的质量会更直接地决定结果。

## 它本质上是什么？

DPO 是对 RLHF 目标的一种重新参数化。原论文的关键观察是：在带 KL 约束的 RLHF 问题里，最优策略和奖励函数之间存在可以改写的关系。于是训练时不必显式拟合一个奖励模型，再让策略去最大化这个奖励；可以直接用语言模型本身的 log probability 来表达偏好优化目标。

训练样本通常包含三个专属对象：prompt、chosen response、rejected response。模型会比较同一 prompt 下 chosen 和 rejected 的概率，同时参考一个未被 DPO 更新的 reference model。直觉上，DPO 要让新模型比参考模型更倾向 chosen，但又不能无约束地把概率推到极端。

这里的 `beta` 或类似温度参数很重要。它影响模型偏离参考模型的力度：太保守，偏好学不进去；太激进，可能损伤原有能力或放大数据偏差。Hugging Face TRL 的 DPOTrainer 和 Azure OpenAI 的 DPO fine-tuning 文档都把数据格式、参考模型、训练配置放在实践重点里，而不是只强调“比 RLHF 简单”。

## 容易误解的地方

### 误解一：DPO 不需要偏好数据

DPO 省掉的是单独训练奖励模型和 PPO 更新流程，不是省掉偏好信号。它依赖成对样本：同一个 prompt 下哪个回答更好、哪个回答更差。

如果 chosen / rejected 标注质量差，或者偏好样本只覆盖很窄场景，模型会把这些偏差直接学进去。DPO 的简单，反而让数据问题更不容易被后续复杂流程稀释。

### 误解二：DPO 完全取代 RLHF

DPO 是 RLHF 相关方法中的重要替代路线，但不是所有场景的唯一答案。传统 RLHF、PPO、RLAIF、IPO、KTO、GRPO 等方法各有适用条件，尤其在需要在线采样、多轮交互或复杂奖励设计时，DPO 未必最合适。

更准确地说，DPO 让很多偏好对齐任务可以用更轻量的离线训练完成，而不是宣告强化学习式对齐已经没有价值。

### 误解三：DPO 训练后模型就不会幻觉

DPO 可以让模型更符合偏好，例如更礼貌、更简洁、更少拒答或更愿意遵守格式。但幻觉还和事实来源、检索、上下文窗口、模型知识和评测方式有关。

如果偏好数据本身奖励“看起来有把握”的错误回答，DPO 甚至可能让模型更擅长生成自信但不真实的内容。

### 误解四：DPO 只是普通监督微调

监督微调通常学习“给定输入输出这一个答案”。DPO 学的是同一输入下两个回答的相对偏好，还要和参考模型的概率关系一起进入目标函数。

所以 DPO 更像偏好排序学习，而不是简单把 chosen response 当成唯一标准答案背下来。

## 常见使用场景

### 1. 聊天模型风格和有用性对齐

团队可以收集“更有帮助 / 更啰嗦”“更安全 / 更冒险”“更符合指令 / 更跑题”的回答对，用 DPO 让模型更偏向被选中的回答风格。这里的专属动作是构造成对偏好样本，而不是只写一批标准答案。

这种场景常接在 SFT 之后：先让模型学会基本指令跟随，再用 DPO 微调输出偏好。

### 2. 降低 RLHF 工程复杂度

传统 RLHF 管线涉及奖励模型、策略优化、采样、KL 控制和训练稳定性。DPO 把很多工作压缩成离线偏好训练，适合资源有限但已有偏好数据的团队。

它不会消除所有调参成本，但能让对齐训练更接近常规 fine-tuning 流程。

### 3. 训练开源模型和领域模型

开源社区常用 DPO 对聊天模型做后训练，例如改善指令跟随、拒答边界、格式遵循或领域回答风格。偏好数据可以来自人工标注、模型评审或混合筛选。

领域模型使用 DPO 时尤其要关注数据来源：医学、法律、金融等领域的 chosen response 需要专业标准，而不是普通用户喜好。

### 4. 比较不同对齐方法

研究者会把 DPO 与 PPO、IPO、KTO、ORPO 等方法放在一起比较，观察它们对回答质量、长度偏置、安全性和原始能力保持的影响。

DPO 因为目标函数清晰、实现相对轻量，经常被作为偏好优化实验的基线。

## 相关概念

- **RLHF**：DPO 源自 RLHF 问题的重新参数化，目标同样是利用偏好反馈对齐模型行为。
- **PPO**：传统 RLHF 常用 PPO 做策略优化；DPO 的卖点之一是绕开在线强化学习式的 PPO 更新。
- **Reward Model**：DPO 不单独训练显式奖励模型，但它的推导利用了奖励模型与最优策略之间的关系。
- **Preference Dataset**：DPO 依赖成对偏好样本，通常包含 prompt、chosen response 和 rejected response。
- **SFT**：DPO 常接在监督微调之后，用偏好数据继续调整模型输出风格和对齐行为。
- **Model Alignment**：DPO 是模型对齐的常用后训练方法之一，适合把人类偏好转成可训练目标。
- **KL Constraint**：DPO 通过参考模型和温度系数控制策略偏离程度，和 RLHF 中的 KL 约束有对应关系。

## 参考资料

- [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290)：DPO 原论文，支撑本文对“绕开奖励模型和 PPO、用分类式目标优化偏好”的解释。
- [NeurIPS 2023 paper PDF: Direct Preference Optimization](https://papers.neurips.cc/paper_files/paper/2023/file/a85b405ed65c6477a4fe8302b5e06ce7-Paper-Conference.pdf)：用于核对 DPO 在 NeurIPS 2023 的正式论文版本。
- [Hugging Face TRL: DPO Trainer](https://huggingface.co/docs/trl/dpo_trainer)：用于核对 DPOTrainer 的实践语境、偏好样本格式和训练流程。
- [Azure OpenAI: Direct preference optimization fine-tuning](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/fine-tuning-direct-preference-optimization)：说明 DPO 在云端 fine-tuning 中作为模型对齐技术的产品化用法。
- [Hugging Face TRL GitHub](https://github.com/huggingface/trl)：用于核对 DPO 在后训练工具链中和 SFT、PPO、GRPO 等方法的关系。
