/**
 * Configuration types
 */

/** NotebookLM tier selection */
export type NotebookTier = "free" | "pro";

/** Tier-specific limits */
export interface TierLimits {
  /** Maximum number of sources */
  maxSources: number;
  /** Maximum words per source */
  maxWordsPerSource: number;
  /** Maximum file size per source in bytes */
  maxFileSizePerSource: number;
}

/** Path separator style for flattened filenames */
export type PathSeparator = "underscore" | "hyphen";

/** PDF handling preference */
export type PdfHandling = "convert" | "preserve";

/** Error handling mode */
export type ErrorHandlingMode = "pause" | "continue";

/** User configuration for Flatpack */
export interface FlatpackConfig {
  /** Selected NotebookLM tier */
  tier: NotebookTier;
  /** Path separator for flattened filenames */
  pathSeparator: PathSeparator;
  /** Custom ignore patterns (glob syntax) */
  ignorePatterns: string[];
  /** PDF handling preference */
  pdfHandling: PdfHandling;
  /** Soft warning threshold for large files (words) */
  softWarningThreshold: number;
  /** OCR language code */
  ocrLanguage: string;
  /** Error handling mode */
  errorHandlingMode: ErrorHandlingMode;
  /** Default output location (desktop only) */
  outputLocation?: string;
  /** Theme preference */
  theme: "system" | "light" | "dark";
}

/** Partial config for updates */
export type FlatpackConfigUpdate = Partial<FlatpackConfig>;
