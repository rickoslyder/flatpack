/**
 * Preview generator
 * Generates complete processing plan for user preview
 */

import type {
  AnalyzedFile,
  FlatpackConfig,
  ProcessingPlan,
  PlannedFile,
  Bundle,
  ProcessingSummary,
  PlanningWarning,
  FileAction,
} from "../types/index.js";
import { TIER_LIMITS, PROCESSING_LIMITS } from "../constants/index.js";
import { flattenFilePath, estimateChunkCount } from "../processors/index.js";
import { analyzeTierFit } from "./tier-optimizer.js";
import { calculateBundles, optimizeBundlingPlan } from "./bundling-strategy.js";
import { resolveNamingCollisions } from "./naming-resolver.js";

/**
 * Options for plan generation
 */
export interface PlanOptions {
  /** Override tier analysis */
  forceBundling?: boolean;
  /** Custom output extension */
  outputExtension?: string;
}

/**
 * Generate a complete processing plan
 */
export function generateProcessingPlan(
  files: AnalyzedFile[],
  config: FlatpackConfig,
  options?: PlanOptions
): ProcessingPlan {
  const warnings: PlanningWarning[] = [];

  // Analyze tier fit
  const tierAnalysis = analyzeTierFit(files, config);

  // Add tier warnings
  for (const warning of tierAnalysis.warnings) {
    warnings.push({
      code: warning.code as PlanningWarning["code"],
      message: warning.message,
    });
  }

  // Get processable files
  const processableFiles = files.filter(
    (f) => !f.isDirectory && f.tier !== "unsupported"
  );
  const unsupportedFiles = files.filter(
    (f) => !f.isDirectory && f.tier === "unsupported"
  );

  // Determine bundling plan if needed
  let bundlingPlan = null;
  if (tierAnalysis.needsBundling || options?.forceBundling) {
    const targetCount = TIER_LIMITS[config.tier].maxSources;
    bundlingPlan = calculateBundles(processableFiles, targetCount);
    bundlingPlan = optimizeBundlingPlan(
      bundlingPlan,
      PROCESSING_LIMITS.CHUNK_THRESHOLD
    );
  }

  // Build planned files list
  const plannedFiles: PlannedFile[] = [];
  const bundles: Bundle[] = [];
  const skipped: PlannedFile[] = [];

  // Track names for collision detection
  const proposedNames = new Map<string, string>();

  // Process individual files (not bundled)
  const individualFiles = bundlingPlan
    ? bundlingPlan.individualFiles
    : processableFiles;

  for (const file of individualFiles) {
    const action = determineAction(file, config);
    const outputName = flattenFilePath(file.relativePath, {
      separator: config.pathSeparator,
      outputExtension: options?.outputExtension || ".md",
    });

    proposedNames.set(file.relativePath, outputName);

    const chunkCount =
      action === "chunk"
        ? estimateChunkCount(file.wordCount, PROCESSING_LIMITS.CHUNK_THRESHOLD)
        : undefined;

    plannedFiles.push({
      source: file,
      action,
      outputName,
      outputPath: outputName,
      chunkCount,
      priority: calculatePriority(file, action),
    });
  }

  // Process bundles
  if (bundlingPlan) {
    for (const bundleCandidate of bundlingPlan.foldersToBundle) {
      const bundleId = `bundle-${bundleCandidate.path || "root"}`;
      const outputName = bundleCandidate.path
        ? `${bundleCandidate.path.replace(/\//g, "_")}_bundle.md`
        : "root_bundle.md";

      proposedNames.set(bundleId, outputName);

      const bundle: Bundle = {
        id: bundleId,
        outputName,
        files: [],
        totalWordCount: bundleCandidate.totalWords,
        folderPath: bundleCandidate.path,
        depth: bundleCandidate.depth,
      };

      // Add files to bundle
      for (const file of bundleCandidate.files) {
        const filePlan: PlannedFile = {
          source: file,
          action: "merge",
          outputName,
          outputPath: outputName,
          bundleId,
          priority: 0,
        };
        bundle.files.push(filePlan);
        plannedFiles.push(filePlan);
      }

      bundles.push(bundle);
    }
  }

  // Process unsupported files
  for (const file of unsupportedFiles) {
    skipped.push({
      source: file,
      action: "fail",
      outputName: file.name,
      outputPath: `_failures/${file.name}`,
      priority: 0,
    });
  }

  // Resolve naming collisions
  const namingResult = resolveNamingCollisions(proposedNames, config.pathSeparator);

  // Apply resolved names
  for (const planned of plannedFiles) {
    if (planned.action !== "merge") {
      const resolved = namingResult.nameMapping.get(planned.source.relativePath);
      if (resolved) {
        planned.outputName = resolved;
        planned.outputPath = resolved;
      }
    }
  }

  // Apply to bundles
  for (const bundle of bundles) {
    const resolved = namingResult.nameMapping.get(bundle.id);
    if (resolved) {
      bundle.outputName = resolved;
      for (const filePlan of bundle.files) {
        filePlan.outputName = resolved;
        filePlan.outputPath = resolved;
      }
    }
  }

  // Add collision warnings
  for (const collision of namingResult.collisions) {
    warnings.push({
      code: "naming_collision",
      message: `Resolved naming collision for "${collision.originalName}"`,
      affectedFiles: collision.collidingPaths,
    });
  }

  // Calculate summary
  const summary = calculateSummary(plannedFiles, bundles, skipped, config);

  return {
    files: plannedFiles,
    bundles,
    skipped,
    summary,
    warnings,
    createdAt: new Date(),
  };
}

/**
 * Determine the action for a file
 */
function determineAction(file: AnalyzedFile, config: FlatpackConfig): FileAction {
  // Check for unsupported
  if (file.tier === "unsupported") {
    return "fail";
  }

  // Check if needs OCR
  if (file.requiresOcr) {
    return "ocr";
  }

  // Check if needs chunking
  const maxWords = TIER_LIMITS[config.tier].maxWordsPerSource;
  if (file.wordCount > maxWords) {
    return "chunk";
  }

  // Check tier
  if (file.tier === "passthrough") {
    return "keep";
  }

  if (file.tier === "conversion") {
    return "convert";
  }

  return "keep";
}

/**
 * Calculate processing priority
 */
function calculatePriority(file: AnalyzedFile, action: FileAction): number {
  // Higher priority = processed first
  let priority = 50;

  // OCR files are lower priority (slower)
  if (action === "ocr") priority -= 20;

  // Large files are lower priority
  if (file.wordCount > 100000) priority -= 10;

  // Root level files are higher priority
  const depth = file.relativePath.split("/").length - 1;
  priority += Math.max(0, 10 - depth);

  return priority;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  files: PlannedFile[],
  bundles: Bundle[],
  skipped: PlannedFile[],
  config: FlatpackConfig
): ProcessingSummary {
  const byAction: Record<FileAction, number> = {
    keep: 0,
    convert: 0,
    chunk: 0,
    merge: 0,
    ocr: 0,
    skip: 0,
    fail: 0,
  };

  let totalWordCount = 0;
  let ocrFileCount = 0;
  let estimatedTotalTime = 0;

  for (const file of files) {
    byAction[file.action] = (byAction[file.action] || 0) + 1;
    totalWordCount += file.source.wordCount;

    if (file.action === "ocr") {
      ocrFileCount++;
      estimatedTotalTime += 30000; // 30s per OCR file estimate
    } else {
      estimatedTotalTime += 100; // 100ms per regular file
    }
  }

  for (const _file of skipped) {
    byAction.fail++;
  }

  // Calculate output file count
  const individualOutputs = files.filter((f) => f.action !== "merge").length;
  const bundleOutputs = bundles.length;
  const chunkExpansion = files
    .filter((f) => f.action === "chunk")
    .reduce((sum, f) => sum + (f.chunkCount || 1) - 1, 0);

  const totalOutputFiles = individualOutputs + bundleOutputs + chunkExpansion;

  const tierLimits = TIER_LIMITS[config.tier];
  const tierUsagePercent = (totalOutputFiles / tierLimits.maxSources) * 100;

  return {
    totalInputFiles: files.length + skipped.length,
    totalOutputFiles,
    totalWordCount,
    byAction,
    exceedsTierLimits: totalOutputFiles > tierLimits.maxSources,
    tierUsagePercent,
    ocrFileCount,
    estimatedTotalTime,
  };
}

/**
 * Validate a processing plan
 */
export function validatePlan(plan: ProcessingPlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for empty plan
  if (plan.files.length === 0) {
    errors.push("Processing plan has no files");
  }

  // Check for duplicate output names
  const outputNames = new Set<string>();
  for (const file of plan.files) {
    if (file.action === "merge") continue; // Bundled files share names
    if (outputNames.has(file.outputName.toLowerCase())) {
      errors.push(`Duplicate output name: ${file.outputName}`);
    }
    outputNames.add(file.outputName.toLowerCase());
  }

  // Check bundles
  for (const bundle of plan.bundles) {
    if (bundle.files.length === 0) {
      errors.push(`Empty bundle: ${bundle.id}`);
    }
    if (outputNames.has(bundle.outputName.toLowerCase())) {
      errors.push(`Bundle name conflicts: ${bundle.outputName}`);
    }
    outputNames.add(bundle.outputName.toLowerCase());
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
