#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod database;
mod article_manager;
mod commands;

use article_manager::ArticleManager;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        let article_manager = ArticleManager::new().await
            .expect("ArticleManagerの初期化に失敗しました");

        tauri::Builder::default()
            .manage(article_manager)
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
    });
}

fn main() {
    run();
}