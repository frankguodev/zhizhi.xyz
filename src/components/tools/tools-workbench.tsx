"use client";

import {
  ArrowDownToLine,
  ArrowRightLeft,
  Braces,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Download,
  FileText,
  Fingerprint,
  FileJson2,
  FileImage,
  Hash as HashIcon,
  History,
  KeyRound,
  Link2,
  Palette,
  QrCode,
  Rows3,
  Save,
  Search,
  Table2,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/site";
import { convertDelimitedTextToJson } from "./tool-csv";
import { decodeJwtInput, formatHashResult } from "./tool-crypto";
import { clearToolHistory, deleteToolHistoryItem, readToolHistory, saveToolHistoryItem, type ToolHistoryItem, type ToolHistorySettings } from "./tool-history";
import { ImageTool } from "./image-tool";
import { LinkQrTool } from "./link-qr-tool";
import { WechatQrTool } from "./wechat-qr-tool";
import { describeInvalidJsonPunctuation, findInvalidJsonPunctuationIndex, findInvalidJsonPunctuationRange } from "./tool-json-diagnostics";
import { renderMarkdownPreview, sanitizeMarkdownPreviewHtml } from "./tool-markdown";
import { readToolPreferences, writeToolPreferences } from "./tool-preferences";
import { getSampleInput, sampleCsv, sampleJson, sampleMarkdown, sampleStructured } from "./tool-samples";
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


type ToolsWorkbenchProps = {
  locale?: Locale;
};

type TextHighlight = {
  end: number;
  start: number;
};

type JsonLooseToken = {
  end: number;
  start: number;
  type: "literal" | "number" | "punct" | "string";
  value: string;
};

const jsonAnnotationTokens = ["<!--", "//", "/*", "#", "--", ";"] as const;
const generalLargeInputBytes = 5 * 1024 * 1024;
const hashFileWarningBytes = 50 * 1024 * 1024;
const hashFileLimitBytes = 256 * 1024 * 1024;
const jsonLargeInputBytes = 10 * 1024 * 1024;
const jsonWorkerTimeoutMs = 60000;
const historyDrawerTransitionMs = 240;
const utilityWorkerTimeoutMs = 60000;

const toolGroups: Record<Locale, readonly { id: ToolGroup; label: string }[]> = {
  zh: [
    { id: "all", label: "全部" },
    { id: "data", label: "数据" },
    { id: "encode", label: "编码" },
    { id: "dev", label: "开发" },
    { id: "media", label: "媒体" },
    { id: "writing", label: "文本" },
  ],
  en: [
    { id: "all", label: "All" },
    { id: "data", label: "Data" },
    { id: "encode", label: "Encoding" },
    { id: "dev", label: "Dev" },
    { id: "media", label: "Media" },
    { id: "writing", label: "Text" },
  ],
} as const;

const toolGroupByTab: Record<ToolTab, Exclude<ToolGroup, "all">> = {
  color: "dev",
  csv: "data",
  data: "data",
  encoding: "encode",
  hash: "dev",
  image: "media",
  json: "data",
  jwt: "dev",
  linkQr: "media",
  markdown: "writing",
  regex: "dev",
  text: "writing",
  time: "dev",
  uuid: "dev",
  wechatQr: "media",
};

const copyLabels = {
  zh: {
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
  },
  en: {
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    input: "Input",
    output: "Result",
    importJson: "Import file",
    resetSample: "Restore sample",
    swap: "Move result to input",
    exchange: "Swap",
    clear: "Clear",
    history: "History",
    saveHistory: "Save history",
    restore: "Restore",
    delete: "Delete",
    clearCurrentToolHistory: "Clear current tool",
    clearAllHistory: "Clear all",
    cancel: "Cancel",
    confirmClearAction: "Clear",
    confirmClearTitle: "Clear history",
    emptyHistory: "No saved history yet.",
    historySearch: "Search history",
    historyCurrentTool: "Current tool",
    historyAllTools: "All tools",
    historySavedMessage: "Saved to local history.",
    historyRestoredMessage: "History restored.",
    historyDeletedMessage: "History deleted.",
    historyClearedMessage: "History cleared.",
    emptyHistoryInput: "Input is empty. Nothing to save.",
    historyWithOutput: "Has result",
    historyInputOnly: "Input only",
    confirmClearCurrentHistory: "Clear saved history for the current tool?",
    confirmClearAllHistory: "Clear all saved tool history?",
    spaces: "Indent",
    copiedMessage: "Copied to clipboard.",
    downloadedMessage: "Result downloaded.",
    exchangedMessage: "Input and result swapped.",
    importFailed: "File import failed. Choose the file again.",
    importedMessage: "File imported into input.",
    movedMessage: "Result moved into input.",
    sampleRestoredMessage: "Sample restored.",
    copyFailed: "Copy failed. Select the result manually.",
    emptyInput: "There is no input to copy.",
    emptyOutput: "There is no result to copy.",
  },
} as const;

const tabLabels = {
  zh: [
    { id: "json", label: "JSON", description: "格式化、压缩、校验、排序、转义和扁平化。", icon: FileJson2 },
    { id: "encoding", label: "编码", description: "URL、Base64、Unicode 和 HTML 实体转换。", icon: Code2 },
    { id: "time", label: "时间", description: "时间戳与日期互转，自动识别秒和毫秒。", icon: TimerReset },
    { id: "text", label: "文本", description: "统计、去空行、去重、排序和大小写转换。", icon: Rows3 },
    { id: "jwt", label: "JWT", description: "本地解码 JWT Header 和 Payload，不验证签名。", icon: KeyRound },
    { id: "hash", label: "Hash", description: "计算 SHA-1、SHA-256、SHA-384 和 SHA-512 摘要。", icon: HashIcon },
    { id: "uuid", label: "UUID", description: "生成单个或批量 UUID v4。", icon: Fingerprint },
    { id: "regex", label: "正则", description: "测试正则表达式，查看匹配数量、位置和捕获组。", icon: Search },
    { id: "markdown", label: "MD", description: "Markdown 本地预览，适合快速检查标题、列表、引用和代码块。", icon: FileText },
    { id: "data", label: "YAML", description: "YAML / TOML 转 JSON，覆盖常见配置和 Front Matter 场景。", icon: Braces },
    { id: "csv", label: "CSV", description: "CSV / TSV 转 JSON，适合表格数据整理。", icon: Table2 },
    { id: "color", label: "颜色", description: "HEX、RGB、HSL 颜色格式互转。", icon: Palette },
    { id: "image", label: "图片", description: "本地压缩、转换 JPG / PNG / WebP，优先使用 WASM 编码器。", icon: FileImage },
    { id: "linkQr", label: "链接二维码", description: "输入网址后一键生成可下载的二维码 PNG。", icon: QrCode },
    { id: "wechatQr", label: "微信二维码", description: "上传微信加好友二维码和头像，本地合成中间带头像的扫一扫图片。", icon: QrCode },
  ],
  en: [
    { id: "json", label: "JSON", description: "Format, minify, validate, sort, escape, and flatten JSON.", icon: FileJson2 },
    { id: "encoding", label: "Encoding", description: "URL, Base64, Unicode, and HTML entity conversion.", icon: Code2 },
    { id: "time", label: "Time", description: "Convert timestamps and dates with second/millisecond detection.", icon: TimerReset },
    { id: "text", label: "Text", description: "Count, clean empty lines, dedupe, sort, and change case.", icon: Rows3 },
    { id: "jwt", label: "JWT", description: "Decode JWT header and payload locally. Signature is not verified.", icon: KeyRound },
    { id: "hash", label: "Hash", description: "Calculate SHA-1, SHA-256, SHA-384, and SHA-512 digests.", icon: HashIcon },
    { id: "uuid", label: "UUID", description: "Generate one or many UUID v4 values.", icon: Fingerprint },
    { id: "regex", label: "Regex", description: "Test a regular expression and inspect matches, positions, and captures.", icon: Search },
    { id: "markdown", label: "MD", description: "Preview Markdown locally for headings, lists, quotes, and code blocks.", icon: FileText },
    { id: "data", label: "YAML", description: "Convert common YAML / TOML config data to JSON.", icon: Braces },
    { id: "csv", label: "CSV", description: "Convert CSV / TSV tables to JSON for content and data cleanup.", icon: Table2 },
    { id: "color", label: "Color", description: "Convert between HEX, RGB, and HSL color formats.", icon: Palette },
    { id: "image", label: "Image", description: "Compress and convert JPG / PNG / WebP locally with WASM encoders first.", icon: FileImage },
    { id: "linkQr", label: "Link QR", description: "Enter a URL and generate a downloadable QR code PNG.", icon: QrCode },
    { id: "wechatQr", label: "WeChat QR", description: "Combine a WeChat contact QR code with an avatar locally in the browser.", icon: QrCode },
  ],
} as const;

const toolSearchAliases: Record<ToolTab, string> = {
  color: "hex rgb hsl css color palette yanse se sezhi",
  csv: "csv tsv table excel sheet delimiter comma tab biaoge",
  data: "yaml toml front matter config configuration json peizhi",
  encoding: "url uri base64 unicode html escape unescape encode decode bianma",
  hash: "sha sha1 sha256 sha384 sha512 digest checksum file wenjian",
  image: "image compress convert jpg jpeg png webp resize photo picture media tupian yasuo zhuanhuan",
  json: "json format minify validate sort flatten parse escape",
  jwt: "jwt token bearer header payload exp iat nbf",
  linkQr: "link url qr qrcode website webpage erweima lianjie wangzhi",
  markdown: "markdown md gfm preview render table code yulan",
  regex: "regex regexp regular expression pattern replace zhengze",
  text: "text string line dedupe sort trim uppercase lowercase wenben",
  time: "time timestamp unix date utc local seconds milliseconds shijian shijianchuo",
  uuid: "uuid guid random v4 id",
  wechatQr: "wechat weixin qr qrcode contact friend avatar scan saoyisao erweima touxiang",
};

export function ToolsWorkbench({ locale = "zh" }: ToolsWorkbenchProps) {
  const labels = copyLabels[locale];
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [activeTab, setActiveTab] = useState<ToolTab>("json");
  const [activeGroup, setActiveGroup] = useState<ToolGroup>("all");
  const [mobilePanel, setMobilePanel] = useState<"input" | "output">("input");
  const [toolSearch, setToolSearch] = useState("");
  const [historyMounted, setHistoryMounted] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [toolHistoryItems, setToolHistoryItems] = useState<ToolHistoryItem[]>([]);
  const [structuredResult, setStructuredResult] = useState<StructuredToolResult | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<"input" | "output" | null>(null);
  const [colorInput, setColorInput] = useState("#2f8f6b");
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
  const [jsonInput, setJsonInput] = useState(sampleJson);
  const [jsonErrorHighlight, setJsonErrorHighlight] = useState<TextHighlight | null>(null);
  const [jsonOutput, setJsonOutput] = useState("");
  const [jsonSpaces, setJsonSpaces] = useState("2");
  const [encodingInput, setEncodingInput] = useState("https://zhizhi.xyz/articles?tag=AI 应用");
  const [encodingOutput, setEncodingOutput] = useState("");
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [hashInput, setHashInput] = useState(locale === "en" ? "zhizhi tools" : "知之工具");
  const [hashOutput, setHashOutput] = useState("");
  const [hashOutputFormat, setHashOutputFormat] = useState<HashOutputFormat>("hex");
  const [jwtInput, setJwtInput] = useState("");
  const [jwtOutput, setJwtOutput] = useState("");
  const [markdownAutoPreview, setMarkdownAutoPreview] = useState(true);
  const [markdownInput, setMarkdownInput] = useState(sampleMarkdown);
  const [markdownOutput, setMarkdownOutput] = useState("");
  const [regexFlags, setRegexFlags] = useState("gi");
  const [regexInput, setRegexInput] = useState(locale === "en" ? "ZhiZhi tools\nzhizhi.xyz" : "知之工具\nzhizhi.xyz");
  const [regexOutput, setRegexOutput] = useState("");
  const [regexPattern, setRegexPattern] = useState(locale === "en" ? "zhizhi" : "知之|zhizhi");
  const [regexReplacement, setRegexReplacement] = useState("");
  const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>("local");
  const [timeInput, setTimeInput] = useState("");
  const [timeOutput, setTimeOutput] = useState("");
  const [timestampUnit, setTimestampUnit] = useState<TimestampUnit>("auto");
  const [textInput, setTextInput] = useState(locale === "en" ? "Knowledge\nTools\nKnowledge\n\nzhizhi" : "知识\n工具\n知识\n\n知之");
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

  const currentOutput = getToolValue(activeTab, {
    color: colorOutput,
    csv: csvOutput,
    data: structuredOutput,
    encoding: encodingOutput,
    hash: hashOutput,
    image: "",
    json: jsonOutput,
    jwt: jwtOutput,
    linkQr: "",
    markdown: markdownOutput,
    regex: regexOutput,
    text: textOutput,
    time: timeOutput,
    uuid: uuidOutput,
    wechatQr: "",
  });
  const currentInput = getToolValue(activeTab, {
    color: colorInput,
    csv: csvInput,
    data: structuredInput,
    encoding: encodingInput,
    hash: hashInput,
    image: "",
    json: jsonInput,
    jwt: jwtInput,
    linkQr: "",
    markdown: markdownInput,
    regex: regexInput,
    text: textInput,
    time: timeInput,
    uuid: uuidInput,
    wechatQr: "",
  });
  const activeTabInfo = tabLabels[locale].find((tab) => tab.id === activeTab) ?? tabLabels[locale][0];
  const ActiveIcon = activeTabInfo.icon;
  const defaultStatusMessage = locale === "en" ? "All tools run locally in your browser" : "所有工具均在浏览器本地运行";
  const expandedWorkspace = isExpandedWorkspaceTool(activeTab);
  const panelSize = getPanelSize(activeTab);
  const filteredTabs = useMemo(() => {
    const keyword = toolSearch.trim().toLowerCase();
    return tabLabels[locale].filter((tab) => {
      const inGroup = activeGroup === "all" || toolGroupByTab[tab.id] === activeGroup;
      const searchable = `${tab.label} ${tab.description} ${tab.id} ${toolSearchAliases[tab.id]}`.toLowerCase();
      return inGroup && (!keyword || searchable.includes(keyword));
    });
  }, [activeGroup, locale, toolSearch]);
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
        jsonPendingRef.current.reject(new Error(locale === "en" ? "JSON processing was cancelled." : "JSON 处理已取消。"));
        jsonPendingRef.current = null;
      }
      jsonWorkerRef.current?.terminate();
      jsonWorkerRef.current = null;
      if (utilityPendingRef.current) {
        window.clearTimeout(utilityPendingRef.current.timeout);
        utilityPendingRef.current.reject(new Error(locale === "en" ? "Tool processing was cancelled." : "工具处理已取消。"));
        utilityPendingRef.current = null;
      }
      utilityWorkerRef.current?.terminate();
      utilityWorkerRef.current = null;
    };
  }, [locale]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const preferences = readToolPreferences();
      const linkedTool = readToolFromUrl();
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
  }, []);

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

    const url = new URL(window.location.href);
    if (url.searchParams.get("tool") === activeTab) {
      return;
    }
    url.searchParams.set("tool", activeTab);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
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

  useEffect(() => () => {
    clearHistoryTransitionTimers();
  }, []);

  function terminateJsonWorker() {
    if (jsonPendingRef.current) {
      window.clearTimeout(jsonPendingRef.current.timeout);
      jsonPendingRef.current.reject(new Error(locale === "en" ? "JSON processing was cancelled." : "JSON 处理已取消。"));
      jsonPendingRef.current = null;
    }
    jsonWorkerRef.current?.terminate();
    jsonWorkerRef.current = null;
  }

  function cancelJsonTask() {
    jsonCancelRequestedRef.current = true;
    terminateJsonWorker();
    setJsonBusy(false);
    showStatus("idle", locale === "en" ? "JSON processing cancelled." : "JSON 处理已取消。");
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
      pending.reject(new Error(enhanceJsonError(event.data.error || (pending.locale === "en" ? "Invalid JSON." : "JSON 格式无效。"), pending.input, pending.locale)));
    };
    worker.onerror = (error) => {
      const pending = jsonPendingRef.current;
      if (pending) {
        window.clearTimeout(pending.timeout);
        jsonPendingRef.current = null;
        pending.reject(new Error(error.message || (locale === "en" ? "JSON worker failed." : "JSON 后台线程处理失败。")));
      }
      terminateJsonWorker();
    };
    jsonWorkerRef.current = worker;
    return worker;
  }

  function terminateUtilityWorker() {
    if (utilityPendingRef.current) {
      window.clearTimeout(utilityPendingRef.current.timeout);
      utilityPendingRef.current.reject(new Error(locale === "en" ? "Tool processing was cancelled." : "工具处理已取消。"));
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
      pending.reject(new Error(formatToolError(event.data.error, pending.locale === "en" ? "Tool processing failed." : "工具处理失败。", pending.locale)));
    };
    worker.onerror = (error) => {
      const pending = utilityPendingRef.current;
      if (pending) {
        window.clearTimeout(pending.timeout);
        utilityPendingRef.current = null;
        pending.reject(new Error(error.message || (pending.locale === "en" ? "Tool worker failed." : "工具后台线程处理失败。")));
      }
      terminateUtilityWorker();
    };
    utilityWorkerRef.current = worker;
    return worker;
  }

  function runUtilityInWorker(input: string, action: UtilityAction, options: Record<string, string> = {}) {
    return new Promise<UtilityWorkerResult>((resolve, reject) => {
      if (utilityPendingRef.current) {
        reject(new Error(locale === "en" ? "Another tool task is still running." : "另一个工具任务仍在处理中。"));
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
        reject(new Error(locale === "en" ? "Tool processing timed out. Try a smaller input." : "工具处理超时，请尝试更小的输入。"));
      }, utilityWorkerTimeoutMs);

      utilityPendingRef.current = { id, locale, reject, resolve, timeout };
      worker.postMessage({ id, input, action, locale, ...options });
    });
  }

  function runJsonInWorker(input: string, action: JsonAction, spaces: number) {
    return new Promise<JsonWorkerResult>((resolve, reject) => {
      if (jsonPendingRef.current) {
        reject(new Error(locale === "en" ? "Another JSON task is still running." : "另一个 JSON 任务仍在处理中。"));
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
        reject(new Error(locale === "en" ? "JSON processing timed out. Try a smaller file or a lighter action." : "JSON 处理超时，请尝试更小的数据或更轻的操作。"));
      }, jsonWorkerTimeoutMs);

      jsonPendingRef.current = { id, input, locale, reject, resolve, timeout };
      worker.postMessage({ id, input, action, spaces, locale });
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

    setOutput(formatToolErrorOutput(message, locale));
  }

  function selectTool(tab: ToolTab) {
    setActiveTab(tab);
    setMobilePanel("input");
    setStructuredResult(null);
    setCopiedTarget(null);
  }

  function selectGroup(group: ToolGroup) {
    setActiveGroup(group);
    if (group === "all" || toolGroupByTab[activeTab] === group) {
      return;
    }

    const firstTool = tabLabels[locale].find((tab) => toolGroupByTab[tab.id] === group);
    if (firstTool) {
      selectTool(firstTool.id);
    }
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
    setInput(getSampleInput(activeTab, locale));
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
        locale === "en"
          ? `File is ${formatBytes(file.size)}. For browser memory safety, file hashing is limited to ${formatBytes(hashFileLimitBytes)}.`
          : `文件大小为 ${formatBytes(file.size)}。为了避免浏览器内存压力，文件 Hash 上限为 ${formatBytes(hashFileLimitBytes)}。`,
      );
      if (hashFileInputRef.current) {
        hashFileInputRef.current.value = "";
      }
      return;
    }

    try {
      setHashBusy(true);
      setActiveTab("hash");
      showStatus("idle", locale === "en" ? "Calculating file hash..." : "正在计算文件 Hash...");
      if (file.size > hashFileWarningBytes) {
        showStatus(
          "idle",
          locale === "en"
            ? `Large file (${formatBytes(file.size)}). Reading it locally may take a moment.`
            : `检测到较大文件（${formatBytes(file.size)}），本地读取可能需要一点时间。`,
        );
      }
      const digest = await crypto.subtle.digest(hashAlgorithm, await file.arrayBuffer());
      const result = formatHashResult(digest, hashAlgorithm, hashOutputFormat, file.size, locale, file.name);
      setHashInput(locale === "en" ? `File: ${file.name}` : `文件：${file.name}`);
      setHashOutput(result.raw);
      setStructuredResult({ type: "hash", data: result.structured });
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "File hash calculated locally." : "文件 Hash 已在本地计算完成。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "File hash calculation failed." : "文件 Hash 计算失败。", locale));
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
      showStatus("idle", locale === "en" ? "Large JSON detected. Running in a worker so the page stays responsive." : "检测到较大的 JSON，正在用后台线程处理，页面会保持可操作。");
    } else {
      showStatus("idle", locale === "en" ? "Processing JSON..." : "正在处理 JSON...");
    }

    try {
      const result = await runJsonInWorker(jsonInput, action, Number(jsonSpaces));
      setJsonOutput(result.output);
      setJsonErrorHighlight(null);
      setMobilePanel("output");
      showStatus("success", result.message);
    } catch (error) {
      if (jsonCancelRequestedRef.current) {
        showStatus("idle", locale === "en" ? "JSON processing cancelled." : "JSON 处理已取消。");
      } else {
        const errorMessage = formatToolError(error, locale === "en" ? "Invalid JSON." : "JSON 格式无效。", locale);
        setJsonErrorHighlight(getJsonErrorHighlight(errorMessage, jsonInput));
        setJsonOutput(formatJsonErrorOutput(errorMessage, locale));
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
        showStatus("idle", locale === "en" ? "Processing Base64 in a worker..." : "正在后台线程处理 Base64...");
        const result = await runUtilityInWorker(input, action);
        setEncodingOutput(result.output);
        setMobilePanel("output");
        showStatus("success", `${locale === "en" ? "Base64 conversion completed." : "Base64 转换完成。"}${largeInputSuffix(inputMetrics.bytes, locale)}`);
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
      showStatus("success", `${locale === "en" ? "Encoding conversion completed." : "编码转换完成。"}${largeInputSuffix(inputMetrics.bytes, locale)}`);
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Conversion failed." : "转换失败。", locale));
    } finally {
      setEncodingBusy(false);
    }
  }

  function runTime(action: "now" | "timestampToDate" | "dateToTimestamp") {
    try {
      const now = new Date();
      if (action === "now") {
        const output = formatDateReport(now, timeDisplayMode, locale);
        setTimeInput(formatCurrentTimestampInput(now, timestampUnit));
        setTimeOutput(output);
        setMobilePanel("output");
        showStatus("success", locale === "en" ? "Current time generated." : "已生成当前时间。");
        return;
      }

      if (action === "timestampToDate") {
        const raw = timeInput.trim();
        const timestamp = Number(raw);
        if (!Number.isFinite(timestamp)) throw new Error(locale === "en" ? "Enter a valid timestamp." : "请输入有效时间戳。");
        const milliseconds = normalizeTimestampToMilliseconds(timestamp, timestampUnit);
        setTimeOutput(formatDateReport(new Date(milliseconds), timeDisplayMode, locale));
        setMobilePanel("output");
        showStatus("success", locale === "en" ? "Timestamp converted." : "时间戳已转换。");
        return;
      }

      const parsedDate = new Date(timeInput.trim());
      if (Number.isNaN(parsedDate.getTime())) throw new Error(locale === "en" ? "Enter a valid date string." : "请输入有效日期字符串。");
      setTimeOutput(formatDateReport(parsedDate, timeDisplayMode, locale));
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "Date converted." : "日期已转换。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Time conversion failed." : "时间转换失败。", locale));
    }
  }

  async function runText(action: TextAction) {
    const inputMetrics = getTextMetrics(textInput);
    try {
      if (action === "dedupe" || action === "sort") {
        setTextBusy(true);
        showStatus("idle", locale === "en" ? "Processing text in a worker..." : "正在后台线程处理文本...");
        const result = await runUtilityInWorker(textInput, action === "dedupe" ? "textDedupe" : "textSort");
        setTextOutput(result.output);
        setMobilePanel("output");
        showStatus("success", `${locale === "en" ? "Text conversion completed." : "文本处理完成。"}${largeInputSuffix(inputMetrics.bytes, locale)}`);
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
      showStatus("success", `${locale === "en" ? "Text conversion completed." : "文本处理完成。"}${largeInputSuffix(inputMetrics.bytes, locale)}`);
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Text conversion failed." : "文本处理失败。", locale));
    } finally {
      setTextBusy(false);
    }
  }

  function runJwtDecode() {
    try {
      const result = decodeJwtInput(jwtInput, locale);
      if (result.normalizedToken !== jwtInput.trim()) {
        setJwtInput(result.normalizedToken);
      }
      setJwtOutput(result.raw);
      setStructuredResult({ type: "jwt", data: result.structured });
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "JWT decoded locally. Signature was not verified." : "JWT 已在本地解码，未验证签名。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "JWT decode failed." : "JWT 解码失败。", locale));
    }
  }

  async function runHash() {
    try {
      setHashBusy(true);
      showStatus("idle", locale === "en" ? "Calculating hash..." : "正在计算 Hash...");
      const digest = await crypto.subtle.digest(hashAlgorithm, new TextEncoder().encode(hashInput));
      const result = formatHashResult(digest, hashAlgorithm, hashOutputFormat, getTextMetrics(hashInput).bytes, locale);
      setHashOutput(result.raw);
      setStructuredResult({ type: "hash", data: result.structured });
      setMobilePanel("output");
      showStatus("success", `${hashAlgorithm} ${locale === "en" ? "digest calculated." : "摘要已生成。"}`);
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Hash calculation failed." : "Hash 计算失败。", locale));
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
    showStatus("success", locale === "en" ? `${count} UUID v4 value(s) generated.` : `已生成 ${count} 个 UUID v4。`);
  }

  async function runRegexTest() {
    try {
      setRegexBusy(true);
      showStatus("idle", locale === "en" ? "Testing regex in a worker..." : "正在后台线程测试正则...");
      const result = await runUtilityInWorker(regexInput, "regexTest", { flags: normalizeRegexFlags(regexFlags), pattern: regexPattern });
      setRegexOutput(result.output);
      setStructuredResult(result.structured ? { type: "regex", data: result.structured } : null);
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "Regex test completed." : "正则测试完成。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Regex test failed." : "正则测试失败。", locale));
    } finally {
      setRegexBusy(false);
    }
  }

  async function runRegexReplace() {
    try {
      setRegexBusy(true);
      showStatus("idle", locale === "en" ? "Replacing with regex in a worker..." : "正在后台线程执行正则替换...");
      const result = await runUtilityInWorker(regexInput, "regexReplace", { flags: normalizeRegexFlags(regexFlags), pattern: regexPattern, replacement: regexReplacement });
      setRegexOutput(result.output);
      setStructuredResult(null);
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "Regex replacement completed." : "正则替换完成。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Regex replacement failed." : "正则替换失败。", locale));
    } finally {
      setRegexBusy(false);
    }
  }

  function runMarkdownPreview() {
    try {
      setMarkdownOutput(sanitizeMarkdownPreviewHtml(renderMarkdownPreview(markdownInput)));
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "Markdown preview generated locally." : "Markdown 预览已在本地生成。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Markdown preview failed." : "Markdown 预览失败。", locale));
    }
  }

  function runStructuredToJson() {
    try {
      const value = structuredFormat === "yaml" ? parseYamlDocument(structuredInput) : parseTomlDocument(structuredInput);
      setStructuredOutput(JSON.stringify(value, null, 2));
      setMobilePanel("output");
      showStatus("success", locale === "en" ? `${structuredFormat.toUpperCase()} converted to JSON.` : `${structuredFormat.toUpperCase()} 已转换为 JSON。`);
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Conversion failed." : "转换失败。", locale));
    }
  }

  function runCsvToJson() {
    try {
      const output = convertDelimitedTextToJson(csvInput, csvDelimiter, { emptyAsNull: csvEmptyAsNull, inferTypes: csvInferTypes, outputMode: csvOutputMode });
      setCsvOutput(output);
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "Table data converted to JSON." : "表格数据已转换为 JSON。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "CSV conversion failed." : "CSV 转换失败。", locale));
    }
  }

  function runColorConvert() {
    try {
      setColorOutput(formatColorReport(parseColorValue(colorInput), locale));
      setMobilePanel("output");
      showStatus("success", locale === "en" ? "Color converted." : "颜色已转换。");
    } catch (error) {
      showStatus("error", formatToolError(error, locale === "en" ? "Color conversion failed." : "颜色转换失败。", locale));
    }
  }

  return (
    <div className="grid gap-4">
      <section className="mx-auto w-full max-w-7xl rounded-md border border-line bg-paper/72 p-3 shadow-[var(--shadow-quiet)]">
        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" aria-label={locale === "en" ? "Tool groups" : "工具分组"}>
              {toolGroups[locale].map((group) => {
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
                aria-label={locale === "en" ? "Search tools" : "搜索工具"}
                placeholder={locale === "en" ? "Search" : "搜索"}
              />
            </label>
          </div>
          <nav className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" aria-label={locale === "en" ? "Tools" : "工具"}>
            {filteredTabs.map((tab) => {
              const active = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`group flex min-h-20 cursor-pointer flex-col items-start gap-1.5 rounded-md border p-2.5 text-left transition ${
                    active
                      ? "border-accent/45 bg-accent/16 text-accent shadow-[var(--shadow-quiet)]"
                      : "border-line/75 bg-background/54 text-foreground hover:border-accent/32 hover:bg-accent/8 hover:text-accent"
                  }`}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${tab.label}: ${tab.description}`}
                  onClick={() => selectTool(tab.id)}
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
                {locale === "en" ? "No tools match this filter." : "没有匹配的工具。"}
              </div>
            ) : null}
          </nav>
        </div>
      </section>
      <section className={`index-surface tools-workbench-surface mx-auto w-full rounded-md border border-line p-4 md:p-5 ${expandedWorkspace ? "max-w-[108rem]" : "max-w-7xl"}`}>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 pb-4">
            <div className="flex items-start gap-2.5">
              <span className="icon-action mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-accent">
                <ActiveIcon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">{activeTabInfo.label}</h2>
                <p className="mt-0.5 max-w-3xl text-xs leading-5 text-muted">{activeTabInfo.description}</p>
              </div>
            </div>
            <div className="grid justify-items-start sm:justify-items-end">
              <div className="rounded-md border border-[color-mix(in_srgb,var(--accent)_34%,var(--line))] bg-accent/8 px-2.5 py-1.5 text-xs font-semibold text-accent">
                {defaultStatusMessage}
              </div>
            </div>
          </div>

          {!isStandaloneTool(activeTab) ? (
          <div className="rounded-md bg-paper/54 p-2.5">
            {activeTab === "json" ? (
              <JsonControls
                locale={locale}
                spaces={jsonSpaces}
                setSpaces={setJsonSpaces}
                runJson={runJson}
                busy={jsonBusy}
                onCancel={cancelJsonTask}
                onImportClick={() => jsonFileInputRef.current?.click()}
              />
            ) : null}
            {activeTab === "encoding" ? <EncodingControls locale={locale} runEncoding={runEncoding} busy={encodingBusy} /> : null}
            {activeTab === "time" ? (
              <TimeControls
                displayMode={timeDisplayMode}
                locale={locale}
                runTime={runTime}
                timestampUnit={timestampUnit}
                onDisplayModeChange={setTimeDisplayMode}
                onTimestampUnitChange={setTimestampUnit}
              />
            ) : null}
            {activeTab === "text" ? <TextControls locale={locale} runText={runText} stats={textStats} busy={textBusy} /> : null}
            {activeTab === "jwt" ? <JwtControls locale={locale} onDecode={runJwtDecode} /> : null}
            {activeTab === "hash" ? (
              <HashControls
                algorithm={hashAlgorithm}
                busy={hashBusy}
                locale={locale}
                outputFormat={hashOutputFormat}
                onAlgorithmChange={setHashAlgorithm}
                onImportClick={() => hashFileInputRef.current?.click()}
                onOutputFormatChange={setHashOutputFormat}
                onRun={runHash}
              />
            ) : null}
            {activeTab === "uuid" ? <UuidControls format={uuidFormat} locale={locale} onFormatChange={setUuidFormat} onRun={runUuidGenerate} /> : null}
            {activeTab === "regex" ? (
              <RegexControls
                busy={regexBusy}
                flags={regexFlags}
                locale={locale}
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
              <MarkdownControls autoPreview={markdownAutoPreview} locale={locale} onAutoPreviewChange={setMarkdownAutoPreview} onRun={runMarkdownPreview} />
            ) : null}
            {activeTab === "data" ? <StructuredControls format={structuredFormat} locale={locale} onFormatChange={setStructuredFormat} onRun={runStructuredToJson} /> : null}
            {activeTab === "csv" ? (
              <CsvControls
                delimiter={csvDelimiter}
                emptyAsNull={csvEmptyAsNull}
                inferTypes={csvInferTypes}
                locale={locale}
                outputMode={csvOutputMode}
                onDelimiterChange={setCsvDelimiter}
                onEmptyAsNullChange={setCsvEmptyAsNull}
                onInferTypesChange={setCsvInferTypes}
                onOutputModeChange={setCsvOutputMode}
                onRun={runCsvToJson}
              />
            ) : null}
            {activeTab === "color" ? <ColorControls locale={locale} onRun={runColorConvert} /> : null}
          </div>
          ) : null}

          {historyMounted ? (
            <ToolHistoryPanel
              activeTab={activeTab}
              open={historyVisible}
              items={toolHistoryItems}
              labels={labels}
              locale={locale}
              search={historySearch}
              onClearAll={clearAllToolHistory}
              onClearCurrent={clearCurrentToolHistory}
              onClose={closeHistoryPanel}
              onDelete={deleteHistoryItem}
              onRestore={restoreHistoryItem}
              onSearchChange={setHistorySearch}
            />
          ) : null}

          {activeTab === "image" ? <ImageTool locale={locale} /> : null}
          {activeTab === "linkQr" ? <LinkQrTool locale={locale} /> : null}
          {activeTab === "wechatQr" ? <WechatQrTool locale={locale} /> : null}

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
                locale={locale}
                value={currentInput}
                onChange={setInput}
                metrics={currentInputMetrics}
                placeholder={activeTab === "time" ? (locale === "en" ? "Timestamp or date string" : "输入时间戳或日期字符串") : undefined}
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
                  locale={locale}
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
                  locale={locale}
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
                  locale={locale}
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
                  locale={locale}
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

          <div className="border-t border-line/80 pt-4">
            <div className="text-xs font-semibold text-muted">
              {locale === "en" ? "Tool selection is reflected in the URL, so this exact workspace can be shared." : "当前工具会写入 URL，方便下次打开或分享。"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type ToolCopyLabels = Record<keyof (typeof copyLabels)["zh"], string>;

function ToolHistoryPanel({
  activeTab,
  items,
  labels,
  locale,
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
  locale: Locale;
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
    const toolLabel = getToolTabLabel(item.tab, locale).toLowerCase();
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
        aria-label={locale === "en" ? "Close history" : "关闭历史"}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[86vh] flex-col rounded-t-lg border border-line bg-paper p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_48px_rgba(15,23,42,0.14)] transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:inset-x-auto md:bottom-4 md:right-4 md:top-20 md:w-[28rem] md:rounded-md md:pb-3 md:shadow-[var(--shadow-quiet)] motion-reduce:transition-none ${
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
              {locale === "en" ? "Local only" : "仅本地"}
            </span>
          </div>
          <button
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-accent/6 text-muted transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            type="button"
            aria-label={locale === "en" ? "Close history" : "关闭历史"}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-accent/8 p-1" aria-label={locale === "en" ? "History scope" : "历史范围"}>
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
                      <span className="rounded bg-accent/8 px-1.5 py-0.5 text-[0.68rem] font-semibold text-accent">{getToolTabLabel(item.tab, locale)}</span>
                      <span className="text-[0.68rem] font-semibold text-muted">{formatHistoryTime(item.updatedAt, locale)}</span>
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
            className="w-full max-w-sm rounded-md border border-line bg-paper p-4 shadow-[0_22px_70px_rgba(15,23,42,0.18)]"
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
  locale,
  spaces,
  setSpaces,
  runJson,
  busy,
  onCancel,
  onImportClick,
}: {
  locale: Locale;
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
        <IndentSelect label={copyLabels[locale].spaces} value={spaces} onChange={setSpaces} />
        <ToolButton disabled={busy} onClick={onImportClick}>{copyLabels[locale].importJson}</ToolButton>
        <ToolButton disabled={busy} variant="primary" onClick={() => runJson("format")}>{locale === "en" ? "Format" : "格式化"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runJson("minify")}>{locale === "en" ? "Minify" : "压缩"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runJson("validate")}>{locale === "en" ? "Validate" : "校验"}</ToolButton>
        <button
          className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-accent/10 px-2.5 text-xs font-semibold text-[color-mix(in_srgb,var(--foreground)_72%,var(--muted))] transition hover:bg-accent/15 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-55"
          type="button"
          disabled={busy}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((current) => !current)}
        >
          {locale === "en" ? "More" : "更多"}
          <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`} />
        </button>
        {busy ? (
          <>
            <ControlHint>{locale === "en" ? "Working..." : "处理中..."}</ControlHint>
            <ToolButton onClick={onCancel}>{locale === "en" ? "Cancel" : "取消"}</ToolButton>
          </>
        ) : null}
      </div>
      {moreOpen ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line/70 bg-background/45 p-2">
          <ToolButton disabled={busy} onClick={() => runJson("sort")}>{locale === "en" ? "Sort keys" : "Key 排序"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("escape")}>{locale === "en" ? "Escape string" : "字符串转义"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("unescape")}>{locale === "en" ? "Unescape string" : "字符串反转义"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("flatten")}>{locale === "en" ? "Flatten" : "扁平化"}</ToolButton>
          <ToolButton disabled={busy} onClick={() => runJson("unflatten")}>{locale === "en" ? "Unflatten" : "还原扁平 JSON"}</ToolButton>
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

function EncodingControls({ busy, locale, runEncoding }: { busy: boolean; locale: Locale; runEncoding: (action: EncodingAction) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton disabled={busy} onClick={() => runEncoding("urlEncode")}>URL Encode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("urlDecode")}>URL Decode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("base64Encode")}>Base64 Encode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("base64Decode")}>Base64 Decode</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("unicodeEscape")}>{locale === "en" ? "Unicode escape" : "Unicode 转义"}</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("unicodeUnescape")}>{locale === "en" ? "Unicode unescape" : "Unicode 反转义"}</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("htmlEscape")}>HTML Escape</ToolButton>
      <ToolButton disabled={busy} onClick={() => runEncoding("htmlUnescape")}>HTML Unescape</ToolButton>
      {busy ? <ControlHint>{locale === "en" ? "Working..." : "处理中..."}</ControlHint> : null}
    </div>
  );
}

function TimeControls({
  displayMode,
  locale,
  onDisplayModeChange,
  onTimestampUnitChange,
  runTime,
  timestampUnit,
}: {
  displayMode: TimeDisplayMode;
  locale: Locale;
  onDisplayModeChange: (value: TimeDisplayMode) => void;
  onTimestampUnitChange: (value: TimestampUnit) => void;
  runTime: (action: "now" | "timestampToDate" | "dateToTimestamp") => void;
  timestampUnit: TimestampUnit;
}) {
  const timestampUnits: { label: string; value: TimestampUnit }[] = [
    { label: locale === "en" ? "Auto unit" : "自动单位", value: "auto" },
    { label: locale === "en" ? "Seconds" : "秒", value: "seconds" },
    { label: locale === "en" ? "Milliseconds" : "毫秒", value: "milliseconds" },
  ];
  const displayModes: { label: string; value: TimeDisplayMode }[] = [
    { label: locale === "en" ? "Local" : "本地", value: "local" },
    { label: "UTC", value: "utc" },
  ];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolButton onClick={() => runTime("now")} icon={TimerReset} variant="primary">
          {locale === "en" ? "Now" : "当前时间"}
        </ToolButton>
        <ToolButton onClick={() => runTime("timestampToDate")}>{locale === "en" ? "Timestamp to date" : "时间戳转日期"}</ToolButton>
        <ToolButton onClick={() => runTime("dateToTimestamp")}>{locale === "en" ? "Date to timestamp" : "日期转时间戳"}</ToolButton>
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
        <ControlHint>{locale === "en" ? "Unit selection affects timestamp conversion and Now input." : "单位选项会影响时间戳转换和当前时间输入。"}</ControlHint>
      </div>
    </div>
  );
}

function JwtControls({ locale, onDecode }: { locale: Locale; onDecode: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton onClick={onDecode} variant="primary">{locale === "en" ? "Decode JWT" : "解码 JWT"}</ToolButton>
      <ControlHint>{locale === "en" ? "Local decode only; signature is not verified." : "仅本地解码，不验证签名。"}</ControlHint>
    </div>
  );
}

function HashControls({
  algorithm,
  busy,
  locale,
  outputFormat,
  onAlgorithmChange,
  onImportClick,
  onOutputFormatChange,
  onRun,
}: {
  algorithm: HashAlgorithm;
  busy: boolean;
  locale: Locale;
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
      <ToolButton disabled={busy} onClick={onImportClick}>{locale === "en" ? "Hash file" : "文件 Hash"}</ToolButton>
      <ToolButton disabled={busy} variant="primary" onClick={onRun}>{locale === "en" ? "Calculate" : "计算"}</ToolButton>
      {busy ? <ControlHint>{locale === "en" ? "Working..." : "处理中..."}</ControlHint> : null}
    </div>
  );
}

function UuidControls({
  format,
  locale,
  onFormatChange,
  onRun,
}: {
  format: UuidFormat;
  locale: Locale;
  onFormatChange: (value: UuidFormat) => void;
  onRun: () => void;
}) {
  const formats: { label: string; value: UuidFormat }[] = [
    { label: locale === "en" ? "Standard" : "标准", value: "standard" },
    { label: locale === "en" ? "Upper" : "大写", value: "uppercase" },
    { label: locale === "en" ? "Compact" : "无连字符", value: "compact" },
    { label: "JSON", value: "json" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {formats.map((item) => (
        <ToolButton key={item.value} ariaPressed={item.value === format} onClick={() => onFormatChange(item.value)}>
          {item.value === format ? `${item.label} ✓` : item.label}
        </ToolButton>
      ))}
      <ToolButton onClick={onRun} variant="primary">{locale === "en" ? "Generate UUID v4" : "生成 UUID v4"}</ToolButton>
      <ControlHint>{locale === "en" ? "Put the count in the input box. Max 1000." : "在输入框填写数量，最多 1000 个。"}</ControlHint>
    </div>
  );
}

function RegexControls({
  busy,
  flags,
  locale,
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
  locale: Locale;
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
        <span>{locale === "en" ? "Pattern" : "表达式"}</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
          value={pattern}
          onChange={(event) => onPatternChange(event.target.value)}
          placeholder={locale === "en" ? "pattern" : "正则"}
        />
      </label>
      <label className="flex h-8 min-w-44 items-center gap-1.5 rounded-md bg-accent/10 px-2.5 text-xs font-semibold text-muted">
        <span>{locale === "en" ? "Replace" : "替换为"}</span>
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
      <ToolButton disabled={busy} variant="primary" onClick={onRun}>{locale === "en" ? "Test" : "测试"}</ToolButton>
      <ToolButton disabled={busy} onClick={onReplace}>{locale === "en" ? "Replace" : "替换"}</ToolButton>
      {busy ? <ControlHint>{locale === "en" ? "Working..." : "处理中..."}</ControlHint> : null}
    </div>
  );
}

function MarkdownControls({
  autoPreview,
  locale,
  onAutoPreviewChange,
  onRun,
}: {
  autoPreview: boolean;
  locale: Locale;
  onAutoPreviewChange: (value: boolean) => void;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton onClick={onRun} variant="primary">{locale === "en" ? "Preview" : "生成预览"}</ToolButton>
      <ToolButton ariaPressed={autoPreview} onClick={() => onAutoPreviewChange(!autoPreview)}>{autoPreview ? (locale === "en" ? "Auto preview ✓" : "自动预览 ✓") : locale === "en" ? "Auto preview" : "自动预览"}</ToolButton>
      <ControlHint>{locale === "en" ? "Supports common GFM syntax; raw HTML is escaped." : "支持常见 GFM 语法，原始 HTML 会被转义。"}</ControlHint>
    </div>
  );
}

function StructuredControls({
  format,
  locale,
  onFormatChange,
  onRun,
}: {
  format: StructuredFormat;
  locale: Locale;
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
      <ToolButton onClick={onRun} variant="primary">{locale === "en" ? "To JSON" : "转 JSON"}</ToolButton>
      <ControlHint>{locale === "en" ? "Common YAML/TOML subset; errors include line numbers." : "支持常见 YAML/TOML 子集，错误会提示行号。"}</ControlHint>
    </div>
  );
}

function CsvControls({
  delimiter,
  emptyAsNull,
  inferTypes,
  locale,
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
  locale: Locale;
  outputMode: CsvOutputMode;
  onDelimiterChange: (value: CsvDelimiter) => void;
  onEmptyAsNullChange: (value: boolean) => void;
  onInferTypesChange: (value: boolean) => void;
  onOutputModeChange: (value: CsvOutputMode) => void;
  onRun: () => void;
}) {
  const options: { label: string; value: CsvDelimiter }[] = [
    { label: locale === "en" ? "Auto" : "自动", value: "auto" },
    { label: "CSV", value: "comma" },
    { label: "TSV", value: "tab" },
  ];
  const outputModes: { label: string; value: CsvOutputMode }[] = [
    { label: locale === "en" ? "Objects" : "对象数组", value: "objects" },
    { label: locale === "en" ? "Rows" : "二维数组", value: "rows" },
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
      <ToolButton ariaPressed={inferTypes} onClick={() => onInferTypesChange(!inferTypes)}>{inferTypes ? (locale === "en" ? "Infer types ✓" : "类型推断 ✓") : locale === "en" ? "Infer types" : "类型推断"}</ToolButton>
      <ToolButton ariaPressed={emptyAsNull} onClick={() => onEmptyAsNullChange(!emptyAsNull)}>{emptyAsNull ? (locale === "en" ? "Empty=null ✓" : "空值=null ✓") : locale === "en" ? "Empty=null" : "空值=null"}</ToolButton>
      <ToolButton onClick={onRun} variant="primary">{locale === "en" ? "To JSON" : "转 JSON"}</ToolButton>
      <ControlHint>{locale === "en" ? "First row is used as field names." : "默认第一行作为字段名。"}</ControlHint>
    </div>
  );
}

function ColorControls({ locale, onRun }: { locale: Locale; onRun: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolButton onClick={onRun} variant="primary">{locale === "en" ? "Convert color" : "转换颜色"}</ToolButton>
      <ControlHint>HEX / RGB / HSL</ControlHint>
    </div>
  );
}

function TextControls({
  busy,
  locale,
  runText,
  stats,
}: {
  busy: boolean;
  locale: Locale;
  runText: (action: TextAction) => void;
  stats: { characters: number; lines: number; words: number };
}) {
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolButton disabled={busy} onClick={() => runText("trimLines")}>{locale === "en" ? "Trim lines" : "清理行首尾"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("removeEmpty")}>{locale === "en" ? "Remove empty lines" : "清理空行"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("dedupe")}>{locale === "en" ? "Dedupe lines" : "行去重"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("sort")}>{locale === "en" ? "Sort lines" : "行排序"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("lower")}>{locale === "en" ? "Lowercase" : "转小写"}</ToolButton>
        <ToolButton disabled={busy} onClick={() => runText("upper")}>{locale === "en" ? "Uppercase" : "转大写"}</ToolButton>
        {busy ? <ControlHint>{locale === "en" ? "Working..." : "处理中..."}</ControlHint> : null}
      </div>
      <div className="flex flex-wrap gap-1.5 text-[0.7rem] font-semibold text-muted">
        <span className="rounded-md bg-accent/8 px-2 py-0.5">{locale === "en" ? "Chars" : "字符"} {stats.characters}</span>
        <span className="rounded-md bg-accent/8 px-2 py-0.5">{locale === "en" ? "Lines" : "行数"} {stats.lines}</span>
        <span className="rounded-md bg-accent/8 px-2 py-0.5">{locale === "en" ? "Words" : "词数"} {stats.words}</span>
      </div>
    </div>
  );
}

function EditorPanel({
  label,
  locale,
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
  locale: Locale;
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
            {metrics.displaySize} · {metrics.lines} {locale === "en" ? "lines" : "行"} · {metrics.characters} {locale === "en" ? "chars" : "字符"}
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
  locale,
  metrics,
  size = "large",
}: {
  actions?: ReactNode;
  html: string;
  label: string;
  locale: Locale;
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
            {metrics.displaySize} · {metrics.lines} {locale === "en" ? "lines" : "行"} · {metrics.characters} {locale === "en" ? "chars" : "字符"}
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
          dangerouslySetInnerHTML={{ __html: html || `<p class="tools-markdown-empty">${locale === "en" ? "Generate a preview to see Markdown here." : "点击生成预览后，这里会显示 Markdown 效果。"}</p>` }}
        />
      )}
    </div>
  );
}

function StructuredResultPanel({
  actions,
  label,
  locale,
  metrics,
  output,
  result,
  size = "medium",
}: {
  actions?: ReactNode;
  label: string;
  locale: Locale;
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
            {metrics.displaySize} · {metrics.lines} {locale === "en" ? "lines" : "行"} · {metrics.characters} {locale === "en" ? "chars" : "字符"}
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
          renderStructuredResult(result, locale)
        ) : output ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground">{output}</pre>
        ) : (
          <p className="text-xs font-semibold text-muted">{locale === "en" ? "Run the tool to see structured results here." : "运行工具后，这里会显示结构化结果。"}</p>
        )}
      </div>
    </div>
  );
}

function renderStructuredResult(result: StructuredToolResult, locale: Locale) {
  if (result.type === "hash") return <HashStructuredResult result={result.data} locale={locale} />;
  if (result.type === "jwt") return <JwtStructuredResult result={result.data} locale={locale} />;
  return <RegexStructuredResult result={result.data} locale={locale} />;
}

function HashStructuredResult({ locale, result }: { locale: Locale; result: HashStructuredResultData }) {
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
        <div className="mb-2 text-[0.68rem] font-semibold uppercase text-muted">{locale === "en" ? "Digest" : "摘要"}</div>
        <code className="block whitespace-pre-wrap break-all font-mono text-xs leading-6 text-foreground">{result.digest}</code>
      </div>
    </div>
  );
}

function JwtStructuredResult({ locale, result }: { locale: Locale; result: JwtStructuredResultData }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-[color-mix(in_srgb,var(--accent-2)_30%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_7%,transparent)] p-3">
        <div className="text-xs font-semibold text-[var(--accent-2)]">{locale === "en" ? "Signature is not verified" : "未验证签名"}</div>
        <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted">{result.signatureBody}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoBlock title={locale === "en" ? "Expiration" : "过期状态"} body={result.expirationBody} />
        <InfoBlock title={locale === "en" ? "Time claims" : "时间字段"} body={result.timeClaimsBody} />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <CodeBlock title="Header" body={result.headerJson} />
        <CodeBlock title="Payload" body={result.payloadJson} />
      </div>
    </div>
  );
}

function RegexStructuredResult({ locale, result }: { locale: Locale; result: RegexStructuredResultData }) {
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
              {match.captures.length > 0 ? <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{`${locale === "en" ? "captures" : "捕获组"}: ${JSON.stringify(match.captures)}`}</div> : null}
              {match.groups ? <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{`${locale === "en" ? "named groups" : "命名组"}: ${JSON.stringify(match.groups)}`}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line bg-background/54 p-4 text-xs font-semibold text-muted">{locale === "en" ? "No matches to display." : "没有可显示的匹配结果。"}</div>
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
  locale,
  metrics,
  onClear,
  onCopy,
  onDownload,
  output,
  size = "medium",
}: {
  input: string;
  label: string;
  locale: Locale;
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
        { label: locale === "en" ? "CSS variable" : "CSS 变量", value: color.cssVariable },
      ]
    : [];
  const copyAllValue = output || (color ? [locale === "en" ? "[Color]" : "[颜色]", `HEX: ${color.hex}`, `RGB: ${color.rgb}`, `HSL: ${color.hsl}`, "", `${locale === "en" ? "CSS variables" : "CSS 变量"}:`, color.cssVariable].join("\n") : "");

  return (
    <div className="block">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Link2 className="h-3 w-3 text-accent" />
          {label}
          <span className="font-medium text-muted/80">
            {metrics.displaySize} · {metrics.lines} {locale === "en" ? "lines" : "行"} · {metrics.characters} {locale === "en" ? "chars" : "字符"}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <PanelActionButton icon={Clipboard} label={locale === "en" ? "Copy all" : "复制全部"} onClick={() => onCopy(copyAllValue)}>{locale === "en" ? "Copy all" : "复制全部"}</PanelActionButton>
          <PanelActionButton icon={Download} label={locale === "en" ? "Download" : "下载"} onClick={onDownload}>{locale === "en" ? "Download" : "下载"}</PanelActionButton>
          <PanelActionButton icon={Trash2} label={locale === "en" ? "Clear" : "清空"} onClick={onClear}>{locale === "en" ? "Clear" : "清空"}</PanelActionButton>
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
                  <PanelActionButton icon={Clipboard} label={locale === "en" ? "Copy" : "复制"} onClick={() => onCopy(item.value)}>{locale === "en" ? "Copy" : "复制"}</PanelActionButton>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs font-semibold text-muted">{locale === "en" ? "Enter a valid HEX, RGB, or HSL value." : "输入有效的 HEX、RGB 或 HSL 颜色值。"}</p>
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
          ? "bg-accent text-white shadow-[var(--shadow-quiet)] hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--foreground))] disabled:hover:bg-accent"
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

function getToolTabLabel(tab: ToolTab, locale: Locale) {
  return tabLabels[locale].find((item) => item.id === tab)?.label ?? tab;
}

function formatHistoryTime(timestamp: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
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

function largeInputSuffix(bytes: number, locale: Locale) {
  if (bytes <= generalLargeInputBytes) {
    return "";
  }

  return locale === "en"
    ? " Large input detected; this operation may take longer."
    : " 检测到较大输入，本次操作可能需要更久。";
}

function formatJsonErrorOutput(message: string, locale: Locale) {
  return formatToolErrorOutput(message, locale, locale === "en" ? "[JSON error]" : "[JSON 错误]");
}

function formatToolErrorOutput(message: string, locale: Locale, title = locale === "en" ? "[Error]" : "[错误]") {
  const detail = normalizeErrorDetail(message);
  const location = extractErrorLocation(message, locale);
  const context = extractErrorContext(message, locale);
  const lines = [
    title,
    `${locale === "en" ? "Detail" : "详细信息"}：${detail}`,
  ];
  if (location) {
    lines.push(`${locale === "en" ? "Position" : "位置"}：${location}`);
  }
  if (context) {
    lines.push(`${locale === "en" ? "Nearby" : "附近"}：${context}`);
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

function extractErrorLocation(message: string, locale: Locale) {
  const zhLocation = message.match(/第\s*(\d+)\s*行，第\s*(\d+)\s*列/);
  if (zhLocation) {
    return locale === "en" ? `line ${zhLocation[1]}, column ${zhLocation[2]}` : `第 ${zhLocation[1]} 行，第 ${zhLocation[2]} 列`;
  }
  const enLocation = message.match(/line\s*(\d+),\s*column\s*(\d+)/i);
  if (enLocation) {
    return locale === "en" ? `line ${enLocation[1]}, column ${enLocation[2]}` : `第 ${enLocation[1]} 行，第 ${enLocation[2]} 列`;
  }
  return "";
}

function getJsonErrorHighlight(message: string, input: string): TextHighlight | null {
  const location = findJsonErrorLocation(message, input);
  if (!location) {
    return null;
  }

  const index = lineColumnToIndex(input, location.line, location.column);
  const line = getLineBounds(input, index);
  const lineText = input.slice(line.start, line.end);
  const pointer = clampNumber(index - line.start, 0, lineText.length);
  const previousTrailingComma = getPreviousTrailingCommaHighlight(input, line.start, lineText);
  if (previousTrailingComma) {
    return previousTrailingComma;
  }

  const suspicious = findSuspiciousJsonRangeOnLine(lineText, pointer);
  return normalizeHighlight({
    end: line.start + suspicious.end,
    start: line.start + suspicious.start,
  }, input.length);
}

function getPreviousTrailingCommaHighlight(input: string, currentLineStart: number, currentLineText: string): TextHighlight | null {
  if (!/^\s*[}\]]/.test(currentLineText)) {
    return null;
  }

  let previousContentEnd = currentLineStart - 1;
  while (previousContentEnd >= 0 && /[\r\n\s]/.test(input[previousContentEnd])) {
    previousContentEnd -= 1;
  }
  if (previousContentEnd < 0 || input[previousContentEnd] !== ",") {
    return null;
  }

  const previousLineStart = input.lastIndexOf("\n", previousContentEnd) + 1;
  const previousLineText = input.slice(previousLineStart, previousContentEnd + 1);
  const firstContent = previousLineText.search(/\S/);
  if (firstContent === -1) {
    return null;
  }

  return normalizeHighlight({
    end: previousContentEnd + 1,
    start: previousLineStart + firstContent,
  }, input.length);
}

function findSuspiciousJsonRangeOnLine(lineText: string, pointer: number) {
  const safePointer = clampNumber(pointer, 0, lineText.length);
  const invalidPunctuationRange = findInvalidJsonPunctuationRange(lineText, safePointer);
  if (invalidPunctuationRange) {
    return invalidPunctuationRange;
  }

  const trailingCommaRange = getTrailingCommaHighlightRange(lineText, safePointer);
  if (trailingCommaRange) {
    return trailingCommaRange;
  }

  const annotationRange = getJsonAnnotationHighlightRange(lineText, safePointer);
  if (annotationRange) {
    return annotationRange;
  }

  const missingSeparatorRange = getMissingSeparatorHighlightRange(lineText, safePointer);
  if (missingSeparatorRange) {
    return missingSeparatorRange;
  }

  const windowStart = Math.max(0, safePointer - 96);
  const windowEnd = Math.min(lineText.length, safePointer + 24);
  const windowText = lineText.slice(windowStart, windowEnd);
  const candidates: TextHighlight[] = [];

  collectJsonRangeCandidates(windowText, /"[^"\r\n]*"\s*:\s*[^,\]}\r\n]*(?:,\s*[}\]]+)+/g, windowStart, candidates);
  collectJsonRangeCandidates(windowText, /"[^"\r\n]*"\s*:\s*[^,\]}\r\n]*(?:,\s*)?/g, windowStart, candidates);

  const matchingCandidate = candidates
    .filter((candidate) => candidate.start <= safePointer && candidate.end >= safePointer)
    .sort((left, right) => (right.end - right.start) - (left.end - left.start))[0];
  if (matchingCandidate) {
    return matchingCandidate;
  }

  const nearestCandidate = candidates
    .filter((candidate) => candidate.start <= safePointer)
    .sort((left, right) => Math.abs(left.end - safePointer) - Math.abs(right.end - safePointer))[0];
  if (nearestCandidate) {
    return nearestCandidate;
  }

  return fallbackJsonHighlightRange(lineText, safePointer);
}

function getTrailingCommaHighlightRange(lineText: string, pointer: number): TextHighlight | null {
  const directCommaRange = getCommaBeforeClosingRange(lineText, pointer);
  if (directCommaRange) {
    return directCommaRange;
  }

  const nextToken = findNextNonWhitespaceIndex(lineText, pointer);
  if (nextToken !== -1 && (lineText[nextToken] === "}" || lineText[nextToken] === "]")) {
    return getCommaBeforeClosingRange(lineText, nextToken);
  }

  const previousToken = findPreviousNonWhitespaceIndex(lineText, pointer);
  if (previousToken !== -1 && lineText[pointer] === "," && (lineText[previousToken] === "}" || lineText[previousToken] === "]")) {
    return {
      end: pointer + 1,
      start: findJsonSegmentStart(lineText, previousToken),
    };
  }

  return null;
}

function getCommaBeforeClosingRange(lineText: string, tokenIndex: number): TextHighlight | null {
  const character = lineText[tokenIndex];
  if (character === ",") {
    const nextToken = findNextNonWhitespaceIndex(lineText, tokenIndex + 1);
    if (nextToken !== -1 && (lineText[nextToken] === "," || lineText[nextToken] === "}" || lineText[nextToken] === "]")) {
      return {
        end: nextToken + 1,
        start: findJsonSegmentStart(lineText, tokenIndex),
      };
    }
    return null;
  }

  if (character !== "}" && character !== "]") {
    return null;
  }

  const previousToken = findPreviousNonWhitespaceIndex(lineText, tokenIndex);
  if (previousToken === -1 || lineText[previousToken] !== ",") {
    return null;
  }

  return {
    end: tokenIndex + 1,
    start: findJsonSegmentStart(lineText, previousToken),
  };
}

function getJsonAnnotationHighlightRange(lineText: string, pointer: number): TextHighlight | null {
  const annotationStart = findJsonAnnotationStart(lineText);
  if (annotationStart === -1 || annotationStart > pointer + 2) {
    return null;
  }

  const segmentStart = findJsonSegmentStart(lineText, annotationStart);
  const segmentEnd = Math.min(lineText.length, annotationStart + 96);
  return normalizeHighlight({
    end: segmentEnd,
    start: segmentStart,
  }, lineText.length);
}

function findJsonSegmentStart(lineText: string, index: number) {
  for (let cursor = Math.max(0, index - 1); cursor >= 0; cursor -= 1) {
    const character = lineText[cursor];
    if (character === "," || character === "{" || character === "[") {
      return cursor + 1 + countLeadingWhitespace(lineText.slice(cursor + 1, index));
    }
  }

  const firstContent = lineText.search(/\S/);
  return firstContent === -1 ? 0 : firstContent;
}

function countLeadingWhitespace(value: string) {
  const match = value.match(/^\s*/);
  return match?.[0].length ?? 0;
}

function findJsonAnnotationStart(lineText: string) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < lineText.length; index += 1) {
    const character = lineText[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (jsonAnnotationTokens.some((token) => lineText.startsWith(token, index))) {
      return index;
    }
  }

  return -1;
}

function getMissingSeparatorHighlightRange(value: string, pointer?: number): TextHighlight | null {
  const tokens = tokenizeJsonLoose(value);
  const candidates: TextHighlight[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    const previous = tokens[index - 1];
    const afterNext = tokens[index + 2];
    const afterValue = tokens[index + 3];

    if (
      current.type === "string" &&
      isJsonObjectKeyContext(tokens, index, previous) &&
      next.value !== ":"
    ) {
      const end = next.value === "," && afterNext?.value === ":"
        ? (afterValue && isJsonValueStartToken(afterValue) ? afterValue.end : afterNext.end)
        : next.end;
      candidates.push({
        end,
        start: current.start,
      });
      continue;
    }

    if (isJsonValueEndToken(current) && isJsonValueStartToken(next)) {
      candidates.push({
        end: next.end,
        start: current.start,
      });
      continue;
    }

    if (current.value === ":" && (next.value === "," || next.value === "}" || next.value === "]")) {
      candidates.push({
        end: next.end,
        start: current.start,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  if (pointer === undefined) {
    return candidates[0];
  }

  return candidates
    .sort((left, right) => {
      const distance = getRangeDistance(left, pointer) - getRangeDistance(right, pointer);
      return distance === 0 ? (left.end - left.start) - (right.end - right.start) : distance;
    })[0];
}

function tokenizeJsonLoose(value: string) {
  const tokens: JsonLooseToken[] = [];
  for (let index = 0; index < value.length;) {
    const character = value[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "\"") {
      const start = index;
      index += 1;
      let escaped = false;
      while (index < value.length) {
        const current = value[index];
        index += 1;
        if (escaped) {
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === "\"") {
          break;
        }
      }
      tokens.push({ end: index, start, type: "string", value: value.slice(start, index) });
      continue;
    }

    if ("{}[]:,".includes(character)) {
      tokens.push({ end: index + 1, start: index, type: "punct", value: character });
      index += 1;
      continue;
    }

    const literal = ["true", "false", "null"].find((candidate) => value.startsWith(candidate, index));
    if (literal) {
      tokens.push({ end: index + literal.length, start: index, type: "literal", value: literal });
      index += literal.length;
      continue;
    }

    if (character === "-" || /\d/.test(character)) {
      const start = index;
      index += 1;
      while (index < value.length && /[0-9eE+.-]/.test(value[index])) {
        index += 1;
      }
      tokens.push({ end: index, start, type: "number", value: value.slice(start, index) });
      continue;
    }

    index += 1;
  }

  return tokens;
}

function isJsonObjectKeyContext(tokens: JsonLooseToken[], index: number, token: JsonLooseToken | undefined) {
  if (token !== undefined && token.value !== "{" && token.value !== ",") {
    return false;
  }
  return getJsonContainerAtToken(tokens, index) === "object";
}

function getJsonContainerAtToken(tokens: JsonLooseToken[], endIndex: number) {
  const stack: Array<"array" | "object"> = [];
  for (let index = 0; index < endIndex; index += 1) {
    const value = tokens[index].value;
    if (value === "{") {
      stack.push("object");
    } else if (value === "[") {
      stack.push("array");
    } else if (value === "}" || value === "]") {
      stack.pop();
    }
  }
  return stack.at(-1) ?? null;
}

function isJsonValueStartToken(token: JsonLooseToken) {
  return token.type === "literal" || token.type === "number" || token.type === "string" || token.value === "{" || token.value === "[";
}

function isJsonValueEndToken(token: JsonLooseToken) {
  return token.type === "literal" || token.type === "number" || token.type === "string" || token.value === "}" || token.value === "]";
}

function getRangeDistance(range: TextHighlight, pointer: number) {
  if (pointer < range.start) {
    return range.start - pointer;
  }
  if (pointer > range.end) {
    return pointer - range.end;
  }
  return 0;
}

function collectJsonRangeCandidates(windowText: string, pattern: RegExp, offset: number, candidates: TextHighlight[]) {
  for (const match of windowText.matchAll(pattern)) {
    if (match.index === undefined || !match[0]) {
      continue;
    }
    candidates.push({
      end: offset + match.index + match[0].length,
      start: offset + match.index,
    });
  }
}

function fallbackJsonHighlightRange(lineText: string, pointer: number) {
  let start = Math.max(0, pointer - 24);
  for (let index = pointer; index >= 0; index -= 1) {
    if (lineText[index] === "," || lineText[index] === "{" || lineText[index] === "[") {
      start = Math.min(lineText.length, index + 1);
      break;
    }
  }

  let end = Math.min(lineText.length, Math.max(pointer + 1, start + 1));
  while (end < lineText.length && !/\s/.test(lineText[end]) && lineText[end] !== ",") {
    end += 1;
  }
  return { end: Math.min(lineText.length, end), start };
}

function normalizeHighlight(highlight: TextHighlight, valueLength: number) {
  const start = clampNumber(highlight.start, 0, valueLength);
  const end = clampNumber(highlight.end, start, valueLength);
  return end > start ? { end, start } : null;
}

function lineColumnToIndex(value: string, line: number, column: number) {
  let currentLine = 1;
  let lineStart = 0;
  for (let index = 0; index < value.length && currentLine < line; index += 1) {
    if (value[index] === "\n") {
      currentLine += 1;
      lineStart = index + 1;
    }
  }

  let lineEnd = value.indexOf("\n", lineStart);
  if (lineEnd === -1) {
    lineEnd = value.length;
  }
  if (lineEnd > lineStart && value[lineEnd - 1] === "\r") {
    lineEnd -= 1;
  }
  return clampNumber(lineStart + Math.max(0, column - 1), lineStart, lineEnd);
}

function getLineBounds(value: string, index: number) {
  const safeIndex = clampNumber(index, 0, value.length);
  const start = value.lastIndexOf("\n", Math.max(0, safeIndex - 1)) + 1;
  let end = value.indexOf("\n", safeIndex);
  if (end === -1) {
    end = value.length;
  }
  if (end > start && value[end - 1] === "\r") {
    end -= 1;
  }
  return { end, start };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function extractErrorContext(message: string, locale: Locale) {
  const context = message.match(/(?:附近：|Near:\s*)(.+)$/i)?.[1]?.trim();
  if (!context) {
    return "";
  }
  return locale === "en" ? context.replace(/^`空行`$/, "empty line") : context;
}

function formatToolError(error: unknown, fallback: string, locale: Locale) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (locale === "en") {
    return message || fallback;
  }
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
    return "不支持的颜色格式。可输入 #2f8f6b、rgb(47,143,107) 或 hsl(157,50%,37%)。";
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

function enhanceJsonError(message: string, input: string, locale: Locale) {
  const location = findJsonErrorLocation(message, input);
  const invalidPunctuationHint = location
    ? describeInvalidJsonPunctuation(input[lineColumnToIndex(input, location.line, location.column)], locale)
    : "";
  const displayMessage = invalidPunctuationHint
    ? (locale === "en" ? `${message} ${invalidPunctuationHint}` : `JSON 格式无效：${invalidPunctuationHint}`)
    : (locale === "en" ? message : `JSON 格式无效：${translateJsonErrorReason(message)}`);
  if (!location) {
    return displayMessage;
  }

  const context = getJsonErrorContext(input, location.line, location.column);
  const locationText = locale === "en" ? `(line ${location.line}, column ${location.column})` : `（第 ${location.line} 行，第 ${location.column} 列）`;
  if (!context) {
    return `${displayMessage}${locationText}`;
  }

  return locale === "en"
    ? `${displayMessage} ${locationText}. Near: ${context}`
    : `${displayMessage}${locationText}。附近：${context}`;
}

function translateJsonErrorReason(message: string) {
  if (/Unexpected end of JSON input/i.test(message)) {
    return "内容还没结束，可能缺少右花括号 `}`、右方括号 `]` 或字符串结尾引号。";
  }
  if (/Expected property name or ['"]?}['"]?/i.test(message) || /expected property name/i.test(message)) {
    return "对象属性名必须使用双引号，或这里应该是右花括号 `}`。";
  }
  if (/double-quoted property name/i.test(message)) {
    return "对象属性名必须使用双引号。";
  }
  if (/Expected ['"]?:['"]? after property name/i.test(message) || /expected ':'/i.test(message)) {
    return "属性名后缺少冒号 `:`。";
  }
  if (/Expected ['"]?,['"]? or ['"]?}['"]? after property value/i.test(message)) {
    return "属性值后缺少逗号 `,` 或右花括号 `}`。";
  }
  if (/Expected ['"]?,['"]? or ['"]?\]['"]? after array element/i.test(message)) {
    return "数组元素后缺少逗号 `,` 或右方括号 `]`。";
  }
  if (/unterminated string/i.test(message)) {
    return "字符串没有闭合，请检查缺失的双引号。";
  }
  if (/bad control character|control character/i.test(message)) {
    return "字符串中包含未转义的换行或控制字符。";
  }
  if (/bad escaped character|invalid escape/i.test(message)) {
    return "字符串里的转义写法无效。";
  }
  if (/no number after minus sign/i.test(message)) {
    return "负号后面缺少数字。";
  }
  if (/unexpected non-whitespace character/i.test(message)) {
    return "一个完整 JSON 值后面还有多余内容。";
  }
  if (/Unexpected number/i.test(message)) {
    return "这里出现了意外的数字，可能缺少逗号或冒号。";
  }
  if (/Unexpected string/i.test(message)) {
    return "这里出现了意外的字符串，可能缺少逗号或冒号。";
  }

  const unexpectedToken = message.match(/Unexpected token\s+['"]?([^'",\s]+)['"]?/i);
  if (unexpectedToken) {
    return `这里出现了意外的字符 \`${unexpectedToken[1]}\`。`;
  }

  if (/not valid JSON|JSON/i.test(message)) {
    return "这里不符合 JSON 语法。";
  }

  return "这里不符合 JSON 语法。";
}

function findJsonErrorLocation(message: string, input: string) {
  const zhLineColumnMatch = message.match(/第\s*(\d+)\s*行，第\s*(\d+)\s*列/);
  if (zhLineColumnMatch) {
    const line = Number(zhLineColumnMatch[1]);
    const column = Number(zhLineColumnMatch[2]);
    if (Number.isFinite(line) && Number.isFinite(column)) {
      return { column, line };
    }
  }

  const lineColumnMatch = message.match(/(?:line|at line)\s+(\d+)[^\d]+(?:column|col)\s+(\d+)/i) ?? message.match(/(\d+):(\d+)/);
  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1]);
    const column = Number(lineColumnMatch[2]);
    if (Number.isFinite(line) && Number.isFinite(column)) {
      return { column, line };
    }
  }

  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch) {
    const diagnosticIndex = findJsonDiagnosticIndex(input);
    return diagnosticIndex === -1 ? null : positionToLineColumn(input, diagnosticIndex);
  }

  const position = Number(positionMatch[1]);
  return Number.isFinite(position) ? positionToLineColumn(input, position) : null;
}

function findJsonDiagnosticIndex(value: string) {
  const simpleDiagnosticIndex = findJsonSimpleDiagnosticIndex(value);
  const structuralHighlight = getMissingSeparatorHighlightRange(value);
  if (simpleDiagnosticIndex === -1) {
    return structuralHighlight?.start ?? -1;
  }
  if (!structuralHighlight) {
    return simpleDiagnosticIndex;
  }
  return Math.min(simpleDiagnosticIndex, structuralHighlight.start);
}

function findJsonSimpleDiagnosticIndex(value: string) {
  const invalidPunctuationIndex = findInvalidJsonPunctuationIndex(value);
  if (invalidPunctuationIndex !== -1) {
    return invalidPunctuationIndex;
  }

  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (jsonAnnotationTokens.some((token) => value.startsWith(token, index))) {
      return index;
    }

    if (character === "{" || character === "[") {
      stack.push(character);
      continue;
    }

    if (character === "}" || character === "]") {
      const expectedOpen = character === "}" ? "{" : "[";
      if (stack.at(-1) !== expectedOpen) {
        return index;
      }
      stack.pop();
      continue;
    }

    if (character === ",") {
      const next = findNextNonWhitespaceIndex(value, index + 1);
      if (next !== -1 && (value[next] === "," || value[next] === "}" || value[next] === "]")) {
        return index;
      }
    }
  }

  return -1;
}

function findNextNonWhitespaceIndex(value: string, start: number) {
  for (let index = start; index < value.length; index += 1) {
    if (!/\s/.test(value[index])) {
      return index;
    }
  }
  return -1;
}

function findPreviousNonWhitespaceIndex(value: string, before: number) {
  for (let index = before - 1; index >= 0; index -= 1) {
    if (!/\s/.test(value[index])) {
      return index;
    }
  }
  return -1;
}

function getJsonErrorContext(input: string, line: number, column: number) {
  const lineText = input.replace(/\r\n/g, "\n").split("\n")[line - 1];
  if (lineText === undefined) {
    return "";
  }

  const pointerIndex = Math.max(0, column - 1);
  const start = Math.max(0, pointerIndex - 36);
  const end = Math.min(lineText.length, pointerIndex + 36);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < lineText.length ? "..." : "";
  const snippet = `${prefix}${lineText.slice(start, end)}${suffix}`.trim();
  return snippet ? `\`${snippet}\`` : "空行";
}

function positionToLineColumn(value: string, position: number) {
  const before = value.slice(0, Math.max(0, position));
  const lines = before.split(/\r?\n/);
  return {
    column: (lines.at(-1)?.length ?? 0) + 1,
    line: lines.length,
  };
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
  return tab === "image" || tab === "wechatQr" || tab === "linkQr";
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

  throw new Error("Unsupported color. Try #2f8f6b, rgb(47,143,107), or hsl(157,50%,37%).");
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

function formatColorReport(color: { b: number; g: number; r: number }, locale: Locale) {
  const formats = getColorFormats(color);
  return [
    locale === "en" ? "[Color]" : "[颜色]",
    `HEX: ${formats.hex}`,
    `RGB: ${formats.rgb}`,
    `HSL: ${formats.hsl}`,
    "",
    `${locale === "en" ? "CSS variables" : "CSS 变量"}:`,
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

function formatDateReport(date: Date, displayMode: TimeDisplayMode, locale: Locale) {
  const milliseconds = date.getTime();
  if (Number.isNaN(milliseconds)) {
    throw new Error("Invalid date.");
  }

  const displayLabel = displayMode === "utc" ? "UTC" : locale === "en" ? "Local" : "Local";
  const displayValue = displayMode === "utc" ? date.toUTCString() : date.toLocaleString();
  return [`ISO: ${date.toISOString()}`, `${displayLabel}: ${displayValue}`, `Unix seconds: ${Math.floor(milliseconds / 1000)}`, `Unix milliseconds: ${milliseconds}`].join("\n");
}
