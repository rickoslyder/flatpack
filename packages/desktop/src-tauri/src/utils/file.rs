//! File utility functions

use std::path::Path;

/// Get file extension from path
pub fn get_extension(path: &Path) -> String {
    path.extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

/// Get file name without extension
pub fn get_stem(path: &Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// Flatten a path by replacing separators with underscores
pub fn flatten_path(path: &str, separator: &str) -> String {
    path.replace(['/', '\\'], separator)
}

/// Determine file format tier based on extension
pub fn get_format_tier(extension: &str) -> u8 {
    match extension.to_lowercase().as_str() {
        // Tier 1: Passthrough (already text-based)
        "txt" | "md" | "markdown" | "json" | "yaml" | "yml" | "csv" | "tsv" | "xml" | "log"
        | "rs" | "py" | "js" | "ts" | "jsx" | "tsx" | "go" | "java" | "c" | "cpp" | "h" | "hpp"
        | "cs" | "rb" | "php" | "swift" | "kt" | "scala" | "sh" | "bash" | "zsh" | "fish"
        | "ps1" | "bat" | "cmd" | "sql" | "graphql" | "css" | "scss" | "sass" | "less"
        | "toml" | "ini" | "cfg" | "conf" | "env" => 1,

        // Tier 2: Conversion required
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "odt" | "ods" | "odp"
        | "rtf" | "html" | "htm" | "epub" | "mobi" => 2,

        // Tier 3: OCR required
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "tiff" | "tif" | "webp" | "heic" | "heif" => 3,

        // Unknown/unsupported
        _ => 0,
    }
}

/// Get language identifier for syntax highlighting
pub fn get_language_id(extension: &str) -> &'static str {
    match extension.to_lowercase().as_str() {
        "rs" => "rust",
        "py" => "python",
        "js" => "javascript",
        "ts" => "typescript",
        "jsx" => "jsx",
        "tsx" => "tsx",
        "go" => "go",
        "java" => "java",
        "c" => "c",
        "cpp" | "cc" | "cxx" => "cpp",
        "h" | "hpp" => "cpp",
        "cs" => "csharp",
        "rb" => "ruby",
        "php" => "php",
        "swift" => "swift",
        "kt" | "kts" => "kotlin",
        "scala" => "scala",
        "sh" | "bash" => "bash",
        "zsh" => "zsh",
        "fish" => "fish",
        "ps1" => "powershell",
        "bat" | "cmd" => "batch",
        "sql" => "sql",
        "graphql" | "gql" => "graphql",
        "css" => "css",
        "scss" => "scss",
        "sass" => "sass",
        "less" => "less",
        "html" | "htm" => "html",
        "xml" => "xml",
        "json" => "json",
        "yaml" | "yml" => "yaml",
        "toml" => "toml",
        "ini" | "cfg" | "conf" => "ini",
        "md" | "markdown" => "markdown",
        _ => "text",
    }
}

/// Format file size for display
pub fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_get_extension() {
        assert_eq!(get_extension(Path::new("test.txt")), "txt");
        assert_eq!(get_extension(Path::new("test.PDF")), "pdf");
        assert_eq!(get_extension(Path::new("no_extension")), "");
    }

    #[test]
    fn test_flatten_path() {
        assert_eq!(flatten_path("folder/sub/file.txt", "_"), "folder_sub_file.txt");
        assert_eq!(flatten_path("folder\\sub\\file.txt", "-"), "folder-sub-file.txt");
    }

    #[test]
    fn test_format_tier() {
        assert_eq!(get_format_tier("txt"), 1);
        assert_eq!(get_format_tier("pdf"), 2);
        assert_eq!(get_format_tier("png"), 3);
        assert_eq!(get_format_tier("xyz"), 0);
    }
}
