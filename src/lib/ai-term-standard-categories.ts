export type StandardAiTermCategory = {
  sortOrder: number;
  name: string;
  slug: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
};

export const STANDARD_AI_TERM_CATEGORIES = [
  {
    sortOrder: 10,
    name: "AI 基础概念",
    slug: "ai-basics",
    nameEn: "AI Basics",
    description: "AI/机器学习/深度学习的入门概念",
    descriptionEn: "Introductory concepts in AI, machine learning, and deep learning.",
    icon: "sparkles",
  },
  {
    sortOrder: 20,
    name: "大语言模型",
    slug: "llm",
    nameEn: "Large Language Models",
    description: "LLM 的原理与关键术语",
    descriptionEn: "Core ideas and vocabulary around large language models.",
    icon: "bot",
  },
  {
    sortOrder: 30,
    name: "提示词与上下文",
    slug: "prompting",
    nameEn: "Prompting & Context",
    description: "怎么把任务“喂”给模型",
    descriptionEn: "How tasks, instructions, examples, and context are given to models.",
    icon: "message-square",
  },
  {
    sortOrder: 40,
    name: "检索与知识(RAG)",
    slug: "rag",
    nameEn: "Retrieval & Knowledge",
    description: "让模型用外部知识回答",
    descriptionEn: "Retrieval, knowledge bases, and external context for model answers.",
    icon: "database",
  },
  {
    sortOrder: 50,
    name: "AI 智能体",
    slug: "ai-agent",
    nameEn: "AI Agents",
    description: "能规划、调工具、多步执行的 AI",
    descriptionEn: "AI systems that plan, use tools, and carry out multi-step tasks.",
    icon: "workflow",
  },
  {
    sortOrder: 60,
    name: "生成式与多模态",
    slug: "generative-ai",
    nameEn: "Generative & Multimodal",
    description: "文生图/视频/音频、多模态",
    descriptionEn: "Image, video, audio, and multimodal generation.",
    icon: "image",
  },
  {
    sortOrder: 70,
    name: "模型训练与微调",
    slug: "model-training",
    nameEn: "Training & Fine-tuning",
    description: "模型怎么练出来/怎么调",
    descriptionEn: "How models are trained, adapted, compressed, and evaluated during training.",
    icon: "cpu",
  },
  {
    sortOrder: 80,
    name: "AI 协议与互操作",
    slug: "ai-protocol",
    nameEn: "Protocols & Interop",
    description: "AI 应用之间/和外部如何连接",
    descriptionEn: "Protocols and interfaces that connect AI apps, tools, and external systems.",
    icon: "plug",
  },
  {
    sortOrder: 90,
    name: "AI 编程与开发工具",
    slug: "ai-coding",
    nameEn: "AI Coding & Dev Tools",
    description: "用 AI 写代码/开发",
    descriptionEn: "AI-assisted coding, developer tools, and software development workflows.",
    icon: "code",
  },
  {
    sortOrder: 100,
    name: "安全、评估与对齐",
    slug: "ai-safety",
    nameEn: "Safety, Eval & Alignment",
    description: "让 AI 可靠、可信、可衡量",
    descriptionEn: "Reliability, evaluation, alignment, guardrails, and red-teaming.",
    icon: "shield-check",
  },
  {
    sortOrder: 110,
    name: "AI 产品与生态",
    slug: "ai-ecosystem",
    nameEn: "Products & Ecosystem",
    description: "厂商、模型家族、产品",
    descriptionEn: "AI companies, model families, products, and ecosystem dynamics.",
    icon: "boxes",
  },
  {
    sortOrder: 120,
    name: "AI 趋势与社会",
    slug: "ai-trends",
    nameEn: "Trends & Society",
    description: "趋势、伦理、政策、黑话",
    descriptionEn: "AI trends, ethics, policy, copyright, and cultural vocabulary.",
    icon: "trending-up",
  },
] as const satisfies StandardAiTermCategory[];

export const STANDARD_AI_TERM_CATEGORY_BY_SLUG: ReadonlyMap<string, StandardAiTermCategory> = new Map(STANDARD_AI_TERM_CATEGORIES.map((category) => [category.slug, category]));

export function standardAiTermCategoryOptions() {
  return STANDARD_AI_TERM_CATEGORIES.map((category) => ({
    name: category.name,
    slug: category.slug,
  }));
}
