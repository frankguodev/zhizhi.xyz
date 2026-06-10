export type XmlToJsonOptions = {
  forceArrays: boolean;
  includeAttributes: boolean;
  stripNamespaces: boolean;
  trimText: boolean;
};

type XmlAttributeLike = {
  name?: string;
  nodeName?: string;
  value: string;
};

type XmlNodeLike = {
  attributes?: ArrayLike<XmlAttributeLike>;
  childNodes?: ArrayLike<XmlNodeLike>;
  documentElement?: XmlNodeLike | null;
  getElementsByTagName?: (name: string) => ArrayLike<XmlNodeLike>;
  nodeName: string;
  nodeType: number;
  textContent?: string | null;
};

const elementNode = 1;
const textNode = 3;
const cdataNode = 4;

export const defaultXmlToJsonOptions: XmlToJsonOptions = {
  forceArrays: false,
  includeAttributes: true,
  stripNamespaces: false,
  trimText: true,
};

export function parseXmlToJson(input: string, options: Partial<XmlToJsonOptions> = {}) {
  if (!input.trim()) {
    throw new Error("请输入 XML 内容。");
  }
  if (typeof DOMParser === "undefined") {
    throw new Error("当前浏览器环境不支持 XML 解析。");
  }

  const document = new DOMParser().parseFromString(input, "application/xml");
  const parserError = document.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error(formatXmlParserError(parserError.textContent ?? "XML 格式无效。"));
  }
  if (!document.documentElement) {
    throw new Error("XML 缺少根节点。");
  }

  return xmlDocumentToJson(document, options);
}

export function xmlDocumentToJson(document: XmlNodeLike, options: Partial<XmlToJsonOptions> = {}) {
  const root = document.documentElement;
  if (!root) {
    throw new Error("XML 缺少根节点。");
  }

  const normalizedOptions = { ...defaultXmlToJsonOptions, ...options };
  return {
    [normalizeXmlName(root.nodeName, normalizedOptions.stripNamespaces)]: xmlElementToJson(root, normalizedOptions),
  };
}

export function xmlElementToJson(element: XmlNodeLike, options: XmlToJsonOptions): unknown {
  const attributes = collectXmlAttributes(element, options);
  const textParts: string[] = [];
  const childGroups = new Map<string, unknown[]>();

  for (const child of arrayFromLike(element.childNodes)) {
    if (child.nodeType === elementNode) {
      const name = normalizeXmlName(child.nodeName, options.stripNamespaces);
      const values = childGroups.get(name) ?? [];
      values.push(xmlElementToJson(child, options));
      childGroups.set(name, values);
      continue;
    }

    if (child.nodeType === textNode || child.nodeType === cdataNode) {
      const text = normalizeXmlText(child.textContent ?? "", options.trimText);
      if (text) {
        textParts.push(text);
      }
    }
  }

  if (attributes.length === 0 && childGroups.size === 0) {
    return textParts.length > 0 ? textParts.join("") : null;
  }

  const output: Record<string, unknown> = {};
  attributes.forEach(([key, value]) => {
    output[`@${key}`] = value;
  });

  childGroups.forEach((values, key) => {
    output[key] = options.forceArrays || values.length > 1 ? values : values[0];
  });

  if (textParts.length > 0) {
    output["#text"] = textParts.join("");
  }

  return output;
}

function collectXmlAttributes(element: XmlNodeLike, options: XmlToJsonOptions) {
  if (!options.includeAttributes) {
    return [] as Array<[string, string]>;
  }

  return arrayFromLike(element.attributes).map((attribute) => [
    normalizeXmlName(attribute.name ?? attribute.nodeName ?? "", options.stripNamespaces),
    attribute.value,
  ] as [string, string]);
}

function normalizeXmlName(name: string, stripNamespaces: boolean) {
  if (!stripNamespaces) {
    return name;
  }
  const separatorIndex = name.indexOf(":");
  return separatorIndex >= 0 ? name.slice(separatorIndex + 1) : name;
}

function normalizeXmlText(value: string, trim: boolean) {
  return trim ? value.trim() : value;
}

function formatXmlParserError(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  const detail = normalizeXmlParserDetail(normalized);
  const location = extractXmlParserLocation(detail);
  const hint = getXmlParserHint(detail);
  const locationText = location ? `（第 ${location.line} 行，第 ${location.column} 列）` : "";
  const hintText = hint ? `可能原因：${hint}` : "请检查标签闭合、特殊字符转义，以及是否只有一个根节点。";
  return detail ? `XML 格式无效${locationText}：${hintText} 解析器信息：${detail}` : `XML 格式无效：${hintText}`;
}

function arrayFromLike<T>(value: ArrayLike<T> | undefined) {
  return value ? Array.from(value) : [];
}

function normalizeXmlParserDetail(message: string) {
  return message
    .replace(/^This page contains the following errors?:/i, "")
    .replace(/Below is a rendering of the page up to the first error\..*$/i, "")
    .replace(/^error on /i, "")
    .trim();
}

function extractXmlParserLocation(message: string) {
  const englishLocation = message.match(/line\s*(\d+)\s*(?:at\s*)?column\s*(\d+)/i);
  if (englishLocation) {
    return { line: englishLocation[1], column: englishLocation[2] };
  }

  const zhLocation = message.match(/第\s*(\d+)\s*行.*?第\s*(\d+)\s*列/);
  if (zhLocation) {
    return { line: zhLocation[1], column: zhLocation[2] };
  }

  return null;
}

function getXmlParserHint(message: string) {
  if (/opening and ending tag mismatch|mismatch|end tag|closing tag|expected/i.test(message)) {
    return "有标签没有正确闭合，或开始标签和结束标签名称不一致。";
  }
  if (/extra content|junk after document element|multiple root/i.test(message)) {
    return "XML 只能有一个根节点，请把多个顶层节点包进同一个根标签。";
  }
  if (/entity|EntityRef|undefined entity|not well-formed|invalid character|CharRef/i.test(message)) {
    return "文本里可能有未转义的特殊字符，例如 & 需要写成 &amp;。";
  }
  if (/namespace|prefix/i.test(message)) {
    return "命名空间前缀可能缺少声明。";
  }

  return "";
}
