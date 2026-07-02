"use client";

import {
  ArrowDownToLine,
  ArrowRightLeft,
  Binary,
  Braces,
  Calculator,
  ChevronDown,
  Clipboard,
  Code2,
  Crop,
  Download,
  FileText,
  FileCode2,
  Fingerprint,
  FileJson2,
  GitCompareArrows,
  FileImage,
  Hash as HashIcon,
  IdCard,
  History,
  KeyRound,
  LayoutGrid,
  Link2,
  Lock,
  MoreHorizontal,
  Palette,
  QrCode,
  Rows3,
  Save,
  ScanLine,
  Search,
  Stamp,
  Table2,
  TimerReset,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { ToolCommandPalette, type PaletteTool } from "./tool-command-palette";
import { convertDelimitedTextToJson } from "./tool-csv";
import { decodeJwtInput, formatHashResult } from "./tool-crypto";
import { clearToolHistory, deleteToolHistoryItem, readToolHistory, saveToolHistoryItem, type ToolHistoryItem, type ToolHistorySettings } from "./tool-history";
import { JsonViewer } from "./json-viewer";
import { enhanceJsonError, getJsonErrorHighlight, repairJsonText, translateJsonErrorReason } from "./tool-json-diagnostics";
import { renderMarkdownPreview, sanitizeMarkdownPreviewHtml } from "./tool-markdown";
import { toolMonoContentClass } from "./tool-panel";
import { readToolPreferences, writeToolPreferences } from "./tool-preferences";
import { toolSlugById } from "@/lib/tools-meta";
import { sampleCsv, sampleMarkdown, sampleStructured, sampleXml } from "./tool-samples";
import { parseTomlDocument, parseYamlDocument } from "./tool-structured";
import { parseXmlToJson, type XmlToJsonOptions } from "./tool-xml";
import type {
  CsvDelimiter,
  CsvOutputMode,
  EditorPanelSize,
  EncodingAction,
  HashAlgorithm,
  HashOutputFormat,
  HashStructuredResultData,
  JsonAction,
  JsonWorkerPending,
  JsonWorkerResult,
  JwtStructuredResultData,
  RegexStructuredResultData,
  StructuredFormat,
  StructuredToolResult,
  TextAction,
  TextMetrics,
  TimeDisplayMode,
  TimestampUnit,
  ToolGroup,
  ToolTab,
  UtilityAction,
  UtilityWorkerPending,
  UtilityWorkerResult,
  UuidFormat,
  XmlJsonFormat,
} from "./tool-types";
import { isToolTab } from "./tool-types";

// 重型独立工具按需加载，避免把图片/二维码工具及其依赖（如 qrcode）打进 /tools 首屏 bundle。
const standaloneToolLoading = () => <div className="py-16 text-center text-sm text-muted">加载工具中…</div>;
const ImageTool = dynamic(() => import("./image-tool").then((m) => m.ImageTool), { ssr: false, loading: standaloneToolLoading });
const ImageWatermarkTool = dynamic(() => import("./image-watermark-tool").then((m) => m.ImageWatermarkTool), { ssr: false, loading: standaloneToolLoading });
const LinkQrTool = dynamic(() => import("./link-qr-tool").then((m) => m.LinkQrTool), { ssr: false, loading: standaloneToolLoading });
const WechatQrTool = dynamic(() => import("./wechat-qr-tool").then((m) => m.WechatQrTool), { ssr: false, loading: standaloneToolLoading });
const ImageCropTool = dynamic(() => import("./image-crop-tool").then((m) => m.ImageCropTool), { ssr: false, loading: standaloneToolLoading });
const QrDecodeTool = dynamic(() => import("./qr-decode-tool").then((m) => m.QrDecodeTool), { ssr: false, loading: standaloneToolLoading });
const ImageBase64Tool = dynamic(() => import("./image-base64-tool").then((m) => m.ImageBase64Tool), { ssr: false, loading: standaloneToolLoading });
const IdPhotoTool = dynamic(() => import("./id-photo-tool").then((m) => m.IdPhotoTool), { ssr: false, loading: standaloneToolLoading });
const DiffTool = dynamic(() => import("./diff-tool").then((m) => m.DiffTool), { ssr: false, loading: standaloneToolLoading });
const JsonToTsTool = dynamic(() => import("./json-to-ts-tool").then((m) => m.JsonToTsTool), { ssr: false, loading: standaloneToolLoading });
const TokenCounterTool = dynamic(() => import("./token-counter-tool").then((m) => m.TokenCounterTool), { ssr: false, loading: standaloneToolLoading });
const SeoAeoGeoTool = dynamic(() => import("./seo-aeo-geo-tool").then((m) => m.SeoAeoGeoTool), { ssr: false, loading: standaloneToolLoading });
const ColorPickStudio = dynamic(() => import("./color-pick-studio").then((m) => m.ColorPickStudio), { ssr: false });

type TextHighlight = {
  end: number;
  start: number;
};

const generalLargeInputBytes = 5 * 1024 * 1024;
const hashFileWarningBytes = 50 * 1024 * 1024;
const hashFileLimitBytes = 256 * 1024 * 1024;
const jsonLargeInputBytes = 10 * 1024 * 1024;
const xmlLargeInputBytes = 1024 * 1024;
// 自动格式化在主线程同步跑，超过该体积就跳过、提示改用「格式化」按钮（走 Worker），避免输入卡顿。
const jsonAutoFormatMaxBytes = 1024 * 1024;
const jsonWorkerTimeoutMs = 60000;
const historyDrawerTransitionMs = 240;
const utilityWorkerTimeoutMs = 60000;

const toolGroups = [
  { id: "data", label: "数据" },
  { id: "encode", label: "编码" },
  { id: "dev", label: "开发" },
  { id: "media", label: "媒体" },
  { id: "writing", label: "文本" },
] as const satisfies readonly { id: ToolGroup; label: string }[];

const toolGroupByTab: Record<ToolTab, ToolGroup> = {
  color: "dev",
  crop: "media",
  csv: "data",
  idPhoto: "media",
  data: "data",
  diff: "writing",
  encoding: "encode",
  jsonToTs: "dev",
  tokenCount: "dev",
  hash: "dev",
  image: "media",
  imageBase64: "media",
  json: "data",
  jwt: "dev",
  linkQr: "media",
  markdown: "writing",
  seoAudit: "writing",
  qrDecode: "media",
  regex: "dev",
  text: "writing",
  time: "dev",
  uuid: "dev",
  watermark: "media",
  wechatQr: "media",
  xml: "data",
};

const copyLabels = {
  copy: "复制",
  copied: "已复制",
  download: "下载",
  input: "输入",
  output: "结果",
  importJson: "导入文件",
  swap: "结果转输入",
  exchange: "交换",
  clear: "清空",
  history: "历史",
  saveHistory: "保存历史",
  restore: "恢复",
  delete: "删除",
  clearCurrentToolHistory: "清空当前工具",
  clearAllHistory: "清空全部",
  cancel: "取消",
  confirmClearAction: "确认清空",
  confirmClearPrompt: "确定清空？此操作不可撤销。",
  confirmClearTitle: "清空历史记录",
  emptyHistory: "暂无历史记录。",
  historySearch: "搜索历史",
  historyCurrentTool: "当前工具",
  historyAllTools: "全部工具",
  historySavedMessage: "已保存到本地历史。",
  historyRestoredMessage: "已恢复历史记录。",
  historyDeletedMessage: "历史记录已删除。",
  historyClearedMessage: "历史记录已清空。",
  emptyHistoryInput: "输入框为空，无法保存历史。",
  historyWithOutput: "含结果",
  historyInputOnly: "仅输入",
  confirmClearCurrentHistory: "确定清空当前工具的历史记录吗？",
  confirmClearAllHistory: "确定清空全部工具历史记录吗？",
  spaces: "缩进",
  copiedMessage: "已复制到剪贴板。",
  downloadedMessage: "结果已下载。",
  exchangedMessage: "输入和结果已交换。",
  importFailed: "文件导入失败，请重新选择。",
  importedMessage: "文件已导入输入框。",
  movedMessage: "结果已填入输入框。",
  copyFailed: "复制失败，请手动选择结果。",
  emptyInput: "输入框没有可复制的内容。",
  emptyOutput: "结果框没有可复制的内容。",
} as const;

const tabLabels = [
  { id: "json", label: "JSON", description: "格式化、压缩、校验、排序、转义和扁平化。", icon: FileJson2 },
  { id: "encoding", label: "编码", description: "URL、Base64、Unicode 和 HTML 实体转换。", icon: Code2 },
  { id: "time", label: "时间", description: "时间戳与日期互转，自动识别秒和毫秒。", icon: TimerReset },
  { id: "text", label: "文本", description: "统计、去空行、去重、排序和大小写转换。", icon: Rows3 },
  { id: "diff", label: "Diff", description: "对比两段文本或代码，左右并排显示行级差异并高亮改动字词。", icon: GitCompareArrows },
  { id: "jsonToTs", label: "JSON→TS", description: "粘贴 JSON 自动推断 TypeScript interface / type 类型。", icon: FileCode2 },
  { id: "tokenCount", label: "Token", description: "计算文本的 LLM token 数，GPT 精确、Claude 等估算，附统计与分词可视化。", icon: Calculator },
  { id: "seoAudit", label: "AI 搜索", description: "本地检查 SEO / AEO / GEO，生成修改建议、FAQ、JSON-LD 和 llms.txt。", icon: Search },
  { id: "jwt", label: "JWT", description: "本地解码 JWT Header 和 Payload，不验证签名。", icon: KeyRound },
  { id: "hash", label: "Hash", description: "计算 SHA-1、SHA-256、SHA-384 和 SHA-512 摘要。", icon: HashIcon },
  { id: "uuid", label: "UUID", description: "生成单个或批量 UUID v4。", icon: Fingerprint },
  { id: "regex", label: "正则", description: "测试正则表达式，查看匹配数量、位置和捕获组。", icon: Search },
  { id: "markdown", label: "MD", description: "Markdown 本地预览，适合快速检查标题、列表、引用和代码块。", icon: FileText },
  { id: "data", label: "YAML", description: "YAML / TOML 转 JSON，覆盖常见配置和 Front Matter 场景。", icon: Braces },
  { id: "xml", label: "XML", description: "XML 转 JSON，支持属性、文本节点、重复节点和命名空间选项。", icon: Braces },
  { id: "csv", label: "CSV", description: "CSV / TSV 转 JSON，适合表格数据整理。", icon: Table2 },
  { id: "color", label: "颜色", description: "从图片取色、屏幕吸管拾色，并在 HEX、RGB、HSL 间互转。", icon: Palette },
  { id: "image", label: "图片", description: "本地压缩、转换 JPG / PNG / WebP，优先使用 WASM 编码器。", icon: FileImage },
  { id: "watermark", label: "水印", description: "给图片添加文字水印，支持单个定位与斜向平铺，可批量处理。", icon: Stamp },
  { id: "linkQr", label: "二维码生成", description: "生成网址、文本、Wi-Fi、邮箱、电话、短信和名片二维码。", icon: QrCode },
  { id: "wechatQr", label: "微信二维码", description: "上传微信加好友二维码和头像，本地合成中间带头像的扫一扫图片。", icon: QrCode },
  { id: "crop", label: "裁剪旋转", description: "按比例裁剪图片，支持圆形头像、90° 旋转和水平翻转。", icon: Crop },
  { id: "idPhoto", label: "证件照", description: "本地 AI 抠图换底，生成蓝 / 白 / 红底标准尺寸证件照，图片不上传。", icon: IdCard },
  { id: "qrDecode", label: "二维码识别", description: "上传或粘贴二维码 / 条形码图片，本地解出链接或文本。", icon: ScanLine },
  { id: "imageBase64", label: "图片转 Base64", description: "图片与 Base64 / Data URI 互转，输出 CSS / HTML / Markdown 片段。", icon: Binary },
] as const;

const hiddenToolTabs = new Set<ToolTab>(["data"]);
const visibleTabLabels = tabLabels.filter((tab) => !hiddenToolTabs.has(tab.id));

const toolSearchAliases: Record<ToolTab, string> = {
  color: "hex rgb hsl css color palette picker pick eyedropper dropper image yanse se sezhi quse xishi pingmu tupian zhuse diaose",
  crop: "crop rotate flip image avatar circle ratio aspect cut tupian caijian xuanzhuan fanzhuan touxiang yuanxing bili",
  csv: "csv tsv table excel sheet delimiter comma tab biaoge",
  idPhoto: "id photo passport visa avatar headshot background removal blue white red zhengjianzhao yicun ercun koutu huandi lvbai zhao tupian",
  data: "yaml toml front matter config configuration json peizhi",
  diff: "diff compare text code difference changes merge duibi chayi wenben daima bijiao",
  encoding: "url uri base64 unicode html escape unescape encode decode bianma",
  jsonToTs: "json typescript ts type interface convert codegen leixing jiekou zhuanhuan",
  tokenCount: "token counter tokenizer tiktoken llm gpt claude prompt count cost context window leji jishu fenci shangxiawen",
  seoAudit: "seo geo aeo ai search audit llmo answer engine optimization generative engine structured data jsonld faq llms neirong tizhen sousuo youhua",
  hash: "sha sha1 sha256 sha384 sha512 digest checksum file wenjian",
  image: "image compress convert jpg jpeg png webp resize photo picture media tupian yasuo zhuanhuan",
  imageBase64: "image base64 datauri data url css html markdown embed inline tupian bianma neilian",
  json: "json format minify validate sort flatten parse escape",
  jwt: "jwt token bearer header payload exp iat nbf",
  linkQr: "link url text wifi email phone sms contact vcard qr qrcode website webpage erweima lianjie wangzhi wenben mingpian",
  markdown: "markdown md gfm preview render table code yulan",
  qrDecode: "qr qrcode barcode decode scan read recognize erweima tiaoma shibie saoma jiema",
  regex: "regex regexp regular expression pattern replace zhengze",
  text: "text string line dedupe sort trim uppercase lowercase wenben",
  time: "time timestamp unix date utc local seconds milliseconds shijian shijianchuo",
  uuid: "uuid guid random v4 id",
  watermark: "watermark text tiled diagonal photo picture copyright shuiyin wenzi pingpu banquan tupian",
  wechatQr: "wechat weixin qr qrcode contact friend avatar scan saoyisao erweima touxiang",
  xml: "xml json rss atom svg sitemap convert parse markup biaoqian zhuanhuan",
};

// 命令面板用的工具清单：在 tabLabels 基础上补上分组与搜索别名，供 ⌘K 切换器过滤。
const paletteTools: readonly PaletteTool[] = visibleTabLabels.map((tab) => ({
  id: tab.id,
  label: tab.label,
  description: tab.description,
  icon: tab.icon,
  group: toolGroupByTab[tab.id],
  aliases: toolSearchAliases[tab.id],
}));

export function ToolsWorkbench({ initialTool }: { initialTool?: ToolTab } = {}) {
  const labels = copyLabels;
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [activeTab, setActiveTab] = useState<ToolTab>(initialTool ?? "seoAudit");
  const [activeGroup, setActiveGroup] = useState<ToolGroup>(initialTool ? toolGroupByTab[initialTool] : "writing");
  const [mobilePanel, setMobilePanel] = useState<"input" | "output">("input");
  const [historyMounted, setHistoryMounted] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [paletteMounted, setPaletteMounted] = useState(false);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [toolHistoryItems, setToolHistoryItems] = useState<ToolHistoryItem[]>([]);
  const [structuredResult, setStructuredResult] = useState<StructuredToolResult | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<"input" | "output" | null>(null);
  const [colorInput, setColorInput] = useState("#d9b861");
  const [colorOutput, setColorOutput] = useState("");
  const [csvDelimiter, setCsvDelimiter] = useState<CsvDelimiter>("auto");
  const [csvEmptyAsNull, setCsvEmptyAsNull] = useState(false);
  const [csvInferTypes, setCsvInferTypes] = useState(true);
  const [csvInput, setCsvInput] = useState(sampleCsv);
  const [csvOutput, setCsvOutput] = useState("");
  const [csvOutputMode, setCsvOutputMode] = useState<CsvOutputMode>("objects");
  const [encodingBusy, setEncodingBusy] = useState(false);
  const [hashBusy, setHashBusy] = useState(false);
  const [jsonBusy, setJsonBusy] = useState(false);
  const [regexBusy, setRegexBusy] = useState(false);
  const [textBusy, setTextBusy] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonErrorHighlight, setJsonErrorHighlight] = useState<TextHighlight | null>(null);
  const [jsonOutput, setJsonOutput] = useState("");
  const [jsonValidity, setJsonValidity] = useState<{ type: "idle" | "valid" | "error" | "large"; message: string }>({ type: "idle", message: "" });
  const [jsonAutoFormat, setJsonAutoFormat] = useState(true);
  const [jsonSpaces, setJsonSpaces] = useState("2");
  const [encodingInput, setEncodingInput] = useState("https://zhizhi.xyz/articles?tag=AI 应用");
  const [encodingOutput, setEncodingOutput] = useState("");
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [hashInput, setHashInput] = useState("知之工具");
  const [hashOutput, setHashOutput] = useState("");
  const [hashOutputFormat, setHashOutputFormat] = useState<HashOutputFormat>("hex");
  const [jwtInput, setJwtInput] = useState("");
  const [jwtOutput, setJwtOutput] = useState("");
  const [markdownAutoPreview, setMarkdownAutoPreview] = useState(true);
  const [markdownInput, setMarkdownInput] = useState(sampleMarkdown);
  const [markdownOutput, setMarkdownOutput] = useState("");
  const [regexFlags, setRegexFlags] = useState("gi");
  const [regexInput, setRegexInput] = useState("知之工具\nzhizhi.xyz");
  const [regexOutput, setRegexOutput] = useState("");
  const [regexPattern, setRegexPattern] = useState("知之|zhizhi");
  const [regexReplacement, setRegexReplacement] = useState("");
  const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>("local");
  const [timeInput, setTimeInput] = useState("");
  const [timeOutput, setTimeOutput] = useState("");
  const [timestampUnit, setTimestampUnit] = useState<TimestampUnit>("auto");
  const [textInput, setTextInput] = useState("知识\n工具\n知识\n\n知之");
  const [textOutput, setTextOutput] = useState("");
  const [textDedupeIgnoreCase, setTextDedupeIgnoreCase] = useState(false);
  const [textDedupeKeepOrder, setTextDedupeKeepOrder] = useState(true);
  const [textDedupeTrim, setTextDedupeTrim] = useState(true);
  const [textSortRemoveEmpty, setTextSortRemoveEmpty] = useState(false);
  const [textSortTrim, setTextSortTrim] = useState(false);
  const [textSummary, setTextSummary] = useState("");
  const [structuredFormat, setStructuredFormat] = useState<StructuredFormat>("yaml");
  const [structuredInput, setStructuredInput] = useState(sampleStructured);
  const [structuredOutput, setStructuredOutput] = useState("");
  const [uuidInput, setUuidInput] = useState("10");
  const [uuidOutput, setUuidOutput] = useState("");
  const [uuidFormat, setUuidFormat] = useState<UuidFormat>("standard");
  const [xmlForceArrays, setXmlForceArrays] = useState(false);
  const [xmlIncludeAttributes, setXmlIncludeAttributes] = useState(true);
  const [xmlInput, setXmlInput] = useState(sampleXml);
  const [xmlJsonFormat, setXmlJsonFormat] = useState<XmlJsonFormat>("2");
  const [xmlOutput, setXmlOutput] = useState("");
  const [xmlStripNamespaces, setXmlStripNamespaces] = useState(false);
  const [xmlTrimText, setXmlTrimText] = useState(true);
  const jsonCancelRequestedRef = useRef(false);
  const jsonPendingRef = useRef<JsonWorkerPending | null>(null);
  const jsonRequestIdRef = useRef(0);
  const jsonWorkerRef = useRef<Worker | null>(null);
  const historyAnimationFrameRef = useRef(0);
  const historyCloseTimerRef = useRef(0);
  const paletteAnimationFrameRef = useRef(0);
  const paletteCloseTimerRef = useRef(0);
  const paletteVisibleRef = useRef(false);
  paletteVisibleRef.current = paletteVisible;
  const utilityPendingRef = useRef<UtilityWorkerPending | null>(null);
  const utilityRequestIdRef = useRef(0);
  const utilityWorkerRef = useRef<Worker | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const hashFileInputRef = useRef<HTMLInputElement | null>(null);
  const toolUrlSeededRef = useRef(false);

  const currentOutput = getToolValue(activeTab, {
    color: colorOutput,
    crop: "",
    idPhoto: "",
    csv: csvOutput,
    data: structuredOutput,
    diff: "",
    encoding: encodingOutput,
    jsonToTs: "",
    hash: hashOutput,
    image: "",
    imageBase64: "",
    json: jsonOutput,
    jwt: jwtOutput,
    linkQr: "",
    markdown: markdownOutput,
    qrDecode: "",
    regex: regexOutput,
    seoAudit: "",
    text: textOutput,
    time: timeOutput,
    tokenCount: "",
    uuid: uuidOutput,
    watermark: "",
    wechatQr: "",
    xml: xmlOutput,
  });
  const currentInput = getToolValue(activeTab, {
    color: colorInput,
    crop: "",
    idPhoto: "",
    csv: csvInput,
    data: structuredInput,
    diff: "",
    encoding: encodingInput,
    jsonToTs: "",
    hash: hashInput,
    image: "",
    imageBase64: "",
    json: jsonInput,
    jwt: jwtInput,
    linkQr: "",
    markdown: markdownInput,
    qrDecode: "",
    regex: regexInput,
    seoAudit: "",
    text: textInput,
    time: timeInput,
    tokenCount: "",
    uuid: uuidInput,
    watermark: "",
    wechatQr: "",
    xml: xmlInput,
  });
  const activeTabInfo = tabLabels.find((tab) => tab.id === activeTab) ?? tabLabels[0];
  const ActiveIcon = activeTabInfo.icon;
  const expandedWorkspace = isExpandedWorkspaceTool(activeTab);
  const panelSize = getPanelSize(activeTab);
  const currentInputMetrics = useMemo(() => getTextMetrics(currentInput), [currentInput]);
  const currentOutputMetrics = useMemo(() => getTextMetrics(currentOutput), [currentOutput]);
  const textInputIsLarge = activeTab === "text" && currentInputMetrics.bytes > generalLargeInputBytes;
  const xmlInputIsLarge = activeTab === "xml" && currentInputMetrics.bytes > xmlLargeInputBytes;
  const xmlIndentFormat = xmlJsonFormat === "4" || xmlJsonFormat === "6" ? xmlJsonFormat : "2";

  useEffect(() => {
    return () => {
      if (jsonPendingRef.current) {
        window.clearTimeout(jsonPendingRef.current.timeout);
        jsonPendingRef.current.reject(new Error("JSON 处理已取消。"));
        jsonPendingRef.current = null;
      }
      jsonWorkerRef.current?.terminate();
      jsonWorkerRef.current = null;
      if (utilityPendingRef.current) {
        window.clearTimeout(utilityPendingRef.current.timeout);
        utilityPendingRef.current.reject(new Error("工具处理已取消。"));
        utilityPendingRef.current = null;
      }
      utilityWorkerRef.current?.terminate();
      utilityWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const preferences = readToolPreferences();
      const linkedTool = initialTool ?? readToolFromUrl();
      const preferredTool = hiddenToolTabs.has(preferences.activeTab) ? "seoAudit" : preferences.activeTab;
      setActiveTab(linkedTool ?? preferredTool);
      setActiveGroup(linkedTool ? toolGroupByTab[linkedTool] : preferences.activeGroup);
      setCsvDelimiter(preferences.csvDelimiter);
      setCsvEmptyAsNull(preferences.csvEmptyAsNull);
      setCsvInferTypes(preferences.csvInferTypes);
      setCsvOutputMode(preferences.csvOutputMode);
      setHashAlgorithm(preferences.hashAlgorithm);
      setHashOutputFormat(preferences.hashOutputFormat);
      setJsonAutoFormat(preferences.jsonAutoFormat);
      setJsonSpaces(preferences.jsonSpaces);
      setMarkdownAutoPreview(preferences.markdownAutoPreview);
      setStructuredFormat(preferences.structuredFormat);
      setTimeDisplayMode(preferences.timeDisplayMode);
      setTimestampUnit(preferences.timestampUnit);
      setUuidFormat(preferences.uuidFormat);
      setXmlForceArrays(preferences.xmlForceArrays);
      setXmlIncludeAttributes(preferences.xmlIncludeAttributes);
      setXmlJsonFormat(preferences.xmlJsonFormat);
      setXmlStripNamespaces(preferences.xmlStripNamespaces);
      setXmlTrimText(preferences.xmlTrimText);
      setToolHistoryItems(readToolHistory());
      setPreferencesReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialTool]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    writeToolPreferences({
      activeGroup,
      activeTab: hiddenToolTabs.has(activeTab) ? "seoAudit" : activeTab,
      csvDelimiter,
      csvEmptyAsNull,
      csvInferTypes,
      csvOutputMode,
      hashAlgorithm,
      hashOutputFormat,
      jsonAutoFormat,
      jsonSpaces,
      markdownAutoPreview,
      structuredFormat,
      timeDisplayMode,
      timestampUnit,
      uuidFormat,
      xmlForceArrays,
      xmlIncludeAttributes,
      xmlJsonFormat,
      xmlStripNamespaces,
      xmlTrimText,
    });
  }, [
    activeGroup,
    activeTab,
    csvDelimiter,
    csvEmptyAsNull,
    csvInferTypes,
    csvOutputMode,
    hashAlgorithm,
    hashOutputFormat,
    jsonAutoFormat,
    jsonSpaces,
    markdownAutoPreview,
    preferencesReady,
    structuredFormat,
    timeDisplayMode,
    timestampUnit,
    uuidFormat,
    xmlForceArrays,
    xmlIncludeAttributes,
    xmlJsonFormat,
    xmlStripNamespaces,
    xmlTrimText,
  ]);

  useEffect(() => {
    if (!preferencesReady || typeof window === "undefined") {
      return;
    }

    // 首次（seed 后）不改写 URL，保持落地页地址干净；之后切换工具才把路径同步成 /tools/<slug>。
    if (!toolUrlSeededRef.current) {
      toolUrlSeededRef.current = true;
      return;
    }

    const target = `/tools/${toolSlugById[activeTab]}`;
    if (window.location.pathname === target) {
      return;
    }
    window.history.replaceState(null, "", `${target}${window.location.hash}`);
  }, [activeTab, preferencesReady]);

  useEffect(() => {
    if (activeTab !== "markdown" || !markdownAutoPreview) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMarkdownOutput(sanitizeMarkdownPreviewHtml(renderMarkdownPreview(markdownInput)));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [activeTab, markdownAutoPreview, markdownInput]);

  useEffect(() => {
    if (activeTab !== "json" || !jsonAutoFormat) {
      return;
    }

    const timeout = window.setTimeout(() => {
      // 输入为空时清空输出、错误高亮和校验状态，避免残留上一次的结果。
      if (jsonInput.trim() === "") {
        setJsonOutput("");
        setJsonErrorHighlight(null);
        setJsonValidity({ type: "idle", message: "" });
        return;
      }

      // 体积较大的 JSON 不在主线程同步校验，交给手动「格式化」走 Worker，避免输入卡顿。
      if (new TextEncoder().encode(jsonInput).byteLength > jsonAutoFormatMaxBytes) {
        setJsonValidity({ type: "large", message: "内容较大，点「格式化」校验" });
        return;
      }

      try {
        const formatted = JSON.stringify(JSON.parse(jsonInput), null, Number(jsonSpaces));
        setJsonOutput(formatted);
        setJsonErrorHighlight(null);
        setJsonValidity({ type: "valid", message: "JSON 有效" });
      } catch (error) {
        // 防抖结束后仍非法才报错，和手动「格式化」按钮一致：输出区给错误信息 + 输入框行内高亮。
        const errorMessage = enhanceJsonError(error instanceof Error ? error.message : "JSON 格式无效。", jsonInput);
        setJsonOutput(formatJsonErrorOutput(errorMessage));
        setJsonErrorHighlight(getJsonErrorHighlight(errorMessage, jsonInput));
        setJsonValidity({ type: "error", message: "JSON 无效" });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activeTab, jsonInput, jsonSpaces, jsonAutoFormat]);

  useEffect(() => () => {
    clearHistoryTransitionTimers();
    if (paletteAnimationFrameRef.current) {
      window.cancelAnimationFrame(paletteAnimationFrameRef.current);
    }
    if (paletteCloseTimerRef.current) {
      window.clearTimeout(paletteCloseTimerRef.current);
    }
  }, []);

  function terminateJsonWorker() {
    if (jsonPendingRef.current) {
      window.clearTimeout(jsonPendingRef.current.timeout);
      jsonPendingRef.current.reject(new Error("JSON 处理已取消。"));
      jsonPendingRef.current = null;
    }
    jsonWorkerRef.current?.terminate();
    jsonWorkerRef.current = null;
  }

  function cancelJsonTask() {
    jsonCancelRequestedRef.current = true;
    terminateJsonWorker();
    setJsonBusy(false);
    showStatus("idle", "JSON 处理已取消。");
  }

  function getJsonWorker() {
    if (jsonWorkerRef.current) {
      return jsonWorkerRef.current;
    }

    const worker = new Worker("/tools-json-worker.js");
    worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; output?: string; message?: string; error?: string }>) => {
      const pending = jsonPendingRef.current;
      if (!pending || pending.id !== event.data.id) {
        return;
      }

      window.clearTimeout(pending.timeout);
      jsonPendingRef.current = null;
      if (event.data.ok && typeof event.data.output === "string" && event.data.message) {
        pending.resolve({ output: event.data.output, message: event.data.message });
        return;
      }
      pending.reject(new Error(enhanceJsonError(event.data.error || ("JSON 格式无效。"), pending.input)));
    };
    worker.onerror = (error) => {
      const pending = jsonPendingRef.current;
      if (pending) {
        window.clearTimeout(pending.timeout);
        jsonPendingRef.current = null;
        pending.reject(new Error(error.message || ("JSON 后台线程处理失败。")));
      }
      terminateJsonWorker();
    };
    jsonWorkerRef.current = worker;
    return worker;
  }

  function terminateUtilityWorker() {
    if (utilityPendingRef.current) {
      window.clearTimeout(utilityPendingRef.current.timeout);
      utilityPendingRef.current.reject(new Error("工具处理已取消。"));
      utilityPendingRef.current = null;
    }
    utilityWorkerRef.current?.terminate();
    utilityWorkerRef.current = null;
  }

  function clearHistoryTransitionTimers() {
    if (historyAnimationFrameRef.current) {
      window.cancelAnimationFrame(historyAnimationFrameRef.current);
      historyAnimationFrameRef.current = 0;
    }
    if (historyCloseTimerRef.current) {
      window.clearTimeout(historyCloseTimerRef.current);
      historyCloseTimerRef.current = 0;
    }
  }

  function openHistoryPanel() {
    clearHistoryTransitionTimers();
    setHistoryMounted(true);
    historyAnimationFrameRef.current = window.requestAnimationFrame(() => {
      historyAnimationFrameRef.current = 0;
      setHistoryVisible(true);
    });
  }

  function closeHistoryPanel() {
    clearHistoryTransitionTimers();
    setHistoryVisible(false);
    historyCloseTimerRef.current = window.setTimeout(() => {
      historyCloseTimerRef.current = 0;
      setHistoryMounted(false);
    }, historyDrawerTransitionMs);
  }

  function toggleHistoryPanel() {
    if (historyVisible) {
      closeHistoryPanel();
    } else {
      openHistoryPanel();
    }
  }

  const openCommandPalette = useCallback(() => {
    if (paletteCloseTimerRef.current) {
      window.clearTimeout(paletteCloseTimerRef.current);
      paletteCloseTimerRef.current = 0;
    }
    if (paletteAnimationFrameRef.current) {
      window.cancelAnimationFrame(paletteAnimationFrameRef.current);
      paletteAnimationFrameRef.current = 0;
    }
    setPaletteMounted(true);
    paletteAnimationFrameRef.current = window.requestAnimationFrame(() => {
      paletteAnimationFrameRef.current = 0;
      setPaletteVisible(true);
    });
  }, []);

  const closeCommandPalette = useCallback(() => {
    if (paletteAnimationFrameRef.current) {
      window.cancelAnimationFrame(paletteAnimationFrameRef.current);
      paletteAnimationFrameRef.current = 0;
    }
    setPaletteVisible(false);
    paletteCloseTimerRef.current = window.setTimeout(() => {
      paletteCloseTimerRef.current = 0;
      setPaletteMounted(false);
    }, historyDrawerTransitionMs);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    if (paletteVisibleRef.current) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
  }, [closeCommandPalette, openCommandPalette]);

  // ⌘K / Ctrl+K 打开或关闭工具切换面板。
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        toggleCommandPalette();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCommandPalette]);

  function getUtilityWorker() {
    if (utilityWorkerRef.current) {
      return utilityWorkerRef.current;
    }

    const worker = new Worker("/tools-utility-worker.js");
    worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; output?: string; structured?: RegexStructuredResultData; error?: string }>) => {
      const pending = utilityPendingRef.current;
      if (!pending || pending.id !== event.data.id) {
        return;
      }

      window.clearTimeout(pending.timeout);
      utilityPendingRef.current = null;
      if (event.data.ok && typeof event.data.output === "string") {
        pending.resolve({ output: event.data.output, structured: event.data.structured });
        return;
      }
      pending.reject(new Error(formatToolError(event.data.error, "工具处理失败。")));
    };
    worker.onerror = (error) => {
      const pending = utilityPendingRef.current;
      if (pending) {
        window.clearTimeout(pending.timeout);
        utilityPendingRef.current = null;
        pending.reject(new Error(error.message || ("工具后台线程处理失败。")));
      }
      terminateUtilityWorker();
    };
    utilityWorkerRef.current = worker;
    return worker;
  }

  function runUtilityInWorker(input: string, action: UtilityAction, options: Record<string, string> = {}) {
    return new Promise<UtilityWorkerResult>((resolve, reject) => {
      if (utilityPendingRef.current) {
        reject(new Error("另一个工具任务仍在处理中。"));
        return;
      }

      const worker = getUtilityWorker();
      const id = utilityRequestIdRef.current + 1;
      utilityRequestIdRef.current = id;
      const timeout = window.setTimeout(() => {
        if (utilityPendingRef.current?.id === id) {
          utilityPendingRef.current = null;
        }
        terminateUtilityWorker();
        reject(new Error("工具处理超时，请尝试更小的输入。"));
      }, utilityWorkerTimeoutMs);

      utilityPendingRef.current = { id, reject, resolve, timeout };
      worker.postMessage({ id, input, action, ...options });
    });
  }

  function runJsonInWorker(input: string, action: JsonAction, spaces: number) {
    return new Promise<JsonWorkerResult>((resolve, reject) => {
      if (jsonPendingRef.current) {
        reject(new Error("另一个 JSON 任务仍在处理中。"));
        return;
      }

      const worker = getJsonWorker();
      const id = jsonRequestIdRef.current + 1;
      jsonRequestIdRef.current = id;
      const timeout = window.setTimeout(() => {
        if (jsonPendingRef.current?.id === id) {
          jsonPendingRef.current = null;
        }
        terminateJsonWorker();
        reject(new Error("JSON 处理超时，请尝试更小的数据或更轻的操作。"));
      }, jsonWorkerTimeoutMs);

      jsonPendingRef.current = { id, input, reject, resolve, timeout };
      worker.postMessage({ id, input, action, spaces });
    });
  }

  function setToolOutput(tab: ToolTab, value: string) {
    if (tab === "json") setJsonOutput(value);
    if (tab === "encoding") setEncodingOutput(value);
    if (tab === "time") setTimeOutput(value);
    if (tab === "text") setTextOutput(value);
    if (tab === "jwt") setJwtOutput(value);
    if (tab === "hash") setHashOutput(value);
    if (tab === "uuid") setUuidOutput(value);
    if (tab === "regex") setRegexOutput(value);
    if (tab === "markdown") setMarkdownOutput(value);
    if (tab === "data") setStructuredOutput(value);
    if (tab === "csv") setCsvOutput(value);
    if (tab === "color") setColorOutput(value);
    if (tab === "xml") setXmlOutput(value);
  }

  function setOutput(value: string) {
    setStructuredResult(null);
    if (value) {
      setMobilePanel("output");
    }
    setToolOutput(activeTab, value);
  }

  function setToolInput(tab: ToolTab, value: string) {
    if (tab === "json") {
      setJsonInput(value);
      setJsonErrorHighlight(null);
    }
    if (tab === "encoding") setEncodingInput(value);
    if (tab === "time") setTimeInput(value);
    if (tab === "text") setTextInput(value);
    if (tab === "jwt") setJwtInput(value);
    if (tab === "hash") setHashInput(value);
    if (tab === "uuid") setUuidInput(value);
    if (tab === "regex") setRegexInput(value);
    if (tab === "markdown") setMarkdownInput(value);
    if (tab === "data") setStructuredInput(value);
    if (tab === "csv") setCsvInput(value);
    if (tab === "color") setColorInput(value);
    if (tab === "xml") setXmlInput(value);
  }

  function setInput(value: string) {
    setToolInput(activeTab, value);
  }

  function showStatus(type: "error" | "idle" | "success", message: string) {
    if (type !== "error") {
      return;
    }

    setOutput(formatToolErrorOutput(message));
  }

  function selectTool(tab: ToolTab) {
    setActiveTab(tab);
    setActiveGroup(toolGroupByTab[tab]);
    setMobilePanel("input");
    setStructuredResult(null);
    setCopiedTarget(null);
  }

  function selectToolFromPalette(tab: ToolTab) {
    selectTool(tab);
    closeCommandPalette();
  }

  async function copyText(value: string, target: "input" | "output") {
    if (!value) {
      showStatus("error", target === "input" ? labels.emptyInput : labels.emptyOutput);
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (!copyTextWithTextareaFallback(value)) {
        throw new Error("Clipboard fallback failed.");
      }
      setCopiedTarget(target);
      showStatus("success", labels.copiedMessage);
      window.setTimeout(() => setCopiedTarget(null), 1200);
    } catch {
      if (copyTextWithTextareaFallback(value)) {
        setCopiedTarget(target);
        showStatus("success", labels.copiedMessage);
        window.setTimeout(() => setCopiedTarget(null), 1200);
      } else {
        showStatus("error", labels.copyFailed);
      }
    }
  }

  function clearInput() {
    setInput("");
    if (activeTab === "text") {
      setTextSummary("");
    }
    showStatus("idle", "");
  }

  function clearOutput() {
    setOutput("");
    setStructuredResult(null);
    if (activeTab === "json") {
      setJsonErrorHighlight(null);
    }
    if (activeTab === "text") {
      setTextSummary("");
    }
    showStatus("idle", "");
  }

  function saveCurrentHistory() {
    if (!currentInput.trim()) {
      showStatus("error", labels.emptyHistoryInput);
      return;
    }
    setToolHistoryItems(saveToolHistoryItem(toolHistoryItems, activeTab, currentInput, currentOutput, getCurrentHistorySettings()));
    openHistoryPanel();
    showStatus("success", labels.historySavedMessage);
  }

  function restoreHistoryItem(item: ToolHistoryItem) {
    setActiveTab(item.tab);
    setActiveGroup(toolGroupByTab[item.tab]);
    restoreHistorySettings(item.settings);
    setToolInput(item.tab, item.input);
    setToolOutput(item.tab, item.output);
    setStructuredResult(null);
    setMobilePanel("input");
    closeHistoryPanel();
    showStatus("success", labels.historyRestoredMessage);
  }

  function getCurrentHistorySettings(): ToolHistorySettings {
    if (activeTab === "json") {
      return { jsonSpaces };
    }
    if (activeTab === "time") {
      return { timeDisplayMode, timestampUnit };
    }
    if (activeTab === "hash") {
      return { hashAlgorithm, hashOutputFormat };
    }
    if (activeTab === "uuid") {
      return { uuidFormat };
    }
    if (activeTab === "regex") {
      return { regexFlags, regexPattern, regexReplacement };
    }
    if (activeTab === "markdown") {
      return { markdownAutoPreview };
    }
    if (activeTab === "data") {
      return { structuredFormat };
    }
    if (activeTab === "csv") {
      return { csvDelimiter, csvEmptyAsNull, csvInferTypes, csvOutputMode };
    }
    if (activeTab === "xml") {
      return { xmlForceArrays, xmlIncludeAttributes, xmlJsonFormat, xmlStripNamespaces, xmlTrimText };
    }
    return {};
  }

  function restoreHistorySettings(settings: ToolHistorySettings) {
    if (settings.jsonSpaces) setJsonSpaces(settings.jsonSpaces);
    if (settings.timeDisplayMode) setTimeDisplayMode(settings.timeDisplayMode);
    if (settings.timestampUnit) setTimestampUnit(settings.timestampUnit);
    if (settings.hashAlgorithm) setHashAlgorithm(settings.hashAlgorithm);
    if (settings.hashOutputFormat) setHashOutputFormat(settings.hashOutputFormat);
    if (settings.uuidFormat) setUuidFormat(settings.uuidFormat);
    if (typeof settings.regexFlags === "string") setRegexFlags(settings.regexFlags);
    if (typeof settings.regexPattern === "string") setRegexPattern(settings.regexPattern);
    if (typeof settings.regexReplacement === "string") setRegexReplacement(settings.regexReplacement);
    if (typeof settings.markdownAutoPreview === "boolean") setMarkdownAutoPreview(settings.markdownAutoPreview);
    if (settings.structuredFormat) setStructuredFormat(settings.structuredFormat);
    if (settings.csvDelimiter) setCsvDelimiter(settings.csvDelimiter);
    if (typeof settings.csvEmptyAsNull === "boolean") setCsvEmptyAsNull(settings.csvEmptyAsNull);
    if (typeof settings.csvInferTypes === "boolean") setCsvInferTypes(settings.csvInferTypes);
    if (settings.csvOutputMode) setCsvOutputMode(settings.csvOutputMode);
    if (typeof settings.xmlForceArrays === "boolean") setXmlForceArrays(settings.xmlForceArrays);
    if (typeof settings.xmlIncludeAttributes === "boolean") setXmlIncludeAttributes(settings.xmlIncludeAttributes);
    if (settings.xmlJsonFormat) setXmlJsonFormat(settings.xmlJsonFormat);
    if (typeof settings.xmlStripNamespaces === "boolean") setXmlStripNamespaces(settings.xmlStripNamespaces);
    if (typeof settings.xmlTrimText === "boolean") setXmlTrimText(settings.xmlTrimText);
  }

  function deleteHistoryItem(id: string) {
    setToolHistoryItems(deleteToolHistoryItem(toolHistoryItems, id));
    showStatus("success", labels.historyDeletedMessage);
  }

  function clearCurrentToolHistory() {
    if (!toolHistoryItems.some((item) => item.tab === activeTab)) {
      return;
    }
    setToolHistoryItems(clearToolHistory(toolHistoryItems, activeTab));
    showStatus("success", labels.historyClearedMessage);
  }

  function clearAllToolHistory() {
    if (toolHistoryItems.length === 0) {
      return;
    }
    setToolHistoryItems(clearToolHistory(toolHistoryItems));
    showStatus("success", labels.historyClearedMessage);
  }

  function exchangeInputOutput() {
    const previousInput = currentInput;
    setInput(currentOutput);
    setOutput(previousInput);
    showStatus("success", labels.exchangedMessage);
  }

  function downloadOutput() {
    if (!currentOutput) {
      showStatus("error", labels.emptyOutput);
      return;
    }

    const downloadInfo = getDownloadInfo(activeTab);
    const blob = new Blob([currentOutput], { type: downloadInfo.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadInfo.filename ?? `zhizhi-${activeTab}-result.${downloadInfo.extension}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showStatus("success", labels.downloadedMessage);
  }

  async function importJsonFile(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      setJsonInput(content);
      setJsonErrorHighlight(null);
      setActiveTab("json");
      showStatus("success", `${labels.importedMessage} ${formatBytes(file.size)}.`);
    } catch {
      showStatus("error", labels.importFailed);
    } finally {
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = "";
      }
    }
  }

  async function importHashFile(file: File | null) {
    if (!file) {
      return;
    }

    if (file.size > hashFileLimitBytes) {
      showStatus(
        "error",
        `文件大小为 ${formatBytes(file.size)}。为了避免浏览器内存压力，文件 Hash 上限为 ${formatBytes(hashFileLimitBytes)}。`,
      );
      if (hashFileInputRef.current) {
        hashFileInputRef.current.value = "";
      }
      return;
    }

    try {
      setHashBusy(true);
      setActiveTab("hash");
      showStatus("idle", "正在计算文件 Hash...");
      if (file.size > hashFileWarningBytes) {
        showStatus(
          "idle",
          `检测到较大文件（${formatBytes(file.size)}），本地读取可能需要一点时间。`,
        );
      }
      const digest = await crypto.subtle.digest(hashAlgorithm, await file.arrayBuffer());
      const result = formatHashResult(digest, hashAlgorithm, hashOutputFormat, file.size, file.name);
      setHashInput(`文件：${file.name}`);
      setHashOutput(result.raw);
      setStructuredResult({ type: "hash", data: result.structured });
      setMobilePanel("output");
      showStatus("success", "文件 Hash 已在本地计算完成。");
    } catch (error) {
      showStatus("error", formatToolError(error, "文件 Hash 计算失败。"));
    } finally {
      setHashBusy(false);
      if (hashFileInputRef.current) {
        hashFileInputRef.current.value = "";
      }
    }
  }

  function moveOutputToInput() {
    if (!currentOutput) return;
    setInput(currentOutput);
    showStatus("success", labels.movedMessage);
  }

  async function runJson(action: JsonAction) {
    const inputBytes = new TextEncoder().encode(jsonInput).byteLength;
    jsonCancelRequestedRef.current = false;
    setJsonBusy(true);
    if (inputBytes > jsonLargeInputBytes) {
      showStatus("idle", "检测到较大的 JSON，正在用后台线程处理，页面会保持可操作。");
    } else {
      showStatus("idle", "正在处理 JSON...");
    }

    try {
      const result = await runJsonInWorker(jsonInput, action, Number(jsonSpaces));
      setJsonOutput(result.output);
      setJsonErrorHighlight(null);
      setJsonValidity({ type: "valid", message: "JSON 有效" });
      setMobilePanel("output");
      showStatus("success", result.message);
    } catch (error) {
      if (jsonCancelRequestedRef.current) {
        showStatus("idle", "JSON 处理已取消。");
      } else {
        const errorMessage = formatToolError(error, "JSON 格式无效。");
        setJsonErrorHighlight(getJsonErrorHighlight(errorMessage, jsonInput));
        setJsonOutput(formatJsonErrorOutput(errorMessage));
        setJsonValidity({ type: "error", message: "JSON 无效" });
        setStructuredResult(null);
        setMobilePanel("output");
      }
    } finally {
      jsonCancelRequestedRef.current = false;
      setJsonBusy(false);
    }
  }

  function repairJson() {
    if (!jsonInput.trim()) {
      return;
    }
    const repaired = repairJsonText(jsonInput);
    if (repaired !== jsonInput) {
      setJsonInput(repaired);
      setJsonErrorHighlight(null);
    }
  }

  // 解开被多次 stringify 的 JSON：整段值本身是个 JSON 字符串时，逐层解到非字符串为止。
  function unwrapJsonString() {
    const trimmed = jsonInput.trim();
    if (!trimmed) {
      return;
    }
    try {
      let parsed: unknown = JSON.parse(trimmed);
      let unwrapped = false;
      while (typeof parsed === "string") {
        const inner = parsed.trim();
        try {
          parsed = JSON.parse(inner);
          unwrapped = true;
        } catch {
          break;
        }
      }
      if (unwrapped) {
        setJsonInput(JSON.stringify(parsed, null, Number(jsonSpaces)));
        setJsonErrorHighlight(null);
      }
    } catch {
      // 整段不是合法 JSON，无法解开，保持原样。
    }
  }

  async function runEncoding(action: EncodingAction) {
    try {
      const input = encodingInput;
      const inputMetrics = getTextMetrics(input);
      if (action === "base64Encode" || action === "base64Decode") {
        setEncodingBusy(true);
        showStatus("idle", "正在后台线程处理 Base64...");
        const result = await runUtilityInWorker(input, action);
        setEncodingOutput(result.output);
        setMobilePanel("output");
        showStatus("success", `${"Base64 转换完成。"}${largeInputSuffix(inputMetrics.bytes)}`);
        return;
      }

      const result = {
        urlEncode: () => encodeURIComponent(input),
        urlDecode: () => decodeURIComponent(input),
        unicodeEscape: () => unicodeEscape(input),
        unicodeUnescape: () => unicodeUnescape(input),
        htmlEscape: () => htmlEscape(input),
        htmlUnescape: () => htmlUnescape(input),
      }[action]();
      setEncodingOutput(result);
      setMobilePanel("output");
      showStatus("success", `${"编码转换完成。"}${largeInputSuffix(inputMetrics.bytes)}`);
    } catch (error) {
      showStatus("error", formatToolError(error, "转换失败。"));
    } finally {
      setEncodingBusy(false);
    }
  }

  function runTime(action: "now" | "timestampToDate" | "dateToTimestamp") {
    try {
      const now = new Date();
      if (action === "now") {
        const output = formatDateReport(now, timeDisplayMode);
        setTimeInput(formatCurrentTimestampInput(now, timestampUnit));
        setTimeOutput(output);
        setMobilePanel("output");
        showStatus("success", "已生成当前时间。");
        return;
      }

      if (action === "timestampToDate") {
        const raw = timeInput.trim();
        const timestamp = Number(raw);
        if (!Number.isFinite(timestamp)) throw new Error("请输入有效时间戳。");
        const milliseconds = normalizeTimestampToMilliseconds(timestamp, timestampUnit);
        setTimeOutput(formatDateReport(new Date(milliseconds), timeDisplayMode));
        setMobilePanel("output");
        showStatus("success", "时间戳已转换。");
        return;
      }

      const parsedDate = new Date(timeInput.trim());
      if (Number.isNaN(parsedDate.getTime())) throw new Error("请输入有效日期字符串。");
      setTimeOutput(formatDateReport(parsedDate, timeDisplayMode));
      setMobilePanel("output");
      showStatus("success", "日期已转换。");
    } catch (error) {
      showStatus("error", formatToolError(error, "时间转换失败。"));
    }
  }

  async function runText(action: TextAction) {
    const inputMetrics = getTextMetrics(textInput);
    try {
      setTextBusy(true);
      const lines = textInput.split(/\r?\n/);
      const result = {
        trimLines: () => lines.map((line) => line.trim()).join("\n"),
        removeEmpty: () => lines.filter((line) => line.trim()).join("\n"),
        dedupe: () => dedupeTextLines(lines, { ignoreCase: textDedupeIgnoreCase, keepOrder: textDedupeKeepOrder, trim: textDedupeTrim }),
        sortAsc: () => sortTextLines(lines, { descending: false, removeEmpty: textSortRemoveEmpty, trim: textSortTrim }),
        sortDesc: () => sortTextLines(lines, { descending: true, removeEmpty: textSortRemoveEmpty, trim: textSortTrim }),
        lower: () => textInput.toLowerCase(),
        upper: () => textInput.toUpperCase(),
        collapseSpaces: () => textInput.replace(/[^\S\r\n]+/g, " "),
        normalizeLineEndings: () => textInput.replace(/\r\n?/g, "\n"),
        removeZeroWidth: () => textInput.replace(/[\u200b-\u200d\ufeff]/g, ""),
        tabsToSpaces: () => textInput.replace(/\t/g, "  "),
      }[action]();
      setTextOutput(result);
      setTextSummary(formatTextSummary(action, textInput, result));
      setMobilePanel("output");
      showStatus("success", `${"文本处理完成。"}${largeInputSuffix(inputMetrics.bytes)}`);
    } catch (error) {
      showStatus("error", formatToolError(error, "文本处理失败。"));
    } finally {
      setTextBusy(false);
    }
  }

  function runJwtDecode() {
    try {
      const result = decodeJwtInput(jwtInput);
      if (result.normalizedToken !== jwtInput.trim()) {
        setJwtInput(result.normalizedToken);
      }
      setJwtOutput(result.raw);
      setStructuredResult({ type: "jwt", data: result.structured });
      setMobilePanel("output");
      showStatus("success", "JWT 已在本地解码，未验证签名。");
    } catch (error) {
      showStatus("error", formatToolError(error, "JWT 解码失败。"));
    }
  }

  async function runHash() {
    try {
      setHashBusy(true);
      showStatus("idle", "正在计算 Hash...");
      const digest = await crypto.subtle.digest(hashAlgorithm, new TextEncoder().encode(hashInput));
      const result = formatHashResult(digest, hashAlgorithm, hashOutputFormat, getTextMetrics(hashInput).bytes);
      setHashOutput(result.raw);
      setStructuredResult({ type: "hash", data: result.structured });
      setMobilePanel("output");
      showStatus("success", `${hashAlgorithm} ${"摘要已生成。"}`);
    } catch (error) {
      showStatus("error", formatToolError(error, "Hash 计算失败。"));
    } finally {
      setHashBusy(false);
    }
  }

  function runUuidGenerate() {
    const count = Math.min(1000, Math.max(1, Number.parseInt(uuidInput.trim(), 10) || 1));
    const values = Array.from({ length: count }, () => crypto.randomUUID());
    setUuidInput(String(count));
    setUuidOutput(formatUuidValues(values, uuidFormat));
    setMobilePanel("output");
    showStatus("success", `已生成 ${count} 个 UUID v4。`);
  }

  async function runRegexTest() {
    try {
      setRegexBusy(true);
      showStatus("idle", "正在后台线程测试正则...");
      const result = await runUtilityInWorker(regexInput, "regexTest", { flags: normalizeRegexFlags(regexFlags), pattern: regexPattern });
      setRegexOutput(result.output);
      setStructuredResult(result.structured ? { type: "regex", data: result.structured } : null);
      setMobilePanel("output");
      showStatus("success", "正则测试完成。");
    } catch (error) {
      showStatus("error", formatToolError(error, "正则测试失败。"));
    } finally {
      setRegexBusy(false);
    }
  }

  async function runRegexReplace() {
    try {
      setRegexBusy(true);
      showStatus("idle", "正在后台线程执行正则替换...");
      const result = await runUtilityInWorker(regexInput, "regexReplace", { flags: normalizeRegexFlags(regexFlags), pattern: regexPattern, replacement: regexReplacement });
      setRegexOutput(result.output);
      setStructuredResult(null);
      setMobilePanel("output");
      showStatus("success", "正则替换完成。");
    } catch (error) {
      showStatus("error", formatToolError(error, "正则替换失败。"));
    } finally {
      setRegexBusy(false);
    }
  }

  function runMarkdownPreview() {
    try {
      setMarkdownOutput(sanitizeMarkdownPreviewHtml(renderMarkdownPreview(markdownInput)));
      setMobilePanel("output");
      showStatus("success", "Markdown 预览已在本地生成。");
    } catch (error) {
      showStatus("error", formatToolError(error, "Markdown 预览失败。"));
    }
  }

  function runStructuredToJson() {
    try {
      const value = structuredFormat === "yaml" ? parseYamlDocument(structuredInput) : parseTomlDocument(structuredInput);
      setStructuredOutput(JSON.stringify(value, null, 2));
      setMobilePanel("output");
      showStatus("success", `${structuredFormat.toUpperCase()} 已转换为 JSON。`);
    } catch (error) {
      showStatus("error", formatToolError(error, "转换失败。"));
    }
  }

  function runCsvToJson() {
    try {
      const output = convertDelimitedTextToJson(csvInput, csvDelimiter, { emptyAsNull: csvEmptyAsNull, inferTypes: csvInferTypes, outputMode: csvOutputMode });
      setCsvOutput(output);
      setMobilePanel("output");
      showStatus("success", "表格数据已转换为 JSON。");
    } catch (error) {
      showStatus("error", formatToolError(error, "CSV 转换失败。"));
    }
  }

  function runXmlToJson() {
    try {
      const options: XmlToJsonOptions = {
        forceArrays: xmlForceArrays,
        includeAttributes: xmlIncludeAttributes,
        stripNamespaces: xmlStripNamespaces,
        trimText: xmlTrimText,
      };
      const value = parseXmlToJson(xmlInput, options);
      setXmlOutput(formatXmlJson(value, xmlJsonFormat));
      setMobilePanel("output");
      showStatus("success", `XML 已转换为 JSON。${xmlInputIsLarge ? " 较大 XML 可能需要几秒，浏览器短暂卡顿属正常。" : ""}`);
    } catch (error) {
      const message = formatToolError(error, "XML 转换失败。");
      setXmlOutput(formatXmlErrorOutput(message));
      setMobilePanel("output");
      showStatus("error", message);
    }
  }

  function updateXmlJsonFormat(format: XmlJsonFormat) {
    setXmlJsonFormat(format);
    if (!xmlOutput.trim() || isToolErrorOutput(xmlOutput)) {
      return;
    }

    try {
      setXmlOutput(formatXmlJson(JSON.parse(xmlOutput), format));
    } catch {
      // The output may be user-edited or from an older error state; keep it unchanged.
    }
  }

  function runColorConvert() {
    try {
      setColorOutput(formatColorReport(parseColorValue(colorInput)));
      setMobilePanel("output");
      showStatus("success", "颜色已转换。");
    } catch (error) {
      showStatus("error", formatToolError(error, "颜色转换失败。"));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {paletteMounted ? (
        <ToolCommandPalette
          open={paletteVisible}
          tools={paletteTools}
          groups={toolGroups}
          group={activeGroup}
          activeTab={activeTab}
          onGroupChange={setActiveGroup}
          onSelect={selectToolFromPalette}
          onClose={closeCommandPalette}
        />
      ) : null}
      <section
        aria-labelledby="tools-active-tool-heading"
        className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${expandedWorkspace ? "max-w-[108rem]" : "max-w-7xl"}`}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 pb-4">
            <div className="flex items-start gap-2.5">
              <span className="icon-action mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-accent">
                <ActiveIcon className="h-4 w-4" />
              </span>
              <div>
                <h2 id="tools-active-tool-heading" className="text-base font-semibold text-foreground">{activeTabInfo.label}</h2>
                <p className="mt-0.5 max-w-3xl text-xs leading-5 text-muted">{activeTabInfo.description}</p>
              </div>
            </div>
            <button
              type="button"
              data-tools-palette-trigger="true"
              aria-haspopup="dialog"
              aria-expanded={paletteVisible}
              onClick={toggleCommandPalette}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-accent/40 bg-accent/12 px-3.5 text-xs font-semibold text-accent shadow-[var(--shadow-quiet)] transition hover:border-accent/60 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>切换工具</span>
              <span className="inline-flex items-center rounded-full bg-accent/22 px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none">{visibleTabLabels.length}</span>
            </button>
          </div>

          {!isStandaloneTool(activeTab) && activeTab !== "json" && activeTab !== "xml" && activeTab !== "text" ? (
          <div className="rounded-md bg-paper/54 p-2.5">
            {activeTab === "encoding" ? <EncodingControls runEncoding={runEncoding} busy={encodingBusy} /> : null}
            {activeTab === "time" ? (
              <TimeControls
                displayMode={timeDisplayMode}
                runTime={runTime}
                timestampUnit={timestampUnit}
                onDisplayModeChange={setTimeDisplayMode}
                onTimestampUnitChange={setTimestampUnit}
              />
            ) : null}
            {activeTab === "jwt" ? <JwtControls onDecode={runJwtDecode} /> : null}
            {activeTab === "hash" ? (
              <HashControls
                algorithm={hashAlgorithm}
                busy={hashBusy}
                outputFormat={hashOutputFormat}
                onAlgorithmChange={setHashAlgorithm}
                onImportClick={() => hashFileInputRef.current?.click()}
                onOutputFormatChange={setHashOutputFormat}
                onRun={runHash}
              />
            ) : null}
            {activeTab === "uuid" ? <UuidControls format={uuidFormat} onFormatChange={setUuidFormat} onRun={runUuidGenerate} /> : null}
            {activeTab === "regex" ? (
              <RegexControls
                busy={regexBusy}
                flags={regexFlags}
                pattern={regexPattern}
                replacement={regexReplacement}
                onFlagsChange={setRegexFlags}
                onPatternChange={setRegexPattern}
                onReplace={runRegexReplace}
                onReplacementChange={setRegexReplacement}
                onRun={runRegexTest}
              />
            ) : null}
            {activeTab === "markdown" ? (
              <MarkdownControls autoPreview={markdownAutoPreview} onAutoPreviewChange={setMarkdownAutoPreview} onRun={runMarkdownPreview} />
            ) : null}
            {activeTab === "data" ? <StructuredControls format={structuredFormat} onFormatChange={setStructuredFormat} onRun={runStructuredToJson} /> : null}
            {activeTab === "csv" ? (
              <CsvControls
                delimiter={csvDelimiter}
                emptyAsNull={csvEmptyAsNull}
                inferTypes={csvInferTypes}
                outputMode={csvOutputMode}
                onDelimiterChange={setCsvDelimiter}
                onEmptyAsNullChange={setCsvEmptyAsNull}
                onInferTypesChange={setCsvInferTypes}
                onOutputModeChange={setCsvOutputMode}
                onRun={runCsvToJson}
              />
            ) : null}
            {activeTab === "color" ? <ColorControls onRun={runColorConvert} /> : null}
          </div>
          ) : null}

          {historyMounted ? (
            <ToolHistoryPanel
              activeTab={activeTab}
              open={historyVisible}
              items={toolHistoryItems}
              labels={labels}
              search={historySearch}
              onClearAll={clearAllToolHistory}
              onClearCurrent={clearCurrentToolHistory}
              onClose={closeHistoryPanel}
              onDelete={deleteHistoryItem}
              onRestore={restoreHistoryItem}
              onSearchChange={setHistorySearch}
            />
          ) : null}

          {activeTab === "image" ? <ImageTool /> : null}
          {activeTab === "watermark" ? <ImageWatermarkTool /> : null}
          {activeTab === "linkQr" ? <LinkQrTool /> : null}
          {activeTab === "wechatQr" ? <WechatQrTool /> : null}
          {activeTab === "crop" ? <ImageCropTool /> : null}
          {activeTab === "idPhoto" ? <IdPhotoTool /> : null}
          {activeTab === "qrDecode" ? <QrDecodeTool /> : null}
          {activeTab === "imageBase64" ? <ImageBase64Tool /> : null}
          {activeTab === "diff" ? <DiffTool /> : null}
          {activeTab === "jsonToTs" ? <JsonToTsTool /> : null}
          {activeTab === "tokenCount" ? <TokenCounterTool /> : null}
          {activeTab === "seoAudit" ? <SeoAeoGeoTool /> : null}

          {!isStandaloneTool(activeTab) ? (
            <>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-accent/8 p-1 lg:hidden">
            <button
              className={`h-8 rounded text-xs font-semibold transition ${mobilePanel === "input" ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
              type="button"
              aria-pressed={mobilePanel === "input"}
              onClick={() => setMobilePanel("input")}
            >
              {labels.input}
            </button>
            <button
              className={`h-8 rounded text-xs font-semibold transition ${mobilePanel === "output" ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"}`}
              type="button"
              aria-pressed={mobilePanel === "output"}
              onClick={() => setMobilePanel("output")}
            >
              {labels.output}
            </button>
          </div>

          <div className={`grid gap-4 ${expandedWorkspace ? "lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[1fr] xl:gap-5" : "lg:grid-cols-2"}`}>
            <div className={`${mobilePanel === "input" ? "block" : "hidden lg:block"}${expandedWorkspace ? " lg:min-h-0" : ""}`}>
              {activeTab === "color" ? <ColorPickStudio onPick={setColorInput} /> : null}
              <EditorPanel
                label={labels.input}
                value={currentInput}
                onChange={setInput}
                metrics={currentInputMetrics}
                placeholder={activeTab === "time" ? "输入时间戳或日期字符串" : activeTab === "xml" ? "粘贴 XML 后点击「转 JSON」。属性会转成 @id，文本会转成 #text。" : activeTab === "text" ? "粘贴文本、名单或多行内容后选择处理方式。" : undefined}
                size={panelSize}
                highlight={activeTab === "json" ? jsonErrorHighlight : null}
                resizable={activeTab !== "json"}
                fill={expandedWorkspace}
                actions={
                  <>
                    {activeTab === "json" ? (
                      <>
                        <PanelActionButton primary disabled={jsonBusy} label={"格式化"} onClick={() => runJson("format")}>{"格式化"}</PanelActionButton>
                        <PanelOverflowMenu
                          triggerLabel={"转换"}
                          disabled={jsonBusy}
                          items={[
                            { key: "sort", label: "Key 升序", onClick: () => runJson("sort") },
                            { key: "sortDesc", label: "Key 降序", onClick: () => runJson("sortDesc") },
                            { key: "escape", label: "字符串转义", onClick: () => runJson("escape") },
                            { key: "unescape", label: "字符串反转义", onClick: () => runJson("unescape") },
                            { key: "flatten", label: "扁平化", onClick: () => runJson("flatten") },
                            { key: "unflatten", label: "还原扁平 JSON", onClick: () => runJson("unflatten") },
                            { key: "unwrap", label: "解开转义 JSON", onClick: unwrapJsonString },
                          ]}
                        />
                        <JsonStatusBadge busy={jsonBusy} validity={jsonValidity} onCancel={cancelJsonTask} />
                      </>
                    ) : null}
                    {activeTab === "xml" ? (
                      <>
                        <PanelActionButton primary label={"转 JSON"} onClick={runXmlToJson}>{"转 JSON"}</PanelActionButton>
                        <PanelOverflowMenu
                          triggerLabel={"选项"}
                          items={[
                            { key: "attributes", label: xmlIncludeAttributes ? "保留属性 ✓" : "保留属性", active: xmlIncludeAttributes, onClick: () => setXmlIncludeAttributes(!xmlIncludeAttributes) },
                            { key: "trim", label: xmlTrimText ? "清理文本空白 ✓" : "清理文本空白", active: xmlTrimText, onClick: () => setXmlTrimText(!xmlTrimText) },
                            { key: "arrays", label: xmlForceArrays ? "重复节点转数组 ✓" : "重复节点转数组", active: xmlForceArrays, onClick: () => setXmlForceArrays(!xmlForceArrays) },
                            { key: "namespaces", label: xmlStripNamespaces ? "移除命名空间前缀 ✓" : "移除命名空间前缀", active: xmlStripNamespaces, onClick: () => setXmlStripNamespaces(!xmlStripNamespaces) },
                          ]}
                        />
                        {xmlInputIsLarge ? <PanelInlineHint>{"较大 XML 可能需要几秒"}</PanelInlineHint> : null}
                      </>
                    ) : null}
                    {activeTab === "text" ? (
                      <>
                        <PanelActionButton primary disabled={textBusy} label={"清理空白"} onClick={() => runText("trimLines")}>{"清理空白"}</PanelActionButton>
                        <PanelActionButton disabled={textBusy} label={"清理空行"} onClick={() => runText("removeEmpty")}>{"清理空行"}</PanelActionButton>
                        <PanelActionButton disabled={textBusy} label={"行去重"} onClick={() => runText("dedupe")}>{"行去重"}</PanelActionButton>
                        <PanelOverflowMenu
                          triggerLabel={"转换"}
                          disabled={textBusy}
                          items={[
                            { key: "sortAsc", label: "升序排序", onClick: () => runText("sortAsc") },
                            { key: "sortDesc", label: "降序排序", onClick: () => runText("sortDesc") },
                            { key: "lower", label: "转小写", onClick: () => runText("lower") },
                            { key: "upper", label: "转大写", onClick: () => runText("upper") },
                            { key: "collapseSpaces", label: "合并连续空格", onClick: () => runText("collapseSpaces") },
                            { key: "tabsToSpaces", label: "Tab 转空格", onClick: () => runText("tabsToSpaces") },
                            { key: "zeroWidth", label: "移除零宽字符", onClick: () => runText("removeZeroWidth") },
                            { key: "lineEndings", label: "统一换行符", onClick: () => runText("normalizeLineEndings") },
                            { key: "dedupeTrim", label: textDedupeTrim ? "去重忽略首尾空白 ✓" : "去重忽略首尾空白", active: textDedupeTrim, onClick: () => setTextDedupeTrim(!textDedupeTrim) },
                            { key: "dedupeCase", label: textDedupeIgnoreCase ? "去重忽略大小写 ✓" : "去重忽略大小写", active: textDedupeIgnoreCase, onClick: () => setTextDedupeIgnoreCase(!textDedupeIgnoreCase) },
                            { key: "dedupeOrder", label: textDedupeKeepOrder ? "去重保留原顺序 ✓" : "去重保留原顺序", active: textDedupeKeepOrder, onClick: () => setTextDedupeKeepOrder(!textDedupeKeepOrder) },
                            { key: "sortTrim", label: textSortTrim ? "排序前清理空白 ✓" : "排序前清理空白", active: textSortTrim, onClick: () => setTextSortTrim(!textSortTrim) },
                            { key: "sortEmpty", label: textSortRemoveEmpty ? "排序前去空行 ✓" : "排序前去空行", active: textSortRemoveEmpty, onClick: () => setTextSortRemoveEmpty(!textSortRemoveEmpty) },
                          ]}
                        />
                        {textInputIsLarge ? <PanelInlineHint>{"大文本可能需要几秒"}</PanelInlineHint> : null}
                      </>
                    ) : null}
                    <PanelActionButton icon={Clipboard} label={activeTab === "xml" && copiedTarget === "input" ? "已复制 XML" : copiedTarget === "input" ? labels.copied : labels.copy} onClick={() => copyText(currentInput, "input")}>
                      {activeTab === "xml" && copiedTarget === "input" ? "已复制 XML" : copiedTarget === "input" ? labels.copied : labels.copy}
                    </PanelActionButton>
                    {activeTab === "json" ? (
                      <PanelActionButton disabled={jsonBusy} label={"尝试修复"} onClick={repairJson}>{"尝试修复"}</PanelActionButton>
                    ) : activeTab === "xml" || activeTab === "text" ? null : (
                      <PanelClearButton label={labels.clear} prompt={labels.confirmClearPrompt} confirmLabel={labels.confirmClearAction} cancelLabel={labels.cancel} onConfirm={clearInput} />
                    )}
                    <PanelOverflowMenu
                      items={[
                        ...(activeTab === "json"
                          ? [
                              { key: "clear", label: labels.clear, icon: Trash2, onClick: clearInput },
                              { key: "import", label: labels.importJson, icon: Upload, onClick: () => jsonFileInputRef.current?.click() },
                            ]
                          : activeTab === "xml"
                            ? [
                                { key: "clear", label: labels.clear, icon: Trash2, onClick: clearInput },
                              ]
                          : activeTab === "text"
                            ? [
                                { key: "clear", label: labels.clear, icon: Trash2, onClick: clearInput },
                              ]
                          : []),
                        { key: "save", label: labels.saveHistory, icon: Save, onClick: saveCurrentHistory },
                        { key: "history", label: labels.history, icon: History, onClick: toggleHistoryPanel },
                      ]}
                    />
                  </>
                }
              />
            </div>
            <div className={`${mobilePanel === "output" ? "block" : "hidden lg:block"}${expandedWorkspace ? " lg:min-h-0" : ""}`}>
              {activeTab === "color" ? (
                <ColorResultPanel
                  input={colorInput}
                  label={labels.output}
                  metrics={currentOutputMetrics}
                  output={colorOutput}
                  size={panelSize}
                  onClear={clearOutput}
                  onCopy={(value) => void copyText(value, "output")}
                  onDownload={downloadOutput}
                />
              ) : activeTab === "markdown" ? (
                <MarkdownPreviewPanel
                  html={markdownOutput}
                  label={labels.output}
                  metrics={currentOutputMetrics}
                  size={panelSize}
                  fill={expandedWorkspace}
                  actions={
                    <>
                      <PanelActionButton icon={Clipboard} label={copiedTarget === "output" ? labels.copied : labels.copy} onClick={() => copyText(currentOutput, "output")}>
                        {copiedTarget === "output" ? labels.copied : labels.copy}
                      </PanelActionButton>
                      <PanelActionButton icon={Download} label={labels.download} onClick={downloadOutput}>{labels.download}</PanelActionButton>
                      <PanelClearButton label={labels.clear} prompt={labels.confirmClearPrompt} confirmLabel={labels.confirmClearAction} cancelLabel={labels.cancel} onConfirm={clearOutput} />
                    </>
                  }
                />
              ) : activeTab === "json" ? (
                <JsonOutputPanel
                  label={labels.output}
                  metrics={currentOutputMetrics}
                  output={jsonOutput}
                  size={panelSize}
                  fill={expandedWorkspace}
                  actions={
                    <>
                      <Select
                        size="xs"
                        className="w-20"
                        ariaLabel={labels.spaces}
                        value={jsonSpaces}
                        onChange={setJsonSpaces}
                        options={[
                          { label: "2 空格", value: "2" },
                          { label: "4 空格", value: "4" },
                          { label: "6 空格", value: "6" },
                        ]}
                      />
                      <PanelActionButton active={jsonAutoFormat} label={"自动格式化"} onClick={() => setJsonAutoFormat(!jsonAutoFormat)}>
                        {jsonAutoFormat ? "自动格式化 ✓" : "自动格式化"}
                      </PanelActionButton>
                      <PanelActionButton icon={Clipboard} label={copiedTarget === "output" ? labels.copied : labels.copy} onClick={() => copyText(currentOutput, "output")}>
                        {copiedTarget === "output" ? labels.copied : labels.copy}
                      </PanelActionButton>
                      <PanelActionButton disabled={jsonBusy} label={"压缩"} onClick={() => runJson("minify")}>{"压缩"}</PanelActionButton>
                      <PanelOverflowMenu
                        items={[
                          { key: "clear", label: labels.clear, icon: Trash2, onClick: clearOutput },
                          { key: "swap", label: labels.swap, icon: ArrowDownToLine, onClick: moveOutputToInput },
                          { key: "exchange", label: labels.exchange, icon: ArrowRightLeft, onClick: exchangeInputOutput },
                          { key: "download", label: labels.download, icon: Download, onClick: downloadOutput },
                        ]}
                      />
                    </>
                  }
                />
              ) : activeTab === "xml" ? (
                <JsonOutputPanel
                  label={labels.output}
                  metrics={currentOutputMetrics}
                  output={xmlOutput}
                  size={panelSize}
                  fill={expandedWorkspace}
                  emptyMessage={"粘贴 XML 后点击「转 JSON」，这里会显示转换结果。属性会转成 @，文本/CDATA 会转成 #text，注释会忽略。"}
                  actions={
                    <>
                      <PanelInlineHint>{"属性转 @id · 文本/CDATA 转 #text · 注释忽略"}</PanelInlineHint>
                      <Select
                        size="xs"
                        className="w-20"
                        ariaLabel={"JSON 格式"}
                        value={xmlIndentFormat}
                        onChange={(value) => updateXmlJsonFormat(value as XmlJsonFormat)}
                        options={[
                          { label: "2 空格", value: "2" },
                          { label: "4 空格", value: "4" },
                          { label: "6 空格", value: "6" },
                        ]}
                      />
                      <PanelActionButton icon={Clipboard} label={copiedTarget === "output" ? "已复制 JSON" : labels.copy} onClick={() => copyText(currentOutput, "output")}>
                        {copiedTarget === "output" ? "已复制 JSON" : labels.copy}
                      </PanelActionButton>
                      <PanelActionButton active={xmlJsonFormat === "compact"} label={"压缩"} onClick={() => updateXmlJsonFormat("compact")}>{"压缩"}</PanelActionButton>
                      <PanelOverflowMenu
                        items={[
                          { key: "clear", label: labels.clear, icon: Trash2, onClick: clearOutput },
                          { key: "swap", label: labels.swap, icon: ArrowDownToLine, onClick: moveOutputToInput },
                          { key: "exchange", label: labels.exchange, icon: ArrowRightLeft, onClick: exchangeInputOutput },
                          { key: "download", label: labels.download, icon: Download, onClick: downloadOutput },
                        ]}
                      />
                    </>
                  }
                />
              ) : activeTab === "jwt" || activeTab === "hash" || activeTab === "regex" ? (
                <StructuredResultPanel
                  label={labels.output}
                  metrics={currentOutputMetrics}
                  output={currentOutput}
                  result={structuredResult?.type === activeTab ? structuredResult : null}
                  size={panelSize}
                  actions={
                    <>
                      <PanelActionButton icon={Clipboard} label={copiedTarget === "output" ? labels.copied : labels.copy} onClick={() => copyText(currentOutput, "output")}>
                        {copiedTarget === "output" ? labels.copied : labels.copy}
                      </PanelActionButton>
                      <PanelClearButton label={labels.clear} prompt={labels.confirmClearPrompt} confirmLabel={labels.confirmClearAction} cancelLabel={labels.cancel} onConfirm={clearOutput} />
                      <PanelOverflowMenu
                        items={[
                          { key: "swap", label: labels.swap, icon: ArrowDownToLine, onClick: moveOutputToInput },
                          { key: "exchange", label: labels.exchange, icon: ArrowRightLeft, onClick: exchangeInputOutput },
                          { key: "download", label: labels.download, icon: Download, onClick: downloadOutput },
                        ]}
                      />
                    </>
                  }
                />
              ) : (
                <EditorPanel
                  label={labels.output}
                  value={currentOutput}
                  onChange={setOutput}
                  metrics={currentOutputMetrics}
                  readOnly
                  placeholder={activeTab === "text" ? "处理后的文本会显示在这里。" : undefined}
                  size={panelSize}
                  fill={expandedWorkspace}
                  actions={
                    <>
                      {activeTab === "text" && textSummary ? <PanelInlineHint>{textSummary}</PanelInlineHint> : null}
                      <PanelActionButton icon={Clipboard} label={copiedTarget === "output" ? labels.copied : labels.copy} onClick={() => copyText(currentOutput, "output")}>
                        {copiedTarget === "output" ? labels.copied : labels.copy}
                      </PanelActionButton>
                      {activeTab === "text" ? null : <PanelClearButton label={labels.clear} prompt={labels.confirmClearPrompt} confirmLabel={labels.confirmClearAction} cancelLabel={labels.cancel} onConfirm={clearOutput} />}
                      <PanelOverflowMenu
                        items={[
                          ...(activeTab === "text" ? [{ key: "clear", label: labels.clear, icon: Trash2, onClick: clearOutput }] : []),
                          { key: "swap", label: labels.swap, icon: ArrowDownToLine, onClick: moveOutputToInput },
                          { key: "exchange", label: labels.exchange, icon: ArrowRightLeft, onClick: exchangeInputOutput },
                          { key: "download", label: labels.download, icon: Download, onClick: downloadOutput },
                        ]}
                      />
                    </>
                  }
                />
              )}
            </div>
          </div>
            </>
          ) : null}

          <input
            ref={jsonFileInputRef}
            className="hidden"
            type="file"
            accept=".json,application/json,text/plain"
            onChange={(event) => void importJsonFile(event.target.files?.[0] ?? null)}
          />
          <input
            ref={hashFileInputRef}
            className="hidden"
            type="file"
            onChange={(event) => void importHashFile(event.target.files?.[0] ?? null)}
          />

          <p className="flex items-center gap-1.5 text-[0.75rem] font-medium text-muted">
            <Lock className="h-3 w-3 shrink-0 text-accent" />
            所有工具均在浏览器本地运行
          </p>
        </div>
      </section>
    </div>
  );
}

type ToolCopyLabels = typeof copyLabels;

function ToolHistoryPanel({
  activeTab,
  items,
  labels,
  open,
  search,
  onClearAll,
  onClearCurrent,
  onClose,
  onDelete,
  onRestore,
  onSearchChange,
}: {
  activeTab: ToolTab;
  items: ToolHistoryItem[];
  labels: ToolCopyLabels;
  open: boolean;
  search: string;
  onClearAll: () => void;
  onClearCurrent: () => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRestore: (item: ToolHistoryItem) => void;
  onSearchChange: (value: string) => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<"all" | "current" | null>(null);
  const [historyScope, setHistoryScope] = useState<"all" | "current">("current");
  const currentToolItems = items.filter((item) => item.tab === activeTab);
  const scopedItems = historyScope === "current" ? currentToolItems : items;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = scopedItems.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }
    const toolLabel = getToolTabLabel(item.tab).toLowerCase();
    return `${toolLabel} ${item.title} ${item.input} ${item.output}`.toLowerCase().includes(normalizedSearch);
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (target instanceof Element && target.closest('[data-tools-history-confirm="true"]')) {
        return;
      }
      if (panelRef.current?.contains(target)) {
        return;
      }

      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [onClose, open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmTarget) {
          setConfirmTarget(null);
          return;
        }
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmTarget, onClose]);

  function confirmClearHistory() {
    if (confirmTarget === "current") {
      onClearCurrent();
    } else if (confirmTarget === "all") {
      onClearAll();
    }
    setConfirmTarget(null);
  }

  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <>
      <button
        className={`fixed inset-0 z-40 cursor-default bg-foreground/15 backdrop-blur-[1px] transition-opacity duration-[240ms] ease-out md:hidden motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
        type="button"
        aria-label={"关闭历史"}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[86vh] flex-col rounded-t-lg border border-line bg-paper p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_48px_rgba(20,17,10,0.16)] transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:inset-x-auto md:bottom-4 md:right-4 md:top-20 md:w-[28rem] md:rounded-md md:pb-3 md:shadow-[var(--shadow-quiet)] motion-reduce:transition-none ${
          open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 md:translate-x-10"
        }`}
        role="dialog"
        aria-label={labels.history}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line/75 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <History className="h-3.5 w-3.5 text-accent" />
            <span>{labels.history}</span>
            <span className="rounded bg-accent/8 px-1.5 py-0.5 text-[0.68rem] text-accent">
              {"仅本地"}
            </span>
          </div>
          <button
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-accent/6 text-muted transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            type="button"
            aria-label={"关闭历史"}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-accent/8 p-1" aria-label={"历史范围"}>
          <button
            className={`h-8 rounded text-xs font-semibold transition ${
              historyScope === "current" ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"
            }`}
            type="button"
            aria-pressed={historyScope === "current"}
            onClick={() => setHistoryScope("current")}
          >
            {labels.historyCurrentTool} · {currentToolItems.length}
          </button>
          <button
            className={`h-8 rounded text-xs font-semibold transition ${
              historyScope === "all" ? "bg-paper text-accent shadow-[var(--shadow-quiet)]" : "text-muted hover:text-accent"
            }`}
            type="button"
            aria-pressed={historyScope === "all"}
            onClick={() => setHistoryScope("all")}
          >
            {labels.historyAllTools} · {items.length}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-background/64 px-2 text-xs font-semibold text-muted focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/15">
            <Search className="h-3.5 w-3.5 text-accent" />
            <input
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label={labels.historySearch}
              placeholder={labels.historySearch}
            />
          </label>
          <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
            <ToolButton disabled={currentToolItems.length === 0} onClick={() => setConfirmTarget("current")}>{labels.clearCurrentToolHistory}</ToolButton>
            <ToolButton disabled={items.length === 0} onClick={() => setConfirmTarget("all")}>{labels.clearAllHistory}</ToolButton>
          </div>
        </div>

        {visibleItems.length > 0 ? (
          <div className="mt-3 grid flex-1 auto-rows-max content-start gap-2 overflow-auto pr-1">
            {visibleItems.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-md border border-line/70 bg-background/54 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-accent/8 px-1.5 py-0.5 text-[0.68rem] font-semibold text-accent">{getToolTabLabel(item.tab)}</span>
                      <span className="text-[0.68rem] font-semibold text-muted">{formatHistoryTime(item.updatedAt)}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[0.68rem] font-semibold ${item.output ? "bg-accent/8 text-accent" : "bg-background text-muted"}`}>
                        {item.output ? labels.historyWithOutput : labels.historyInputOnly}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="line-clamp-3 break-all font-mono text-[0.75rem] leading-5 text-muted">{getHistoryInputPreviewText(item)}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[0.68rem] font-semibold text-muted">{formatBytes(new TextEncoder().encode(item.input).byteLength)}</span>
                  <div className="flex items-center gap-1.5">
                    <PanelActionButton icon={ArrowDownToLine} label={labels.restore} onClick={() => onRestore(item)}>{labels.restore}</PanelActionButton>
                    <PanelActionButton icon={Trash2} label={labels.delete} onClick={() => onDelete(item.id)}>{labels.delete}</PanelActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-dashed border-line bg-background/54 px-3 py-4 text-xs font-semibold text-muted">
            {labels.emptyHistory}
          </div>
        )}
      </aside>
      {confirmTarget ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/18 px-4 backdrop-blur-[2px]"
          data-tools-history-confirm="true"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmTarget(null);
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-md border border-line bg-paper p-4 shadow-[0_22px_70px_rgba(20,17,10,0.2)]"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="tools-history-confirm-title"
            aria-describedby="tools-history-confirm-description"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)]">
                <Trash2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 id="tools-history-confirm-title" className="text-sm font-semibold text-foreground">{labels.confirmClearTitle}</h3>
                <p id="tools-history-confirm-description" className="mt-1 text-xs font-semibold leading-5 text-muted">
                  {confirmTarget === "current" ? labels.confirmClearCurrentHistory : labels.confirmClearAllHistory}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md bg-accent/8 px-3 text-xs font-semibold text-muted transition hover:bg-accent/12 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                type="button"
                onClick={() => setConfirmTarget(null)}
              >
                {labels.cancel}
              </button>
              <button
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--accent-2)_14%,transparent)] px-3 text-xs font-semibold text-[var(--accent-2)] transition hover:bg-[color-mix(in_srgb,var(--accent-2)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-2)_24%,transparent)]"
                type="button"
                onClick={confirmClearHistory}
              >
                {labels.confirmClearAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function EncodingControls({ busy, runEncoding }: { busy: boolean; runEncoding: (action: EncodingAction) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton disabled={busy} onClick={() => runEncoding("urlEncode")}>URL Encode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("urlDecode")}>URL Decode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("base64Encode")}>Base64 Encode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("base64Decode")}>Base64 Decode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("unicodeEscape")}>{"Unicode 转义"}</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("unicodeUnescape")}>{"Unicode 反转义"}</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("htmlEscape")}>HTML Escape</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("htmlUnescape")}>HTML Unescape</ToolButton>
      {busy ? <ControlHint>{"处理中..."}</ControlHint> : null}
    </div>
  );
}

function TimeControls({
  displayMode,
  onDisplayModeChange,
  onTimestampUnitChange,
  runTime,
  timestampUnit,
}: {
  displayMode: TimeDisplayMode;
  onDisplayModeChange: (value: TimeDisplayMode) => void;
  onTimestampUnitChange: (value: TimestampUnit) => void;
  runTime: (action: "now" | "timestampToDate" | "dateToTimestamp") => void;
  timestampUnit: TimestampUnit;
}) {
  const timestampUnits: { label: string; value: TimestampUnit }[] = [
    { label: "自动单位", value: "auto" },
    { label: "秒", value: "seconds" },
    { label: "毫秒", value: "milliseconds" },
  ];
  const displayModes: { label: string; value: TimeDisplayMode }[] = [
    { label: "本地", value: "local" },
    { label: "UTC", value: "utc" },
  ];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolButton onClick={() => runTime("now")} icon={TimerReset} variant="primary">
          {"当前时间"}
        </ToolButton>
        <ToolButton onClick={() => runTime("timestampToDate")}>{"时间戳转日期"}</ToolButton>
        <ToolButton onClick={() => runTime("dateToTimestamp")}>{"日期转时间戳"}</ToolButton>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {timestampUnits.map((item) => (
          <ToolButton key={item.value} ariaPressed={item.value === timestampUnit} onClick={() => onTimestampUnitChange(item.value)}>
            {item.value === timestampUnit ? `${item.label} ✓` : item.label}
          </ToolButton>
        ))}
        {displayModes.map((item) => (
          <ToolButton key={item.value} ariaPressed={item.value === displayMode} onClick={() => onDisplayModeChange(item.value)}>
            {item.value === displayMode ? `${item.label} ✓` : item.label}
          </ToolButton>
        ))}
        <ControlHint>{"单位选项会影响时间戳转换和当前时间输入。"}</ControlHint>
      </div>
    </div>
  );
}

function JwtControls({ onDecode }: { onDecode: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton onClick={onDecode} variant="primary">{"解码 JWT"}</ToolButton>
      <ControlHint>{"仅本地解码，不验证签名。"}</ControlHint>
    </div>
  );
}

function HashControls({
  algorithm,
  busy,
  outputFormat,
  onAlgorithmChange,
  onImportClick,
  onOutputFormatChange,
  onRun,
}: {
  algorithm: HashAlgorithm;
  busy: boolean;
  outputFormat: HashOutputFormat;
  onAlgorithmChange: (value: HashAlgorithm) => void;
  onImportClick: () => void;
  onOutputFormatChange: (value: HashOutputFormat) => void;
  onRun: () => void;
}) {
  const algorithms: HashAlgorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
  const outputFormats: HashOutputFormat[] = ["hex", "base64", "base64url"];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {algorithms.map((item) => (
        <ToolButton key={item} ariaPressed={item === algorithm} disabled={busy} onClick={() => onAlgorithmChange(item)}>
          {item === algorithm ? `${item} ✓` : item}
        </ToolButton>
      ))}
      {outputFormats.map((item) => (
        <ToolButton key={item} ariaPressed={item === outputFormat} disabled={busy} onClick={() => onOutputFormatChange(item)}>
          {item === outputFormat ? `${item} ✓` : item}
        </ToolButton>
      ))}
      <ToolButton disabled={busy} onClick={onImportClick}>{"文件 Hash"}</ToolButton>
      <ToolButton disabled={busy} variant="primary" onClick={onRun}>{"计算"}</ToolButton>
      {busy ? <ControlHint>{"处理中..."}</ControlHint> : null}
    </div>
  );
}

function UuidControls({
  format,
  onFormatChange,
  onRun,
}: {
  format: UuidFormat;
  onFormatChange: (value: UuidFormat) => void;
  onRun: () => void;
}) {
  const formats: { label: string; value: UuidFormat }[] = [
    { label: "标准", value: "standard" },
    { label: "大写", value: "uppercase" },
    { label: "无连字符", value: "compact" },
    { label: "JSON", value: "json" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {formats.map((item) => (
        <ToolButton key={item.value} ariaPressed={item.value === format} onClick={() => onFormatChange(item.value)}>
          {item.value === format ? `${item.label} ✓` : item.label}
        </ToolButton>
      ))}
      <ToolButton onClick={onRun} variant="primary">{"生成 UUID v4"}</ToolButton>
      <ControlHint>{"在输入框填写数量，最多 1000 个。"}</ControlHint>
    </div>
  );
}

function RegexControls({
  busy,
  flags,
  onFlagsChange,
  onPatternChange,
  onReplace,
  onReplacementChange,
  onRun,
  pattern,
  replacement,
}: {
  busy: boolean;
  flags: string;
  onFlagsChange: (value: string) => void;
  onPatternChange: (value: string) => void;
  onReplace: () => void;
  onReplacementChange: (value: string) => void;
  onRun: () => void;
  pattern: string;
  replacement: string;
}) {
  const flagOptions = ["g", "i", "m", "s", "u", "y"];
  const normalizedFlags = normalizeRegexFlags(flags);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex h-8 min-w-56 items-center gap-1.5 rounded-md bg-accent/10 px-2.5 text-xs font-semibold text-muted">
        <span>{"表达式"}</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
          value={pattern}
          onChange={(event) => onPatternChange(event.target.value)}
          placeholder={"正则"}
        />
      </label>
      <label className="flex h-8 min-w-44 items-center gap-1.5 rounded-md bg-accent/10 px-2.5 text-xs font-semibold text-muted">
        <span>{"替换为"}</span>
        <input className="min-w-0 flex-1 bg-transparent text-foreground outline-none" value={replacement} onChange={(event) => onReplacementChange(event.target.value)} />
      </label>
      <div className="flex h-8 items-center gap-1 rounded-md bg-accent/10 px-1.5">
        {flagOptions.map((flag) => {
          const active = normalizedFlags.includes(flag);
          return (
            <button
              key={flag}
              className={`h-6 min-w-6 cursor-pointer rounded px-1.5 text-[0.75rem] font-semibold transition ${
                active ? "bg-accent/18 text-accent" : "text-muted hover:bg-accent/12 hover:text-accent"
              }`}
              type="button"
              aria-pressed={active}
              onClick={() => onFlagsChange(toggleRegexFlag(normalizedFlags, flag))}
            >
              {flag}
            </button>
          );
        })}
      </div>
      <ToolButton disabled={busy} variant="primary" onClick={onRun}>{"测试"}</ToolButton>
      <ToolButton disabled={busy} onClick={onReplace}>{"替换"}</ToolButton>
      {busy ? <ControlHint>{"处理中..."}</ControlHint> : null}
    </div>
  );
}

function MarkdownControls({
  autoPreview,
  onAutoPreviewChange,
  onRun,
}: {
  autoPreview: boolean;
  onAutoPreviewChange: (value: boolean) => void;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton onClick={onRun} variant="primary">{"生成预览"}</ToolButton>
      <ToolButton ariaPressed={autoPreview} onClick={() => onAutoPreviewChange(!autoPreview)}>{autoPreview ? ("自动预览 ✓") : "自动预览"}</ToolButton>
      <ControlHint>{"支持常见 GFM 语法，原始 HTML 会被转义。"}</ControlHint>
    </div>
  );
}

function StructuredControls({
  format,
  onFormatChange,
  onRun,
}: {
  format: StructuredFormat;
  onFormatChange: (value: StructuredFormat) => void;
  onRun: () => void;
}) {
  const formats: StructuredFormat[] = ["yaml", "toml"];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {formats.map((item) => (
        <ToolButton key={item} ariaPressed={item === format} onClick={() => onFormatChange(item)}>
          {item === format ? `${item.toUpperCase()} ✓` : item.toUpperCase()}
        </ToolButton>
      ))}
      <ToolButton onClick={onRun} variant="primary">{"转 JSON"}</ToolButton>
      <ControlHint>{"支持常见 YAML/TOML 子集，错误会提示行号。"}</ControlHint>
    </div>
  );
}

function CsvControls({
  delimiter,
  emptyAsNull,
  inferTypes,
  outputMode,
  onDelimiterChange,
  onEmptyAsNullChange,
  onInferTypesChange,
  onOutputModeChange,
  onRun,
}: {
  delimiter: CsvDelimiter;
  emptyAsNull: boolean;
  inferTypes: boolean;
  outputMode: CsvOutputMode;
  onDelimiterChange: (value: CsvDelimiter) => void;
  onEmptyAsNullChange: (value: boolean) => void;
  onInferTypesChange: (value: boolean) => void;
  onOutputModeChange: (value: CsvOutputMode) => void;
  onRun: () => void;
}) {
  const options: { label: string; value: CsvDelimiter }[] = [
    { label: "自动", value: "auto" },
    { label: "CSV", value: "comma" },
    { label: "TSV", value: "tab" },
  ];
  const outputModes: { label: string; value: CsvOutputMode }[] = [
    { label: "对象数组", value: "objects" },
    { label: "二维数组", value: "rows" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((item) => (
        <ToolButton key={item.value} ariaPressed={item.value === delimiter} onClick={() => onDelimiterChange(item.value)}>
          {item.value === delimiter ? `${item.label} ✓` : item.label}
        </ToolButton>
      ))}
      {outputModes.map((item) => (
        <ToolButton key={item.value} ariaPressed={item.value === outputMode} onClick={() => onOutputModeChange(item.value)}>
          {item.value === outputMode ? `${item.label} ✓` : item.label}
        </ToolButton>
      ))}
      <ToolButton ariaPressed={inferTypes} onClick={() => onInferTypesChange(!inferTypes)}>{inferTypes ? ("类型推断 ✓") : "类型推断"}</ToolButton>
      <ToolButton ariaPressed={emptyAsNull} onClick={() => onEmptyAsNullChange(!emptyAsNull)}>{emptyAsNull ? ("空值=null ✓") : "空值=null"}</ToolButton>
      <ToolButton onClick={onRun} variant="primary">{"转 JSON"}</ToolButton>
      <ControlHint>{"默认第一行作为字段名。"}</ControlHint>
    </div>
  );
}

function ColorControls({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton onClick={onRun} variant="primary">{"转换颜色"}</ToolButton>
      <ControlHint>HEX / RGB / HSL</ControlHint>
    </div>
  );
}

function EditorPanel({
  label,
  value,
  onChange,
  metrics,
  highlight = null,
  readOnly = false,
  placeholder,
  size = "large",
  actions,
  resizable = true,
  fill = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  metrics: TextMetrics;
  highlight?: TextHighlight | null;
  readOnly?: boolean;
  placeholder?: string;
  size?: EditorPanelSize;
  actions?: ReactNode;
  resizable?: boolean;
  fill?: boolean;
}) {
  const heightClass = getPanelHeightClass(size);
  // 撑满视口（仅 lg 以上）：根变 flex 列吃满列高、max-h 防超高屏过空；正文区 flex-1，文本域 h-full 填满。
  // 撑满时禁用手动拖拽（resize-y 会与 h-full 冲突），移动端仍保留 min-h 自然高度。
  const fillRootClass = fill ? "lg:flex lg:h-full lg:max-h-[100rem] lg:min-h-0 lg:flex-col" : "";
  const fillBodyClass = fill ? "lg:min-h-0 lg:flex-1" : "";
  const fillAreaClass = fill ? "lg:h-full" : "";
  const canResize = resizable && !fill;
  const hasError = isToolErrorOutput(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [textareaScroll, setTextareaScroll] = useState({ left: 0, top: 0 });
  const highlightParts = highlight ? splitTextByHighlight(value, highlight) : null;

  useEffect(() => {
    if (!highlight || !textareaRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    textarea.setSelectionRange(highlight.start, highlight.end);
    textarea.focus({ preventScroll: true });

    // 自动滚动到出错行：行号外于当前视口时，把它带到视口约 1/3 处（leading-7=28px，p-3.5=14px）。
    const lineHeight = 28;
    const padding = 14;
    const errorTop = padding + (value.slice(0, highlight.start).split("\n").length - 1) * lineHeight;
    if (errorTop < textarea.scrollTop || errorTop > textarea.scrollTop + textarea.clientHeight - lineHeight) {
      textarea.scrollTop = Math.max(0, errorTop - textarea.clientHeight / 3);
    }

    const frame = window.requestAnimationFrame(() => {
      setTextareaScroll({ left: textarea.scrollLeft, top: textarea.scrollTop });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlight, value]);

  return (
    <div className={`block ${fillRootClass}`}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Link2 className="h-3 w-3 text-accent" />
          {label}
          <span className="font-medium text-muted/80">
            {metrics.displaySize} · {metrics.lines} {"行"} · {metrics.characters} {"字符"}
          </span>
        </span>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      <div className={`relative ${fillBodyClass}`}>
        {highlightParts ? (
          <pre
            className={`${heightClass} pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap rounded-md border border-transparent bg-paper/88 p-3.5 ${toolMonoContentClass} text-transparent shadow-inner`}
            style={{ overflowWrap: "break-word" }}
            aria-hidden="true"
          >
            <span style={{ display: "block", transform: `translate(${-textareaScroll.left}px, ${-textareaScroll.top}px)` }}>
              {highlightParts.before}
              <mark className="rounded-[3px] bg-[color-mix(in_srgb,var(--accent-2)_34%,transparent)] px-0.5 text-transparent outline outline-1 outline-[color-mix(in_srgb,var(--accent-2)_58%,transparent)]">
                {highlightParts.highlighted}
              </mark>
              {highlightParts.after}
            </span>
          </pre>
        ) : null}
        <textarea
          ref={textareaRef}
          aria-label={label}
          className={`${heightClass} ${fillAreaClass} relative w-full ${canResize ? "resize-y" : "resize-none"} rounded-md border p-3.5 ${toolMonoContentClass} shadow-inner outline-none transition ${
            hasError
              ? "border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,var(--paper))] text-[var(--accent-2)] focus:border-[color-mix(in_srgb,var(--accent-2)_62%,var(--line))] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-2)_16%,transparent)]"
              : highlightParts
                ? "border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-transparent text-foreground focus:border-[color-mix(in_srgb,var(--accent-2)_62%,var(--line))] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-2)_16%,transparent)]"
                : "border-line bg-paper/88 text-foreground focus:border-accent/55 focus:ring-2 focus:ring-accent/15"
          }`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => setTextareaScroll({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop })}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function MarkdownPreviewPanel({
  actions,
  html,
  label,
  metrics,
  size = "large",
  fill = false,
}: {
  actions?: ReactNode;
  html: string;
  label: string;
  metrics: TextMetrics;
  size?: EditorPanelSize;
  fill?: boolean;
}) {
  const heightClass = getPanelHeightClass(size);
  const hasError = isToolErrorOutput(html);
  const fillRootClass = fill ? "lg:flex lg:h-full lg:max-h-[100rem] lg:min-h-0 lg:flex-col" : "";
  const fillBodyClass = fill ? "lg:min-h-0 lg:flex-1" : "";

  return (
    <div className={`block ${fillRootClass}`}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Link2 className="h-3 w-3 text-accent" />
          {label}
          <span className="font-medium text-muted/80">
            {metrics.displaySize} · {metrics.lines} {"行"} · {metrics.characters} {"字符"}
          </span>
        </span>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      {hasError ? (
        <pre className={`${heightClass} ${fillBodyClass} overflow-auto rounded-md border border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,var(--paper))] p-4 font-mono text-[0.875rem] leading-7 text-[var(--accent-2)] shadow-inner`}>
          {html}
        </pre>
      ) : (
        <div
          className={`tools-markdown-preview ${heightClass} ${fillBodyClass} overflow-auto rounded-md border border-line bg-paper/88 p-4 text-sm leading-7 text-foreground shadow-inner`}
          dangerouslySetInnerHTML={{ __html: html || `<p class="tools-markdown-empty">${"点击生成预览后，这里会显示 Markdown 效果。"}</p>` }}
        />
      )}
    </div>
  );
}

function JsonOutputPanel({
  actions,
  emptyMessage = "在左侧输入 JSON，这里会自动显示格式化结果。",
  label,
  metrics,
  output,
  size = "large",
  fill = false,
}: {
  actions?: ReactNode;
  emptyMessage?: string;
  label: string;
  metrics: TextMetrics;
  output: string;
  size?: EditorPanelSize;
  fill?: boolean;
}) {
  const heightClass = getFixedPanelHeightClass(size);
  const fillRootClass = fill ? "lg:flex lg:h-full lg:max-h-[100rem] lg:min-h-0 lg:flex-col" : "";
  const fillBodyClass = fill ? "lg:min-h-0 lg:flex-1" : "";
  const bodyHeightClass = `${heightClass} ${fillBodyClass}`;
  const hasError = isToolErrorOutput(output);
  const parsed = useMemo(() => {
    if (hasError || output.trim() === "") {
      return null;
    }
    try {
      return { value: JSON.parse(output) as unknown };
    } catch {
      return null;
    }
  }, [hasError, output]);

  return (
    <div className={`block ${fillRootClass}`}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Link2 className="h-3 w-3 text-accent" />
          {label}
          <span className="font-medium text-muted/80">
            {metrics.displaySize} · {metrics.lines} {"行"} · {metrics.characters} {"字符"}
          </span>
        </span>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      {hasError ? (
        <pre className={`${bodyHeightClass} overflow-auto rounded-md border border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,var(--paper))] p-4 font-mono text-[0.875rem] leading-7 text-[var(--accent-2)] shadow-inner`}>
          {output}
        </pre>
      ) : parsed ? (
        <JsonViewer value={parsed.value} text={output} heightClass={bodyHeightClass} />
      ) : (
        <div className={`${bodyHeightClass} flex items-center justify-center rounded-md border border-line bg-paper/88 text-xs text-muted shadow-inner`}>
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

function StructuredResultPanel({
  actions,
  label,
  metrics,
  output,
  result,
  size = "medium",
}: {
  actions?: ReactNode;
  label: string;
  metrics: TextMetrics;
  output: string;
  result: StructuredToolResult | null;
  size?: EditorPanelSize;
}) {
  const heightClass = getPanelHeightClass(size);
  const hasError = isToolErrorOutput(output);

  return (
    <div className="block">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Link2 className="h-3 w-3 text-accent" />
          {label}
          <span className="font-medium text-muted/80">
            {metrics.displaySize} · {metrics.lines} {"行"} · {metrics.characters} {"字符"}
          </span>
        </span>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      <div
        className={`${heightClass} overflow-auto rounded-md border p-4 text-sm shadow-inner ${
          hasError
            ? "border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,var(--paper))] text-[var(--accent-2)]"
            : "border-line bg-paper/88 text-foreground"
        }`}
      >
        {hasError ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[0.875rem] leading-7 text-[var(--accent-2)]">{output}</pre>
        ) : output && result ? (
          renderStructuredResult(result)
        ) : output ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[0.875rem] leading-7 text-foreground">{output}</pre>
        ) : (
          <p className="text-xs font-semibold text-muted">{"运行工具后，这里会显示结构化结果。"}</p>
        )}
      </div>
    </div>
  );
}

function renderStructuredResult(result: StructuredToolResult) {
  if (result.type === "hash") return <HashStructuredResult result={result.data} />;
  if (result.type === "jwt") return <JwtStructuredResult result={result.data} />;
  return <RegexStructuredResult result={result.data} />;
}

function HashStructuredResult({ result }: { result: HashStructuredResultData }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {result.fields.map((field) => (
          <div key={field.label} className="rounded-md border border-line bg-background/54 px-3 py-2">
            <div className="text-[0.68rem] font-semibold uppercase text-muted">{field.label}</div>
            <div className="mt-1 break-words text-xs font-semibold text-foreground">{field.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-line bg-background/54 p-3">
        <div className="mb-2 text-[0.68rem] font-semibold uppercase text-muted">{"摘要"}</div>
        <code className="block whitespace-pre-wrap break-all font-mono text-[0.875rem] leading-7 text-foreground">{result.digest}</code>
      </div>
    </div>
  );
}

function JwtStructuredResult({ result }: { result: JwtStructuredResultData }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-[color-mix(in_srgb,var(--accent-2)_30%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,transparent)] p-3">
        <div className="text-xs font-semibold text-[var(--accent-2)]">{"未验证签名"}</div>
        <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted">{result.signatureBody}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoBlock title={"过期状态"} body={result.expirationBody} />
        <InfoBlock title={"时间字段"} body={result.timeClaimsBody} />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <CodeBlock title="Header" body={result.headerJson} />
        <CodeBlock title="Payload" body={result.payloadJson} />
      </div>
    </div>
  );
}

function RegexStructuredResult({ result }: { result: RegexStructuredResultData }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-4">
        {result.summary.map((item) => (
          <div key={item.label} className="rounded-md border border-line bg-background/54 px-3 py-2">
            <div className="text-[0.68rem] font-semibold uppercase text-muted">{item.label}</div>
            <div className="mt-1 break-words text-xs font-semibold text-foreground">{item.value}</div>
          </div>
        ))}
      </div>
      {result.matches.length > 0 ? (
        <div className="grid gap-2">
          {result.matches.map((match) => (
            <div key={`${match.index}-${match.line}-${match.column}-${match.ordinal}`} className="rounded-md border border-line bg-background/54 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5 text-[0.68rem] font-semibold text-muted">
                <span className="rounded bg-accent/8 px-2 py-0.5">#{match.ordinal}</span>
                <span className="rounded bg-accent/8 px-2 py-0.5">index {match.index}</span>
                <span className="rounded bg-accent/8 px-2 py-0.5">line {match.line}</span>
                <span className="rounded bg-accent/8 px-2 py-0.5">column {match.column}</span>
              </div>
              <code className="block whitespace-pre-wrap break-all font-mono text-[0.875rem] leading-7 text-foreground">{match.match}</code>
              {match.captures.length > 0 ? <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{`${"捕获组"}: ${JSON.stringify(match.captures)}`}</div> : null}
              {match.groups ? <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{`${"命名组"}: ${JSON.stringify(match.groups)}`}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line bg-background/54 p-4 text-xs font-semibold text-muted">{"没有可显示的匹配结果。"}</div>
      )}
    </div>
  );
}

function InfoBlock({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-md border border-line bg-background/54 p-3">
      <div className="mb-2 text-[0.68rem] font-semibold uppercase text-muted">{title}</div>
      <div className="whitespace-pre-wrap text-xs leading-5 text-foreground">{body}</div>
    </div>
  );
}

function CodeBlock({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-md border border-line bg-background/54 p-3">
      <div className="mb-2 text-[0.68rem] font-semibold uppercase text-muted">{title}</div>
      <pre className="overflow-auto whitespace-pre-wrap break-words rounded bg-paper/80 p-3 font-mono text-[0.875rem] leading-7 text-foreground">{body}</pre>
    </div>
  );
}

function ColorResultPanel({
  input,
  label,
  metrics,
  onClear,
  onCopy,
  onDownload,
  output,
  size = "medium",
}: {
  input: string;
  label: string;
  metrics: TextMetrics;
  onClear: () => void;
  onCopy: (value: string) => void;
  onDownload: () => void;
  output: string;
  size?: EditorPanelSize;
}) {
  const heightClass = getPanelHeightClass(size);
  const hasError = isToolErrorOutput(output);
  const color = getColorFormatsFromInput(input);
  const values = color
    ? [
        { label: "HEX", value: color.hex },
        { label: "RGB", value: color.rgb },
        { label: "HSL", value: color.hsl },
        { label: "CSS 变量", value: color.cssVariable },
      ]
    : [];
  const copyAllValue = output || (color ? ["[颜色]", `HEX: ${color.hex}`, `RGB: ${color.rgb}`, `HSL: ${color.hsl}`, "", `${"CSS 变量"}:`, color.cssVariable].join("\n") : "");

  return (
    <div className="block">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Link2 className="h-3 w-3 text-accent" />
          {label}
          <span className="font-medium text-muted/80">
            {metrics.displaySize} · {metrics.lines} {"行"} · {metrics.characters} {"字符"}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <PanelActionButton icon={Clipboard} label={"复制全部"} onClick={() => onCopy(copyAllValue)}>{"复制全部"}</PanelActionButton>
          <PanelActionButton icon={Download} label={"下载"} onClick={onDownload}>{"下载"}</PanelActionButton>
          <PanelActionButton icon={Trash2} label={"清空"} onClick={onClear}>{"清空"}</PanelActionButton>
        </div>
      </div>
      <div
        className={`${heightClass} rounded-md border p-4 shadow-inner ${
          hasError
            ? "border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,var(--paper))]"
            : "border-line bg-paper/88"
        }`}
      >
        {hasError ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[0.875rem] leading-7 text-[var(--accent-2)]">{output}</pre>
        ) : color ? (
          <div className="grid gap-3">
            <div className="h-28 rounded-md border border-line shadow-inner" style={{ backgroundColor: color.hex }} />
            <div className="grid gap-1.5">
              {values.map((item) => (
                <div key={item.label} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-accent/6 px-3 py-2 text-xs">
                  <span className="font-semibold text-muted">{item.label}</span>
                  <code className="font-mono text-foreground">{item.value}</code>
                  <PanelActionButton icon={Clipboard} label={"复制"} onClick={() => onCopy(item.value)}>{"复制"}</PanelActionButton>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs font-semibold text-muted">{"输入有效的 HEX、RGB 或 HSL 颜色值。"}</p>
        )}
      </div>
    </div>
  );
}

function PanelActionButton({
  children,
  onClick,
  icon: Icon,
  label,
  primary = false,
  active = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  label?: string;
  primary?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  const tone = primary
    ? "bg-accent/15 text-accent hover:bg-accent/22"
    : active
      ? "bg-accent/12 text-accent"
      : "bg-accent/6 text-muted hover:bg-accent/10 hover:text-accent";
  return (
    <button
      className={`inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-[0.75rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-55 ${tone}`}
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}

// 低频面板操作收纳进溢出菜单；默认「···」图标，传 triggerLabel 则显示「文字 ▾」（如「转换」）。
function PanelOverflowMenu({
  label = "更多操作",
  triggerLabel,
  disabled = false,
  items,
}: {
  label?: string;
  triggerLabel?: string;
  disabled?: boolean;
  items: { key: string; label: string; icon?: ComponentType<{ className?: string }>; active?: boolean; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        className={`inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-[0.75rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-55 ${
          open ? "bg-accent/12 text-accent" : "bg-accent/6 text-muted hover:bg-accent/10 hover:text-accent"
        }`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel ?? label}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        {triggerLabel ? (
          <>
            {triggerLabel}
            <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
          </>
        ) : (
          <MoreHorizontal className="h-3.5 w-3.5" />
        )}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[8.5rem] rounded-md border border-line bg-paper p-1 shadow-[var(--shadow-quiet)]">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-[0.75rem] font-semibold transition hover:bg-accent/8 hover:text-accent focus-visible:outline-none focus-visible:bg-accent/8 ${
                  item.active ? "bg-accent/8 text-accent" : "text-muted"
                }`}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
              >
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// 清空按钮带二次确认（小气泡），避免误点丢失内容。
function PanelClearButton({
  label,
  prompt,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  label: string;
  prompt: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className={`inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-[0.75rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${
          open ? "bg-amber/15 text-amber" : "bg-accent/6 text-muted hover:bg-accent/10 hover:text-accent"
        }`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        <Trash2 className="h-3 w-3" />
        {label}
      </button>
      {open ? (
        <div role="dialog" aria-label={prompt} className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-48 rounded-md border border-line bg-paper p-2.5 shadow-[var(--shadow-quiet)]">
          <p className="mb-2 text-[0.75rem] font-medium leading-5 text-muted">{prompt}</p>
          <div className="flex justify-end gap-1.5">
            <button
              className="inline-flex h-7 cursor-pointer items-center rounded-md bg-accent/6 px-2.5 text-[0.75rem] font-semibold text-muted transition hover:bg-accent/10 hover:text-accent"
              type="button"
              onClick={() => setOpen(false)}
            >
              {cancelLabel}
            </button>
            <button
              className="inline-flex h-7 cursor-pointer items-center rounded-md bg-amber/15 px-2.5 text-[0.75rem] font-semibold text-amber transition hover:bg-amber/25"
              type="button"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// JSON 输入头部的紧凑状态：处理中（带取消）或校验结果徽标（有效/无效/大文件）。
function JsonStatusBadge({
  busy,
  validity,
  onCancel,
}: {
  busy: boolean;
  validity: { type: "idle" | "valid" | "error" | "large"; message: string };
  onCancel: () => void;
}) {
  if (busy) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[0.75rem] font-semibold text-muted">{"处理中…"}</span>
        <PanelActionButton label={"取消"} onClick={onCancel}>{"取消"}</PanelActionButton>
      </span>
    );
  }
  // 有效/无效不再用徽标提示——结果区已直接展示解析结果或报错、输入框也有行内错误高亮，徽标冗余。
  // 仅保留「内容较大」这条可操作提示（告诉用户超过自动校验上限、需点「格式化」走 Worker）。
  if (validity.type === "large") {
    return (
      <span className="inline-flex h-7 items-center px-1 text-[0.75rem] font-semibold text-muted" role="status" aria-live="polite" title={validity.message}>
        {validity.message}
      </span>
    );
  }
  return null;
}

function ControlHint({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center px-2 text-xs font-semibold leading-5 text-muted">
      {children}
    </span>
  );
}

function PanelInlineHint({ children }: { children: ReactNode }) {
  return (
    <span className="hidden h-7 items-center px-1 text-[0.72rem] font-semibold leading-none text-muted lg:inline-flex">
      {children}
    </span>
  );
}

function ToolButton({
  children,
  onClick,
  ariaPressed,
  icon: Icon,
  disabled = false,
  variant = "secondary",
}: {
  children: ReactNode;
  onClick: () => void;
  ariaPressed?: boolean;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-55 ${
        variant === "primary"
          ? "bg-accent text-accent-ink shadow-[var(--shadow-quiet)] hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--foreground))] disabled:hover:bg-accent"
          : "bg-accent/10 text-[color-mix(in_srgb,var(--foreground)_72%,var(--muted))] hover:bg-accent/15 hover:text-accent disabled:hover:bg-accent/10 disabled:hover:text-[color-mix(in_srgb,var(--foreground)_72%,var(--muted))]"
      }`}
      type="button"
      aria-pressed={ariaPressed}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

function getToolValue(tab: ToolTab, values: Record<ToolTab, string>) {
  return values[tab];
}

function getToolTabLabel(tab: ToolTab) {
  return tabLabels.find((item) => item.id === tab)?.label ?? tab;
}

function formatHistoryTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(timestamp));
}

function getHistoryInputPreviewText(item: ToolHistoryItem) {
  const normalized = item.input.trim();
  return normalized || item.title || item.tab.toUpperCase();
}

function copyTextWithTextareaFallback(value: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function getTextMetrics(value: string): TextMetrics {
  const bytes = new TextEncoder().encode(value).byteLength;
  return {
    bytes,
    characters: value.length,
    displaySize: formatBytes(bytes),
    lines: value ? value.split(/\r?\n/).length : 0,
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function splitTextByHighlight(value: string, highlight: TextHighlight) {
  const start = clampNumber(Math.min(highlight.start, highlight.end), 0, value.length);
  const end = clampNumber(Math.max(highlight.start, highlight.end), start, value.length);
  if (end <= start) {
    return null;
  }

  return {
    after: value.slice(end),
    before: value.slice(0, start),
    highlighted: value.slice(start, end),
  };
}

function largeInputSuffix(bytes: number) {
  if (bytes <= generalLargeInputBytes) {
    return "";
  }

  return " 检测到较大输入，本次操作可能需要更久。";
}

function formatJsonErrorOutput(message: string) {
  return formatToolErrorOutput(message, "[JSON 错误]");
}

function formatXmlErrorOutput(message: string) {
  return formatToolErrorOutput(message, "[XML 错误]");
}

function formatXmlJson(value: unknown, format: XmlJsonFormat) {
  return JSON.stringify(value, null, getXmlJsonSpacing(format));
}

function getXmlJsonSpacing(format: XmlJsonFormat) {
  return format === "compact" ? undefined : Number(format);
}

function formatToolErrorOutput(message: string, title = "[错误]") {
  const detail = normalizeErrorDetail(message);
  const location = extractErrorLocation(message);
  const context = extractErrorContext(message);
  const lines = [
    title,
    `${"详细信息"}：${detail}`,
  ];
  if (location) {
    lines.push(`${"位置"}：${location}`);
  }
  if (context) {
    lines.push(`${"附近"}：${context}`);
  }
  return lines.join("\n");
}

function isToolErrorOutput(value: string) {
  return /^\[(?:JSON\s+error|JSON 错误|XML 错误|Error|错误)\]/i.test(value.trimStart());
}

function normalizeErrorDetail(message: string) {
  return message
    .replace(/(?:（第\s*\d+\s*行，第\s*\d+\s*列）|\(line\s*\d+,\s*column\s*\d+\))/i, "")
    .replace(/(?:。附近：|\. Near:).+$/i, "")
    .trim();
}

function extractErrorLocation(message: string) {
  const zhLocation = message.match(/第\s*(\d+)\s*行，第\s*(\d+)\s*列/);
  if (zhLocation) {
    return `第 ${zhLocation[1]} 行，第 ${zhLocation[2]} 列`;
  }
  const enLocation = message.match(/line\s*(\d+),\s*column\s*(\d+)/i);
  if (enLocation) {
    return `第 ${enLocation[1]} 行，第 ${enLocation[2]} 列`;
  }
  return "";
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function extractErrorContext(message: string) {
  const context = message.match(/(?:附近：|Near:\s*)(.+)$/i)?.[1]?.trim();
  if (!context) {
    return "";
  }
  return context;
}

function formatToolError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) {
    return fallback;
  }
  if (/[\u4e00-\u9fff]/.test(message)) {
    return message;
  }

  return translateEnglishToolError(message, fallback);
}

function translateEnglishToolError(message: string, fallback: string) {
  const yamlLine = message.match(/^Invalid YAML line (\d+):\s*(.+)$/i);
  if (yamlLine) {
    return `YAML 第 ${yamlLine[1]} 行格式无效：${yamlLine[2]}`;
  }

  const tomlLine = message.match(/^Invalid TOML line (\d+):\s*(.+)$/i);
  if (tomlLine) {
    return `TOML 第 ${tomlLine[1]} 行格式无效：${tomlLine[2]}`;
  }

  if (/CSV\/TSV needs a header row/i.test(message)) {
    return "CSV/TSV 需要标题行和至少一行数据。";
  }
  if (/CSV\/TSV has an unclosed quoted field/i.test(message)) {
    return "CSV/TSV 存在未闭合的引号字段。";
  }
  if (/Array value has an unclosed quoted string/i.test(message)) {
    return "数组值里有未闭合的引号字符串。";
  }
  if (/Unsupported color/i.test(message)) {
    return "不支持的颜色格式。可输入 #d9b861、rgb(217,184,97) 或 hsl(43,62%,62%)。";
  }
  if (/URI malformed/i.test(message)) {
    return "URL 编码格式无效，请检查百分号转义。";
  }
  if (/atob|InvalidCharacterError|not correctly encoded|base64/i.test(message)) {
    return "Base64 内容无效，请检查输入。";
  }
  if (/Invalid regular expression|unterminated|invalid escape|nothing to repeat/i.test(message)) {
    return "正则表达式无效，请检查语法。";
  }
  if (/Input must be a flat JSON object/i.test(message)) {
    return "输入必须是扁平 JSON 对象。";
  }
  if (/Unexpected token|Unexpected end|position \d+|JSON|Expected/i.test(message)) {
    return `JSON 格式无效：${translateJsonErrorReason(message)}`;
  }
  if (/Invalid date/i.test(message)) {
    return "日期无效。";
  }
  if (/crypto|digest|algorithm/i.test(message)) {
    return "Hash 计算失败，请检查浏览器是否支持当前算法。";
  }

  return fallback;
}

function readToolFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  const queryTool = url.searchParams.get("tool");
  const hashTool = url.hash.replace(/^#/, "");
  if (isToolTab(queryTool)) return queryTool;
  if (isToolTab(hashTool)) return hashTool;
  return null;
}

function isExpandedWorkspaceTool(tab: ToolTab) {
  return toolGroupByTab[tab] === "data" || toolGroupByTab[tab] === "writing";
}

function isStandaloneTool(tab: ToolTab) {
  return (
    tab === "image" ||
    tab === "watermark" ||
    tab === "wechatQr" ||
    tab === "linkQr" ||
    tab === "crop" ||
    tab === "idPhoto" ||
    tab === "qrDecode" ||
    tab === "imageBase64" ||
    tab === "diff" ||
    tab === "jsonToTs" ||
    tab === "tokenCount" ||
    tab === "seoAudit"
  );
}

function getPanelSize(tab: ToolTab): EditorPanelSize {
  if (isExpandedWorkspaceTool(tab)) return "expanded";
  if (tab === "color" || tab === "time" || tab === "uuid") return "compact";
  if (tab === "jwt" || tab === "hash" || tab === "regex" || tab === "text" || tab === "encoding") return "medium";
  return "large";
}

// 面板高度：clamp(下限, 视口比例 dvh, 上限)。给一个偏大的视口比例让内容区随屏放大、宽敞，
// 不在此处减 chrome 偏移；页脚由 tools 页布局（页头+main 占满 100dvh）压到首屏之外，
// 故面板撞上限留下的空白不会露出页脚。下限保证矮屏可用、上限防止超大屏过分稀疏。
// 用 min-h 而非 flex，保留输入框 resize-y 手动拖拽。
function getPanelHeightClass(size: EditorPanelSize) {
  return {
    compact: "min-h-[clamp(14rem,36dvh,24rem)]",
    expanded: "min-h-[clamp(24rem,66dvh,56rem)]",
    medium: "min-h-[clamp(18rem,48dvh,34rem)]",
    large: "min-h-[clamp(22rem,60dvh,46rem)]",
  }[size];
}

// 固定高度版（与 getPanelHeightClass 同档同值，但用 h- 锁高），用于内部需要滚动的面板（如 JSON 查看器），
// 避免内容把面板撑到全铺开。字面量 class 以便 Tailwind 扫描生成。
function getFixedPanelHeightClass(size: EditorPanelSize) {
  return {
    compact: "h-[clamp(14rem,36dvh,24rem)]",
    expanded: "h-[clamp(24rem,66dvh,56rem)]",
    medium: "h-[clamp(18rem,48dvh,34rem)]",
    large: "h-[clamp(22rem,60dvh,46rem)]",
  }[size];
}

function getDownloadInfo(tab: ToolTab) {
  if (tab === "xml") {
    return { extension: "json", filename: "xml-to-json.json", mimeType: "application/json;charset=utf-8" };
  }
  if (tab === "json" || tab === "csv" || tab === "data") {
    return { extension: "json", mimeType: "application/json;charset=utf-8" };
  }
  if (tab === "markdown") {
    return { extension: "html", mimeType: "text/html;charset=utf-8" };
  }
  if (tab === "text") {
    return { extension: "txt", filename: "cleaned-text.txt", mimeType: "text/plain;charset=utf-8" };
  }
  if (tab === "color") {
    return { extension: "css", mimeType: "text/css;charset=utf-8" };
  }
  return { extension: "txt", mimeType: "text/plain;charset=utf-8" };
}

function dedupeTextLines(lines: string[], options: { ignoreCase: boolean; keepOrder: boolean; trim: boolean }) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const line of lines) {
    const value = options.trim ? line.trim() : line;
    const key = options.ignoreCase ? value.toLocaleLowerCase() : value;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }
  return (options.keepOrder ? output : output.sort((left, right) => left.localeCompare(right, "zh-CN"))).join("\n");
}

function sortTextLines(lines: string[], options: { descending: boolean; removeEmpty: boolean; trim: boolean }) {
  const normalized = lines
    .map((line) => (options.trim ? line.trim() : line))
    .filter((line) => !options.removeEmpty || line.trim());
  normalized.sort((left, right) => left.localeCompare(right, "zh-CN"));
  if (options.descending) {
    normalized.reverse();
  }
  return normalized.join("\n");
}

function formatTextSummary(action: TextAction, input: string, output: string) {
  const inputLines = splitLines(input);
  const outputLines = splitLines(output);
  if (action === "removeEmpty") {
    return `移除 ${Math.max(0, inputLines.length - outputLines.length)} 个空行`;
  }
  if (action === "dedupe") {
    return `去重 ${Math.max(0, inputLines.length - outputLines.length)} 行`;
  }
  if (action === "sortAsc") {
    return `升序排序 ${outputLines.length} 行`;
  }
  if (action === "sortDesc") {
    return `降序排序 ${outputLines.length} 行`;
  }
  if (action === "trimLines") {
    return `清理 ${countChangedLines(inputLines, outputLines)} 行首尾空白`;
  }
  if (action === "collapseSpaces") {
    return `合并 ${Math.max(0, input.length - output.length)} 个多余空白字符`;
  }
  if (action === "tabsToSpaces") {
    return `替换 ${countMatches(input, /\t/g)} 个 Tab`;
  }
  if (action === "removeZeroWidth") {
    return `移除 ${countMatches(input, /[\u200b-\u200d\ufeff]/g)} 个零宽字符`;
  }
  if (action === "normalizeLineEndings") {
    return "已统一换行符";
  }
  return `转换 ${output.length} 个字符`;
}

function splitLines(value: string) {
  return value ? value.split(/\r?\n/) : [];
}

function countChangedLines(before: string[], after: string[]) {
  return before.reduce((count, line, index) => count + (line !== (after[index] ?? "") ? 1 : 0), 0);
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function formatUuidValues(values: string[], format: UuidFormat) {
  if (format === "json") {
    return JSON.stringify(values, null, 2);
  }
  if (format === "uppercase") {
    return values.map((value) => value.toUpperCase()).join("\n");
  }
  if (format === "compact") {
    return values.map((value) => value.replaceAll("-", "")).join("\n");
  }
  return values.join("\n");
}

function normalizeRegexFlags(flags: string) {
  const allowedFlags = ["g", "i", "m", "s", "u", "y"];
  const uniqueFlags = Array.from(new Set(flags.split("").filter((flag) => allowedFlags.includes(flag))));
  return uniqueFlags.join("");
}

function toggleRegexFlag(flags: string, flag: string) {
  const normalizedFlags = normalizeRegexFlags(flags);
  if (normalizedFlags.includes(flag)) {
    return normalizedFlags.replace(flag, "");
  }

  return normalizeRegexFlags(`${normalizedFlags}${flag}`);
}


function parseColorValue(input: string) {
  const value = input.trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split("").map((character) => character + character).join("") : hex[1];
    return { b: Number.parseInt(raw.slice(4, 6), 16), g: Number.parseInt(raw.slice(2, 4), 16), r: Number.parseInt(raw.slice(0, 2), 16) };
  }

  const rgb = /^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\)$/i.exec(value);
  if (rgb) {
    return { r: clampColor(Number(rgb[1])), g: clampColor(Number(rgb[2])), b: clampColor(Number(rgb[3])) };
  }

  const hsl = /^hsla?\(([-\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*[\d.]+)?\)$/i.exec(value);
  if (hsl) {
    return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
  }

  throw new Error("Unsupported color. Try #d9b861, rgb(217,184,97), or hsl(43,62%,62%).");
}

function getColorFormatsFromInput(input: string) {
  try {
    return getColorFormats(parseColorValue(input));
  } catch {
    return null;
  }
}

function getColorFormats(color: { b: number; g: number; r: number }) {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const hex = `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  return {
    cssVariable: `--color: ${hex};`,
    hex,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
  };
}

function formatColorReport(color: { b: number; g: number; r: number }) {
  const formats = getColorFormats(color);
  return [
    "[颜色]",
    `HEX: ${formats.hex}`,
    `RGB: ${formats.rgb}`,
    `HSL: ${formats.hsl}`,
    "",
    `${"CSS 变量"}:`,
    formats.cssVariable,
  ].join("\n");
}

function clampColor(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.min(100, Math.max(0, saturation)) / 100;
  const l = Math.min(100, Math.max(0, lightness)) / 100;
  if (s === 0) {
    const value = clampColor(l * 255);
    return { b: value, g: value, r: value };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (offset: number) => {
    let t = h + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { b: clampColor(channel(-1 / 3) * 255), g: clampColor(channel(0) * 255), r: clampColor(channel(1 / 3) * 255) };
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, l: Math.round(lightness * 100), s: 0 };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue = max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: Math.round(hue * 60), l: Math.round(lightness * 100), s: Math.round(saturation * 100) };
}

function unicodeEscape(value: string) {
  return Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0);
      if (codePoint === undefined) return "";
      return codePoint <= 0x7f ? character : `\\u{${codePoint.toString(16)}}`;
    })
    .join("");
}

function unicodeUnescape(value: string) {
  return value.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_match, codePoint, codeUnit) => String.fromCodePoint(parseInt(codePoint ?? codeUnit, 16)));
}

function htmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function htmlUnescape(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: "\"",
  };

  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const codePoint = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    if (body.startsWith("#")) {
      const codePoint = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return namedEntities[body] ?? entity;
  });
}

function formatCurrentTimestampInput(date: Date, unit: TimestampUnit) {
  const milliseconds = date.getTime();
  if (unit === "seconds") {
    return String(Math.floor(milliseconds / 1000));
  }
  return String(milliseconds);
}

function normalizeTimestampToMilliseconds(timestamp: number, unit: TimestampUnit) {
  if (unit === "seconds") {
    return timestamp * 1000;
  }
  if (unit === "milliseconds") {
    return timestamp;
  }
  return Math.abs(timestamp) < 100000000000 ? timestamp * 1000 : timestamp;
}

function formatDateReport(date: Date, displayMode: TimeDisplayMode) {
  const milliseconds = date.getTime();
  if (Number.isNaN(milliseconds)) {
    throw new Error("Invalid date.");
  }

  const displayLabel = displayMode === "utc" ? "UTC" : "Local";
  const displayValue = displayMode === "utc" ? date.toUTCString() : date.toLocaleString();
  return [`ISO: ${date.toISOString()}`, `${displayLabel}: ${displayValue}`, `Unix seconds: ${Math.floor(milliseconds / 1000)}`, `Unix milliseconds: ${milliseconds}`].join("\n");
}
