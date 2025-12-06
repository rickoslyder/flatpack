//! Markdown conversion utilities

/// Wrap content in a markdown code block
pub fn wrap_in_code_block(content: &str, language: &str) -> String {
    format!("```{}\n{}\n```", language, content)
}

/// Create a markdown header for converted files
pub fn create_header(original_path: &str, file_type: &str) -> String {
    format!(
        "<!-- Converted from {} -->\n<!-- Original path: {} -->\n\n",
        file_type, original_path
    )
}

/// Escape markdown special characters in text
pub fn escape_markdown(text: &str) -> String {
    let mut result = String::with_capacity(text.len());

    for c in text.chars() {
        match c {
            '\\' | '`' | '*' | '_' | '{' | '}' | '[' | ']' | '(' | ')' | '#' | '+' | '-' | '.'
            | '!' | '|' => {
                result.push('\\');
                result.push(c);
            }
            _ => result.push(c),
        }
    }

    result
}

/// Convert plain text to markdown
pub fn text_to_markdown(content: &str, original_path: &str) -> String {
    let header = create_header(original_path, "plain text");
    format!("{}{}", header, content)
}

/// Convert code file to markdown with syntax highlighting
pub fn code_to_markdown(content: &str, original_path: &str, language: &str) -> String {
    let header = create_header(original_path, &format!("{} source code", language));
    let code_block = wrap_in_code_block(content, language);
    format!("{}{}", header, code_block)
}

/// Convert JSON to markdown
pub fn json_to_markdown(content: &str, original_path: &str) -> String {
    code_to_markdown(content, original_path, "json")
}

/// Convert YAML to markdown
pub fn yaml_to_markdown(content: &str, original_path: &str) -> String {
    code_to_markdown(content, original_path, "yaml")
}

/// Convert CSV to markdown table
pub fn csv_to_markdown(content: &str, original_path: &str) -> String {
    let header = create_header(original_path, "CSV data");
    let mut lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() {
        return format!("{}_Empty CSV file_", header);
    }

    let mut result = header;

    // Parse header row
    let header_row = lines.remove(0);
    let headers: Vec<&str> = header_row.split(',').map(|s| s.trim()).collect();

    // Create markdown table header
    result.push_str("| ");
    result.push_str(&headers.join(" | "));
    result.push_str(" |\n");

    // Create separator row
    result.push_str("| ");
    result.push_str(&headers.iter().map(|_| "---").collect::<Vec<_>>().join(" | "));
    result.push_str(" |\n");

    // Add data rows
    for line in lines {
        let cells: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
        result.push_str("| ");
        result.push_str(&cells.join(" | "));
        result.push_str(" |\n");
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wrap_in_code_block() {
        let content = "fn main() {}";
        let result = wrap_in_code_block(content, "rust");
        assert!(result.starts_with("```rust\n"));
        assert!(result.ends_with("\n```"));
    }

    #[test]
    fn test_escape_markdown() {
        let input = "Hello *world* [link]";
        let expected = "Hello \\*world\\* \\[link\\]";
        assert_eq!(escape_markdown(input), expected);
    }
}
