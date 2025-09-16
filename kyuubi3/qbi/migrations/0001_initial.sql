-- Topics table
CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- SubTopics table
CREATE TABLE subtopics (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Resource stocks table (for storing scraped links and summaries)
CREATE TABLE resource_stocks (
    id TEXT PRIMARY KEY,
    subtopic_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    scraped_content TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Articles table
CREATE TABLE articles (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    reference_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes for better performance
CREATE INDEX idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX idx_resource_stocks_subtopic_id ON resource_stocks(subtopic_id);
CREATE INDEX idx_articles_topic_id ON articles(topic_id);