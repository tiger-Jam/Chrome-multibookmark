use thirtyfour::prelude::*;
use std::time::Duration;
use tokio::time::sleep;
use crate::models::*;

pub struct WebScraper {
    driver: Option<WebDriver>,
}

impl WebScraper {
    pub fn new() -> Self {
        Self { driver: None }
    }

    pub async fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("Initializing WebDriver...");

        let caps = DesiredCapabilities::chrome();
        let driver = WebDriver::new("http://localhost:9515", caps).await?;

        // Set timeouts
        driver.set_implicit_wait_timeout(Duration::from_secs(10)).await?;

        self.driver = Some(driver);
        println!("WebDriver initialized successfully");
        Ok(())
    }

    pub async fn search_and_collect_links(
        &self,
        query: &str,
        max_results: usize,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let driver = self.driver.as_ref().ok_or("WebDriver not initialized")?;

        println!("Searching for: {}", query);

        // Navigate to Google
        driver.goto("https://www.google.com").await?;

        // Find search box and enter query
        let search_box = driver.find(By::Name("q")).await?;
        search_box.clear().await?;
        search_box.send_keys(query).await?;
        search_box.send_keys(Key::Return).await?;

        // Wait for results to load
        sleep(Duration::from_secs(3)).await;

        // Collect search result links
        let mut links = Vec::new();
        let result_elements = driver.find_all(By::Css("h3")).await?;

        for (i, element) in result_elements.iter().enumerate() {
            if i >= max_results {
                break;
            }

            // Try to find the parent link
            if let Ok(link_element) = element.find(By::XPath("./ancestor::a")).await {
                if let Ok(href) = link_element.attr("href").await {
                    if let Some(url) = href {
                        if url.starts_with("http") && !url.contains("google.com") {
                            println!("Found link: {}", url);
                            links.push(url);
                        }
                    }
                }
            }
        }

        println!("Collected {} links", links.len());
        Ok(links)
    }

    pub async fn scrape_page_content(&self, url: &str) -> Result<ScrapedContent, Box<dyn std::error::Error>> {
        let driver = self.driver.as_ref().ok_or("WebDriver not initialized")?;

        println!("Scraping content from: {}", url);

        driver.goto(url).await?;
        sleep(Duration::from_secs(2)).await;

        // Extract title
        let title = match driver.title().await {
            Ok(t) => Some(t),
            Err(_) => None,
        };

        // Extract main content
        let content = self.extract_main_content(driver).await?;

        Ok(ScrapedContent {
            url: url.to_string(),
            title,
            content,
        })
    }

    async fn extract_main_content(&self, driver: &WebDriver) -> Result<String, Box<dyn std::error::Error>> {
        // Try different content selectors
        let selectors = [
            "article",
            "main",
            ".content",
            "#content",
            ".post-content",
            ".entry-content",
            "body",
        ];

        for selector in &selectors {
            if let Ok(element) = driver.find(By::Css(*selector)).await {
                if let Ok(text) = element.text().await {
                    if text.len() > 100 {
                        // Return first 2000 characters to avoid too long content
                        return Ok(text.chars().take(2000).collect());
                    }
                }
            }
        }

        // Fallback: get body text
        if let Ok(body) = driver.find(By::Tag("body")).await {
            if let Ok(text) = body.text().await {
                return Ok(text.chars().take(2000).collect());
            }
        }

        Ok("Could not extract content".to_string())
    }

    pub async fn close(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(driver) = self.driver.take() {
            driver.quit().await?;
        }
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