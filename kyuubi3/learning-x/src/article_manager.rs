use crate::models::{Article, CreateArticleRequest, UpdateArticleRequest};
use std::collections::HashMap;
use std::sync::Mutex;

pub struct ArticleManager {
    articles: Mutex<HashMap<String, Article>>,
}

impl ArticleManager {
    pub fn new() -> Self {
        Self {
            articles: Mutex::new(HashMap::new()),
        }
    }

    pub fn create_article(&self, request: CreateArticleRequest) -> Result<Article, String> {
        let mut article = Article::new(request.title, request.content, "default_user".to_string());
        if let Some(tags) = request.tags {
            article.tags = tags;
        }

        let mut articles = self.articles.lock().map_err(|e| e.to_string())?;
        let id = article.id.clone();
        articles.insert(id, article.clone());

        Ok(article)
    }

    pub fn get_article(&self, id: &str) -> Result<Option<Article>, String> {
        let articles = self.articles.lock().map_err(|e| e.to_string())?;
        Ok(articles.get(id).cloned())
    }

    pub fn get_all_articles(&self) -> Result<Vec<Article>, String> {
        let articles = self.articles.lock().map_err(|e| e.to_string())?;
        let mut article_list: Vec<Article> = articles.values().cloned().collect();
        article_list.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        Ok(article_list)
    }

    pub fn update_article(&self, request: UpdateArticleRequest) -> Result<Article, String> {
        let mut articles = self.articles.lock().map_err(|e| e.to_string())?;

        if let Some(article) = articles.get_mut(&request.id) {
            article.update_content(request.title, request.content);
            if let Some(tags) = request.tags {
                article.tags = tags;
            }
            Ok(article.clone())
        } else {
            Err("Article not found".to_string())
        }
    }

    pub fn delete_article(&self, id: &str) -> Result<(), String> {
        let mut articles = self.articles.lock().map_err(|e| e.to_string())?;

        if articles.remove(id).is_some() {
            Ok(())
        } else {
            Err("Article not found".to_string())
        }
    }

    pub fn publish_article(&self, id: &str) -> Result<Article, String> {
        let mut articles = self.articles.lock().map_err(|e| e.to_string())?;

        if let Some(article) = articles.get_mut(id) {
            article.publish();
            Ok(article.clone())
        } else {
            Err("Article not found".to_string())
        }
    }

    pub fn search_articles(&self, query: &str) -> Result<Vec<Article>, String> {
        let articles = self.articles.lock().map_err(|e| e.to_string())?;
        let query_lower = query.to_lowercase();

        let filtered: Vec<Article> = articles
            .values()
            .filter(|article| {
                article.title.to_lowercase().contains(&query_lower) ||
                article.content.to_lowercase().contains(&query_lower) ||
                article.tags.iter().any(|tag| tag.to_lowercase().contains(&query_lower))
            })
            .cloned()
            .collect();

        Ok(filtered)
    }
}