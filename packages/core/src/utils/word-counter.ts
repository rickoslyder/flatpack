/**
 * Word counting utilities
 */

/**
 * Count words in a text string
 * Handles various text formats including code
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Normalize whitespace and remove code block markers
  let normalized = text
    .replace(/```[\s\S]*?```/g, (match) => {
      // Keep the content inside code blocks but remove the markers
      return match.replace(/```\w*\n?/g, " ").replace(/```/g, " ");
    })
    .replace(/`[^`]+`/g, (match) => match.slice(1, -1)); // Inline code

  // Remove common markdown syntax that shouldn't count as words
  normalized = normalized
    .replace(/^#+\s*/gm, "") // Headers
    .replace(/^\s*[-*+]\s+/gm, " ") // List markers
    .replace(/^\s*\d+\.\s+/gm, " ") // Numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links - keep text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // Images - remove
    .replace(/^>\s*/gm, "") // Blockquotes
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/__([^_]+)__/g, "$1") // Bold alt
    .replace(/_([^_]+)_/g, "$1") // Italic alt
    .replace(/~~([^~]+)~~/g, "$1"); // Strikethrough

  // Split on word boundaries
  // This regex matches sequences of word characters, including unicode
  const words = normalized.match(/[\p{L}\p{N}]+/gu);

  return words ? words.length : 0;
}

/**
 * Estimate word count from file size (for pre-analysis)
 * Uses average of ~5 characters per word for English text
 */
export function estimateWordCount(byteSize: number, encoding: string = "utf-8"): number {
  // Adjust for encoding (UTF-8 averages ~1 byte per char for ASCII text)
  const bytesPerChar = encoding.toLowerCase() === "utf-16" ? 2 : 1;
  const chars = byteSize / bytesPerChar;

  // Average word length + space ≈ 6 characters
  const avgCharsPerWord = 6;

  return Math.round(chars / avgCharsPerWord);
}

/**
 * Count words in code (handles camelCase, snake_case, etc.)
 */
export function countCodeWords(code: string): number {
  if (!code || code.trim().length === 0) {
    return 0;
  }

  // Remove comments (basic handling for common languages)
  let text = code
    .replace(/\/\*[\s\S]*?\*\//g, " ") // Block comments
    .replace(/\/\/.*$/gm, " ") // Line comments
    .replace(/#.*$/gm, " ") // Hash comments (Python, shell)
    .replace(/<!--[\s\S]*?-->/g, " "); // HTML comments

  // Remove string literals (basic handling)
  text = text
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");

  // Split camelCase and PascalCase
  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Split snake_case and kebab-case
  text = text.replace(/[_-]/g, " ");

  // Count words
  const words = text.match(/[\p{L}\p{N}]+/gu);

  return words ? words.length : 0;
}

/**
 * Word count result with breakdown
 */
export interface WordCountResult {
  /** Total word count */
  total: number;
  /** Word count in prose/text */
  prose: number;
  /** Word count in code blocks */
  code: number;
  /** Character count */
  characters: number;
  /** Line count */
  lines: number;
}

/**
 * Detailed word count with breakdown
 */
export function analyzeWordCount(text: string): WordCountResult {
  if (!text) {
    return {
      total: 0,
      prose: 0,
      code: 0,
      characters: text?.length ?? 0,
      lines: 0,
    };
  }

  const lines = text.split("\n").length;
  const characters = text.length;

  // Extract code blocks
  const codeBlocks: string[] = [];
  let proseText = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match.replace(/```\w*\n?/g, "").replace(/```/g, ""));
    return " ";
  });

  // Also handle indented code blocks (4 spaces or tab)
  proseText = proseText.replace(/^(?:    |\t).*$/gm, (match) => {
    codeBlocks.push(match);
    return " ";
  });

  const proseWords = countWords(proseText);
  const codeWords = codeBlocks.reduce((sum, block) => sum + countCodeWords(block), 0);

  return {
    total: proseWords + codeWords,
    prose: proseWords,
    code: codeWords,
    characters,
    lines,
  };
}

/**
 * Check if word count exceeds a limit
 */
export function exceedsLimit(wordCount: number, limit: number): boolean {
  return wordCount > limit;
}

/**
 * Calculate percentage of limit used
 */
export function limitUsagePercent(wordCount: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (wordCount / limit) * 100);
}
