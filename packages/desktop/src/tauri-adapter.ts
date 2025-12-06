/**
 * Tauri Platform Adapter
 * Desktop-specific implementation of PlatformAdapter using Tauri commands
 */

import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
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
  PdfConverter,
  PdfAnalysis,
  ConversionResult,
  ConversionOptions,
} from "@flatpack/core";
import { buildFileTree, successResult, failureResult } from "@flatpack/core";

/**
 * Desktop platform capabilities
 */
const desktopCapabilities: PlatformCapabilities = {
  hasFileSystemAccess: true,
  hasNativeDialogs: true,
  hasOcrSupport: false, // Can be enabled with feature flag
  hasZipSupport: true,
  maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
  platformName: "desktop",
};

/**
 * Types matching Rust structs
 */
interface RustScannedFile {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: number;
  isDirectory: boolean;
}

interface RustScanResult {
  root: string;
  files: RustScannedFile[];
  totalFiles: number;
  totalDirectories: number;
  duration: number;
}

interface RustFileStat {
  size: number;
  modifiedAt: number;
  isDirectory: boolean;
}

interface RustPdfConversionResult {
  markdown: string;
  pageCount: number;
  wordCount: number;
  hasImages: boolean;
}

interface RustPdfInfo {
  pageCount: number;
  title: string | null;
  author: string | null;
  hasText: boolean;
  fileSize: number;
}

/**
 * Tauri Directory Scanner
 */
class TauriDirectoryScanner implements DirectoryScanner {
  async scan(path: string, _options?: ScanOptions): Promise<ScanResult> {

    const result = await invoke<RustScanResult>("scan_directory", { path });

    // Convert Rust types to core types
    const files: ScannedFile[] = result.files.map((f) => ({
      path: f.path,
      relativePath: f.relativePath,
      name: f.name,
      extension: f.extension,
      size: f.size,
      modifiedAt: new Date(f.modifiedAt),
      isDirectory: f.isDirectory,
      children: f.isDirectory ? [] : undefined,
    }));

    const tree = buildFileTree(files, result.root);

    return {
      root: result.root,
      files,
      tree,
      totalFiles: result.totalFiles,
      totalDirectories: result.totalDirectories,
      ignoredCount: 0,
      duration: result.duration,
    };
  }

  async readFile(path: string): Promise<Uint8Array> {
    const bytes = await invoke<number[]>("read_file", { path });
    return new Uint8Array(bytes);
  }

  async exists(path: string): Promise<boolean> {
    return invoke<boolean>("file_exists", { path });
  }

  async stat(path: string): Promise<{ size: number; modifiedAt: Date; isDirectory: boolean }> {
    const stat = await invoke<RustFileStat>("get_file_stat", { path });
    return {
      size: stat.size,
      modifiedAt: new Date(stat.modifiedAt),
      isDirectory: stat.isDirectory,
    };
  }
}

/**
 * Tauri Output Writer
 */
class TauriOutputWriter implements OutputWriter {
  async writeAll(
    files: OutputFile[],
    config: OutputConfig,
    onProgress?: OutputProgress
  ): Promise<void> {
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const outputPath = `${config.outputPath}/${file.path}`;
      await this.writeFile(file.path, file.content, outputPath);
      onProgress?.(i + 1, total, file.path);
    }
  }

  async writeFile(_path: string, content: string | Uint8Array, outputPath: string): Promise<void> {
    const bytes =
      typeof content === "string" ? new TextEncoder().encode(content) : content;

    await invoke("write_file", {
      path: outputPath,
      content: Array.from(bytes),
    });
  }

  async createDirectory(path: string): Promise<void> {
    await invoke("create_directory", { path });
  }

  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    await invoke("copy_file", { source: sourcePath, destination: destPath });
  }

  async exists(path: string): Promise<boolean> {
    return invoke<boolean>("file_exists", { path });
  }

  async createZip(files: OutputFile[], outputPath: string): Promise<Uint8Array> {
    const zipFiles = files.map((f) => ({
      path: f.path,
      content: typeof f.content === "string"
        ? Array.from(new TextEncoder().encode(f.content))
        : Array.from(f.content),
    }));

    await invoke("create_zip", {
      outputPath,
      files: zipFiles,
    });

    // Read the created ZIP file
    const bytes = await invoke<number[]>("read_file", { path: outputPath });
    return new Uint8Array(bytes);
  }
}

/**
 * Tauri PDF Converter
 */
class TauriPdfConverter implements PdfConverter {
  /**
   * Analyze PDF without full conversion
   */
  async analyze(content: Uint8Array): Promise<PdfAnalysis> {
    // Write content to temp file and analyze
    const tempPath = `/tmp/flatpack-analyze-${Date.now()}.pdf`;
    await invoke("write_file", {
      path: tempPath,
      content: Array.from(content),
    });

    try {
      const info = await invoke<RustPdfInfo>("get_pdf_info", { path: tempPath });
      return {
        pageCount: info.pageCount,
        hasText: info.hasText,
        textRatio: info.hasText ? 0.5 : 0, // Estimated
        isScanned: !info.hasText,
        isProtected: false,
        requiresPassword: false,
        title: info.title ?? undefined,
        author: info.author ?? undefined,
      };
    } finally {
      // Clean up temp file
      await invoke("delete_path", { path: tempPath }).catch(() => {});
    }
  }

  /**
   * Extract text from PDF
   */
  async extractText(content: Uint8Array, _options?: ConversionOptions): Promise<ConversionResult> {
    // Write content to temp file and convert
    const tempPath = `/tmp/flatpack-convert-${Date.now()}.pdf`;
    await invoke("write_file", {
      path: tempPath,
      content: Array.from(content),
    });

    try {
      const result = await invoke<RustPdfConversionResult>("convert_pdf_to_markdown", {
        path: tempPath,
      });

      return successResult(
        result.markdown,
        result.wordCount,
        result.hasImages ? ["Document contains images that could not be extracted"] : [],
        {
          pageCount: result.pageCount,
          hasImages: result.hasImages,
        }
      );
    } catch (error) {
      return failureResult(
        `Failed to extract PDF text: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      // Clean up temp file
      await invoke("delete_path", { path: tempPath }).catch(() => {});
    }
  }

  /**
   * Check if OCR is available
   */
  hasOcrSupport(): boolean {
    // OCR support requires the optional "ocr" Rust feature
    return false;
  }
}

/**
 * Tauri Platform Adapter
 */
export class TauriAdapter implements PlatformAdapter {
  readonly capabilities = desktopCapabilities;

  private scanner = new TauriDirectoryScanner();
  private writer = new TauriOutputWriter();
  private pdfConverter = new TauriPdfConverter();

  getScanner(): DirectoryScanner {
    return this.scanner;
  }

  getWriter(): OutputWriter {
    return this.writer;
  }

  getPdfConverter(): PdfConverter {
    return this.pdfConverter;
  }

  async selectFolder(options?: DialogOptions): Promise<SelectionResult | null> {
    const selected = await open({
      directory: true,
      multiple: false,
      title: options?.title || "Select Folder",
      defaultPath: options?.defaultPath,
    });

    if (!selected) {
      return null;
    }

    const path = typeof selected === "string" ? selected : selected[0];
    const name = path.split(/[/\\]/).pop() || path;

    return {
      path,
      name,
      isDirectory: true,
    };
  }

  async selectFiles(options?: DialogOptions): Promise<SelectionResult[] | null> {
    const selected = await open({
      directory: false,
      multiple: options?.multiple ?? false,
      title: options?.title || "Select Files",
      defaultPath: options?.defaultPath,
      filters: options?.filters?.map((f) => ({
        name: f.name,
        extensions: f.extensions,
      })),
    });

    if (!selected) {
      return null;
    }

    const paths = Array.isArray(selected) ? selected : [selected];
    const results: SelectionResult[] = [];

    for (const path of paths) {
      const stat = await this.scanner.stat(path);
      const name = path.split(/[/\\]/).pop() || path;

      results.push({
        path,
        name,
        isDirectory: false,
        size: stat.size,
      });
    }

    return results;
  }

  async selectSavePath(options?: DialogOptions): Promise<string | null> {
    const selected = await save({
      title: options?.title || "Save As",
      defaultPath: options?.defaultPath,
      filters: options?.filters?.map((f) => ({
        name: f.name,
        extensions: f.extensions,
      })),
    });

    return selected || null;
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

  async delete(path: string): Promise<void> {
    await invoke("delete_path", { path });
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await this.writer.copyFile(source, destination);
  }
}

/**
 * Create and export singleton instance
 */
export const tauriAdapter = new TauriAdapter();
