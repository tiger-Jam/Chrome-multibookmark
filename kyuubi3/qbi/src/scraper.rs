use reqwest::Client;
use scraper::{Html, Selector};
use std::time::Duration;
use tokio::time::sleep;
use crate::models::*;

pub struct WebScraper {
    client: Client,
}

impl WebScraper {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            .build()
            .unwrap();

        Self { client }
    }

    pub async fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("HTTP client initialized successfully");
        Ok(())
    }

    pub async fn search_and_collect_links(
        &self,
        query: &str,
        max_results: usize,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        println!("Searching for: {}", query);

        let mut links = Vec::new();

        // WikipediaのURLを生成
        let encoded_query = urlencoding::encode(query);

        // 1. Wikipedia日本語版の検索
        let wiki_search_url = format!("https://ja.wikipedia.org/w/api.php?action=opensearch&search={}&limit={}&namespace=0&format=json", encoded_query, max_results.min(5));

        if let Ok(response) = self.client.get(&wiki_search_url).send().await {
            if let Ok(text) = response.text().await {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(titles) = json.get(1).and_then(|v| v.as_array()) {
                        for title in titles.iter().take(max_results) {
                            if let Some(title_str) = title.as_str() {
                                let wiki_url = format!("https://ja.wikipedia.org/wiki/{}",
                                    urlencoding::encode(title_str));
                                println!("Found Wikipedia link: {}", wiki_url);
                                links.push(wiki_url);
                            }
                        }
                    }
                }
            }
        }

        // 2. 直接的なWikipediaページ検索も追加
        let direct_wiki_url = format!("https://ja.wikipedia.org/wiki/{}", encoded_query);
        if self.check_url_exists(&direct_wiki_url).await {
            println!("Found direct Wikipedia link: {}", direct_wiki_url);
            if !links.contains(&direct_wiki_url) {
                links.push(direct_wiki_url);
            }
        }

        println!("Collected {} links", links.len());
        Ok(links)
    }

    async fn check_url_exists(&self, url: &str) -> bool {
        match self.client.head(url).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }

    pub async fn scrape_page_content(&self, url: &str) -> Result<ScrapedContent, Box<dyn std::error::Error>> {
        println!("Scraping content from: {}", url);

        let response = self.client.get(url).send().await?;
        let html_content = response.text().await?;

        let document = Html::parse_document(&html_content);

        // Extract title
        let title_selector = Selector::parse("title")?;
        let title = document.select(&title_selector)
            .next()
            .map(|element| element.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty());

        // Extract main content
        let content = self.extract_main_content(&document);

        Ok(ScrapedContent {
            url: url.to_string(),
            title,
            content,
        })
    }

    fn extract_main_content(&self, document: &Html) -> String {
        // Try different content selectors for Wikipedia and general websites
        let selectors_str = [
            "#mw-content-text",  // Wikipedia main content
            ".mw-parser-output", // Wikipedia parser output
            "article",
            "main",
            ".content",
            "#content",
            ".post-content",
            ".entry-content",
        ];

        for selector_str in &selectors_str {
            if let Ok(selector) = Selector::parse(selector_str) {
                if let Some(element) = document.select(&selector).next() {
                    let text: String = element.text().collect::<Vec<_>>().join(" ");
                    let cleaned_text = text.trim()
                        .split_whitespace()
                        .collect::<Vec<_>>()
                        .join(" ");

                    if cleaned_text.len() > 100 {
                        // Return first 3000 characters to avoid too long content
                        return cleaned_text.chars().take(3000).collect::<String>();
                    }
                }
            }
        }

        // Fallback: get body text
        if let Ok(body_selector) = Selector::parse("body") {
            if let Some(body) = document.select(&body_selector).next() {
                let text: String = body.text().collect::<Vec<_>>().join(" ");
                let cleaned_text = text.trim()
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ");
                return cleaned_text.chars().take(3000).collect::<String>();
            }
        }

        "Could not extract content".to_string()
    }

    pub async fn close(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // HTTP client doesn't need explicit cleanup
        println!("HTTP client closed");
        Ok(())
    }
}

impl Drop for WebScraper {
    fn drop(&mut self) {
        // Note: This is synchronous, but the actual cleanup happens in close()
        println!("WebScraper dropped");
    }
}

#[derive(Debug)]
pub struct ScrapedContent {
    pub url: String,
    pub title: Option<String>,
    pub content: String,
}

// Helper function to create search queries based on topic and subtopic
pub fn generate_search_query(topic_name: &str, subtopic_name: &str, template_type: Option<&str>) -> String {
    let mut query = format!("{} {}", topic_name, subtopic_name);

    if let Some(template) = template_type {
        match template {
            "history" => query.push_str(" 歴史 沿革"),
            "trivia" => query.push_str(" 豆知識 トリビア"),
            "background" => query.push_str(" 背景 由来"),
            "technical" => query.push_str(" 仕組み 技術"),
            "cultural" => query.push_str(" 文化 意味"),
            _ => {}
        }
    }

    query
}