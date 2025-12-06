/**
 * Glob pattern matching utility
 * Implements micromatch-compatible glob matching without external dependencies
 */

import { normalizePath } from "./path-utils.js";

/**
 * Glob matcher class for matching file paths against patterns
 */
export class GlobMatcher {
  private patterns: CompiledPattern[];

  constructor(patterns: string[]) {
    this.patterns = patterns.map((p) => compilePattern(p));
  }

  /**
   * Check if a path matches any of the patterns
   */
  matches(path: string): boolean {
    const normalizedPath = normalizePath(path);

    for (const pattern of this.patterns) {
      if (pattern.regex.test(normalizedPath)) {
        return !pattern.negated;
      }
    }

    return false;
  }

  /**
   * Filter an array of paths, returning only those that match
   */
  filter(paths: string[]): string[] {
    return paths.filter((p) => this.matches(p));
  }

  /**
   * Filter an array of paths, returning only those that don't match
   */
  exclude(paths: string[]): string[] {
    return paths.filter((p) => !this.matches(p));
  }
}

interface CompiledPattern {
  original: string;
  regex: RegExp;
  negated: boolean;
}

/**
 * Compile a glob pattern to a regex
 */
function compilePattern(pattern: string): CompiledPattern {
  let negated = false;
  let p = pattern;

  // Handle negation
  if (p.startsWith("!")) {
    negated = true;
    p = p.slice(1);
  }

  // Normalize the pattern
  p = normalizePath(p);

  // Convert glob to regex
  const regex = globToRegex(p);

  return {
    original: pattern,
    regex,
    negated,
  };
}

/**
 * Convert a glob pattern to a regex
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = "";
  let i = 0;

  // If pattern doesn't start with /, it can match anywhere in path
  const anchored = pattern.startsWith("/");
  if (anchored) {
    pattern = pattern.slice(1);
  }

  while (i < pattern.length) {
    const char = pattern[i]!;
    const next = pattern[i + 1];

    switch (char) {
      case "*":
        if (next === "*") {
          // ** matches any path segments
          if (pattern[i + 2] === "/") {
            // **/
            regexStr += "(?:.*\\/)?";
            i += 3;
          } else if (i + 2 >= pattern.length) {
            // ** at end
            regexStr += ".*";
            i += 2;
          } else {
            // ** followed by something else
            regexStr += ".*";
            i += 2;
          }
        } else {
          // * matches anything except /
          regexStr += "[^/]*";
          i++;
        }
        break;

      case "?":
        // ? matches single char except /
        regexStr += "[^/]";
        i++;
        break;

      case "[": {
        // Character class
        const closeIndex = pattern.indexOf("]", i + 1);
        if (closeIndex === -1) {
          regexStr += escapeRegex(char);
          i++;
        } else {
          const charClass = pattern.slice(i, closeIndex + 1);
          regexStr += charClass;
          i = closeIndex + 1;
        }
        break;
      }

      case "{": {
        // Brace expansion
        const closeBrace = pattern.indexOf("}", i + 1);
        if (closeBrace === -1) {
          regexStr += escapeRegex(char);
          i++;
        } else {
          const options = pattern.slice(i + 1, closeBrace).split(",");
          regexStr += "(?:" + options.map(escapeRegex).join("|") + ")";
          i = closeBrace + 1;
        }
        break;
      }

      default:
        // Escape regex special chars
        regexStr += escapeRegex(char);
        i++;
    }
  }

  // If not anchored, allow matching anywhere in path
  const prefix = anchored ? "^" : "(?:^|/)";

  // Allow matching directories (with or without trailing content)
  const suffix = "(?:/.*)?$";

  return new RegExp(prefix + regexStr + suffix, "i");
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Create a matcher from a list of patterns
 */
export function createMatcher(patterns: string[]): GlobMatcher {
  return new GlobMatcher(patterns);
}

/**
 * Check if a path matches a single pattern
 */
export function matchesPattern(path: string, pattern: string): boolean {
  return new GlobMatcher([pattern]).matches(path);
}

/**
 * Check if a path matches any of the patterns
 */
export function matchesAny(path: string, patterns: string[]): boolean {
  return new GlobMatcher(patterns).matches(path);
}
