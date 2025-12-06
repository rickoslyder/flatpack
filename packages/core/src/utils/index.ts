/**
 * @flatpack/core utilities
 */

// Path utilities
export {
  flattenPath,
  sanitizePathPart,
  slugify,
  getExtension,
  getBaseName,
  getDirectory,
  joinPath,
  normalizePath,
  getPathDepth,
  resolveCollision,
} from "./path-utils.js";

// String utilities
export {
  truncate,
  escapeYaml,
  escapeMarkdown,
  stripAnsi,
  formatBytes,
  formatDuration,
  formatNumber,
  capitalize,
  toTitleCase,
  normalizeWhitespace,
  isBlank,
  simpleHash,
  generateId,
} from "./string-utils.js";

// Glob matching
export { GlobMatcher, createMatcher, matchesPattern, matchesAny } from "./glob-matcher.js";

// Word counting
export type { WordCountResult } from "./word-counter.js";
export {
  countWords,
  estimateWordCount,
  countCodeWords,
  analyzeWordCount,
  exceedsLimit,
  limitUsagePercent,
} from "./word-counter.js";

// Encoding detection
export type { EncodingInfo } from "./encoding-detector.js";
export {
  detectEncoding,
  decodeContent,
  stripBom,
  getBomBytes,
} from "./encoding-detector.js";
