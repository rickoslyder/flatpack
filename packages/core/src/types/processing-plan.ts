/**
 * Processing plan types
 */

import type { AnalyzedFile, FileAction } from "./file-tree.js";

/** Planned file for processing */
export interface PlannedFile {
  /** Source analyzed file */
  source: AnalyzedFile;
  /** Planned action */
  action: FileAction;
  /** Target output filename (after flattening) */
  outputName: string;
  /** Target output path */
  outputPath: string;
  /** If chunking, how many parts */
  chunkCount?: number;
  /** If merging, which bundle this belongs to */
  bundleId?: string;
  /** Priority in processing order */
  priority: number;
  /** Estimated processing time in ms */
  estimatedTime?: number;
  /** User override applied */
  userOverride?: boolean;
}

/** Bundle of files to be merged */
export interface Bundle {
  /** Unique bundle identifier */
  id: string;
  /** Bundle output filename */
  outputName: string;
  /** Files included in this bundle */
  files: PlannedFile[];
  /** Total word count of bundle */
  totalWordCount: number;
  /** Folder path this bundle represents */
  folderPath: string;
  /** Depth of folder (for prioritization) */
  depth: number;
}

/** Complete processing plan */
export interface ProcessingPlan {
  /** All files to process (including bundles as individual entries) */
  files: PlannedFile[];
  /** Bundles to create */
  bundles: Bundle[];
  /** Files that will be skipped/failed */
  skipped: PlannedFile[];
  /** Summary statistics */
  summary: ProcessingSummary;
  /** All warnings from planning */
  warnings: PlanningWarning[];
  /** Plan generation timestamp */
  createdAt: Date;
}

/** Processing plan summary statistics */
export interface ProcessingSummary {
  /** Total input files analyzed */
  totalInputFiles: number;
  /** Total output files (after bundling/chunking) */
  totalOutputFiles: number;
  /** Estimated total word count */
  totalWordCount: number;
  /** Files by action */
  byAction: Record<FileAction, number>;
  /** Whether plan exceeds tier limits */
  exceedsTierLimits: boolean;
  /** Percentage of tier source limit used */
  tierUsagePercent: number;
  /** Files requiring OCR */
  ocrFileCount: number;
  /** Estimated total processing time */
  estimatedTotalTime: number;
}

/** Warning from planning phase */
export interface PlanningWarning {
  /** Warning code */
  code: PlanningWarningCode;
  /** Warning message */
  message: string;
  /** Affected file paths */
  affectedFiles?: string[];
  /** Suggested resolution */
  suggestion?: string;
}

/** Planning warning codes */
export type PlanningWarningCode =
  | "exceeds_source_limit"
  | "exceeds_word_limit"
  | "naming_collision"
  | "deep_nesting"
  | "many_ocr_files"
  | "large_bundle";
