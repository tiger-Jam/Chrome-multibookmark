class ArticleApp {
    constructor() {
        this.currentArticle = null;
        this.articles = [];
        this.isEditing = false;
        this.searchQuery = '';

        this.initializeElements();
        this.bindEvents();
        this.loadArticles();
        this.setStatus('準備完了');
    }

    initializeElements() {
        // Get all elements
        this.searchInput = document.getElementById('search-input');
        this.articlesList = document.getElementById('articles-list');
        this.newBtn = document.getElementById('new-btn');
        this.saveBtn = document.getElementById('save-btn');
        this.deleteBtn = document.getElementById('delete-btn');
        this.publishBtn = document.getElementById('publish-btn');
        this.editorTitle = document.getElementById('editor-title');
        this.editorContent = document.getElementById('editor-content');
        this.statusText = document.getElementById('status-text');
        this.wordCount = document.getElementById('word-count');
        this.charCount = document.getElementById('char-count');
    }

    bindEvents() {
        if (this.newBtn) this.newBtn.addEventListener('click', () => this.newArticle());
        if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.saveArticle());
        if (this.deleteBtn) this.deleteBtn.addEventListener('click', () => this.deleteArticle());
        if (this.publishBtn) this.publishBtn.addEventListener('click', () => this.publishArticle());
        if (this.searchInput) this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        if (this.editorTitle) this.editorTitle.addEventListener('input', () => this.handleEditorChange());
        if (this.editorContent) this.editorContent.addEventListener('input', () => this.handleEditorChange());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveArticle();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newArticle();
                        break;
                }
            }
        });
    }

    async loadArticles() {
        try {
            this.setStatus('記事を読み込み中...');
            this.articles = await ArticleAPI.getArticles();
            this.renderArticlesList();
            this.setStatus('準備完了');
        } catch (error) {
            this.setStatus(`エラー: ${error.message}`);
        }
    }

    renderArticlesList() {
        if (!this.articlesList) return;

        if (this.articles.length === 0) {
            this.articlesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>記事がありません</h3>
                    <p>新しい記事を作成して始めましょう</p>
                </div>
            `;
            return;
        }

        let filteredArticles = this.articles;
        if (this.searchQuery) {
            filteredArticles = this.articles.filter(article =>
                article.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                article.content.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }

        this.articlesList.innerHTML = filteredArticles.map(article => `
            <div class="article-item ${this.currentArticle?.id === article.id ? 'active' : ''}"
                 onclick="app.selectArticle('${article.id}')">
                <div class="article-title">${this.escapeHtml(article.title)}</div>
                <div class="article-meta">
                    <div class="article-status">
                        <span class="status-dot ${article.published ? 'published' : 'draft'}"></span>
                        ${article.published ? '公開済み' : '下書き'}
                    </div>
                    <span>${this.formatDate(article.updated_at)}</span>
                </div>
            </div>
        `).join('');
    }

    async selectArticle(id) {
        if (this.isEditing && !confirm('保存されていない変更があります。破棄してもよろしいですか？')) {
            return;
        }

        try {
            const article = await ArticleAPI.getArticle(id);
            if (article) {
                this.currentArticle = article;
                if (this.editorTitle) this.editorTitle.value = article.title;
                if (this.editorContent) this.editorContent.value = article.content;
                this.isEditing = false;
                this.renderArticlesList();
                this.updateToolbarState();
                this.updateCounts();
                this.setStatus(`編集中: ${article.title}`);
            }
        } catch (error) {
            this.setStatus(`エラー: ${error.message}`);
        }
    }

    newArticle() {
        if (this.isEditing && !confirm('保存されていない変更があります。破棄してもよろしいですか？')) {
            return;
        }

        this.currentArticle = null;
        if (this.editorTitle) this.editorTitle.value = '';
        if (this.editorContent) this.editorContent.value = '';
        this.isEditing = false;
        this.renderArticlesList();
        this.updateToolbarState();
        this.updateCounts();
        this.setStatus('新しい記事');
        if (this.editorTitle) this.editorTitle.focus();
    }

    async saveArticle() {
        if (!this.editorTitle || !this.editorContent) return;

        const title = this.editorTitle.value.trim();
        const content = this.editorContent.value.trim();

        if (!title) {
            alert('タイトルを入力してください');
            this.editorTitle.focus();
            return;
        }

        if (!content) {
            alert('内容を入力してください');
            this.editorContent.focus();
            return;
        }

        try {
            this.setStatus('保存中...');

            if (this.currentArticle) {
                this.currentArticle = await ArticleAPI.updateArticle(
                    this.currentArticle.id, title, content
                );
                this.setStatus(`更新完了: ${title}`);
            } else {
                this.currentArticle = await ArticleAPI.createArticle(title, content);
                this.setStatus(`作成完了: ${title}`);
            }

            this.isEditing = false;
            await this.loadArticles();
            this.updateToolbarState();

        } catch (error) {
            this.setStatus(`エラー: ${error.message}`);
        }
    }

    async deleteArticle() {
        if (!this.currentArticle) {
            alert('削除する記事を選択してください');
            return;
        }

        if (!confirm(`「${this.currentArticle.title}」を削除してもよろしいですか？`)) {
            return;
        }

        try {
            this.setStatus('削除中...');
            await ArticleAPI.deleteArticle(this.currentArticle.id);
            this.setStatus('記事を削除しました');
            this.newArticle();
            await this.loadArticles();
        } catch (error) {
            this.setStatus(`エラー: ${error.message}`);
        }
    }

    async publishArticle() {
        if (!this.currentArticle) {
            alert('公開する記事を選択してください');
            return;
        }

        if (this.currentArticle.published) {
            alert('この記事は既に公開済みです');
            return;
        }

        try {
            this.setStatus('公開中...');
            this.currentArticle = await ArticleAPI.publishArticle(this.currentArticle.id);
            this.setStatus(`公開完了: ${this.currentArticle.title}`);
            await this.loadArticles();
            this.updateToolbarState();
        } catch (error) {
            this.setStatus(`エラー: ${error.message}`);
        }
    }

    handleSearch(query) {
        this.searchQuery = query;
        this.renderArticlesList();
    }

    handleEditorChange() {
        this.isEditing = true;
        this.updateCounts();
        this.updateToolbarState();
    }

    updateToolbarState() {
        if (this.deleteBtn) this.deleteBtn.disabled = !this.currentArticle;
        if (this.publishBtn) {
            this.publishBtn.disabled = !this.currentArticle || this.currentArticle?.published || this.isEditing;

            if (this.currentArticle?.published) {
                this.publishBtn.textContent = '🚀 公開済み';
            } else if (this.isEditing) {
                this.publishBtn.textContent = '🚀 保存してから公開';
            } else {
                this.publishBtn.textContent = '🚀 公開';
            }
        }
    }

    updateCounts() {
        if (!this.editorContent || !this.wordCount || !this.charCount) return;

        const content = this.editorContent.value;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;

        this.wordCount.textContent = `${words} 語`;
        this.charCount.textContent = `${chars} 文字`;
    }

    setStatus(message) {
        if (this.statusText) {
            this.statusText.textContent = message;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '今';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}日前`;

        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize app when this script loads
if (window.ArticleAPI) {
    window.app = new ArticleApp();
    console.log('Article App initialized successfully');
} else {
    console.error('ArticleAPI not available');
}