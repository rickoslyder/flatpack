/**
 * Manifest generator
 * Creates FLATPACK_MANIFEST.json with file mapping and statistics
 */

import type {
  FlatpackManifest,
  ManifestFileEntry,
  ManifestSummary,
  ManifestSettings,
  ProcessingPlan,
  FlatpackConfig,
} from "../types/index.js";
import { MANIFEST_VERSION } from "../constants/index.js";

/**
 * Options for manifest generation
 */
export interface ManifestOptions {
  /** Input folder/ZIP name */
  inputName: string;
  /** Processing start time */
  startTime: Date;
  /** Processing end time */
  endTime?: Date;
}

/**
 * Generate the manifest from a processing plan and results
 */
export function generateManifest(
  plan: ProcessingPlan,
  config: FlatpackConfig,
  options: ManifestOptions,
  results?: Map<string, FileResult>
): FlatpackManifest {
  const entries: ManifestFileEntry[] = [];
  const processedAt = options.endTime || new Date();
  const duration = processedAt.getTime() - options.startTime.getTime();

  // Process each planned file
  for (const planned of plan.files) {
    const result = results?.get(planned.source.relativePath);

    const entry: ManifestFileEntry = {
      originalPath: planned.source.relativePath,
      originalName: planned.source.name,
      outputName: planned.outputName,
      action: planned.action,
      wordCount: result?.wordCount ?? planned.source.wordCount,
      outputSize: result?.outputSize ?? 0,
    };

    // Add chunking info
    if (planned.chunkCount && planned.chunkCount > 1) {
      entry.totalParts = planned.chunkCount;
      entry.partNumber = 1; // First part
    }

    // Add bundle info
    if (planned.bundleId) {
      const bundle = plan.bundles.find((b) => b.id === planned.bundleId);
      if (bundle) {
        entry.mergedFrom = bundle.files.map((f) => f.source.relativePath);
      }
    }

    // Add warnings
    if (planned.source.warnings.length > 0) {
      entry.warnings = planned.source.warnings.map((w) => w.message);
    }

    // Add error
    if (result?.error) {
      entry.error = result.error;
    }

    entries.push(entry);
  }

  // Add skipped/failed files
  for (const skipped of plan.skipped) {
    entries.push({
      originalPath: skipped.source.relativePath,
      originalName: skipped.source.name,
      outputName: skipped.outputName,
      action: "fail",
      wordCount: 0,
      outputSize: 0,
      error: skipped.source.warnings[0]?.message || "Unsupported format",
    });
  }

  // Generate settings
  const settings: ManifestSettings = {
    pathSeparator: config.pathSeparator,
    pdfHandling: config.pdfHandling,
    ignorePatterns: config.ignorePatterns,
    softWarningThreshold: config.softWarningThreshold,
  };

  // Calculate summary
  const summary = calculateManifestSummary(entries, duration);

  return {
    version: MANIFEST_VERSION,
    processedAt: processedAt.toISOString(),
    inputName: options.inputName,
    tier: config.tier,
    settings,
    files: entries,
    summary,
  };
}

/**
 * Result of processing a single file
 */
export interface FileResult {
  success: boolean;
  wordCount: number;
  outputSize: number;
  error?: string;
}

/**
 * Calculate manifest summary from entries
 */
function calculateManifestSummary(
  entries: ManifestFileEntry[],
  duration: number
): ManifestSummary {
  let totalInputFiles = 0;
  let totalOutputFiles = 0;
  let totalWordCount = 0;
  let passedThrough = 0;
  let converted = 0;
  let chunked = 0;
  let merged = 0;
  let ocrd = 0;
  let failed = 0;

  const outputNames = new Set<string>();

  for (const entry of entries) {
    totalInputFiles++;
    totalWordCount += entry.wordCount;

    if (!outputNames.has(entry.outputName)) {
      outputNames.add(entry.outputName);
      totalOutputFiles++;
    }

    switch (entry.action) {
      case "keep":
        passedThrough++;
        break;
      case "convert":
        converted++;
        break;
      case "chunk":
        chunked++;
        if (entry.totalParts) {
          totalOutputFiles += entry.totalParts - 1;
        }
        break;
      case "merge":
        merged++;
        break;
      case "ocr":
        ocrd++;
        break;
      case "fail":
      case "skip":
        failed++;
        break;
    }
  }

  return {
    totalInputFiles,
    totalOutputFiles,
    totalWordCount,
    passedThrough,
    converted,
    chunked,
    merged,
    ocrd,
    failed,
    processingDuration: duration,
  };
}

/**
 * Serialize manifest to JSON
 */
export function serializeManifest(manifest: FlatpackManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Parse manifest from JSON
 */
export function parseManifest(json: string): FlatpackManifest {
  const parsed = JSON.parse(json) as FlatpackManifest;

  // Validate version
  if (!parsed.version) {
    throw new Error("Invalid manifest: missing version");
  }

  return parsed;
}

/**
 * Get files that failed from manifest
 */
export function getFailedFiles(manifest: FlatpackManifest): ManifestFileEntry[] {
  return manifest.files.filter(
    (f) => f.action === "fail" || f.action === "skip" || f.error
  );
}

/**
 * Get processing statistics from manifest
 */
export function getStatistics(manifest: FlatpackManifest): {
  successRate: number;
  averageWordCount: number;
  compressionRatio: number;
} {
  const successful = manifest.files.filter((f) => !f.error).length;
  const total = manifest.files.length;

  return {
    successRate: total > 0 ? (successful / total) * 100 : 0,
    averageWordCount:
      total > 0 ? manifest.summary.totalWordCount / total : 0,
    compressionRatio:
      manifest.summary.totalInputFiles > 0
        ? manifest.summary.totalOutputFiles / manifest.summary.totalInputFiles
        : 1,
  };
}
