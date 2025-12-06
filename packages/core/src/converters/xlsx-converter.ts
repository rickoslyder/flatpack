/**
 * XLSX/XLS to Markdown converter
 * Uses SheetJS for parsing (requires runtime dependency)
 */

import type { ConversionResult, ConversionOptions, ConversionMetadata } from "./base-converter.js";
import { successResult, failureResult } from "./base-converter.js";
import { countWords } from "../utils/index.js";

/**
 * SheetJS types
 */
interface WorkBook {
  SheetNames: string[];
  Sheets: Record<string, WorkSheet>;
}

interface WorkSheet {
  [key: string]: CellObject | unknown;
}

interface CellObject {
  t: string; // type
  v: unknown; // value
  w?: string; // formatted text
}

interface XLSXModule {
  read: (data: ArrayBuffer, opts?: { type: string }) => WorkBook;
  utils: {
    sheet_to_json: <T>(sheet: WorkSheet, opts?: { header?: number | string; raw?: boolean }) => T[];
    decode_range: (range: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
  };
}

/**
 * Convert XLSX/XLS to Markdown tables
 */
export async function convertXlsx(
  content: Uint8Array,
  _filename: string,
  options?: ConversionOptions
): Promise<ConversionResult> {
  try {
    // Dynamic import of xlsx
    let XLSX: XLSXModule;
    try {
      XLSX = (await import("xlsx")) as unknown as XLSXModule;
    } catch {
      return failureResult(
        "xlsx is required for spreadsheet conversion. Install with: pnpm add xlsx"
      );
    }

    const arrayBuffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    ) as ArrayBuffer;

    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const warnings: string[] = [];
    const markdownParts: string[] = [];

    const maxTableWidth = options?.maxTableWidth || 120;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Add sheet header
      markdownParts.push(`## ${sheetName}\n`);

      // Convert to array of arrays
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });

      if (rows.length === 0) {
        markdownParts.push("*Empty sheet*\n");
        continue;
      }

      // Check if table is too wide
      const maxCols = Math.max(...rows.map((r) => r?.length || 0));
      if (maxCols > 20) {
        warnings.push(`Sheet "${sheetName}" has ${maxCols} columns, output may be wide`);
      }

      // Check if table is too long
      if (rows.length > 1000) {
        warnings.push(`Sheet "${sheetName}" has ${rows.length} rows, truncating to 1000`);
        rows.length = 1000;
      }

      // Generate Markdown table
      const table = generateMarkdownTable(rows, maxTableWidth);
      markdownParts.push(table);
      markdownParts.push("\n");
    }

    const markdown = markdownParts.join("\n");
    const wordCount = countWords(markdown);

    const metadata: ConversionMetadata = {
      sheetNames: workbook.SheetNames,
    };

    return successResult(markdown, wordCount, warnings, metadata);
  } catch (error) {
    return failureResult(
      `Failed to convert spreadsheet: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate a Markdown table from rows
 */
function generateMarkdownTable(rows: (string | undefined)[][], maxWidth: number): string {
  if (rows.length === 0) return "";

  // Normalize row lengths
  const colCount = Math.max(...rows.map((r) => r?.length || 0));
  const normalizedRows = rows.map((row) => {
    const normalized = Array(colCount).fill("");
    if (row) {
      for (let i = 0; i < row.length; i++) {
        normalized[i] = String(row[i] ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      }
    }
    return normalized;
  });

  // Calculate column widths
  const colWidths = Array(colCount).fill(3);
  for (const row of normalizedRows) {
    for (let i = 0; i < colCount; i++) {
      colWidths[i] = Math.max(colWidths[i], (row[i]?.length || 0) + 2);
    }
  }

  // Truncate columns if table is too wide
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + colCount + 1;
  if (totalWidth > maxWidth && colCount > 1) {
    const maxColWidth = Math.floor((maxWidth - colCount - 1) / colCount);
    for (let i = 0; i < colCount; i++) {
      if (colWidths[i]! > maxColWidth) {
        colWidths[i] = maxColWidth;
      }
    }
  }

  // Build table
  const lines: string[] = [];

  // Header row
  const header = normalizedRows[0] || [];
  lines.push("| " + header.map((cell, i) => padCell(cell, colWidths[i]!)).join(" | ") + " |");

  // Separator row
  lines.push("| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |");

  // Data rows
  for (let i = 1; i < normalizedRows.length; i++) {
    const row = normalizedRows[i] || [];
    lines.push("| " + row.map((cell, j) => padCell(cell || "", colWidths[j]!)).join(" | ") + " |");
  }

  return lines.join("\n");
}

/**
 * Pad a cell to a specific width
 */
function padCell(cell: string, width: number): string {
  if (cell.length > width) {
    return cell.slice(0, width - 1) + "…";
  }
  return cell.padEnd(width);
}

/**
 * XLSX converter implementation
 */
export const xlsxConverter = {
  name: "xlsx",
  extensions: ["xlsx", "xls"],
  convert: convertXlsx,
};
