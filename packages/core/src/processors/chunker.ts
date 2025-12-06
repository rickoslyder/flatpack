/**
 * Semantic chunker
 * Splits oversized files at semantic boundaries
 */

import { PROCESSING_LIMITS } from "../constants/index.js";
import { countWords } from "../utils/index.js";

/**
 * Options for chunking
 */
export interface ChunkingOptions {
  /** Maximum words per chunk */
  maxWords?: number;
  /** Overlap words between chunks */
  overlapWords?: number;
  /** Minimum words for a chunk to be valid */
  minWords?: number;
}

/**
 * A chunk of content
 */
export interface Chunk {
  /** Chunk content */
  content: string;
  /** Word count */
  wordCount: number;
  /** Start offset in original content */
  startOffset: number;
  /** End offset in original content */
  endOffset: number;
  /** Part number (1-indexed) */
  partNumber: number;
  /** Whether this chunk has overlap from previous */
  hasOverlap: boolean;
}

/**
 * Result of chunking operation
 */
export interface ChunkResult {
  /** Generated chunks */
  chunks: Chunk[];
  /** Total parts */
  totalParts: number;
  /** Original word count */
  originalWordCount: number;
  /** Whether chunking was needed */
  wasChunked: boolean;
}

/**
 * Split content into chunks at semantic boundaries
 */
export function chunkContent(content: string, options?: ChunkingOptions): ChunkResult {
  const maxWords = options?.maxWords || PROCESSING_LIMITS.CHUNK_THRESHOLD;
  const overlapWords = options?.overlapWords || PROCESSING_LIMITS.CHUNK_OVERLAP_WORDS;
  const minWords = options?.minWords || PROCESSING_LIMITS.MIN_CHUNK_WORDS;

  const originalWordCount = countWords(content);

  // Check if chunking is needed
  if (originalWordCount <= maxWords) {
    return {
      chunks: [{
        content,
        wordCount: originalWordCount,
        startOffset: 0,
        endOffset: content.length,
        partNumber: 1,
        hasOverlap: false,
      }],
      totalParts: 1,
      originalWordCount,
      wasChunked: false,
    };
  }

  // Find semantic boundaries
  const boundaries = findSemanticBoundaries(content);

  // Split at boundaries
  const chunks = splitAtBoundaries(content, boundaries, maxWords, overlapWords, minWords);

  return {
    chunks,
    totalParts: chunks.length,
    originalWordCount,
    wasChunked: true,
  };
}

/**
 * A potential split boundary
 */
interface Boundary {
  /** Position in content */
  position: number;
  /** Type of boundary */
  type: BoundaryType;
  /** Priority (higher = better split point) */
  priority: number;
}

type BoundaryType = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "hr" | "paragraph" | "blank" | "code";

/**
 * Find semantic boundaries in content
 */
export function findSemanticBoundaries(content: string): Boundary[] {
  const boundaries: Boundary[] = [];
  const lines = content.split("\n");
  let position = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // H1 - highest priority
    if (/^#\s+/.test(trimmed)) {
      boundaries.push({ position, type: "h1", priority: 100 });
    }
    // H2
    else if (/^##\s+/.test(trimmed)) {
      boundaries.push({ position, type: "h2", priority: 90 });
    }
    // H3
    else if (/^###\s+/.test(trimmed)) {
      boundaries.push({ position, type: "h3", priority: 80 });
    }
    // H4-H6
    else if (/^#{4,6}\s+/.test(trimmed)) {
      boundaries.push({ position, type: "h4", priority: 70 });
    }
    // Horizontal rule
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      boundaries.push({ position, type: "hr", priority: 85 });
    }
    // Code block start
    else if (/^```/.test(trimmed)) {
      boundaries.push({ position, type: "code", priority: 50 });
    }
    // Blank line (paragraph boundary)
    else if (trimmed === "" && i > 0) {
      boundaries.push({ position, type: "blank", priority: 30 });
    }

    position += line.length + 1; // +1 for newline
  }

  return boundaries;
}

/**
 * Split content at boundaries
 */
function splitAtBoundaries(
  content: string,
  boundaries: Boundary[],
  maxWords: number,
  overlapWords: number,
  minWords: number
): Chunk[] {
  const chunks: Chunk[] = [];

  // Sort boundaries by position
  boundaries.sort((a, b) => a.position - b.position);

  let chunkStart = 0;
  let lastGoodBoundary = 0;

  // Pre-calculate word positions (simplified - count words up to each position)
  const wordPositions = calculateWordPositions(content);

  for (const boundary of boundaries) {
    const wordsToHere = getWordCountAtPosition(wordPositions, boundary.position);
    const chunkWords = wordsToHere - getWordCountAtPosition(wordPositions, chunkStart);

    if (chunkWords >= maxWords) {
      // Need to split before this boundary
      const splitPoint = lastGoodBoundary > chunkStart ? lastGoodBoundary : boundary.position;

      chunks.push(createChunk(
        content,
        chunkStart,
        splitPoint,
        chunks.length + 1,
        chunks.length > 0
      ));

      // Start new chunk with overlap
      chunkStart = findOverlapStart(content, splitPoint, overlapWords);
    }

    // Remember this as a potential split point
    if (boundary.priority >= 30) {
      lastGoodBoundary = boundary.position;
    }
  }

  // Add final chunk
  if (chunkStart < content.length) {
    chunks.push(createChunk(
      content,
      chunkStart,
      content.length,
      chunks.length + 1,
      chunks.length > 0
    ));
  }

  // Merge small trailing chunks
  return mergeSmallChunks(chunks, minWords);
}

/**
 * Create a chunk object
 */
function createChunk(
  content: string,
  start: number,
  end: number,
  partNumber: number,
  hasOverlap: boolean
): Chunk {
  const chunkContent = content.slice(start, end).trim();
  return {
    content: chunkContent,
    wordCount: countWords(chunkContent),
    startOffset: start,
    endOffset: end,
    partNumber,
    hasOverlap,
  };
}

/**
 * Calculate word positions for fast lookup
 */
function calculateWordPositions(content: string): number[] {
  const positions: number[] = [];
  const words = content.match(/[\p{L}\p{N}]+/gu) || [];
  let pos = 0;

  for (const word of words) {
    pos = content.indexOf(word, pos);
    positions.push(pos);
    pos += word.length;
  }

  return positions;
}

/**
 * Get word count at a position
 */
function getWordCountAtPosition(positions: number[], position: number): number {
  let count = 0;
  for (const pos of positions) {
    if (pos < position) count++;
    else break;
  }
  return count;
}

/**
 * Find start position for overlap
 */
function findOverlapStart(content: string, splitPoint: number, overlapWords: number): number {
  // Move back to include overlap words
  let start = splitPoint;
  let wordsFound = 0;

  while (start > 0 && wordsFound < overlapWords) {
    start--;
    // Check if we're at a word boundary
    if (/[\p{L}\p{N}]/u.test(content[start]!) &&
        (start === 0 || !/[\p{L}\p{N}]/u.test(content[start - 1]!))) {
      wordsFound++;
    }
  }

  // Find start of the word
  while (start > 0 && /[\p{L}\p{N}]/u.test(content[start - 1]!)) {
    start--;
  }

  return start;
}

/**
 * Merge chunks that are too small
 */
function mergeSmallChunks(chunks: Chunk[], minWords: number): Chunk[] {
  if (chunks.length <= 1) return chunks;

  const result: Chunk[] = [];

  for (const chunk of chunks) {
    if (result.length === 0) {
      result.push(chunk);
      continue;
    }

    const lastChunk = result[result.length - 1]!;

    if (lastChunk.wordCount < minWords || chunk.wordCount < minWords) {
      // Merge with previous
      lastChunk.content = lastChunk.content + "\n\n" + chunk.content;
      lastChunk.wordCount = countWords(lastChunk.content);
      lastChunk.endOffset = chunk.endOffset;
    } else {
      result.push(chunk);
    }
  }

  // Renumber parts
  for (let i = 0; i < result.length; i++) {
    result[i]!.partNumber = i + 1;
  }

  return result;
}

/**
 * Check if content needs chunking
 */
export function needsChunking(content: string, maxWords?: number): boolean {
  const limit = maxWords || PROCESSING_LIMITS.CHUNK_THRESHOLD;
  return countWords(content) > limit;
}

/**
 * Estimate number of chunks needed
 */
export function estimateChunkCount(wordCount: number, maxWords?: number): number {
  const limit = maxWords || PROCESSING_LIMITS.CHUNK_THRESHOLD;
  if (wordCount <= limit) return 1;
  return Math.ceil(wordCount / (limit * 0.9)); // Account for overlap
}
