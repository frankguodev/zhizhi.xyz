import type { CsvDelimiter, CsvOutputMode } from "./tool-types";

export function convertDelimitedTextToJson(
  input: string,
  delimiterSetting: CsvDelimiter,
  options: { emptyAsNull: boolean; inferTypes: boolean; outputMode: CsvOutputMode },
) {
  const delimiter = delimiterSetting === "tab" ? "\t" : delimiterSetting === "comma" ? "," : detectDelimiter(input);
  const rows = parseDelimitedRows(input, delimiter);
  if (rows.length < 2) throw new Error("CSV/TSV needs a header row and at least one data row.");
  const headers = rows[0].map((header, index) => header.trim() || `field_${index + 1}`);
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (options.outputMode === "rows") {
    return JSON.stringify(
      {
        headers,
        rows: dataRows.map((row) => headers.map((_header, index) => parseDelimitedCell(row[index] ?? "", options))),
      },
      null,
      2,
    );
  }

  const records = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, parseDelimitedCell(row[index] ?? "", options)])));
  return JSON.stringify(records, null, 2);
}

export function splitDelimitedLine(line: string, delimiter: "," | "\t") {
  return parseDelimitedRows(line, delimiter)[0] ?? [];
}

function detectDelimiter(input: string) {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  return (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
}

function parseDelimitedRows(input: string, delimiter: "," | "\t") {
  const normalizedInput = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let quoted = false;

  for (let index = 0; index < normalizedInput.length; index += 1) {
    const character = normalizedInput[index];

    if (quoted) {
      if (character === "\"") {
        if (normalizedInput[index + 1] === "\"") {
          currentCell += "\"";
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        currentCell += character;
      }
      continue;
    }

    if (character === "\"") {
      if (currentCell.length === 0) {
        quoted = true;
      } else {
        currentCell += character;
      }
      continue;
    }

    if (character === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (quoted) {
    throw new Error("CSV/TSV has an unclosed quoted field.");
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

function parseDelimitedCell(value: string, options: { emptyAsNull: boolean; inferTypes: boolean }) {
  const trimmed = value.trim();
  if (!trimmed) {
    return options.emptyAsNull ? null : "";
  }
  if (!options.inferTypes) {
    return value;
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return value;
}
