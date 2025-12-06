/**
 * Converter registry
 * Manages available converters and dispatches conversion requests
 */

import type { Converter, ConversionResult, ConversionOptions } from "./base-converter.js";
import { failureResult } from "./base-converter.js";
import { textConverter } from "./text-converter.js";
import { htmlConverter } from "./html-converter.js";
import { docxConverter } from "./docx-converter.js";
import { xlsxConverter } from "./xlsx-converter.js";
import { pptxConverter } from "./pptx-converter.js";
import { pdfConverter } from "./pdf-converter.js";
import { rtfConverter } from "./rtf-converter.js";
import { epubConverter } from "./epub-converter.js";
import { getExtension } from "../utils/index.js";

/**
 * Converter registry class
 */
export class ConverterRegistry {
  private converters = new Map<string, Converter>();
  private extensionMap = new Map<string, string>();

  constructor() {
    // Register built-in converters
    this.register(textConverter);
    this.register(htmlConverter);
    this.register(docxConverter);
    this.register(xlsxConverter);
    this.register(pptxConverter);
    this.register(pdfConverter);
    this.register(rtfConverter);
    this.register(epubConverter);
  }

  /**
   * Register a converter
   */
  register(converter: Converter): void {
    this.converters.set(converter.name, converter);

    for (const ext of converter.extensions) {
      this.extensionMap.set(ext.toLowerCase(), converter.name);
    }
  }

  /**
   * Unregister a converter
   */
  unregister(name: string): void {
    const converter = this.converters.get(name);
    if (converter) {
      for (const ext of converter.extensions) {
        this.extensionMap.delete(ext.toLowerCase());
      }
      this.converters.delete(name);
    }
  }

  /**
   * Get a converter by name
   */
  get(name: string): Converter | undefined {
    return this.converters.get(name);
  }

  /**
   * Get a converter for a file extension
   */
  getForExtension(ext: string): Converter | undefined {
    const name = this.extensionMap.get(ext.toLowerCase());
    return name ? this.converters.get(name) : undefined;
  }

  /**
   * Get a converter for a filename
   */
  getForFile(filename: string): Converter | undefined {
    const ext = getExtension(filename);
    return this.getForExtension(ext);
  }

  /**
   * Check if an extension is supported
   */
  supportsExtension(ext: string): boolean {
    return this.extensionMap.has(ext.toLowerCase());
  }

  /**
   * Get all registered converters
   */
  getAll(): Converter[] {
    return Array.from(this.converters.values());
  }

  /**
   * Get all supported extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }

  /**
   * Convert a file using the appropriate converter
   */
  async convert(
    content: Uint8Array,
    filename: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    const converter = this.getForFile(filename);

    if (!converter) {
      const ext = getExtension(filename);
      return failureResult(`No converter available for .${ext} files`);
    }

    return converter.convert(content, filename, options);
  }
}

/**
 * Default converter registry instance
 */
export const defaultRegistry = new ConverterRegistry();

/**
 * Convert a file using the default registry
 */
export async function convert(
  content: Uint8Array,
  filename: string,
  options?: ConversionOptions
): Promise<ConversionResult> {
  return defaultRegistry.convert(content, filename, options);
}

/**
 * Check if a file extension is convertible
 */
export function isConvertible(filename: string): boolean {
  return defaultRegistry.getForFile(filename) !== undefined;
}

/**
 * Get the converter name for a file
 */
export function getConverterName(filename: string): string | undefined {
  return defaultRegistry.getForFile(filename)?.name;
}
