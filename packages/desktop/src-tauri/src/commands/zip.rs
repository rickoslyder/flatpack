//! ZIP archive operations commands

use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use zip::write::SimpleFileOptions;
use zip::ZipArchive;
use zip::ZipWriter;

/// File entry for ZIP creation
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipFileEntry {
    pub path: String,
    pub content: Vec<u8>,
}

/// ZIP info result
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipInfo {
    pub file_count: usize,
    pub total_size: u64,
    pub compressed_size: u64,
}

/// Create a ZIP archive from files
#[tauri::command]
pub async fn create_zip(output_path: String, files: Vec<ZipFileEntry>) -> Result<(), String> {
    let path = Path::new(&output_path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    let file = File::create(&output_path)
        .map_err(|e| format!("Failed to create ZIP file: {}", e))?;

    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for entry in files {
        zip.start_file(&entry.path, options)
            .map_err(|e| format!("Failed to add file {}: {}", entry.path, e))?;

        zip.write_all(&entry.content)
            .map_err(|e| format!("Failed to write file {}: {}", entry.path, e))?;
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize ZIP: {}", e))?;

    Ok(())
}

/// Extract a ZIP archive to a directory
#[tauri::command]
pub async fn extract_zip(zip_path: String, output_dir: String) -> Result<Vec<String>, String> {
    let file = File::open(&zip_path)
        .map_err(|e| format!("Failed to open ZIP file: {}", e))?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;

    let output_path = Path::new(&output_dir);
    fs::create_dir_all(&output_path)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    let mut extracted_files = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;

        let out_path = match file.enclosed_name() {
            Some(path) => output_path.join(path),
            None => continue, // Skip entries with invalid names
        };

        if file.is_dir() {
            fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            // Ensure parent directory exists
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            let mut contents = Vec::new();
            file.read_to_end(&mut contents)
                .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;

            let mut out_file = File::create(&out_path)
                .map_err(|e| format!("Failed to create output file: {}", e))?;

            out_file.write_all(&contents)
                .map_err(|e| format!("Failed to write output file: {}", e))?;

            extracted_files.push(out_path.to_string_lossy().to_string());
        }
    }

    Ok(extracted_files)
}

/// Read a ZIP file and get info
#[tauri::command]
pub async fn get_zip_info(zip_path: String) -> Result<ZipInfo, String> {
    let file = File::open(&zip_path)
        .map_err(|e| format!("Failed to open ZIP file: {}", e))?;

    let archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;

    let mut total_size: u64 = 0;
    let mut compressed_size: u64 = 0;

    for i in 0..archive.len() {
        if let Ok(file) = archive.by_index_raw(i) {
            total_size += file.size();
            compressed_size += file.compressed_size();
        }
    }

    Ok(ZipInfo {
        file_count: archive.len(),
        total_size,
        compressed_size,
    })
}
