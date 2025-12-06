/**
 * @flatpack/core type definitions
 */

// File tree and analysis types
export type {
  FileTier,
  FileAction,
  ScannedFile,
  AnalyzedFile,
  FileWarning,
  FileWarningCode,
  FileTreeNode,
} from "./file-tree.js";

// Configuration types
export type {
  NotebookTier,
  TierLimits,
  PathSeparator,
  PdfHandling,
  ErrorHandlingMode,
  FlatpackConfig,
  FlatpackConfigUpdate,
} from "./config.js";

// Processing plan types
export type {
  PlannedFile,
  Bundle,
  ProcessingPlan,
  ProcessingSummary,
  PlanningWarning,
  PlanningWarningCode,
} from "./processing-plan.js";

// Manifest and output types
export type {
  ManifestFileEntry,
  FlatpackManifest,
  ManifestSettings,
  ManifestSummary,
  FailedFile,
  ProcessingResults,
} from "./manifest.js";

// Error types
export type {
  FlatpackErrorCode,
  ErrorSeverity,
  ErrorAction,
  ProcessingError,
  ErrorContext,
} from "./errors.js";

export { FlatpackError } from "./errors.js";
