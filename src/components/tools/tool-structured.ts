import type { YamlLine } from "./tool-types";

export function parseYamlDocument(input: string) {
  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((raw, index) => ({ indent: raw.match(/^\s*/)?.[0].length ?? 0, lineNumber: index + 1, text: raw.trim() }))
    .filter((line) => line.text && !line.text.startsWith("#") && line.text !== "---" && line.text !== "...");
  if (lines.length === 0) return {};
  return parseYamlBlock(lines, 0, lines[0].indent).value;
}

function parseYamlBlock(lines: YamlLine[], start: number, indent: number): { next: number; value: unknown } {
  const isArray = lines[start]?.indent === indent && lines[start]?.text.startsWith("- ");
  if (isArray) {
    return parseYamlArray(lines, start, indent);
  }

  const output: Record<string, unknown> = {};
  let index = start;
  while (index < lines.length && lines[index].indent === indent && !lines[index].text.startsWith("- ")) {
    const line = lines[index];
    if (!line.text.includes(":")) {
      throw new Error(`Invalid YAML line ${line.lineNumber}: ${line.text}`);
    }

    const [key, rawValue] = splitKeyValue(line.text, ":");
    if (!key) throw new Error(`Invalid YAML line ${line.lineNumber}: ${line.text}`);
    if (rawValue) {
      output[key] = parseStructuredScalar(rawValue);
      index += 1;
    } else if (lines[index + 1]?.indent > indent) {
      const child = parseYamlBlock(lines, index + 1, lines[index + 1].indent);
      output[key] = child.value;
      index = child.next;
    } else {
      output[key] = {};
      index += 1;
    }
  }

  return { next: index, value: output };
}

function parseYamlArray(lines: YamlLine[], start: number, indent: number) {
  const output: unknown[] = [];
  let index = start;

  while (index < lines.length && lines[index].indent === indent && lines[index].text.startsWith("- ")) {
    const line = lines[index];
    const text = line.text.slice(2).trim();
    if (!text) {
      if (lines[index + 1]?.indent > indent) {
        const child = parseYamlBlock(lines, index + 1, lines[index + 1].indent);
        output.push(child.value);
        index = child.next;
      } else {
        output.push(null);
        index += 1;
      }
      continue;
    }

    if (/^[^:]+:\s*/.test(text)) {
      const [key, rawValue] = splitKeyValue(text, ":");
      if (!key) throw new Error(`Invalid YAML line ${line.lineNumber}: ${line.text}`);
      const item: Record<string, unknown> = {};
      index += 1;

      if (rawValue) {
        item[key] = parseStructuredScalar(rawValue);
      } else if (lines[index]?.indent > indent) {
        const child = parseYamlBlock(lines, index, lines[index].indent);
        item[key] = child.value;
        index = child.next;
      } else {
        item[key] = {};
      }

      while (index < lines.length && lines[index].indent > indent) {
        const child = parseYamlBlock(lines, index, lines[index].indent);
        if (!isPlainRecord(child.value)) {
          throw new Error(`Invalid YAML line ${lines[index].lineNumber}: ${lines[index].text}`);
        }
        Object.assign(item, child.value);
        index = child.next;
      }

      output.push(item);
      continue;
    }

    output.push(parseStructuredScalar(text));
    index += 1;
  }

  return { next: index, value: output };
}

export function parseTomlDocument(input: string) {
  const root: Record<string, unknown> = {};
  let current: Record<string, unknown> = root;
  input.replace(/\r\n/g, "\n").split("\n").forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const section = /^\[([^\]]+)\]$/.exec(line);
    if (section) {
      current = ensureNestedRecord(root, section[1].split(".").map((item) => item.trim()).filter(Boolean));
      return;
    }

    if (!line.includes("=")) {
      throw new Error(`Invalid TOML line ${index + 1}: ${line}`);
    }
    const [key, rawValue] = splitKeyValue(line, "=");
    if (!key) throw new Error(`Invalid TOML line ${index + 1}: ${line}`);
    current[key] = parseStructuredScalar(rawValue);
  });
  return root;
}

function ensureNestedRecord(root: Record<string, unknown>, path: string[]) {
  return path.reduce((current, key) => {
    if (!isPlainRecord(current[key])) {
      current[key] = {};
    }
    return current[key] as Record<string, unknown>;
  }, root);
}

function splitKeyValue(value: string, separator: ":" | "=") {
  const index = value.indexOf(separator);
  if (index < 0) return [value.trim(), ""] as const;
  return [value.slice(0, index).trim().replace(/^["']|["']$/g, ""), value.slice(index + 1).trim()] as const;
}

function parseStructuredScalar(value: string): unknown {
  const trimmed = stripInlineComment(value).trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const body = trimmed.slice(1, -1).trim();
    return body ? splitStructuredArray(body).map((item) => parseStructuredScalar(item)) : [];
  }
  return trimmed;
}

function splitStructuredArray(value: string) {
  const cells: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === "\"" || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
      current += character;
      continue;
    }
    if (character === "," && !quote) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }

  if (quote) {
    throw new Error("Array value has an unclosed quoted string.");
  }

  cells.push(current.trim());
  return cells;
}

function stripInlineComment(value: string) {
  let quote: "\"" | "'" | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === "\"" || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
      continue;
    }
    if (character === "#" && !quote && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index);
    }
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
