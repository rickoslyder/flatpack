/**
 * @flatpack/core analyzer
 */

// File classifier
export type { ClassificationResult } from "./file-classifier.js";
export {
  classifyFile,
  isExtensionSupported,
  getSupportedExtensions,
  getExtensionsByTier,
} from "./file-classifier.js";

// Directory scanner
export type {
  ScanOptions,
  ScanResult,
  DirectoryScanner,
} from "./directory-scanner.js";
export {
  createIgnoreMatcher,
  getMaxDepth,
  shouldAbort,
  buildFileTree,
  flattenFileTree,
} from "./directory-scanner.js";

// Related files
export type { RelationshipType, FileRelationship } from "./related-files.js";
export { detectRelatedFiles, extractReferences } from "./related-files.js";

// File analyzer
export type { AnalyzeOptions, AnalysisSummary } from "./file-analyzer.js";
export { analyzeFile, analyzeFiles, getAnalysisSummary } from "./file-analyzer.js";
