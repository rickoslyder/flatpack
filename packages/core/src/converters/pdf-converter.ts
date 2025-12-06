/**
 * PDF to Markdown converter interface
 * Platform-specific implementations in desktop (Rust) and web (pdfjs) packages
 */

import type { ConversionResult, ConversionOptions, ConversionMetadata } from "./base-converter.js";
import { successResult, failureResult } from "./base-converter.js";
import { countWords } from "../utils/index.js";

/**
 * PDF analysis result
 */
export interface PdfAnalysis {
  /** Number of pages */
  pageCount: number;
  /** Whether PDF has extractable text */
  hasText: boolean;
  /** Estimated text-to-page ratio (for OCR detection) */
  textRatio: number;
  /** Whether PDF appears to be scanned/image-based */
  isScanned: boolean;
  /** Whether PDF is encrypted/protected */
  isProtected: boolean;
  /** Whether PDF requires password */
  requiresPassword: boolean;
  /** Document title from metadata */
  title?: string;
  /** Document author from metadata */
  author?: string;
}

/**
 * PDF converter interface - implemented by platform adapters
 */
export interface PdfConverter {
  /**
   * Analyze PDF without full conversion
   */
  analyze(content: Uint8Array): Promise<PdfAnalysis>;

  /**
   * Extract text from PDF
   */
  extractText(content: Uint8Array, options?: ConversionOptions): Promise<ConversionResult>;

  /**
   * Check if OCR is available
   */
  hasOcrSupport(): boolean;

  /**
   * Perform OCR on PDF (if supported)
   */
  ocrPdf?(content: Uint8Array, language?: string): Promise<ConversionResult>;
}

/**
 * Convert PDF to Markdown (stub - uses platform adapter)
 */
export async function convertPdf(
  content: Uint8Array,
  _filename: string,
  options?: ConversionOptions,
  adapter?: PdfConverter
): Promise<ConversionResult> {
  if (!adapter) {
    return failureResult(
      "PDF conversion requires a platform adapter. Use TauriAdapter (desktop) or WebAdapter (browser)."
    );
  }

  try {
    // First analyze the PDF
    const analysis = await adapter.analyze(content);

    if (analysis.isProtected || analysis.requiresPassword) {
      return failureResult("PDF is password-protected or encrypted and cannot be processed");
    }

    // Check if OCR is needed
    if (analysis.isScanned && !analysis.hasText) {
      if (!adapter.hasOcrSupport() || !adapter.ocrPdf) {
        return failureResult(
          "PDF appears to be scanned but OCR is not available. " +
            "Use the desktop app for OCR support."
        );
      }

      // Perform OCR
      const ocrResult = await adapter.ocrPdf(content, options?.ocrLanguage);
      if (ocrResult.success && ocrResult.metadata) {
        ocrResult.metadata.usedOcr = true;
        ocrResult.metadata.pageCount = analysis.pageCount;
      }
      return ocrResult;
    }

    // Extract text directly
    const result = await adapter.extractText(content, options);

    if (result.success && result.metadata) {
      result.metadata.pageCount = analysis.pageCount;
      result.metadata.title = analysis.title;
      result.metadata.author = analysis.author;
    }

    return result;
  } catch (error) {
    return failureResult(
      `Failed to convert PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Basic PDF text extraction using pdfjs-dist (for web)
 * This is a minimal implementation - full implementation in web adapter
 */
export async function extractPdfTextBasic(content: Uint8Array): Promise<ConversionResult> {
  try {
    // Dynamic import of pdfjs-dist
    let pdfjsLib: PdfJsLib;
    try {
      pdfjsLib = (await import("pdfjs-dist")) as unknown as PdfJsLib;
    } catch {
      return failureResult(
        "pdfjs-dist is required for PDF conversion in browser. Install with: pnpm add pdfjs-dist"
      );
    }

    const loadingTask = pdfjsLib.getDocument({ data: content });
    const pdf = await loadingTask.promise;

    const textParts: string[] = [];
    const warnings: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: TextItem) => item.str)
        .join(" ");

      if (pageText.trim()) {
        textParts.push(`<!-- Page ${i} -->\n${pageText}`);
      }
    }

    if (textParts.length === 0) {
      warnings.push("No text could be extracted from PDF. It may be scanned or image-based.");
    }

    const markdown = textParts.join("\n\n");
    const wordCount = countWords(markdown);

    const metadata: ConversionMetadata = {
      pageCount: pdf.numPages,
    };

    return successResult(markdown, wordCount, warnings, metadata);
  } catch (error) {
    return failureResult(
      `Failed to extract PDF text: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * PDF.js types (minimal)
 */
interface PdfJsLib {
  getDocument: (params: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
}

interface PdfDocument {
  numPages: number;
  getPage: (num: number) => Promise<PdfPage>;
}

interface PdfPage {
  getTextContent: () => Promise<{ items: TextItem[] }>;
}

interface TextItem {
  str: string;
}

/**
 * PDF converter implementation (stub)
 */
export const pdfConverter = {
  name: "pdf",
  extensions: ["pdf"],
  convert: async (
    content: Uint8Array,
    _filename: string,
    _options?: ConversionOptions
  ): Promise<ConversionResult> => {
    // Default to basic extraction without adapter
    return extractPdfTextBasic(content);
  },
};
