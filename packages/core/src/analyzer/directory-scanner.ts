/**
 * Directory scanning interface and types
 * Platform-specific implementations in desktop/web packages
 */

import type { ScannedFile } from "../types/index.js";
import { GlobMatcher } from "../utils/index.js";
import { DEFAULT_IGNORE_PATTERNS, PROCESSING_LIMITS } from "../constants/index.js";

/**
 * Options for directory scanning
 */
export interface ScanOptions {
  /** Custom ignore patterns (added to defaults) */
  ignorePatterns?: string[];
  /** Whether to include default ignore patterns */
  includeDefaultIgnores?: boolean;
  /** Maximum directory depth to scan */
  maxDepth?: number;
  /** Whether to follow symlinks */
  followSymlinks?: boolean;
  /** Callback for progress updates */
  onProgress?: (scanned: number, currentPath: string) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result of directory scan
 */
export interface ScanResult {
  /** Root directory path */
  root: string;
  /** All scanned files (flat list) */
  files: ScannedFile[];
  /** File tree structure */
  tree: ScannedFile;
  /** Total files scanned */
  totalFiles: number;
  /** Total directories scanned */
  totalDirectories: number;
  /** Files that were ignored */
  ignoredCount: number;
  /** Scan duration in ms */
  duration: number;
}

/**
 * Abstract scanner interface - implemented by platform adapters
 */
export interface DirectoryScanner {
  /**
   * Scan a directory recursively
   */
  scan(path: string, options?: ScanOptions): Promise<ScanResult>;

  /**
   * Read file contents
   */
  readFile(path: string): Promise<Uint8Array>;

  /**
   * Check if path exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file stats
   */
  stat(path: string): Promise<{ size: number; modifiedAt: Date; isDirectory: boolean }>;
}

/**
 * Create a glob matcher for ignore patterns
 */
export function createIgnoreMatcher(options?: ScanOptions): GlobMatcher {
  const patterns: string[] = [];

  // Add default patterns if not disabled
  if (options?.includeDefaultIgnores !== false) {
    patterns.push(...DEFAULT_IGNORE_PATTERNS);
  }

  // Add custom patterns
  if (options?.ignorePatterns) {
    patterns.push(...options.ignorePatterns);
  }

  return new GlobMatcher(patterns);
}

/**
 * Get effective max depth
 */
export function getMaxDepth(options?: ScanOptions): number {
  return options?.maxDepth ?? PROCESSING_LIMITS.MAX_DIRECTORY_DEPTH;
}

/**
 * Check if scan should be aborted
 */
export function shouldAbort(options?: ScanOptions): boolean {
  return options?.signal?.aborted ?? false;
}

/**
 * Convert a flat file list to a tree structure
 */
export function buildFileTree(files: ScannedFile[], rootPath: string): ScannedFile {
  const root: ScannedFile = {
    path: rootPath,
    relativePath: "",
    name: rootPath.split(/[/\\]/).pop() || rootPath,
    extension: "",
    size: 0,
    modifiedAt: new Date(),
    isDirectory: true,
    children: [],
  };

  const pathMap = new Map<string, ScannedFile>();
  pathMap.set("", root);

  // Sort files by path depth to ensure parents are created first
  const sortedFiles = [...files].sort(
    (a, b) => a.relativePath.split("/").length - b.relativePath.split("/").length
  );

  for (const file of sortedFiles) {
    const parts = file.relativePath.split("/").filter(Boolean);
    let currentPath = "";
    let parent = root;

    // Create intermediate directories if needed
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let dir = pathMap.get(currentPath);
      if (!dir) {
        dir = {
          path: `${rootPath}/${currentPath}`,
          relativePath: currentPath,
          name: part,
          extension: "",
          size: 0,
          modifiedAt: new Date(),
          isDirectory: true,
          children: [],
        };
        pathMap.set(currentPath, dir);
        parent.children = parent.children || [];
        parent.children.push(dir);
      }
      parent = dir;
    }

    // Add the file to its parent
    parent.children = parent.children || [];
    parent.children.push(file);
    pathMap.set(file.relativePath, file);
  }

  return root;
}

/**
 * Flatten a file tree to a list
 */
export function flattenFileTree(tree: ScannedFile): ScannedFile[] {
  const files: ScannedFile[] = [];

  function traverse(node: ScannedFile): void {
    if (!node.isDirectory) {
      files.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(tree);
  return files;
}
