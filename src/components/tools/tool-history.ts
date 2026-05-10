import type { CsvDelimiter, CsvOutputMode, HashAlgorithm, HashOutputFormat, StructuredFormat, TimeDisplayMode, TimestampUnit, ToolTab, UuidFormat } from "./tool-types";
import { isCsvDelimiter, isCsvOutputMode, isHashAlgorithm, isHashOutputFormat, isJsonSpaces, isStructuredFormat, isTimeDisplayMode, isTimestampUnit, isToolTab, isUuidFormat } from "./tool-types";

const historyStorageKey = "zhizhi.tools.history";
const maxHistoryPerTool = 10;
const maxHistoryTotal = 100;

export type ToolHistoryItem = {
  createdAt: number;
  id: string;
  input: string;
  output: string;
  settings: ToolHistorySettings;
  tab: ToolTab;
  title: string;
  updatedAt: number;
};

export type ToolHistorySettings = {
  csvDelimiter?: CsvDelimiter;
  csvEmptyAsNull?: boolean;
  csvInferTypes?: boolean;
  csvOutputMode?: CsvOutputMode;
  hashAlgorithm?: HashAlgorithm;
  hashOutputFormat?: HashOutputFormat;
  jsonSpaces?: string;
  markdownAutoPreview?: boolean;
  regexFlags?: string;
  regexPattern?: string;
  regexReplacement?: string;
  structuredFormat?: StructuredFormat;
  timeDisplayMode?: TimeDisplayMode;
  timestampUnit?: TimestampUnit;
  uuidFormat?: UuidFormat;
};

type StoredToolHistoryItem = Partial<Record<keyof ToolHistoryItem, unknown>>;

export function readToolHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(historyStorageKey);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeToolHistory(parsed);
  } catch {
    return [];
  }
}

export function saveToolHistoryItem(items: ToolHistoryItem[], tab: ToolTab, input: string, output: string, settings: ToolHistorySettings = {}) {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return normalizeToolHistory(items);
  }

  const now = Date.now();
  const existing = items.find((item) => item.tab === tab && item.input === input);
  const nextItem: ToolHistoryItem = existing
    ? {
        ...existing,
        output,
        settings: normalizeToolHistorySettings(settings),
        title: getToolHistoryTitle(input, tab),
        updatedAt: now,
      }
    : {
        createdAt: now,
        id: createToolHistoryId(tab, now),
        input,
        output,
        settings: normalizeToolHistorySettings(settings),
        tab,
        title: getToolHistoryTitle(input, tab),
        updatedAt: now,
      };

  return persistToolHistory([nextItem, ...items.filter((item) => item.id !== nextItem.id)]);
}

export function deleteToolHistoryItem(items: ToolHistoryItem[], id: string) {
  return persistToolHistory(items.filter((item) => item.id !== id));
}

export function clearToolHistory(items: ToolHistoryItem[], tab?: ToolTab) {
  return persistToolHistory(tab ? items.filter((item) => item.tab !== tab) : []);
}

function persistToolHistory(items: ToolHistoryItem[]) {
  const normalized = normalizeToolHistory(items);
  if (typeof window === "undefined") {
    return normalized;
  }

  try {
    window.localStorage.setItem(historyStorageKey, JSON.stringify(normalized));
  } catch {
    // History is a convenience feature; keep the UI usable if storage is unavailable.
  }
  return normalized;
}

function normalizeToolHistory(items: unknown[]) {
  const validItems = items
    .map((item) => normalizeToolHistoryItem(item))
    .filter((item): item is ToolHistoryItem => Boolean(item))
    .sort((left, right) => right.updatedAt - left.updatedAt);

  const seen = new Set<string>();
  const perToolCount = new Map<ToolTab, number>();
  const capped: ToolHistoryItem[] = [];
  for (const item of validItems) {
    const signature = `${item.tab}\n${item.input}`;
    if (seen.has(signature)) {
      continue;
    }
    const currentCount = perToolCount.get(item.tab) ?? 0;
    if (currentCount >= maxHistoryPerTool || capped.length >= maxHistoryTotal) {
      continue;
    }
    seen.add(signature);
    perToolCount.set(item.tab, currentCount + 1);
    capped.push(item);
  }
  return capped;
}

function normalizeToolHistoryItem(item: unknown): ToolHistoryItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }
  const stored = item as StoredToolHistoryItem;
  if (!isToolTab(stored.tab) || typeof stored.input !== "string") {
    return null;
  }

  const now = Date.now();
  const createdAt = typeof stored.createdAt === "number" && Number.isFinite(stored.createdAt) ? stored.createdAt : now;
  const updatedAt = typeof stored.updatedAt === "number" && Number.isFinite(stored.updatedAt) ? stored.updatedAt : createdAt;
  return {
    createdAt,
    id: typeof stored.id === "string" && stored.id ? stored.id : createToolHistoryId(stored.tab, updatedAt),
    input: stored.input,
    output: typeof stored.output === "string" ? stored.output : "",
    settings: normalizeToolHistorySettings(stored.settings),
    tab: stored.tab,
    title: typeof stored.title === "string" && stored.title ? stored.title : getToolHistoryTitle(stored.input, stored.tab),
    updatedAt,
  };
}

function normalizeToolHistorySettings(value: unknown): ToolHistorySettings {
  if (!value || typeof value !== "object") {
    return {};
  }

  const stored = value as Partial<Record<keyof ToolHistorySettings, unknown>>;
  return {
    csvDelimiter: isCsvDelimiter(stored.csvDelimiter) ? stored.csvDelimiter : undefined,
    csvEmptyAsNull: typeof stored.csvEmptyAsNull === "boolean" ? stored.csvEmptyAsNull : undefined,
    csvInferTypes: typeof stored.csvInferTypes === "boolean" ? stored.csvInferTypes : undefined,
    csvOutputMode: isCsvOutputMode(stored.csvOutputMode) ? stored.csvOutputMode : undefined,
    hashAlgorithm: isHashAlgorithm(stored.hashAlgorithm) ? stored.hashAlgorithm : undefined,
    hashOutputFormat: isHashOutputFormat(stored.hashOutputFormat) ? stored.hashOutputFormat : undefined,
    jsonSpaces: isJsonSpaces(stored.jsonSpaces) ? stored.jsonSpaces : undefined,
    markdownAutoPreview: typeof stored.markdownAutoPreview === "boolean" ? stored.markdownAutoPreview : undefined,
    regexFlags: typeof stored.regexFlags === "string" ? stored.regexFlags : undefined,
    regexPattern: typeof stored.regexPattern === "string" ? stored.regexPattern : undefined,
    regexReplacement: typeof stored.regexReplacement === "string" ? stored.regexReplacement : undefined,
    structuredFormat: isStructuredFormat(stored.structuredFormat) ? stored.structuredFormat : undefined,
    timeDisplayMode: isTimeDisplayMode(stored.timeDisplayMode) ? stored.timeDisplayMode : undefined,
    timestampUnit: isTimestampUnit(stored.timestampUnit) ? stored.timestampUnit : undefined,
    uuidFormat: isUuidFormat(stored.uuidFormat) ? stored.uuidFormat : undefined,
  };
}

function getToolHistoryTitle(input: string, tab: ToolTab) {
  const firstLine = input.split(/\r?\n/).find((line) => line.trim());
  const title = firstLine?.trim().replace(/\s+/g, " ");
  return title ? truncateText(title, 80) : tab.toUpperCase();
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function createToolHistoryId(tab: ToolTab, timestamp: number) {
  return `${tab}-${timestamp.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
