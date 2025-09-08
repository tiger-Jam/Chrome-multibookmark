'use client';

import React, { useRef } from 'react';
// データベース版を使用
import { Article, saveArticle, exportArticleAsMarkdown, importArticleFromMarkdown } from '../lib/articleStorageDB';

interface ImportExportButtonsProps {
  currentArticle: Article | null;
  onArticleImported: (article: Article) => void;
  isDarkMode: boolean;
}

export default function ImportExportButtons({ 
  currentArticle, 
  onArticleImported,
  isDarkMode 
}: ImportExportButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 記事をエクスポート（.mdファイルとしてダウンロード）
  const handleExport = () => {
    if (!currentArticle) {
      alert('エクスポートする記事がありません');
      return;
    }

    const markdownContent = exportArticleAsMarkdown(currentArticle);
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentArticle.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ファイルインポートトリガー
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // ファイルが選択されたときの処理
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const articleData = importArticleFromMarkdown(content);
        
        // 新しい記事として保存
        const newArticle = await saveArticle(articleData);
        onArticleImported(newArticle);
        
        alert(`記事「${newArticle.title}」をインポートしました`);
      } catch (error) {
        console.error('インポートエラー:', error);
        alert('ファイルのインポートに失敗しました');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // 同じファイルを再度選択できるようにリセット
  };

  // 全記事をエクスポート
  const handleExportAll = () => {
    import('../lib/articleStorageDB').then(async ({ getAllArticles }) => {
      const articles = await getAllArticles();
      
      if (articles.length === 0) {
        alert('エクスポートする記事がありません');
        return;
      }

      // 全記事を1つのZIPファイルにエクスポート（簡易版：JSONとして）
      const allArticlesData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        articles: articles.map(article => ({
          ...article,
          markdown: exportArticleAsMarkdown(article)
        }))
      };

      const blob = new Blob([JSON.stringify(allArticlesData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyuubi-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 現在の記事をエクスポート */}
      <button
        onClick={handleExport}
        disabled={!currentArticle}
        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
          currentArticle
            ? (isDarkMode 
                ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white')
            : (isDarkMode 
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed')
        }`}
        title="現在の記事を.mdファイルとしてエクスポート"
      >
        📤 エクスポート
      </button>

      {/* .mdファイルをインポート */}
      <button
        onClick={handleImportClick}
        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
          isDarkMode 
            ? 'bg-purple-700 hover:bg-purple-600 text-white' 
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
        title=".mdファイルから記事をインポート"
      >
        📥 インポート
      </button>

      {/* 全記事バックアップ */}
      <button
        onClick={handleExportAll}
        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
          isDarkMode 
            ? 'bg-orange-700 hover:bg-orange-600 text-white' 
            : 'bg-orange-600 hover:bg-orange-700 text-white'
        }`}
        title="全記事をバックアップファイルとしてエクスポート"
      >
        💾 バックアップ
      </button>
    </div>
  );
}