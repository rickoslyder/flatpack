/**
 * Web Platform Adapter
 * Browser implementation using File System Access API
 *
 * Note: This is a stub for the core package. The full implementation
 * lives in the web package where DOM types are available.
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  SelectionResult,
  DialogOptions,
} from "./platform-adapter.js";
import type { DirectoryScanner } from "../analyzer/index.js";
import type { OutputWriter } from "../output/index.js";

/**
 * Web adapter stub
 * Full implementation requires browser environment with File System Access API
 */
export class WebAdapter implements PlatformAdapter {
  readonly capabilities: PlatformCapabilities = {
    hasFileSystemAccess: false, // Set to true when running in browser
    hasNativeDialogs: false,
    hasOcrSupport: false,
    hasZipSupport: true,
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
    platformName: "web",
  };

  getScanner(): DirectoryScanner {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  getWriter(): OutputWriter {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async selectFolder(_options?: DialogOptions): Promise<SelectionResult | null> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async selectFiles(_options?: DialogOptions): Promise<SelectionResult[] | null> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async selectSavePath(_options?: DialogOptions): Promise<string | null> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async readFile(_path: string): Promise<Uint8Array> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async writeFile(_path: string, _content: string | Uint8Array): Promise<void> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async createDirectory(_path: string): Promise<void> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async exists(_path: string): Promise<boolean> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async delete(_path: string): Promise<void> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }

  async copyFile(_source: string, _destination: string): Promise<void> {
    throw new Error("WebAdapter requires browser environment. Use @flatpack/web.");
  }
}

/**
 * Create a web adapter instance
 * Note: Use @flatpack/web for full browser implementation
 */
export function createWebAdapter(): WebAdapter {
  return new WebAdapter();
}
