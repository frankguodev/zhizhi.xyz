function base64Encode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64Decode(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeRegexFlags(flags) {
  const allowedFlags = ["g", "i", "m", "s", "u", "y"];
  return Array.from(new Set(String(flags || "").split("").filter((flag) => allowedFlags.includes(flag)))).join("");
}

function lineColumnAt(value, index) {
  const before = value.slice(0, Math.max(0, index));
  const lines = before.split(/\r?\n/);
  return {
    column: (lines.at(-1) || "").length + 1,
    line: lines.length,
  };
}

function formatRegexMatches(input, pattern, flags, locale) {
  if (!pattern) {
    throw new Error(locale === "en" ? "Enter a regular expression pattern." : "请输入正则表达式。");
  }

  const testFlags = normalizeRegexFlags(flags).includes("g") ? normalizeRegexFlags(flags) : `${normalizeRegexFlags(flags)}g`;
  const regex = new RegExp(pattern, testFlags);
  const matches = [];
  let total = 0;
  let match;
  while ((match = regex.exec(input)) !== null) {
    total += 1;
    if (matches.length < 1000) {
      const position = lineColumnAt(input, match.index);
      matches.push({
        captures: match.slice(1),
        column: position.column,
        groups: match.groups ? Object.fromEntries(Object.entries(match.groups)) : null,
        index: match.index,
        line: position.line,
        match: match[0],
        ordinal: matches.length + 1,
      });
    }
    if (match[0] === "") regex.lastIndex += 1;
  }

  const summary = [
    { label: locale === "en" ? "Pattern" : "表达式", value: pattern },
    { label: locale === "en" ? "Flags" : "标志", value: testFlags || "(none)" },
    { label: locale === "en" ? "Total matches" : "匹配总数", value: String(total) },
    { label: locale === "en" ? "Shown" : "已显示", value: `${matches.length}${total > matches.length ? " / 1000" : ""}` },
  ];
  const lines = [locale === "en" ? "[Regex matches]" : "[正则匹配]", ...summary.map((item) => `${item.label}: ${item.value}`), ""];

  if (matches.length === 0) {
    lines.push(locale === "en" ? "No matches." : "没有匹配结果。");
    return { output: lines.join("\n"), structured: { matches: [], summary } };
  }

  matches.forEach((item) => {
    lines.push(`#${item.ordinal} index=${item.index} line=${item.line} column=${item.column}`);
    lines.push(item.match);
    if (item.captures.length > 0) {
      lines.push(`${locale === "en" ? "captures" : "捕获组"}: ${JSON.stringify(item.captures)}`);
    }
    if (item.groups) {
      lines.push(`${locale === "en" ? "named groups" : "命名组"}: ${JSON.stringify(item.groups)}`);
    }
    lines.push("");
  });

  return { output: lines.join("\n").trimEnd(), structured: { matches, summary } };
}

self.onmessage = (event) => {
  const { id, input, action, flags, locale, pattern, replacement } = event.data;
  try {
    let output = "";
    let structured;
    if (action === "base64Encode") output = base64Encode(input);
    if (action === "base64Decode") output = base64Decode(input);
    if (action === "textDedupe") output = Array.from(new Set(input.split(/\r?\n/))).join("\n");
    if (action === "textSort") output = input.split(/\r?\n/).sort((a, b) => a.localeCompare(b)).join("\n");
    if (action === "regexTest") {
      const result = formatRegexMatches(input, pattern, flags, locale);
      output = result.output;
      structured = result.structured;
    }
    if (action === "regexReplace") {
      if (!pattern) {
        throw new Error(locale === "en" ? "Enter a regular expression pattern." : "请输入正则表达式。");
      }
      output = input.replace(new RegExp(pattern, normalizeRegexFlags(flags)), replacement || "");
    }
    self.postMessage({ id, ok: true, output, structured });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error && error.message ? error.message : locale === "en" ? "Tool processing failed." : "工具处理失败。" });
  }
};
