export type SearchAuditDimension = "seo" | "aeo" | "geo" | "schema" | "risk";
export type SearchAuditLevel = "pass" | "warn" | "fail";
export type SearchAuditContentType = "general" | "tutorial" | "glossary" | "review" | "comparison" | "listicle" | "news" | "experience";

export type SearchAuditOptions = {
  brandName?: string;
  contentType?: SearchAuditContentType;
  pageUrl?: string;
  targetKeyword?: string;
  targetQuestion?: string;
};

export type SearchAuditIssue = {
  dimension: SearchAuditDimension;
  evidence: string;
  fix: string;
  id: string;
  level: SearchAuditLevel;
  rewrite?: string;
  title: string;
  detail: string;
};

export type SearchAuditChecklistItem = {
  done: boolean;
  id: string;
  label: string;
};

export type SearchAuditRewrite = {
  id: string;
  title: string;
  value: string;
};

export type SearchAuditScore = {
  aeo: number;
  geo: number;
  overall: number;
  schema: number;
  seo: number;
};

export type SearchAuditResult = {
  aiSummary: string;
  extracted: {
    description: string | null;
    faqCount: number;
    h1: string[];
    h2: string[];
    imageCount: number;
    linkCount: number;
    title: string | null;
    wordCount: number;
  };
  faq: Array<{ question: string; answer: string }>;
  issues: SearchAuditIssue[];
  jsonLd: string;
  llmsText: string;
  checklist: SearchAuditChecklistItem[];
  rewrites: SearchAuditRewrite[];
  score: SearchAuditScore;
  verdict: string;
};

type ParsedContent = {
  description: string | null;
  h1: string[];
  h2: string[];
  htmlImageAlts: string[];
  imageCount: number;
  linkCount: number;
  listCount: number;
  paragraphs: string[];
  raw: string;
  text: string;
  title: string | null;
};

export const searchAuditContentTypeOptions: Array<{ value: SearchAuditContentType; label: string }> = [
  { value: "general", label: "通用文章" },
  { value: "tutorial", label: "教程 / 操作手册" },
  { value: "glossary", label: "词条解释" },
  { value: "review", label: "产品评测" },
  { value: "comparison", label: "对比文章" },
  { value: "listicle", label: "清单文章" },
  { value: "news", label: "新闻解读" },
  { value: "experience", label: "个人经验" },
];

const dimensionLabels: Record<SearchAuditDimension, string> = {
  aeo: "AEO",
  geo: "GEO",
  risk: "风险",
  schema: "结构化数据",
  seo: "SEO",
};

export function analyzeSearchAudit(input: string, options: SearchAuditOptions = {}): SearchAuditResult {
  const parsed = parseContent(input);
  const issues: SearchAuditIssue[] = [];
  const contentType = options.contentType ?? "general";
  const targetKeyword = normalizeText(options.targetKeyword ?? "");
  const targetQuestion = normalizeText(options.targetQuestion ?? "");
  const wordCount = countWords(parsed.text);
  const directAnswer = findDirectAnswer(parsed.paragraphs, targetKeyword);
  const faq = buildFaq(parsed, targetQuestion, targetKeyword);

  addSeoIssues(issues, parsed, wordCount, targetKeyword, options.pageUrl);
  addAeoIssues(issues, parsed, directAnswer, faq.length, targetQuestion);
  addGeoIssues(issues, parsed, options.brandName);
  addSchemaIssues(issues, parsed, faq.length, options.pageUrl);
  addRiskIssues(issues, parsed);
  addContentTypeIssues(issues, parsed, contentType);

  const score = scoreIssues(issues);
  const aiSummary = directAnswer || buildFallbackSummary(parsed, targetKeyword, targetQuestion);
  const rewrites = buildRewrites(parsed, options, aiSummary, faq);
  const jsonLd = buildJsonLd(parsed, options, faq);
  const llmsText = buildLlmsText(parsed, options, aiSummary);
  const checklist = buildChecklist(parsed, issues, faq.length, options.pageUrl);

  return {
    aiSummary,
    extracted: {
      description: parsed.description,
      faqCount: faq.length,
      h1: parsed.h1,
      h2: parsed.h2,
      imageCount: parsed.imageCount,
      linkCount: parsed.linkCount,
      title: parsed.title,
      wordCount,
    },
    faq,
    issues,
    jsonLd,
    llmsText,
    checklist,
    rewrites,
    score,
    verdict: buildVerdict(score, issues),
  };
}

function addIssue(issues: SearchAuditIssue[], issue: Omit<SearchAuditIssue, "evidence"> & { evidence?: string }) {
  issues.push({ ...issue, evidence: issue.evidence ?? "基于当前输入内容检测到该项不完整。" });
}

function addSeoIssues(issues: SearchAuditIssue[], parsed: ParsedContent, wordCount: number, targetKeyword: string, pageUrl?: string) {
  const titleLength = parsed.title ? countChars(parsed.title) : 0;
  if (!parsed.title) {
    addIssue(issues, {
      dimension: "seo",
      evidence: "没有识别到 frontmatter title、HTML title 或 Markdown H1。",
      fix: "补一个能说明页面主题的 title 或一级标题。",
      id: "seo-title-missing",
      level: "fail",
      title: "缺少页面标题",
      detail: "搜索结果和 AI 摘要通常会优先读取清晰标题。",
    });
  } else if (titleLength < 8 || titleLength > 36) {
    addIssue(issues, {
      dimension: "seo",
      evidence: `当前标题约 ${titleLength} 字。`,
      fix: "把标题控制在 8-36 个中文字符左右，并保留核心主题。",
      id: "seo-title-length",
      level: "warn",
      title: "标题长度不够稳",
      detail: `当前标题约 ${titleLength} 字，过短会信息不足，过长容易被截断。`,
    });
  }

  if (!parsed.description || countChars(parsed.description) < 40) {
    addIssue(issues, {
      dimension: "seo",
      evidence: parsed.description ? `当前摘要约 ${countChars(parsed.description)} 字。` : "没有识别到 description 或 summary。",
      fix: "补一段 40-90 字的摘要，说明页面解决什么问题、适合谁读。",
      id: "seo-description",
      level: "warn",
      title: "摘要信息不足",
      detail: "描述字段或开头摘要太弱，会影响搜索片段和 AI 对页面的快速判断。",
    });
  }

  if (parsed.h1.length !== 1) {
    addIssue(issues, {
      dimension: "seo",
      evidence: `检测到 ${parsed.h1.length} 个 H1。`,
      fix: "保留一个明确 H1，其余主段落用 H2/H3。",
      id: "seo-h1-count",
      level: "warn",
      title: "H1 数量不理想",
      detail: `检测到 ${parsed.h1.length} 个 H1。`,
    });
  }

  if (parsed.h2.length < 2 && wordCount >= 300) {
    addIssue(issues, {
      dimension: "seo",
      evidence: `当前约 ${wordCount} 字词，检测到 ${parsed.h2.length} 个 H2。`,
      fix: "用 H2 把内容拆成 3-6 个可扫描小节。",
      id: "seo-headings",
      level: "warn",
      title: "长文缺少小节结构",
      detail: "清晰小标题能帮助读者、搜索引擎和 AI 抽取内容层次。",
    });
  }

  if (targetKeyword && !containsText(parsed.text, targetKeyword)) {
    addIssue(issues, {
      dimension: "seo",
      evidence: `目标关键词是「${targetKeyword}」，正文中没有自然出现。`,
      fix: "在标题、首段或一个 H2 中自然出现目标关键词。",
      id: "seo-keyword",
      level: "warn",
      title: "目标关键词没有出现",
      detail: `没有检测到「${targetKeyword}」。`,
    });
  }

  if (parsed.imageCount > 0 && parsed.htmlImageAlts.some((alt) => alt.trim() === "")) {
    addIssue(issues, {
      dimension: "seo",
      evidence: `检测到 ${parsed.imageCount} 张图片，其中至少 1 张 alt 为空。`,
      fix: "给关键图片补可读 alt，说明图里有什么，不要堆关键词。",
      id: "seo-image-alt",
      level: "warn",
      title: "图片 alt 不完整",
      detail: "图片可能参与搜索和 AI 结果展示，空 alt 会降低可理解性。",
    });
  }

  if (pageUrl && !/^https?:\/\/[^/\s]+/i.test(pageUrl)) {
    addIssue(issues, {
      dimension: "seo",
      evidence: `当前 URL：${pageUrl}`,
      fix: "页面 URL 建议填写完整的 https:// 地址，方便生成 canonical 和 JSON-LD。",
      id: "seo-url",
      level: "warn",
      title: "页面 URL 格式不完整",
      detail: "完整 URL 能让结构化数据更可用。",
    });
  }
}

function addAeoIssues(issues: SearchAuditIssue[], parsed: ParsedContent, directAnswer: string, faqCount: number, targetQuestion: string) {
  if (!directAnswer) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: "没有找到 40-160 字、可独立理解的开头答案段。",
      fix: "在开头增加 40-80 字直接答案：先回答是什么/怎么做/适合谁，再展开解释。",
      rewrite: `${parsed.title ?? "这篇内容"} 的核心结论是：先用一句话回答用户问题，再补充步骤、证据和适用场景，让读者和 AI 都能快速判断页面价值。`,
      id: "aeo-direct-answer",
      level: "fail",
      title: "缺少可摘取的直接答案",
      detail: "答案引擎更容易摘取开头清楚、独立成段的结论。",
    });
  }

  if (faqCount < 2) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: `检测到 ${faqCount} 个可用问答。`,
      fix: "增加 2-5 个真实问题，用问句做小标题，并在下一段直接回答。",
      id: "aeo-faq",
      level: "warn",
      title: "问答结构偏少",
      detail: "FAQ 和问句标题能覆盖自然语言搜索和 AI fan-out 查询。",
    });
  }

  if (targetQuestion && !containsText(parsed.text, targetQuestion)) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: `目标问题是「${targetQuestion}」，正文中没有直接覆盖。`,
      fix: "把目标问题原句或近似问法放进一个 H2/FAQ，并给出简短答案。",
      id: "aeo-target-question",
      level: "warn",
      title: "目标问题没有被直接覆盖",
      detail: `没有检测到「${targetQuestion}」。`,
    });
  }

  if (!hasListOrSteps(parsed.text)) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: `检测到 ${parsed.listCount} 个列表项。`,
      fix: "把方法、流程或判断标准整理成列表/步骤，方便答案引擎直接摘取。",
      id: "aeo-list",
      level: "warn",
      title: "缺少列表或步骤",
      detail: "步骤、清单和对比表比大段散文更容易被抽取。",
    });
  }
}

function addGeoIssues(issues: SearchAuditIssue[], parsed: ParsedContent, brandName?: string) {
  if (countEvidenceSignals(parsed.text) < 2) {
    const evidenceCount = countEvidenceSignals(parsed.text);
    addIssue(issues, {
      dimension: "geo",
      evidence: `检测到 ${evidenceCount} 个年份、数据、数量或链接信号。`,
      fix: "补充可验证证据，例如年份、数据、来源、案例、实验结果或引用链接。",
      id: "geo-evidence",
      level: "fail",
      title: "证据密度不足",
      detail: "生成式搜索更偏好有事实支撑、可被引用的段落。",
    });
  }

  if (parsed.linkCount < 1) {
    addIssue(issues, {
      dimension: "geo",
      evidence: `检测到 ${parsed.linkCount} 个链接。`,
      fix: "加入 1-3 个权威外部来源或站内延伸阅读链接。",
      id: "geo-sources",
      level: "warn",
      title: "缺少来源链接",
      detail: "没有来源会让页面更像观点稿，可信度信号偏弱。",
    });
  }

  if (!hasExperienceSignal(parsed.text)) {
    addIssue(issues, {
      dimension: "geo",
      evidence: "没有检测到“我/我们/实测/案例/经验/复盘”等第一手信号。",
      fix: "加入第一手经验、实测过程、限制条件或具体案例，避免只复述通用知识。",
      id: "geo-experience",
      level: "warn",
      title: "第一手经验信号偏弱",
      detail: "Google 官方也强调非同质化、有经验来源的内容更有长期价值。",
    });
  }

  if (brandName && !containsText(parsed.text, brandName)) {
    addIssue(issues, {
      dimension: "geo",
      evidence: `品牌/主体是「${brandName}」，正文中没有自然出现。`,
      fix: "在作者介绍、案例或页面说明中自然出现品牌/主体名称，保持实体一致。",
      id: "geo-brand-entity",
      level: "warn",
      title: "品牌实体不清晰",
      detail: `没有检测到「${brandName}」。`,
    });
  }
}

function addSchemaIssues(issues: SearchAuditIssue[], parsed: ParsedContent, faqCount: number, pageUrl?: string) {
  if (!parsed.title || !parsed.description) {
    addIssue(issues, {
      dimension: "schema",
      fix: "补齐标题和摘要后，再生成 Article JSON-LD。",
      id: "schema-title-description",
      level: "warn",
      title: "结构化数据基础字段不完整",
      detail: "标题和摘要是 Article 结构化数据最基础的字段。",
    });
  }

  if (faqCount > 0 && faqCount < 2) {
    addIssue(issues, {
      dimension: "schema",
      fix: "FAQ 至少准备 2 条再输出 FAQPage，更像真实问答模块。",
      id: "schema-faq-count",
      level: "warn",
      title: "FAQ 数量偏少",
      detail: "单条 FAQ 的信息增益有限。",
    });
  }

  if (!pageUrl) {
    addIssue(issues, {
      dimension: "schema",
      fix: "填写页面 URL，生成 canonical、mainEntityOfPage 和 llms.txt 链接。",
      id: "schema-url",
      level: "warn",
      title: "缺少页面 URL",
      detail: "URL 不影响本地体检，但会影响可复制产物的完整度。",
    });
  }
}

function addRiskIssues(issues: SearchAuditIssue[], parsed: ParsedContent) {
  const aiClicheCount = countMatches(parsed.text, /(颠覆|赋能|革命性|遥遥领先|一站式|闭环|降本增效|全链路|最佳实践)/g);
  if (aiClicheCount >= 4) {
    addIssue(issues, {
      dimension: "risk",
      fix: "删掉空泛形容词，换成具体对象、场景、数据和限制条件。",
      id: "risk-cliche",
      level: "warn",
      title: "营销套话偏多",
      detail: "套话会降低信息密度，也更像批量生成内容。",
    });
  }

  if (hasKeywordStuffing(parsed.text)) {
    addIssue(issues, {
      dimension: "risk",
      fix: "减少同一关键词的机械重复，改用自然表达、同义词和具体问题。",
      id: "risk-keyword-stuffing",
      level: "warn",
      title: "疑似关键词堆砌",
      detail: "过度重复会伤害可读性，也可能触发低质量内容判断。",
    });
  }
}

function addContentTypeIssues(issues: SearchAuditIssue[], parsed: ParsedContent, contentType: SearchAuditContentType) {
  if (contentType === "tutorial" && parsed.listCount < 3 && !/步骤|操作|流程|手册/.test(parsed.text)) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: `检测到 ${parsed.listCount} 个列表项，教程类内容建议有清晰步骤。`,
      fix: "把操作过程拆成 3-8 个步骤，并写清每一步的动作和判断标准。",
      id: "type-tutorial-steps",
      level: "warn",
      rewrite: "## 操作步骤\n\n1. 先明确目标和适用场景。\n2. 准备输入材料或账号权限。\n3. 按顺序执行关键操作。\n4. 检查输出结果是否符合预期。\n5. 记录常见问题和下一步。",
      title: "教程类内容步骤不够清楚",
      detail: "教程读者通常想快速照做，步骤结构越清晰，越容易被答案引擎摘取。",
    });
  }

  if (contentType === "glossary" && !/(是指|是一种|可以理解为|定义|概念)/.test(parsed.text.slice(0, 260))) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: "开头 260 字内没有明显定义句。",
      fix: "词条解释应在开头先给一句定义，再解释背景、用途和例子。",
      id: "type-glossary-definition",
      level: "warn",
      rewrite: `${parsed.title ?? "这个概念"} 是一种……它主要用来……你可以先把它理解为……`,
      title: "词条缺少开门见山的定义",
      detail: "词条类内容最容易被摘取的是定义句，定义越早出现越稳。",
    });
  }

  if (contentType === "comparison" && !hasComparisonSignal(parsed.text)) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: "没有检测到明显的对比词、表格或判断维度。",
      fix: "补一组对比维度，例如适用场景、优点、缺点、成本、上手难度。",
      id: "type-comparison-grid",
      level: "warn",
      rewrite: "## 对比结论\n\n| 维度 | 方案 A | 方案 B |\n| --- | --- | --- |\n| 适合谁 |  |  |\n| 优点 |  |  |\n| 限制 |  |  |\n| 建议选择 |  |  |",
      title: "对比文章缺少判断维度",
      detail: "对比内容需要清楚的维度，否则读者和 AI 都很难抽取结论。",
    });
  }

  if (contentType === "review" && !/(优点|缺点|不足|限制|适合|不适合|结论|评分)/.test(parsed.text)) {
    addIssue(issues, {
      dimension: "geo",
      evidence: "没有检测到优缺点、适用人群或结论类结构。",
      fix: "评测类内容要明确优点、缺点、适合谁、不适合谁和最终建议。",
      id: "type-review-verdict",
      level: "warn",
      rewrite: "## 评测结论\n\n适合：……\n\n不适合：……\n\n主要优点：……\n\n主要限制：……\n\n我的建议：……",
      title: "评测缺少可引用结论",
      detail: "评测文章如果没有明确结论，很难成为 AI 推荐或引用的依据。",
    });
  }

  if (contentType === "listicle" && parsed.listCount < 5) {
    addIssue(issues, {
      dimension: "aeo",
      evidence: `检测到 ${parsed.listCount} 个列表项，清单类内容通常需要更多项目。`,
      fix: "清单类文章建议至少 5 个条目，每个条目有一句结论和适用场景。",
      id: "type-listicle-items",
      level: "warn",
      rewrite: "## 推荐清单\n\n1. 条目一：一句话结论 + 适用场景。\n2. 条目二：一句话结论 + 适用场景。\n3. 条目三：一句话结论 + 适用场景。\n4. 条目四：一句话结论 + 适用场景。\n5. 条目五：一句话结论 + 适用场景。",
      title: "清单项目偏少",
      detail: "清单类内容的价值来自可扫描、可比较、可选择。",
    });
  }

  if (contentType === "news" && countEvidenceSignals(parsed.text) < 3) {
    addIssue(issues, {
      dimension: "geo",
      evidence: `检测到 ${countEvidenceSignals(parsed.text)} 个时间/数据/来源信号。`,
      fix: "新闻解读应补齐发生时间、来源、当事方、影响范围和后续观察点。",
      id: "type-news-context",
      level: "warn",
      rewrite: "## 事件背景\n\n发生时间：……\n\n信息来源：……\n\n涉及对象：……\n\n为什么重要：……\n\n后续观察：……",
      title: "新闻解读缺少背景证据",
      detail: "新闻类内容需要更强的时效、来源和上下文信号。",
    });
  }

  if (contentType === "experience" && !hasExperienceSignal(parsed.text)) {
    addIssue(issues, {
      dimension: "geo",
      evidence: "没有检测到“我/我们/实测/复盘/踩坑”等第一手经验信号。",
      fix: "个人经验类内容要写清你做了什么、看到什么、踩了什么坑、最后怎么判断。",
      id: "type-experience-firsthand",
      level: "warn",
      rewrite: "## 我的实际过程\n\n我尝试了……\n\n过程中遇到……\n\n最后我发现……\n\n如果重来一次，我会……",
      title: "个人经验信号不足",
      detail: "经验类内容的差异化来自第一手过程，不是通用知识复述。",
    });
  }
}

function parseContent(input: string): ParsedContent {
  const frontmatter = input.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  const frontmatterText = frontmatter?.[1] ?? "";
  const htmlTitle = firstMatch(input, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = firstMatch(input, /<meta\s+[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const title = cleanInline(firstYamlValue(frontmatterText, "title") || htmlTitle || firstMarkdownHeading(input, 1));
  const description = cleanInline(firstYamlValue(frontmatterText, "description") || firstYamlValue(frontmatterText, "summary") || metaDescription || "");
  const h1 = collectHeadings(input, 1);
  const h2 = collectHeadings(input, 2);
  const htmlImageAlts = [...input.matchAll(/<img\b[^>]*>/gi)].map((match) => firstMatch(match[0], /\balt=["']([^"']*)["']/i) ?? "");
  const markdownImages = [...input.matchAll(/!\[([^\]]*)\]\([^)]+\)/g)].map((match) => match[1] ?? "");
  const imageCount = htmlImageAlts.length + markdownImages.length;
  const linkCount = countMatches(input, /https?:\/\/[^\s)"'<>]+/gi) + countMatches(input, /\[[^\]]+\]\([^)]+\)/g);
  const listCount = countMatches(input, /(^|\n)\s*(?:[-*]|\d+[.)、])\s+/g);
  const text = normalizeText(stripMarkup(input));
  const paragraphs = text
    .split(/\n{2,}|(?<=[。！？!?])\s+/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length >= 12);

  return {
    description: description || null,
    h1,
    h2,
    htmlImageAlts: [...htmlImageAlts, ...markdownImages],
    imageCount,
    linkCount,
    listCount,
    paragraphs,
    raw: input,
    text,
    title: title || null,
  };
}

function stripMarkup(input: string) {
  return input
    .replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#|]+/g, " ");
}

function collectHeadings(input: string, level: 1 | 2) {
  const markdown = [...input.matchAll(new RegExp(`^#{${level}}\\s+(.+)$`, "gm"))].map((match) => cleanInline(match[1]));
  const html = [...input.matchAll(new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi"))].map((match) => cleanInline(stripMarkup(match[1])));
  return [...markdown, ...html].filter(Boolean);
}

function firstMarkdownHeading(input: string, level: 1 | 2) {
  return firstMatch(input, new RegExp(`^#{${level}}\\s+(.+)$`, "m"));
}

function firstYamlValue(frontmatter: string, key: string) {
  return firstMatch(frontmatter, new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"));
}

function firstMatch(input: string, pattern: RegExp) {
  return input.match(pattern)?.[1] ?? "";
}

function cleanInline(input: string) {
  return normalizeText(stripMarkup(input)).replace(/^["']|["']$/g, "");
}

function normalizeText(input: string) {
  return input.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function containsText(text: string, needle: string) {
  return comparableText(text).includes(comparableText(needle));
}

function comparableText(input: string) {
  return normalizeText(input)
    .toLowerCase()
    .replace(/[、，,;/／\\|]+/g, " ")
    .replace(/\s+/g, " ");
}

function countChars(input: string) {
  return Array.from(input).length;
}

function countWords(input: string) {
  const chinese = input.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
  const words = input.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  return chinese + words;
}

function countMatches(input: string, pattern: RegExp) {
  return [...input.matchAll(pattern)].length;
}

function findDirectAnswer(paragraphs: string[], targetKeyword: string) {
  return (
    paragraphs.find((paragraph) => {
      const length = countChars(paragraph);
      return length >= 40 && length <= 160 && (!targetKeyword || containsText(paragraph, targetKeyword));
    }) ?? ""
  );
}

function buildFaq(parsed: ParsedContent, targetQuestion: string, targetKeyword: string) {
  const questions = new Set<string>();
  if (targetQuestion) questions.add(targetQuestion);
  for (const heading of [...parsed.h1, ...parsed.h2]) {
    if (/[?？]|如何|怎么|为什么|是什么|能不能|适合/.test(heading)) questions.add(heading);
  }
  if (questions.size < 2 && targetKeyword) {
    questions.add(`${targetKeyword} 是什么？`);
    questions.add(`${targetKeyword} 应该怎么优化？`);
  }
  return [...questions].slice(0, 5).map((question) => ({
    question,
    answer: findAnswerAfterQuestion(parsed, question) || "建议用 40-80 字直接回答这个问题，再补充条件、步骤或示例。",
  }));
}

function findAnswerAfterQuestion(parsed: ParsedContent, question: string) {
  const headingAnswer = findAnswerAfterMarkdownHeading(parsed.raw, question);
  if (headingAnswer) return headingAnswer;

  const normalizedQuestion = question.replace(/[?？]/g, "");
  const headings = new Set([...parsed.h1, ...parsed.h2, parsed.title].filter(Boolean));
  return parsed.paragraphs.find((paragraph) => !headings.has(paragraph) && paragraph !== question && !containsText(paragraph, normalizedQuestion) && countChars(paragraph) <= 180) ?? "";
}

function findAnswerAfterMarkdownHeading(input: string, question: string) {
  const normalizedQuestion = comparableText(question.replace(/[?？]/g, ""));
  const sections = [...input.matchAll(/^#{1,6}\s+(.+)$([\s\S]*?)(?=^#{1,6}\s+|(?![\s\S]))/gm)];
  for (const section of sections) {
    const heading = cleanInline(section[1]).replace(/[?？]/g, "");
    if (!containsText(heading, normalizedQuestion) && !containsText(normalizedQuestion, heading)) continue;
    const answer = normalizeText(stripMarkup(section[2]))
      .split(/\n{2,}|(?<=[。！？!?])\s+/)
      .map((item) => normalizeText(item))
      .find((item) => item.length >= 12 && countChars(item) <= 180);
    if (answer) return answer;
  }
  return "";
}

function hasListOrSteps(text: string) {
  return /(^|\n)\s*(?:[-*]|\d+[.)、]|第[一二三四五六七八九十]+步)/.test(text) || /步骤|清单|对比|表格|流程/.test(text);
}

function hasComparisonSignal(text: string) {
  return /\|.+\||对比|相比|区别|优缺点|适合|不适合|方案|维度|vs\.?/i.test(text);
}

function countEvidenceSignals(text: string) {
  return countMatches(text, /\b20\d{2}\b|[0-9]+(?:\.[0-9]+)?%|[0-9]+(?:\.[0-9]+)?\s*(?:倍|个|天|年|月|元|美元|分钟|小时)|https?:\/\//gi);
}

function hasExperienceSignal(text: string) {
  return /我|我们|实测|案例|经验|复盘|踩坑|观察|调研|访谈|数据|样本|实验|对比/.test(text);
}

function hasKeywordStuffing(text: string) {
  const words = text.match(/[\u4e00-\u9fa5]{2,}|[A-Za-z0-9]{3,}/g) ?? [];
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word.toLowerCase(), (counts.get(word.toLowerCase()) ?? 0) + 1);
  return [...counts.values()].some((count) => count >= 12);
}

function scoreIssues(issues: SearchAuditIssue[]): SearchAuditScore {
  const dimensions: Array<Exclude<SearchAuditDimension, "risk">> = ["seo", "aeo", "geo", "schema"];
  const byDimension = Object.fromEntries(dimensions.map((dimension) => [dimension, 100])) as Record<Exclude<SearchAuditDimension, "risk">, number>;

  for (const issue of issues) {
    if (issue.dimension === "risk") {
      for (const dimension of dimensions) byDimension[dimension] -= issue.level === "fail" ? 6 : 3;
      continue;
    }
    byDimension[issue.dimension] -= issue.level === "fail" ? 22 : 10;
  }

  const seo = clampScore(byDimension.seo);
  const aeo = clampScore(byDimension.aeo);
  const geo = clampScore(byDimension.geo);
  const schema = clampScore(byDimension.schema);
  return {
    aeo,
    geo,
    overall: Math.round(seo * 0.28 + aeo * 0.26 + geo * 0.3 + schema * 0.16),
    schema,
    seo,
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildFallbackSummary(parsed: ParsedContent, targetKeyword: string, targetQuestion: string) {
  const subject = targetKeyword || parsed.title || "这篇内容";
  if (targetQuestion) return `${subject} 需要先直接回答「${targetQuestion}」，再用步骤、证据和案例展开，让读者和 AI 都能快速判断页面价值。`;
  return `${subject} 需要在开头给出清晰定义或结论，再补充证据、步骤和 FAQ，提升被搜索引擎理解和答案引擎摘取的机会。`;
}

function buildRewrites(parsed: ParsedContent, options: SearchAuditOptions, summary: string, faq: Array<{ question: string; answer: string }>): SearchAuditRewrite[] {
  const subject = options.targetKeyword || parsed.title || "这篇文章";
  const question = options.targetQuestion || `${subject} 是什么？`;
  const titleBase = parsed.title || subject;
  const description = parsed.description || `${subject} 适合想快速理解背景、方法和注意事项的读者。`;
  return [
    {
      id: "direct-answer",
      title: "首段直接答案",
      value: `${subject} 的核心结论是：${summary.replace(/[。！？!?]$/, "")}。如果你只想快速判断，可以先看定义、适用场景、关键步骤和来源证据，再决定是否深入阅读。`,
    },
    {
      id: "title-options",
      title: "标题备选",
      value: [`${titleBase}：一篇看懂核心概念和操作重点`, `${subject} 怎么做？新手发布前检查清单`, `${subject} 的 SEO / AEO / GEO 优化指南`].join("\n"),
    },
    {
      id: "meta-description",
      title: "摘要备选",
      value: description.length >= 40 ? description : `${description} 本文会用清晰定义、步骤、FAQ 和来源提示，帮助读者快速理解并应用。`,
    },
    {
      id: "faq-block",
      title: "FAQ 模块",
      value: faq.length > 0 ? faq.map((item) => `### ${item.question}\n${item.answer}`).join("\n\n") : `### ${question}\n建议用 40-80 字直接回答这个问题，再补充条件、步骤或示例。`,
    },
    {
      id: "citation-paragraph",
      title: "可引用段落模板",
      value: `根据本文整理，${subject} 的判断重点不是单一关键词，而是页面是否能被抓取、是否能直接回答问题、是否提供来源和第一手经验。发布前建议同时检查标题、首段、FAQ、结构化数据和证据链接。`,
    },
  ];
}

function buildChecklist(parsed: ParsedContent, issues: SearchAuditIssue[], faqCount: number, pageUrl?: string): SearchAuditChecklistItem[] {
  const failedIds = new Set(issues.map((issue) => issue.id));
  return [
    { id: "title", label: "标题清楚，且只有一个 H1", done: Boolean(parsed.title) && parsed.h1.length === 1 && !failedIds.has("seo-title-length") },
    { id: "description", label: "有 40 字以上摘要", done: Boolean(parsed.description && countChars(parsed.description) >= 40) },
    { id: "direct-answer", label: "开头有可摘取的直接答案", done: !failedIds.has("aeo-direct-answer") },
    { id: "faq", label: "至少有 2 个真实问题或 FAQ", done: faqCount >= 2 },
    { id: "sources", label: "有来源、数据、年份或案例证据", done: !failedIds.has("geo-evidence") && !failedIds.has("geo-sources") },
    { id: "experience", label: "有第一手经验或具体观察", done: !failedIds.has("geo-experience") },
    { id: "schema", label: "可生成 Article / FAQ 结构化数据", done: Boolean(parsed.title && parsed.description) },
    { id: "url", label: "填写页面 URL，可生成完整 llms.txt 入口", done: Boolean(pageUrl && /^https?:\/\/[^/\s]+/i.test(pageUrl)) },
  ];
}

function buildVerdict(score: SearchAuditScore, issues: SearchAuditIssue[]) {
  const failCount = issues.filter((issue) => issue.level === "fail").length;
  if (score.overall >= 85 && failCount === 0) return "整体可以发布，发布前建议人工复核事实、来源和品牌表述。";
  if (score.overall >= 70) return "结构基本可用，优先补齐证据、直接答案和可复制 FAQ。";
  if (score.overall >= 50) return "建议先改再发布：当前内容能读，但不够容易被搜索和答案引擎摘取。";
  return "暂不建议直接发布：标题、首段、证据或结构化信息需要先补齐。";
}

function buildJsonLd(parsed: ParsedContent, options: SearchAuditOptions, faq: Array<{ question: string; answer: string }>) {
  const graph: unknown[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: parsed.title ?? options.targetKeyword ?? "文章标题",
      description: parsed.description ?? parsed.paragraphs[0] ?? "",
      mainEntityOfPage: options.pageUrl || undefined,
      author: options.brandName ? { "@type": "Organization", name: options.brandName } : undefined,
    },
  ];
  if (faq.length >= 2) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  return JSON.stringify(graph.length === 1 ? graph[0] : graph, null, 2);
}

function buildLlmsText(parsed: ParsedContent, options: SearchAuditOptions, summary: string) {
  const lines = [
    `# ${options.brandName || parsed.title || "站点名称"}`,
    "",
    `> ${summary}`,
    "",
    "## 推荐入口",
    options.pageUrl ? `- [${parsed.title || "当前页面"}](${options.pageUrl}): ${parsed.description || summary}` : "- [当前页面](https://example.com/page): 替换为正式页面 URL 和摘要。",
  ];
  if (options.targetKeyword) lines.push(`- 主题关键词：${options.targetKeyword}`);
  if (options.targetQuestion) lines.push(`- 目标问题：${options.targetQuestion}`);
  return lines.join("\n");
}

export function formatSearchAuditMarkdown(result: SearchAuditResult) {
  const issues = result.issues.filter((issue) => issue.level !== "pass");
  const topIssues = [...issues.filter((issue) => issue.id.startsWith("type-")), ...issues.filter((issue) => !issue.id.startsWith("type-"))].slice(0, 10);
  return [
    `# AI 搜索体检结果`,
    "",
    `总分：${result.score.overall}/100`,
    `SEO：${result.score.seo} · AEO：${result.score.aeo} · GEO：${result.score.geo} · 结构化：${result.score.schema}`,
    "",
    "## 优先修改",
    ...topIssues.map((issue, index) => `${index + 1}. [${dimensionLabels[issue.dimension]}] ${issue.title}：${issue.fix}`),
    "",
    "## AI 可引用摘要",
    result.aiSummary,
    "",
    "## FAQ 建议",
    ...result.faq.map((item) => `- ${item.question}\n  ${item.answer}`),
  ].join("\n");
}
