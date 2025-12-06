/**
 * Tier optimizer
 * Analyzes whether content fits within tier limits
 */

import type { AnalyzedFile, FlatpackConfig, NotebookTier } from "../types/index.js";
import { TIER_LIMITS, WARNING_THRESHOLDS } from "../constants/index.js";
import { estimateChunkCount } from "../processors/index.js";

/**
 * Result of tier analysis
 */
export interface TierAnalysis {
  /** Current tier */
  tier: NotebookTier;
  /** Tier limits */
  limits: typeof TIER_LIMITS.pro;
  /** Whether content fits in tier */
  fitsInTier: boolean;
  /** Estimated output source count */
  estimatedSourceCount: number;
  /** Percentage of tier source limit used */
  sourceUsagePercent: number;
  /** Total estimated word count */
  totalWordCount: number;
  /** Files that exceed word limit */
  oversizedFiles: OversizedFile[];
  /** Whether bundling is recommended */
  needsBundling: boolean;
  /** Warnings */
  warnings: TierWarning[];
}

/**
 * A file that exceeds word limit
 */
export interface OversizedFile {
  path: string;
  wordCount: number;
  estimatedChunks: number;
}

/**
 * Warning from tier analysis
 */
export interface TierWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

/**
 * Analyze content against tier limits
 */
export function analyzeTierFit(
  files: AnalyzedFile[],
  config: FlatpackConfig
): TierAnalysis {
  const tier = config.tier;
  const limits = TIER_LIMITS[tier];
  const warnings: TierWarning[] = [];

  // Count processable files
  const processableFiles = files.filter(
    (f) => !f.isDirectory && f.tier !== "unsupported"
  );

  // Calculate total words and find oversized files
  let totalWordCount = 0;
  const oversizedFiles: OversizedFile[] = [];
  let additionalSourcesFromChunking = 0;

  for (const file of processableFiles) {
    totalWordCount += file.wordCount;

    if (file.wordCount > limits.maxWordsPerSource) {
      const chunks = estimateChunkCount(file.wordCount, limits.maxWordsPerSource);
      oversizedFiles.push({
        path: file.relativePath,
        wordCount: file.wordCount,
        estimatedChunks: chunks,
      });
      // Chunked file creates extra sources
      additionalSourcesFromChunking += chunks - 1;
    }
  }

  // Estimate source count
  const baseSourceCount = processableFiles.length;
  const estimatedSourceCount = baseSourceCount + additionalSourcesFromChunking;

  // Calculate usage
  const sourceUsagePercent = (estimatedSourceCount / limits.maxSources) * 100;
  const fitsInTier = estimatedSourceCount <= limits.maxSources;

  // Determine if bundling is needed
  const needsBundling = estimatedSourceCount > limits.maxSources;

  // Generate warnings
  if (oversizedFiles.length > 0) {
    warnings.push({
      code: "oversized_files",
      message: `${oversizedFiles.length} file(s) exceed the word limit and will be chunked`,
      severity: "warning",
    });
  }

  if (sourceUsagePercent >= WARNING_THRESHOLDS.TIER_USAGE_CRITICAL * 100) {
    warnings.push({
      code: "near_source_limit",
      message: `Output will use ${Math.round(sourceUsagePercent)}% of ${tier} tier source limit`,
      severity: "error",
    });
  } else if (sourceUsagePercent >= WARNING_THRESHOLDS.TIER_USAGE_WARNING * 100) {
    warnings.push({
      code: "approaching_source_limit",
      message: `Output will use ${Math.round(sourceUsagePercent)}% of ${tier} tier source limit`,
      severity: "warning",
    });
  }

  if (needsBundling) {
    const excess = estimatedSourceCount - limits.maxSources;
    warnings.push({
      code: "bundling_required",
      message: `${excess} excess sources will require bundling to fit within ${tier} tier limit`,
      severity: "warning",
    });
  }

  // Check for OCR files
  const ocrFiles = processableFiles.filter((f) => f.requiresOcr);
  if (ocrFiles.length >= WARNING_THRESHOLDS.OCR_FILES_WARNING) {
    warnings.push({
      code: "many_ocr_files",
      message: `${ocrFiles.length} files require OCR, which may be slow`,
      severity: "info",
    });
  }

  return {
    tier,
    limits,
    fitsInTier,
    estimatedSourceCount,
    sourceUsagePercent,
    totalWordCount,
    oversizedFiles,
    needsBundling,
    warnings,
  };
}

/**
 * Recommend a tier based on content
 */
export function recommendTier(files: AnalyzedFile[]): {
  recommended: NotebookTier;
  reason: string;
} {
  const processableFiles = files.filter(
    (f) => !f.isDirectory && f.tier !== "unsupported"
  );

  const count = processableFiles.length;

  if (count <= TIER_LIMITS.free.maxSources) {
    return {
      recommended: "free",
      reason: `${count} sources fits within free tier limit of ${TIER_LIMITS.free.maxSources}`,
    };
  }

  if (count <= TIER_LIMITS.pro.maxSources) {
    return {
      recommended: "pro",
      reason: `${count} sources requires pro tier (free limit is ${TIER_LIMITS.free.maxSources})`,
    };
  }

  return {
    recommended: "pro",
    reason: `${count} sources exceeds even pro tier limit; bundling will be required`,
  };
}

/**
 * Calculate how many files need to be bundled
 */
export function calculateBundlingNeed(
  currentSourceCount: number,
  tier: NotebookTier
): {
  needsBundling: boolean;
  excessSources: number;
  targetReduction: number;
} {
  const limit = TIER_LIMITS[tier].maxSources;

  if (currentSourceCount <= limit) {
    return {
      needsBundling: false,
      excessSources: 0,
      targetReduction: 0,
    };
  }

  const excessSources = currentSourceCount - limit;
  // We need to reduce by at least this many, plus some buffer
  const targetReduction = Math.ceil(excessSources * 1.1);

  return {
    needsBundling: true,
    excessSources,
    targetReduction,
  };
}
