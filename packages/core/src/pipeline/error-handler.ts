/**
 * Error handling and recovery
 */

import type {
  FlatpackError,
  FlatpackErrorCode,
  ErrorSeverity,
  ErrorAction,
  ProcessingError,
  ErrorContext,
} from "../types/index.js";

/**
 * Normalize an error to ProcessingError format
 */
export function normalizeError(
  error: unknown,
  filePath?: string
): ProcessingError {
  if (error instanceof Error) {
    // Check if it's already a FlatpackError
    if ("code" in error && "severity" in error) {
      const flatpackError = error as FlatpackError;
      return {
        code: flatpackError.code,
        message: flatpackError.message,
        severity: flatpackError.severity,
        filePath: flatpackError.filePath || filePath,
        stack: flatpackError.stack,
        timestamp: new Date(),
        recoverable: isRecoverable(flatpackError.code),
        suggestedActions: getSuggestedActions(flatpackError.code),
      };
    }

    // Regular Error
    return {
      code: inferErrorCode(error),
      message: error.message,
      severity: "error",
      filePath,
      stack: error.stack,
      timestamp: new Date(),
      recoverable: true,
      suggestedActions: ["skip", "retry"],
    };
  }

  // Unknown error type
  return {
    code: "UNKNOWN",
    message: String(error),
    severity: "error",
    filePath,
    timestamp: new Date(),
    recoverable: true,
    suggestedActions: ["skip", "retry", "abort"],
  };
}

/**
 * Infer error code from error message
 */
function inferErrorCode(error: Error): FlatpackErrorCode {
  const message = error.message.toLowerCase();

  if (message.includes("not found") || message.includes("enoent")) {
    return "FILE_NOT_FOUND";
  }
  if (message.includes("permission") || message.includes("eacces")) {
    return "PERMISSION_DENIED";
  }
  if (message.includes("disk full") || message.includes("enospc")) {
    return "DISK_FULL";
  }
  if (message.includes("path too long") || message.includes("enametoolong")) {
    return "PATH_TOO_LONG";
  }
  if (message.includes("protected") || message.includes("encrypted")) {
    return "COPY_PROTECTED";
  }
  if (message.includes("corrupt")) {
    return "CORRUPTED_FILE";
  }
  if (message.includes("encoding")) {
    return "ENCODING_ERROR";
  }
  if (message.includes("conversion") || message.includes("convert")) {
    return "CONVERSION_FAILED";
  }
  if (message.includes("ocr")) {
    return "OCR_FAILED";
  }
  if (message.includes("timeout")) {
    return "TIMEOUT";
  }
  if (message.includes("memory") || message.includes("heap")) {
    return "OUT_OF_MEMORY";
  }

  return "UNKNOWN";
}

/**
 * Check if an error is recoverable
 */
export function isRecoverable(code: FlatpackErrorCode): boolean {
  const unrecoverable: FlatpackErrorCode[] = [
    "DISK_FULL",
    "OUT_OF_MEMORY",
  ];
  return !unrecoverable.includes(code);
}

/**
 * Get suggested actions for an error
 */
export function getSuggestedActions(code: FlatpackErrorCode): ErrorAction[] {
  switch (code) {
    case "DISK_FULL":
    case "OUT_OF_MEMORY":
      return ["abort"];

    case "COPY_PROTECTED":
    case "CORRUPTED_FILE":
    case "UNSUPPORTED_FORMAT":
      return ["skip"];

    case "FILE_NOT_FOUND":
    case "PERMISSION_DENIED":
    case "TIMEOUT":
      return ["skip", "retry"];

    case "CONVERSION_FAILED":
    case "OCR_FAILED":
    case "ENCODING_ERROR":
      return ["skip", "retry"];

    default:
      return ["skip", "retry", "abort"];
  }
}

/**
 * Create error context for UI display
 */
export function createErrorContext(
  error: ProcessingError,
  progress?: number,
  currentFile?: string
): ErrorContext {
  return {
    error,
    currentFile: currentFile || error.filePath,
    progress,
    actions: error.suggestedActions,
  };
}

/**
 * Error collector for batch processing
 */
export class ErrorCollector {
  private errors: ProcessingError[] = [];
  private maxErrors: number;

  constructor(maxErrors: number = 100) {
    this.maxErrors = maxErrors;
  }

  /**
   * Add an error
   */
  add(error: unknown, filePath?: string): void {
    if (this.errors.length >= this.maxErrors) {
      return; // Prevent memory issues with too many errors
    }
    this.errors.push(normalizeError(error, filePath));
  }

  /**
   * Get all errors
   */
  getAll(): ProcessingError[] {
    return [...this.errors];
  }

  /**
   * Get errors by severity
   */
  getBySeverity(severity: ErrorSeverity): ProcessingError[] {
    return this.errors.filter((e) => e.severity === severity);
  }

  /**
   * Get error count
   */
  get count(): number {
    return this.errors.length;
  }

  /**
   * Check if any critical errors
   */
  hasCritical(): boolean {
    return this.errors.some((e) => e.severity === "critical");
  }

  /**
   * Check if should abort
   */
  shouldAbort(): boolean {
    return this.errors.some((e) => !e.recoverable);
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Get summary
   */
  getSummary(): {
    total: number;
    byCode: Record<string, number>;
    bySeverity: Record<string, number>;
    recoverable: number;
    unrecoverable: number;
  } {
    const byCode: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let recoverable = 0;
    let unrecoverable = 0;

    for (const error of this.errors) {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;

      if (error.recoverable) {
        recoverable++;
      } else {
        unrecoverable++;
      }
    }

    return {
      total: this.errors.length,
      byCode,
      bySeverity,
      recoverable,
      unrecoverable,
    };
  }
}

/**
 * Retry wrapper for operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const normalized = normalizeError(error);
      if (!normalized.recoverable) {
        throw error;
      }

      // Wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
