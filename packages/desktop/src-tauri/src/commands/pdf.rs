//! PDF processing commands

use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

/// PDF metadata information
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfInfo {
    pub page_count: usize,
    pub title: Option<String>,
    pub author: Option<String>,
    pub has_text: bool,
    pub file_size: u64,
}

/// PDF conversion result
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfConversionResult {
    pub markdown: String,
    pub page_count: usize,
    pub word_count: usize,
    pub has_images: bool,
}

/// Get PDF information
#[tauri::command]
pub async fn get_pdf_info(path: String) -> Result<PdfInfo, String> {
    let file_path = Path::new(&path);

    // Get file size
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    let file_size = metadata.len();

    // Open and parse PDF
    let file = File::open(&path)
        .map_err(|e| format!("Failed to open PDF: {}", e))?;
    let _reader = BufReader::new(file);

    // Use lopdf to get basic info
    let doc = lopdf::Document::load(&path)
        .map_err(|e| format!("Failed to parse PDF: {}", e))?;

    let page_count = doc.get_pages().len();

    // Try to extract metadata
    let title = doc.trailer
        .get(b"Info")
        .ok()
        .and_then(|info| doc.get_object(*info).ok())
        .and_then(|obj| {
            if let lopdf::Object::Dictionary(dict) = obj {
                dict.get(b"Title")
                    .ok()
                    .and_then(|t| {
                        if let lopdf::Object::String(s, _) = t {
                            Some(String::from_utf8_lossy(s).to_string())
                        } else {
                            None
                        }
                    })
            } else {
                None
            }
        });

    let author = doc.trailer
        .get(b"Info")
        .ok()
        .and_then(|info| doc.get_object(*info).ok())
        .and_then(|obj| {
            if let lopdf::Object::Dictionary(dict) = obj {
                dict.get(b"Author")
                    .ok()
                    .and_then(|t| {
                        if let lopdf::Object::String(s, _) = t {
                            Some(String::from_utf8_lossy(s).to_string())
                        } else {
                            None
                        }
                    })
            } else {
                None
            }
        });

    // Check if PDF has extractable text
    let has_text = !extract_text_from_pdf(file_path)
        .map(|t| t.trim().is_empty())
        .unwrap_or(true);

    Ok(PdfInfo {
        page_count,
        title,
        author,
        has_text,
        file_size,
    })
}

/// Convert PDF to Markdown
#[tauri::command]
pub async fn convert_pdf_to_markdown(path: String) -> Result<PdfConversionResult, String> {
    let file_path = Path::new(&path);

    // Extract text using pdf-extract
    let text = extract_text_from_pdf(file_path)?;

    // Get page count
    let doc = lopdf::Document::load(&path)
        .map_err(|e| format!("Failed to parse PDF: {}", e))?;
    let page_count = doc.get_pages().len();

    // Count words
    let word_count = text.split_whitespace().count();

    // Check for images (simplified check - look for XObject entries)
    let has_images = doc.objects.values().any(|obj| {
        if let lopdf::Object::Dictionary(dict) = obj {
            dict.get(b"Subtype")
                .map(|s| matches!(s, lopdf::Object::Name(n) if n == b"Image"))
                .unwrap_or(false)
        } else {
            false
        }
    });

    // Format as Markdown
    let file_name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "document".to_string());

    let markdown = format!(
        "# {}\n\n> Converted from PDF ({} pages, {} words)\n\n---\n\n{}",
        file_name.trim_end_matches(".pdf"),
        page_count,
        word_count,
        clean_pdf_text(&text)
    );

    Ok(PdfConversionResult {
        markdown,
        page_count,
        word_count,
        has_images,
    })
}

/// Extract text from PDF file
fn extract_text_from_pdf(path: &Path) -> Result<String, String> {
    let bytes = std::fs::read(path)
        .map_err(|e| format!("Failed to read PDF file: {}", e))?;

    pdf_extract::extract_text_from_mem(&bytes)
        .map_err(|e| format!("Failed to extract text from PDF: {}", e))
}

/// Clean and format extracted PDF text
fn clean_pdf_text(text: &str) -> String {
    // Remove excessive whitespace while preserving paragraph structure
    let mut result = String::new();
    let mut prev_blank = false;

    for line in text.lines() {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            if !prev_blank {
                result.push_str("\n\n");
                prev_blank = true;
            }
        } else {
            if !result.is_empty() && !prev_blank {
                result.push(' ');
            }
            result.push_str(trimmed);
            prev_blank = false;
        }
    }

    result.trim().to_string()
}
