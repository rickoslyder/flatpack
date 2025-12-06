/**
 * RTF to Markdown converter
 * Extracts plain text from RTF documents
 */

import type { ConversionResult, ConversionOptions } from "./base-converter.js";
import { successResult, failureResult } from "./base-converter.js";
import { countWords, decodeContent, detectEncoding } from "../utils/index.js";

/**
 * Convert RTF to Markdown
 */
export async function convertRtf(
  content: Uint8Array,
  _filename: string,
  _options?: ConversionOptions
): Promise<ConversionResult> {
  try {
    const encodingInfo = detectEncoding(content);
    const rtfContent = decodeContent(content, encodingInfo.encoding);

    // Verify it's actually RTF
    if (!rtfContent.startsWith("{\\rtf")) {
      return failureResult("File does not appear to be a valid RTF document");
    }

    const plainText = stripRtf(rtfContent);
    const wordCount = countWords(plainText);

    return successResult(plainText, wordCount);
  } catch (error) {
    return failureResult(
      `Failed to convert RTF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Strip RTF control codes and extract plain text
 */
function stripRtf(rtf: string): string {
  // Remove RTF header
  let text = rtf.replace(/^\{\\rtf\d?/, "");

  // Track state for control words
  const output: string[] = [];
  let i = 0;
  let braceDepth = 1;
  let skipGroup = false;
  let skipDepth = 0;

  // Groups to skip (they contain non-text content)
  const skipGroups = new Set([
    "fonttbl",
    "colortbl",
    "stylesheet",
    "info",
    "pict",
    "object",
    "datafield",
    "themedata",
    "colorschememapping",
  ]);

  while (i < text.length) {
    const char = text[i]!;

    if (char === "{") {
      braceDepth++;
      // Check if this group should be skipped
      const nextChars = text.slice(i + 1, i + 30);
      const groupMatch = nextChars.match(/^\\([a-z]+)/);
      if (groupMatch && skipGroups.has(groupMatch[1]!)) {
        skipGroup = true;
        skipDepth = braceDepth;
      }
      i++;
      continue;
    }

    if (char === "}") {
      if (skipGroup && braceDepth === skipDepth) {
        skipGroup = false;
      }
      braceDepth--;
      i++;
      continue;
    }

    // Skip content in excluded groups
    if (skipGroup) {
      i++;
      continue;
    }

    if (char === "\\") {
      // Control word or escape
      const remaining = text.slice(i);

      // Line breaks
      if (remaining.startsWith("\\par") || remaining.startsWith("\\line")) {
        output.push("\n");
        i += remaining.match(/^\\(par|line)\s?/)?.[0].length || 4;
        continue;
      }

      // Tab
      if (remaining.startsWith("\\tab")) {
        output.push("\t");
        i += 4;
        continue;
      }

      // Non-breaking space
      if (remaining.startsWith("\\~")) {
        output.push(" ");
        i += 2;
        continue;
      }

      // Escaped characters
      if (remaining.startsWith("\\\\")) {
        output.push("\\");
        i += 2;
        continue;
      }
      if (remaining.startsWith("\\{")) {
        output.push("{");
        i += 2;
        continue;
      }
      if (remaining.startsWith("\\}")) {
        output.push("}");
        i += 2;
        continue;
      }

      // Hex encoded character
      const hexMatch = remaining.match(/^\\'([0-9a-f]{2})/i);
      if (hexMatch) {
        const charCode = parseInt(hexMatch[1]!, 16);
        output.push(String.fromCharCode(charCode));
        i += 4;
        continue;
      }

      // Unicode character
      const unicodeMatch = remaining.match(/^\\u(-?\d+)/);
      if (unicodeMatch) {
        let charCode = parseInt(unicodeMatch[1]!, 10);
        if (charCode < 0) charCode += 65536;
        output.push(String.fromCharCode(charCode));
        // Skip the control word and optional space
        i += unicodeMatch[0].length;
        // Skip replacement char if present
        if (text[i] === "?") i++;
        continue;
      }

      // Skip other control words
      const ctrlMatch = remaining.match(/^\\[a-z*]+(-?\d+)?\s?/i);
      if (ctrlMatch) {
        i += ctrlMatch[0].length;
        continue;
      }

      // Unknown escape, skip just the backslash
      i++;
      continue;
    }

    // Regular character
    if (char !== "\r" && char !== "\n") {
      output.push(char);
    }
    i++;
  }

  // Clean up the result
  let result = output.join("");

  // Fix multiple newlines
  result = result.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace
  result = result.trim();

  return result;
}

/**
 * RTF converter implementation
 */
export const rtfConverter = {
  name: "rtf",
  extensions: ["rtf"],
  convert: convertRtf,
};
