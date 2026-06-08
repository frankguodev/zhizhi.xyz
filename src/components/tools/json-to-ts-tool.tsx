"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { enhanceJsonError } from "./tool-json-diagnostics";
import { ToolPanelButton, ToolPanelHeader, formatFieldMeta, toolFieldClass, toolPanelHeight } from "./tool-panel";
import { jsonToTypeScript, type JsonToTsDeclaration, type JsonToTsIndent, type JsonToTsNullType } from "./tool-json-to-ts";

const sampleJson = `{
  "id": 1024,
  "name": "知之",
  "active": true,
  "tags": ["ai", "tools"],
  "owner": {
    "email": "hello@zhizhi.xyz",
    "verified": false
  },
  "posts": [
    { "slug": "intro", "views": 12 }
  ]
}`;

const copy = {
  inputLabel: "JSON 输入",
  inputPlaceholder: "粘贴一段 JSON…",
  rootNameLabel: "根类型名",
  declarationLabel: "声明方式",
  interfaceOption: "interface",
  typeOption: "type",
  indentLabel: "缩进",
  nullLabel: "null 字段",
  readonlyLabel: "readonly",
  exportLabel: "export",
  inferDatesLabel: "ISO 日期→Date",
  sample: "示例",
  clear: "清空",
  outputLabel: "TypeScript 类型",
  copyResult: "复制类型",
  copied: "已复制",
  empty: "在左侧粘贴 JSON，右侧会推断出对应的 TypeScript 类型；嵌套对象会拆成独立接口。",
};

export function JsonToTsTool() {
  const [input, setInput] = useState("");
  const [rootName, setRootName] = useState("Root");
  const [declaration, setDeclaration] = useState<JsonToTsDeclaration>("interface");
  const [indent, setIndent] = useState<JsonToTsIndent>("2");
  const [nullType, setNullType] = useState<JsonToTsNullType>("null");
  const [readonly, setReadonly] = useState(false);
  const [exportTypes, setExportTypes] = useState(true);
  const [inferDates, setInferDates] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => jsonToTypeScript(input, { rootName, declaration, indent, nullType, readonly, exportTypes, inferDates }),
    [input, rootName, declaration, indent, nullType, readonly, exportTypes, inferDates],
  );

  // 语法错误交给 JSON 工具同款诊断增强（识别全角标点等）；大小/深度上限错误直接展示。
  const displayError = result.error ? (result.parseError ? enhanceJsonError(result.error, input) : result.error) : null;

  async function copyResult() {
    if (!result.code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted">{copy.rootNameLabel}</span>
          <input
            className="h-9 w-36 rounded-md border border-line bg-background px-2.5 text-sm text-foreground outline-none transition focus:border-accent"
            value={rootName}
            maxLength={48}
            onChange={(event) => setRootName(event.target.value)}
          />
        </label>
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted">{copy.declarationLabel}</span>
          <Select
            size="sm"
            className="w-28"
            ariaLabel={copy.declarationLabel}
            value={declaration}
            onChange={(value) => setDeclaration(value as JsonToTsDeclaration)}
            options={[
              { label: copy.interfaceOption, value: "interface" },
              { label: copy.typeOption, value: "type" },
            ]}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted">{copy.indentLabel}</span>
          <Select
            size="sm"
            className="w-24"
            ariaLabel={copy.indentLabel}
            value={indent}
            onChange={(value) => setIndent(value as JsonToTsIndent)}
            options={[
              { label: "2 空格", value: "2" },
              { label: "4 空格", value: "4" },
              { label: "Tab", value: "tab" },
            ]}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted">{copy.nullLabel}</span>
          <Select
            size="sm"
            className="w-28"
            ariaLabel={copy.nullLabel}
            value={nullType}
            onChange={(value) => setNullType(value as JsonToTsNullType)}
            options={[
              { label: "null", value: "null" },
              { label: "unknown", value: "unknown" },
              { label: "any", value: "any" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 self-end pb-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" className="accent-accent" checked={readonly} onChange={(event) => setReadonly(event.target.checked)} />
            {copy.readonlyLabel}
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" className="accent-accent" checked={exportTypes} onChange={(event) => setExportTypes(event.target.checked)} />
            {copy.exportLabel}
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" className="accent-accent" checked={inferDates} onChange={(event) => setInferDates(event.target.checked)} />
            {copy.inferDatesLabel}
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="block">
          <ToolPanelHeader
            label={copy.inputLabel}
            meta={formatFieldMeta(input)}
            actions={
              <>
                <ToolPanelButton onClick={() => setInput(sampleJson)}>{copy.sample}</ToolPanelButton>
                <ToolPanelButton icon={Trash2} onClick={() => setInput("")}>{copy.clear}</ToolPanelButton>
              </>
            }
          />
          <textarea
            className={`${toolPanelHeight("large")} resize-y ${toolFieldClass}`}
            value={input}
            placeholder={copy.inputPlaceholder}
            spellCheck={false}
            onChange={(event) => setInput(event.target.value)}
          />
          {displayError ? <p className="mt-1.5 text-sm font-semibold text-amber" role="alert">{displayError}</p> : null}
        </div>

        <div className="block">
          <ToolPanelHeader
            label={copy.outputLabel}
            actions={result.code ? <ToolPanelButton icon={copied ? Check : Copy} onClick={copyResult}>{copied ? copy.copied : copy.copyResult}</ToolPanelButton> : null}
          />
          {result.code ? (
            <pre className={`${toolPanelHeight("large")} overflow-auto ${toolFieldClass}`}>{result.code}</pre>
          ) : (
            <p className={`${toolPanelHeight("large")} flex items-center justify-center rounded-md border border-dashed border-line px-4 text-center text-sm text-muted`}>{copy.empty}</p>
          )}
        </div>
      </div>
    </div>
  );
}
