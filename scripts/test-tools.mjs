import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const { convertDelimitedTextToJson, splitDelimitedLine } = await import("../src/components/tools/tool-csv.ts");
const { decodeJwtInput, formatHashResult } = await import("../src/components/tools/tool-crypto.ts");
const { describeInvalidJsonPunctuation, findInvalidJsonPunctuationIndex, findInvalidJsonPunctuationRange } = await import("../src/components/tools/tool-json-diagnostics.ts");
const { renderMarkdownPreview, sanitizeMarkdownPreviewHtml } = await import("../src/components/tools/tool-markdown.ts");
const { parseTomlDocument, parseYamlDocument } = await import("../src/components/tools/tool-structured.ts");
const { defaultXmlToJsonOptions, xmlDocumentToJson } = await import("../src/components/tools/tool-xml.ts");
const { computeDiff, createUnifiedPatch } = await import("../src/components/tools/tool-diff.ts");
const { jsonToTypeScript } = await import("../src/components/tools/tool-json-to-ts.ts");
const { computeTokenTextStats, estimateTokenCount, getTokenModel, tokenModels } = await import("../src/components/tools/tool-token-counter.ts");
const { analyzeSearchAudit, formatSearchAuditMarkdown, searchAuditContentTypeOptions } = await import("../src/components/tools/tool-seo-audit.ts");
const { isToolTab } = await import("../src/components/tools/tool-types.ts");

const defaultOptions = { emptyAsNull: false, inferTypes: true, outputMode: "objects" };

function xmlText(value, nodeType = 3) {
  return { attributes: [], childNodes: [], nodeName: nodeType === 4 ? "#cdata-section" : "#text", nodeType, textContent: value };
}

function xmlElement(nodeName, attributes = {}, childNodes = []) {
  return {
    attributes: Object.entries(attributes).map(([name, value]) => ({ name, value })),
    childNodes,
    nodeName,
    nodeType: 1,
    textContent: null,
  };
}

function loadWorker(scriptPath) {
  const messages = [];
  const self = {
    onmessage: null,
    postMessage(message) {
      messages.push(message);
    },
  };
  const context = {
    TextDecoder,
    TextEncoder,
    Uint8Array,
    atob,
    btoa,
    self,
  };
  vm.runInNewContext(fs.readFileSync(scriptPath, "utf8"), context, { filename: scriptPath });
  return (payload) => {
    messages.length = 0;
    self.onmessage({ data: { id: 1, ...payload } });
    return messages.at(-1);
  };
}

function base64UrlEncodeJson(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

assert.deepEqual(
  JSON.parse(convertDelimitedTextToJson("title,count,enabled\nTools,2,true", "comma", defaultOptions)),
  [{ title: "Tools", count: 2, enabled: true }],
);

assert.deepEqual(
  JSON.parse(convertDelimitedTextToJson("title,body\nOne,\"line 1\nline 2\"", "comma", defaultOptions)),
  [{ title: "One", body: "line 1\nline 2" }],
);

assert.deepEqual(splitDelimitedLine("\"a,b\",\"quoted \"\"value\"\"\"", ","), ["a,b", 'quoted "value"']);

assert.deepEqual(
  JSON.parse(convertDelimitedTextToJson("title\tcount\nTools\t3", "auto", defaultOptions)),
  [{ title: "Tools", count: 3 }],
);

assert.deepEqual(
  JSON.parse(convertDelimitedTextToJson("title,count\nTools,", "comma", { emptyAsNull: true, inferTypes: true, outputMode: "rows" })),
  { headers: ["title", "count"], rows: [["Tools", null]] },
);

assert.throws(
  () => convertDelimitedTextToJson("title,body\nOne,\"unfinished", "comma", defaultOptions),
  /unclosed quoted field/i,
);

assert.deepEqual(parseYamlDocument("---\ntitle: Tools\npublished: true\ntags:\n  - json\n  - yaml\nmeta:\n  version: 1\n  localOnly: true\n..."), {
  title: "Tools",
  published: true,
  tags: ["json", "yaml"],
  meta: { version: 1, localOnly: true },
});

assert.deepEqual(parseYamlDocument("items:\n  - name: alpha\n    meta:\n      count: 2\n      enabled: true\n  - name: beta\n    tags:\n      - data\n      - config"), {
  items: [
    { name: "alpha", meta: { count: 2, enabled: true } },
    { name: "beta", tags: ["data", "config"] },
  ],
});

assert.deepEqual(parseYamlDocument("title: Tools # inline comment\nvalues: [1, 2, \"a,b\"]"), {
  title: "Tools",
  values: [1, 2, "a,b"],
});

assert.deepEqual(parseTomlDocument("title = \"Tools\"\npublished = true\n\n[meta]\nversion = 1\ntags = [\"json\", \"toml\"]"), {
  title: "Tools",
  published: true,
  meta: { version: 1, tags: ["json", "toml"] },
});

const xmlArticle = {
  documentElement: xmlElement("article", { id: "tools-1", published: "true" }, [
    xmlElement("title", {}, [xmlText(" XML 工具 ")]),
    xmlElement("tag", {}, [xmlText("json")]),
    xmlElement("tag", {}, [xmlText("xml")]),
    xmlElement("summary", {}, [xmlText("支持 "), xmlElement("strong", {}, [xmlText("属性")]), xmlText(" 和文本")]),
    xmlElement("empty"),
  ]),
};
assert.deepEqual(xmlDocumentToJson(xmlArticle, defaultXmlToJsonOptions), {
  article: {
    "@id": "tools-1",
    "@published": "true",
    title: "XML 工具",
    tag: ["json", "xml"],
    summary: { strong: "属性", "#text": "支持和文本" },
    empty: null,
  },
});

assert.deepEqual(xmlDocumentToJson(xmlArticle, { ...defaultXmlToJsonOptions, forceArrays: true, includeAttributes: false }), {
  article: {
    title: ["XML 工具"],
    tag: ["json", "xml"],
    summary: [{ strong: ["属性"], "#text": "支持和文本" }],
    empty: [null],
  },
});

assert.deepEqual(xmlDocumentToJson({ documentElement: xmlElement("media:item", { "xml:lang": "zh" }, [xmlText("内容", 4)]) }, { ...defaultXmlToJsonOptions, stripNamespaces: true }), {
  item: { "@lang": "zh", "#text": "内容" },
});

const runJsonWorker = loadWorker("public/tools-json-worker.js");
const formattedJson = runJsonWorker({ action: "format", input: "{\"b\":2,\"a\":1}", spaces: 2 });
assert.equal(formattedJson.ok, true);
assert.equal(formattedJson.output, "{\n  \"b\": 2,\n  \"a\": 1\n}");

const sortedJson = runJsonWorker({ action: "sort", input: "{\"b\":2,\"a\":{\"d\":4,\"c\":3}}", spaces: 2 });
assert.equal(sortedJson.ok, true);
assert.deepEqual(JSON.parse(sortedJson.output), { a: { c: 3, d: 4 }, b: 2 });

const flattenedJson = runJsonWorker({ action: "flatten", input: "{\"items\":[{\"name\":\"a\"},{\"name\":\"b\"}]}", spaces: 2 });
assert.equal(flattenedJson.ok, true);
assert.deepEqual(JSON.parse(flattenedJson.output), { "items.0.name": "a", "items.1.name": "b" });

const unflattenedJson = runJsonWorker({ action: "unflatten", input: "{\"items.0.name\":\"a\",\"items.1.name\":\"b\"}", spaces: 2 });
assert.equal(unflattenedJson.ok, true);
assert.deepEqual(JSON.parse(unflattenedJson.output), { items: [{ name: "a" }, { name: "b" }] });

const invalidJson = runJsonWorker({ action: "format", input: "{\"a\":", spaces: 2 });
assert.equal(invalidJson.ok, false);

const fullWidthJson = "{\"site\":\"zhizhi\",\"tools\":[\"json\",\"encoding\",\"time\",\"text\"],\"meta\":{\"localOnly\":true,\"version\"，:1}}";
const fullWidthCommaIndex = fullWidthJson.indexOf("，");
assert.equal(findInvalidJsonPunctuationIndex(fullWidthJson), fullWidthCommaIndex);
assert.deepEqual(findInvalidJsonPunctuationRange(fullWidthJson, fullWidthCommaIndex), {
  end: fullWidthJson.indexOf("}}", fullWidthCommaIndex),
  start: fullWidthJson.indexOf("\"version\""),
});
assert.match(describeInvalidJsonPunctuation("，"), /全角标点/);

const runUtilityWorker = loadWorker("public/tools-utility-worker.js");
const base64Result = runUtilityWorker({ action: "base64Encode", input: "知之" });
assert.equal(base64Result.ok, true);
assert.equal(runUtilityWorker({ action: "base64Decode", input: base64Result.output }).output, "知之");

const regexResult = runUtilityWorker({ action: "regexTest", input: "alpha 123\nbeta 456", pattern: "(?<word>[a-z]+)\\s+(\\d+)", flags: "i" });
assert.equal(regexResult.ok, true);
assert.equal(regexResult.structured.matches.length, 2);
assert.equal(JSON.stringify(regexResult.structured.matches[1].groups), "{\"word\":\"beta\"}");
assert.equal(regexResult.structured.matches[1].line, 2);

const regexReplace = runUtilityWorker({ action: "regexReplace", input: "a1 a2", pattern: "a", flags: "g", replacement: "b" });
assert.equal(regexReplace.ok, true);
assert.equal(regexReplace.output, "b1 b2");

const textDedupe = runUtilityWorker({ action: "textDedupe", input: "b\na\nb" });
assert.equal(textDedupe.ok, true);
assert.equal(textDedupe.output, "b\na");

const markdownHtml = sanitizeMarkdownPreviewHtml(renderMarkdownPreview("# Title\n\n<script>alert(1)</script>\n\n- [x] done\n\n| A | B |\n| --- | ---: |\n| **x** | `1` |\n\n```js\nconst a = \"<safe>\";\n```"));
assert.match(markdownHtml, /<h1>Title<\/h1>/);
assert.match(markdownHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.match(markdownHtml, /tools-markdown-task/);
assert.match(markdownHtml, /<table>/);
assert.match(markdownHtml, /text-align:right/);
assert.match(markdownHtml, /tools-markdown-code-lang/);
assert.match(markdownHtml, /&lt;safe&gt;/);

const jwt = [
  base64UrlEncodeJson({ alg: "none", typ: "JWT" }),
  base64UrlEncodeJson({ sub: "user-1", name: "知之", exp: Math.floor(Date.now() / 1000) + 3600 }),
  "signature",
].join(".");
const decodedJwt = decodeJwtInput(`Bearer ${jwt}`);
assert.equal(decodedJwt.normalizedToken, jwt);
assert.match(decodedJwt.raw, /签名字段：存在/);
assert.match(decodedJwt.structured.payloadJson, /"name": "知之"/);
assert.match(decodedJwt.structured.expirationBody, /状态：未过期/);
assert.throws(() => decodeJwtInput("not-a-token"), /有效 JWT|JSON/);

const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("abc"));
assert.equal(formatHashResult(hashBytes, "SHA-256", "hex", 3).structured.digest, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
assert.equal(formatHashResult(hashBytes, "SHA-256", "base64", 3).structured.digest, "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=");
assert.equal(formatHashResult(hashBytes, "SHA-256", "base64url", 3).structured.digest, "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");

const diffOptions = { ignoreWhitespace: false, ignoreCase: false };
const identicalDiff = computeDiff("a\nb\n", "a\nb\n", diffOptions);
assert.equal(identicalDiff.identical, true);
assert.equal(identicalDiff.addedLines, 0);
assert.equal(identicalDiff.removedLines, 0);

const modifiedDiff = computeDiff("hello world\nkeep\n", "hello there\nkeep\n", diffOptions);
assert.equal(modifiedDiff.modifiedLines, 1);
const modifiedRow = modifiedDiff.rows.find((row) => row.type === "modified");
assert.ok(modifiedRow, "expected a modified row");
assert.ok(modifiedRow.leftSegments.some((segment) => segment.kind === "removed" && segment.value.includes("world")));
assert.ok(modifiedRow.rightSegments.some((segment) => segment.kind === "added" && segment.value.includes("there")));

const addRemoveDiff = computeDiff("only-left\n", "only-right\nextra\n", diffOptions);
assert.ok(addRemoveDiff.addedLines + addRemoveDiff.modifiedLines >= 1);

const caseDiff = computeDiff("Hello\n", "hello\n", { ignoreWhitespace: false, ignoreCase: true });
assert.equal(caseDiff.identical, true);

// A1: 完全不相关的行不应被配成 modified（应拆成独立删除/新增）。
const unrelatedDiff = computeDiff("apple\n", "banana\ncherry\n", diffOptions);
assert.equal(unrelatedDiff.modifiedLines, 0);
assert.equal(unrelatedDiff.removedLines, 1);
assert.equal(unrelatedDiff.addedLines, 2);

// A2: 插入夹杂修改时，真正被编辑的行配成 modified，纯插入行单独成 added。
const blockDiff = computeDiff("function foo(a) {\n  return a;\n}\n", "function foo(a, b) {\n  // new\n  return a + b;\n}\n", diffOptions);
assert.equal(blockDiff.modifiedLines, 2);
assert.equal(blockDiff.addedLines, 1);
const insertedRow = blockDiff.rows.find((row) => row.type === "added");
assert.ok(insertedRow && insertedRow.rightSegments.map((segment) => segment.value).join("").includes("// new"));

// A3: 单侧超大输入返回友好错误且不计算。
const hugeDiff = computeDiff("x".repeat(200001), "y", diffOptions);
assert.ok(hugeDiff.error);
assert.equal(hugeDiff.rows.length, 0);

// C1: 字符级粒度对密集小改更细，能切到单字符差异。
const charDiff = computeDiff("color: red;\n", "color: blue;\n", { ignoreWhitespace: false, ignoreCase: false, granularity: "char" });
const charRow = charDiff.rows.find((row) => row.type === "modified");
assert.ok(charRow, "expected a modified row at char granularity");
assert.ok(charRow.leftSegments.some((segment) => segment.kind === "equal" && segment.value.includes("color: ")));

// C3: 生成标准 unified 补丁，含 @@ hunk 头与 +/- 行。
const patch = createUnifiedPatch("foo\nbar\n", "foo\nbaz\n");
assert.match(patch, /^@@ .* @@$/m);
assert.match(patch, /\n-bar/);
assert.match(patch, /\n\+baz/);

const tsResult = jsonToTypeScript('{"id":1,"name":"知之","owner":{"email":"a@b.c"},"tags":["x"]}', { rootName: "Root", declaration: "interface" });
assert.equal(tsResult.error, null);
assert.match(tsResult.code, /export interface Root \{/);
assert.match(tsResult.code, /id: number;/);
assert.match(tsResult.code, /name: string;/);
assert.match(tsResult.code, /owner: Owner;/);
assert.match(tsResult.code, /tags: string\[\];/);
assert.match(tsResult.code, /export interface Owner \{/);

const tsType = jsonToTypeScript('{"a":true}', { rootName: "Config", declaration: "type" });
assert.match(tsType.code, /export type Config = \{/);
assert.match(tsType.code, /a: boolean;/);

const tsArrayRoot = jsonToTypeScript('[1, 2, 3]', { rootName: "Nums", declaration: "interface" });
assert.match(tsArrayRoot.code, /export type Nums = number\[\];/);

const tsInvalid = jsonToTypeScript("{ not json }", { rootName: "Root", declaration: "interface" });
assert.ok(tsInvalid.error, "expected invalid JSON to report an error");
assert.equal(tsInvalid.parseError, true);

// P0: 顶层对象数组不能产生重名 Root（旧版会同时声明 type Root 和 interface Root）。
const tsRootArray = jsonToTypeScript('[{"a":1}]', { rootName: "Root", declaration: "interface" });
assert.match(tsRootArray.code, /export type Root = RootItem\[\];/);
assert.match(tsRootArray.code, /export interface RootItem \{/);
assert.doesNotMatch(tsRootArray.code, /export interface Root \{/);

// P0: 对象数组字段不一致 → 合并成单接口，缺失字段标可选。
const tsMerge = jsonToTypeScript('{"items":[{"a":1},{"a":1,"b":2}]}', { rootName: "Root", declaration: "interface" });
assert.match(tsMerge.code, /items: Item\[\];/);
assert.match(tsMerge.code, /a: number;/);
assert.match(tsMerge.code, /b\?: number;/);
assert.doesNotMatch(tsMerge.code, /Item2/);

// P0: 数组内 null 与有值合并成 T | null。
const tsNullUnion = jsonToTypeScript('{"items":[{"x":1},{"x":null}]}', { rootName: "Root", declaration: "interface" });
assert.match(tsNullUnion.code, /x: number \| null;/);

// P1: 同名嵌套对象冲突时用父级名限定，而非 Meta2。
const tsQualified = jsonToTypeScript('{"user":{"meta":{"a":1}},"company":{"meta":{"b":true}}}', { rootName: "Root", declaration: "interface" });
assert.match(tsQualified.code, /export interface Meta \{/);
assert.match(tsQualified.code, /export interface CompanyMeta \{/);
assert.doesNotMatch(tsQualified.code, /Meta2/);

// P2: 大小与深度上限返回友好错误（非 parseError）。
const tsTooBig = jsonToTypeScript(`"${"x".repeat(500001)}"`, { rootName: "Root", declaration: "interface" });
assert.match(tsTooBig.error, /JSON 过大/);
assert.equal(tsTooBig.parseError, false);

let deepJson = "1";
for (let i = 0; i < 300; i += 1) {
  deepJson = `[${deepJson}]`;
}
const tsTooDeep = jsonToTypeScript(deepJson, { rootName: "Root", declaration: "interface" });
assert.match(tsTooDeep.error, /嵌套层级过深/);
assert.equal(tsTooDeep.parseError, false);

// P3: lone null 字段按 nullType 渲染。
assert.match(jsonToTypeScript('{"a":null}', { rootName: "Root", declaration: "interface" }).code, /a: null;/);
assert.match(jsonToTypeScript('{"a":null}', { rootName: "Root", declaration: "interface", nullType: "unknown" }).code, /a: unknown;/);

// P3: readonly / 缩进 / export 开关。
const tsOpts = jsonToTypeScript('{"id":1}', { rootName: "Root", declaration: "interface", readonly: true, indent: "4", exportTypes: false });
assert.match(tsOpts.code, /^interface Root \{/);
assert.match(tsOpts.code, /\n {4}readonly id: number;/);
assert.doesNotMatch(tsOpts.code, /export /);

// P3: inferDates 把 ISO 日期串识别为 Date，非日期串仍为 string。
const tsDates = jsonToTypeScript('{"createdAt":"2024-01-02T03:04:05Z","note":"hello"}', { rootName: "Root", declaration: "interface", inferDates: true });
assert.match(tsDates.code, /createdAt: Date;/);
assert.match(tsDates.code, /note: string;/);
// 默认不识别日期。
assert.match(jsonToTypeScript('{"createdAt":"2024-01-02"}', { rootName: "Root", declaration: "interface" }).code, /createdAt: string;/);

// Token 计数器：文本统计（中英混排、码点、字/词、行）。
const tokenStats = computeTokenTextStats("Hello 世界🌍\nstate-of-the-art");
assert.equal(tokenStats.characters, Array.from("Hello 世界🌍\nstate-of-the-art").length);
assert.equal(tokenStats.lines, 2);
assert.equal(tokenStats.words, 4); // Hello + 世 + 界 + state-of-the-art
assert.equal(tokenStats.charactersNoSpaces, tokenStats.characters - 2); // 一个空格 + 一个换行
const emptyStats = computeTokenTextStats("");
assert.equal(emptyStats.characters, 0);
assert.equal(emptyStats.lines, 0);
assert.equal(emptyStats.words, 0);

// Token 计数器：估算（空串为 0，非空至少 1，按字符/系数四舍五入）。
assert.equal(estimateTokenCount("", 4), 0);
assert.equal(estimateTokenCount("a", 4), 1);
assert.equal(estimateTokenCount("12345678", 4), 2); // 8 / 4
assert.equal(estimateTokenCount("1234567", 3.5), 2); // 7 / 3.5

// Token 计数器：模型表（精确模型带 encoding、估算模型带系数；未知 id 回退首项）。
assert.equal(getTokenModel("o200k").encoding, "o200k_base");
assert.equal(getTokenModel("cl100k").encoding, "cl100k_base");
assert.equal(getTokenModel("claude").kind, "estimate");
assert.ok(getTokenModel("claude").charsPerToken > 0);
assert.equal(getTokenModel("nope").id, tokenModels[0].id);
for (const model of tokenModels) {
  if (model.kind === "exact") {
    assert.ok(model.encoding, `exact 模型应有 encoding: ${model.id}`);
  } else {
    assert.ok(model.charsPerToken > 0, `estimate 模型应有 charsPerToken: ${model.id}`);
  }
}

const searchAuditInput = `---
title: "从 0 开始学习 SEO、GEO、AEO"
description: "这是一份给内容创作者的 AI 搜索学习路径，帮助理解传统搜索、答案引擎和生成式搜索的差异。"
---

# 从 0 开始学习 SEO、GEO、AEO

SEO、GEO、AEO 是 2026 年内容创作者需要一起理解的三件事：SEO 解决搜索引擎能不能发现你，AEO 解决答案引擎能不能摘取你，GEO 解决生成式搜索能不能把你当作可信来源引用。

## SEO、GEO、AEO 是什么？

SEO 是搜索引擎优化，AEO 是答案引擎优化，GEO 是生成式搜索优化。

## 新手应该怎么开始？

1. 写清楚标题和摘要。
2. 在开头回答一个具体问题。
3. 给判断补上来源、年份、案例或数据。

我在整理 AI 词条时发现，有明确问题、直接答案、更新时间、案例和延伸阅读的页面更容易被引用。

参考：https://developers.google.com/search/docs/fundamentals/ai-optimization-guide`;
const searchAudit = analyzeSearchAudit(searchAuditInput, {
  brandName: "知之",
  pageUrl: "https://zhizhi.xyz/tools/ai-search-audit",
  targetKeyword: "SEO、GEO、AEO",
  targetQuestion: "SEO、GEO、AEO 是什么？",
});
assert.ok(searchAudit.score.overall >= 70);
assert.match(searchAudit.aiSummary, /SEO/);
assert.match(searchAudit.jsonLd, /"@type": "Article"/);
assert.match(searchAudit.jsonLd, /FAQPage/);
assert.match(searchAudit.llmsText, /zhizhi\.xyz/);
assert.match(formatSearchAuditMarkdown(searchAudit), /AI 搜索体检结果/);
assert.ok(searchAudit.checklist.length >= 6);
assert.ok(searchAudit.rewrites.some((item) => item.id === "direct-answer"));
assert.match(searchAudit.verdict, /发布|优先|基础/);
assert.ok(searchAuditContentTypeOptions.some((item) => item.value === "tutorial" && item.label.includes("教程")));

const tutorialAudit = analyzeSearchAudit("# 新手怎么做 AI 搜索优化？\n\nAI 搜索优化需要先回答用户问题，再补充事实来源和案例。", {
  contentType: "tutorial",
  targetQuestion: "新手怎么做 AI 搜索优化？",
});
assert.ok(tutorialAudit.issues.some((issue) => issue.id === "type-tutorial-steps"));
assert.ok(tutorialAudit.issues.some((issue) => issue.rewrite));

const separatorAudit = analyzeSearchAudit("# SEO、GEO、AEO 是什么？\n\n- 先回答问题\n- 再补充证据\n\n2026 年，我实测过这个流程。参考：https://example.com", {
  targetKeyword: "SEO GEO AEO",
});
assert.equal(separatorAudit.issues.some((issue) => issue.id === "seo-keyword"), false);
assert.equal(separatorAudit.issues.some((issue) => issue.id === "aeo-list"), false);
assert.equal(isToolTab("seoAudit"), true);
assert.equal(isToolTab("diff"), true);
assert.equal(isToolTab("jsonToTs"), true);
assert.equal(isToolTab("tokenCount"), true);

console.log("Tools smoke tests passed.");
