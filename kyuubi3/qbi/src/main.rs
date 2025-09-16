// Prevent console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod database;
mod commands;
mod scraper;

use database::Database;
use commands::*;
use tauri::Manager;

#[tokio::main]
async fn main() {
    // Initialize database
    let db = Database::new("sqlite://./data/qbi2.db?mode=rwc").await
        .expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            get_topics,
            create_topic,
            get_topic,
            update_topic,
            delete_topic,
            get_subtopics,
            create_subtopic,
            update_subtopic,
            delete_subtopic,
            get_resource_stocks,
            create_resource_stock,
            start_scraping
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
