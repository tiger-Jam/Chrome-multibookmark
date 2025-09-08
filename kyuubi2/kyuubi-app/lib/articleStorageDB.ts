// データベース用の記事ストレージ
export interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

const API_BASE = '/api/articles';

// 全記事を取得
export async function getAllArticles(): Promise<Article[]> {
  try {
    const response = await fetch(API_BASE, {
      method: 'GET',
      credentials: 'include', // セッションCookieを含む
    });
    
    if (response.status === 401) {
      // 認証エラーの場合は空配列を返す
      return [];
    }
    
    if (!response.ok) throw new Error('記事の取得に失敗しました');
    
    const articles = await response.json();
    
    // APIのレスポンスを整形
    return articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      tags: article.tags?.map((t: any) => t.tag.name) || [],
    }));
  } catch (error) {
    console.error('記事の取得エラー:', error);
    // エラー時はローカルストレージから取得（フォールバック）
    const stored = localStorage.getItem('kyuubi-articles');
    return stored ? JSON.parse(stored) : [];
  }
}

// 記事を保存
export async function saveArticle(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<Article> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // セッションCookieを含む
      body: JSON.stringify(article),
    });
    
    if (!response.ok) throw new Error('記事の作成に失敗しました');
    
    const created = await response.json();
    
    // APIのレスポンスを整形
    return {
      id: created.id,
      title: created.title,
      content: created.content,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      tags: created.tags?.map((t: any) => t.tag.name) || [],
    };
  } catch (error) {
    console.error('記事の作成エラー:', error);
    // エラー時はローカルストレージに保存（フォールバック）
    const articles = getAllArticlesFromLocal();
    const now = new Date().toISOString();
    const newArticle: Article = {
      ...article,
      id: `local-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    articles.push(newArticle);
    localStorage.setItem('kyuubi-articles', JSON.stringify(articles));
    return newArticle;
  }
}

// 記事を更新
export async function updateArticle(id: string, updates: Partial<Pick<Article, 'title' | 'content' | 'tags'>>): Promise<Article | null> {
  try {
    const response = await fetch(API_BASE, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // セッションCookieを含む
      body: JSON.stringify({ id, ...updates }),
    });
    
    if (!response.ok) throw new Error('記事の更新に失敗しました');
    
    const updated = await response.json();
    
    // APIのレスポンスを整形
    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      tags: updated.tags?.map((t: any) => t.tag.name) || [],
    };
  } catch (error) {
    console.error('記事の更新エラー:', error);
    // エラー時はローカルストレージで更新（フォールバック）
    const articles = getAllArticlesFromLocal();
    const index = articles.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    articles[index] = {
      ...articles[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('kyuubi-articles', JSON.stringify(articles));
    return articles[index];
  }
}

// 記事を削除
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}?id=${id}`, {
      method: 'DELETE',
      credentials: 'include', // セッションCookieを含む
    });
    
    if (!response.ok) throw new Error('記事の削除に失敗しました');
    
    return true;
  } catch (error) {
    console.error('記事の削除エラー:', error);
    // エラー時はローカルストレージから削除（フォールバック）
    const articles = getAllArticlesFromLocal();
    const filtered = articles.filter(a => a.id !== id);
    if (filtered.length === articles.length) return false;
    
    localStorage.setItem('kyuubi-articles', JSON.stringify(filtered));
    return true;
  }
}

// IDで記事を取得
export async function getArticleById(id: string): Promise<Article | null> {
  const articles = await getAllArticles();
  return articles.find(article => article.id === id) || null;
}

// タイトルでの検索
export async function searchArticlesByTitle(query: string): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles.filter(article => 
    article.title.toLowerCase().includes(query.toLowerCase())
  );
}

// タグでの検索
export async function searchArticlesByTag(tag: string): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles.filter(article => 
    article.tags.includes(tag)
  );
}

// ローカルストレージから記事を取得（フォールバック用）
function getAllArticlesFromLocal(): Article[] {
  try {
    const stored = localStorage.getItem('kyuubi-articles');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('ローカルストレージ読み込みエラー:', error);
    return [];
  }
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