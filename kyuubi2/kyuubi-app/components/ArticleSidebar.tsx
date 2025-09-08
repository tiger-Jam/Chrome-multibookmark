'use client';

import React, { useState, useEffect } from 'react';
// データベース版を使用
import { Article, getAllArticles, deleteArticle, saveArticle } from '../lib/articleStorageDB';

interface ArticleSidebarProps {
  currentArticleId?: string;
  onArticleSelect: (article: Article) => void;
  onNewArticle: () => void;
  isDarkMode: boolean;
}

export default function ArticleSidebar({ 
  currentArticleId, 
  onArticleSelect, 
  isDarkMode 
}: ArticleSidebarProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 記事一覧を更新
  const refreshArticles = async () => {
    const articles = await getAllArticles();
    setArticles(articles);
  };

  useEffect(() => {
    refreshArticles();
    
    // ストレージの変更を監視
    const handleStorageChange = () => {
      refreshArticles();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 記事を削除
  const handleDeleteArticle = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('この記事を削除しますか？')) {
      await deleteArticle(id);
      await refreshArticles();
    }
  };

  // 新規記事作成
  const handleNewArticle = async () => {
    const newArticle = await saveArticle({
      title: '新しい記事',
      content: '# 新しい記事\n\nここから編集を始めてください。',
      tags: [],
    });
    await refreshArticles();
    onArticleSelect(newArticle);
  };

  // 検索フィルタリング
  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`h-full border-r transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    } ${
      isDarkMode 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      
      {/* ヘッダー */}
      <div className={`p-4 border-b ${
        isDarkMode ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-slate-700 text-slate-300' 
                : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            {isCollapsed ? '📁' : '📂'}
          </button>
          
          {!isCollapsed && (
            <>
              <h2 className={`font-semibold ${
                isDarkMode ? 'text-slate-200' : 'text-gray-800'
              }`}>
                記事一覧
              </h2>
              <button
                onClick={handleNewArticle}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                + 新規
              </button>
            </>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* 検索ボックス */}
          <div className="p-4">
            <input
              type="text"
              placeholder="記事を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500'
              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            />
          </div>

          {/* 記事一覧 */}
          <div className="flex-1 overflow-y-auto">
            {filteredArticles.length === 0 ? (
              <div className={`p-4 text-center text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}>
                {searchQuery ? '検索結果がありません' : '記事がありません'}
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => onArticleSelect(article)}
                  className={`p-4 border-b cursor-pointer transition-colors group ${
                    currentArticleId === article.id
                      ? (isDarkMode ? 'bg-slate-700' : 'bg-blue-50')
                      : (isDarkMode ? 'hover:bg-slate-750' : 'hover:bg-gray-100')
                  } ${
                    isDarkMode ? 'border-slate-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm truncate ${
                        isDarkMode ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        {article.title}
                      </h3>
                      
                      {/* タグ */}
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {article.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                isDarkMode 
                                  ? 'bg-slate-600 text-slate-300' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className={`text-xs ${
                              isDarkMode ? 'text-slate-400' : 'text-gray-500'
                            }`}>
                              +{article.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        {new Date(article.updatedAt).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteArticle(article.id, e)}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ml-2 ${
                        isDarkMode 
                          ? 'hover:bg-red-900/50 text-red-400' 
                          : 'hover:bg-red-100 text-red-600'
                      }`}
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 統計情報 */}
          <div className={`p-4 border-t text-xs ${
            isDarkMode 
              ? 'border-slate-700 text-slate-400' 
              : 'border-gray-200 text-gray-500'
          }`}>
            合計: {articles.length} 記事
          </div>
        </>
      )}
    </div>
  );
}