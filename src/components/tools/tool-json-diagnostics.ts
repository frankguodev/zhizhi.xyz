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

export function describeInvalidJsonPunctuation(character: string, locale: "en" | "zh") {
  const replacement = invalidJsonPunctuationLabels[character];
  if (!replacement) {
    return "";
  }

  return locale === "en"
    ? `The character \`${character}\` is Chinese/full-width punctuation. JSON syntax requires \`${replacement}\` here.`
    : `这里的 \`${character}\` 是中文/全角标点，JSON 语法这里需要使用 \`${replacement}\`。`;
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
