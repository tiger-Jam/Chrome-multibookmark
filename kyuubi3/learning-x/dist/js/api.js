// Check if Tauri API is available
if (typeof window.__TAURI__ === 'undefined' || typeof window.__TAURI__.tauri === 'undefined') {
    console.error('Tauri API not available');
    throw new Error('Tauri APIが利用できません');
}

const { invoke } = window.__TAURI__.tauri;

class ArticleAPI {
    static async getArticles() {
        try {
            return await invoke('get_articles');
        } catch (error) {
            console.error('Failed to get articles:', error);
            throw new Error(`記事の取得に失敗しました: ${error}`);
        }
    }

    static async getArticle(id) {
        try {
            return await invoke('get_article', { id });
        } catch (error) {
            console.error('Failed to get article:', error);
            throw new Error(`記事の取得に失敗しました: ${error}`);
        }
    }

    static async createArticle(title, content, tags = []) {
        try {
            return await invoke('create_article', {
                request: { title, content, tags }
            });
        } catch (error) {
            console.error('Failed to create article:', error);
            throw new Error(`記事の作成に失敗しました: ${error}`);
        }
    }

    static async updateArticle(id, title, content, tags) {
        try {
            const request = { id };
            if (title !== undefined) request.title = title;
            if (content !== undefined) request.content = content;
            if (tags !== undefined) request.tags = tags;

            return await invoke('update_article', { request });
        } catch (error) {
            console.error('Failed to update article:', error);
            throw new Error(`記事の更新に失敗しました: ${error}`);
        }
    }

    static async deleteArticle(id) {
        try {
            return await invoke('delete_article', { id });
        } catch (error) {
            console.error('Failed to delete article:', error);
            throw new Error(`記事の削除に失敗しました: ${error}`);
        }
    }

    static async publishArticle(id) {
        try {
            return await invoke('publish_article', { id });
        } catch (error) {
            console.error('Failed to publish article:', error);
            throw new Error(`記事の公開に失敗しました: ${error}`);
        }
    }

    static async searchArticles(query) {
        try {
            return await invoke('search_articles', { query });
        } catch (error) {
            console.error('Failed to search articles:', error);
            throw new Error(`記事の検索に失敗しました: ${error}`);
        }
    }
}

// Export to global
window.ArticleAPI = ArticleAPI;
console.log('ArticleAPI loaded successfully');