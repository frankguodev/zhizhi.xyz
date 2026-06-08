// JSON → TypeScript 类型推断的纯逻辑（手写，零外部依赖）。
// 两段式：先把 JSON 推断成 TypeNode 并对数组内的对象样本做合并（差异字段标可选、
// null 与有值合成 T | null），再遍历命名渲染。UI 在 json-to-ts-tool.tsx 渲染。

// 输入与递归深度上限，避免超大或病态嵌套的 JSON 卡 UI / 递归爆栈。
const maxInputLength = 500_000;
const maxDepth = 200;

class JsonDepthError extends Error {}

export type JsonToTsDeclaration = "interface" | "type";
export type JsonToTsIndent = "2" | "4" | "tab";
// lone null 字段的渲染方式：保留 null / 视为 unknown / 视为 any。
export type JsonToTsNullType = "null" | "unknown" | "any";

export type JsonToTsOptions = {
  rootName: string;
  declaration: JsonToTsDeclaration;
  readonly?: boolean;
  indent?: JsonToTsIndent;
  nullType?: JsonToTsNullType;
  inferDates?: boolean;
  exportTypes?: boolean;
};

export type JsonToTsResult = {
  code: string;
  error: string | null;
  // 区分 JSON 语法错误（可交给 tool-json-diagnostics 增强展示）与大小/深度上限错误（直接展示）。
  parseError: boolean;
};

type ResolvedConfig = {
  readonly: boolean;
  indentUnit: string;
  nullType: JsonToTsNullType;
  exportPrefix: string;
};

type PrimitiveName = "string" | "number" | "boolean";

type TypeNode =
  | { kind: "primitive"; name: PrimitiveName }
  | { kind: "date" }
  | { kind: "null" }
  | { kind: "unknown" }
  | { kind: "object"; fields: Map<string, FieldNode> }
  | { kind: "array"; element: TypeNode }
  | { kind: "union"; options: TypeNode[] };

type FieldNode = { node: TypeNode; optional: boolean };

type RenderedField = { key: string; type: string; optional: boolean };

type RenderContext = {
  interfaces: Map<string, RenderedField[]>;
  signatures: Map<string, string>;
  usedNames: Set<string>;
  config: ResolvedConfig;
};

// 宽松的 ISO 8601 日期 / 日期时间识别（仅在 inferDates 开启时用）。
const isoDatePattern = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function pascalCase(input: string): string {
  const segments = input.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const pascal = segments.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join("");
  if (!pascal) {
    return "Item";
  }
  return /^[0-9]/.test(pascal) ? `Type${pascal}` : pascal;
}

// 复数 → 单数的尽力规则；对 status/address/analysis 等不该剥的情形做保护。
function singularize(name: string): string {
  if (name.length <= 2) {
    return name;
  }
  if (/(ss|us|is)$/i.test(name)) {
    return name;
  }
  if (/ies$/i.test(name)) {
    return name.replace(/ies$/i, "y");
  }
  if (/(s|x|z|ch|sh)es$/i.test(name)) {
    return name.replace(/es$/i, "");
  }
  if (/s$/i.test(name)) {
    return name.slice(0, -1);
  }
  return name;
}

// 数组元素的建议名：单数化；若与数组本身同名则加 Item 后缀，避免与根别名等冲突。
function elementSuggestedName(suggested: string): string {
  const singular = singularize(suggested);
  return singular === suggested ? `${suggested}Item` : singular;
}

function reserveName(name: string, ctx: RenderContext): string {
  ctx.usedNames.add(name);
  return name;
}

// 接口命名：优先用字段/元素本名；本名被占用时先尝试「父级名 + 本名」（如 Owner→RootOwner）
// 提升可读性，再退化到数字后缀。
function pickInterfaceName(suggested: string, parent: string, ctx: RenderContext): string {
  const base = pascalCase(suggested);
  if (!ctx.usedNames.has(base)) {
    return reserveName(base, ctx);
  }
  if (parent) {
    const qualified = pascalCase(`${parent} ${suggested}`);
    if (!ctx.usedNames.has(qualified)) {
      return reserveName(qualified, ctx);
    }
  }
  let index = 2;
  while (ctx.usedNames.has(`${base}${index}`)) {
    index += 1;
  }
  return reserveName(`${base}${index}`, ctx);
}

function inferNode(value: unknown, detectDates: boolean, depth = 0): TypeNode {
  if (depth > maxDepth) {
    throw new JsonDepthError();
  }

  if (value === null) {
    return { kind: "null" };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { kind: "array", element: { kind: "unknown" } };
    }
    const element = value.map((item) => inferNode(item, detectDates, depth + 1)).reduce(mergeNodes);
    return { kind: "array", element };
  }

  if (typeof value === "object") {
    const fields = new Map<string, FieldNode>();
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      fields.set(key, { node: inferNode(child, detectDates, depth + 1), optional: false });
    }
    return { kind: "object", fields };
  }

  const valueType = typeof value;
  if (valueType === "string") {
    return detectDates && isoDatePattern.test(value as string) ? { kind: "date" } : { kind: "primitive", name: "string" };
  }
  if (valueType === "number" || valueType === "boolean") {
    return { kind: "primitive", name: valueType };
  }

  return { kind: "unknown" };
}

function unionKey(node: TypeNode): string {
  switch (node.kind) {
    case "primitive":
      return `p:${node.name}`;
    case "date":
      return "date";
    case "null":
      return "null";
    case "unknown":
      return "unknown";
    case "array":
      return `a:${unionKey(node.element)}`;
    case "object":
      return `o:${[...node.fields.keys()].sort().join(",")}`;
    case "union":
      return `u:${node.options.map(unionKey).sort().join("|")}`;
  }
}

function unionOf(nodes: TypeNode[]): TypeNode {
  const flat: TypeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "union") {
      flat.push(...node.options);
    } else {
      flat.push(node);
    }
  }
  const seen = new Map<string, TypeNode>();
  for (const node of flat) {
    if (node.kind === "unknown") {
      continue;
    }
    const key = unionKey(node);
    if (!seen.has(key)) {
      seen.set(key, node);
    }
  }
  const options = [...seen.values()];
  if (options.length === 0) {
    return { kind: "unknown" };
  }
  if (options.length === 1) {
    return options[0];
  }
  return { kind: "union", options };
}

// 合并两个 TypeNode：对象按键并集（缺失键标可选），数组按元素合并，其余取联合。
function mergeNodes(a: TypeNode, b: TypeNode): TypeNode {
  if (a.kind === "unknown") return b;
  if (b.kind === "unknown") return a;

  if (a.kind === "object" && b.kind === "object") {
    const fields = new Map<string, FieldNode>();
    const keys = new Set<string>([...a.fields.keys(), ...b.fields.keys()]);
    for (const key of keys) {
      const fa = a.fields.get(key);
      const fb = b.fields.get(key);
      if (fa && fb) {
        fields.set(key, { node: mergeNodes(fa.node, fb.node), optional: fa.optional || fb.optional });
      } else {
        fields.set(key, { node: (fa ?? fb)!.node, optional: true });
      }
    }
    return { kind: "object", fields };
  }

  if (a.kind === "array" && b.kind === "array") {
    return { kind: "array", element: mergeNodes(a.element, b.element) };
  }

  if (a.kind === "primitive" && b.kind === "primitive" && a.name === b.name) {
    return a;
  }

  return unionOf([a, b]);
}

function formatFieldKey(key: string): string {
  return identifierPattern.test(key) ? key : JSON.stringify(key);
}

function typeToString(node: TypeNode, suggested: string, parent: string, ctx: RenderContext): string {
  switch (node.kind) {
    case "primitive":
      return node.name;
    case "date":
      return "Date";
    case "null":
      return "null";
    case "unknown":
      return "unknown";
    case "array": {
      const element = typeToString(node.element, elementSuggestedName(suggested), parent, ctx);
      return node.element.kind === "union" ? `(${element})[]` : `${element}[]`;
    }
    case "union": {
      const parts: string[] = [];
      for (const option of node.options) {
        const part = typeToString(option, suggested, parent, ctx);
        if (!parts.includes(part)) {
          parts.push(part);
        }
      }
      return parts.join(" | ");
    }
    case "object": {
      const fields: RenderedField[] = [...node.fields].map(([key, info]) => ({
        key,
        // lone null 字段按 nullType 配置渲染（null / unknown / any）；其余照常。
        type: info.node.kind === "null" ? ctx.config.nullType : typeToString(info.node, pascalCase(key), suggested, ctx),
        optional: info.optional,
      }));
      const signature = fields
        .map((field) => `${field.key}:${field.optional ? "?" : ""}:${field.type}`)
        .sort()
        .join(";");
      const existing = ctx.signatures.get(signature);
      if (existing) {
        return existing;
      }
      const name = pickInterfaceName(suggested, parent, ctx);
      ctx.interfaces.set(name, fields);
      ctx.signatures.set(signature, name);
      return name;
    }
  }
}

function renderDeclaration(name: string, fields: RenderedField[], declaration: JsonToTsDeclaration, config: ResolvedConfig): string {
  const readonlyPrefix = config.readonly ? "readonly " : "";
  const body = fields
    .map((field) => `${config.indentUnit}${readonlyPrefix}${formatFieldKey(field.key)}${field.optional ? "?" : ""}: ${field.type};`)
    .join("\n");
  if (declaration === "type") {
    return `${config.exportPrefix}type ${name} = {\n${body}\n};`;
  }
  return `${config.exportPrefix}interface ${name} {\n${body}\n}`;
}

export function jsonToTypeScript(jsonText: string, options: JsonToTsOptions): JsonToTsResult {
  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { code: "", error: null, parseError: false };
  }

  if (trimmed.length > maxInputLength) {
    return { code: "", error: `JSON 过大（超过 ${maxInputLength.toLocaleString("en-US")} 字符），请缩减后再转换。`, parseError: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return { code: "", error: error instanceof Error ? error.message : "JSON 格式无效。", parseError: true };
  }

  const config: ResolvedConfig = {
    readonly: options.readonly ?? false,
    indentUnit: options.indent === "4" ? "    " : options.indent === "tab" ? "\t" : "  ",
    nullType: options.nullType ?? "null",
    exportPrefix: (options.exportTypes ?? true) ? "export " : "",
  };

  const rootName = pascalCase(options.rootName || "Root");
  const ctx: RenderContext = {
    interfaces: new Map(),
    signatures: new Map(),
    usedNames: new Set(),
    config,
  };

  let rootNode: TypeNode;
  try {
    rootNode = inferNode(parsed, options.inferDates ?? false);
  } catch (error) {
    if (error instanceof JsonDepthError) {
      return { code: "", error: `JSON 嵌套层级过深（超过 ${maxDepth} 层），无法转换。`, parseError: false };
    }
    throw error;
  }

  // 根是对象：root interface 放最前，其余嵌套接口按出现顺序在后。
  if (rootNode.kind === "object") {
    const rootType = typeToString(rootNode, rootName, "", ctx);
    const ordered = [rootType, ...[...ctx.interfaces.keys()].filter((name) => name !== rootType)];
    const code = ordered.map((name) => renderDeclaration(name, ctx.interfaces.get(name) as RenderedField[], options.declaration, config)).join("\n\n");
    return { code, error: null, parseError: false };
  }

  // 根是数组或基本类型：用 type 别名表达，附带可能产生的嵌套接口。
  // 先占用根名，避免数组元素接口与根别名重名（如顶层对象数组的 Root 冲突）。
  ctx.usedNames.add(rootName);
  const rootType = typeToString(rootNode, rootName, "", ctx);
  const nested = [...ctx.interfaces.keys()].map((name) =>
    renderDeclaration(name, ctx.interfaces.get(name) as RenderedField[], options.declaration, config),
  );
  const alias = `${config.exportPrefix}type ${rootName} = ${rootType};`;
  const code = [alias, ...nested].join("\n\n");
  return { code, error: null, parseError: false };
}
