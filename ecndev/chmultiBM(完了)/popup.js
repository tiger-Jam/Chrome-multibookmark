class BookmarkSetManager {
  constructor() {
    this.currentSetName = null;
    this.bookmarkSets = {};
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadData() {
    const data = await chrome.storage.local.get(['bookmarkSets', 'currentSet']);
    this.bookmarkSets = data.bookmarkSets || {};
    this.currentSetName = data.currentSet || null;
  }

  async saveData() {
    await chrome.storage.local.set({
      bookmarkSets: this.bookmarkSets,
      currentSet: this.currentSetName
    });
  }

  setupEventListeners() {
    document.getElementById('save-current').addEventListener('click', () => {
      this.saveCurrentBookmarks();
    });

    document.getElementById('load-set').addEventListener('click', () => {
      this.loadSelectedSet();
    });

    document.getElementById('create-set').addEventListener('click', () => {
      this.createNewSet();
    });

    document.getElementById('new-set-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.createNewSet();
      }
    });
  }

  async getCurrentBookmarks() {
    const bookmarksBar = await chrome.bookmarks.getChildren('1'); // ブックマークバー
    return this.flattenBookmarks(bookmarksBar);
  }

  flattenBookmarks(bookmarks) {
    let result = [];
    for (const bookmark of bookmarks) {
      if (bookmark.url) {
        result.push({
          title: bookmark.title,
          url: bookmark.url,
          index: bookmark.index,
          parentId: bookmark.parentId
        });
      } else if (bookmark.children) {
        result = result.concat(this.flattenBookmarks(bookmark.children));
      }
    }
    return result;
  }

  async saveCurrentBookmarks() {
    if (!this.currentSetName) {
      this.showStatus('セットが選択されていません', 'error');
      return;
    }

    try {
      const bookmarks = await this.getCurrentBookmarks();
      this.bookmarkSets[this.currentSetName] = bookmarks;
      await this.saveData();
      this.showStatus(`${this.currentSetName} に保存しました (${bookmarks.length}件)`, 'success');
      this.updateUI();
    } catch (error) {
      this.showStatus('保存に失敗しました', 'error');
      console.error(error);
    }
  }

  async loadSelectedSet() {
    if (!this.currentSetName || !this.bookmarkSets[this.currentSetName]) {
      this.showStatus('セットが選択されていません', 'error');
      return;
    }

    try {
      // 現在のブックマークバーをクリア
      await this.clearBookmarksBar();

      // 選択されたセットのブックマークを追加
      const bookmarks = this.bookmarkSets[this.currentSetName];
      for (const bookmark of bookmarks) {
        await chrome.bookmarks.create({
          parentId: '1', // ブックマークバー
          title: bookmark.title,
          url: bookmark.url
        });
        // ファビコン取得のために短い遅延
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      this.showStatus(`${this.currentSetName} を適用しました (${bookmarks.length}件)`, 'success');
    } catch (error) {
      this.showStatus('読み込みに失敗しました', 'error');
      console.error(error);
    }
  }

  async clearBookmarksBar() {
    const bookmarks = await chrome.bookmarks.getChildren('1');
    for (const bookmark of bookmarks) {
      await chrome.bookmarks.removeTree(bookmark.id);
    }
  }

  async createNewSet() {
    const input = document.getElementById('new-set-name');
    const name = input.value.trim();

    if (!name) {
      this.showStatus('セット名を入力してください', 'error');
      return;
    }

    if (this.bookmarkSets[name]) {
      this.showStatus('同じ名前のセットが既に存在します', 'error');
      return;
    }

    this.bookmarkSets[name] = [];
    this.currentSetName = name;
    await this.saveData();

    input.value = '';
    this.showStatus(`${name} を作成しました`, 'success');
    this.updateUI();
  }

  selectSet(name) {
    this.currentSetName = name;
    this.saveData();
    this.updateUI();
  }

  async deleteSet(name) {
    if (confirm(`${name} を削除しますか？`)) {
      delete this.bookmarkSets[name];
      if (this.currentSetName === name) {
        this.currentSetName = null;
      }
      await this.saveData();
      this.updateUI();
      this.showStatus(`${name} を削除しました`, 'success');
    }
  }

  updateUI() {
    // 現在のセット表示
    const currentSetElement = document.getElementById('current-set-name');
    currentSetElement.textContent = this.currentSetName || '未選択';

    // セット一覧表示
    const setListElement = document.getElementById('set-list');
    setListElement.innerHTML = '';

    for (const [name, bookmarks] of Object.entries(this.bookmarkSets)) {
      const setElement = document.createElement('div');
      setElement.className = `set-item ${name === this.currentSetName ? 'active' : ''}`;

      setElement.innerHTML = `
        <div class="set-name">${name}</div>
        <div class="bookmark-count">${bookmarks.length}</div>
      `;

      setElement.addEventListener('click', (e) => {
        if (e.target.className !== 'delete-btn') {
          this.selectSet(name);
        }
      });

      // 右クリックで削除
      setElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.deleteSet(name);
      });

      setListElement.appendChild(setElement);
    }
  }


  showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';

    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  new BookmarkSetManager();
});