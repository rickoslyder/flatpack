/**
 * Type declarations for optional dependencies
 * These are dynamically imported at runtime and may not be installed
 */

declare module "mammoth" {
  interface MammothResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  interface MammothOptions {
    styleMap?: string[];
  }

  export function convertToMarkdown(
    input: { arrayBuffer: ArrayBuffer },
    options?: MammothOptions
  ): Promise<MammothResult>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer }
  ): Promise<{ value: string }>;
}

declare module "jszip" {
  interface JSZipFile {
    async(type: "string"): Promise<string>;
    async(type: "arraybuffer"): Promise<ArrayBuffer>;
    async(type: "uint8array"): Promise<Uint8Array>;
  }

  interface JSZipInstance {
    files: Record<string, JSZipFile>;
    file(path: string): JSZipFile | null;
  }

  export default class JSZip {
    static loadAsync(data: ArrayBuffer | Uint8Array): Promise<JSZipInstance>;
  }
}

declare module "xlsx" {
  interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  interface WorkSheet {
    [key: string]: CellObject | unknown;
  }

  interface CellObject {
    t: string;
    v: unknown;
    w?: string;
  }

  interface ReadOpts {
    type?: string;
  }

  interface SheetToJsonOpts {
    header?: number | string;
    raw?: boolean;
  }

  export function read(data: ArrayBuffer | Uint8Array, opts?: ReadOpts): WorkBook;

  export const utils: {
    sheet_to_json<T>(sheet: WorkSheet, opts?: SheetToJsonOpts): T[];
    decode_range(range: string): {
      s: { r: number; c: number };
      e: { r: number; c: number };
    };
  };
}

declare module "pdfjs-dist" {
  interface PdfLoadingTask {
    promise: Promise<PdfDocument>;
  }

  interface PdfDocument {
    numPages: number;
    getPage(num: number): Promise<PdfPage>;
  }

  interface PdfPage {
    getTextContent(): Promise<{ items: TextItem[] }>;
  }

  interface TextItem {
    str: string;
  }

  interface GetDocumentParams {
    data: Uint8Array;
  }

  export function getDocument(params: GetDocumentParams): PdfLoadingTask;
}
