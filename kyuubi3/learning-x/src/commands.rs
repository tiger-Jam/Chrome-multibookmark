use crate::article_manager::ArticleManager;
use crate::models::{Article, CreateArticleRequest, UpdateArticleRequest};
use tauri::State;

#[tauri::command]
pub async fn get_articles(manager: State<'_, ArticleManager>) -> Result<Vec<Article>, String> {
    manager.get_all_articles().await
}

#[tauri::command]
pub async fn get_article(id: String, manager: State<'_, ArticleManager>) -> Result<Option<Article>, String> {
    manager.get_article(&id).await
}

#[tauri::command]
pub async fn create_article(title: String, content: String, tags: Option<Vec<String>>, manager: State<'_, ArticleManager>) -> Result<Article, String> {
    let request = CreateArticleRequest { title, content, tags };
    manager.create_article(request).await
}

#[tauri::command]
pub async fn update_article(id: String, title: Option<String>, content: Option<String>, tags: Option<Vec<String>>, manager: State<'_, ArticleManager>) -> Result<Option<Article>, String> {
    let request = UpdateArticleRequest { title, content, tags };
    manager.update_article(&id, request).await
}

#[tauri::command]
pub async fn delete_article(id: String, manager: State<'_, ArticleManager>) -> Result<bool, String> {
    manager.delete_article(&id).await
}

#[tauri::command]
pub async fn publish_article(id: String, manager: State<'_, ArticleManager>) -> Result<Option<Article>, String> {
    manager.publish_article(&id).await
}

#[tauri::command]
pub async fn search_articles(query: String, manager: State<'_, ArticleManager>) -> Result<Vec<Article>, String> {
    manager.search_articles(&query).await
}