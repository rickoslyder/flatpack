//! Ignore pattern handling

use ignore::gitignore::GitignoreBuilder;
use std::path::Path;

/// Default ignore patterns
pub const DEFAULT_IGNORE_PATTERNS: &[&str] = &[
    // Version control
    ".git",
    ".svn",
    ".hg",
    ".bzr",
    // Dependencies
    "node_modules",
    "vendor",
    "target",
    ".cargo",
    "__pycache__",
    ".venv",
    "venv",
    ".env",
    // Build outputs
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    // IDEs and editors
    ".idea",
    ".vscode",
    "*.swp",
    "*.swo",
    "*~",
    // OS files
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    // Logs and caches
    "*.log",
    ".cache",
    ".tmp",
    // Lock files (often large and not useful for context)
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Cargo.lock",
    "poetry.lock",
    "Gemfile.lock",
];

/// Check if a path should be ignored
pub fn should_ignore(path: &Path, custom_patterns: &[String]) -> bool {
    let path_str = path.to_string_lossy();

    // Check default patterns
    for pattern in DEFAULT_IGNORE_PATTERNS {
        if matches_pattern(&path_str, pattern) {
            return true;
        }
    }

    // Check custom patterns
    for pattern in custom_patterns {
        if matches_pattern(&path_str, pattern) {
            return true;
        }
    }

    false
}

/// Simple pattern matching (supports * wildcard at start/end)
fn matches_pattern(path: &str, pattern: &str) -> bool {
    let path_lower = path.to_lowercase();
    let pattern_lower = pattern.to_lowercase();

    if pattern_lower.starts_with('*') && pattern_lower.ends_with('*') {
        // *pattern* - contains
        let needle = &pattern_lower[1..pattern_lower.len() - 1];
        path_lower.contains(needle)
    } else if pattern_lower.starts_with('*') {
        // *pattern - ends with
        let suffix = &pattern_lower[1..];
        path_lower.ends_with(suffix)
    } else if pattern_lower.ends_with('*') {
        // pattern* - starts with
        let prefix = &pattern_lower[..pattern_lower.len() - 1];
        path_lower.starts_with(prefix)
    } else {
        // Exact match or component match
        path_lower == pattern_lower
            || path_lower.ends_with(&format!("/{}", pattern_lower))
            || path_lower.ends_with(&format!("\\{}", pattern_lower))
            || path_lower.contains(&format!("/{}/", pattern_lower))
            || path_lower.contains(&format!("\\{}\\", pattern_lower))
    }
}

/// Build a gitignore matcher from patterns
pub fn build_ignore_matcher(root: &Path, patterns: &[String]) -> Option<ignore::gitignore::Gitignore> {
    let mut builder = GitignoreBuilder::new(root);

    // Add default patterns
    for pattern in DEFAULT_IGNORE_PATTERNS {
        let _ = builder.add_line(None, pattern);
    }

    // Add custom patterns
    for pattern in patterns {
        let _ = builder.add_line(None, pattern);
    }

    builder.build().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_pattern() {
        assert!(matches_pattern("project/node_modules/package", "node_modules"));
        assert!(matches_pattern("test.log", "*.log"));
        assert!(matches_pattern(".DS_Store", ".DS_Store"));
        assert!(!matches_pattern("src/main.rs", "node_modules"));
    }

    #[test]
    fn test_should_ignore() {
        assert!(should_ignore(Path::new("project/node_modules/file.js"), &[]));
        assert!(should_ignore(Path::new(".git/config"), &[]));
        assert!(!should_ignore(Path::new("src/main.rs"), &[]));

        // Custom patterns
        let custom = vec!["custom_ignore".to_string()];
        assert!(should_ignore(Path::new("custom_ignore/file.txt"), &custom));
    }
}
