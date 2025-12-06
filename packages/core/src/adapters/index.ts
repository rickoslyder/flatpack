/**
 * @flatpack/core adapters
 * Platform-specific implementations
 */

// Platform adapter interface
export type {
  PlatformAdapter,
  PlatformCapabilities,
  SelectionResult,
  DialogOptions,
  ProgressCallback,
} from "./platform-adapter.js";

export {
  hasFileSystemAccess,
  isTauri,
  isBrowser,
} from "./platform-adapter.js";

// Web adapter
export { WebAdapter, createWebAdapter } from "./web-adapter.js";

// Tauri adapter (stub)
export {
  TauriAdapter,
  createTauriAdapter,
  isTauriAvailable,
} from "./tauri-adapter.js";
