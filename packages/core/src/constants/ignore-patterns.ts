/**
 * Default ignore patterns for file scanning
 */

/** Default patterns to ignore during scanning */
export const DEFAULT_IGNORE_PATTERNS: readonly string[] = [
  // Version control
  ".git",
  ".git/**",
  ".svn",
  ".svn/**",
  ".hg",
  ".hg/**",

  // Package managers
  "node_modules",
  "node_modules/**",
  ".pnpm-store",
  ".pnpm-store/**",
  "vendor",
  "vendor/**",

  // Python
  "__pycache__",
  "__pycache__/**",
  "*.pyc",
  "*.pyo",
  ".venv",
  ".venv/**",
  "venv",
  "venv/**",
  ".env",
  ".env/**",

  // Build outputs
  "dist",
  "dist/**",
  "build",
  "build/**",
  "out",
  "out/**",
  "target",
  "target/**",

  // IDE/Editor
  ".idea",
  ".idea/**",
  ".vscode",
  ".vscode/**",
  "*.swp",
  "*.swo",
  "*~",

  // OS files
  ".DS_Store",
  ".DS_Store?",
  "._*",
  ".Spotlight-V100",
  ".Trashes",
  "Thumbs.db",
  "desktop.ini",

  // Logs
  "*.log",
  "logs",
  "logs/**",

  // Environment and secrets
  ".env.local",
  ".env.*.local",
  "*.pem",
  "*.key",

  // Coverage and test
  "coverage",
  "coverage/**",
  ".nyc_output",
  ".nyc_output/**",

  // Misc
  ".turbo",
  ".turbo/**",
  ".next",
  ".next/**",
  ".nuxt",
  ".nuxt/**",
  ".cache",
  ".cache/**",
] as const;

/** Patterns that should never be modified by user */
export const PROTECTED_IGNORE_PATTERNS: readonly string[] = [
  ".git",
  ".git/**",
] as const;
