use sqlx::{SqlitePool, Row};
use chrono::Utc;
use uuid::Uuid;
use crate::models::*;

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect(database_url).await?;

        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(Database { pool })
    }

    // Topic operations
    pub async fn create_topic(&self, req: CreateTopicRequest) -> Result<Topic, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let row = sqlx::query(
            "INSERT INTO topics (id, name, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             RETURNING id, name, description, created_at, updated_at"
        )
        .bind(&id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(Topic {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_topics(&self) -> Result<Vec<Topic>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, name, description, created_at, updated_at FROM topics ORDER BY updated_at DESC")
            .fetch_all(&self.pool)
            .await?;

        let topics = rows.into_iter().map(|row| Topic {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        Ok(topics)
    }

    pub async fn get_topic_by_id(&self, id: &str) -> Result<Option<Topic>, sqlx::Error> {
        let row = sqlx::query("SELECT id, name, description, created_at, updated_at FROM topics WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => Ok(Some(Topic {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })),
            None => Ok(None),
        }
    }

    pub async fn update_topic(&self, id: &str, req: CreateTopicRequest) -> Result<Topic, sqlx::Error> {
        let now = Utc::now();

        let row = sqlx::query(
            "UPDATE topics SET name = ?, description = ?, updated_at = ?
             WHERE id = ?
             RETURNING id, name, description, created_at, updated_at"
        )
        .bind(&req.name)
        .bind(&req.description)
        .bind(&now)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(Topic {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn delete_topic(&self, id: &str) -> Result<bool, sqlx::Error> {
        // まずSubTopicを削除
        sqlx::query("DELETE FROM subtopics WHERE topic_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        // その後Topicを削除
        let result = sqlx::query("DELETE FROM topics WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // SubTopic operations
    pub async fn create_subtopic(&self, req: CreateSubTopicRequest) -> Result<SubTopic, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let row = sqlx::query(
            "INSERT INTO subtopics (id, topic_id, name, description, template_type, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             RETURNING id, topic_id, name, description, template_type, created_at, updated_at"
        )
        .bind(&id)
        .bind(&req.topic_id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.template_type)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(SubTopic {
            id: row.get("id"),
            topic_id: row.get("topic_id"),
            name: row.get("name"),
            description: row.get("description"),
            template_type: row.get("template_type"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_subtopics_by_topic(&self, topic_id: &str) -> Result<Vec<SubTopic>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, topic_id, name, description, template_type, created_at, updated_at
             FROM subtopics WHERE topic_id = ? ORDER BY created_at ASC"
        )
        .bind(topic_id)
        .fetch_all(&self.pool)
        .await?;

        let subtopics = rows.into_iter().map(|row| SubTopic {
            id: row.get("id"),
            topic_id: row.get("topic_id"),
            name: row.get("name"),
            description: row.get("description"),
            template_type: row.get("template_type"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        Ok(subtopics)
    }

    pub async fn update_subtopic(&self, id: &str, req: CreateSubTopicRequest) -> Result<SubTopic, sqlx::Error> {
        let now = Utc::now();

        let row = sqlx::query(
            "UPDATE subtopics SET name = ?, description = ?, template_type = ?, updated_at = ?
             WHERE id = ?
             RETURNING id, topic_id, name, description, template_type, created_at, updated_at"
        )
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.template_type)
        .bind(&now)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(SubTopic {
            id: row.get("id"),
            topic_id: row.get("topic_id"),
            name: row.get("name"),
            description: row.get("description"),
            template_type: row.get("template_type"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn delete_subtopic(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM subtopics WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ResourceStock operations
    pub async fn create_resource_stock(&self, subtopic_id: &str, url: &str) -> Result<ResourceStock, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let row = sqlx::query(
            "INSERT INTO resource_stocks (id, subtopic_id, url, status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', ?, ?)
             RETURNING id, subtopic_id, url, title, summary, scraped_content, status, created_at, updated_at"
        )
        .bind(&id)
        .bind(subtopic_id)
        .bind(url)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(ResourceStock {
            id: row.get("id"),
            subtopic_id: row.get("subtopic_id"),
            url: row.get("url"),
            title: row.get("title"),
            summary: row.get("summary"),
            scraped_content: row.get("scraped_content"),
            status: row.get("status"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_resource_stocks_by_subtopic(&self, subtopic_id: &str) -> Result<Vec<ResourceStock>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, subtopic_id, url, title, summary, scraped_content, status, created_at, updated_at
             FROM resource_stocks WHERE subtopic_id = ? ORDER BY created_at ASC"
        )
        .bind(subtopic_id)
        .fetch_all(&self.pool)
        .await?;

        let resources = rows.into_iter().map(|row| ResourceStock {
            id: row.get("id"),
            subtopic_id: row.get("subtopic_id"),
            url: row.get("url"),
            title: row.get("title"),
            summary: row.get("summary"),
            scraped_content: row.get("scraped_content"),
            status: row.get("status"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        Ok(resources)
    }
}