"use client";

import {
  ArrowDownToLine,
  ArrowRightLeft,
  Binary,
  Braces,
  Check,
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
  History,
  KeyRound,
  Link2,
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
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { convertDelimitedTextToJson } from "./tool-csv";
import { decodeJwtInput, formatHashResult } from "./tool-crypto";
import { clearToolHistory, deleteToolHistoryItem, readToolHistory, saveToolHistoryItem, type ToolHistoryItem, type ToolHistorySettings } from "./tool-history";
import { enhanceJsonError, getJsonErrorHighlight, translateJsonErrorReason } from "./tool-json-diagnostics";
import { renderMarkdownPreview, sanitizeMarkdownPreviewHtml } from "./tool-markdown";
import { readToolPreferences, writeToolPreferences } from "./tool-preferences";
import { toolSlugById } from "@/lib/tools-meta";
import { getSampleInput, sampleCsv, sampleMarkdown, sampleStructured } from "./tool-samples";
import { parseTomlDocument, parseYamlDocument } from "./tool-structured";
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
const DiffTool = dynamic(() => import("./diff-tool").then((m) => m.DiffTool), { ssr: false, loading: standaloneToolLoading });
const JsonToTsTool = dynamic(() => import("./json-to-ts-tool").then((m) => m.JsonToTsTool), { ssr: false, loading: standaloneToolLoading });

type TextHighlight = {
  end: number;
  start: number;
};

const generalLargeInputBytes = 5 * 1024 * 1024;
const hashFileWarningBytes = 50 * 1024 * 1024;
const hashFileLimitBytes = 256 * 1024 * 1024;
const jsonLargeInputBytes = 10 * 1024 * 1024;
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
  data: "data",
  diff: "writing",
  encoding: "encode",
  jsonToTs: "dev",
  hash: "dev",
  image: "media",
  imageBase64: "media",
  json: "data",
  jwt: "dev",
  linkQr: "media",
  markdown: "writing",
  qrDecode: "media",
  regex: "dev",
  text: "writing",
  time: "dev",
  uuid: "dev",
  watermark: "media",
  wechatQr: "media",
};

const copyLabels = {
  copy: "复制",
  copied: "已复制",
  download: "下载",
  input: "输入",
  output: "结果",
  importJson: "导入文件",
  resetSample: "恢复示例",
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
  sampleRestoredMessage: "示例已恢复。",
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
  { id: "jwt", label: "JWT", description: "本地解码 JWT Header 和 Payload，不验证签名。", icon: KeyRound },
  { id: "hash", label: "Hash", description: "计算 SHA-1、SHA-256、SHA-384 和 SHA-512 摘要。", icon: HashIcon },
  { id: "uuid", label: "UUID", description: "生成单个或批量 UUID v4。", icon: Fingerprint },
  { id: "regex", label: "正则", description: "测试正则表达式，查看匹配数量、位置和捕获组。", icon: Search },
  { id: "markdown", label: "MD", description: "Markdown 本地预览，适合快速检查标题、列表、引用和代码块。", icon: FileText },
  { id: "data", label: "YAML", description: "YAML / TOML 转 JSON，覆盖常见配置和 Front Matter 场景。", icon: Braces },
  { id: "csv", label: "CSV", description: "CSV / TSV 转 JSON，适合表格数据整理。", icon: Table2 },
  { id: "color", label: "颜色", description: "HEX、RGB、HSL 颜色格式互转。", icon: Palette },
  { id: "image", label: "图片", description: "本地压缩、转换 JPG / PNG / WebP，优先使用 WASM 编码器。", icon: FileImage },
  { id: "watermark", label: "水印", description: "给图片添加文字水印，支持单个定位与斜向平铺，可批量处理。", icon: Stamp },
  { id: "linkQr", label: "链接二维码", description: "输入网址后一键生成可下载的二维码 PNG。", icon: QrCode },
  { id: "wechatQr", label: "微信二维码", description: "上传微信加好友二维码和头像，本地合成中间带头像的扫一扫图片。", icon: QrCode },
  { id: "crop", label: "裁剪旋转", description: "按比例裁剪图片，支持圆形头像、90° 旋转和水平翻转。", icon: Crop },
  { id: "qrDecode", label: "二维码识别", description: "上传或粘贴二维码 / 条形码图片，本地解出链接或文本。", icon: ScanLine },
  { id: "imageBase64", label: "图片转 Base64", description: "图片与 Base64 / Data URI 互转，输出 CSS / HTML / Markdown 片段。", icon: Binary },
] as const;

const toolSearchAliases: Record<ToolTab, string> = {
  color: "hex rgb hsl css color palette yanse se sezhi",
  crop: "crop rotate flip image avatar circle ratio aspect cut tupian caijian xuanzhuan fanzhuan touxiang yuanxing bili",
  csv: "csv tsv table excel sheet delimiter comma tab biaoge",
  data: "yaml toml front matter config configuration json peizhi",
  diff: "diff compare text code difference changes merge duibi chayi wenben daima bijiao",
  encoding: "url uri base64 unicode html escape unescape encode decode bianma",
  jsonToTs: "json typescript ts type interface convert codegen leixing jiekou zhuanhuan",
  hash: "sha sha1 sha256 sha384 sha512 digest checksum file wenjian",
  image: "image compress convert jpg jpeg png webp resize photo picture media tupian yasuo zhuanhuan",
  imageBase64: "image base64 datauri data url css html markdown embed inline tupian bianma neilian",
  json: "json format minify validate sort flatten parse escape",
  jwt: "jwt token bearer header payload exp iat nbf",
  linkQr: "link url qr qrcode website webpage erweima lianjie wangzhi",
  markdown: "markdown md gfm preview render table code yulan",
  qrDecode: "qr qrcode barcode decode scan read recognize erweima tiaoma shibie saoma jiema",
  regex: "regex regexp regular expression pattern replace zhengze",
  text: "text string line dedupe sort trim uppercase lowercase wenben",
  time: "time timestamp unix date utc local seconds milliseconds shijian shijianchuo",
  uuid: "uuid guid random v4 id",
  watermark: "watermark text tiled diagonal photo picture copyright shuiyin wenzi pingpu banquan tupian",
  wechatQr: "wechat weixin qr qrcode contact friend avatar scan saoyisao erweima touxiang",
};

export function ToolsWorkbench({ initialTool }: { initialTool?: ToolTab } = {}) {
  const labels = copyLabels;
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [activeTab, setActiveTab] = useState<ToolTab>(initialTool ?? "json");
  const [activeGroup, setActiveGroup] = useState<ToolGroup>(initialTool ? toolGroupByTab[initialTool] : "data");
  const [mobilePanel, setMobilePanel] = useState<"input" | "output">("input");
  const [toolSearch, setToolSearch] = useState("");
  const [historyMounted, setHistoryMounted] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
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
  const [structuredFormat, setStructuredFormat] = useState<StructuredFormat>("yaml");
  const [structuredInput, setStructuredInput] = useState(sampleStructured);
  const [structuredOutput, setStructuredOutput] = useState("");
  const [uuidInput, setUuidInput] = useState("10");
  const [uuidOutput, setUuidOutput] = useState("");
  const [uuidFormat, setUuidFormat] = useState<UuidFormat>("standard");
  const jsonCancelRequestedRef = useRef(false);
  const jsonPendingRef = useRef<JsonWorkerPending | null>(null);
  const jsonRequestIdRef = useRef(0);
  const jsonWorkerRef = useRef<Worker | null>(null);
  const historyAnimationFrameRef = useRef(0);
  const historyCloseTimerRef = useRef(0);
  const utilityPendingRef = useRef<UtilityWorkerPending | null>(null);
  const utilityRequestIdRef = useRef(0);
  const utilityWorkerRef = useRef<Worker | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const hashFileInputRef = useRef<HTMLInputElement | null>(null);
  const toolUrlSeededRef = useRef(false);

  const currentOutput = getToolValue(activeTab, {
    color: colorOutput,
    crop: "",
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
    text: textOutput,
    time: timeOutput,
    uuid: uuidOutput,
    watermark: "",
    wechatQr: "",
  });
  const currentInput = getToolValue(activeTab, {
    color: colorInput,
    crop: "",
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
    text: textInput,
    time: timeInput,
    uuid: uuidInput,
    watermark: "",
    wechatQr: "",
  });
  const activeTabInfo = tabLabels.find((tab) => tab.id === activeTab) ?? tabLabels[0];
  const ActiveIcon = activeTabInfo.icon;
  const expandedWorkspace = isExpandedWorkspaceTool(activeTab);
  const panelSize = getPanelSize(activeTab);
  const filteredTabs = useMemo(() => {
    const keyword = toolSearch.trim().toLowerCase();
    return tabLabels.filter((tab) => {
      const searchable = `${tab.label} ${tab.description} ${tab.id} ${toolSearchAliases[tab.id]}`.toLowerCase();
      // 有关键词时跨所有分组搜索；否则只看当前分组（去掉「全部」后，搜索仍能找到任意工具）。
      return keyword ? searchable.includes(keyword) : toolGroupByTab[tab.id] === activeGroup;
    });
  }, [activeGroup, toolSearch]);
  const currentInputMetrics = useMemo(() => getTextMetrics(currentInput), [currentInput]);
  const currentOutputMetrics = useMemo(() => getTextMetrics(currentOutput), [currentOutput]);

  const textStats = useMemo(() => {
    const characters = textInput.length;
    const lines = textInput ? textInput.split(/\r?\n/).length : 0;
    const words = textInput.trim() ? textInput.trim().split(/\s+/).filter(Boolean).length : 0;
    return { characters, lines, words };
  }, [textInput]);

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
      setActiveTab(linkedTool ?? preferences.activeTab);
      setActiveGroup(linkedTool ? toolGroupByTab[linkedTool] : preferences.activeGroup);
      setCsvDelimiter(preferences.csvDelimiter);
      setCsvEmptyAsNull(preferences.csvEmptyAsNull);
      setCsvInferTypes(preferences.csvInferTypes);
      setCsvOutputMode(preferences.csvOutputMode);
      setHashAlgorithm(preferences.hashAlgorithm);
      setHashOutputFormat(preferences.hashOutputFormat);
      setJsonSpaces(preferences.jsonSpaces);
      setMarkdownAutoPreview(preferences.markdownAutoPreview);
      setStructuredFormat(preferences.structuredFormat);
      setTimeDisplayMode(preferences.timeDisplayMode);
      setTimestampUnit(preferences.timestampUnit);
      setUuidFormat(preferences.uuidFormat);
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
      activeTab,
      csvDelimiter,
      csvEmptyAsNull,
      csvInferTypes,
      csvOutputMode,
      hashAlgorithm,
      hashOutputFormat,
      jsonSpaces,
      markdownAutoPreview,
      structuredFormat,
      timeDisplayMode,
      timestampUnit,
      uuidFormat,
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
    jsonSpaces,
    markdownAutoPreview,
    preferencesReady,
    structuredFormat,
    timeDisplayMode,
    timestampUnit,
    uuidFormat,
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
    if (activeTab !== "json") {
      return;
    }

    // 过大的 JSON 不在主线程同步格式化，交给手动按钮走 Worker。
    if (jsonInput.trim() !== "" && new TextEncoder().encode(jsonInput).byteLength > jsonLargeInputBytes) {
      return;
    }

    const timeout = window.setTimeout(() => {
      // 输入为空时清空输出与错误高亮，避免残留上一次的结果。
      if (jsonInput.trim() === "") {
        setJsonOutput("");
        setJsonErrorHighlight(null);
        return;
      }

      try {
        const formatted = JSON.stringify(JSON.parse(jsonInput), null, Number(jsonSpaces));
        setJsonOutput(formatted);
        setJsonErrorHighlight(null);
      } catch (error) {
        // 防抖结束后仍非法才报错，和手动「格式化」按钮一致：输出区给错误信息 + 输入框行内高亮。
        const errorMessage = enhanceJsonError(error instanceof Error ? error.message : "JSON 格式无效。", jsonInput);
        setJsonOutput(formatJsonErrorOutput(errorMessage));
        setJsonErrorHighlight(getJsonErrorHighlight(errorMessage, jsonInput));
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activeTab, jsonInput, jsonSpaces]);

  useEffect(() => () => {
    clearHistoryTransitionTimers();
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

  function selectGroup(group: ToolGroup) {
    setActiveGroup(group);
    if (toolGroupByTab[activeTab] === group) {
      return;
    }

    const firstTool = tabLabels.find((tab) => toolGroupByTab[tab.id] === group);
    if (firstTool) {
      selectTool(firstTool.id);
    }
  }

  function onTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const count = filteredTabs.length;
    if (count === 0) {
      return;
    }

    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % count;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + count) % count;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    }

    const target = next === -1 ? null : filteredTabs[next];
    if (!target) {
      return;
    }

    event.preventDefault();
    selectTool(target.id);
    window.requestAnimationFrame(() => document.getElementById(`tools-tab-${target.id}`)?.focus());
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
    showStatus("idle", "");
  }

  function clearOutput() {
    setOutput("");
    setStructuredResult(null);
    if (activeTab === "json") {
      setJsonErrorHighlight(null);
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

  function restoreSampleInput() {
    setInput(getSampleInput(activeTab));
    setOutput("");
    setStructuredResult(null);
    showStatus("success", labels.sampleRestoredMessage);
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
    link.download = `zhizhi-${activeTab}-result.${downloadInfo.extension}`;
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
      setMobilePanel("output");
      showStatus("success", result.message);
    } catch (error) {
      if (jsonCancelRequestedRef.current) {
        showStatus("idle", "JSON 处理已取消。");
      } else {
        const errorMessage = formatToolError(error, "JSON 格式无效。");
        setJsonErrorHighlight(getJsonErrorHighlight(errorMessage, jsonInput));
        setJsonOutput(formatJsonErrorOutput(errorMessage));
        setStructuredResult(null);
        setMobilePanel("output");
      }
    } finally {
      jsonCancelRequestedRef.current = false;
      setJsonBusy(false);
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
      if (action === "dedupe" || action === "sort") {
        setTextBusy(true);
        showStatus("idle", "正在后台线程处理文本...");
        const result = await runUtilityInWorker(textInput, action === "dedupe" ? "textDedupe" : "textSort");
        setTextOutput(result.output);
        setMobilePanel("output");
        showStatus("success", `${"文本处理完成。"}${largeInputSuffix(inputMetrics.bytes)}`);
        return;
      }

      const lines = textInput.split(/\r?\n/);
      const result = {
        trimLines: () => lines.map((line) => line.trim()).join("\n"),
        removeEmpty: () => lines.filter((line) => line.trim()).join("\n"),
        lower: () => textInput.toLowerCase(),
        upper: () => textInput.toUpperCase(),
      }[action]();
      setTextOutput(result);
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
    <div className="grid gap-4">
      <section className="mx-auto w-full max-w-7xl rounded-md border border-line bg-paper/72 p-3 shadow-[var(--shadow-quiet)]">
        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" aria-label="工具分组">
              {toolGroups.map((group) => {
                const active = group.id === activeGroup;
                return (
                  <button
                    key={group.id}
                    className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-3 text-xs font-semibold transition ${
                      active ? "bg-accent/22 text-accent shadow-[var(--shadow-quiet)]" : "bg-accent/8 text-muted hover:bg-accent/12 hover:text-accent"
                    }`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectGroup(group.id)}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
            <label className="flex h-8 w-full items-center gap-2 rounded-md border border-line bg-background/64 px-2.5 text-xs font-semibold text-muted focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/15 sm:w-56 lg:w-64">
              <Search className="h-3.5 w-3.5 text-accent" />
              <input
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted"
                value={toolSearch}
                onChange={(event) => setToolSearch(event.target.value)}
                aria-label="搜索工具"
                placeholder="搜索"
              />
            </label>
          </div>
          <nav className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" aria-label="工具" role="tablist" aria-orientation="horizontal">
            {filteredTabs.map((tab, index) => {
              const active = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tools-tab-${tab.id}`}
                  className={`group flex min-h-20 cursor-pointer flex-col items-start gap-1.5 rounded-md border p-2.5 text-left transition ${
                    active
                      ? "border-accent/45 bg-accent/16 text-accent shadow-[var(--shadow-quiet)]"
                      : "border-line/75 bg-background/54 text-foreground hover:border-accent/32 hover:bg-accent/8 hover:text-accent"
                  }`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="tools-tabpanel"
                  tabIndex={active ? 0 : -1}
                  aria-label={`${tab.label}: ${tab.description}`}
                  onClick={() => selectTool(tab.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{tab.label}</span>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  </span>
                  <span className="line-clamp-2 text-[0.7rem] font-medium leading-4 text-muted">{tab.description}</span>
                </button>
              );
            })}
            {filteredTabs.length === 0 ? (
              <div className="col-span-full rounded-md border border-dashed border-line bg-background/54 px-3 py-4 text-xs font-semibold text-muted">
                没有匹配的工具。
              </div>
            ) : null}
          </nav>
        </div>
      </section>
      <section
        id="tools-tabpanel"
        role="tabpanel"
        aria-labelledby="tools-active-tool-heading"
        tabIndex={0}
        className={`index-surface tools-workbench-surface mx-auto w-full rounded-md border border-line p-4 md:p-5 ${expandedWorkspace ? "max-w-[108rem]" : "max-w-7xl"}`}
      >
        <div className="grid gap-4">
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
            <div className="grid justify-items-start sm:justify-items-end">
              <div className="max-w-full rounded-md border border-[color-mix(in_srgb,var(--accent)_34%,var(--line))] bg-accent/8 px-2.5 py-1.5 text-left text-xs font-semibold leading-5 text-accent">
                所有工具均在浏览器本地运行，<br className="hidden sm:inline" />您的任何信息都不会上传服务器。
              </div>
            </div>
          </div>

          {!isStandaloneTool(activeTab) ? (
          <div className="rounded-md bg-paper/54 p-2.5">
            {activeTab === "json" ? (
              <JsonControls
                spaces={jsonSpaces}
                setSpaces={setJsonSpaces}
                runJson={runJson}
                busy={jsonBusy}
                onCancel={cancelJsonTask}
                onImportClick={() => jsonFileInputRef.current?.click()}
              />
            ) : null}
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
            {activeTab === "text" ? <TextControls runText={runText} stats={textStats} busy={textBusy} /> : null}
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
          {activeTab === "qrDecode" ? <QrDecodeTool /> : null}
          {activeTab === "imageBase64" ? <ImageBase64Tool /> : null}
          {activeTab === "diff" ? <DiffTool /> : null}
          {activeTab === "jsonToTs" ? <JsonToTsTool /> : null}

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

          <div className={`grid gap-4 ${expandedWorkspace ? "lg:grid-cols-2 xl:gap-5" : "lg:grid-cols-2"}`}>
            <div className={mobilePanel === "input" ? "block" : "hidden lg:block"}>
              <EditorPanel
                label={labels.input}
                value={currentInput}
                onChange={setInput}
                metrics={currentInputMetrics}
                placeholder={activeTab === "time" ? "输入时间戳或日期字符串" : undefined}
                size={panelSize}
                highlight={activeTab === "json" ? jsonErrorHighlight : null}
                actions={
                  <>
                    <PanelActionButton icon={Clipboard} label={copiedTarget === "input" ? labels.copied : labels.copy} onClick={() => copyText(currentInput, "input")}>
                      {copiedTarget === "input" ? labels.copied : labels.copy}
                    </PanelActionButton>
                    <PanelActionButton icon={Save} label={labels.saveHistory} onClick={saveCurrentHistory}>{labels.saveHistory}</PanelActionButton>
                    <span data-tools-history-trigger="true">
                      <PanelActionButton icon={History} label={labels.history} onClick={toggleHistoryPanel}>{labels.history}</PanelActionButton>
                    </span>
                    <PanelActionButton label={labels.resetSample} onClick={restoreSampleInput}>{labels.resetSample}</PanelActionButton>
                    <PanelActionButton icon={Trash2} label={labels.clear} onClick={clearInput}>{labels.clear}</PanelActionButton>
                  </>
                }
              />
            </div>
            <div className={mobilePanel === "output" ? "block" : "hidden lg:block"}>
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
                  actions={
                    <>
                      <PanelActionButton icon={Clipboard} label={copiedTarget === "output" ? labels.copied : labels.copy} onClick={() => copyText(currentOutput, "output")}>
                        {copiedTarget === "output" ? labels.copied : labels.copy}
                      </PanelActionButton>
                      <PanelActionButton icon={Download} label={labels.download} onClick={downloadOutput}>{labels.download}</PanelActionButton>
                      <PanelActionButton icon={Trash2} label={labels.clear} onClick={clearOutput}>{labels.clear}</PanelActionButton>
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
                      <PanelActionButton icon={ArrowDownToLine} label={labels.swap} onClick={moveOutputToInput}>{labels.swap}</PanelActionButton>
                      <PanelActionButton icon={ArrowRightLeft} label={labels.exchange} onClick={exchangeInputOutput}>{labels.exchange}</PanelActionButton>
                      <PanelActionButton icon={Download} label={labels.download} onClick={downloadOutput}>{labels.download}</PanelActionButton>
                      <PanelActionButton icon={Trash2} label={labels.clear} onClick={clearOutput}>{labels.clear}</PanelActionButton>
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
                  size={panelSize}
                  actions={
                    <>
                      <PanelActionButton icon={Clipboard} label={copiedTarget === "output" ? labels.copied : labels.copy} onClick={() => copyText(currentOutput, "output")}>
                        {copiedTarget === "output" ? labels.copied : labels.copy}
                      </PanelActionButton>
                      <PanelActionButton icon={ArrowDownToLine} label={labels.swap} onClick={moveOutputToInput}>{labels.swap}</PanelActionButton>
                      <PanelActionButton icon={ArrowRightLeft} label={labels.exchange} onClick={exchangeInputOutput}>{labels.exchange}</PanelActionButton>
                      <PanelActionButton icon={Download} label={labels.download} onClick={downloadOutput}>{labels.download}</PanelActionButton>
                      <PanelActionButton icon={Trash2} label={labels.clear} onClick={clearOutput}>{labels.clear}</PanelActionButton>
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
      if (target instanceof Element && target.closest('[data-tools-history-trigger="true"]')) {
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
                <p className="line-clamp-3 break-all font-mono text-[0.7rem] leading-5 text-muted">{getHistoryInputPreviewText(item)}</p>
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

function JsonControls({
  spaces,
  setSpaces,
  runJson,
  busy,
  onCancel,
  onImportClick,
}: {
  spaces: string;
  setSpaces: (value: string) => void;
  runJson: (action: JsonAction) => void;
  busy: boolean;
  onCancel: () => void;
  onImportClick: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <IndentSelect label={copyLabels.spaces} value={spaces} onChange={setSpaces} />
        <ToolButton disabled={busy} onClick={onImportClick}>{copyLabels.importJson}</ToolButton>
        <ToolButton disabled={busy} variant="primary" onClick={() => runJson("format")}>{"格式化"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runJson("minify")}>{"压缩"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runJson("validate")}>{"校验"}</ToolButton>
        <button
          className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-accent/10 px-2.5 text-xs font-semibold text-[color-mix(in_srgb,var(--foreground)_72%,var(--muted))] transition hover:bg-accent/15 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-55"
          type="button"
          disabled={busy}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((current) => !current)}
        >
          {"更多"}
          <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`} />
        </button>
        {busy ? (
          <>
            <ControlHint>{"处理中..."}</ControlHint>
            <ToolButton onClick={onCancel}>{"取消"}</ToolButton>
          </>
        ) : null}
      </div>
      {moreOpen ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line/70 bg-background/45 p-2">
          <ToolButton disabled={busy} onClick={() => runJson("sort")}>{"Key 排序"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("escape")}>{"字符串转义"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("unescape")}>{"字符串反转义"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("flatten")}>{"扁平化"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("unflatten")}>{"还原扁平 JSON"}</ToolButton>
        </div>
      ) : null}
    </div>
  );
}

function IndentSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = ["2", "4", "6"];

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-accent/10 px-2.5 text-xs font-semibold text-[color-mix(in_srgb,var(--foreground)_72%,var(--muted))] transition hover:bg-accent/15 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-muted">{label}</span>
        <span>{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-30 min-w-24 rounded-md bg-paper p-1 shadow-[var(--shadow-quiet)] ring-1 ring-line" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option}
              className={`flex h-7 w-full cursor-pointer items-center justify-between rounded px-2 text-xs font-semibold transition hover:bg-accent/12 hover:text-accent ${
                value === option ? "text-accent" : "text-foreground"
              }`}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {value === option ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
              className={`h-6 min-w-6 cursor-pointer rounded px-1.5 text-[0.7rem] font-semibold transition ${
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

function TextControls({
  busy,
  runText,
  stats,
}: {
  busy: boolean;
  runText: (action: TextAction) => void;
  stats: { characters: number; lines: number; words: number };
}) {
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolButton disabled={busy} onClick={() => runText("trimLines")}>{"清理行首尾"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("removeEmpty")}>{"清理空行"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("dedupe")}>{"行去重"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("sort")}>{"行排序"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("lower")}>{"转小写"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("upper")}>{"转大写"}</ToolButton>
        {busy ? <ControlHint>{"处理中..."}</ControlHint> : null}
      </div>
      <div className="flex flex-wrap gap-1.5 text-[0.7rem] font-semibold text-muted">
        <span className="rounded-md bg-accent/8 px-2 py-0.5">{"字符"} {stats.characters}</span>
        <span className="rounded-md bg-accent/8 px-2 py-0.5">{"行数"} {stats.lines}</span>
        <span className="rounded-md bg-accent/8 px-2 py-0.5">{"词数"} {stats.words}</span>
      </div>
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
}) {
  const heightClass = getPanelHeightClass(size);
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

    const frame = window.requestAnimationFrame(() => {
      setTextareaScroll({ left: textarea.scrollLeft, top: textarea.scrollTop });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlight]);

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
      <div className="relative">
        {highlightParts ? (
          <pre
            className={`${heightClass} pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap rounded-md border border-transparent bg-paper/88 p-3.5 font-mono text-[0.8125rem] leading-6 text-transparent shadow-inner`}
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
          className={`${heightClass} relative w-full resize-y rounded-md border p-3.5 font-mono text-[0.8125rem] leading-6 shadow-inner outline-none transition ${
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
}: {
  actions?: ReactNode;
  html: string;
  label: string;
  metrics: TextMetrics;
  size?: EditorPanelSize;
}) {
  const heightClass = getPanelHeightClass(size);
  const hasError = isToolErrorOutput(html);

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
      {hasError ? (
        <pre className={`${heightClass} overflow-auto rounded-md border border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,var(--paper))] p-4 font-mono text-xs leading-6 text-[var(--accent-2)] shadow-inner`}>
          {html}
        </pre>
      ) : (
        <div
          className={`tools-markdown-preview ${heightClass} overflow-auto rounded-md border border-line bg-paper/88 p-4 text-sm leading-7 text-foreground shadow-inner`}
          dangerouslySetInnerHTML={{ __html: html || `<p class="tools-markdown-empty">${"点击生成预览后，这里会显示 Markdown 效果。"}</p>` }}
        />
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
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[var(--accent-2)]">{output}</pre>
        ) : output && result ? (
          renderStructuredResult(result)
        ) : output ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground">{output}</pre>
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
        <code className="block whitespace-pre-wrap break-all font-mono text-xs leading-6 text-foreground">{result.digest}</code>
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
              <code className="block whitespace-pre-wrap break-all font-mono text-xs leading-6 text-foreground">{match.match}</code>
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
      <pre className="overflow-auto whitespace-pre-wrap break-words rounded bg-paper/80 p-3 font-mono text-xs leading-6 text-foreground">{body}</pre>
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
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[var(--accent-2)]">{output}</pre>
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
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  label?: string;
}) {
  return (
    <button
      className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md bg-accent/6 px-2 text-[0.7rem] font-semibold text-muted transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}

function ControlHint({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center px-2 text-xs font-semibold leading-5 text-muted">
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
  return /^\[(?:JSON\s+error|JSON 错误|Error|错误)\]/i.test(value.trimStart());
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
    tab === "qrDecode" ||
    tab === "imageBase64" ||
    tab === "diff" ||
    tab === "jsonToTs"
  );
}

function getPanelSize(tab: ToolTab): EditorPanelSize {
  if (isExpandedWorkspaceTool(tab)) return "expanded";
  if (tab === "color" || tab === "time" || tab === "uuid") return "compact";
  if (tab === "jwt" || tab === "hash" || tab === "regex" || tab === "text" || tab === "encoding") return "medium";
  return "large";
}

function getPanelHeightClass(size: EditorPanelSize) {
  return {
    compact: "min-h-56 md:min-h-64",
    expanded: "min-h-[34rem] lg:min-h-[48rem] 2xl:min-h-[56rem]",
    medium: "min-h-80 lg:min-h-[30rem]",
    large: "min-h-[28rem] lg:min-h-[36rem]",
  }[size];
}

function getDownloadInfo(tab: ToolTab) {
  if (tab === "json" || tab === "csv" || tab === "data") {
    return { extension: "json", mimeType: "application/json;charset=utf-8" };
  }
  if (tab === "markdown") {
    return { extension: "html", mimeType: "text/html;charset=utf-8" };
  }
  if (tab === "color") {
    return { extension: "css", mimeType: "text/css;charset=utf-8" };
  }
  return { extension: "txt", mimeType: "text/plain;charset=utf-8" };
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
