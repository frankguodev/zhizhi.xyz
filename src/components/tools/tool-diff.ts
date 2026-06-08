import { createTwoFilesPatch, diffChars, diffLines, diffWords } from "diff";

// 文本/代码对比的纯计算逻辑：行级对齐（jsdiff diffLines）；对"删除块 + 新增块"
// 用基于字符 bigram 相似度的序列对齐（DP）配对——足够相似才配成"修改行"做词级高亮，
// 不相似的拆成独立删除/新增行，避免无关行被强行配对的噪声。UI 在 diff-tool.tsx 渲染。

export type DiffGranularity = "word" | "char";

export type DiffOptions = {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  // 改动行内高亮粒度：词级（默认）或字符级。
  granularity?: DiffGranularity;
};

export type DiffSegmentKind = "equal" | "added" | "removed";

export type DiffSegment = {
  value: string;
  kind: DiffSegmentKind;
};

export type DiffRowType = "equal" | "added" | "removed" | "modified";

export type DiffRow = {
  type: DiffRowType;
  leftLineNumber: number | null;
  rightLineNumber: number | null;
  // 左侧只含 equal/removed 片段；右侧只含 equal/added 片段。
  leftSegments: DiffSegment[];
  rightSegments: DiffSegment[];
};

export type DiffResult = {
  rows: DiffRow[];
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  identical: boolean;
  error: string | null;
};

// A3：单侧输入上限，避免超大文本在主线程卡顿。
const maxInputLength = 200_000;
// 视为"同一行被修改"的相似度阈值（字符 bigram Dice，0~1）。
const similarityThreshold = 0.4;
// 块内对齐 DP 的规模上限；超过则退化为低成本的位置配对，避免 O(n*m) 爆炸。
const maxAlignCells = 120_000;

type BlockOp =
  | { kind: "modified"; left: string; right: string }
  | { kind: "removed"; left: string }
  | { kind: "added"; right: string };

const lineDiffOptions = (options: DiffOptions) => ({
  ignoreWhitespace: options.ignoreWhitespace,
  ignoreCase: options.ignoreCase,
});

function splitLines(value: string): string[] {
  const lines = value.split("\n");
  // jsdiff 的 part.value 通常以换行结尾，split 后末尾会多一个空串，去掉。
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function normalizeForSimilarity(line: string, options: DiffOptions): string {
  let value = line;
  if (options.ignoreWhitespace) {
    value = value.replace(/\s+/g, " ").trim();
  }
  if (options.ignoreCase) {
    value = value.toLowerCase();
  }
  return value;
}

function bigramCounts(value: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < value.length - 1; i += 1) {
    const gram = value.slice(i, i + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

// 字符 bigram Dice 系数：衡量两行是否为彼此的小幅改动。
function similarity(a: string, b: string, options: DiffOptions): number {
  const left = normalizeForSimilarity(a, options);
  const right = normalizeForSimilarity(b, options);
  if (left === right) {
    return 1;
  }
  if (left.length < 2 || right.length < 2) {
    return 0;
  }
  const leftGrams = bigramCounts(left);
  const rightGrams = bigramCounts(right);
  let intersection = 0;
  for (const [gram, count] of leftGrams) {
    const other = rightGrams.get(gram);
    if (other) {
      intersection += Math.min(count, other);
    }
  }
  return (2 * intersection) / (left.length - 1 + (right.length - 1));
}

function wordSegments(removedLine: string, addedLine: string, options: DiffOptions) {
  const parts =
    options.granularity === "char"
      ? diffChars(removedLine, addedLine, { ignoreCase: options.ignoreCase })
      : diffWords(removedLine, addedLine, { ignoreCase: options.ignoreCase });
  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];

  for (const part of parts) {
    if (part.added) {
      right.push({ value: part.value, kind: "added" });
    } else if (part.removed) {
      left.push({ value: part.value, kind: "removed" });
    } else {
      left.push({ value: part.value, kind: "equal" });
      right.push({ value: part.value, kind: "equal" });
    }
  }

  return { left, right };
}

// 大块退化路径：位置配对，仍按相似度决定配对还是拆开，保持 O(n+m)。
function positionalAlign(removed: string[], added: string[], options: DiffOptions): BlockOp[] {
  const ops: BlockOp[] = [];
  const paired = Math.min(removed.length, added.length);
  for (let i = 0; i < paired; i += 1) {
    if (similarity(removed[i], added[i], options) >= similarityThreshold) {
      ops.push({ kind: "modified", left: removed[i], right: added[i] });
    } else {
      ops.push({ kind: "removed", left: removed[i] });
      ops.push({ kind: "added", right: added[i] });
    }
  }
  for (let i = paired; i < removed.length; i += 1) {
    ops.push({ kind: "removed", left: removed[i] });
  }
  for (let j = paired; j < added.length; j += 1) {
    ops.push({ kind: "added", right: added[j] });
  }
  return ops;
}

// A1 + A2：用序列对齐 DP，在删除块与新增块之间找相似度最大的对应，
// 相似度达阈值才配成 modified，其余各自成行。
function alignBlocks(removed: string[], added: string[], options: DiffOptions): BlockOp[] {
  const n = removed.length;
  const m = added.length;
  if (n === 0) {
    return added.map((right) => ({ kind: "added", right }));
  }
  if (m === 0) {
    return removed.map((left) => ({ kind: "removed", left }));
  }
  if (n * m > maxAlignCells) {
    return positionalAlign(removed, added, options);
  }

  // dp[i][j] = 对齐 removed[0..i) 与 added[0..j) 的最大累计相似度；choice 记录回溯方向。
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  // 0 = 配对(modified)，1 = 删除(removed)，2 = 新增(added)。
  const choice: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(-1));

  for (let i = 1; i <= n; i += 1) {
    dp[i][0] = 0;
    choice[i][0] = 1;
  }
  for (let j = 1; j <= m; j += 1) {
    dp[0][j] = 0;
    choice[0][j] = 2;
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      let best = dp[i - 1][j];
      let ch = 1;
      if (dp[i][j - 1] > best) {
        best = dp[i][j - 1];
        ch = 2;
      }
      const sim = similarity(removed[i - 1], added[j - 1], options);
      if (sim >= similarityThreshold) {
        const matched = dp[i - 1][j - 1] + sim;
        if (matched > best) {
          best = matched;
          ch = 0;
        }
      }
      dp[i][j] = best;
      choice[i][j] = ch;
    }
  }

  const ops: BlockOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const ch = choice[i][j];
    if (i > 0 && j > 0 && ch === 0) {
      ops.push({ kind: "modified", left: removed[i - 1], right: added[j - 1] });
      i -= 1;
      j -= 1;
    } else if (i > 0 && (j === 0 || ch === 1)) {
      ops.push({ kind: "removed", left: removed[i - 1] });
      i -= 1;
    } else {
      ops.push({ kind: "added", right: added[j - 1] });
      j -= 1;
    }
  }
  ops.reverse();
  return ops;
}

export function computeDiff(leftText: string, rightText: string, options: DiffOptions): DiffResult {
  if (leftText.length > maxInputLength || rightText.length > maxInputLength) {
    return {
      rows: [],
      addedLines: 0,
      removedLines: 0,
      modifiedLines: 0,
      identical: false,
      error: `文本过大（单侧超过 ${maxInputLength.toLocaleString("en-US")} 字符），请缩减后再对比。`,
    };
  }

  const parts = diffLines(leftText, rightText, lineDiffOptions(options));

  const rows: DiffRow[] = [];
  let leftNo = 0;
  let rightNo = 0;
  let addedLines = 0;
  let removedLines = 0;
  let modifiedLines = 0;
  let pendingRemoved: string[] = [];

  function pushRemoved(line: string) {
    leftNo += 1;
    removedLines += 1;
    rows.push({
      type: "removed",
      leftLineNumber: leftNo,
      rightLineNumber: null,
      leftSegments: [{ value: line, kind: "removed" }],
      rightSegments: [],
    });
  }

  function pushAdded(line: string) {
    rightNo += 1;
    addedLines += 1;
    rows.push({
      type: "added",
      leftLineNumber: null,
      rightLineNumber: rightNo,
      leftSegments: [],
      rightSegments: [{ value: line, kind: "added" }],
    });
  }

  function flushPendingRemoved() {
    for (const line of pendingRemoved) {
      pushRemoved(line);
    }
    pendingRemoved = [];
  }

  function flushChangeBlock(addedLinesBlock: string[]) {
    const ops = alignBlocks(pendingRemoved, addedLinesBlock, options);
    pendingRemoved = [];
    for (const op of ops) {
      if (op.kind === "modified") {
        leftNo += 1;
        rightNo += 1;
        modifiedLines += 1;
        const { left, right } = wordSegments(op.left, op.right, options);
        rows.push({ type: "modified", leftLineNumber: leftNo, rightLineNumber: rightNo, leftSegments: left, rightSegments: right });
      } else if (op.kind === "removed") {
        pushRemoved(op.left);
      } else {
        pushAdded(op.right);
      }
    }
  }

  for (const part of parts) {
    const lines = splitLines(part.value);

    if (part.removed) {
      pendingRemoved.push(...lines);
      continue;
    }

    if (part.added) {
      if (pendingRemoved.length > 0) {
        flushChangeBlock(lines);
      } else {
        for (const line of lines) {
          pushAdded(line);
        }
      }
      continue;
    }

    // 未变化的块：先把仍挂起的删除行作为纯删除输出，再输出相等行。
    flushPendingRemoved();
    for (const line of lines) {
      leftNo += 1;
      rightNo += 1;
      rows.push({
        type: "equal",
        leftLineNumber: leftNo,
        rightLineNumber: rightNo,
        leftSegments: [{ value: line, kind: "equal" }],
        rightSegments: [{ value: line, kind: "equal" }],
      });
    }
  }

  flushPendingRemoved();

  return {
    rows,
    addedLines,
    removedLines,
    modifiedLines,
    identical: addedLines === 0 && removedLines === 0 && modifiedLines === 0,
    error: null,
  };
}

// C3：生成标准 unified diff 补丁（@@ hunks），便于贴进 PR / 应用 patch。
export function createUnifiedPatch(leftText: string, rightText: string): string {
  return createTwoFilesPatch("original", "modified", leftText, rightText, "", "", { context: 3 });
}
