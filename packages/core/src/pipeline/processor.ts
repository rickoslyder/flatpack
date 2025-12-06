/**
 * Main processing pipeline
 * Orchestrates all phases from scanning to output
 */

import type {
  AnalyzedFile,
  FlatpackConfig,
  ProcessingPlan,
  ProcessingResults,
} from "../types/index.js";
import type { ScanResult, DirectoryScanner } from "../analyzer/index.js";
import type { OutputWriter, OutputConfig } from "../output/index.js";
import { analyzeFiles } from "../analyzer/index.js";
import { generateProcessingPlan } from "../planner/index.js";
import { convert } from "../converters/index.js";
import { chunkContent, needsChunking } from "../processors/index.js";
import { injectMetadata } from "../processors/index.js";
import {
  generateManifest,
  serializeManifest,
  generateMasterStructure,
  generateFailuresReport,
  createFailedFileRecords,
  prepareOutputFiles,
} from "../output/index.js";
import { DEFAULT_CONFIG } from "../constants/index.js";

/**
 * Processing options
 */
export interface ProcessingOptions {
  /** Configuration */
  config?: Partial<FlatpackConfig>;
  /** Directory scanner implementation */
  scanner: DirectoryScanner;
  /** Output writer implementation */
  writer: OutputWriter;
  /** Output configuration */
  outputConfig: OutputConfig;
  /** Progress callbacks */
  onProgress?: ProcessingCallbacks;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Progress callbacks
 */
export interface ProcessingCallbacks {
  /** Called during scanning */
  onScan?: (scanned: number, current: string) => void;
  /** Called during analysis */
  onAnalyze?: (analyzed: number, total: number, current: string) => void;
  /** Called when plan is ready */
  onPlanReady?: (plan: ProcessingPlan) => void;
  /** Called during processing */
  onProcess?: (processed: number, total: number, current: string) => void;
  /** Called on error */
  onError?: (error: Error, file?: string) => void;
  /** Called when complete */
  onComplete?: (results: ProcessingResults) => void;
}

/**
 * Processing phase
 */
export type ProcessingPhase =
  | "idle"
  | "scanning"
  | "analyzing"
  | "planning"
  | "processing"
  | "writing"
  | "complete"
  | "error";

/**
 * Processing state
 */
export interface ProcessingState {
  phase: ProcessingPhase;
  progress: number;
  total: number;
  currentFile?: string;
  error?: Error;
  plan?: ProcessingPlan;
  results?: ProcessingResults;
}

/**
 * Process files from a directory or scan result
 */
export async function processFiles(
  input: string | ScanResult,
  options: ProcessingOptions
): Promise<ProcessingResults> {
  const config: FlatpackConfig = { ...DEFAULT_CONFIG, ...options.config };
  const startTime = new Date();
  const processedContents = new Map<string, string>();
  const errors = new Map<string, string>();

  try {
    // Phase 1: Scan (if input is a path)
    let scanResult: ScanResult;
    if (typeof input === "string") {
      options.onProgress?.onScan?.(0, "Starting scan...");
      scanResult = await options.scanner.scan(input, {
        ignorePatterns: config.ignorePatterns,
        onProgress: options.onProgress?.onScan,
      });
    } else {
      scanResult = input;
    }

    // Check for abort
    if (options.signal?.aborted) {
      throw new Error("Processing aborted");
    }

    // Phase 2: Analyze
    const analyzedFiles = await analyzeFiles(scanResult.files, {
      config,
      allFiles: scanResult.files,
      readFile: (path) => options.scanner.readFile(path),
      deepAnalysis: true,
      onProgress: options.onProgress?.onAnalyze,
    });

    // Check for abort
    if (options.signal?.aborted) {
      throw new Error("Processing aborted");
    }

    // Phase 3: Plan
    const plan = generateProcessingPlan(analyzedFiles, config);
    options.onProgress?.onPlanReady?.(plan);

    // Check for abort
    if (options.signal?.aborted) {
      throw new Error("Processing aborted");
    }

    // Phase 4: Process
    const total = plan.files.filter(
      (f) => f.action !== "fail" && f.action !== "skip" && f.action !== "merge"
    ).length;
    let processed = 0;

    for (const planned of plan.files) {
      if (planned.action === "fail" || planned.action === "skip") continue;
      if (planned.action === "merge") continue; // Handled with bundle

      // Check for abort
      if (options.signal?.aborted) {
        throw new Error("Processing aborted");
      }

      try {
        const content = await processFile(planned.source, config, options.scanner);
        processedContents.set(planned.source.relativePath, content);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.set(planned.source.relativePath, message);
        options.onProgress?.onError?.(
          error instanceof Error ? error : new Error(message),
          planned.source.relativePath
        );
      }

      processed++;
      options.onProgress?.onProcess?.(processed, total, planned.source.relativePath);
    }

    // Process bundles
    for (const bundle of plan.bundles) {
      try {
        const bundleContent = await processBundleFiles(
          bundle.files.map((f) => f.source),
          config,
          options.scanner
        );
        processedContents.set(bundle.id, bundleContent);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.set(bundle.id, message);
      }
    }

    // Phase 5: Generate outputs
    const failures = createFailedFileRecords(plan, errors);
    const manifest = generateManifest(plan, config, {
      inputName: typeof input === "string" ? input : scanResult.root,
      startTime,
      endTime: new Date(),
    });
    const manifestJson = serializeManifest(manifest);
    const structureContent = generateMasterStructure(plan, config, manifest);
    const failuresReport = generateFailuresReport(failures, plan);

    // Phase 6: Write outputs
    const outputFiles = prepareOutputFiles(
      plan,
      config,
      processedContents,
      failures,
      manifestJson,
      structureContent,
      failuresReport
    );

    await options.writer.writeAll(
      outputFiles,
      options.outputConfig,
      options.onProgress?.onProcess
    );

    // Complete
    const results: ProcessingResults = {
      success: errors.size === 0,
      outputPath: options.outputConfig.outputPath,
      manifest,
      failures,
      duration: Date.now() - startTime.getTime(),
    };

    options.onProgress?.onComplete?.(results);

    return results;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    options.onProgress?.onError?.(err);
    throw err;
  }
}

/**
 * Process a single file
 */
async function processFile(
  file: AnalyzedFile,
  _config: FlatpackConfig,
  scanner: DirectoryScanner
): Promise<string> {
  // Read file content
  const rawContent = await scanner.readFile(file.path);

  // Convert to markdown
  const result = await convert(rawContent, file.name, {
    preserveFormatting: true,
  });

  if (!result.success) {
    throw new Error(result.error || "Conversion failed");
  }

  let content = result.content;

  // Chunk if needed
  if (needsChunking(content)) {
    const chunks = chunkContent(content);
    // For now, just return the first chunk with a note
    // Full chunking would create multiple output files
    content = chunks.chunks[0]?.content || content;
    if (chunks.totalParts > 1) {
      content = `> Note: This file was split into ${chunks.totalParts} parts.\n\n${content}`;
    }
  }

  // Inject metadata
  content = injectMetadata(content, {
    originalPath: file.relativePath,
    originalName: file.name,
    action: file.tier === "passthrough" ? "keep" : "convert",
    relatedFiles: file.relatedFiles,
    wordCount: result.wordCount,
    processedAt: new Date(),
  });

  return content;
}

/**
 * Process bundle files into merged content
 */
async function processBundleFiles(
  files: AnalyzedFile[],
  _config: FlatpackConfig,
  scanner: DirectoryScanner
): Promise<string> {
  const parts: string[] = [];
  const total = files.length;

  parts.push("# Bundled Files\n");
  parts.push(`This file contains ${total} merged files.\n`);
  parts.push("---\n");

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;

    parts.push(`\n## File ${i + 1}/${total}: ${file.relativePath}\n\n`);

    try {
      const content = await processFile(file, _config, scanner);
      parts.push(content);
    } catch (error) {
      parts.push(`*Error processing file: ${error instanceof Error ? error.message : "Unknown error"}*\n`);
    }
  }

  return parts.join("\n");
}

/**
 * Validate processing options
 */
export function validateOptions(options: ProcessingOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options.scanner) {
    errors.push("Scanner is required");
  }

  if (!options.writer) {
    errors.push("Writer is required");
  }

  if (!options.outputConfig?.outputPath) {
    errors.push("Output path is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
