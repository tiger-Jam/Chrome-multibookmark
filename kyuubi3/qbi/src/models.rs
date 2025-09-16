use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Topic {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SubTopic {
    pub id: String,
    pub topic_id: String,
    pub name: String,
    pub description: Option<String>,
    pub template_type: Option<String>, // 歴史、豆知識、etc
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ResourceStock {
    pub id: String,
    pub subtopic_id: String,
    pub url: String,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub scraped_content: Option<String>,
    pub status: String, // pending, completed, failed
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Article {
    pub id: String,
    pub topic_id: String,
    pub title: String,
    pub content: String,
    pub references: Option<String>, // JSON format
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// API用のDTO
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTopicRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubTopicRequest {
    pub topic_id: String,
    pub name: String,
    pub description: Option<String>,
    pub template_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScrapingRequest {
    pub subtopic_id: String,
    pub search_query: String,
    pub max_results: Option<i32>,
}