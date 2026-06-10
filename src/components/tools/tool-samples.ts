import type { ToolTab } from "./tool-types";

export const sampleJson = `{"site":"zhizhi","tools":["json","encoding","time","text"],"meta":{"localOnly":true,"version":1}}`;

export const sampleMarkdown = `# 知之工具

这是一段 **Markdown** 预览示例。

- [x] 本地渲染
- [ ] 支持标题、列表、引用、代码块、表格

> 预览会过滤原始 HTML，适合快速检查排版。

| 工具 | 用途 |
| --- | --- |
| JSON | 格式化和校验 |
| Markdown | 实时预览 |

\`\`\`ts
const site = "zhizhi";
\`\`\``;

export const sampleStructured = `title: 知之工具
published: true
tags:
  - markdown
  - json
meta:
  localOnly: true
  version: 1`;

export const sampleCsv = `title,category,reading_minutes
知之工具,tools,5
Markdown 预览,content,8`;

export const sampleXml = `<article id="tools-1" published="true">
  <title>知之工具</title>
  <tags>
    <tag>json</tag>
    <tag>xml</tag>
  </tags>
  <meta>
    <localOnly>true</localOnly>
    <version>1</version>
  </meta>
</article>`;

export function getSampleInput(tab: ToolTab) {
  return {
    color: "#d9b861",
    crop: "",
    csv: sampleCsv,
    data: sampleStructured,
    diff: "",
    encoding: "https://zhizhi.xyz/articles?tag=AI 应用",
    jsonToTs: "",
    hash: "知之工具",
    image: "",
    imageBase64: "",
    json: sampleJson,
    jwt: "",
    linkQr: "https://zhizhi.xyz",
    markdown: sampleMarkdown,
    qrDecode: "",
    regex: "知之工具\nzhizhi.xyz",
    text: "知识\n工具\n知识\n\n知之",
    time: "",
    uuid: "10",
    watermark: "",
    wechatQr: "",
    xml: sampleXml,
  }[tab];
}
