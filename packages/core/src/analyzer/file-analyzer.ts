/**
 * File analyzer
 * Combines classification, word counting, and warning generation
 */

import type {
  ScannedFile,
  AnalyzedFile,
  FileWarning,
  FileWarningCode,
  FlatpackConfig,
} from "../types/index.js";
import { TIER_LIMITS } from "../constants/index.js";
import {
  countWords,
  estimateWordCount,
  detectEncoding,
  decodeContent,
} from "../utils/index.js";
import { classifyFile } from "./file-classifier.js";
import { detectRelatedFiles } from "./related-files.js";

/**
 * Options for file analysis
 */
export interface AnalyzeOptions {
  /** Configuration */
  config: FlatpackConfig;
  /** All scanned files (for related files detection) */
  allFiles: ScannedFile[];
  /** Function to read file contents */
  readFile: (path: string) => Promise<Uint8Array>;
  /** Whether to perform deep analysis (read content) */
  deepAnalysis?: boolean;
  /** Progress callback */
  onProgress?: (analyzed: number, total: number, current: string) => void;
}

/**
 * Analyze a single file
 */
export async function analyzeFile(
  file: ScannedFile,
  options: AnalyzeOptions
): Promise<AnalyzedFile> {
  const { config, allFiles, readFile, deepAnalysis = true } = options;

  // Classify the file
  const classification = classifyFile(file.path, file.size);

  // Initialize warnings array
  const warnings: FileWarning[] = [];

  // Start with estimates
  let wordCount = estimateWordCount(file.size);
  let encoding: string | undefined;
  let content: string | undefined;

  // Deep analysis: read content for accurate word count and encoding
  if (deepAnalysis && classification.canProcess && classification.tier !== "ocr") {
    try {
      const buffer = await readFile(file.path);
      const encodingInfo = detectEncoding(buffer);
      encoding = encodingInfo.encoding;

      if (!encodingInfo.isBinary) {
        content = decodeContent(buffer, encoding);
        wordCount = countWords(content);
      } else {
        warnings.push(createWarning("binary_content", file.path));
      }
    } catch (error) {
      warnings.push({
        code: "encoding_issue",
        message: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "warning",
      });
    }
  }

  // Check for empty files
  if (file.size === 0) {
    warnings.push(createWarning("empty_file", file.path));
  }

  // Check for oversized files
  const tierLimits = TIER_LIMITS[config.tier];
  if (wordCount > tierLimits.maxWordsPerSource) {
    warnings.push(createWarning("exceeds_limit", file.path, wordCount));
  } else if (wordCount > config.softWarningThreshold) {
    warnings.push(createWarning("large_file", file.path, wordCount));
  }

  // Check for OCR requirement
  if (classification.requiresOcr) {
    warnings.push(createWarning("requires_ocr", file.path));
  }

  // Check for unsupported format
  if (!classification.canProcess) {
    warnings.push(createWarning("unsupported_format", file.path, undefined, classification.reason));
  }

  // Detect related files
  const relatedFiles = detectRelatedFiles(file, allFiles, content);

  return {
    ...file,
    tier: classification.tier,
    wordCount,
    encoding,
    requiresOcr: classification.requiresOcr,
    isCopyProtected: false, // Determined during PDF conversion
    relatedFiles,
    warnings,
  };
}

/**
 * Analyze multiple files
 */
export async function analyzeFiles(
  files: ScannedFile[],
  options: AnalyzeOptions
): Promise<AnalyzedFile[]> {
  const analyzed: AnalyzedFile[] = [];
  const total = files.filter((f) => !f.isDirectory).length;
  let count = 0;

  for (const file of files) {
    if (file.isDirectory) continue;

    const result = await analyzeFile(file, options);
    analyzed.push(result);

    count++;
    options.onProgress?.(count, total, file.relativePath);
  }

  return analyzed;
}

/**
 * Create a warning object
 */
function createWarning(
  code: FileWarningCode,
  _path: string,
  wordCount?: number,
  reason?: string
): FileWarning {
  switch (code) {
    case "large_file":
      return {
        code,
        message: `File has ${formatNumber(wordCount!)} words, approaching limit`,
        severity: "warning",
      };

    case "exceeds_limit":
      return {
        code,
        message: `File exceeds word limit with ${formatNumber(wordCount!)} words, will be chunked`,
        severity: "warning",
      };

    case "requires_ocr":
      return {
        code,
        message: "File requires OCR processing (slower)",
        severity: "info",
      };

    case "copy_protected":
      return {
        code,
        message: "PDF is copy-protected and cannot be processed",
        severity: "error",
      };

    case "unsupported_format":
      return {
        code,
        message: reason || "File format is not supported",
        severity: "error",
      };

    case "encoding_issue":
      return {
        code,
        message: reason || "File encoding could not be detected",
        severity: "warning",
      };

    case "empty_file":
      return {
        code,
        message: "File is empty",
        severity: "info",
      };

    case "binary_content":
      return {
        code,
        message: "File appears to contain binary content",
        severity: "warning",
      };

    default:
      return {
        code,
        message: "Unknown warning",
        severity: "info",
      };
  }
}

/**
 * Format a number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Get analysis summary statistics
 */
export interface AnalysisSummary {
  totalFiles: number;
  totalWords: number;
  byTier: Record<string, number>;
  warningCount: number;
  errorCount: number;
  ocrFiles: number;
  largeFiles: number;
}

/**
 * Generate analysis summary
 */
export function getAnalysisSummary(files: AnalyzedFile[]): AnalysisSummary {
  const summary: AnalysisSummary = {
    totalFiles: files.length,
    totalWords: 0,
    byTier: {
      passthrough: 0,
      conversion: 0,
      ocr: 0,
      unsupported: 0,
    },
    warningCount: 0,
    errorCount: 0,
    ocrFiles: 0,
    largeFiles: 0,
  };

  for (const file of files) {
    summary.totalWords += file.wordCount;
    summary.byTier[file.tier] = (summary.byTier[file.tier] || 0) + 1;

    if (file.requiresOcr) summary.ocrFiles++;

    for (const warning of file.warnings) {
      if (warning.severity === "error") {
        summary.errorCount++;
      } else {
        summary.warningCount++;
      }

      if (warning.code === "large_file" || warning.code === "exceeds_limit") {
        summary.largeFiles++;
      }
    }
  }

  return summary;
}
