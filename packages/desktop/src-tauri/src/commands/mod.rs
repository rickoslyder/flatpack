//! Tauri command modules

pub mod config;
pub mod file_ops;
pub mod pdf;
pub mod zip;

#[cfg(feature = "ocr")]
pub mod ocr;
