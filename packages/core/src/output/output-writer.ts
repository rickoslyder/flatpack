/**
 * Output writer interface
 * Platform-specific implementations in desktop/web packages
 */

import type {
  ProcessingPlan,
  FlatpackConfig,
  FailedFile,
} from "../types/index.js";
import { OUTPUT_FILES } from "../constants/index.js";

/**
 * Configuration for output writing
 */
export interface OutputConfig {
  /** Output directory path */
  outputPath: string;
  /** Whether to create ZIP instead of folder */
  createZip?: boolean;
  /** Whether to include manifest */
  includeManifest?: boolean;
  /** Whether to include structure file */
  includeStructure?: boolean;
  /** Whether to copy failed files */
  copyFailures?: boolean;
}

/**
 * File to write
 */
export interface OutputFile {
  /** Relative path in output */
  path: string;
  /** File content */
  content: string | Uint8Array;
  /** Whether content is binary */
  isBinary?: boolean;
}

/**
 * Progress callback
 */
export type OutputProgress = (
  written: number,
  total: number,
  currentFile: string
) => void;

/**
 * Abstract output writer interface - implemented by platform adapters
 */
export interface OutputWriter {
  /**
   * Write all output files
   */
  writeAll(
    files: OutputFile[],
    config: OutputConfig,
    onProgress?: OutputProgress
  ): Promise<void>;

  /**
   * Write a single file
   */
  writeFile(
    path: string,
    content: string | Uint8Array,
    outputPath: string
  ): Promise<void>;

  /**
   * Create output directory
   */
  createDirectory(path: string): Promise<void>;

  /**
   * Copy a file to output
   */
  copyFile(sourcePath: string, destPath: string): Promise<void>;

  /**
   * Create ZIP archive from files
   */
  createZip?(files: OutputFile[], outputPath: string): Promise<Uint8Array>;

  /**
   * Check if path exists
   */
  exists(path: string): Promise<boolean>;
}

/**
 * Prepare output files from processing results
 */
export function prepareOutputFiles(
  plan: ProcessingPlan,
  _config: FlatpackConfig,
  processedContents: Map<string, string>,
  failures: FailedFile[],
  manifestJson: string,
  structureContent: string,
  failuresReport: string
): OutputFile[] {
  const files: OutputFile[] = [];

  // Add processed files
  for (const planned of plan.files) {
    if (planned.action === "fail" || planned.action === "skip") continue;

    const content = processedContents.get(planned.source.relativePath);
    if (content) {
      files.push({
        path: planned.outputPath,
        content,
        isBinary: false,
      });
    }
  }

  // Add manifest
  files.push({
    path: OUTPUT_FILES.MANIFEST,
    content: manifestJson,
    isBinary: false,
  });

  // Add structure file
  files.push({
    path: OUTPUT_FILES.MASTER_STRUCTURE,
    content: structureContent,
    isBinary: false,
  });

  // Add failures report if there are failures
  if (failures.length > 0) {
    files.push({
      path: `${OUTPUT_FILES.FAILURES_FOLDER}/${OUTPUT_FILES.FAILURES_REPORT}`,
      content: failuresReport,
      isBinary: false,
    });
  }

  return files;
}

/**
 * Get output file names that will be created
 */
export function getOutputFileNames(
  plan: ProcessingPlan,
  includeManifest: boolean = true,
  includeStructure: boolean = true
): string[] {
  const names: string[] = [];

  // Processed files
  const seen = new Set<string>();
  for (const planned of plan.files) {
    if (planned.action === "fail" || planned.action === "skip") continue;
    if (!seen.has(planned.outputPath)) {
      names.push(planned.outputPath);
      seen.add(planned.outputPath);
    }
  }

  // Standard files
  if (includeManifest) {
    names.push(OUTPUT_FILES.MANIFEST);
  }
  if (includeStructure) {
    names.push(OUTPUT_FILES.MASTER_STRUCTURE);
  }

  // Failures
  if (plan.skipped.length > 0) {
    names.push(`${OUTPUT_FILES.FAILURES_FOLDER}/${OUTPUT_FILES.FAILURES_REPORT}`);
    for (const skipped of plan.skipped) {
      names.push(`${OUTPUT_FILES.FAILURES_FOLDER}/${skipped.source.name}`);
    }
  }

  return names;
}

/**
 * Validate output configuration
 */
export function validateOutputConfig(config: OutputConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.outputPath) {
    errors.push("Output path is required");
  }

  if (config.outputPath && config.outputPath.includes("..")) {
    errors.push("Output path cannot contain '..'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate output size in bytes
 */
export function estimateOutputSize(files: OutputFile[]): number {
  let total = 0;

  for (const file of files) {
    if (typeof file.content === "string") {
      total += file.content.length * 2; // UTF-16 estimation
    } else {
      total += file.content.byteLength;
    }
  }

  return total;
}
