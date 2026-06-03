import { siteConfig } from "@/lib/site";

export function splitMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return { hasFrontmatter: false, frontmatter: "", content: normalized };
  }

  return {
    hasFrontmatter: true,
    frontmatter: match[1],
    content: normalized.slice(match[0].length),
  };
}

export function joinMarkdown(frontmatter: string, content: string) {
  const cleanFrontmatter = frontmatter.trim();
  const normalizedContent = content.replace(/^\n+/, "");
  return cleanFrontmatter ? `---\n${cleanFrontmatter}\n---\n\n${normalizedContent}` : normalizedContent;
}

export function frontmatterString(markdown: string, key: string) {
  const { frontmatter } = splitMarkdown(markdown);
  const pattern = new RegExp(`(^|\\n)${key}:\\s*["']?([^"'\\n]+)["']?(?=\\n|$)`);
  return frontmatter.match(pattern)?.[2]?.trim() ?? "";
}

function yamlString(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function upsertYamlScalar(source: string, key: string, value: string) {
  const line = `  ${key}: ${yamlString(value)}`;
  const pattern = new RegExp(`(^|\\n)\\s{2}${key}:.*(?=\\n|$)`);

  if (pattern.test(source)) {
    return source.replace(pattern, (match, prefix: string) => `${prefix}${line}`);
  }

  return `${source.replace(/\s+$/g, "")}\n${line}`;
}

function upsertYamlSection(frontmatter: string, section: string, values: Record<string, string>) {
  const sectionPattern = new RegExp(`(^|\\n)${section}:\\n((?:  .*(?:\\n|$))*)`);
  const sectionMatch = frontmatter.match(sectionPattern);

  if (sectionMatch) {
    const block = sectionMatch[0].replace(/^\n/, "");
    let nextBlock = block;

    for (const [key, value] of Object.entries(values)) {
      nextBlock = upsertYamlScalar(nextBlock, key, value);
    }

    return frontmatter.replace(block, nextBlock);
  }

  const block = `${section}:\n${Object.entries(values)
    .map(([key, value]) => `  ${key}: ${yamlString(value)}`)
    .join("\n")}`;

  if (frontmatter.includes("\nsource:")) {
    return frontmatter.replace(/\nsource:/, `\n${block}\n\nsource:`);
  }

  return `${frontmatter.trim()}\n\n${block}`;
}

export function upsertAiTermCanonicalUrl(markdown: string, canonicalUrl: string) {
  const parts = splitMarkdown(markdown);

  if (!parts.hasFrontmatter) {
    return markdown;
  }

  const nextFrontmatter = upsertYamlSection(parts.frontmatter, "seo", {
    canonical_url: canonicalUrl,
  });

  return joinMarkdown(nextFrontmatter, parts.content);
}

export function upsertAiTermDiagramAndShareImages(markdown: string, image: string, imageAlt: string) {
  const parts = splitMarkdown(markdown);

  if (!parts.hasFrontmatter) {
    return markdown;
  }

  let nextFrontmatter = parts.frontmatter;
  nextFrontmatter = upsertYamlSection(nextFrontmatter, "diagram", {
    image,
    image_alt: imageAlt,
  });
  nextFrontmatter = upsertYamlSection(nextFrontmatter, "open_graph", {
    image,
    image_alt: imageAlt,
  });
  nextFrontmatter = upsertYamlSection(nextFrontmatter, "twitter", {
    image,
  });

  return joinMarkdown(nextFrontmatter, parts.content);
}

export function buildAiTermCanonicalUrl(slug: string) {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return "";
  }

  return new URL(`/ai-terms/${encodeURIComponent(normalizedSlug)}`, siteConfig.url).toString();
}
