use tauri::State;
use crate::database::{Database, SubTopicWithTopic};
use crate::models::*;
use crate::scraper::{generate_search_query, WebScraper};

#[tauri::command]
pub async fn get_topics(db: State<'_, Database>) -> Result<Vec<Topic>, String> {
    db.get_topics().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_topic(db: State<'_, Database>, req: CreateTopicRequest) -> Result<Topic, String> {
    db.create_topic(req).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_topic(db: State<'_, Database>, id: String) -> Result<Option<Topic>, String> {
    db.get_topic_by_id(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_topic(db: State<'_, Database>, id: String) -> Result<bool, String> {
    db.delete_topic(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_subtopics(db: State<'_, Database>, topicId: String) -> Result<Vec<SubTopic>, String> {
    db.get_subtopics_by_topic(&topicId).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_subtopic(db: State<'_, Database>, req: CreateSubTopicRequest) -> Result<SubTopic, String> {
    db.create_subtopic(req).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_topic(db: State<'_, Database>, id: String, req: CreateTopicRequest) -> Result<Topic, String> {
    db.update_topic(&id, req).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_subtopic(db: State<'_, Database>, id: String, req: CreateSubTopicRequest) -> Result<SubTopic, String> {
    db.update_subtopic(&id, req).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_subtopic(db: State<'_, Database>, id: String) -> Result<bool, String> {
    db.delete_subtopic(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_resource_stocks(db: State<'_, Database>, subtopicId: String) -> Result<Vec<ResourceStock>, String> {
    db.get_resource_stocks_by_subtopic(&subtopicId).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_resource_stock(db: State<'_, Database>, subtopic_id: String, url: String) -> Result<ResourceStock, String> {
    db.create_resource_stock(&subtopic_id, &url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_scraping(
    db: State<'_, Database>,
    subtopic_ids: Vec<String>,
) -> Result<String, String> {
    println!("Starting real scraping for subtopics: {:?}", subtopic_ids);

    let mut scraper = WebScraper::new();
    if let Err(e) = scraper.initialize().await {
        return Err(format!("Failed to initialize scraper: {}", e));
    }

    let mut total_scraped = 0;

    for subtopic_id in subtopic_ids {
        println!("Processing subtopic: {}", subtopic_id);

        // Get subtopic details to generate search query
        if let Ok(Some(subtopic)) = db.get_subtopic_with_topic(&subtopic_id).await {
            let search_query = generate_search_query(
                &subtopic.topic_name,
                &subtopic.name,
                subtopic.template_type.as_deref(),
            );

            println!("Generated search query: {}", search_query);

            // Search for links
            match scraper.search_and_collect_links(&search_query, 3).await {
                Ok(urls) => {
                    for url in urls {
                        // Create resource stock entry
                        match db.create_resource_stock(&subtopic_id, &url).await {
                            Ok(resource) => {
                                // Scrape content from the URL
                                match scraper.scrape_page_content(&url).await {
                                    Ok(scraped_content) => {
                                        // Update resource with scraped content
                                        let summary = scraped_content.content
                                            .chars()
                                            .take(200)
                                            .collect::<String>();

                                        if let Err(e) = db.update_resource_stock_content(
                                            &resource.id,
                                            scraped_content.title.as_deref(),
                                            Some(&summary),
                                            &scraped_content.content,
                                            "completed"
                                        ).await {
                                            println!("Failed to update resource content: {}", e);
                                        } else {
                                            total_scraped += 1;
                                            println!("Successfully scraped: {}", url);
                                        }
                                    }
                                    Err(e) => {
                                        println!("Failed to scrape {}: {}", url, e);
                                        let _ = db.update_resource_stock_content(
                                            &resource.id,
                                            None,
                                            None,
                                            &format!("Error: {}", e),
                                            "failed"
                                        ).await;
                                    }
                                }
                            }
                            Err(e) => {
                                println!("Failed to create resource stock: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    println!("Failed to search for links: {}", e);
                }
            }
        } else {
            println!("Failed to get subtopic details for: {}", subtopic_id);
        }
    }

    let _ = scraper.close().await;

    Ok(format!("Scraping completed. Successfully scraped {} resources", total_scraped))
}

