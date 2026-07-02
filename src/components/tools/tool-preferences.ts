import type { CsvDelimiter, CsvOutputMode, HashAlgorithm, HashOutputFormat, StructuredFormat, TimeDisplayMode, TimestampUnit, ToolGroup, ToolTab, UuidFormat, XmlJsonFormat } from "./tool-types";
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
  isXmlJsonFormat,
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
  jsonAutoFormat: boolean;
  jsonSpaces: string;
  markdownAutoPreview: boolean;
  structuredFormat: StructuredFormat;
  timeDisplayMode: TimeDisplayMode;
  timestampUnit: TimestampUnit;
  uuidFormat: UuidFormat;
  xmlForceArrays: boolean;
  xmlIncludeAttributes: boolean;
  xmlJsonFormat: XmlJsonFormat;
  xmlStripNamespaces: boolean;
  xmlTrimText: boolean;
};

const defaultToolPreferences: ToolPreferences = {
  activeGroup: "writing",
  activeTab: "seoAudit",
  csvDelimiter: "auto",
  csvEmptyAsNull: false,
  csvInferTypes: true,
  csvOutputMode: "objects",
  hashAlgorithm: "SHA-256",
  hashOutputFormat: "hex",
  jsonAutoFormat: true,
  jsonSpaces: "2",
  markdownAutoPreview: true,
  structuredFormat: "yaml",
  timeDisplayMode: "local",
  timestampUnit: "auto",
  uuidFormat: "standard",
  xmlForceArrays: false,
  xmlIncludeAttributes: true,
  xmlJsonFormat: "2",
  xmlStripNamespaces: false,
  xmlTrimText: true,
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
      jsonAutoFormat: typeof parsed.jsonAutoFormat === "boolean" ? parsed.jsonAutoFormat : defaultToolPreferences.jsonAutoFormat,
      jsonSpaces: isJsonSpaces(parsed.jsonSpaces) ? parsed.jsonSpaces : defaultToolPreferences.jsonSpaces,
      markdownAutoPreview: typeof parsed.markdownAutoPreview === "boolean" ? parsed.markdownAutoPreview : defaultToolPreferences.markdownAutoPreview,
      structuredFormat: isStructuredFormat(parsed.structuredFormat) ? parsed.structuredFormat : defaultToolPreferences.structuredFormat,
      timeDisplayMode: isTimeDisplayMode(parsed.timeDisplayMode) ? parsed.timeDisplayMode : defaultToolPreferences.timeDisplayMode,
      timestampUnit: isTimestampUnit(parsed.timestampUnit) ? parsed.timestampUnit : defaultToolPreferences.timestampUnit,
      uuidFormat: isUuidFormat(parsed.uuidFormat) ? parsed.uuidFormat : defaultToolPreferences.uuidFormat,
      xmlForceArrays: typeof parsed.xmlForceArrays === "boolean" ? parsed.xmlForceArrays : defaultToolPreferences.xmlForceArrays,
      xmlIncludeAttributes: typeof parsed.xmlIncludeAttributes === "boolean" ? parsed.xmlIncludeAttributes : defaultToolPreferences.xmlIncludeAttributes,
      xmlJsonFormat: isXmlJsonFormat(parsed.xmlJsonFormat) ? parsed.xmlJsonFormat : defaultToolPreferences.xmlJsonFormat,
      xmlStripNamespaces: typeof parsed.xmlStripNamespaces === "boolean" ? parsed.xmlStripNamespaces : defaultToolPreferences.xmlStripNamespaces,
      xmlTrimText: typeof parsed.xmlTrimText === "boolean" ? parsed.xmlTrimText : defaultToolPreferences.xmlTrimText,
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
