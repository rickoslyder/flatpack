//! Flatpack Desktop - Tauri Backend
//!
//! Provides native file system operations, PDF conversion, and OCR capabilities.

pub mod commands;
pub mod converters;
pub mod utils;

use tauri::Manager;

/// Initialize and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::file_ops::scan_directory,
            commands::file_ops::read_file,
            commands::file_ops::write_file,
            commands::file_ops::create_directory,
            commands::file_ops::delete_path,
            commands::file_ops::copy_file,
            commands::file_ops::file_exists,
            commands::file_ops::get_file_stat,
            commands::zip::create_zip,
            commands::zip::extract_zip,
            commands::pdf::convert_pdf_to_markdown,
            commands::pdf::get_pdf_info,
            commands::config::load_config,
            commands::config::save_config,
            commands::config::get_default_config,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
