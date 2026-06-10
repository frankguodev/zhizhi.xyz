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
    date: "2026-06-09",
    title: "工具体验优化：命令面板切换、JSON 内容搜索与界面精修",
    changes: [
      { type: "added", label: "工具切换", text: "新增命令面板：点顶部「切换工具」或按 ⌘K / Ctrl+K，输入关键词或用方向键，在全部工具间快速切换。" },
      { type: "added", label: "JSON 内容搜索", text: "结果区改为按内容搜索（替代原「路径查询」）：输入键名或值即高亮全部命中并计数，Enter / ↑↓ 逐个跳转，按 Ctrl / ⌘ + F 一键唤起。" },
      { type: "improved", label: "JSON 操作", text: "工具栏按归属重排：输入区放格式化、转换、复制、尝试修复，结果区放缩进、自动格式化、复制、压缩——「压缩」「下载」等针对结果的操作归到结果区更顺手；不常用的「清空」「导入」「历史」收进「更多」菜单，清空不再被误触。去掉多余的有效 / 无效标记（结果区已直接展示）。" },
      { type: "improved", label: "工具界面", text: "工具区与背景融合更简洁；大屏下输入 / 结果区自动撑满视口高度、首屏不再露出页脚，输入框与结果框上下对齐。" },
      { type: "improved", label: "滚动条", text: "全站滚动条改为更细、更克制的样式并随明暗主题切换；输入框滚动条也与结果区保持一致的外观。" },
      { type: "fixed", label: "JSON 修复", text: "「尝试修复」现在能处理连续重复的逗号（如 \",,\"），自动合并为一个。" },
    ],
  },
  {
    date: "2026-06-08",
    title: "JSON 工具全面升级：高亮、树形、路径查询与智能修复",
    changes: [
      { type: "added", label: "结果视图", text: "结果区支持「高亮 / 树形 / 文本」三种视图，可折叠展开节点，并带行号和结构统计（对象、数组、键数、层级深度）。" },
      { type: "added", label: "路径查询", text: "用 data.items[0].name、users[*].id 这样的路径，从大 JSON 里直接提取需要的片段。" },
      { type: "added", label: "尝试修复", text: "一键修复常见的「伪 JSON」：全角标点、注释、尾随逗号、单引号、Python 的 True/False/None。" },
      { type: "added", label: "解开转义", text: "一键还原被多次转义的 JSON 字符串，常用于处理接口返回的嵌套 JSON。" },
      { type: "improved", label: "校验提示", text: "输入即自动格式化与校验，出错实时提示并跳转到出错行；新增有效 / 无效状态标记，去掉了多余的手动「校验」按钮。" },
      { type: "improved", label: "排序与开关", text: "Key 支持升序 / 降序排序，自动格式化可随时开关。" },
    ],
  },
  {
    date: "2026-06-07",
    title: "工具新增：文本 / 代码对比，JSON 转 TypeScript",
    changes: [
      { type: "added", label: "Diff 对比", text: "对比两段文本或代码，左右并排显示行级差异并高亮改动字词。" },
      { type: "added", label: "JSON 转 TS", text: "粘贴 JSON 自动推断 TypeScript 的 interface / type 类型定义。" },
    ],
  },
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
