export type ToolLocale = "zh" | "en";

export type ToolTab = "json" | "encoding" | "time" | "text" | "jwt" | "hash" | "uuid" | "regex" | "markdown" | "data" | "csv" | "color" | "image" | "watermark" | "wechatQr" | "linkQr" | "crop" | "qrDecode" | "imageBase64";
export type CsvDelimiter = "auto" | "comma" | "tab";
export type CsvOutputMode = "objects" | "rows";
export type EncodingAction = "urlEncode" | "urlDecode" | "base64Encode" | "base64Decode" | "unicodeEscape" | "unicodeUnescape" | "htmlEscape" | "htmlUnescape";
export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export type HashOutputFormat = "hex" | "base64" | "base64url";
export type JsonAction = "format" | "minify" | "sort" | "escape" | "unescape" | "flatten" | "unflatten" | "validate";
export type StatusType = "idle" | "success" | "error";
export type StructuredFormat = "yaml" | "toml";
export type TextAction = "trimLines" | "removeEmpty" | "dedupe" | "sort" | "lower" | "upper";
export type TimeDisplayMode = "local" | "utc";
export type TimestampUnit = "auto" | "seconds" | "milliseconds";
export type UtilityAction = "base64Encode" | "base64Decode" | "textDedupe" | "textSort" | "regexReplace" | "regexTest";
export type UuidFormat = "standard" | "uppercase" | "compact" | "json";
export type ToolGroup = "data" | "encode" | "dev" | "writing" | "media";
export type EditorPanelSize = "compact" | "medium" | "large" | "expanded";

export type Status = {
  type: StatusType;
  message: string;
};

export type TextMetrics = {
  bytes: number;
  characters: number;
  displaySize: string;
  lines: number;
};

export type JsonWorkerResult = {
  output: string;
  message: string;
};

export type JsonWorkerPending = {
  id: number;
  input: string;
  reject: (error: Error) => void;
  resolve: (result: JsonWorkerResult) => void;
  timeout: number;
};

export type RegexMatchItem = {
  captures: string[];
  column: number;
  groups: Record<string, string> | null;
  index: number;
  line: number;
  match: string;
  ordinal: number;
};

export type RegexStructuredResultData = {
  matches: RegexMatchItem[];
  summary: { label: string; value: string }[];
};

export type HashStructuredResultData = {
  digest: string;
  fields: { label: string; value: string }[];
};

export type JwtStructuredResultData = {
  expirationBody: string;
  headerJson: string;
  payloadJson: string;
  signatureBody: string;
  timeClaimsBody: string;
};

export type StructuredToolResult =
  | { type: "hash"; data: HashStructuredResultData }
  | { type: "jwt"; data: JwtStructuredResultData }
  | { type: "regex"; data: RegexStructuredResultData };

export type UtilityWorkerResult = {
  output: string;
  structured?: RegexStructuredResultData;
};

export type UtilityWorkerPending = {
  id: number;
  reject: (error: Error) => void;
  resolve: (result: UtilityWorkerResult) => void;
  timeout: number;
};

export type YamlLine = {
  indent: number;
  lineNumber: number;
  text: string;
};

export function isToolTab(value: unknown): value is ToolTab {
  return (
    value === "json" ||
    value === "encoding" ||
    value === "time" ||
    value === "text" ||
    value === "jwt" ||
    value === "hash" ||
    value === "uuid" ||
    value === "regex" ||
    value === "markdown" ||
    value === "data" ||
    value === "csv" ||
    value === "color" ||
    value === "image" ||
    value === "watermark" ||
    value === "wechatQr" ||
    value === "linkQr" ||
    value === "crop" ||
    value === "qrDecode" ||
    value === "imageBase64"
  );
}

export function isToolGroup(value: unknown): value is ToolGroup {
  return value === "data" || value === "encode" || value === "dev" || value === "writing" || value === "media";
}

export function isCsvDelimiter(value: unknown): value is CsvDelimiter {
  return value === "auto" || value === "comma" || value === "tab";
}

export function isCsvOutputMode(value: unknown): value is CsvOutputMode {
  return value === "objects" || value === "rows";
}

export function isHashAlgorithm(value: unknown): value is HashAlgorithm {
  return value === "SHA-1" || value === "SHA-256" || value === "SHA-384" || value === "SHA-512";
}

export function isHashOutputFormat(value: unknown): value is HashOutputFormat {
  return value === "hex" || value === "base64" || value === "base64url";
}

export function isJsonSpaces(value: unknown): value is string {
  return value === "2" || value === "4" || value === "6";
}

export function isStructuredFormat(value: unknown): value is StructuredFormat {
  return value === "yaml" || value === "toml";
}

export function isTimeDisplayMode(value: unknown): value is TimeDisplayMode {
  return value === "local" || value === "utc";
}

export function isTimestampUnit(value: unknown): value is TimestampUnit {
  return value === "auto" || value === "seconds" || value === "milliseconds";
}

export function isUuidFormat(value: unknown): value is UuidFormat {
  return value === "standard" || value === "uppercase" || value === "compact" || value === "json";
}
