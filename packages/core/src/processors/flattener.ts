/**
 * Path flattener
 * Converts directory paths to flat filenames
 */

import type { PathSeparator } from "../types/index.js";
import { PATH_SEPARATORS } from "../constants/index.js";
import {
  flattenPath,
  resolveCollision,
  getExtension,
  normalizePath,
} from "../utils/index.js";

/**
 * Options for path flattening
 */
export interface FlattenOptions {
  /** Path separator style */
  separator?: PathSeparator;
  /** Whether to preserve some directory structure */
  preserveDepth?: number;
  /** Maximum filename length */
  maxLength?: number;
  /** Output file extension (default: .md) */
  outputExtension?: string;
}

/**
 * Flatten a file path to a single filename
 */
export function flattenFilePath(
  relativePath: string,
  options?: FlattenOptions
): string {
  const separator = options?.separator || "underscore";
  const maxLength = options?.maxLength || 200;
  const outputExtension = options?.outputExtension || ".md";

  // Normalize the path
  const normalized = normalizePath(relativePath);

  // Flatten the path
  let flattened = flattenPath(normalized, separator);

  // Replace extension if needed
  const currentExt = getExtension(flattened);
  if (currentExt && currentExt !== "md") {
    const baseName = flattened.slice(0, -(currentExt.length + 1));
    flattened = baseName + outputExtension;
  } else if (!currentExt) {
    flattened = flattened + outputExtension;
  }

  // Truncate if too long
  if (flattened.length > maxLength) {
    const extLength = outputExtension.length;
    const maxBase = maxLength - extLength - 3; // Leave room for "..."
    flattened = flattened.slice(0, maxBase) + "..." + outputExtension;
  }

  return flattened;
}

/**
 * Result of batch flattening
 */
export interface FlattenResult {
  /** Original path to flattened name mapping */
  mapping: Map<string, string>;
  /** Collisions that were resolved */
  collisions: Array<{ original: string; resolved: string }>;
}

/**
 * Flatten multiple file paths, resolving collisions
 */
export function flattenPaths(
  paths: string[],
  options?: FlattenOptions
): FlattenResult {
  const mapping = new Map<string, string>();
  const collisions: Array<{ original: string; resolved: string }> = [];
  const usedNames = new Set<string>();

  for (const path of paths) {
    let flattened = flattenFilePath(path, options);

    // Check for collision
    if (usedNames.has(flattened.toLowerCase())) {
      const original = flattened;
      flattened = resolveCollision(
        flattened,
        usedNames,
        PATH_SEPARATORS[options?.separator || "underscore"]
      );
      collisions.push({ original, resolved: flattened });
    }

    usedNames.add(flattened.toLowerCase());
    mapping.set(path, flattened);
  }

  return { mapping, collisions };
}

/**
 * Generate chunk filenames for a split file
 */
export function generateChunkNames(
  baseName: string,
  chunkCount: number,
  options?: FlattenOptions
): string[] {
  const separator = PATH_SEPARATORS[options?.separator || "underscore"];
  const outputExtension = options?.outputExtension || ".md";

  // Get base without extension
  const ext = getExtension(baseName);
  const base = ext ? baseName.slice(0, -(ext.length + 1)) : baseName;

  // Generate names with padding for sorting
  const padLength = String(chunkCount).length;
  const names: string[] = [];

  for (let i = 1; i <= chunkCount; i++) {
    const partNum = String(i).padStart(padLength, "0");
    names.push(`${base}${separator}Part${partNum}${outputExtension}`);
  }

  return names;
}

/**
 * Generate bundle filename for merged files
 */
export function generateBundleName(
  folderPath: string,
  options?: FlattenOptions
): string {
  const separator = PATH_SEPARATORS[options?.separator || "underscore"];
  const outputExtension = options?.outputExtension || ".md";

  // Normalize and flatten the folder path
  const normalized = normalizePath(folderPath);
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 0) {
    return `bundle${outputExtension}`;
  }

  const name = parts.join(separator);
  return `${name}${separator}bundle${outputExtension}`;
}

/**
 * Check if a filename is valid for the target OS
 */
export function isValidFilename(filename: string): boolean {
  // Check for Windows forbidden characters
  if (/[<>:"/\\|?*]/.test(filename)) {
    return false;
  }

  // Check for reserved Windows names
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (reserved.test(filename)) {
    return false;
  }

  // Check for leading/trailing spaces or dots
  if (/^\s|\s$|^\.|\.$/g.test(filename)) {
    return false;
  }

  // Check length
  if (filename.length > 255) {
    return false;
  }

  return true;
}

/**
 * Sanitize a filename for cross-platform compatibility
 */
export function sanitizeFilename(filename: string): string {
  let sanitized = filename;

  // Replace forbidden characters
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, "_");

  // Collapse multiple underscores
  sanitized = sanitized.replace(/_+/g, "_");

  // Trim spaces and dots from ends
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");

  // Truncate if too long
  if (sanitized.length > 255) {
    const ext = getExtension(sanitized);
    if (ext) {
      sanitized = sanitized.slice(0, 250 - ext.length) + "." + ext;
    } else {
      sanitized = sanitized.slice(0, 255);
    }
  }

  return sanitized;
}
