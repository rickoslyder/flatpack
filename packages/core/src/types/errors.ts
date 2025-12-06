/**
 * Error types
 */

/** Error codes for Flatpack errors */
export type FlatpackErrorCode =
  // File system errors
  | "FILE_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "DISK_FULL"
  | "PATH_TOO_LONG"
  // Processing errors
  | "CONVERSION_FAILED"
  | "ENCODING_ERROR"
  | "COPY_PROTECTED"
  | "CORRUPTED_FILE"
  | "UNSUPPORTED_FORMAT"
  | "OCR_FAILED"
  | "CHUNK_FAILED"
  | "MERGE_FAILED"
  // Limit errors
  | "EXCEEDS_WORD_LIMIT"
  | "EXCEEDS_SIZE_LIMIT"
  | "EXCEEDS_SOURCE_LIMIT"
  // System errors
  | "OUT_OF_MEMORY"
  | "TIMEOUT"
  | "UNKNOWN";

/** Severity of the error */
export type ErrorSeverity = "warning" | "error" | "critical";

/** User action options for error handling */
export type ErrorAction = "skip" | "retry" | "abort";

/** Base Flatpack error */
export class FlatpackError extends Error {
  code: FlatpackErrorCode;
  severity: ErrorSeverity;
  filePath?: string;
  cause?: Error;

  constructor(
    message: string,
    code: FlatpackErrorCode,
    severity: ErrorSeverity = "error",
    filePath?: string,
    cause?: Error
  ) {
    super(message);
    this.name = "FlatpackError";
    this.code = code;
    this.severity = severity;
    this.filePath = filePath;
    this.cause = cause;
  }
}

/** Processing error with context */
export interface ProcessingError {
  /** Error code */
  code: FlatpackErrorCode;
  /** Error message */
  message: string;
  /** Severity level */
  severity: ErrorSeverity;
  /** Affected file path */
  filePath?: string;
  /** Stack trace if available */
  stack?: string;
  /** Timestamp */
  timestamp: Date;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Suggested actions */
  suggestedActions: ErrorAction[];
}

/** Error context for UI display */
export interface ErrorContext {
  /** The error */
  error: ProcessingError;
  /** File being processed when error occurred */
  currentFile?: string;
  /** Progress at time of error */
  progress?: number;
  /** Available actions */
  actions: ErrorAction[];
}
