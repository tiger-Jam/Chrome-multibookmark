-- Learning X Database Schema
-- 記事管理システム用のテーブル定義

CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]', -- JSON array as string
    created_at TEXT NOT NULL, -- ISO 8601 datetime string
    updated_at TEXT NOT NULL, -- ISO 8601 datetime string
    published BOOLEAN NOT NULL DEFAULT FALSE
);

-- パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles(updated_at);

-- 全文検索用のFTS5テーブル（オプション）
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, content, tags,
    content='articles',
    content_rowid='rowid'
);

-- FTS5テーブルの初期データ同期用トリガー
CREATE TRIGGER IF NOT EXISTS articles_fts_insert AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, content, tags)
    VALUES (NEW.rowid, NEW.title, NEW.content, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_update AFTER UPDATE ON articles BEGIN
    UPDATE articles_fts SET title = NEW.title, content = NEW.content, tags = NEW.tags
    WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_delete AFTER DELETE ON articles BEGIN
    DELETE FROM articles_fts WHERE rowid = OLD.rowid;
END;