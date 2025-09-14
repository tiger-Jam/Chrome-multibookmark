#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod article_manager;
mod commands;

use article_manager::ArticleManager;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ArticleManager::new())
        .invoke_handler(tauri::generate_handler![
            get_articles,
            get_article,
            create_article,
            update_article,
            delete_article,
            publish_article,
            search_articles
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}