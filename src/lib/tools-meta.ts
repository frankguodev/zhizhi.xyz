import type { ToolTab } from "@/components/tools/tool-types";

// 工具子路由的 SEO 元数据：被 /tools/[tool] 页面、sitemap 和 workbench 的 URL 同步共用。
// slug 用对 SEO 友好的短名（与 tab id 不完全一致，如 data→yaml、linkQr→link-qr）。
export type ToolRouteMeta = {
  id: ToolTab;
  slug: string;
  title: string;
  description: string;
};

export const toolRoutes: readonly ToolRouteMeta[] = [
  { id: "json", slug: "json", title: "JSON 格式化 / 压缩 / 校验工具", description: "在线 JSON 格式化、压缩、校验、排序、转义和扁平化，全部在浏览器本地运行，数据不上传。" },
  { id: "encoding", slug: "encoding", title: "URL / Base64 / Unicode 编码转换工具", description: "在线 URL、Base64、Unicode 和 HTML 实体编码与解码，本地运行，数据不上传。" },
  { id: "time", slug: "time", title: "时间戳转换工具（Unix 时间）", description: "Unix 时间戳与日期互转，自动识别秒和毫秒，本地运行，数据不上传。" },
  { id: "text", slug: "text", title: "文本处理工具（去重 / 排序 / 统计）", description: "在线文本统计、去空行、去重、排序和大小写转换，本地运行，数据不上传。" },
  { id: "diff", slug: "diff", title: "文本 / 代码 Diff 对比工具", description: "在线对比两段文本或代码，左右并排显示行级差异并高亮改动行内的不同字词，本地运行，数据不上传。" },
  { id: "jsonToTs", slug: "json-to-ts", title: "JSON 转 TypeScript 类型工具", description: "粘贴 JSON 自动推断 TypeScript interface / type 类型定义，嵌套对象拆成独立接口，本地运行，数据不上传。" },
  { id: "jwt", slug: "jwt", title: "JWT 解码工具", description: "本地解码 JWT 的 Header 和 Payload，不验证签名、不上传 token。" },
  { id: "hash", slug: "hash", title: "Hash 计算工具（SHA-1/256/384/512）", description: "在线计算 SHA-1、SHA-256、SHA-384 和 SHA-512 摘要，支持文件，本地运行。" },
  { id: "uuid", slug: "uuid", title: "UUID 生成工具（v4）", description: "在线生成单个或批量 UUID v4，本地运行，数据不上传。" },
  { id: "regex", slug: "regex", title: "正则表达式测试工具", description: "在线测试正则表达式，查看匹配数量、位置和捕获组，本地运行。" },
  { id: "markdown", slug: "markdown", title: "Markdown 预览工具", description: "在线 Markdown 本地预览，快速检查标题、列表、引用和代码块，数据不上传。" },
  { id: "data", slug: "yaml", title: "YAML / TOML 转 JSON 工具", description: "在线把 YAML / TOML 转成 JSON，覆盖配置和 Front Matter 场景，本地运行。" },
  { id: "csv", slug: "csv", title: "CSV / TSV 转 JSON 工具", description: "在线把 CSV / TSV 转成 JSON，适合表格数据整理，本地运行，数据不上传。" },
  { id: "color", slug: "color", title: "颜色格式转换工具（HEX/RGB/HSL）", description: "在线 HEX、RGB、HSL 颜色格式互转，本地运行。" },
  { id: "image", slug: "image", title: "图片压缩 / 格式转换工具（JPG/PNG/WebP）", description: "本地压缩与转换 JPG / PNG / WebP，优先使用 WASM 编码器，图片不上传。" },
  { id: "watermark", slug: "watermark", title: "图片加水印工具", description: "给图片添加文字水印，支持单个定位与斜向平铺，可批量处理，本地运行。" },
  { id: "linkQr", slug: "link-qr", title: "网址二维码生成工具", description: "输入网址一键生成可下载的二维码 PNG，本地运行，数据不上传。" },
  { id: "wechatQr", slug: "wechat-qr", title: "微信扫一扫二维码合成工具", description: "上传微信加好友二维码和头像，本地合成中间带头像的扫一扫图片，图片不上传。" },
  { id: "crop", slug: "image-crop", title: "图片裁剪 / 旋转工具（按比例 / 圆形头像）", description: "在线裁剪、旋转、翻转图片，支持 1:1/16:9 等比例和圆形头像输出，本地运行，图片不上传。" },
  { id: "qrDecode", slug: "qr-decode", title: "二维码识别 / 解码工具", description: "上传或粘贴二维码、条形码图片，本地识别出其中的链接或文本，图片不上传。" },
  { id: "imageBase64", slug: "image-base64", title: "图片转 Base64 / Data URI 工具", description: "图片与 Base64 / Data URI 互转，输出 CSS / HTML / Markdown 片段，本地运行，图片不上传。" },
];

export const toolSlugById = Object.fromEntries(toolRoutes.map((route) => [route.id, route.slug])) as Record<ToolTab, string>;

const toolRouteBySlug = new Map(toolRoutes.map((route) => [route.slug, route]));

export function findToolRouteBySlug(slug: string): ToolRouteMeta | undefined {
  return toolRouteBySlug.get(slug);
}
