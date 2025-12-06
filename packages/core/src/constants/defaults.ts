/**
 * Default configuration values
 */

import type { FlatpackConfig } from "../types/index.js";
import { DEFAULT_IGNORE_PATTERNS } from "./ignore-patterns.js";
import { PROCESSING_LIMITS } from "./limits.js";

/** Default Flatpack configuration */
export const DEFAULT_CONFIG: FlatpackConfig = {
  tier: "pro",
  pathSeparator: "underscore",
  ignorePatterns: [...DEFAULT_IGNORE_PATTERNS],
  pdfHandling: "convert",
  softWarningThreshold: PROCESSING_LIMITS.DEFAULT_SOFT_WARNING,
  ocrLanguage: "eng",
  errorHandlingMode: "pause",
  outputLocation: undefined,
  theme: "system",
};

/** Manifest version */
export const MANIFEST_VERSION = "1.0.0";

/** Output file names */
export const OUTPUT_FILES = {
  MANIFEST: "FLATPACK_MANIFEST.json",
  MASTER_STRUCTURE: "00_MASTER_STRUCTURE.md",
  FAILURES_FOLDER: "_failures",
  FAILURES_REPORT: "FAILURES.md",
} as const;

/** Supported path separators */
export const PATH_SEPARATORS = {
  underscore: "_",
  hyphen: "-",
} as const;
