import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const { convertDelimitedTextToJson, splitDelimitedLine } = await import("../src/components/tools/tool-csv.ts");
const { decodeJwtInput, formatHashResult } = await import("../src/components/tools/tool-crypto.ts");
const { describeInvalidJsonPunctuation, findInvalidJsonPunctuationIndex, findInvalidJsonPunctuationRange } = await import("../src/components/tools/tool-json-diagnostics.ts");
const { renderMarkdownPreview, sanitizeMarkdownPreviewHtml } = await import("../src/components/tools/tool-markdown.ts");
const { parseTomlDocument, parseYamlDocument } = await import("../src/components/tools/tool-structured.ts");

const defaultOptions = { emptyAsNull: false, inferTypes: true, outputMode: "objects" };

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

console.log("Tools smoke tests passed.");
