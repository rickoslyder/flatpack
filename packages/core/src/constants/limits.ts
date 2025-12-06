/**
 * NotebookLM and processing limits
 */

import type { NotebookTier, TierLimits } from "../types/index.js";

/** NotebookLM tier limits */
export const TIER_LIMITS: Record<NotebookTier, TierLimits> = {
  free: {
    maxSources: 50,
    maxWordsPerSource: 500_000,
    maxFileSizePerSource: 200 * 1024 * 1024, // 200MB
  },
  pro: {
    maxSources: 300,
    maxWordsPerSource: 500_000,
    maxFileSizePerSource: 200 * 1024 * 1024, // 200MB
  },
};

/** Processing thresholds */
export const PROCESSING_LIMITS = {
  /** Hard limit for chunking (words) */
  CHUNK_THRESHOLD: 450_000,
  /** Soft warning threshold (words) - user configurable */
  DEFAULT_SOFT_WARNING: 200_000,
  /** Maximum file size for web processing (bytes) */
  WEB_MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  /** Minimum word count for meaningful chunking */
  MIN_CHUNK_WORDS: 1_000,
  /** Overlap words for chunked content */
  CHUNK_OVERLAP_WORDS: 100,
  /** Maximum depth for directory scanning */
  MAX_DIRECTORY_DEPTH: 50,
  /** Maximum files per bundle */
  MAX_FILES_PER_BUNDLE: 100,
  /** Target bundle size (words) */
  TARGET_BUNDLE_SIZE: 50_000,
} as const;

/** Warning thresholds */
export const WARNING_THRESHOLDS = {
  /** Percentage of tier limit to show warning */
  TIER_USAGE_WARNING: 0.8,
  /** Percentage of tier limit to show critical warning */
  TIER_USAGE_CRITICAL: 0.95,
  /** Number of OCR files to trigger slow processing warning */
  OCR_FILES_WARNING: 10,
  /** Bundle depth to trigger deep nesting warning */
  DEEP_NESTING_DEPTH: 5,
} as const;
