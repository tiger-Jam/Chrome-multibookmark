'use client';

import { useState, useEffect } from 'react';

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

interface ArticleTreeViewProps {
  tailId?: string;
  currentArticleId?: string;
  onArticleSelect: (article: ArticleNode) => void;
  onNewArticle: (parentId?: string) => void;
  isDarkMode?: boolean;
}

export default function ArticleTreeView({ 
  tailId, 
  currentArticleId, 
  onArticleSelect, 
  onNewArticle, 
  isDarkMode = false 
}: ArticleTreeViewProps) {
  const [articles, setArticles] = useState<ArticleNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // 記事ツリーを取得
  const fetchArticleTree = async () => {
    if (!tailId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tails/${tailId}/articles`);
      if (response.ok) {
        const treeData = await response.json();
        setArticles(treeData);
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

  // ノードの展開/折りたたみ
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 記事ツリーをレンダリング
  const renderTreeNode = (node: ArticleNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = currentArticleId === node.id;
    const paddingLeft = `${depth * 20 + 12}px`;

    const nodeClasses = `
      flex items-center py-2 px-3 cursor-pointer rounded-md transition-colors
      ${isSelected 
        ? isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-900'
        : isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-100 text-gray-800'
      }
    `;

    return (
      <div key={node.id}>
        <div 
          className={nodeClasses}
          style={{ paddingLeft }}
          onClick={() => onArticleSelect(node)}
        >
          {/* 展開/折りたたみアイコン */}
          <div className="w-4 h-4 mr-2 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <div className="w-3 h-3" />
            )}
          </div>

          {/* ファイル/フォルダアイコン */}
          <div className="w-4 h-4 mr-3 flex-shrink-0">
            {node.isFolder ? (
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* タイトル */}
          <span className="flex-1 truncate text-sm font-medium">
            {node.title}
          </span>

          {/* 新規記事作成ボタン */}
          {node.isFolder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNewArticle(node.id);
              }}
              className={`opacity-0 group-hover:opacity-100 ml-2 p-1 rounded transition-opacity ${
                isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'
              }`}
              title="子記事を作成"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* 子ノード */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchArticleTree();
  }, [tailId]);

  const bgColor = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-gray-800';
  const borderColor = isDarkMode ? 'border-slate-600' : 'border-gray-200';

  if (loading) {
    return (
      <div className={`h-full ${bgColor} ${textColor} p-4`}>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-4 h-4 bg-slate-400 rounded mr-3"></div>
              <div className="h-4 bg-slate-400 rounded flex-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!tailId) {
    return (
      <div className={`h-full ${bgColor} ${textColor} flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          Tailを選択してください
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${bgColor} ${textColor} flex flex-col`}>
      {/* ヘッダー */}
      <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
        <h3 className="font-semibold">記事</h3>
        <button
          onClick={() => onNewArticle()}
          className={`p-1 rounded transition-colors ${
            isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
          }`}
          title="新しい記事を作成"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
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

      {/* 記事ツリー */}
      <div className="flex-1 overflow-y-auto p-2">
        {articles.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            記事がありません<br />
            新しい記事を作成してください
          </div>
        ) : (
          <div className="space-y-1 group">
            {articles.map((article) => renderTreeNode(article))}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className={`p-4 border-t ${borderColor}`}>
        <div className="text-xs opacity-60 text-center">
          {articles.length} 記事
        </div>
      </div>
    </div>
  );
}