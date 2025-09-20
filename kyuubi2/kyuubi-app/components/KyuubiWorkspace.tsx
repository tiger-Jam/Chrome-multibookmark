'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import TailSidebar from './TailSidebar';
import ArticleTreeView from './ArticleTreeView';
import ObsidianEditor from './ObsidianEditor';
import Breadcrumbs from './Breadcrumbs';

interface Tail {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  path: string;
  isFolder: boolean;
  level: number;
  parentId?: string;
  tail: Tail;
  breadcrumbs?: Array<{ id: string; title: string; path: string }>;
}

interface ArticleNode {
  id: string;
  title: string;
  path: string;
  isFolder: boolean;
  level: number;
  order: number;
  children?: ArticleNode[];
  parentId?: string;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
}

export default function KyuubiWorkspace() {
  const { data: session } = useSession();
  const [currentTail, setCurrentTail] = useState<Tail | null>(null);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 記事を取得
  const fetchArticle = async (articleId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/articles/${articleId}`);
      if (response.ok) {
        const articleData = await response.json();
        setCurrentArticle(articleData);
        setError(null);
      } else {
        setError('記事の取得に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Tailを選択したときの処理
  const handleTailSelect = (tail: Tail) => {
    setCurrentTail(tail);
    setCurrentArticle(null); // 記事選択をリセット
  };

  // 記事を選択したときの処理
  const handleArticleSelect = (articleNode: ArticleNode) => {
    if (!articleNode.isFolder) {
      fetchArticle(articleNode.id);
    }
  };

  // パンくずリストのナビゲーション
  const handleBreadcrumbNavigate = (articleId: string) => {
    fetchArticle(articleId);
  };

  // 新しいTailを作成
  const handleNewTail = () => {
    // TailSidebarコンポーネント内で処理
  };

  // 新しい記事を作成
  const handleNewArticle = useCallback(async (parentId?: string) => {
    if (!currentTail) return;

    try {
      const response = await fetch(`/api/tails/${currentTail.id}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '新しい記事',
          content: '# 新しい記事\\n\\nここから編集を始めてください。',
          parentId,
          isFolder: false,
        }),
      });

      if (response.ok) {
        const newArticle = await response.json();
        // 新しく作成された記事を開く
        fetchArticle(newArticle.id);
      } else {
        setError('記事の作成に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    }
  }, [currentTail]);

  // 記事を保存
  const handleArticleSave = useCallback(async (title: string, content: string) => {
    if (!currentArticle) return;

    try {
      const response = await fetch(`/api/articles/${currentArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (response.ok) {
        const updatedArticle = await response.json();
        setCurrentArticle(prev => prev ? { ...prev, title, content } : null);
      } else {
        setError('記事の保存に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    }
  }, [currentArticle]);

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">
            ログインが必要です
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex ${isDarkMode ? 'dark bg-slate-900' : 'bg-white'}`}>
      {/* 左サイドバー: Tail管理 + 記事ツリー */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-0' : 'w-80'} flex-shrink-0`}>
        {!isSidebarCollapsed && (
          <div className="h-full flex flex-col border-r border-slate-600">
            {/* 上部: Tail管理 */}
            <div className="flex-shrink-0">
              <TailSidebar
                currentTailId={currentTail?.id}
                onTailSelect={handleTailSelect}
                onNewTail={handleNewTail}
                isDarkMode={isDarkMode}
              />
            </div>
            
            {/* 下部: 記事ツリー */}
            {currentTail && (
              <div className="flex-1 border-t border-slate-600">
                <ArticleTreeView
                  tailId={currentTail.id}
                  currentArticleId={currentArticle?.id}
                  onArticleSelect={handleArticleSelect}
                  onNewArticle={handleNewArticle}
                  isDarkMode={isDarkMode}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col">
        {/* トップバー */}
        <div className={`h-14 border-b flex items-center px-4 ${
          isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-800'
        }`}>
          {/* サイドバー切り替えボタン */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-2 rounded mr-4 transition-colors ${
              isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
            }`}
            title={isSidebarCollapsed ? 'サイドバーを表示' : 'サイドバーを隠す'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>

          {/* パンくずリスト */}
          {currentArticle?.breadcrumbs && (
            <Breadcrumbs
              items={currentArticle.breadcrumbs}
              onNavigate={handleBreadcrumbNavigate}
              tailName={currentTail?.displayName}
              isDarkMode={isDarkMode}
            />
          )}

          <div className="flex-1" />

          {/* ダークモード切り替え */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded transition-colors ${
              isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
            }`}
            title={isDarkMode ? 'ライトモード' : 'ダークモード'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-hidden">
          {currentArticle ? (
            <div className="h-full">
              <ObsidianEditor
                article={currentArticle}
                onSave={handleArticleSave}
                isDarkMode={isDarkMode}
              />
            </div>
          ) : currentTail ? (
            <div className={`h-full flex items-center justify-center ${
              isDarkMode ? 'text-slate-400' : 'text-gray-500'
            }`}>
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-lg mb-2">記事を選択してください</div>
                <div className="text-sm opacity-70">
                  左のツリーから記事を選択するか、新しい記事を作成してください
                </div>
              </div>
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center ${
              isDarkMode ? 'text-slate-400' : 'text-gray-500'
            }`}>
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <div className="text-lg mb-2">Tailを選択してください</div>
                <div className="text-sm opacity-70">
                  左のサイドバーからTailを選択するか、新しいTailを作成してください
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}