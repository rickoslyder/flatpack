/**
 * Bundling strategy
 * Determines which files to bundle based on folder depth and size
 */

import type { AnalyzedFile } from "../types/index.js";
import { PROCESSING_LIMITS, WARNING_THRESHOLDS } from "../constants/index.js";
import { getDirectory, getPathDepth } from "../utils/index.js";

/**
 * A candidate folder for bundling
 */
export interface BundleCandidate {
  /** Folder path */
  path: string;
  /** Folder depth (0 = root) */
  depth: number;
  /** Files in this folder */
  files: AnalyzedFile[];
  /** Total word count */
  totalWords: number;
  /** Priority score (higher = bundle first) */
  priority: number;
}

/**
 * Result of bundling calculation
 */
export interface BundlingPlan {
  /** Folders to bundle */
  foldersToBundle: BundleCandidate[];
  /** Files that remain individual */
  individualFiles: AnalyzedFile[];
  /** Estimated output source count after bundling */
  estimatedSourceCount: number;
  /** Source reduction from bundling */
  sourceReduction: number;
}

/**
 * Calculate which folders to bundle
 */
export function calculateBundles(
  files: AnalyzedFile[],
  targetSourceCount: number,
  options?: {
    maxWordsPerBundle?: number;
    minFilesForBundle?: number;
  }
): BundlingPlan {
  const maxWords = options?.maxWordsPerBundle || PROCESSING_LIMITS.CHUNK_THRESHOLD;
  const minFiles = options?.minFilesForBundle || 2;

  // Get processable files only
  const processableFiles = files.filter(
    (f) => !f.isDirectory && f.tier !== "unsupported"
  );

  // Group files by directory
  const folders = groupByFolder(processableFiles);

  // Calculate priority for each folder
  const candidates: BundleCandidate[] = [];
  for (const [path, folderFiles] of folders) {
    const depth = getPathDepth(path + "/dummy");
    const totalWords = folderFiles.reduce((sum, f) => sum + f.wordCount, 0);

    // Priority: deeper folders with more files get bundled first
    const priority = calculatePriority(depth, folderFiles.length, totalWords);

    candidates.push({
      path,
      depth,
      files: folderFiles,
      totalWords,
      priority,
    });
  }

  // Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority);

  // Determine how many sources we need to reduce
  const currentSourceCount = processableFiles.length;
  const reductionNeeded = currentSourceCount - targetSourceCount;

  if (reductionNeeded <= 0) {
    // No bundling needed
    return {
      foldersToBundle: [],
      individualFiles: processableFiles,
      estimatedSourceCount: currentSourceCount,
      sourceReduction: 0,
    };
  }

  // Select folders to bundle until we reach target
  const foldersToBundle: BundleCandidate[] = [];
  const bundledFilePaths = new Set<string>();
  let reduction = 0;

  for (const candidate of candidates) {
    // Skip folders with too few files
    if (candidate.files.length < minFiles) continue;

    // Skip if bundling would create an oversized bundle
    if (candidate.totalWords > maxWords) {
      // Could still bundle but would need to split
      // For now, skip very large folders
      if (candidate.totalWords > maxWords * 2) continue;
    }

    // Add to bundling plan
    foldersToBundle.push(candidate);

    // Mark files as bundled
    for (const file of candidate.files) {
      bundledFilePaths.add(file.relativePath);
    }

    // Calculate reduction (N files become 1 bundle)
    reduction += candidate.files.length - 1;

    // Check if we've reduced enough
    if (reduction >= reductionNeeded) break;
  }

  // Remaining files stay individual
  const individualFiles = processableFiles.filter(
    (f) => !bundledFilePaths.has(f.relativePath)
  );

  const estimatedSourceCount = individualFiles.length + foldersToBundle.length;

  return {
    foldersToBundle,
    individualFiles,
    estimatedSourceCount,
    sourceReduction: reduction,
  };
}

/**
 * Group files by parent directory
 */
function groupByFolder(files: AnalyzedFile[]): Map<string, AnalyzedFile[]> {
  const groups = new Map<string, AnalyzedFile[]>();

  for (const file of files) {
    const dir = getDirectory(file.relativePath);
    const existing = groups.get(dir);

    if (existing) {
      existing.push(file);
    } else {
      groups.set(dir, [file]);
    }
  }

  return groups;
}

/**
 * Calculate bundling priority for a folder
 */
function calculatePriority(
  depth: number,
  fileCount: number,
  totalWords: number
): number {
  // Deeper folders are prioritized (they're often supporting material)
  const depthScore = depth * 100;

  // More files = higher priority (more reduction potential)
  const fileScore = Math.min(fileCount, 20) * 10;

  // Smaller folders are easier to bundle
  const sizeScore = totalWords < 50000 ? 50 : totalWords < 100000 ? 30 : 10;

  return depthScore + fileScore + sizeScore;
}

/**
 * Optimize bundling plan for minimum bundles
 */
export function optimizeBundlingPlan(
  plan: BundlingPlan,
  maxWordsPerBundle: number
): BundlingPlan {
  // Try to merge small bundles together if they're at similar depths
  const optimizedBundles: BundleCandidate[] = [];

  // Group by parent folder
  const byParent = new Map<string, BundleCandidate[]>();
  for (const bundle of plan.foldersToBundle) {
    const parent = getDirectory(bundle.path);
    const existing = byParent.get(parent);
    if (existing) {
      existing.push(bundle);
    } else {
      byParent.set(parent, [bundle]);
    }
  }

  // Merge siblings if they fit
  for (const [parent, siblings] of byParent) {
    let current: BundleCandidate | null = null;

    for (const bundle of siblings) {
      if (!current) {
        current = { ...bundle, files: [...bundle.files] };
        continue;
      }

      // Check if we can merge
      if (current.totalWords + bundle.totalWords <= maxWordsPerBundle) {
        current.files.push(...bundle.files);
        current.totalWords += bundle.totalWords;
        current.path = parent || "root";
      } else {
        optimizedBundles.push(current);
        current = { ...bundle, files: [...bundle.files] };
      }
    }

    if (current) {
      optimizedBundles.push(current);
    }
  }

  // Recalculate metrics
  const bundledFilePaths = new Set<string>();
  for (const bundle of optimizedBundles) {
    for (const file of bundle.files) {
      bundledFilePaths.add(file.relativePath);
    }
  }

  const allFiles = [
    ...plan.individualFiles,
    ...plan.foldersToBundle.flatMap((b) => b.files),
  ];
  const individualFiles = allFiles.filter(
    (f) => !bundledFilePaths.has(f.relativePath)
  );

  const totalOriginalFiles = individualFiles.length +
    optimizedBundles.reduce((sum, b) => sum + b.files.length, 0);
  const estimatedSourceCount = individualFiles.length + optimizedBundles.length;

  return {
    foldersToBundle: optimizedBundles,
    individualFiles,
    estimatedSourceCount,
    sourceReduction: totalOriginalFiles - estimatedSourceCount,
  };
}

/**
 * Check if a bundling plan has deep nesting warnings
 */
export function hasDeepNestingWarning(plan: BundlingPlan): boolean {
  return plan.foldersToBundle.some(
    (b) => b.depth >= WARNING_THRESHOLDS.DEEP_NESTING_DEPTH
  );
}
