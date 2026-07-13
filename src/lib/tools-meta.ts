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
  { id: "json", slug: "json", title: "JSON 格式化 / 压缩 / 校验工具", description: "在线格式化、压缩、校验、排序、转义和扁平化 JSON，支持错误定位，全部在浏览器本地运行，数据不上传。" },
  { id: "encoding", slug: "encoding", title: "URL / Base64 / Unicode 编码转换工具", description: "在线进行 URL、Base64、Unicode 和 HTML 实体编码解码，适合链接、文本和网页片段转换，本地运行，数据不上传。" },
  { id: "time", slug: "time", title: "时间戳转换工具（Unix 时间）", description: "Unix 时间戳与日期时间互转，自动识别秒和毫秒，支持本地时间与 UTC 查看，本地运行，数据不上传。" },
  { id: "text", slug: "text", title: "文本处理工具（去重 / 排序 / 统计）", description: "在线统计文本字数、行数和大小，支持去空行、去重、排序、大小写转换和空白清理，本地运行，数据不上传。" },
  { id: "diff", slug: "diff", title: "文本 / 代码 Diff 对比工具", description: "在线对比两段文本或代码，左右并排显示行级差异并高亮行内改动，支持生成补丁，本地运行，数据不上传。" },
  { id: "jsonToTs", slug: "json-to-ts", title: "JSON 转 TypeScript 类型工具", description: "粘贴 JSON 自动推断 TypeScript interface / type 类型定义，支持嵌套对象拆分，本地运行，数据不上传。" },
  { id: "tokenCount", slug: "token-counter", title: "LLM Token 计数器（GPT / Claude）", description: "在线计算文本的 token 数：GPT 系列用 tiktoken 精确分词、Claude / Gemini 等估算，附字符 / 字词 / 行统计与分词可视化，全部在浏览器本地运行，数据不上传。" },
  { id: "seoAudit", slug: "ai-search-audit", title: "AI 搜索体检工具（SEO / GEO / AEO）", description: "粘贴文章或页面内容，本地检查 SEO、AEO、GEO、结构化数据和 AI 可摘取性，生成修改建议、FAQ、JSON-LD 和 llms.txt 片段，数据不上传。" },
  { id: "jwt", slug: "jwt", title: "JWT 解码工具", description: "在线解码 JWT Header 和 Payload，查看常见时间字段，不验证签名、不上传 token，全部在浏览器本地运行。" },
  { id: "hash", slug: "hash", title: "Hash 计算工具（SHA-1/256/384/512）", description: "在线计算文本或文件的 SHA-1、SHA-256、SHA-384 和 SHA-512 摘要，适合校验文件完整性，本地运行。" },
  { id: "uuid", slug: "uuid", title: "UUID 生成工具（v4）", description: "在线生成单个或批量 UUID v4，支持标准、大写、紧凑和 JSON 输出格式，本地运行，数据不上传。" },
  { id: "regex", slug: "regex", title: "正则表达式测试工具", description: "在线测试正则表达式，查看匹配数量、位置、捕获组和替换结果，本地运行，数据不上传。" },
  { id: "markdown", slug: "markdown", title: "Markdown 预览工具", description: "在线预览 Markdown，快速检查标题、列表、引用、表格、任务列表和代码块渲染效果，本地运行，数据不上传。" },
  { id: "data", slug: "yaml", title: "YAML / TOML 转 JSON 工具", description: "在线把 YAML 或 TOML 转成 JSON，适合配置文件、Front Matter 和结构化数据整理，本地运行，数据不上传。" },
  { id: "xml", slug: "xml", title: "XML 转 JSON 工具", description: "在线把 XML 转成 JSON，支持属性、文本节点、重复节点数组和命名空间处理选项，本地运行，数据不上传。" },
  { id: "csv", slug: "csv", title: "CSV / TSV 转 JSON 工具", description: "在线把 CSV 或 TSV 转成 JSON，支持自动识别分隔符、类型推断和表格数据整理，本地运行，数据不上传。" },
  { id: "color", slug: "color", title: "颜色拾取 / 格式转换工具（吸管取色 / HEX/RGB/HSL）", description: "上传图片点击取色并提取主色板、用屏幕吸管拾取任意颜色，并在 HEX、RGB、HSL 间互转、输出可复制的 CSS 变量，本地运行，数据不上传。" },
  { id: "image", slug: "image", title: "图片压缩 / 格式转换工具（JPG/PNG/WebP/AVIF）", description: "本地压缩、缩放并转换 JPG、PNG、WebP 和 AVIF 图片，支持批量处理和目标体积设置，图片不上传。" },
  { id: "watermark", slug: "watermark", title: "图片加水印工具", description: "在线给图片添加文字水印，支持单个定位、斜向平铺、透明度和批量处理，本地运行，图片不上传。" },
  { id: "linkQr", slug: "link-qr", title: "二维码生成工具（网址/文本/Wi-Fi/名片）", description: "在线生成网址、文本、Wi-Fi、邮箱、电话、短信和名片二维码，支持尺寸、留白、颜色、纠错等级和 PNG/WebP/JPG 下载，本地运行，数据不上传。" },
  { id: "wechatQr", slug: "wechat-qr", title: "微信扫一扫二维码合成工具", description: "上传微信加好友二维码和头像，本地合成中间带头像的扫一扫图片，支持尺寸、留白和输出格式设置，图片不上传。" },
  { id: "crop", slug: "image-crop", title: "图片裁剪 / 旋转工具（按比例 / 圆形头像）", description: "在线裁剪、旋转、翻转图片，支持固定比例、自由裁剪和圆形头像输出，本地运行，图片不上传。" },
  { id: "idPhoto", slug: "id-photo", title: "证件照制作工具（AI 抠图换底 / 蓝白红底）", description: "上传人像照片，本地 AI 抠图换背景，生成蓝底、白底、红底的一寸、二寸等标准尺寸证件照，图片不上传。" },
  { id: "qrDecode", slug: "qr-decode", title: "二维码识别 / 解码工具", description: "上传、拖拽或粘贴二维码和条形码图片，本地识别链接、文本、Wi-Fi、电话、邮箱、短信和名片等内容，图片不上传。" },
  { id: "imageBase64", slug: "image-base64", title: "图片转 Base64 / Data URI 工具", description: "图片与 Base64 / Data URI 互转，支持复制 CSS、HTML 和 Markdown 嵌入片段，本地运行，图片不上传。" },
  { id: "imageAscii", slug: "image-to-ascii", title: "图片转 ASCII 字符画工具", description: "上传图片在线生成 ASCII 字符画，支持细节、字符集、反色和彩色预览，可复制文本或下载 PNG，本地运行，图片不上传。" },
  { id: "videoConverter", slug: "video-converter", title: "视频压缩 / 格式转换工具", description: "上传视频后在浏览器本地用 FFmpeg WASM 压缩或转换为 MP4、WebM、MP3、GIF，支持分辨率、质量和音频选项，视频不上传。" },
];

export const toolSlugById = Object.fromEntries(toolRoutes.map((route) => [route.id, route.slug])) as Record<ToolTab, string>;

const toolRouteBySlug = new Map(toolRoutes.map((route) => [route.slug, route]));

export function findToolRouteBySlug(slug: string): ToolRouteMeta | undefined {
  return toolRouteBySlug.get(slug);
}
