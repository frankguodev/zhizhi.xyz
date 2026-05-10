import type { CsvDelimiter, CsvOutputMode, HashAlgorithm, HashOutputFormat, StructuredFormat, TimeDisplayMode, TimestampUnit, ToolGroup, ToolTab, UuidFormat } from "./tool-types";
import {
  isCsvDelimiter,
  isCsvOutputMode,
  isHashAlgorithm,
  isHashOutputFormat,
  isJsonSpaces,
  isStructuredFormat,
  isTimeDisplayMode,
  isTimestampUnit,
  isToolGroup,
  isToolTab,
  isUuidFormat,
} from "./tool-types";

const preferenceStorageKey = "zhizhi.tools.preferences";

export type ToolPreferences = {
  activeGroup: ToolGroup;
  activeTab: ToolTab;
  csvDelimiter: CsvDelimiter;
  csvEmptyAsNull: boolean;
  csvInferTypes: boolean;
  csvOutputMode: CsvOutputMode;
  hashAlgorithm: HashAlgorithm;
  hashOutputFormat: HashOutputFormat;
  jsonSpaces: string;
  markdownAutoPreview: boolean;
  structuredFormat: StructuredFormat;
  timeDisplayMode: TimeDisplayMode;
  timestampUnit: TimestampUnit;
  uuidFormat: UuidFormat;
};

const defaultToolPreferences: ToolPreferences = {
  activeGroup: "all",
  activeTab: "json",
  csvDelimiter: "auto",
  csvEmptyAsNull: false,
  csvInferTypes: true,
  csvOutputMode: "objects",
  hashAlgorithm: "SHA-256",
  hashOutputFormat: "hex",
  jsonSpaces: "2",
  markdownAutoPreview: true,
  structuredFormat: "yaml",
  timeDisplayMode: "local",
  timestampUnit: "auto",
  uuidFormat: "standard",
};

export function readToolPreferences() {
  if (typeof window === "undefined") {
    return defaultToolPreferences;
  }

  try {
    const stored = window.localStorage.getItem(preferenceStorageKey);
    if (!stored) {
      return defaultToolPreferences;
    }

    const parsed = JSON.parse(stored) as Partial<Record<keyof ToolPreferences, unknown>>;
    return {
      activeGroup: isToolGroup(parsed.activeGroup) ? parsed.activeGroup : defaultToolPreferences.activeGroup,
      activeTab: isToolTab(parsed.activeTab) ? parsed.activeTab : defaultToolPreferences.activeTab,
      csvDelimiter: isCsvDelimiter(parsed.csvDelimiter) ? parsed.csvDelimiter : defaultToolPreferences.csvDelimiter,
      csvEmptyAsNull: typeof parsed.csvEmptyAsNull === "boolean" ? parsed.csvEmptyAsNull : defaultToolPreferences.csvEmptyAsNull,
      csvInferTypes: typeof parsed.csvInferTypes === "boolean" ? parsed.csvInferTypes : defaultToolPreferences.csvInferTypes,
      csvOutputMode: isCsvOutputMode(parsed.csvOutputMode) ? parsed.csvOutputMode : defaultToolPreferences.csvOutputMode,
      hashAlgorithm: isHashAlgorithm(parsed.hashAlgorithm) ? parsed.hashAlgorithm : defaultToolPreferences.hashAlgorithm,
      hashOutputFormat: isHashOutputFormat(parsed.hashOutputFormat) ? parsed.hashOutputFormat : defaultToolPreferences.hashOutputFormat,
      jsonSpaces: isJsonSpaces(parsed.jsonSpaces) ? parsed.jsonSpaces : defaultToolPreferences.jsonSpaces,
      markdownAutoPreview: typeof parsed.markdownAutoPreview === "boolean" ? parsed.markdownAutoPreview : defaultToolPreferences.markdownAutoPreview,
      structuredFormat: isStructuredFormat(parsed.structuredFormat) ? parsed.structuredFormat : defaultToolPreferences.structuredFormat,
      timeDisplayMode: isTimeDisplayMode(parsed.timeDisplayMode) ? parsed.timeDisplayMode : defaultToolPreferences.timeDisplayMode,
      timestampUnit: isTimestampUnit(parsed.timestampUnit) ? parsed.timestampUnit : defaultToolPreferences.timestampUnit,
      uuidFormat: isUuidFormat(parsed.uuidFormat) ? parsed.uuidFormat : defaultToolPreferences.uuidFormat,
    };
  } catch {
    return defaultToolPreferences;
  }
}

export function writeToolPreferences(preferences: ToolPreferences) {
  try {
    window.localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
  } catch {
    // Preferences are nonessential; ignore storage failures.
  }
}
