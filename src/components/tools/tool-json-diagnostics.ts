export type JsonTextHighlight = {
  end: number;
  start: number;
};

const invalidJsonPunctuationLabels: Record<string, string> = {
  "，": ",",
  "：": ":",
  "；": ";",
  "、": ",",
  "“": "\"",
  "”": "\"",
  "‘": "\"",
  "’": "\"",
};

const invalidJsonPunctuationCharacters = Object.keys(invalidJsonPunctuationLabels);

export function findInvalidJsonPunctuationRange(lineText: string, pointer?: number): JsonTextHighlight | null {
  const candidates: JsonTextHighlight[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < lineText.length; index += 1) {
    const character = lineText[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (!invalidJsonPunctuationCharacters.includes(character)) {
      continue;
    }

    candidates.push({
      end: findInvalidJsonPunctuationRangeEnd(lineText, index),
      start: findJsonSegmentStart(lineText, index),
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  if (pointer === undefined) {
    return candidates[0];
  }

  return candidates
    .sort((left, right) => {
      const distance = getRangeDistance(left, pointer) - getRangeDistance(right, pointer);
      return distance === 0 ? (left.end - left.start) - (right.end - right.start) : distance;
    })[0];
}

export function findInvalidJsonPunctuationIndex(value: string) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (invalidJsonPunctuationCharacters.includes(character)) {
      return index;
    }
  }

  return -1;
}

// 尽力修复常见的“伪 JSON”：全角标点、注释、尾随逗号、单引号字符串、Python 字面量。
// 只做无歧义的安全变换；不处理“无引号键名”等容易误伤的情况。
export function repairJsonText(input: string): string {
  let output = "";
  let index = 0;

  const skipInsignificant = (from: number) => {
    let cursor = from;
    while (cursor < input.length) {
      const char = input[cursor];
      if (/\s/.test(char)) {
        cursor += 1;
        continue;
      }
      if (char === "/" && input[cursor + 1] === "/") {
        cursor += 2;
        while (cursor < input.length && input[cursor] !== "\n") {
          cursor += 1;
        }
        continue;
      }
      if (char === "/" && input[cursor + 1] === "*") {
        cursor += 2;
        while (cursor < input.length && !(input[cursor] === "*" && input[cursor + 1] === "/")) {
          cursor += 1;
        }
        cursor += 2;
        continue;
      }
      break;
    }
    return cursor;
  };

  while (index < input.length) {
    const char = input[index];

    // 双引号字符串原样保留。
    if (char === "\"") {
      output += char;
      index += 1;
      let escaped = false;
      while (index < input.length) {
        const current = input[index];
        output += current;
        index += 1;
        if (escaped) {
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === "\"") {
          break;
        }
      }
      continue;
    }

    // 单引号字符串转成合法的双引号 JSON 字符串。
    if (char === "'") {
      index += 1;
      let value = "";
      let escaped = false;
      while (index < input.length) {
        const current = input[index];
        index += 1;
        if (escaped) {
          value += current === "'" ? "'" : `\\${current}`;
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === "'") {
          break;
        } else {
          value += current;
        }
      }
      output += JSON.stringify(value);
      continue;
    }

    // 行注释 / 块注释直接丢弃。
    if (char === "/" && input[index + 1] === "/") {
      index += 2;
      while (index < input.length && input[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (char === "/" && input[index + 1] === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) {
        index += 1;
      }
      index += 2;
      continue;
    }

    // 全角标点转半角。
    if (invalidJsonPunctuationLabels[char]) {
      output += invalidJsonPunctuationLabels[char];
      index += 1;
      continue;
    }

    // 尾随逗号：后面（跳过空白和注释）紧跟 } 或 ] 时丢弃逗号。
    if (char === ",") {
      const nextSignificant = skipInsignificant(index + 1);
      if (input[nextSignificant] === "}" || input[nextSignificant] === "]") {
        index += 1;
        continue;
      }
      output += char;
      index += 1;
      continue;
    }

    // Python 字面量 True/False/None -> true/false/null。
    if (/[A-Za-z_]/.test(char)) {
      const word = /^[A-Za-z_][\w$]*/.exec(input.slice(index))?.[0] ?? char;
      output += word === "True" ? "true" : word === "False" ? "false" : word === "None" ? "null" : word;
      index += word.length;
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

export function describeInvalidJsonPunctuation(character: string) {
  const replacement = invalidJsonPunctuationLabels[character];
  if (!replacement) {
    return "";
  }

  return `这里的 \`${character}\` 是中文/全角标点，JSON 语法这里需要使用 \`${replacement}\`。`;
}

function findInvalidJsonPunctuationRangeEnd(lineText: string, index: number) {
  let end = index + 1;
  const nextToken = findNextNonWhitespaceIndex(lineText, end);
  if (nextToken !== -1 && (lineText[nextToken] === ":" || lineText[nextToken] === ",")) {
    end = nextToken + 1;
    const afterNext = findNextNonWhitespaceIndex(lineText, end);
    if (afterNext !== -1 && !isJsonHardBoundary(lineText[afterNext])) {
      end = findJsonValueLikeEnd(lineText, afterNext);
    }
  }
  return end;
}

function findJsonValueLikeEnd(lineText: string, start: number) {
  let inString = false;
  let escaped = false;

  for (let index = start; index < lineText.length; index += 1) {
    const character = lineText[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (isJsonHardBoundary(character)) {
      return index;
    }
  }

  return lineText.length;
}

function isJsonHardBoundary(character: string) {
  return /\s/.test(character) || character === "," || character === "}" || character === "]";
}

function findJsonSegmentStart(lineText: string, index: number) {
  for (let cursor = Math.max(0, index - 1); cursor >= 0; cursor -= 1) {
    const character = lineText[cursor];
    if (character === "," || character === "{" || character === "[") {
      return cursor + 1 + countLeadingWhitespace(lineText.slice(cursor + 1, index));
    }
  }

  const firstContent = lineText.search(/\S/);
  return firstContent === -1 ? 0 : firstContent;
}

function findNextNonWhitespaceIndex(value: string, start: number) {
  for (let index = start; index < value.length; index += 1) {
    if (!/\s/.test(value[index])) {
      return index;
    }
  }
  return -1;
}

function countLeadingWhitespace(value: string) {
  const match = value.match(/^\s*/);
  return match?.[0].length ?? 0;
}

function getRangeDistance(range: JsonTextHighlight, pointer: number) {
  if (pointer < range.start) {
    return range.start - pointer;
  }
  if (pointer > range.end) {
    return pointer - range.end;
  }
  return 0;
}

type JsonLooseToken = {
  end: number;
  start: number;
  type: "literal" | "number" | "punct" | "string";
  value: string;
};

const jsonAnnotationTokens = ["<!--", "//", "/*", "#", "--", ";"] as const;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findPreviousNonWhitespaceIndex(value: string, before: number) {
  for (let index = before - 1; index >= 0; index -= 1) {
    if (!/\s/.test(value[index])) {
      return index;
    }
  }
  return -1;
}

export function getJsonErrorHighlight(message: string, input: string): JsonTextHighlight | null {
  const location = findJsonErrorLocation(message, input);
  if (!location) {
    return null;
  }

  const index = lineColumnToIndex(input, location.line, location.column);
  const line = getLineBounds(input, index);
  const lineText = input.slice(line.start, line.end);
  const pointer = clampNumber(index - line.start, 0, lineText.length);
  const previousTrailingComma = getPreviousTrailingCommaHighlight(input, line.start, lineText);
  if (previousTrailingComma) {
    return previousTrailingComma;
  }

  const suspicious = findSuspiciousJsonRangeOnLine(lineText, pointer);
  return normalizeHighlight({
    end: line.start + suspicious.end,
    start: line.start + suspicious.start,
  }, input.length);
}

function getPreviousTrailingCommaHighlight(input: string, currentLineStart: number, currentLineText: string): JsonTextHighlight | null {
  if (!/^\s*[}\]]/.test(currentLineText)) {
    return null;
  }

  let previousContentEnd = currentLineStart - 1;
  while (previousContentEnd >= 0 && /[\r\n\s]/.test(input[previousContentEnd])) {
    previousContentEnd -= 1;
  }
  if (previousContentEnd < 0 || input[previousContentEnd] !== ",") {
    return null;
  }

  const previousLineStart = input.lastIndexOf("\n", previousContentEnd) + 1;
  const previousLineText = input.slice(previousLineStart, previousContentEnd + 1);
  const firstContent = previousLineText.search(/\S/);
  if (firstContent === -1) {
    return null;
  }

  return normalizeHighlight({
    end: previousContentEnd + 1,
    start: previousLineStart + firstContent,
  }, input.length);
}

function findSuspiciousJsonRangeOnLine(lineText: string, pointer: number) {
  const safePointer = clampNumber(pointer, 0, lineText.length);
  const invalidPunctuationRange = findInvalidJsonPunctuationRange(lineText, safePointer);
  if (invalidPunctuationRange) {
    return invalidPunctuationRange;
  }

  const trailingCommaRange = getTrailingCommaHighlightRange(lineText, safePointer);
  if (trailingCommaRange) {
    return trailingCommaRange;
  }

  const annotationRange = getJsonAnnotationHighlightRange(lineText, safePointer);
  if (annotationRange) {
    return annotationRange;
  }

  const missingSeparatorRange = getMissingSeparatorHighlightRange(lineText, safePointer);
  if (missingSeparatorRange) {
    return missingSeparatorRange;
  }

  const windowStart = Math.max(0, safePointer - 96);
  const windowEnd = Math.min(lineText.length, safePointer + 24);
  const windowText = lineText.slice(windowStart, windowEnd);
  const candidates: JsonTextHighlight[] = [];

  collectJsonRangeCandidates(windowText, /"[^"\r\n]*"\s*:\s*[^,\]}\r\n]*(?:,\s*[}\]]+)+/g, windowStart, candidates);
  collectJsonRangeCandidates(windowText, /"[^"\r\n]*"\s*:\s*[^,\]}\r\n]*(?:,\s*)?/g, windowStart, candidates);

  const matchingCandidate = candidates
    .filter((candidate) => candidate.start <= safePointer && candidate.end >= safePointer)
    .sort((left, right) => (right.end - right.start) - (left.end - left.start))[0];
  if (matchingCandidate) {
    return matchingCandidate;
  }

  const nearestCandidate = candidates
    .filter((candidate) => candidate.start <= safePointer)
    .sort((left, right) => Math.abs(left.end - safePointer) - Math.abs(right.end - safePointer))[0];
  if (nearestCandidate) {
    return nearestCandidate;
  }

  return fallbackJsonHighlightRange(lineText, safePointer);
}

function getTrailingCommaHighlightRange(lineText: string, pointer: number): JsonTextHighlight | null {
  const directCommaRange = getCommaBeforeClosingRange(lineText, pointer);
  if (directCommaRange) {
    return directCommaRange;
  }

  const nextToken = findNextNonWhitespaceIndex(lineText, pointer);
  if (nextToken !== -1 && (lineText[nextToken] === "}" || lineText[nextToken] === "]")) {
    return getCommaBeforeClosingRange(lineText, nextToken);
  }

  const previousToken = findPreviousNonWhitespaceIndex(lineText, pointer);
  if (previousToken !== -1 && lineText[pointer] === "," && (lineText[previousToken] === "}" || lineText[previousToken] === "]")) {
    return {
      end: pointer + 1,
      start: findJsonSegmentStart(lineText, previousToken),
    };
  }

  return null;
}

function getCommaBeforeClosingRange(lineText: string, tokenIndex: number): JsonTextHighlight | null {
  const character = lineText[tokenIndex];
  if (character === ",") {
    const nextToken = findNextNonWhitespaceIndex(lineText, tokenIndex + 1);
    if (nextToken !== -1 && (lineText[nextToken] === "," || lineText[nextToken] === "}" || lineText[nextToken] === "]")) {
      return {
        end: nextToken + 1,
        start: findJsonSegmentStart(lineText, tokenIndex),
      };
    }
    return null;
  }

  if (character !== "}" && character !== "]") {
    return null;
  }

  const previousToken = findPreviousNonWhitespaceIndex(lineText, tokenIndex);
  if (previousToken === -1 || lineText[previousToken] !== ",") {
    return null;
  }

  return {
    end: tokenIndex + 1,
    start: findJsonSegmentStart(lineText, previousToken),
  };
}

function getJsonAnnotationHighlightRange(lineText: string, pointer: number): JsonTextHighlight | null {
  const annotationStart = findJsonAnnotationStart(lineText);
  if (annotationStart === -1 || annotationStart > pointer + 2) {
    return null;
  }

  const segmentStart = findJsonSegmentStart(lineText, annotationStart);
  const segmentEnd = Math.min(lineText.length, annotationStart + 96);
  return normalizeHighlight({
    end: segmentEnd,
    start: segmentStart,
  }, lineText.length);
}

function findJsonAnnotationStart(lineText: string) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < lineText.length; index += 1) {
    const character = lineText[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (jsonAnnotationTokens.some((token) => lineText.startsWith(token, index))) {
      return index;
    }
  }

  return -1;
}

function getMissingSeparatorHighlightRange(value: string, pointer?: number): JsonTextHighlight | null {
  const tokens = tokenizeJsonLoose(value);
  const candidates: JsonTextHighlight[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    const previous = tokens[index - 1];
    const afterNext = tokens[index + 2];
    const afterValue = tokens[index + 3];

    if (
      current.type === "string" &&
      isJsonObjectKeyContext(tokens, index, previous) &&
      next.value !== ":"
    ) {
      const end = next.value === "," && afterNext?.value === ":"
        ? (afterValue && isJsonValueStartToken(afterValue) ? afterValue.end : afterNext.end)
        : next.end;
      candidates.push({
        end,
        start: current.start,
      });
      continue;
    }

    if (isJsonValueEndToken(current) && isJsonValueStartToken(next)) {
      candidates.push({
        end: next.end,
        start: current.start,
      });
      continue;
    }

    if (current.value === ":" && (next.value === "," || next.value === "}" || next.value === "]")) {
      candidates.push({
        end: next.end,
        start: current.start,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  if (pointer === undefined) {
    return candidates[0];
  }

  return candidates
    .sort((left, right) => {
      const distance = getRangeDistance(left, pointer) - getRangeDistance(right, pointer);
      return distance === 0 ? (left.end - left.start) - (right.end - right.start) : distance;
    })[0];
}

function tokenizeJsonLoose(value: string) {
  const tokens: JsonLooseToken[] = [];
  for (let index = 0; index < value.length;) {
    const character = value[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "\"") {
      const start = index;
      index += 1;
      let escaped = false;
      while (index < value.length) {
        const current = value[index];
        index += 1;
        if (escaped) {
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === "\"") {
          break;
        }
      }
      tokens.push({ end: index, start, type: "string", value: value.slice(start, index) });
      continue;
    }

    if ("{}[]:,".includes(character)) {
      tokens.push({ end: index + 1, start: index, type: "punct", value: character });
      index += 1;
      continue;
    }

    const literal = ["true", "false", "null"].find((candidate) => value.startsWith(candidate, index));
    if (literal) {
      tokens.push({ end: index + literal.length, start: index, type: "literal", value: literal });
      index += literal.length;
      continue;
    }

    if (character === "-" || /\d/.test(character)) {
      const start = index;
      index += 1;
      while (index < value.length && /[0-9eE+.-]/.test(value[index])) {
        index += 1;
      }
      tokens.push({ end: index, start, type: "number", value: value.slice(start, index) });
      continue;
    }

    index += 1;
  }

  return tokens;
}

function isJsonObjectKeyContext(tokens: JsonLooseToken[], index: number, token: JsonLooseToken | undefined) {
  if (token !== undefined && token.value !== "{" && token.value !== ",") {
    return false;
  }
  return getJsonContainerAtToken(tokens, index) === "object";
}

function getJsonContainerAtToken(tokens: JsonLooseToken[], endIndex: number) {
  const stack: Array<"array" | "object"> = [];
  for (let index = 0; index < endIndex; index += 1) {
    const value = tokens[index].value;
    if (value === "{") {
      stack.push("object");
    } else if (value === "[") {
      stack.push("array");
    } else if (value === "}" || value === "]") {
      stack.pop();
    }
  }
  return stack.at(-1) ?? null;
}

function isJsonValueStartToken(token: JsonLooseToken) {
  return token.type === "literal" || token.type === "number" || token.type === "string" || token.value === "{" || token.value === "[";
}

function isJsonValueEndToken(token: JsonLooseToken) {
  return token.type === "literal" || token.type === "number" || token.type === "string" || token.value === "}" || token.value === "]";
}

function collectJsonRangeCandidates(windowText: string, pattern: RegExp, offset: number, candidates: JsonTextHighlight[]) {
  for (const match of windowText.matchAll(pattern)) {
    if (match.index === undefined || !match[0]) {
      continue;
    }
    candidates.push({
      end: offset + match.index + match[0].length,
      start: offset + match.index,
    });
  }
}

function fallbackJsonHighlightRange(lineText: string, pointer: number) {
  let start = Math.max(0, pointer - 24);
  for (let index = pointer; index >= 0; index -= 1) {
    if (lineText[index] === "," || lineText[index] === "{" || lineText[index] === "[") {
      start = Math.min(lineText.length, index + 1);
      break;
    }
  }

  let end = Math.min(lineText.length, Math.max(pointer + 1, start + 1));
  while (end < lineText.length && !/\s/.test(lineText[end]) && lineText[end] !== ",") {
    end += 1;
  }
  return { end: Math.min(lineText.length, end), start };
}

function normalizeHighlight(highlight: JsonTextHighlight, valueLength: number) {
  const start = clampNumber(highlight.start, 0, valueLength);
  const end = clampNumber(highlight.end, start, valueLength);
  return end > start ? { end, start } : null;
}

function lineColumnToIndex(value: string, line: number, column: number) {
  let currentLine = 1;
  let lineStart = 0;
  for (let index = 0; index < value.length && currentLine < line; index += 1) {
    if (value[index] === "\n") {
      currentLine += 1;
      lineStart = index + 1;
    }
  }

  let lineEnd = value.indexOf("\n", lineStart);
  if (lineEnd === -1) {
    lineEnd = value.length;
  }
  if (lineEnd > lineStart && value[lineEnd - 1] === "\r") {
    lineEnd -= 1;
  }
  return clampNumber(lineStart + Math.max(0, column - 1), lineStart, lineEnd);
}

function getLineBounds(value: string, index: number) {
  const safeIndex = clampNumber(index, 0, value.length);
  const start = value.lastIndexOf("\n", Math.max(0, safeIndex - 1)) + 1;
  let end = value.indexOf("\n", safeIndex);
  if (end === -1) {
    end = value.length;
  }
  if (end > start && value[end - 1] === "\r") {
    end -= 1;
  }
  return { end, start };
}

export function enhanceJsonError(message: string, input: string) {
  const location = findJsonErrorLocation(message, input);
  const invalidPunctuationHint = location
    ? describeInvalidJsonPunctuation(input[lineColumnToIndex(input, location.line, location.column)])
    : "";
  const displayMessage = invalidPunctuationHint
    ? `JSON 格式无效：${invalidPunctuationHint}`
    : `JSON 格式无效：${translateJsonErrorReason(message)}`;
  if (!location) {
    return displayMessage;
  }

  const context = getJsonErrorContext(input, location.line, location.column);
  const locationText = `（第 ${location.line} 行，第 ${location.column} 列）`;
  if (!context) {
    return `${displayMessage}${locationText}`;
  }

  return `${displayMessage}${locationText}。附近：${context}`;
}

export function translateJsonErrorReason(message: string) {
  if (/Unexpected end of JSON input/i.test(message)) {
    return "内容还没结束，可能缺少右花括号 `}`、右方括号 `]` 或字符串结尾引号。";
  }
  if (/Expected property name or ['"]?}['"]?/i.test(message) || /expected property name/i.test(message)) {
    return "对象属性名必须使用双引号，或这里应该是右花括号 `}`。";
  }
  if (/double-quoted property name/i.test(message)) {
    return "对象属性名必须使用双引号。";
  }
  if (/Expected ['"]?:['"]? after property name/i.test(message) || /expected ':'/i.test(message)) {
    return "属性名后缺少冒号 `:`。";
  }
  if (/Expected ['"]?,['"]? or ['"]?}['"]? after property value/i.test(message)) {
    return "属性值后缺少逗号 `,` 或右花括号 `}`。";
  }
  if (/Expected ['"]?,['"]? or ['"]?\]['"]? after array element/i.test(message)) {
    return "数组元素后缺少逗号 `,` 或右方括号 `]`。";
  }
  if (/unterminated string/i.test(message)) {
    return "字符串没有闭合，请检查缺失的双引号。";
  }
  if (/bad control character|control character/i.test(message)) {
    return "字符串中包含未转义的换行或控制字符。";
  }
  if (/bad escaped character|invalid escape/i.test(message)) {
    return "字符串里的转义写法无效。";
  }
  if (/no number after minus sign/i.test(message)) {
    return "负号后面缺少数字。";
  }
  if (/unexpected non-whitespace character/i.test(message)) {
    return "一个完整 JSON 值后面还有多余内容。";
  }
  if (/Unexpected number/i.test(message)) {
    return "这里出现了意外的数字，可能缺少逗号或冒号。";
  }
  if (/Unexpected string/i.test(message)) {
    return "这里出现了意外的字符串，可能缺少逗号或冒号。";
  }

  const unexpectedToken = message.match(/Unexpected token\s+['"]?([^'",\s]+)['"]?/i);
  if (unexpectedToken) {
    return `这里出现了意外的字符 \`${unexpectedToken[1]}\`。`;
  }

  if (/not valid JSON|JSON/i.test(message)) {
    return "这里不符合 JSON 语法。";
  }

  return "这里不符合 JSON 语法。";
}

function findJsonErrorLocation(message: string, input: string) {
  const zhLineColumnMatch = message.match(/第\s*(\d+)\s*行，第\s*(\d+)\s*列/);
  if (zhLineColumnMatch) {
    const line = Number(zhLineColumnMatch[1]);
    const column = Number(zhLineColumnMatch[2]);
    if (Number.isFinite(line) && Number.isFinite(column)) {
      return { column, line };
    }
  }

  const lineColumnMatch = message.match(/(?:line|at line)\s+(\d+)[^\d]+(?:column|col)\s+(\d+)/i) ?? message.match(/(\d+):(\d+)/);
  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1]);
    const column = Number(lineColumnMatch[2]);
    if (Number.isFinite(line) && Number.isFinite(column)) {
      return { column, line };
    }
  }

  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch) {
    const diagnosticIndex = findJsonDiagnosticIndex(input);
    return diagnosticIndex === -1 ? null : positionToLineColumn(input, diagnosticIndex);
  }

  const position = Number(positionMatch[1]);
  return Number.isFinite(position) ? positionToLineColumn(input, position) : null;
}

function findJsonDiagnosticIndex(value: string) {
  const simpleDiagnosticIndex = findJsonSimpleDiagnosticIndex(value);
  const structuralHighlight = getMissingSeparatorHighlightRange(value);
  if (simpleDiagnosticIndex === -1) {
    return structuralHighlight?.start ?? -1;
  }
  if (!structuralHighlight) {
    return simpleDiagnosticIndex;
  }
  return Math.min(simpleDiagnosticIndex, structuralHighlight.start);
}

function findJsonSimpleDiagnosticIndex(value: string) {
  const invalidPunctuationIndex = findInvalidJsonPunctuationIndex(value);
  if (invalidPunctuationIndex !== -1) {
    return invalidPunctuationIndex;
  }

  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (jsonAnnotationTokens.some((token) => value.startsWith(token, index))) {
      return index;
    }

    if (character === "{" || character === "[") {
      stack.push(character);
      continue;
    }

    if (character === "}" || character === "]") {
      const expectedOpen = character === "}" ? "{" : "[";
      if (stack.at(-1) !== expectedOpen) {
        return index;
      }
      stack.pop();
      continue;
    }

    if (character === ",") {
      const next = findNextNonWhitespaceIndex(value, index + 1);
      if (next !== -1 && (value[next] === "," || value[next] === "}" || value[next] === "]")) {
        return index;
      }
    }
  }

  return -1;
}

function getJsonErrorContext(input: string, line: number, column: number) {
  const lineText = input.replace(/\r\n/g, "\n").split("\n")[line - 1];
  if (lineText === undefined) {
    return "";
  }

  const pointerIndex = Math.max(0, column - 1);
  const start = Math.max(0, pointerIndex - 36);
  const end = Math.min(lineText.length, pointerIndex + 36);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < lineText.length ? "..." : "";
  const snippet = `${prefix}${lineText.slice(start, end)}${suffix}`.trim();
  return snippet ? `\`${snippet}\`` : "空行";
}

function positionToLineColumn(value: string, position: number) {
  const before = value.slice(0, Math.max(0, position));
  const lines = before.split(/\r?\n/);
  return {
    column: (lines.at(-1)?.length ?? 0) + 1,
    line: lines.length,
  };
}
