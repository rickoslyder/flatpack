/**
 * DOCX to Markdown converter
 * Uses mammoth.js for conversion (requires runtime dependency)
 */

import type { ConversionResult, ConversionOptions, ConversionMetadata } from "./base-converter.js";
import { successResult, failureResult } from "./base-converter.js";
import { countWords } from "../utils/index.js";

/**
 * Mammoth conversion options type
 */
interface MammothOptions {
  styleMap?: string[];
}

/**
 * Mammoth result type
 */
interface MammothResult {
  value: string;
  messages: Array<{ type: string; message: string }>;
}

/**
 * Mammoth module type
 */
interface MammothModule {
  convertToMarkdown: (
    input: { arrayBuffer: ArrayBuffer },
    options?: MammothOptions
  ) => Promise<MammothResult>;
  extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
}

/**
 * Convert DOCX to Markdown
 */
export async function convertDocx(
  content: Uint8Array,
  _filename: string,
  _options?: ConversionOptions
): Promise<ConversionResult> {
  try {
    // Dynamic import of mammoth
    let mammoth: MammothModule;
    try {
      mammoth = (await import("mammoth")) as unknown as MammothModule;
    } catch {
      return failureResult(
        "mammoth.js is required for DOCX conversion. Install with: pnpm add mammoth"
      );
    }

    const arrayBuffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    ) as ArrayBuffer;

    // Custom style mapping for better Markdown output
    const styleMap = [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "r[style-name='Strong'] => strong",
      "r[style-name='Emphasis'] => em",
    ];

    const result = await mammoth.convertToMarkdown(
      { arrayBuffer },
      { styleMap }
    );

    const warnings: string[] = result.messages
      .filter((m) => m.type === "warning")
      .map((m) => m.message);

    // Clean up the Markdown
    let markdown = result.value;
    markdown = cleanupDocxMarkdown(markdown);

    const wordCount = countWords(markdown);

    const metadata: ConversionMetadata = {
      hasImages: markdown.includes("!["),
    };

    return successResult(markdown, wordCount, warnings, metadata);
  } catch (error) {
    return failureResult(
      `Failed to convert DOCX: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Clean up mammoth's Markdown output
 */
function cleanupDocxMarkdown(markdown: string): string {
  let cleaned = markdown;

  // Fix multiple consecutive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Fix heading spacing
  cleaned = cleaned.replace(/\n(#{1,6})\s/g, "\n\n$1 ");

  // Fix list spacing
  cleaned = cleaned.replace(/\n(\s*[-*])\s/g, "\n$1 ");
  cleaned = cleaned.replace(/\n(\s*\d+\.)\s/g, "\n$1 ");

  // Remove empty paragraphs
  cleaned = cleaned.replace(/\n\n\n+/g, "\n\n");

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * DOCX converter implementation
 */
export const docxConverter = {
  name: "docx",
  extensions: ["docx", "doc"],
  convert: convertDocx,
};
