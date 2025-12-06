/**
 * @flatpack/core planner
 */

// Tier optimizer
export type { TierAnalysis, OversizedFile, TierWarning } from "./tier-optimizer.js";
export { analyzeTierFit, recommendTier, calculateBundlingNeed } from "./tier-optimizer.js";

// Bundling strategy
export type { BundleCandidate, BundlingPlan } from "./bundling-strategy.js";
export {
  calculateBundles,
  optimizeBundlingPlan,
  hasDeepNestingWarning,
} from "./bundling-strategy.js";

// Naming resolver
export type { NamingCollision, NamingResult } from "./naming-resolver.js";
export {
  resolveNamingCollisions,
  wouldCollide,
  generateUniqueName,
  validateNamingScheme,
  createChunkNamingScheme,
} from "./naming-resolver.js";

// Preview generator
export type { PlanOptions } from "./preview-generator.js";
export { generateProcessingPlan, validatePlan } from "./preview-generator.js";
