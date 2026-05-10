function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortJsonValue(item)]),
    );
  }
  return value;
}

function flattenJson(value, prefix = "", result = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenJson(item, prefix ? `${prefix}.${index}` : String(index), result));
    return result;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => flattenJson(item, prefix ? `${prefix}.${key}` : key, result));
    return result;
  }
  result[prefix] = value;
  return result;
}

function unflattenJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Input must be a flat JSON object.");
  }
  const entries = Object.entries(value);
  const firstKey = entries[0] ? entries[0][0].split(".").filter(Boolean)[0] : "";
  const result = isArrayIndex(firstKey) ? [] : {};
  entries.forEach(([compoundKey, item]) => {
    const parts = compoundKey.split(".").filter(Boolean);
    let cursor = result;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = item;
        return;
      }
      const nextPart = parts[index + 1];
      const expectedContainer = isArrayIndex(nextPart) ? [] : {};
      if (!cursor[part] || typeof cursor[part] !== "object") {
        cursor[part] = expectedContainer;
      } else if (Array.isArray(expectedContainer) && !Array.isArray(cursor[part])) {
        cursor[part] = [];
      } else if (!Array.isArray(expectedContainer) && Array.isArray(cursor[part])) {
        cursor[part] = {};
      }
      cursor = cursor[part];
    });
  });
  return result;
}

function isArrayIndex(value) {
  return /^(0|[1-9]\d*)$/.test(String(value));
}

self.onmessage = (event) => {
  const { id, input, action, spaces, locale } = event.data;
  try {
    if (action === "escape") {
      self.postMessage({ id, ok: true, output: JSON.stringify(input), message: locale === "en" ? "JSON string escaped." : "JSON 字符串已转义。" });
      return;
    }

    if (action === "unescape") {
      const parsedString = JSON.parse(input);
      const output = typeof parsedString === "string" ? parsedString : JSON.stringify(parsedString, null, spaces);
      self.postMessage({ id, ok: true, output, message: locale === "en" ? "JSON string unescaped." : "JSON 字符串已反转义。" });
      return;
    }

    const parsed = JSON.parse(input);
    if (action === "validate") {
      self.postMessage({ id, ok: true, output: locale === "en" ? "Valid JSON." : "JSON 格式有效。", message: locale === "en" ? "Valid JSON." : "JSON 格式有效。" });
      return;
    }

    let output = "";
    if (action === "format") output = JSON.stringify(parsed, null, spaces);
    if (action === "minify") output = JSON.stringify(parsed);
    if (action === "sort") output = JSON.stringify(sortJsonValue(parsed), null, spaces);
    if (action === "flatten") output = JSON.stringify(flattenJson(parsed), null, spaces);
    if (action === "unflatten") output = JSON.stringify(unflattenJson(parsed), null, spaces);
    self.postMessage({ id, ok: true, output, message: locale === "en" ? "JSON conversion completed." : "JSON 转换完成。" });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error && error.message ? error.message : locale === "en" ? "Invalid JSON." : "JSON 格式无效。" });
  }
};
