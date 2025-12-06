/**
 * Web Platform Adapter
 * Browser-specific implementation of PlatformAdapter using File System Access API
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  DirectoryScanner,
  OutputWriter,
  DialogOptions,
  SelectionResult,
  ScanOptions,
  ScanResult,
  ScannedFile,
  OutputFile,
  OutputConfig,
  OutputProgress,
} from "@flatpack/core";
import { buildFileTree } from "@flatpack/core";

/**
 * Check if File System Access API is supported
 */
const hasFileSystemAccessApi = typeof window !== "undefined" && "showDirectoryPicker" in window;

/**
 * Web platform capabilities
 */
const webCapabilities: PlatformCapabilities = {
  hasFileSystemAccess: hasFileSystemAccessApi,
  hasNativeDialogs: hasFileSystemAccessApi,
  hasOcrSupport: false, // No OCR in browser
  hasZipSupport: true,
  maxFileSize: 500 * 1024 * 1024, // 500MB
  platformName: "web",
};

/**
 * Get file extension from name
 */
function getExtension(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return "";
  return name.slice(lastDot + 1).toLowerCase();
}

/**
 * Web Directory Scanner using File System Access API
 */
class WebDirectoryScanner implements DirectoryScanner {
  private handle: FileSystemDirectoryHandle | null = null;
  private rootPath: string = "";
  private fileCache: Map<string, Uint8Array> = new Map();

  async setRoot(handle: FileSystemDirectoryHandle): Promise<void> {
    this.handle = handle;
    this.rootPath = handle.name;
    this.fileCache.clear();
  }

  async scan(path: string, options?: ScanOptions): Promise<ScanResult> {
    if (!this.handle) {
      throw new Error("No directory handle set");
    }

    const startTime = Date.now();
    const files: ScannedFile[] = [];
    let totalFiles = 0;
    let totalDirectories = 0;
    let ignoredCount = 0;

    await this.scanDirectory(this.handle, "", files, options, (isDir) => {
      if (isDir) totalDirectories++;
      else totalFiles++;
    });

    const root = this.rootPath || path;
    const tree = buildFileTree(files, root);

    return {
      root,
      files,
      tree,
      totalFiles,
      totalDirectories,
      ignoredCount,
      duration: Date.now() - startTime,
    };
  }

  private async scanDirectory(
    handle: FileSystemDirectoryHandle,
    basePath: string,
    files: ScannedFile[],
    options?: ScanOptions,
    onScan?: (isDirectory: boolean) => void
  ): Promise<void> {
    try {
      for await (const entry of handle.values()) {
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        const fullPath = `${this.rootPath}/${relativePath}`;

        try {
          if (entry.kind === "directory") {
            onScan?.(true);
            const dirFile: ScannedFile = {
              path: fullPath,
              relativePath,
              name: entry.name,
              extension: "",
              size: 0,
              modifiedAt: new Date(),
              isDirectory: true,
              children: [],
            };
            files.push(dirFile);
            await this.scanDirectory(
              entry as FileSystemDirectoryHandle,
              relativePath,
              files,
              options,
              onScan
            );
          } else {
            onScan?.(false);
            const file = await (entry as FileSystemFileHandle).getFile();
            files.push({
              path: fullPath,
              relativePath,
              name: entry.name,
              extension: getExtension(entry.name),
              size: file.size,
              modifiedAt: new Date(file.lastModified),
              isDirectory: false,
            });
          }
        } catch (err) {
          console.error(`Error scanning ${relativePath}:`, err);
        }
      }
    } catch (err) {
      console.error(`Error scanning directory ${basePath}:`, err);
    }
  }

  async readFile(path: string): Promise<Uint8Array> {
    // Check cache first
    const cached = this.fileCache.get(path);
    if (cached) return cached;

    if (!this.handle) {
      throw new Error("No directory handle set");
    }

    // Strip root path if present
    let relativePath = path;
    if (path.startsWith(this.rootPath + "/")) {
      relativePath = path.slice(this.rootPath.length + 1);
    }

    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    let currentHandle: FileSystemDirectoryHandle = this.handle;

    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }

    const fileHandle = await currentHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const data = new Uint8Array(await file.arrayBuffer());

    // Cache for future reads
    this.fileCache.set(path, data);
    return data;
  }

  async exists(path: string): Promise<boolean> {
    if (!this.handle) return false;

    try {
      let relativePath = path;
      if (path.startsWith(this.rootPath + "/")) {
        relativePath = path.slice(this.rootPath.length + 1);
      }

      const parts = relativePath.split("/").filter(Boolean);
      const name = parts.pop()!;
      let currentHandle: FileSystemDirectoryHandle = this.handle;

      for (const part of parts) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }

      try {
        await currentHandle.getFileHandle(name);
        return true;
      } catch {
        await currentHandle.getDirectoryHandle(name);
        return true;
      }
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<{ size: number; modifiedAt: Date; isDirectory: boolean }> {
    if (!this.handle) {
      throw new Error("No directory handle set");
    }

    let relativePath = path;
    if (path.startsWith(this.rootPath + "/")) {
      relativePath = path.slice(this.rootPath.length + 1);
    }

    const parts = relativePath.split("/").filter(Boolean);
    const name = parts.pop()!;
    let currentHandle: FileSystemDirectoryHandle = this.handle;

    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }

    try {
      const fileHandle = await currentHandle.getFileHandle(name);
      const file = await fileHandle.getFile();
      return {
        size: file.size,
        modifiedAt: new Date(file.lastModified),
        isDirectory: false,
      };
    } catch {
      // Try as directory
      await currentHandle.getDirectoryHandle(name);
      return {
        size: 0,
        modifiedAt: new Date(),
        isDirectory: true,
      };
    }
  }
}

/**
 * Web Output Writer
 */
class WebOutputWriter implements OutputWriter {
  private outputHandle: FileSystemDirectoryHandle | null = null;
  private files: Map<string, Uint8Array | string> = new Map();

  async setOutputDirectory(handle: FileSystemDirectoryHandle): Promise<void> {
    this.outputHandle = handle;
  }

  async writeAll(
    files: OutputFile[],
    config: OutputConfig,
    onProgress?: OutputProgress
  ): Promise<void> {
    const total = files.length;
    let current = 0;

    for (const file of files) {
      const outputPath = `${config.outputPath}/${file.path}`;
      await this.writeFile(file.path, file.content, outputPath);
      current++;
      onProgress?.(current, total, file.path);
    }
  }

  async writeFile(path: string, content: string | Uint8Array, _outputPath: string): Promise<void> {
    if (this.outputHandle) {
      // Use File System Access API
      const parts = path.split("/");
      const fileName = parts.pop()!;
      let currentHandle = this.outputHandle;

      // Create directories if needed
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
        }
      }

      const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      // Store in memory for later ZIP creation
      this.files.set(path, content);
    }
  }

  async createDirectory(path: string): Promise<void> {
    if (this.outputHandle) {
      const parts = path.split("/").filter(Boolean);
      let currentHandle = this.outputHandle;
      for (const part of parts) {
        currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
      }
    }
  }

  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    // In web, we need to read and write
    throw new Error(`copyFile not implemented in web: ${sourcePath} -> ${destPath}`);
  }

  async exists(path: string): Promise<boolean> {
    if (this.outputHandle) {
      try {
        const parts = path.split("/").filter(Boolean);
        const name = parts.pop()!;
        let currentHandle = this.outputHandle;

        for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        try {
          await currentHandle.getFileHandle(name);
          return true;
        } catch {
          await currentHandle.getDirectoryHandle(name);
          return true;
        }
      } catch {
        return false;
      }
    }
    return this.files.has(path);
  }

  async createZip(files: OutputFile[], _outputPath: string): Promise<Uint8Array> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const file of files) {
      zip.file(file.path, file.content);
    }

    const blob = await zip.generateAsync({ type: "uint8array" });
    return blob;
  }

  getFiles(): Map<string, Uint8Array | string> {
    return this.files;
  }

  clear(): void {
    this.files.clear();
  }
}

/**
 * Web Platform Adapter
 */
export class WebAdapter implements PlatformAdapter {
  readonly capabilities = webCapabilities;

  private scanner = new WebDirectoryScanner();
  private writer = new WebOutputWriter();

  getScanner(): DirectoryScanner {
    return this.scanner;
  }

  getWriter(): OutputWriter {
    return this.writer;
  }

  // getPdfConverter is optional and not implemented in web version
  // PDF conversion handled separately via pdfjs-dist

  async selectFolder(_options?: DialogOptions): Promise<SelectionResult | null> {
    if (!hasFileSystemAccessApi) {
      console.warn("File System Access API not supported");
      return null;
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
      });

      await this.scanner.setRoot(handle);

      return {
        path: handle.name,
        name: handle.name,
        isDirectory: true,
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return null; // User cancelled
      }
      throw error;
    }
  }

  async selectFiles(options?: DialogOptions): Promise<SelectionResult[] | null> {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: options?.multiple ?? false,
        types: options?.filters?.map((f) => ({
          description: f.name,
          accept: { "*/*": f.extensions.map((e) => `.${e}`) },
        })),
      });

      const results: SelectionResult[] = [];
      for (const handle of handles) {
        const file = await handle.getFile();
        results.push({
          path: file.name,
          name: file.name,
          isDirectory: false,
          size: file.size,
        });
      }
      return results;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return null;
      }
      throw error;
    }
  }

  async selectZipFile(): Promise<{ name: string; data: Uint8Array } | null> {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "ZIP Archives",
            accept: { "application/zip": [".zip"] },
          },
        ],
      });

      const file = await handle.getFile();
      return {
        name: file.name,
        data: new Uint8Array(await file.arrayBuffer()),
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return null;
      }
      throw error;
    }
  }

  async selectSavePath(_options?: DialogOptions): Promise<string | null> {
    if (!hasFileSystemAccessApi) {
      return null;
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: _options?.defaultPath || "output.zip",
      });
      return handle.name;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return null;
      }
      throw error;
    }
  }

  async selectOutputFolder(): Promise<FileSystemDirectoryHandle | null> {
    if (!hasFileSystemAccessApi) {
      return null;
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
      });
      await this.writer.setOutputDirectory(handle);
      return handle;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return null;
      }
      throw error;
    }
  }

  async readFile(path: string): Promise<Uint8Array> {
    return this.scanner.readFile(path);
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    await this.writer.writeFile(path, content, path);
  }

  async createDirectory(path: string): Promise<void> {
    await this.writer.createDirectory(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.scanner.exists(path);
  }

  async delete(_path: string): Promise<void> {
    // Limited support in File System Access API
    throw new Error("Delete not supported in web version");
  }

  async copyFile(_source: string, _destination: string): Promise<void> {
    throw new Error("Copy not supported in web version - use read/write instead");
  }

  async downloadAsZip(files: Map<string, Uint8Array | string>, fileName: string): Promise<void> {
    // Dynamic import of JSZip
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const [path, content] of files) {
      zip.file(path, content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Create and export singleton instance
 */
export const webAdapter = new WebAdapter();
