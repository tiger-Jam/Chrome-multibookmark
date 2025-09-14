use sqlx::{SqlitePool, Row, sqlite::SqlitePoolOptions};
use crate::models::{Article, CreateArticleRequest, UpdateArticleRequest};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl std::fmt::Debug for Database {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Database")
            .field("pool", &"SqlitePool")
            .finish()
    }
}

impl Database {
    pub async fn new(database_url: String) -> Result<Self, sqlx::Error> {
        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .connect(&database_url)
            .await?;

        // マイグレーション実行
        let migration_sql = include_str!("../migrations/001_initial.sql");
        sqlx::query(migration_sql).execute(&pool).await?;

        Ok(Self { pool })
    }

    pub async fn create_article(&self, request: CreateArticleRequest) -> Result<Article, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags = request.tags.unwrap_or_default();
        let tags_json = serde_json::to_string(&tags)
            .unwrap_or_else(|_| "[]".to_string());

        let article = Article {
            id: id.clone(),
            title: request.title,
            content: request.content,
            author: "default_user".to_string(), // TODO: 実際の認証後にユーザー名を使用
            tags: tags.clone(),
            created_at: now,
            updated_at: now,
            published: false,
        };

        sqlx::query(
            r#"
            INSERT INTO articles (id, title, content, author, tags, created_at, updated_at, published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&article.id)
        .bind(&article.title)
        .bind(&article.content)
        .bind(&article.author)
        .bind(&tags_json)
        .bind(article.created_at.to_rfc3339())
        .bind(article.updated_at.to_rfc3339())
        .bind(article.published)
        .execute(&self.pool)
        .await?;

        Ok(article)
    }

    pub async fn get_article(&self, id: &str) -> Result<Option<Article>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id, title, content, author, tags, created_at, updated_at, published FROM articles WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_article(row)?))
        } else {
            Ok(None)
        }
    }

    pub async fn update_article(&self, id: &str, request: UpdateArticleRequest) -> Result<Option<Article>, sqlx::Error> {
        let now = Utc::now();
        let tags_json = if let Some(ref tags) = request.tags {
            serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string())
        } else {
            // タグが更新されない場合は既存の値を保持
            let existing = self.get_article(id).await?;
            if let Some(existing) = existing {
                serde_json::to_string(&existing.tags).unwrap_or_else(|_| "[]".to_string())
            } else {
                "[]".to_string()
            }
        };

        let rows_affected = sqlx::query(
            r#"
            UPDATE articles
            SET title = COALESCE(?, title),
                content = COALESCE(?, content),
                tags = ?,
                updated_at = ?
            WHERE id = ?
            "#
        )
        .bind(&request.title)
        .bind(&request.content)
        .bind(&tags_json)
        .bind(now.to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?
        .rows_affected();

        if rows_affected > 0 {
            self.get_article(id).await
        } else {
            Ok(None)
        }
    }

    pub async fn delete_article(&self, id: &str) -> Result<bool, sqlx::Error> {
        let rows_affected = sqlx::query("DELETE FROM articles WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?
            .rows_affected();

        Ok(rows_affected > 0)
    }

    pub async fn publish_article(&self, id: &str) -> Result<Option<Article>, sqlx::Error> {
        let now = Utc::now();
        let rows_affected = sqlx::query(
            "UPDATE articles SET published = TRUE, updated_at = ? WHERE id = ?"
        )
        .bind(now.to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?
        .rows_affected();

        if rows_affected > 0 {
            self.get_article(id).await
        } else {
            Ok(None)
        }
    }

    pub async fn list_articles(&self) -> Result<Vec<Article>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, title, content, author, tags, created_at, updated_at, published FROM articles ORDER BY updated_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|row| self.row_to_article(row))
            .collect::<Result<Vec<_>, _>>()
    }

    pub async fn search_articles(&self, query: &str) -> Result<Vec<Article>, sqlx::Error> {
        if query.trim().is_empty() {
            return self.list_articles().await;
        }

        // まずFTSテーブルで高速検索を試行
        let fts_query = format!("\"{}\"", query.replace("\"", "\"\""));
        let fts_results = sqlx::query(
            r#"
            SELECT a.id, a.title, a.content, a.author, a.tags, a.created_at, a.updated_at, a.published
            FROM articles a
            JOIN articles_fts fts ON a.rowid = fts.rowid
            WHERE articles_fts MATCH ?
            ORDER BY a.updated_at DESC
            "#
        )
        .bind(&fts_query)
        .fetch_all(&self.pool)
        .await;

        match fts_results {
            Ok(rows) => {
                rows.into_iter()
                    .map(|row| self.row_to_article(row))
                    .collect::<Result<Vec<_>, _>>()
            }
            Err(_) => {
                // FTSが失敗した場合はLIKE検索にフォールバック
                let like_query = format!("%{}%", query);
                let rows = sqlx::query(
                    r#"
                    SELECT id, title, content, author, tags, created_at, updated_at, published
                    FROM articles
                    WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
                    ORDER BY updated_at DESC
                    "#
                )
                .bind(&like_query)
                .bind(&like_query)
                .bind(&like_query)
                .fetch_all(&self.pool)
                .await?;

                rows.into_iter()
                    .map(|row| self.row_to_article(row))
                    .collect::<Result<Vec<_>, _>>()
            }
        }
    }

    fn row_to_article(&self, row: sqlx::sqlite::SqliteRow) -> Result<Article, sqlx::Error> {
        let tags_json: String = row.try_get("tags")?;
        let tags: Vec<String> = serde_json::from_str(&tags_json)
            .unwrap_or_default();

        let created_at_str: String = row.try_get("created_at")?;
        let updated_at_str: String = row.try_get("updated_at")?;

        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);

        let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
            .map_err(|e| sqlx::Error::Decode(Box::new(e)))?
            .with_timezone(&Utc);

        Ok(Article {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            content: row.try_get("content")?,
            author: row.try_get("author")?,
            tags,
            created_at,
            updated_at,
            published: row.try_get("published")?,
        })
    }
}