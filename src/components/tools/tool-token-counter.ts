// LLM Token 计数器的纯逻辑：模型注册表、文本统计、估算。
// 注意：精确分词依赖 gpt-tokenizer，只在组件层 import（避免在纯模块跨 import 第三方破坏
// `node --experimental-strip-types` 的 test:tools 解析）。本模块只放可在 node 直接跑的纯函数。

export type TokenEncoding = "o200k_base" | "cl100k_base" | "o200k_harmony";

export type TokenModel = {
  /** 下拉选项值 */
  id: string;
  /** 显示名 */
  label: string;
  /** exact：走 gpt-tokenizer 精确分词；estimate：字符启发式估算 */
  kind: "exact" | "estimate";
  /** exact 时对应的 BPE 编码 */
  encoding?: TokenEncoding;
  /** estimate 时每 token 约多少字符 */
  charsPerToken?: number;
  /** 估算/精度备注 */
  note?: string;
};

// 精确：OpenAI 系列走对应 BPE 编码；估算：非 OpenAI 本地拿不到精确分词，用字符启发式，仅供参考。
export const tokenModels: readonly TokenModel[] = [
  { id: "o200k", label: "GPT-4o / 4.1 / 5 / o 系列", kind: "exact", encoding: "o200k_base" },
  { id: "cl100k", label: "GPT-4 / GPT-3.5", kind: "exact", encoding: "cl100k_base" },
  { id: "harmony", label: "GPT-OSS（Harmony）", kind: "exact", encoding: "o200k_harmony" },
  { id: "claude", label: "Claude（Opus / Sonnet / Haiku）", kind: "estimate", charsPerToken: 3.5, note: "估算值；Claude 本地无精确分词，新版分词器同文本可能 1.0–1.35×，以官方为准。" },
  { id: "gemini", label: "Gemini", kind: "estimate", charsPerToken: 4, note: "估算值，以官方为准。" },
  { id: "llama", label: "Llama 3", kind: "estimate", charsPerToken: 3.6, note: "估算值，以官方为准。" },
] as const;

export function getTokenModel(id: string): TokenModel {
  return tokenModels.find((model) => model.id === id) ?? tokenModels[0];
}

export type TokenTextStats = {
  /** Unicode 码点数（emoji 计 1） */
  characters: number;
  /** 去除空白后的码点数 */
  charactersNoSpaces: number;
  /** 字/词数：中日韩按字、拉丁按词 */
  words: number;
  /** 行数 */
  lines: number;
};

// 拉丁字母/数字的词；带内部连字符与撇号（don't、state-of-the-art）算一个词。
const latinWordPattern = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;
// 中日韩表意/假名按「字」计入字数。
const cjkCharPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const whitespacePattern = /\s/u;

export function computeTokenTextStats(text: string): TokenTextStats {
  const codePoints = Array.from(text);
  const characters = codePoints.length;
  const charactersNoSpaces = codePoints.reduce((total, ch) => (whitespacePattern.test(ch) ? total : total + 1), 0);
  const latinWords = text.match(latinWordPattern)?.length ?? 0;
  const cjkChars = text.match(cjkCharPattern)?.length ?? 0;
  const words = latinWords + cjkChars;
  const lines = text === "" ? 0 : text.split(/\r\n|\r|\n/).length;
  return { characters, charactersNoSpaces, words, lines };
}

// 估算 token 数：字符数 / 每 token 字符数；空串为 0，非空至少 1，四舍五入。
export function estimateTokenCount(text: string, charsPerToken: number): number {
  const characters = Array.from(text).length;
  if (characters === 0) {
    return 0;
  }
  return Math.max(1, Math.round(characters / charsPerToken));
}
