/**
 * @flatpack/core output
 */

// Manifest generator
export type { ManifestOptions, FileResult } from "./manifest-generator.js";
export {
  generateManifest,
  serializeManifest,
  parseManifest,
  getFailedFiles,
  getStatistics,
} from "./manifest-generator.js";

// Structure generator
export { generateMasterStructure, generateTreeOutput } from "./structure-generator.js";

// Failures reporter
export {
  generateFailuresReport,
  createFailedFileRecords,
  getFailureStats,
} from "./failures-reporter.js";

// Output writer
export type {
  OutputConfig,
  OutputFile,
  OutputProgress,
  OutputWriter,
} from "./output-writer.js";
export {
  prepareOutputFiles,
  getOutputFileNames,
  validateOutputConfig,
  estimateOutputSize,
} from "./output-writer.js";
