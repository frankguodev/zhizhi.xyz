#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const workspaceRoot = process.cwd();

const standardCategories = new Map([
  ["ai-basics", { name: "AI 基础概念", description: "AI/机器学习/深度学习的入门概念", sort_order: 10 }],
  ["llm", { name: "大语言模型", description: "LLM 的原理与关键术语", sort_order: 20 }],
  ["prompting", { name: "提示词与上下文", description: "怎么把任务“喂”给模型", sort_order: 30 }],
  ["rag", { name: "检索与知识(RAG)", description: "让模型用外部知识回答", sort_order: 40 }],
  ["ai-agent", { name: "AI 智能体", description: "能规划、调工具、多步执行的 AI", sort_order: 50 }],
  ["generative-ai", { name: "生成式与多模态", description: "文生图/视频/音频、多模态", sort_order: 60 }],
  ["model-training", { name: "模型训练与微调", description: "模型怎么练出来/怎么调", sort_order: 70 }],
  ["ai-protocol", { name: "AI 协议与互操作", description: "AI 应用之间/和外部如何连接", sort_order: 80 }],
  ["ai-coding", { name: "AI 编程与开发工具", description: "用 AI 写代码/开发", sort_order: 90 }],
  ["ai-safety", { name: "安全、评估与对齐", description: "让 AI 可靠、可信、可衡量", sort_order: 100 }],
  ["ai-ecosystem", { name: "AI 产品与生态", description: "厂商、模型家族、产品", sort_order: 110 }],
  ["ai-trends", { name: "AI 趋势与社会", description: "趋势、伦理、政策、黑话", sort_order: 120 }],
]);

const validTypes = new Set(["concept", "protocol", "framework", "product", "model", "workflow", "infra", "slang", "company", "method"]);
const validDifficulties = new Set(["beginner", "intermediate", "advanced"]);
const validStatuses = new Set(["draft", "published", "archived"]);
const validVisibilities = new Set(["public", "login", "hidden"]);
const validRelationTypes = new Set(["related", "similar", "opposite", "upstream", "downstream", "ecosystem"]);

function usage() {
  console.log(`Usage:
  npm run ai-term:validate -- <TERM>
  npm run ai-term:validate -- --file summery/aiterms/pro/RAG.md

Checks a local AI term pro markdown file without writing to D1/R2.`);
}

function normalizeArg(value) {
  return String(value ?? "").trim();
}

function getInputPath(args) {
  const fileIndex = args.indexOf("--file");
  if (fileIndex >= 0) {
    const filePath = normalizeArg(args[fileIndex + 1]);
    if (!filePath) {
      throw new Error("--file requires a path.");
    }
    return path.resolve(workspaceRoot, filePath);
  }

  const term = normalizeArg(args.find((arg) => !arg.startsWith("-")));
  if (!term || term === "-h" || term === "--help") {
    usage();
    process.exit(term ? 0 : 1);
  }

  return path.join(workspaceRoot, "summery", "aiterms", "pro", `${term}.md`);
}

function isRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function boolValue(value) {
  return typeof value === "boolean" ? value : null;
}

function hasLocalPath(value) {
  const normalized = text(value).replaceAll("\\", "/");
  return Boolean(
    normalized &&
      (normalized.startsWith("./") ||
        normalized.startsWith("../") ||
        normalized.startsWith("summery/") ||
        normalized.startsWith("C:/") ||
        normalized.includes("/summery/aiterms/")),
  );
}

function add(list, level, message) {
  list.push({ level, message });
}

function validateFrontmatter(data, content) {
  const issues = [];

  for (const key of ["term", "slug", "locale", "translation_key", "short_concept", "short_desc", "type", "difficulty", "status", "visibility"]) {
    if (!text(data[key])) {
      add(issues, "error", `缺少或为空：${key}`);
    }
  }

  if ("tags" in data) {
    add(issues, "error", "禁止字段：tags");
  }

  if ("topic_tags" in data) {
    add(issues, "error", "禁止字段：topic_tags");
  }

  if (text(data.locale) !== "zh") {
    add(issues, "error", "locale 必须为 zh");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(data.slug))) {
    add(issues, "error", "slug 必须为小写英文/数字/中划线，且不能含中文、空格或特殊符号");
  }

  if (!validTypes.has(text(data.type))) {
    add(issues, "error", `type 不合法：${text(data.type) || "(empty)"}`);
  }

  if (!validDifficulties.has(text(data.difficulty))) {
    add(issues, "error", `difficulty 不合法：${text(data.difficulty) || "(empty)"}`);
  }

  if (!validStatuses.has(text(data.status))) {
    add(issues, "error", `status 不合法：${text(data.status) || "(empty)"}`);
  }

  if (text(data.status) !== "draft") {
    add(issues, "warning", "默认 pro 应保持 status: draft");
  }

  if (!validVisibilities.has(text(data.visibility))) {
    add(issues, "error", `visibility 不合法：${text(data.visibility) || "(empty)"}`);
  }

  for (const key of ["heat_score", "quality_score"]) {
    const value = numberValue(data[key]);
    if (value === null || value < 0 || value > 100) {
      add(issues, "error", `${key} 必须是 0-100 的整数`);
    }
  }

  if (boolValue(data.trending) === null) {
    add(issues, "error", "trending 必须是布尔值");
  }

  const contentMeta = isRecord(data.content) ? data.content : {};
  if (text(contentMeta.format) !== "markdown") {
    add(issues, "error", "content.format 必须为 markdown");
  }
  if (text(contentMeta.version) !== "ai-term-md-v1") {
    add(issues, "error", "content.version 必须为 ai-term-md-v1");
  }

  const categories = Array.isArray(data.categories) ? data.categories : [];
  if (categories.length < 1 || categories.length > 2) {
    add(issues, "error", "categories 必须包含 1-2 个标准分类");
  }

  categories.forEach((category, index) => {
    if (!isRecord(category)) {
      add(issues, "error", `categories[${index}] 必须是对象`);
      return;
    }

    const slug = text(category.slug);
    const standard = standardCategories.get(slug);
    if (!standard) {
      add(issues, "error", `categories[${index}].slug 不在标准分类表中：${slug || "(empty)"}`);
      return;
    }

    if (text(category.name) !== standard.name) {
      add(issues, "error", `categories[${index}].name 与标准分类不一致，应为：${standard.name}`);
    }
    if (text(category.description) !== standard.description) {
      add(issues, "error", `categories[${index}].description 与标准分类不一致，应为：${standard.description}`);
    }
    if (Number(category.sort_order) !== standard.sort_order) {
      add(issues, "error", `categories[${index}].sort_order 与标准分类不一致，应为：${standard.sort_order}`);
    }
  });

  const relations = Array.isArray(data.relations) ? data.relations : [];
  if (relations.length > 0 && (relations.length < 3 || relations.length > 8)) {
    add(issues, "warning", "relations 建议保持 3-8 个稳定候选");
  }
  relations.forEach((relation, index) => {
    if (!isRecord(relation)) {
      add(issues, "error", `relations[${index}] 必须是对象`);
      return;
    }
    if (!text(relation.slug)) {
      add(issues, "error", `relations[${index}].slug 不能为空`);
    }
    if (!validRelationTypes.has(text(relation.relation_type))) {
      add(issues, "error", `relations[${index}].relation_type 不合法：${text(relation.relation_type) || "(empty)"}`);
    }
  });

  const source = isRecord(data.source) ? data.source : {};
  if (source.human_reviewed !== false) {
    add(issues, "error", "source.human_reviewed 必须为 false");
  }
  if (source.ai_assisted !== true) {
    add(issues, "warning", "source.ai_assisted 建议为 true");
  }
  if (!text(source.last_verified_at)) {
    add(issues, "warning", "source.last_verified_at 为空，建议记录核查日期");
  }

  const openGraph = isRecord(data.open_graph) ? data.open_graph : {};
  const twitter = isRecord(data.twitter) ? data.twitter : {};
  const diagram = isRecord(data.diagram) ? data.diagram : {};
  if (text(openGraph.image) && text(twitter.image) && text(openGraph.image) !== text(twitter.image)) {
    add(issues, "warning", "open_graph.image 与 twitter.image 不一致");
  }

  for (const [field, value] of [
    ["open_graph.image", openGraph.image],
    ["twitter.image", twitter.image],
    ["diagram.image", diagram.image],
  ]) {
    if (hasLocalPath(value)) {
      add(issues, "error", `${field} 不能写入本地路径：${text(value)}`);
    }
  }

  const validDiagramImage =
    /^\/media\/ai-terms\/\d{4}\/(0[1-9]|1[0-2])\/diagram-[a-f0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(
      text(diagram.image),
    ) ||
    /^\/media\/ai-terms\/(zh|en)\/[a-z0-9-]+\/diagram-[a-f0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(
      text(diagram.image),
    );
  if (text(diagram.image) && !validDiagramImage) {
    add(issues, "warning", "diagram.image 建议使用 /media/ai-terms/YYYY/MM/diagram-{uuid}.{ext} 形式");
  }

  const structuredData = isRecord(data.structured_data) ? data.structured_data : {};
  if (text(structuredData.schema_type) !== "DefinedTerm") {
    add(issues, "error", "structured_data.schema_type 必须为 DefinedTerm");
  }

  if (!/^#\s+.+$/m.test(content)) {
    add(issues, "warning", "正文建议保留一个 # 一级标题");
  }

  if (content.trim().length < 300) {
    add(issues, "error", "正文过短，建议至少 300 字");
  }

  for (const pattern of ["初稿说明", "初稿字段提炼参考", "字段候选", "待人工确认", "本提示词", "要求：", "注意："]) {
    if (content.includes(pattern)) {
      add(issues, "error", `正文疑似残留内部生产内容：${pattern}`);
    }
  }

  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = getInputPath(args);
  const markdown = await fs.readFile(inputPath, "utf8");
  const parsed = matter(markdown);
  const issues = validateFrontmatter(parsed.data, parsed.content);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  console.log(`AI term pro validation: ${path.relative(workspaceRoot, inputPath)}`);
  console.log(`Errors: ${errors.length}, warnings: ${warnings.length}`);

  for (const issue of issues) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN";
    console.log(`- ${prefix}: ${issue.message}`);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
