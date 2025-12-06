/**
 * Base converter interface and types
 */

/**
 * Result of a conversion operation
 */
export interface ConversionResult {
  /** Converted content (Markdown) */
  content: string;
  /** Word count of converted content */
  wordCount: number;
  /** Whether conversion was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Warnings generated during conversion */
  warnings: string[];
  /** Metadata extracted during conversion */
  metadata?: ConversionMetadata;
}

/**
 * Metadata extracted during conversion
 */
export interface ConversionMetadata {
  /** Document title if available */
  title?: string;
  /** Document author if available */
  author?: string;
  /** Creation date if available */
  createdAt?: Date;
  /** Page count (for paginated documents) */
  pageCount?: number;
  /** Sheet names (for spreadsheets) */
  sheetNames?: string[];
  /** Slide count (for presentations) */
  slideCount?: number;
  /** Chapter count (for ebooks) */
  chapterCount?: number;
  /** Whether document contains images */
  hasImages?: boolean;
  /** Whether document required OCR */
  usedOcr?: boolean;
}

/**
 * Options for conversion
 */
export interface ConversionOptions {
  /** Whether to include images (as placeholders) */
  includeImages?: boolean;
  /** Whether to preserve formatting hints */
  preserveFormatting?: boolean;
  /** Maximum table width in characters */
  maxTableWidth?: number;
  /** Language for OCR */
  ocrLanguage?: string;
  /** Whether to extract metadata */
  extractMetadata?: boolean;
}

/**
 * Base converter interface
 */
export interface Converter {
  /** Unique converter name */
  name: string;
  /** Supported file extensions */
  extensions: string[];
  /** Convert file content to Markdown */
  convert(
    content: Uint8Array,
    filename: string,
    options?: ConversionOptions
  ): Promise<ConversionResult>;
}

/**
 * Create a successful conversion result
 */
export function successResult(
  content: string,
  wordCount: number,
  warnings: string[] = [],
  metadata?: ConversionMetadata
): ConversionResult {
  return {
    content,
    wordCount,
    success: true,
    warnings,
    metadata,
  };
}

/**
 * Create a failed conversion result
 */
export function failureResult(error: string, warnings: string[] = []): ConversionResult {
  return {
    content: "",
    wordCount: 0,
    success: false,
    error,
    warnings,
  };
}
