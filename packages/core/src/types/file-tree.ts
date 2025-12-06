/**
 * File tree and analysis types
 */

/** Classification tier for file processing */
export type FileTier = "passthrough" | "conversion" | "ocr" | "unsupported";

/** Processing action to take on a file */
export type FileAction = "keep" | "convert" | "chunk" | "merge" | "ocr" | "skip" | "fail";

/** Result of file scanning (before analysis) */
export interface ScannedFile {
  /** Absolute path to the file */
  path: string;
  /** Relative path from input root */
  relativePath: string;
  /** Original filename with extension */
  name: string;
  /** File extension (lowercase, without dot) */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Child files if directory */
  children?: ScannedFile[];
}

/** Result of file analysis (classification and word counting) */
export interface AnalyzedFile extends ScannedFile {
  /** Classification tier */
  tier: FileTier;
  /** Estimated word count (before conversion) */
  wordCount: number;
  /** Detected MIME type */
  mimeType?: string;
  /** Detected encoding */
  encoding?: string;
  /** Whether file requires OCR */
  requiresOcr: boolean;
  /** Whether file is copy-protected (PDF) */
  isCopyProtected: boolean;
  /** Related files detected by reference parsing */
  relatedFiles: string[];
  /** Warnings generated during analysis */
  warnings: FileWarning[];
}

/** Warning generated during file analysis */
export interface FileWarning {
  /** Warning code for programmatic handling */
  code: FileWarningCode;
  /** Human-readable warning message */
  message: string;
  /** Warning severity */
  severity: "info" | "warning" | "error";
}

/** Warning codes for file analysis */
export type FileWarningCode =
  | "large_file"
  | "exceeds_limit"
  | "requires_ocr"
  | "copy_protected"
  | "unsupported_format"
  | "encoding_issue"
  | "empty_file"
  | "binary_content";

/** Virtual file tree node for UI display */
export interface FileTreeNode {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Relative path */
  path: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Planned action */
  action: FileAction;
  /** Child nodes */
  children?: FileTreeNode[];
  /** Whether node is expanded in UI */
  expanded?: boolean;
  /** Whether node is selected in UI */
  selected?: boolean;
  /** Associated analyzed file (for files, not directories) */
  file?: AnalyzedFile;
}
