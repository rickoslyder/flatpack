/**
 * @flatpack/ui stores
 */

// Config store
export {
  useConfigStore,
  useTheme,
  useTier,
  useConfig,
  type UserPreferences,
  type ProcessingConfig,
  type ConfigState,
} from "./config-store.js";

// Session store
export {
  useSessionStore,
  useInput,
  usePlan,
  useResults,
  useHistory,
  useHasInput,
  useHasPlan,
  type InputSource,
  type FileInfo,
  type HistoryEntry,
  type SessionState,
} from "./session-store.js";

// Processing store
export {
  useProcessingStore,
  usePhase,
  useProgress,
  useErrors,
  useStats,
  useIsProcessing,
  useIsComplete,
  useElapsedTime,
  type ProcessingPhase,
  type FileStatus,
  type ProcessingStats,
  type ProcessingState,
} from "./processing-store.js";
