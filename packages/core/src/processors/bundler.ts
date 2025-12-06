/**
 * File bundler
 * Merges multiple files into single bundles
 */

import type { AnalyzedFile } from "../types/index.js";
import { PROCESSING_LIMITS } from "../constants/index.js";
import { countWords, getDirectory } from "../utils/index.js";
import { generateBundleSectionHeader } from "./metadata-injector.js";

/**
 * Options for bundling
 */
export interface BundlingOptions {
  /** Maximum words per bundle */
  maxWords?: number;
  /** Target words per bundle (for optimization) */
  targetWords?: number;
  /** Maximum files per bundle */
  maxFiles?: number;
}

/**
 * A bundle of files to merge
 */
export interface BundleDefinition {
  /** Unique bundle ID */
  id: string;
  /** Bundle output filename */
  outputName: string;
  /** Folder path this bundle represents */
  folderPath: string;
  /** Files to include */
  files: BundleFile[];
  /** Total word count */
  totalWordCount: number;
  /** Folder depth (for prioritization) */
  depth: number;
}

/**
 * A file to include in a bundle
 */
export interface BundleFile {
  /** File to bundle */
  file: AnalyzedFile;
  /** Content to include (already converted) */
  content: string;
  /** Order in bundle */
  order: number;
}

/**
 * Result of bundling operation
 */
export interface BundleResult {
  /** Generated content */
  content: string;
  /** Total word count */
  wordCount: number;
  /** Files included */
  filesIncluded: number;
  /** Bundle metadata */
  bundle: BundleDefinition;
}

/**
 * Generate merged content from a bundle definition
 */
export function generateBundleContent(bundle: BundleDefinition): BundleResult {
  const parts: string[] = [];
  const total = bundle.files.length;

  // Sort files by order
  const sortedFiles = [...bundle.files].sort((a, b) => a.order - b.order);

  // Add bundle header
  parts.push(`# Bundle: ${bundle.folderPath || "Root"}\n`);
  parts.push(`This file contains ${total} merged files from the directory.\n`);
  parts.push(`---\n`);

  // Add each file's content with separator
  for (let i = 0; i < sortedFiles.length; i++) {
    const bundleFile = sortedFiles[i]!;
    const header = generateBundleSectionHeader(
      bundleFile.file.relativePath,
      i,
      total
    );
    parts.push(header);
    parts.push(bundleFile.content);
  }

  const content = parts.join("\n");
  const wordCount = countWords(content);

  return {
    content,
    wordCount,
    filesIncluded: total,
    bundle,
  };
}

/**
 * Create bundle definitions from analyzed files
 */
export function createBundles(
  files: AnalyzedFile[],
  getContent: (file: AnalyzedFile) => string,
  options?: BundlingOptions
): BundleDefinition[] {
  const maxWords = options?.maxWords || PROCESSING_LIMITS.CHUNK_THRESHOLD;
  const maxFiles = options?.maxFiles || PROCESSING_LIMITS.MAX_FILES_PER_BUNDLE;

  // Group files by directory
  const byDirectory = groupByDirectory(files);

  const bundles: BundleDefinition[] = [];

  for (const [dirPath, dirFiles] of byDirectory) {
    // Sort by name for consistent ordering
    dirFiles.sort((a, b) => a.name.localeCompare(b.name));

    // Check if we need multiple bundles for this directory
    let currentBundle: BundleFile[] = [];
    let currentWordCount = 0;
    let bundleIndex = 0;

    for (let i = 0; i < dirFiles.length; i++) {
      const file = dirFiles[i]!;
      const content = getContent(file);
      const fileWords = countWords(content);

      // Check if adding this file would exceed limits
      if (currentBundle.length >= maxFiles ||
          (currentWordCount + fileWords > maxWords && currentBundle.length > 0)) {
        // Save current bundle and start new one
        bundles.push(createBundleDefinition(
          dirPath,
          currentBundle,
          currentWordCount,
          bundleIndex
        ));
        bundleIndex++;
        currentBundle = [];
        currentWordCount = 0;
      }

      currentBundle.push({
        file,
        content,
        order: i,
      });
      currentWordCount += fileWords;
    }

    // Save final bundle
    if (currentBundle.length > 0) {
      bundles.push(createBundleDefinition(
        dirPath,
        currentBundle,
        currentWordCount,
        bundleIndex > 0 ? bundleIndex : undefined
      ));
    }
  }

  return bundles;
}

/**
 * Group files by directory
 */
function groupByDirectory(files: AnalyzedFile[]): Map<string, AnalyzedFile[]> {
  const groups = new Map<string, AnalyzedFile[]>();

  for (const file of files) {
    if (file.isDirectory) continue;

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
 * Create a bundle definition
 */
function createBundleDefinition(
  folderPath: string,
  files: BundleFile[],
  totalWordCount: number,
  index?: number
): BundleDefinition {
  const pathParts = folderPath.split("/").filter(Boolean);
  const depth = pathParts.length;

  // Generate bundle name
  let outputName: string;
  if (folderPath) {
    const folderName = pathParts.join("_");
    outputName = index !== undefined
      ? `${folderName}_bundle_${index + 1}.md`
      : `${folderName}_bundle.md`;
  } else {
    outputName = index !== undefined
      ? `root_bundle_${index + 1}.md`
      : "root_bundle.md";
  }

  return {
    id: `bundle-${folderPath || "root"}-${index ?? 0}`,
    outputName,
    folderPath,
    files,
    totalWordCount,
    depth,
  };
}

/**
 * Calculate bundling strategy for a set of files
 */
export interface BundlingStrategy {
  /** Files to keep as individual outputs */
  individual: AnalyzedFile[];
  /** Files to bundle */
  bundled: AnalyzedFile[];
  /** Estimated output file count */
  estimatedOutputCount: number;
}

/**
 * Determine which files should be bundled
 */
export function calculateBundlingStrategy(
  files: AnalyzedFile[],
  targetSourceCount: number,
  options?: BundlingOptions
): BundlingStrategy {
  const targetWords = options?.targetWords || PROCESSING_LIMITS.TARGET_BUNDLE_SIZE;

  // Sort files by depth (deepest first for merging)
  const sortedFiles = [...files]
    .filter((f) => !f.isDirectory)
    .sort((a, b) => {
      const depthA = a.relativePath.split("/").length;
      const depthB = b.relativePath.split("/").length;
      return depthB - depthA;
    });

  // If we're under the target, no bundling needed
  if (sortedFiles.length <= targetSourceCount) {
    return {
      individual: sortedFiles,
      bundled: [],
      estimatedOutputCount: sortedFiles.length,
    };
  }

  // Need to bundle - prioritize merging deepest folders first
  const individual: AnalyzedFile[] = [];
  const bundled: AnalyzedFile[] = [];

  // Keep important files individual (small word count or root level)
  for (const file of sortedFiles) {
    const depth = file.relativePath.split("/").length - 1;

    if (depth === 0 && file.wordCount < targetWords) {
      // Root level files stay individual
      individual.push(file);
    } else if (file.wordCount > targetWords * 2) {
      // Very large files stay individual (might be chunked)
      individual.push(file);
    } else {
      bundled.push(file);
    }
  }

  // Estimate how many bundles we'd create
  const bundleGroups = groupByDirectory(bundled);
  const estimatedBundles = bundleGroups.size;

  return {
    individual,
    bundled,
    estimatedOutputCount: individual.length + estimatedBundles,
  };
}

/**
 * Merge content from multiple files
 */
export function mergeContents(
  files: Array<{ path: string; content: string }>,
  title?: string
): string {
  const parts: string[] = [];

  if (title) {
    parts.push(`# ${title}\n`);
    parts.push(`---\n`);
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    parts.push(generateBundleSectionHeader(file.path, i, files.length));
    parts.push(file.content);
  }

  return parts.join("\n");
}
