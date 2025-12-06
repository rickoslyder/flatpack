/**
 * @flatpack/core pipeline
 */

// Main processor
export type {
  ProcessingOptions,
  ProcessingCallbacks,
  ProcessingPhase,
  ProcessingState,
} from "./processor.js";
export { processFiles, validateOptions } from "./processor.js";

// Error handling
export {
  normalizeError,
  isRecoverable,
  getSuggestedActions,
  createErrorContext,
  ErrorCollector,
  withRetry,
} from "./error-handler.js";
