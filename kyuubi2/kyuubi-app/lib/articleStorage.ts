// 記事のデータ型定義
export interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// ローカルストレージのキー
const STORAGE_KEY = 'kyuubi-articles';

// ユニークIDを生成
function generateId(): string {
  return `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 全記事を取得
export function getAllArticles(): Article[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('記事の読み込みに失敗しました:', error);
    return [];
  }
}

// 記事を保存
export function saveArticle(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Article {
  const articles = getAllArticles();
  const now = new Date().toISOString();
  
  const newArticle: Article = {
    ...article,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  articles.push(newArticle);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  
  return newArticle;
}

// 記事を更新
export function updateArticle(id: string, updates: Partial<Pick<Article, 'title' | 'content' | 'tags'>>): Article | null {
  const articles = getAllArticles();
  const index = articles.findIndex(article => article.id === id);
  
  if (index === -1) {
    console.error('記事が見つかりません:', id);
    return null;
  }

  const updatedArticle: Article = {
    ...articles[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  articles[index] = updatedArticle;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  
  return updatedArticle;
}

// 記事を削除
export function deleteArticle(id: string): boolean {
  const articles = getAllArticles();
  const filteredArticles = articles.filter(article => article.id !== id);
  
  if (filteredArticles.length === articles.length) {
    console.error('削除する記事が見つかりません:', id);
    return false;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredArticles));
  return true;
}

// IDで記事を取得
export function getArticleById(id: string): Article | null {
  const articles = getAllArticles();
  return articles.find(article => article.id === id) || null;
}

// タイトルでの検索
export function searchArticlesByTitle(query: string): Article[] {
  const articles = getAllArticles();
  return articles.filter(article => 
    article.title.toLowerCase().includes(query.toLowerCase())
  );
}

// タグでの検索
export function searchArticlesByTag(tag: string): Article[] {
  const articles = getAllArticles();
  return articles.filter(article => 
    article.tags.includes(tag)
  );
}

// 記事をエクスポート（markdown形式）
export function exportArticleAsMarkdown(article: Article): string {
  const frontmatter = `---
title: ${article.title}
tags: [${article.tags.join(', ')}]
created: ${article.createdAt}
updated: ${article.updatedAt}
---

`;

  return frontmatter + article.content;
}

// 記事をインポート（markdown形式から）
export function importArticleFromMarkdown(markdownContent: string): Omit<Article, 'id' | 'createdAt' | 'updatedAt'> {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = markdownContent.match(frontmatterRegex);
  
  let title = '無題の記事';
  let tags: string[] = [];
  let content = markdownContent;

  if (match) {
    const frontmatter = match[1];
    content = markdownContent.replace(frontmatterRegex, '');
    
    // タイトルの抽出
    const titleMatch = frontmatter.match(/title:\s*(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // タグの抽出
    const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
    if (tagsMatch) {
      tags = tagsMatch[1].split(',').map(tag => tag.trim());
    }
  } else {
    // frontmatterがない場合、最初の行をタイトルとして使用
    const lines = markdownContent.split('\n');
    const firstLine = lines[0];
    if (firstLine.startsWith('# ')) {
      title = firstLine.replace('# ', '').trim();
    }
  }

  return {
    title,
    content,
    tags,
  };
}