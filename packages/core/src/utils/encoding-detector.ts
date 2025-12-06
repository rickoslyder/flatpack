/**
 * File encoding detection utilities
 */

/**
 * Detected encoding information
 */
export interface EncodingInfo {
  /** Detected encoding name */
  encoding: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Whether the file appears to be binary */
  isBinary: boolean;
  /** Byte Order Mark if present */
  bom?: "utf-8" | "utf-16-le" | "utf-16-be" | "utf-32-le" | "utf-32-be";
}

/**
 * Detect the encoding of a buffer
 */
export function detectEncoding(buffer: Uint8Array): EncodingInfo {
  // Check for BOM first
  const bom = detectBom(buffer);
  if (bom) {
    return {
      encoding: bomToEncoding(bom),
      confidence: 1.0,
      isBinary: false,
      bom,
    };
  }

  // Check if binary
  if (isBinaryContent(buffer)) {
    return {
      encoding: "binary",
      confidence: 0.9,
      isBinary: true,
    };
  }

  // Try to detect encoding heuristically
  const utf8Result = isValidUtf8(buffer);
  if (utf8Result.valid) {
    return {
      encoding: "utf-8",
      confidence: utf8Result.confidence,
      isBinary: false,
    };
  }

  // Check for ISO-8859-1 / Latin-1 (common fallback)
  if (isLikelyLatin1(buffer)) {
    return {
      encoding: "iso-8859-1",
      confidence: 0.6,
      isBinary: false,
    };
  }

  // Default to UTF-8 with low confidence
  return {
    encoding: "utf-8",
    confidence: 0.3,
    isBinary: false,
  };
}

/**
 * Detect Byte Order Mark
 */
function detectBom(
  buffer: Uint8Array
): "utf-8" | "utf-16-le" | "utf-16-be" | "utf-32-le" | "utf-32-be" | undefined {
  if (buffer.length >= 4) {
    // UTF-32 LE
    if (buffer[0] === 0xff && buffer[1] === 0xfe && buffer[2] === 0x00 && buffer[3] === 0x00) {
      return "utf-32-le";
    }
    // UTF-32 BE
    if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xfe && buffer[3] === 0xff) {
      return "utf-32-be";
    }
  }

  if (buffer.length >= 3) {
    // UTF-8
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return "utf-8";
    }
  }

  if (buffer.length >= 2) {
    // UTF-16 LE
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return "utf-16-le";
    }
    // UTF-16 BE
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return "utf-16-be";
    }
  }

  return undefined;
}

/**
 * Convert BOM type to encoding name
 */
function bomToEncoding(
  bom: "utf-8" | "utf-16-le" | "utf-16-be" | "utf-32-le" | "utf-32-be"
): string {
  switch (bom) {
    case "utf-8":
      return "utf-8";
    case "utf-16-le":
    case "utf-16-be":
      return "utf-16";
    case "utf-32-le":
    case "utf-32-be":
      return "utf-32";
  }
}

/**
 * Check if content appears to be binary
 */
function isBinaryContent(buffer: Uint8Array): boolean {
  // Check first 8KB for binary indicators
  const checkLength = Math.min(buffer.length, 8192);
  let nullCount = 0;
  let controlCount = 0;

  for (let i = 0; i < checkLength; i++) {
    const byte = buffer[i]!;

    // NULL byte is strong binary indicator
    if (byte === 0x00) {
      nullCount++;
      if (nullCount > 1) {
        return true;
      }
    }

    // Control characters (except common ones like tab, newline)
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
      controlCount++;
    }
  }

  // If more than 10% control characters, likely binary
  return controlCount / checkLength > 0.1;
}

/**
 * Validate UTF-8 encoding
 */
function isValidUtf8(buffer: Uint8Array): { valid: boolean; confidence: number } {
  let i = 0;
  let multiByte = 0;
  let totalMultiByte = 0;

  while (i < buffer.length) {
    const byte = buffer[i]!;

    if (byte <= 0x7f) {
      // ASCII
      i++;
    } else if ((byte & 0xe0) === 0xc0) {
      // 2-byte sequence
      if (i + 1 >= buffer.length || (buffer[i + 1]! & 0xc0) !== 0x80) {
        return { valid: false, confidence: 0 };
      }
      i += 2;
      multiByte++;
      totalMultiByte += 2;
    } else if ((byte & 0xf0) === 0xe0) {
      // 3-byte sequence
      if (
        i + 2 >= buffer.length ||
        (buffer[i + 1]! & 0xc0) !== 0x80 ||
        (buffer[i + 2]! & 0xc0) !== 0x80
      ) {
        return { valid: false, confidence: 0 };
      }
      i += 3;
      multiByte++;
      totalMultiByte += 3;
    } else if ((byte & 0xf8) === 0xf0) {
      // 4-byte sequence
      if (
        i + 3 >= buffer.length ||
        (buffer[i + 1]! & 0xc0) !== 0x80 ||
        (buffer[i + 2]! & 0xc0) !== 0x80 ||
        (buffer[i + 3]! & 0xc0) !== 0x80
      ) {
        return { valid: false, confidence: 0 };
      }
      i += 4;
      multiByte++;
      totalMultiByte += 4;
    } else {
      // Invalid UTF-8 start byte
      return { valid: false, confidence: 0 };
    }
  }

  // Calculate confidence based on multi-byte character ratio
  // Pure ASCII is still valid UTF-8 but lower confidence
  const confidence = multiByte > 0 ? 0.95 : 0.7;

  return { valid: true, confidence };
}

/**
 * Check if content is likely Latin-1
 */
function isLikelyLatin1(buffer: Uint8Array): boolean {
  // Latin-1 uses bytes 0x00-0xFF
  // If we see bytes in 0x80-0xFF that aren't valid UTF-8, it's likely Latin-1
  for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
    const byte = buffer[i]!;
    // Latin-1 printable range extends to 0xFF
    if (byte >= 0x80 && byte <= 0xff) {
      return true;
    }
  }
  return false;
}

/**
 * Decode content with detected or specified encoding
 */
export function decodeContent(buffer: Uint8Array, encoding?: string): string {
  const detectedEncoding = encoding || detectEncoding(buffer).encoding;

  // Use TextDecoder for standard encodings
  try {
    const decoder = new TextDecoder(detectedEncoding, { fatal: false });
    return decoder.decode(buffer);
  } catch {
    // Fallback to UTF-8
    const decoder = new TextDecoder("utf-8", { fatal: false });
    return decoder.decode(buffer);
  }
}

/**
 * Remove BOM from string if present
 */
export function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Get BOM bytes for an encoding
 */
export function getBomBytes(
  encoding: "utf-8" | "utf-16-le" | "utf-16-be"
): Uint8Array {
  switch (encoding) {
    case "utf-8":
      return new Uint8Array([0xef, 0xbb, 0xbf]);
    case "utf-16-le":
      return new Uint8Array([0xff, 0xfe]);
    case "utf-16-be":
      return new Uint8Array([0xfe, 0xff]);
  }
}
