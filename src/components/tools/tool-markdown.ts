export function renderMarkdownPreview(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ol" | "ul" | null = null;
  let blockquote: string[] = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderMarkdownInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };
  const flushBlockquote = () => {
    if (blockquote.length === 0) return;
    html.push(`<blockquote>${blockquote.map((line) => `<p>${renderMarkdownInline(line)}</p>`).join("")}</blockquote>`);
    blockquote = [];
  };

  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    const fence = /^```\s*([\w-]+)?\s*$/.exec(line.trim());
    if (fence) {
      flushParagraph();
      flushList();
      flushBlockquote();
      if (inCode) {
        const languageLabel = codeLanguage ? `<span class="tools-markdown-code-lang">${escapeHtml(codeLanguage)}</span>` : "";
        html.push(`<pre>${languageLabel}<code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        codeLanguage = "";
        inCode = false;
      } else {
        inCode = true;
        codeLanguage = fence[1] ?? "";
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      flushBlockquote();
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      html.push("<hr />");
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      flushBlockquote();
      html.push(`<h${heading[1].length}>${renderMarkdownInline(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      blockquote.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }

    if (isMarkdownTableStart(lines, cursor)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const table = renderMarkdownTable(lines, cursor);
      html.push(table.html);
      cursor = table.nextIndex;
      continue;
    }

    const task = /^[-*]\s+\[([ xX])]\s+(.+)$/.exec(trimmed);
    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (task || unordered || ordered) {
      flushParagraph();
      flushBlockquote();
      const nextType = task || unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      if (!listType) {
        listType = nextType;
        html.push(`<${listType}>`);
      }
      if (task) {
        const checked = task[1].toLowerCase() === "x";
        html.push(`<li class="tools-markdown-task"><input type="checkbox" disabled${checked ? " checked" : ""} /> <span>${renderMarkdownInline(task[2])}</span></li>`);
      } else {
        html.push(`<li>${renderMarkdownInline((unordered ?? ordered)?.[1] ?? "")}</li>`);
      }
      continue;
    }

    flushList();
    flushBlockquote();
    paragraph.push(trimmed);
  }

  if (inCode) {
    const languageLabel = codeLanguage ? `<span class="tools-markdown-code-lang">${escapeHtml(codeLanguage)}</span>` : "";
    html.push(`<pre>${languageLabel}<code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  flushList();
  flushBlockquote();
  return html.join("\n");
}

export function sanitizeMarkdownPreviewHtml(html: string) {
  return html.replace(/<script\b/gi, "&lt;script").replace(/<\/script>/gi, "&lt;/script&gt;");
}

function renderMarkdownInline(value: string) {
  const placeholders: string[] = [];
  const hold = (html: string) => {
    const key = `@@MD_PLACEHOLDER_${placeholders.length}@@`;
    placeholders.push(html);
    return key;
  };

  const withLinks = value
    .replace(/!\[([^\]]*)]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, (_match, alt: string, url: string) => hold(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`))
    .replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, (_match, label: string, url: string) => hold(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`))
    .replace(/https?:\/\/[^\s<]+/g, (url) => hold(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`));

  return escapeHtml(withLinks)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/@@MD_PLACEHOLDER_(\d+)@@/g, (_match, index: string) => placeholders[Number(index)] ?? "");
}

function escapeHtml(value: string) {
  return htmlEscape(value);
}

function isMarkdownTableStart(lines: string[], index: number) {
  const current = lines[index]?.trim() ?? "";
  const next = lines[index + 1]?.trim() ?? "";
  return current.includes("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next);
}

function renderMarkdownTable(lines: string[], start: number) {
  const headers = splitMarkdownTableRow(lines[start]);
  const alignments = splitMarkdownTableRow(lines[start + 1]).map((cell) => {
    const value = cell.trim();
    if (value.startsWith(":") && value.endsWith(":")) return "center";
    if (value.endsWith(":")) return "right";
    return "left";
  });
  const bodyRows: string[][] = [];
  let cursor = start + 2;
  while (cursor < lines.length && lines[cursor].trim().includes("|") && lines[cursor].trim()) {
    bodyRows.push(splitMarkdownTableRow(lines[cursor]));
    cursor += 1;
  }

  const headerHtml = headers.map((header, index) => `<th style="text-align:${alignments[index] ?? "left"}">${renderMarkdownInline(header.trim())}</th>`).join("");
  const bodyHtml = bodyRows
    .map((row) => `<tr>${headers.map((_header, index) => `<td style="text-align:${alignments[index] ?? "left"}">${renderMarkdownInline((row[index] ?? "").trim())}</td>`).join("")}</tr>`)
    .join("");
  return {
    html: `<div class="tools-markdown-table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`,
    nextIndex: cursor - 1,
  };
}

function splitMarkdownTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;
  Array.from(trimmed).forEach((character) => {
    if (escaped) {
      current += character;
      escaped = false;
      return;
    }
    if (character === "\\") {
      escaped = true;
      return;
    }
    if (character === "|") {
      cells.push(current);
      current = "";
      return;
    }
    current += character;
  });
  cells.push(current);
  return cells;
}

function htmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
