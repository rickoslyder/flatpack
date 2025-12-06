/**
 * PPTX/PPT to Markdown converter
 * Extracts slide text and speaker notes
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
 * Convert PPTX to Markdown
 */
export async function convertPptx(
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
        "jszip is required for PPTX conversion. Install with: pnpm add jszip"
      );
    }

    const arrayBuffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    ) as ArrayBuffer;

    const zip = await JSZip.loadAsync(arrayBuffer);
    const warnings: string[] = [];
    const slides: SlideContent[] = [];

    // Find all slide files
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
        const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
        return numA - numB;
      });

    // Extract content from each slide
    for (const slideFile of slideFiles) {
      const slideNum = parseInt(slideFile.match(/slide(\d+)\.xml/)?.[1] || "0", 10);

      const slideXml = await zip.file(slideFile)?.async("string");
      if (!slideXml) continue;

      const slideText = extractTextFromXml(slideXml);

      // Try to get speaker notes
      const notesFile = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      let notes = "";
      const notesXml = await zip.file(notesFile)?.async("string");
      if (notesXml) {
        notes = extractTextFromXml(notesXml);
      }

      slides.push({
        number: slideNum,
        text: slideText,
        notes,
      });
    }

    // Try to get presentation title from core.xml
    let title: string | undefined;
    const coreXml = await zip.file("docProps/core.xml")?.async("string");
    if (coreXml) {
      const titleMatch = coreXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
      title = titleMatch?.[1];
    }

    // Generate Markdown
    const markdown = generatePptxMarkdown(slides, title);
    const wordCount = countWords(markdown);

    const metadata: ConversionMetadata = {
      title,
      slideCount: slides.length,
    };

    return successResult(markdown, wordCount, warnings, metadata);
  } catch (error) {
    return failureResult(
      `Failed to convert presentation: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Slide content structure
 */
interface SlideContent {
  number: number;
  text: string;
  notes: string;
}

/**
 * Extract text from OOXML content
 */
function extractTextFromXml(xml: string): string {
  // Extract text from <a:t> tags (text runs)
  const textMatches = xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g);
  const textParts: string[] = [];

  for (const match of textMatches) {
    const text = match[1] || "";
    if (text.trim()) {
      textParts.push(text);
    }
  }

  // Also check for paragraph boundaries
  const result = textParts.join(" ");

  // Clean up whitespace
  return result
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

/**
 * Generate Markdown from slides
 */
function generatePptxMarkdown(slides: SlideContent[], title?: string): string {
  const parts: string[] = [];

  if (title) {
    parts.push(`# ${title}\n`);
  }

  for (const slide of slides) {
    parts.push(`## Slide ${slide.number}\n`);

    if (slide.text) {
      parts.push(slide.text);
      parts.push("");
    } else {
      parts.push("*No text content*\n");
    }

    if (slide.notes) {
      parts.push("### Speaker Notes\n");
      parts.push(slide.notes);
      parts.push("");
    }

    parts.push("---\n");
  }

  return parts.join("\n");
}

/**
 * PPTX converter implementation
 */
export const pptxConverter = {
  name: "pptx",
  extensions: ["pptx", "ppt"],
  convert: convertPptx,
};
