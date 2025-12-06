/**
 * Manifest and output types
 */

import type { FileAction } from "./file-tree.js";
import type { NotebookTier } from "./config.js";

/** Entry in the flatpack manifest */
export interface ManifestFileEntry {
  /** Original relative path */
  originalPath: string;
  /** Original filename */
  originalName: string;
  /** Processed output filename */
  outputName: string;
  /** Action taken */
  action: FileAction;
  /** Word count of output */
  wordCount: number;
  /** File size of output in bytes */
  outputSize: number;
  /** If chunked, part number */
  partNumber?: number;
  /** If chunked, total parts */
  totalParts?: number;
  /** If merged, source files */
  mergedFrom?: string[];
  /** Processing warnings */
  warnings?: string[];
  /** Processing error if failed */
  error?: string;
}

/** Complete flatpack manifest */
export interface FlatpackManifest {
  /** Manifest version */
  version: string;
  /** Processing timestamp */
  processedAt: string;
  /** Input folder/ZIP name */
  inputName: string;
  /** Tier used for processing */
  tier: NotebookTier;
  /** Settings used */
  settings: ManifestSettings;
  /** All processed files */
  files: ManifestFileEntry[];
  /** Summary statistics */
  summary: ManifestSummary;
}

/** Settings recorded in manifest */
export interface ManifestSettings {
  pathSeparator: string;
  pdfHandling: string;
  ignorePatterns: string[];
  softWarningThreshold: number;
}

/** Summary statistics in manifest */
export interface ManifestSummary {
  /** Total input files */
  totalInputFiles: number;
  /** Total output files */
  totalOutputFiles: number;
  /** Total word count */
  totalWordCount: number;
  /** Files passed through */
  passedThrough: number;
  /** Files converted */
  converted: number;
  /** Files chunked */
  chunked: number;
  /** Files merged */
  merged: number;
  /** Files OCR'd */
  ocrd: number;
  /** Files failed */
  failed: number;
  /** Processing duration in ms */
  processingDuration: number;
}

/** Failed file record */
export interface FailedFile {
  /** Original path */
  originalPath: string;
  /** Failure reason */
  reason: string;
  /** Error code */
  errorCode: string;
  /** Whether file was copied to failures folder */
  copied: boolean;
}

/** Processing results */
export interface ProcessingResults {
  /** Whether processing completed successfully */
  success: boolean;
  /** Output folder path */
  outputPath: string;
  /** Generated manifest */
  manifest: FlatpackManifest;
  /** Failed files */
  failures: FailedFile[];
  /** Total processing time in ms */
  duration: number;
}
