/**
 * Tauri Platform Adapter
 * Desktop implementation using Tauri (Rust backend)
 *
 * This is a stub - full implementation will use @tauri-apps/api
 * and lives in the desktop package.
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  SelectionResult,
  DialogOptions,
} from "./platform-adapter.js";
import type { DirectoryScanner } from "../analyzer/index.js";
import type { OutputWriter } from "../output/index.js";
import type { PdfConverter } from "../converters/pdf-converter.js";

/**
 * Tauri adapter stub
 * Full implementation requires Tauri environment with @tauri-apps/api
 */
export class TauriAdapter implements PlatformAdapter {
  readonly capabilities: PlatformCapabilities = {
    hasFileSystemAccess: true,
    hasNativeDialogs: true,
    hasOcrSupport: true,
    hasZipSupport: true,
    maxFileSize: Number.MAX_SAFE_INTEGER,
    platformName: "desktop",
  };

  getScanner(): DirectoryScanner {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  getWriter(): OutputWriter {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  getPdfConverter(): PdfConverter {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async selectFolder(_options?: DialogOptions): Promise<SelectionResult | null> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async selectFiles(_options?: DialogOptions): Promise<SelectionResult[] | null> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async selectSavePath(_options?: DialogOptions): Promise<string | null> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async readFile(_path: string): Promise<Uint8Array> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async writeFile(_path: string, _content: string | Uint8Array): Promise<void> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async createDirectory(_path: string): Promise<void> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async exists(_path: string): Promise<boolean> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async delete(_path: string): Promise<void> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async copyFile(_source: string, _destination: string): Promise<void> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async revealInExplorer(_path: string): Promise<void> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async openFile(_path: string): Promise<void> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async getTempDir(): Promise<string> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }

  async createTempPath(_prefix: string): Promise<string> {
    throw new Error("TauriAdapter requires Tauri environment. Use @flatpack/desktop.");
  }
}

/**
 * Create a Tauri adapter instance
 * Note: Use @flatpack/desktop for full Tauri implementation
 */
export function createTauriAdapter(): TauriAdapter {
  return new TauriAdapter();
}

/**
 * Check if Tauri is available (stub - always returns false in core)
 */
export function isTauriAvailable(): boolean {
  return false;
}
