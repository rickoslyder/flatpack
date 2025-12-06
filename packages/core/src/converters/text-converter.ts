/**
 * Text file converter
 * Handles plain text, markdown, code, and data files
 */

import type { ConversionResult, ConversionOptions } from "./base-converter.js";
import { successResult, failureResult } from "./base-converter.js";
import { EXTENSION_LANGUAGE_MAP, CODE_EXTENSIONS, DATA_EXTENSIONS } from "../constants/index.js";
import { countWords, decodeContent, detectEncoding, getExtension } from "../utils/index.js";

/**
 * Convert text-based files to Markdown
 */
export async function convertText(
  content: Uint8Array,
  filename: string,
  _options?: ConversionOptions
): Promise<ConversionResult> {
  try {
    // Detect encoding and decode
    const encodingInfo = detectEncoding(content);
    if (encodingInfo.isBinary) {
      return failureResult("File appears to be binary, not text");
    }

    const text = decodeContent(content, encodingInfo.encoding);
    const ext = getExtension(filename);

    // Determine how to wrap the content
    let markdown: string;

    if (ext === "md" || ext === "mdx") {
      // Markdown files - pass through as-is
      markdown = text;
    } else if (CODE_EXTENSIONS.has(ext)) {
      // Code files - wrap in code block with language hint
      const language = EXTENSION_LANGUAGE_MAP[ext] || ext;
      markdown = wrapInCodeBlock(text, language);
    } else if (DATA_EXTENSIONS.has(ext)) {
      // Data files - wrap in code block with format hint
      const language = EXTENSION_LANGUAGE_MAP[ext] || ext;
      markdown = wrapInCodeBlock(text, language);
    } else if (ext === "txt" || !ext) {
      // Plain text - pass through
      markdown = text;
    } else {
      // Unknown text format - wrap in code block
      markdown = wrapInCodeBlock(text, ext || "text");
    }

    const wordCount = countWords(markdown);

    return successResult(markdown, wordCount, [], {
      title: extractTitle(text, ext),
    });
  } catch (error) {
    return failureResult(
      `Failed to convert text file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Wrap content in a Markdown code block
 */
function wrapInCodeBlock(content: string, language: string): string {
  // Ensure content doesn't have triple backticks that would break the block
  const escapedContent = content.replace(/```/g, "` ` `");
  return `\`\`\`${language}\n${escapedContent}\n\`\`\``;
}

/**
 * Try to extract a title from the content
 */
function extractTitle(content: string, ext: string): string | undefined {
  // For Markdown, look for first heading
  if (ext === "md" || ext === "mdx") {
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1]?.trim();
    }
  }

  // For code files, look for module docstring or top comment
  const firstLine = content.split("\n")[0]?.trim();
  if (firstLine?.startsWith("//") || firstLine?.startsWith("#")) {
    const comment = firstLine.replace(/^[/#]+\s*/, "").trim();
    if (comment.length > 0 && comment.length < 100) {
      return comment;
    }
  }

  return undefined;
}

/**
 * Text converter implementation
 */
export const textConverter = {
  name: "text",
  extensions: [
    "txt",
    "md",
    "mdx",
    "json",
    "yaml",
    "yml",
    "xml",
    "csv",
    "tsv",
    "ini",
    "toml",
    "env",
    "conf",
    "cfg",
    "py",
    "js",
    "ts",
    "jsx",
    "tsx",
    "go",
    "rs",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "rb",
    "php",
    "swift",
    "kt",
    "sql",
    "sh",
    "bash",
    "zsh",
    "ps1",
    "r",
    "scala",
    "lua",
    "pl",
    "m",
    "css",
    "scss",
    "sass",
    "less",
  ],
  convert: convertText,
};
