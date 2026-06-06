// 更新日志数据：面向用户记录每次上线的新增 / 优化 / 修复。
// 维护方式：新增一次发布就在数组开头加一条（最新在前），随代码一起部署。
// version 可选——有版本号就填，没有就用日期标识。

export type ChangelogChangeType = "added" | "improved" | "fixed" | "removed";

export type ChangelogChange = {
  /** 变更类型；首次上线 / 功能介绍这类可不填，则不显示类型徽章。 */
  type?: ChangelogChangeType;
  /** 可选前缀，如功能名「文章」，会以加粗形式置于说明前。 */
  label?: string;
  text: string;
};

export type ChangelogRelease = {
  /** 发布日期，格式 YYYY-MM-DD。 */
  date: string;
  /** 可选版本号，如 v1.3.0。 */
  version?: string;
  /** 可选：一句话概括本次发布。 */
  title?: string;
  changes: ChangelogChange[];
};

// 最新的发布放在数组最前面。
export const changelog: ChangelogRelease[] = [
  {
    date: "2026-06-06",
    title: "工具升级：新增三个图片 / 二维码工具，JSON 自动格式化",
    changes: [
      { type: "added", label: "图片裁剪", text: "在线裁剪图片，支持原比例 / 1:1 / 16:9 等多种比例、旋转和翻转，可导出 PNG / JPG / WebP，全程本地处理不上传。" },
      { type: "added", label: "二维码识别", text: "上传图片即可解析二维码 / 条形码内容，自动识别网址、WiFi、名片等并给出可点操作。" },
      { type: "added", label: "图片转 Base64", text: "图片与 Base64 / Data URI 互转，附带 CSS、HTML、Markdown 等可一键复制的代码片段。" },
      { type: "improved", label: "JSON", text: "粘贴或编辑内容时自动格式化，右侧实时出结果；格式有误会自动提示，不必再手动点按钮。" },
      { type: "improved", label: "工具页", text: "优化分类导航，默认进入「数据」分类，工具按用途归类更好找。" },
    ],
  },
  {
    date: "2026-06-05",
    title: "知之正式上线",
    changes: [
      { label: "文章", text: "分享 AI 探索与项目开发的实战经验，支持分层阅读，适合反复回看。" },
      { label: "专题", text: "把相关文章串成连续的阅读路线，沿着一个主题系统地读下去。" },
      { label: "词条", text: "用「一图看懂 + 快速理解」拆解 AI 术语，快速建立概念。" },
      { label: "工具", text: "JSON、编码、图片压缩 / 水印、二维码等实用工具，全部在浏览器本地运行、不上传服务器。" },
    ],
  },
];
