/**
 * HTML to Markdown converter
 */

import type { ConversionResult, ConversionOptions } from "./base-converter.js";
import { successResult, failureResult } from "./base-converter.js";
import { countWords, decodeContent, detectEncoding } from "../utils/index.js";

/**
 * Convert HTML to Markdown
 */
export async function convertHtml(
  content: Uint8Array,
  _filename: string,
  options?: ConversionOptions
): Promise<ConversionResult> {
  try {
    const encodingInfo = detectEncoding(content);
    if (encodingInfo.isBinary) {
      return failureResult("File appears to be binary, not HTML");
    }

    const html = decodeContent(content, encodingInfo.encoding);
    const markdown = htmlToMarkdown(html, options);
    const wordCount = countWords(markdown);

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim();

    return successResult(markdown, wordCount, [], { title });
  } catch (error) {
    return failureResult(
      `Failed to convert HTML: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert HTML to Markdown (basic implementation)
 * Note: For production, use turndown library
 */
function htmlToMarkdown(html: string, options?: ConversionOptions): string {
  let markdown = html;

  // Remove scripts and styles
  markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Remove HTML comments
  markdown = markdown.replace(/<!--[\s\S]*?-->/g, "");

  // Convert headings
  markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  markdown = markdown.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  markdown = markdown.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  markdown = markdown.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n");

  // Convert bold
  markdown = markdown.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");

  // Convert italic
  markdown = markdown.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");

  // Convert code
  markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Convert preformatted text
  markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n");

  // Convert links
  markdown = markdown.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Convert images (if including images)
  if (options?.includeImages) {
    markdown = markdown.replace(
      /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
      "![$2]($1)"
    );
    markdown = markdown.replace(
      /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
      "![$1]($2)"
    );
    markdown = markdown.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![]($1)");
  } else {
    markdown = markdown.replace(/<img[^>]*>/gi, "");
  }

  // Convert unordered lists
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  });

  // Convert ordered lists
  let listCounter = 0;
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    listCounter = 0;
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
      listCounter++;
      return `${listCounter}. $1\n`;
    });
  });

  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    return content
      .split("\n")
      .map((line: string) => `> ${line}`)
      .join("\n");
  });

  // Convert horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Convert tables
  markdown = convertTables(markdown);

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  markdown = decodeHtmlEntities(markdown);

  // Clean up whitespace
  markdown = markdown
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .trim();

  return markdown;
}

/**
 * Convert HTML tables to Markdown
 */
function convertTables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];

    // Extract rows
    const rowMatches = tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const rowMatch of rowMatches) {
      const cells: string[] = [];
      const cellMatches = rowMatch[1].matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi);
      for (const cellMatch of cellMatches) {
        cells.push(cellMatch[2]?.trim().replace(/<[^>]+>/g, "") || "");
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return "";

    // Build Markdown table
    const colCount = Math.max(...rows.map((r) => r.length));
    let table = "";

    // Header row
    const header = rows[0] || [];
    table += "| " + header.map((c) => c || " ").join(" | ") + " |\n";
    table += "| " + Array(colCount).fill("---").join(" | ") + " |\n";

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      table += "| " + row.map((c) => c || " ").join(" | ") + " |\n";
    }

    return "\n" + table + "\n";
  });
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "gi"), char);
  }

  // Decode numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return decoded;
}

/**
 * HTML converter implementation
 */
export const htmlConverter = {
  name: "html",
  extensions: ["html", "htm"],
  convert: convertHtml,
};
