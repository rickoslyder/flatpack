/**
 * Naming resolver
 * Resolves filename collisions with numeric suffixes
 */

import type { PathSeparator } from "../types/index.js";
import { PATH_SEPARATORS } from "../constants/index.js";
import { getExtension } from "../utils/index.js";

/**
 * A naming collision
 */
export interface NamingCollision {
  /** Original proposed name */
  originalName: string;
  /** Files that collided */
  collidingPaths: string[];
  /** Resolved names for each path */
  resolvedNames: Map<string, string>;
}

/**
 * Result of naming resolution
 */
export interface NamingResult {
  /** Original path to final name mapping */
  nameMapping: Map<string, string>;
  /** Collisions that were resolved */
  collisions: NamingCollision[];
  /** Warning messages */
  warnings: string[];
}

/**
 * Resolve naming collisions for a set of proposed names
 */
export function resolveNamingCollisions(
  proposedNames: Map<string, string>, // path -> proposed name
  separator: PathSeparator = "underscore"
): NamingResult {
  const sep = PATH_SEPARATORS[separator];
  const nameMapping = new Map<string, string>();
  const collisions: NamingCollision[] = [];
  const warnings: string[] = [];

  // Group by proposed name (case-insensitive)
  const byName = new Map<string, string[]>();
  for (const [path, name] of proposedNames) {
    const lowerName = name.toLowerCase();
    const existing = byName.get(lowerName);
    if (existing) {
      existing.push(path);
    } else {
      byName.set(lowerName, [path]);
    }
  }

  // Track used names (case-insensitive)
  const usedNames = new Set<string>();

  // Process each group
  for (const [_lowerName, paths] of byName) {
    if (paths.length === 1) {
      // No collision
      const path = paths[0]!;
      const name = proposedNames.get(path)!;
      nameMapping.set(path, name);
      usedNames.add(name.toLowerCase());
    } else {
      // Collision - need to resolve
      const collision: NamingCollision = {
        originalName: proposedNames.get(paths[0]!)!,
        collidingPaths: paths,
        resolvedNames: new Map(),
      };

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i]!;
        const originalName = proposedNames.get(path)!;
        let resolvedName: string;

        if (i === 0) {
          // First file keeps original name
          resolvedName = originalName;
        } else {
          // Add numeric suffix
          resolvedName = addNumericSuffix(originalName, i, sep, usedNames);
        }

        nameMapping.set(path, resolvedName);
        usedNames.add(resolvedName.toLowerCase());
        collision.resolvedNames.set(path, resolvedName);
      }

      collisions.push(collision);
      warnings.push(
        `Naming collision: ${paths.length} files would have been named "${collision.originalName}"`
      );
    }
  }

  return { nameMapping, collisions, warnings };
}

/**
 * Add a numeric suffix to resolve collision
 */
function addNumericSuffix(
  name: string,
  index: number,
  separator: string,
  usedNames: Set<string>
): string {
  const ext = getExtension(name);
  const base = ext ? name.slice(0, -(ext.length + 1)) : name;
  const extension = ext ? `.${ext}` : "";

  let suffix = index;
  let newName: string;

  do {
    newName = `${base}${separator}${suffix}${extension}`;
    suffix++;
  } while (usedNames.has(newName.toLowerCase()));

  return newName;
}

/**
 * Check if a name would collide with existing names
 */
export function wouldCollide(
  name: string,
  existingNames: Set<string>
): boolean {
  return existingNames.has(name.toLowerCase());
}

/**
 * Generate a unique name
 */
export function generateUniqueName(
  baseName: string,
  existingNames: Set<string>,
  separator: string = "_"
): string {
  if (!wouldCollide(baseName, existingNames)) {
    return baseName;
  }

  const ext = getExtension(baseName);
  const base = ext ? baseName.slice(0, -(ext.length + 1)) : baseName;
  const extension = ext ? `.${ext}` : "";

  let counter = 1;
  let newName: string;

  do {
    newName = `${base}${separator}${counter}${extension}`;
    counter++;
  } while (wouldCollide(newName, existingNames));

  return newName;
}

/**
 * Validate a complete naming scheme
 */
export function validateNamingScheme(
  nameMapping: Map<string, string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const usedNames = new Set<string>();

  for (const [path, name] of nameMapping) {
    // Check for empty names
    if (!name || name.trim().length === 0) {
      errors.push(`Empty name for path: ${path}`);
      continue;
    }

    // Check for duplicate names (case-insensitive)
    const lowerName = name.toLowerCase();
    if (usedNames.has(lowerName)) {
      errors.push(`Duplicate name: ${name}`);
    }
    usedNames.add(lowerName);

    // Check for invalid characters
    if (/[<>:"/\\|?*]/.test(name)) {
      errors.push(`Invalid characters in name: ${name}`);
    }

    // Check length
    if (name.length > 255) {
      errors.push(`Name too long (${name.length} chars): ${name.slice(0, 50)}...`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a naming scheme for chunked files
 */
export function createChunkNamingScheme(
  baseName: string,
  chunkCount: number,
  existingNames: Set<string>,
  separator: string = "_"
): string[] {
  const ext = getExtension(baseName);
  const base = ext ? baseName.slice(0, -(ext.length + 1)) : baseName;
  const extension = ext ? `.${ext}` : ".md";

  const padLength = String(chunkCount).length;
  const names: string[] = [];
  const tempUsed = new Set(existingNames);

  for (let i = 1; i <= chunkCount; i++) {
    const partNum = String(i).padStart(padLength, "0");
    let name = `${base}${separator}Part${partNum}${extension}`;

    // Handle collisions
    if (wouldCollide(name, tempUsed)) {
      name = generateUniqueName(name, tempUsed, separator);
    }

    names.push(name);
    tempUsed.add(name.toLowerCase());
  }

  return names;
}
