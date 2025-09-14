use crate::database::Database;
use crate::models::{Article, CreateArticleRequest, UpdateArticleRequest};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct SqliteArticleManager {
    db: Arc<Mutex<Database>>,
}

impl SqliteArticleManager {
    pub async fn new() -> Result<Self, String> {
        // データベースファイルを実行可能ファイルと同じ場所に配置
        let database_url = "sqlite:learning_x.db".to_string();

        let db = Database::new(database_url).await
            .map_err(|e| format!("データベース接続エラー: {}", e))?;

        Ok(Self {
            db: Arc::new(Mutex::new(db)),
        })
    }

    pub async fn create_article(&self, request: CreateArticleRequest) -> Result<Article, String> {
        let db = self.db.lock().await;
        db.create_article(request).await
            .map_err(|e| format!("記事作成エラー: {}", e))
    }

    pub async fn get_article(&self, id: &str) -> Result<Option<Article>, String> {
        let db = self.db.lock().await;
        db.get_article(id).await
            .map_err(|e| format!("記事取得エラー: {}", e))
    }

    pub async fn update_article(&self, id: &str, request: UpdateArticleRequest) -> Result<Option<Article>, String> {
        let db = self.db.lock().await;
        db.update_article(id, request).await
            .map_err(|e| format!("記事更新エラー: {}", e))
    }

    pub async fn delete_article(&self, id: &str) -> Result<bool, String> {
        let db = self.db.lock().await;
        db.delete_article(id).await
            .map_err(|e| format!("記事削除エラー: {}", e))
    }

    pub async fn publish_article(&self, id: &str) -> Result<Option<Article>, String> {
        let db = self.db.lock().await;
        db.publish_article(id).await
            .map_err(|e| format!("記事公開エラー: {}", e))
    }

    pub async fn list_articles(&self) -> Result<Vec<Article>, String> {
        let db = self.db.lock().await;
        db.list_articles().await
            .map_err(|e| format!("記事一覧取得エラー: {}", e))
    }

    pub async fn search_articles(&self, query: &str) -> Result<Vec<Article>, String> {
        let db = self.db.lock().await;
        db.search_articles(query).await
            .map_err(|e| format!("記事検索エラー: {}", e))
    }
}