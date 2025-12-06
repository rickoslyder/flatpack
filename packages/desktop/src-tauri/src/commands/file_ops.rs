//! File system operations commands

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::SystemTime;
use walkdir::WalkDir;

/// Scanned file information
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedFile {
    pub path: String,
    pub relative_path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub modified_at: u64,
    pub is_directory: bool,
}

/// Scan result
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root: String,
    pub files: Vec<ScannedFile>,
    pub total_files: usize,
    pub total_directories: usize,
    pub duration: u64,
}

/// File stat result
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStat {
    pub size: u64,
    pub modified_at: u64,
    pub is_directory: bool,
}

/// Scan a directory recursively
#[tauri::command]
pub async fn scan_directory(path: String) -> Result<ScanResult, String> {
    let start = std::time::Instant::now();
    let root_path = Path::new(&path);

    if !root_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let mut files = Vec::new();
    let mut total_files = 0;
    let mut total_directories = 0;

    for entry in WalkDir::new(&path).follow_links(false) {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        let relative_path = entry_path
            .strip_prefix(&path)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();

        // Skip the root directory itself
        if relative_path.is_empty() {
            continue;
        }

        let name = entry_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let extension = entry_path
            .extension()
            .map(|e| e.to_string_lossy().to_string().to_lowercase())
            .unwrap_or_default();

        let modified_at = metadata
            .modified()
            .unwrap_or(SystemTime::UNIX_EPOCH)
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let is_directory = metadata.is_dir();

        if is_directory {
            total_directories += 1;
        } else {
            total_files += 1;
        }

        files.push(ScannedFile {
            path: entry_path.to_string_lossy().to_string(),
            relative_path,
            name,
            extension,
            size: if is_directory { 0 } else { metadata.len() },
            modified_at,
            is_directory,
        });
    }

    let duration = start.elapsed().as_millis() as u64;

    Ok(ScanResult {
        root: path,
        files,
        total_files,
        total_directories,
        duration,
    })
}

/// Read a file as bytes
#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(path: String, content: Vec<u8>) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write file {}: {}", path, e))
}

/// Create a directory (and all parent directories)
#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory {}: {}", path, e))
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), String> {
    let path_ref = Path::new(&path);
    if path_ref.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory {}: {}", path, e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file {}: {}", path, e))
    }
}

/// Copy a file
#[tauri::command]
pub async fn copy_file(source: String, destination: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&destination).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::copy(&source, &destination)
        .map(|_| ())
        .map_err(|e| format!("Failed to copy {} to {}: {}", source, destination, e))
}

/// Check if a file or directory exists
#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// Get file statistics
#[tauri::command]
pub async fn get_file_stat(path: String) -> Result<FileStat, String> {
    let path_ref = Path::new(&path);
    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to get metadata for {}: {}", path, e))?;

    let modified_at = metadata
        .modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(FileStat {
        size: if metadata.is_dir() { 0 } else { metadata.len() },
        modified_at,
        is_directory: path_ref.is_dir(),
    })
}
