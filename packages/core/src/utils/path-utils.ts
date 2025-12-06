/**
 * Path manipulation utilities
 */

import { PATH_SEPARATORS } from "../constants/index.js";
import type { PathSeparator } from "../types/index.js";

/**
 * Flatten a path into a single filename by replacing separators
 * e.g., "folder/sub/file.txt" -> "folder_sub_file.txt"
 */
export function flattenPath(
  relativePath: string,
  separator: PathSeparator = "underscore"
): string {
  const sep = PATH_SEPARATORS[separator];

  // Normalize path separators to forward slash
  const normalized = relativePath.replace(/\\/g, "/");

  // Split into parts, filter empty, rejoin with separator
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  // Get the filename (last part)
  const filename = parts.pop()!;

  // Get the extension
  const lastDotIndex = filename.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0;
  const baseName = hasExtension ? filename.slice(0, lastDotIndex) : filename;
  const extension = hasExtension ? filename.slice(lastDotIndex) : "";

  // Build flattened name
  if (parts.length === 0) {
    return filename;
  }

  const flattenedParts = [...parts, baseName].map((part) => sanitizePathPart(part, sep));
  return flattenedParts.join(sep) + extension;
}

/**
 * Sanitize a path part for use in flattened filename
 */
export function sanitizePathPart(part: string, separator: string): string {
  // Replace problematic characters with separator
  let sanitized = part
    .replace(/[<>:"/\\|?*]/g, separator) // Windows forbidden chars
    .replace(/\s+/g, separator) // Whitespace
    .replace(/\.+/g, separator); // Dots (except extension)

  // Collapse multiple separators
  const sepRegex = new RegExp(`[${escapeRegex(separator)}]+`, "g");
  sanitized = sanitized.replace(sepRegex, separator);

  // Trim separators from ends
  sanitized = sanitized.replace(new RegExp(`^[${escapeRegex(separator)}]+`), "");
  sanitized = sanitized.replace(new RegExp(`[${escapeRegex(separator)}]+$`), "");

  return sanitized;
}

/**
 * Create a slug from a string (lowercase, alphanumeric with separators)
 */
export function slugify(str: string, separator: string = "-"): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_-]+/g, separator) // Replace spaces/underscores with separator
    .replace(new RegExp(`^[${escapeRegex(separator)}]+`), "") // Trim from start
    .replace(new RegExp(`[${escapeRegex(separator)}]+$`), ""); // Trim from end
}

/**
 * Get the file extension from a path (lowercase, without dot)
 */
export function getExtension(path: string): string {
  const filename = path.split(/[/\\]/).pop() || "";
  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return "";
  }

  return filename.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * Get the filename without extension
 */
export function getBaseName(path: string): string {
  const filename = path.split(/[/\\]/).pop() || "";
  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return filename;
  }

  return filename.slice(0, lastDotIndex);
}

/**
 * Get the directory portion of a path
 */
export function getDirectory(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");

  if (lastSlash === -1) {
    return "";
  }

  return normalized.slice(0, lastSlash);
}

/**
 * Join path parts with forward slash
 */
export function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
}

/**
 * Normalize a path to use forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Calculate the depth of a path (number of directory levels)
 */
export function getPathDepth(path: string): number {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);

  // Don't count the filename itself
  return Math.max(0, parts.length - 1);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve a collision by adding a numeric suffix
 * e.g., "file.md" -> "file_1.md", "file_2.md", etc.
 */
export function resolveCollision(
  name: string,
  existingNames: Set<string>,
  separator: string = "_"
): string {
  if (!existingNames.has(name)) {
    return name;
  }

  const lastDotIndex = name.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0;
  const baseName = hasExtension ? name.slice(0, lastDotIndex) : name;
  const extension = hasExtension ? name.slice(lastDotIndex) : "";

  let counter = 1;
  let newName: string;

  do {
    newName = `${baseName}${separator}${counter}${extension}`;
    counter++;
  } while (existingNames.has(newName));

  return newName;
}
