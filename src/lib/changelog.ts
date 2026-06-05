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
