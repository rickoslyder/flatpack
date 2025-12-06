/**
 * @flatpack/core converters
 */

// Base types
export type {
  ConversionResult,
  ConversionMetadata,
  ConversionOptions,
  Converter,
} from "./base-converter.js";
export { successResult, failureResult } from "./base-converter.js";

// Individual converters
export { textConverter, convertText } from "./text-converter.js";
export { htmlConverter, convertHtml } from "./html-converter.js";
export { docxConverter, convertDocx } from "./docx-converter.js";
export { xlsxConverter, convertXlsx } from "./xlsx-converter.js";
export { pptxConverter, convertPptx } from "./pptx-converter.js";
export { rtfConverter, convertRtf } from "./rtf-converter.js";
export { epubConverter, convertEpub } from "./epub-converter.js";

// PDF converter (platform-specific)
export type { PdfAnalysis, PdfConverter } from "./pdf-converter.js";
export { pdfConverter, convertPdf, extractPdfTextBasic } from "./pdf-converter.js";

// Converter registry
export {
  ConverterRegistry,
  defaultRegistry,
  convert,
  isConvertible,
  getConverterName,
} from "./converter-registry.js";
