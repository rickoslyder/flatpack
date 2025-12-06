/**
 * Metadata injector
 * Adds YAML front matter to processed files
 */

import { escapeYaml } from "../utils/index.js";

/**
 * File metadata for injection
 */
export interface FileMetadata {
  /** Original file path */
  originalPath: string;
  /** Original filename */
  originalName: string;
  /** Processing action taken */
  action: string;
  /** Related file paths */
  relatedFiles?: string[];
  /** If chunked, part number */
  partNumber?: number;
  /** If chunked, total parts */
  totalParts?: number;
  /** If merged, source files */
  mergedFrom?: string[];
  /** Processing notes */
  notes?: string[];
  /** Word count */
  wordCount?: number;
  /** Processing timestamp */
  processedAt?: Date;
}

/**
 * Inject YAML metadata header into content
 */
export function injectMetadata(content: string, metadata: FileMetadata): string {
  const yaml = generateYamlHeader(metadata);
  return `${yaml}\n${content}`;
}

/**
 * Generate YAML front matter from metadata
 */
export function generateYamlHeader(metadata: FileMetadata): string {
  const lines: string[] = ["---"];

  // Original path (always include)
  lines.push(`original_path: ${escapeYaml(metadata.originalPath)}`);
  lines.push(`original_name: ${escapeYaml(metadata.originalName)}`);

  // Action
  lines.push(`action: ${metadata.action}`);

  // Chunking info
  if (metadata.partNumber !== undefined && metadata.totalParts !== undefined) {
    lines.push(`part: ${metadata.partNumber} of ${metadata.totalParts}`);
  }

  // Merged sources
  if (metadata.mergedFrom && metadata.mergedFrom.length > 0) {
    lines.push("merged_from:");
    for (const source of metadata.mergedFrom) {
      lines.push(`  - ${escapeYaml(source)}`);
    }
  }

  // Related files (limit to avoid huge headers)
  if (metadata.relatedFiles && metadata.relatedFiles.length > 0) {
    const related = metadata.relatedFiles.slice(0, 10);
    lines.push("related_files:");
    for (const file of related) {
      lines.push(`  - ${escapeYaml(file)}`);
    }
    if (metadata.relatedFiles.length > 10) {
      lines.push(`  # ... and ${metadata.relatedFiles.length - 10} more`);
    }
  }

  // Word count
  if (metadata.wordCount !== undefined) {
    lines.push(`word_count: ${metadata.wordCount}`);
  }

  // Processing notes
  if (metadata.notes && metadata.notes.length > 0) {
    lines.push("notes:");
    for (const note of metadata.notes) {
      lines.push(`  - ${escapeYaml(note)}`);
    }
  }

  // Timestamp
  if (metadata.processedAt) {
    lines.push(`processed_at: ${metadata.processedAt.toISOString()}`);
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Extract metadata from content with YAML front matter
 */
export function extractMetadata(content: string): {
  metadata: Partial<FileMetadata>;
  content: string;
} {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontMatterMatch) {
    return { metadata: {}, content };
  }

  const yamlContent = frontMatterMatch[1]!;
  const bodyContent = frontMatterMatch[2]!;

  // Simple YAML parsing
  const metadata: Partial<FileMetadata> = {};

  const lines = yamlContent.split("\n");
  let currentKey = "";
  let currentArray: string[] = [];

  for (const line of lines) {
    // Array item
    if (line.match(/^\s+-\s+/)) {
      const value = line.replace(/^\s+-\s+/, "").trim();
      currentArray.push(unescapeYaml(value));
      continue;
    }

    // New key
    const keyMatch = line.match(/^(\w+):\s*(.*)/);
    if (keyMatch) {
      // Save previous array if any
      if (currentKey && currentArray.length > 0) {
        (metadata as Record<string, unknown>)[currentKey] = currentArray;
        currentArray = [];
      }

      currentKey = keyMatch[1]!;
      const value = keyMatch[2]!.trim();

      if (!value) {
        // Array will follow
        continue;
      }

      // Parse value
      (metadata as Record<string, unknown>)[currentKey] = unescapeYaml(value);
      currentKey = "";
    }
  }

  // Save last array if any
  if (currentKey && currentArray.length > 0) {
    (metadata as Record<string, unknown>)[currentKey] = currentArray;
  }

  return { metadata, content: bodyContent };
}

/**
 * Unescape a YAML string value
 */
function unescapeYaml(value: string): string {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  // Unescape common sequences
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Generate chunk part header
 */
export function generateChunkHeader(
  partNumber: number,
  totalParts: number,
  prevPart?: string,
  nextPart?: string
): string {
  const lines: string[] = [];

  lines.push(`> **Part ${partNumber} of ${totalParts}**`);

  if (prevPart || nextPart) {
    const nav: string[] = [];
    if (prevPart) nav.push(`Previous: ${prevPart}`);
    if (nextPart) nav.push(`Next: ${nextPart}`);
    lines.push(`> ${nav.join(" | ")}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Generate bundle section header
 */
export function generateBundleSectionHeader(
  originalPath: string,
  index: number,
  total: number
): string {
  return `\n---\n\n## File ${index + 1}/${total}: ${originalPath}\n\n`;
}
