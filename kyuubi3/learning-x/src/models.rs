use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Article {
    pub id: String,
    pub title: String,
    pub content: String,
    pub author: String,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateArticleRequest {
    pub title: String,
    pub content: String,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateArticleRequest {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
}

impl Article {
    pub fn new(title: String, content: String, author: String) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            content,
            author,
            tags: Vec::new(),
            created_at: now,
            updated_at: now,
            published: false,
        }
    }

    pub fn update_content(&mut self, title: Option<String>, content: Option<String>) {
        if let Some(title) = title {
            self.title = title;
        }
        if let Some(content) = content {
            self.content = content;
        }
        self.updated_at = Utc::now();
    }

    pub fn publish(&mut self) {
        self.published = true;
        self.updated_at = Utc::now();
    }
}