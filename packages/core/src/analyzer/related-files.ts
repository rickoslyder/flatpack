/**
 * Related files detection
 * Finds relationships between files for context preservation
 */

import type { ScannedFile } from "../types/index.js";
import { getExtension, getBaseName, getDirectory, normalizePath } from "../utils/index.js";

/**
 * Types of file relationships
 */
export type RelationshipType =
  | "sibling" // Same directory
  | "import" // Import/require reference
  | "link" // Markdown/HTML link
  | "pattern" // Matching filename pattern
  | "config" // Configuration file relationship
  | "test"; // Test file for source

/**
 * A detected relationship between files
 */
export interface FileRelationship {
  /** Source file path */
  source: string;
  /** Related file path */
  target: string;
  /** Type of relationship */
  type: RelationshipType;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Detect related files for a given file
 */
export function detectRelatedFiles(
  file: ScannedFile,
  allFiles: ScannedFile[],
  content?: string
): string[] {
  const related = new Set<string>();
  const filePath = normalizePath(file.relativePath);

  // Find siblings (same directory)
  const siblings = findSiblings(file, allFiles);
  for (const sibling of siblings.slice(0, 5)) {
    // Limit to 5 siblings
    related.add(sibling);
  }

  // Find pattern matches (shared prefix/suffix)
  const patternMatches = findPatternMatches(file, allFiles);
  for (const match of patternMatches) {
    related.add(match);
  }

  // Find test/source pairs
  const testPair = findTestPair(file, allFiles);
  if (testPair) {
    related.add(testPair);
  }

  // Find config relationships
  const configFiles = findConfigRelationships(file, allFiles);
  for (const config of configFiles) {
    related.add(config);
  }

  // Parse content for references if provided
  if (content) {
    const references = extractReferences(content, file, allFiles);
    for (const ref of references) {
      related.add(ref);
    }
  }

  // Remove self
  related.delete(filePath);

  return Array.from(related);
}

/**
 * Find sibling files in the same directory
 */
function findSiblings(file: ScannedFile, allFiles: ScannedFile[]): string[] {
  const dir = getDirectory(file.relativePath);

  return allFiles
    .filter((f) => {
      if (f.isDirectory) return false;
      if (f.relativePath === file.relativePath) return false;
      return getDirectory(f.relativePath) === dir;
    })
    .map((f) => f.relativePath);
}

/**
 * Find files with matching name patterns
 */
function findPatternMatches(file: ScannedFile, allFiles: ScannedFile[]): string[] {
  const baseName = getBaseName(file.name);
  const matches: string[] = [];

  // Look for files with similar base names
  for (const other of allFiles) {
    if (other.isDirectory || other.relativePath === file.relativePath) continue;

    const otherBase = getBaseName(other.name);

    // Check for shared prefix (e.g., user.ts and user.test.ts)
    if (
      baseName.startsWith(otherBase) ||
      otherBase.startsWith(baseName)
    ) {
      if (Math.abs(baseName.length - otherBase.length) < 10) {
        matches.push(other.relativePath);
      }
    }

    // Check for index files in subdirectories
    if (other.name === "index.ts" || other.name === "index.js") {
      const otherDir = getDirectory(other.relativePath);
      if (otherDir.endsWith(`/${baseName}`) || otherDir === baseName) {
        matches.push(other.relativePath);
      }
    }
  }

  return matches;
}

/**
 * Find test/source file pairs
 */
function findTestPair(file: ScannedFile, allFiles: ScannedFile[]): string | undefined {
  const baseName = getBaseName(file.name);
  const ext = getExtension(file.name);
  const dir = getDirectory(file.relativePath);

  // Common test file patterns
  const testPatterns = [
    `.test.${ext}`,
    `.spec.${ext}`,
    `_test.${ext}`,
    `_spec.${ext}`,
  ];

  const isTestFile = testPatterns.some((p) => file.name.endsWith(p));

  if (isTestFile) {
    // This is a test file, find the source
    const sourceBase = baseName
      .replace(/\.test$/, "")
      .replace(/\.spec$/, "")
      .replace(/_test$/, "")
      .replace(/_spec$/, "");

    return allFiles.find(
      (f) =>
        !f.isDirectory &&
        getDirectory(f.relativePath) === dir &&
        getBaseName(f.name) === sourceBase &&
        getExtension(f.name) === ext
    )?.relativePath;
  } else {
    // This is a source file, find the test
    for (const pattern of testPatterns) {
      const testName = `${baseName}${pattern}`;
      const testFile = allFiles.find(
        (f) =>
          !f.isDirectory &&
          (getDirectory(f.relativePath) === dir ||
            getDirectory(f.relativePath) === `${dir}/__tests__`) &&
          f.name === testName
      );
      if (testFile) return testFile.relativePath;
    }
  }

  return undefined;
}

/**
 * Find configuration file relationships
 */
function findConfigRelationships(file: ScannedFile, allFiles: ScannedFile[]): string[] {
  const dir = getDirectory(file.relativePath);
  const configFiles: string[] = [];

  // Common config files that relate to nearby files
  const configPatterns = [
    "package.json",
    "tsconfig.json",
    ".eslintrc",
    ".prettierrc",
    "Makefile",
    "Cargo.toml",
    "go.mod",
    "requirements.txt",
    "pyproject.toml",
  ];

  for (const other of allFiles) {
    if (other.isDirectory) continue;

    // Check if it's a config file in the same or parent directory
    const otherDir = getDirectory(other.relativePath);
    const isConfig = configPatterns.some(
      (p) => other.name === p || other.name.startsWith(p)
    );

    if (isConfig && (otherDir === dir || dir.startsWith(`${otherDir}/`))) {
      configFiles.push(other.relativePath);
    }
  }

  return configFiles.slice(0, 3); // Limit to 3 config files
}

/**
 * Extract file references from content
 */
export function extractReferences(
  content: string,
  file: ScannedFile,
  allFiles: ScannedFile[]
): string[] {
  const references: string[] = [];
  const ext = getExtension(file.name);
  const dir = getDirectory(file.relativePath);

  // JavaScript/TypeScript imports
  if (["js", "ts", "jsx", "tsx", "mjs", "cjs"].includes(ext)) {
    const importRegex = /(?:import|require)\s*\(?['"](\.\.?\/[^'"]+)['"]\)?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const resolved = resolveRelativePath(dir, match[1]!);
      const found = findFileByPath(resolved, allFiles);
      if (found) references.push(found);
    }
  }

  // Markdown links
  if (["md", "mdx"].includes(ext)) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[2]!;
      if (!href.startsWith("http") && !href.startsWith("#")) {
        const resolved = resolveRelativePath(dir, href.split("#")[0]!);
        const found = findFileByPath(resolved, allFiles);
        if (found) references.push(found);
      }
    }
  }

  // Python imports
  if (ext === "py") {
    const fromImportRegex = /from\s+(\.[.\w]+)\s+import/g;
    let match;
    while ((match = fromImportRegex.exec(content)) !== null) {
      const modulePath = match[1]!.replace(/\./g, "/");
      const resolved = resolveRelativePath(dir, modulePath);
      const found = findFileByPath(resolved, allFiles, [".py"]);
      if (found) references.push(found);
    }
  }

  return [...new Set(references)];
}

/**
 * Resolve a relative path from a base directory
 */
function resolveRelativePath(baseDir: string, relativePath: string): string {
  const parts = baseDir.split("/").filter(Boolean);
  const relParts = relativePath.split("/");

  for (const part of relParts) {
    if (part === "..") {
      parts.pop();
    } else if (part !== ".") {
      parts.push(part);
    }
  }

  return parts.join("/");
}

/**
 * Find a file by path, trying common extensions
 */
function findFileByPath(
  path: string,
  allFiles: ScannedFile[],
  extensions?: string[]
): string | undefined {
  const normalized = normalizePath(path);

  // Try exact match first
  const exact = allFiles.find((f) => normalizePath(f.relativePath) === normalized);
  if (exact) return exact.relativePath;

  // Try with common extensions
  const tryExtensions = extensions || [".ts", ".tsx", ".js", ".jsx", ".json", ".md"];
  for (const ext of tryExtensions) {
    const withExt = `${normalized}${ext}`;
    const found = allFiles.find((f) => normalizePath(f.relativePath) === withExt);
    if (found) return found.relativePath;
  }

  // Try as index file
  for (const ext of tryExtensions) {
    const indexPath = `${normalized}/index${ext}`;
    const found = allFiles.find((f) => normalizePath(f.relativePath) === indexPath);
    if (found) return found.relativePath;
  }

  return undefined;
}
