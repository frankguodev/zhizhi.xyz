import type { ArticleRecord } from "@/data/articles";
import { isStandardArticleCategory, normalizeArticleCategory } from "@/lib/article-taxonomy";

export type QualityIssueLevel = "error" | "warning" | "suggestion";

export type QualityIssue = {
  id: string;
  level: QualityIssueLevel;
  title: string;
  detail: string;
};

export type LayerStats = {
  detail: number;
  example: number;
  warning: number;
  advanced: number;
  author: number;
  untitled: number;
  unclosed: number;
};

export type ArticleQualityReport = {
  score: number;
  issues: QualityIssue[];
  stats: {
    words: number;
    headings: number;
    h2: number;
    paragraphs: number;
    links: number;
    images: number;
    mainlineCharacters: number;
    layeredCharacters: number;
    quickModeRatio: number;
    layers: LayerStats;
    seo: {
      seoTitleLength: number;
      seoDescriptionLength: number;
      keywords: number;
      h1: number;
      hasCanonical: boolean;
      hasRobots: boolean;
      hasCoverImage: boolean;
      hasSocialImage: boolean;
      hasImageAlt: boolean;
    };
  };
};

type LayerType = "detail" | "example" | "warning" | "advanced" | "author";
const layerStartPattern = /^:::(detail|example|warning|advanced|author)(?:\s+(.+))?\s*$/;
const layerClosePattern = /^:::$/;
const unresolvedMarkers = ["[需核实]", "[补充个人经验]", "[图片建议", "TODO", "FIXME"];
const fallbackTitles: Record<LayerType, string> = {
  detail: "详细解释",
  example: "示例",
  warning: "注意",
  advanced: "进阶内容",
  author: "作者判断",
};

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function stripCodeBlocks(markdown: string) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function getTextLength(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/[#>*_`\-\d.:[\]()]/g, "")
    .replace(/\s+/g, "")
    .length;
}

function createIssue(level: QualityIssueLevel, id: string, title: string, detail: string): QualityIssue {
  return { id, level, title, detail };
}

function cleanString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function textLength(value: string | undefined) {
  return cleanString(value)?.length ?? 0;
}

function firstParagraphText(markdown: string) {
  return markdown
    .replace(/---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+.+$/gm, "")
    .replace(/:::[\s\S]*?:::/g, "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean) ?? "";
}

function hasKeywordInOpening(article: ArticleRecord) {
  const opening = firstParagraphText(article.content).slice(0, 220).toLowerCase();
  const candidates = [
    article.primaryTopic,
    article.category,
    normalizeArticleCategory(article.category, article.locale),
    ...article.tags,
    ...(article.seoKeywords ?? []),
  ]
    .map((value) => cleanString(value))
    .filter((value): value is string => Boolean(value));

  return candidates.some((keyword) => opening.includes(keyword.toLowerCase()));
}

function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function isValidCanonical(value: string | undefined) {
  const canonical = cleanString(value);

  if (!canonical) {
    return true;
  }

  return canonical.startsWith("/") || canonical.startsWith("https://") || canonical.startsWith("http://");
}

function hasRobotDirective(value: string | undefined, directive: "index" | "noindex") {
  return cleanString(value)
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .includes(directive) ?? false;
}

function seoMetadataSection(article: ArticleRecord, key: string) {
  const value = article.seoMetadata?.[key];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function scanLayerStats(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const stats: LayerStats = {
    detail: 0,
    example: 0,
    warning: 0,
    advanced: 0,
    author: 0,
    untitled: 0,
    unclosed: 0,
  };
  const mainline: string[] = [];
  const layered: string[] = [];

  for (let cursor = 0; cursor < lines.length; cursor++) {
    const match = lines[cursor].match(layerStartPattern);

    if (!match) {
      mainline.push(lines[cursor]);
      continue;
    }

    const type = match[1] as LayerType;
    const title = match[2]?.trim();
    stats[type] += 1;

    if (!title || title === fallbackTitles[type]) {
      stats.untitled += 1;
    }

    cursor++;
    let closed = false;

    while (cursor < lines.length) {
      if (layerClosePattern.test(lines[cursor].trim())) {
        closed = true;
        break;
      }

      layered.push(lines[cursor]);
      cursor++;
    }

    if (!closed) {
      stats.unclosed += 1;
    }
  }

  return {
    stats,
    mainlineCharacters: getTextLength(mainline.join("\n")),
    layeredCharacters: getTextLength(layered.join("\n")),
  };
}

export function checkArticleQuality(article: ArticleRecord): ArticleQualityReport {
  const issues: QualityIssue[] = [];
  const markdownWithoutCode = stripCodeBlocks(article.content);
  const { stats: layers, mainlineCharacters, layeredCharacters } = scanLayerStats(article.content);
  const totalCharacters = mainlineCharacters + layeredCharacters;
  const quickModeRatio = totalCharacters > 0 ? mainlineCharacters / totalCharacters : 0;
  const headings = countMatches(markdownWithoutCode, /^#{1,6}\s+/gm);
  const h2 = countMatches(markdownWithoutCode, /^##\s+/gm);
  const paragraphs = markdownWithoutCode
    .split(/\n{2,}/)
    .filter((part) => part.trim() && !part.trim().startsWith(":::") && !part.trim().startsWith("#"))
    .length;
  const words = getTextLength(article.content);
  const links = countMatches(article.content, /(?<!!)\[[^\]]+\]\([^)]+\)/g);
  const images = countMatches(article.content, /!\[[^\]]*\]\([^)]+\)/g);
  const h1 = countMatches(markdownWithoutCode, /^#\s+/gm);
  const seoTitle = cleanString(article.seoTitle) ?? article.title;
  const seoDescription = cleanString(article.seoDescription) ?? article.summary;
  const socialImage = cleanString(article.ogImage) ?? cleanString(article.twitterImage) ?? cleanString(article.coverImage);
  const socialImageAlt = cleanString(article.ogImageAlt) ?? cleanString(article.coverImageAlt);
  const structuredData = seoMetadataSection(article, "structuredData");
  const contentMetadata = seoMetadataSection(article, "content");

  if (article.title.trim().length < 8) {
    issues.push(createIssue("warning", "short-title", "标题偏短", "标题最好能同时说明主题和读者收益。"));
  }

  if (article.summary.trim().length < 40) {
    issues.push(createIssue("warning", "short-summary", "摘要偏短", "摘要建议说明文章解决什么问题，以及读者读完能获得什么。"));
  }

  if (!article.category) {
    issues.push(createIssue("error", "missing-category", "缺少分类", "文章发布前需要选择一个主分类。"));
  }

  if (article.category && !isStandardArticleCategory(article.category, article.locale)) {
    issues.push(createIssue("warning", "non-standard-category", "分类不在当前语言标准分类中", "建议使用当前语言下的 9 个主分类之一，避免前台筛选和后台统计口径分散。"));
  }

  if (article.tags.length < 2) {
    issues.push(createIssue("suggestion", "few-tags", "标签较少", "建议至少添加 2-5 个标签，方便后续搜索和推荐。"));
  }

  if (!isValidSlug(article.slug)) {
    issues.push(createIssue("warning", "seo-slug-format", "Slug 不够利于 SEO", "建议使用英文小写和短横线，例如 ai-obsidian-writing-workflow，避免中文、空格或下划线。"));
  }

  if (textLength(seoTitle) < 12) {
    issues.push(createIssue("warning", "seo-title-short", "SEO 标题偏短", "SEO 标题建议更具体，说明主题、方法或读者收益。"));
  }

  if (textLength(seoTitle) > 70) {
    issues.push(createIssue("suggestion", "seo-title-long", "SEO 标题偏长", "搜索结果标题过长时可能被截断，建议压缩到更清晰的表达。"));
  }

  if (textLength(seoDescription) < 80) {
    issues.push(createIssue("warning", "seo-description-short", "SEO 描述偏短", "SEO description 建议 80-160 个中文字符，说明文章解决什么问题、适合谁、读者能获得什么。"));
  }

  if (textLength(seoDescription) > 180) {
    issues.push(createIssue("suggestion", "seo-description-long", "SEO 描述偏长", "搜索结果摘要过长时可能被截断，建议控制在 160 个中文字符左右。"));
  }

  if ((article.seoKeywords?.length ?? 0) < 3) {
    issues.push(createIssue("suggestion", "seo-keywords-few", "SEO 关键词不足", "建议提供 3-6 个真实覆盖正文的关键词，用于 metadata、站内推荐和后续质量分析。"));
  }

  if (!isValidCanonical(article.canonicalUrl)) {
    issues.push(createIssue("warning", "invalid-canonical", "Canonical 地址格式异常", "canonical_url 应该留空，或填写以 /、https://、http:// 开头的规范地址。"));
  }

  if (article.visibility === "public" && hasRobotDirective(article.robots, "noindex")) {
    issues.push(createIssue("error", "public-noindex", "公开文章被设置为 noindex", "如果文章希望获得搜索收录，public 文章的 robots 应使用 index, follow。"));
  }

  if (article.visibility === "hidden" && hasRobotDirective(article.robots, "index")) {
    issues.push(createIssue("warning", "private-index", "隐藏文章允许索引", "hidden 文章通常应使用 noindex, nofollow，避免搜索引擎收录暂不公开内容。"));
  }

  if (!socialImage) {
    issues.push(createIssue("suggestion", "missing-social-image", "缺少社交分享图", "建议为重要文章设置 open_graph.image 或 cover_image，社交分享和搜索展示会更完整。"));
  }

  if (socialImage && !socialImageAlt) {
    issues.push(createIssue("suggestion", "missing-social-image-alt", "缺少分享图说明", "有封面图时建议补充 image_alt，提升可访问性和图片语义。"));
  }

  if (!article.articleType && !contentMetadata.article_type) {
    issues.push(createIssue("suggestion", "missing-article-type", "缺少文章类型", "建议在 content.article_type 中标明解释型、方法型、判断型、经验型、问题型或复合型。"));
  }

  if (!article.primaryTopic && !contentMetadata.primary_topic) {
    issues.push(createIssue("suggestion", "missing-primary-topic", "缺少主话题", "建议在 content.primary_topic 中填写文章主话题，方便后续知识地图和相关文章推荐。"));
  }

  if (!structuredData.schema_type) {
    issues.push(createIssue("suggestion", "missing-schema-type", "缺少结构化数据类型", "建议在 structured_data.schema_type 中填写 Article，后续可用于 JSON-LD。"));
  }

  if (h1 > 0) {
    issues.push(createIssue("warning", "h1-count", "正文中存在一级标题", "文章标题已经由页面顶部单独渲染为一级标题。正文建议从二级标题开始，避免同一页面出现重复 H1。"));
  }

  if (!hasKeywordInOpening(article)) {
    issues.push(createIssue("suggestion", "keyword-opening", "开头缺少核心关键词", "建议在正文前 200 字自然出现主话题、分类、标签或 SEO 关键词之一。"));
  }

  for (const marker of unresolvedMarkers) {
    if (article.content.includes(marker)) {
      issues.push(createIssue("error", `marker-${marker}`, "存在未处理创作标记", `正文里还有 ${marker}，发布前需要处理。`));
    }
  }

  if (headings === 0 || h2 < 2) {
    issues.push(createIssue("warning", "weak-structure", "章节结构偏弱", "长文建议至少有 2 个二级标题，方便阅读和生成目录。"));
  }

  if (words < 1200) {
    issues.push(createIssue("suggestion", "short-content", "正文可能偏短", "高质量知识文章通常需要足够上下文、步骤和判断。短文也可以，但建议确认是否讲透。"));
  }

  if (article.supportsReadingMode && layers.detail + layers.example + layers.advanced + layers.author === 0) {
    issues.push(createIssue("warning", "missing-layer-blocks", "未使用分层内容块", "启用分层阅读的文章建议包含 detail、example、advanced 或 author 块。"));
  }

  if (layers.untitled > 0) {
    issues.push(createIssue("warning", "untitled-layer", "存在无标题分层块", "每个分层块最好有明确标题，例如 :::detail 为什么要这样做？"));
  }

  if (layers.unclosed > 0) {
    issues.push(createIssue("error", "unclosed-layer", "存在未闭合分层块", "检查是否遗漏了单独一行的 ::: 结束标记。"));
  }

  if (quickModeRatio < 0.45) {
    issues.push(createIssue("warning", "thin-quick-mode", "快速模式主线偏少", "隐藏折叠块后，保留内容可能不足。建议把关键步骤和判断留在主线里。"));
  }

  if (layers.warning === 0) {
    issues.push(createIssue("suggestion", "no-warning", "没有注意事项块", "实践型文章通常可以加入至少一个 warning，提醒风险或关键坑点。"));
  }

  if (layers.author === 0) {
    issues.push(createIssue("suggestion", "no-author-note", "没有作者判断块", "个人知识网站的辨识度来自你的判断，建议加入 author 块。"));
  }

  if (images === 0) {
    issues.push(createIssue("suggestion", "no-images", "没有图片", "后续发布正式文章时，可以加入流程图、截图或结构图提升理解效率。"));
  }

  const penalty = issues.reduce((total, issue) => {
    if (issue.level === "error") return total + 22;
    if (issue.level === "warning") return total + 10;
    return total + 4;
  }, 0);

  return {
    score: Math.max(0, Math.min(100, 100 - penalty)),
    issues,
    stats: {
      words,
      headings,
      h2,
      paragraphs,
      links,
      images,
      mainlineCharacters,
      layeredCharacters,
      quickModeRatio,
      layers,
      seo: {
        seoTitleLength: textLength(seoTitle),
        seoDescriptionLength: textLength(seoDescription),
        keywords: article.seoKeywords?.length ?? 0,
        h1,
        hasCanonical: Boolean(cleanString(article.canonicalUrl)),
        hasRobots: Boolean(cleanString(article.robots)),
        hasCoverImage: Boolean(cleanString(article.coverImage)),
        hasSocialImage: Boolean(socialImage),
        hasImageAlt: Boolean(socialImageAlt),
      },
    },
  };
}


