/**
 * @flatpack/core processors
 */

// Flattener
export type { FlattenOptions, FlattenResult } from "./flattener.js";
export {
  flattenFilePath,
  flattenPaths,
  generateChunkNames,
  generateBundleName,
  isValidFilename,
  sanitizeFilename,
} from "./flattener.js";

// Metadata injector
export type { FileMetadata } from "./metadata-injector.js";
export {
  injectMetadata,
  generateYamlHeader,
  extractMetadata,
  generateChunkHeader,
  generateBundleSectionHeader,
} from "./metadata-injector.js";

// Chunker
export type { ChunkingOptions, Chunk, ChunkResult } from "./chunker.js";
export {
  chunkContent,
  findSemanticBoundaries,
  needsChunking,
  estimateChunkCount,
} from "./chunker.js";

// Bundler
export type {
  BundlingOptions,
  BundleDefinition,
  BundleFile,
  BundleResult,
  BundlingStrategy,
} from "./bundler.js";
export {
  generateBundleContent,
  createBundles,
  calculateBundlingStrategy,
  mergeContents,
} from "./bundler.js";
