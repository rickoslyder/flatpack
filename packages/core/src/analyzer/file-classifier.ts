/**
 * File classification system
 * Categorizes files into processing tiers
 */

import type { FileTier } from "../types/index.js";
import {
  EXTENSION_TIER_MAP,
  BINARY_EXTENSIONS,
} from "../constants/index.js";
import { getExtension } from "../utils/index.js";

/**
 * Result of file classification
 */
export interface ClassificationResult {
  /** Processing tier */
  tier: FileTier;
  /** Whether OCR is required */
  requiresOcr: boolean;
  /** Whether file can be processed */
  canProcess: boolean;
  /** Reason if cannot process */
  reason?: string;
  /** Suggested converter to use */
  converter?: string;
}

/**
 * Classify a file by its extension and properties
 */
export function classifyFile(
  path: string,
  size?: number,
  mimeType?: string
): ClassificationResult {
  const ext = getExtension(path).toLowerCase();

  // Check for binary/unsupported extensions first
  if (BINARY_EXTENSIONS.has(ext)) {
    return {
      tier: "unsupported",
      requiresOcr: false,
      canProcess: false,
      reason: `Binary file format (.${ext}) is not supported`,
    };
  }

  // Check extension tier map
  const tier = EXTENSION_TIER_MAP[ext];

  if (tier === "passthrough") {
    return {
      tier: "passthrough",
      requiresOcr: false,
      canProcess: true,
      converter: "text",
    };
  }

  if (tier === "conversion") {
    return {
      tier: "conversion",
      requiresOcr: false,
      canProcess: true,
      converter: getConverterForExtension(ext),
    };
  }

  if (tier === "ocr") {
    return {
      tier: "ocr",
      requiresOcr: true,
      canProcess: true,
      converter: "ocr",
    };
  }

  // No extension or unknown extension
  if (!ext) {
    // Try to detect from content or mime type
    if (mimeType?.startsWith("text/")) {
      return {
        tier: "passthrough",
        requiresOcr: false,
        canProcess: true,
        converter: "text",
      };
    }

    return {
      tier: "unsupported",
      requiresOcr: false,
      canProcess: false,
      reason: "File has no extension and cannot be classified",
    };
  }

  // Unknown extension - try to treat as text if small enough
  if (size !== undefined && size < 1024 * 1024) {
    // Under 1MB, try as text
    return {
      tier: "passthrough",
      requiresOcr: false,
      canProcess: true,
      converter: "text",
      reason: "Unknown extension, attempting as text",
    };
  }

  return {
    tier: "unsupported",
    requiresOcr: false,
    canProcess: false,
    reason: `Unknown file extension: .${ext}`,
  };
}

/**
 * Get the appropriate converter for a file extension
 */
function getConverterForExtension(ext: string): string {
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
    case "doc":
      return "docx";
    case "xlsx":
    case "xls":
      return "xlsx";
    case "pptx":
    case "ppt":
      return "pptx";
    case "html":
    case "htm":
      return "html";
    case "rtf":
      return "rtf";
    case "epub":
      return "epub";
    default:
      return "text";
  }
}

/**
 * Check if a file extension is supported
 */
export function isExtensionSupported(ext: string): boolean {
  const normalized = ext.toLowerCase().replace(/^\./, "");
  return (
    EXTENSION_TIER_MAP[normalized] !== undefined &&
    !BINARY_EXTENSIONS.has(normalized)
  );
}

/**
 * Get all supported extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_TIER_MAP);
}

/**
 * Get extensions by tier
 */
export function getExtensionsByTier(tier: FileTier): string[] {
  return Object.entries(EXTENSION_TIER_MAP)
    .filter(([_, t]) => t === tier)
    .map(([ext]) => ext);
}
