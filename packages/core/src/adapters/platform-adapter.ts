/**
 * Platform Adapter Interface
 * Abstract interface for cross-platform file system and dialog operations
 */

import type { DirectoryScanner } from "../analyzer/index.js";
import type { OutputWriter } from "../output/index.js";
import type { PdfConverter } from "../converters/pdf-converter.js";

/**
 * File or folder selection result
 */
export interface SelectionResult {
  /** Selected path */
  path: string;
  /** Display name */
  name: string;
  /** Whether it's a directory */
  isDirectory: boolean;
  /** File size (for files) */
  size?: number;
}

/**
 * Dialog options for file/folder selection
 */
export interface DialogOptions {
  /** Dialog title */
  title?: string;
  /** Default path */
  defaultPath?: string;
  /** Allow multiple selection */
  multiple?: boolean;
  /** File type filters */
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

/**
 * Progress callback for operations
 */
export type ProgressCallback = (
  current: number,
  total: number,
  message: string
) => void;

/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
  /** Can access local file system */
  hasFileSystemAccess: boolean;
  /** Has native dialogs */
  hasNativeDialogs: boolean;
  /** Has OCR support */
  hasOcrSupport: boolean;
  /** Can create ZIP files */
  hasZipSupport: boolean;
  /** Maximum file size supported */
  maxFileSize: number;
  /** Platform name */
  platformName: "desktop" | "web";
}

/**
 * Abstract Platform Adapter
 */
export interface PlatformAdapter {
  /** Platform capabilities */
  readonly capabilities: PlatformCapabilities;

  /** Get directory scanner implementation */
  getScanner(): DirectoryScanner;

  /** Get output writer implementation */
  getWriter(): OutputWriter;

  /** Get PDF converter (if available) */
  getPdfConverter?(): PdfConverter;

  // Dialog operations
  /** Show folder picker dialog */
  selectFolder(options?: DialogOptions): Promise<SelectionResult | null>;

  /** Show file picker dialog */
  selectFiles(options?: DialogOptions): Promise<SelectionResult[] | null>;

  /** Show save dialog */
  selectSavePath(options?: DialogOptions): Promise<string | null>;

  // File operations
  /** Read a file as Uint8Array */
  readFile(path: string): Promise<Uint8Array>;

  /** Write a file */
  writeFile(path: string, content: string | Uint8Array): Promise<void>;

  /** Create a directory */
  createDirectory(path: string): Promise<void>;

  /** Check if path exists */
  exists(path: string): Promise<boolean>;

  /** Delete a file or directory */
  delete(path: string): Promise<void>;

  /** Copy a file */
  copyFile(source: string, destination: string): Promise<void>;

  // Utility operations
  /** Open path in system file manager */
  revealInExplorer?(path: string): Promise<void>;

  /** Open file with default application */
  openFile?(path: string): Promise<void>;

  /** Get system temp directory */
  getTempDir?(): Promise<string>;

  /** Generate unique temp path */
  createTempPath?(prefix: string): Promise<string>;
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof globalThis !== "undefined" && "document" in globalThis;
}

/**
 * Check if File System Access API is available
 */
export function hasFileSystemAccess(): boolean {
  return isBrowser() && "showDirectoryPicker" in globalThis;
}

/**
 * Check if running in Tauri
 */
export function isTauri(): boolean {
  return isBrowser() && "__TAURI__" in globalThis;
}
