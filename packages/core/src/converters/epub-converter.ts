/**
 * EPUB to Markdown converter
 * Extracts chapters and preserves structure
 */

import type { ConversionResult, ConversionOptions, ConversionMetadata } from "./base-converter.js";
import { successResult, failureResult } from "./base-converter.js";
import { countWords } from "../utils/index.js";

/**
 * JSZip types
 */
interface JSZipModule {
  loadAsync: (data: ArrayBuffer) => Promise<JSZipInstance>;
}

interface JSZipInstance {
  files: Record<string, JSZipFile>;
  file: (path: string) => JSZipFile | null;
}

interface JSZipFile {
  async: (type: "string") => Promise<string>;
}

/**
 * Convert EPUB to Markdown
 */
export async function convertEpub(
  content: Uint8Array,
  _filename: string,
  _options?: ConversionOptions
): Promise<ConversionResult> {
  try {
    // Dynamic import of JSZip
    let JSZip: JSZipModule;
    try {
      const jszip = await import("jszip");
      JSZip = jszip.default as unknown as JSZipModule;
    } catch {
      return failureResult(
        "jszip is required for EPUB conversion. Install with: pnpm add jszip"
      );
    }

    const arrayBuffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    ) as ArrayBuffer;

    const zip = await JSZip.loadAsync(arrayBuffer);
    const warnings: string[] = [];

    // Find and parse container.xml to get content.opf path
    const containerXml = await zip.file("META-INF/container.xml")?.async("string");
    if (!containerXml) {
      return failureResult("Invalid EPUB: missing container.xml");
    }

    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootfileMatch) {
      return failureResult("Invalid EPUB: cannot find content.opf path");
    }

    const opfPath = rootfileMatch[1]!;
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);

    // Parse content.opf
    const opfXml = await zip.file(opfPath)?.async("string");
    if (!opfXml) {
      return failureResult("Invalid EPUB: missing content.opf");
    }

    // Extract metadata
    const title = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)?.[1];
    const author = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/)?.[1];

    // Find spine items (reading order)
    const spineItems = getSpineItems(opfXml, opfDir);

    // Extract content from each spine item
    const chapters: ChapterContent[] = [];
    for (const item of spineItems) {
      const chapterHtml = await zip.file(item.href)?.async("string");
      if (!chapterHtml) continue;

      const chapterText = htmlToPlainText(chapterHtml);
      if (chapterText.trim()) {
        chapters.push({
          title: item.title || `Chapter ${chapters.length + 1}`,
          content: chapterText,
        });
      }
    }

    if (chapters.length === 0) {
      warnings.push("No readable content found in EPUB");
    }

    // Generate Markdown
    const markdown = generateEpubMarkdown(chapters, title, author);
    const wordCount = countWords(markdown);

    const metadata: ConversionMetadata = {
      title,
      author,
      chapterCount: chapters.length,
    };

    return successResult(markdown, wordCount, warnings, metadata);
  } catch (error) {
    return failureResult(
      `Failed to convert EPUB: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Chapter content structure
 */
interface ChapterContent {
  title: string;
  content: string;
}

/**
 * Spine item from OPF
 */
interface SpineItem {
  id: string;
  href: string;
  title?: string;
}

/**
 * Parse spine items from OPF
 */
function getSpineItems(opfXml: string, opfDir: string): SpineItem[] {
  const items: SpineItem[] = [];

  // Build manifest ID to href map
  const manifestMap = new Map<string, string>();
  const manifestMatches = opfXml.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"/g);
  for (const match of manifestMatches) {
    manifestMap.set(match[1]!, match[2]!);
  }

  // Get spine order
  const spineMatches = opfXml.matchAll(/<itemref[^>]+idref="([^"]+)"/g);
  for (const match of spineMatches) {
    const id = match[1]!;
    const href = manifestMap.get(id);
    if (href) {
      items.push({
        id,
        href: opfDir + href,
      });
    }
  }

  return items;
}

/**
 * Convert HTML to plain text with basic formatting
 */
function htmlToPlainText(html: string): string {
  let text = html;

  // Remove scripts and styles
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Convert headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");

  // Convert paragraphs
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");

  // Convert line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Convert emphasis
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

/**
 * Generate Markdown from EPUB chapters
 */
function generateEpubMarkdown(
  chapters: ChapterContent[],
  title?: string,
  author?: string
): string {
  const parts: string[] = [];

  if (title) {
    parts.push(`# ${title}\n`);
    if (author) {
      parts.push(`*By ${author}*\n`);
    }
    parts.push("---\n");
  }

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!;
    parts.push(`## ${chapter.title}\n`);
    parts.push(chapter.content);
    parts.push("\n");
  }

  return parts.join("\n");
}

/**
 * EPUB converter implementation
 */
export const epubConverter = {
  name: "epub",
  extensions: ["epub"],
  convert: convertEpub,
};
