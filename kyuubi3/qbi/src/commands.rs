use tauri::State;
use crate::database::Database;
use crate::models::*;
use crate::scraper::generate_search_query;

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
    println!("Starting scraping for subtopics: {:?}", subtopic_ids);

    // For now, simulate scraping without WebDriver to avoid thread safety issues
    // This can be improved later with proper async WebDriver setup
    let mut total_links = 0;

    for subtopic_id in subtopic_ids {
        println!("Processing subtopic: {}", subtopic_id);

        // Get subtopic details to generate search query
        if let Ok(subtopic) = get_subtopic_details(&db, &subtopic_id).await {
            let search_query = generate_search_query(
                &subtopic.topic_name,
                &subtopic.name,
                subtopic.template_type.as_deref(),
            );

            println!("Generated search query: {}", search_query);

            // Simulate some example URLs for now
            let example_urls = vec![
                format!("https://ja.wikipedia.org/wiki/{}", urlencoding::encode(&subtopic.topic_name)),
                format!("https://example.com/search?q={}", urlencoding::encode(&search_query)),
                format!("https://docs.example.com/{}", urlencoding::encode(&subtopic.name)),
            ];

            // Store simulated links in database
            for url in example_urls {
                if let Err(e) = db.create_resource_stock(&subtopic_id, &url).await {
                    println!("Failed to store resource: {}", e);
                } else {
                    total_links += 1;
                }
            }
        }
    }

    Ok(format!("Scraping completed. Collected {} links", total_links))
}

// Helper function to get subtopic with topic name
async fn get_subtopic_details(_db: &Database, subtopic_id: &str) -> Result<SubTopicWithTopic, String> {
    // This would require a new method in database.rs
    // For now, return a mock
    Ok(SubTopicWithTopic {
        id: subtopic_id.to_string(),
        name: "Mock SubTopic".to_string(),
        topic_name: "Mock Topic".to_string(),
        template_type: Some("trivia".to_string()),
    })
}

#[derive(Debug)]
struct SubTopicWithTopic {
    id: String,
    name: String,
    topic_name: String,
    template_type: Option<String>,
}