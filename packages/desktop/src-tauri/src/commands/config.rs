//! Configuration management commands

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub tier: String,
    pub path_separator: String,
    pub custom_ignore_patterns: Vec<String>,
    pub create_zip: bool,
    pub preserve_paths: bool,
    pub include_hidden: bool,
    pub max_file_size: u64,
}

/// User preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPreferences {
    pub theme: String,
    pub auto_update: bool,
    pub show_hidden_files: bool,
    pub default_output_folder: Option<String>,
}

/// Full configuration including app config and preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullConfig {
    pub config: AppConfig,
    pub preferences: UserPreferences,
}

/// Get the configuration file path
fn get_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))?;

    Ok(config_dir.join("config.json"))
}

/// Load configuration from file
#[tauri::command]
pub async fn load_config(app: tauri::AppHandle) -> Result<FullConfig, String> {
    let config_path = get_config_path(&app)?;

    if !config_path.exists() {
        return Ok(get_default_config_internal());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))
}

/// Save configuration to file
#[tauri::command]
pub async fn save_config(app: tauri::AppHandle, config: FullConfig) -> Result<(), String> {
    let config_path = get_config_path(&app)?;

    // Ensure config directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))
}

/// Get default configuration
#[tauri::command]
pub async fn get_default_config() -> Result<FullConfig, String> {
    Ok(get_default_config_internal())
}

/// Internal function to create default config
fn get_default_config_internal() -> FullConfig {
    FullConfig {
        config: AppConfig {
            tier: "pro".to_string(),
            path_separator: "_".to_string(),
            custom_ignore_patterns: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                ".DS_Store".to_string(),
                "Thumbs.db".to_string(),
            ],
            create_zip: false,
            preserve_paths: false,
            include_hidden: false,
            max_file_size: 200 * 1024 * 1024, // 200MB
        },
        preferences: UserPreferences {
            theme: "system".to_string(),
            auto_update: true,
            show_hidden_files: false,
            default_output_folder: None,
        },
    }
}
