'use client';

import { useState, useEffect } from 'react';

interface Tail {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface TailSidebarProps {
  currentTailId?: string;
  onTailSelect: (tail: Tail) => void;
  onNewTail: () => void;
  isDarkMode?: boolean;
}

export default function TailSidebar({ 
  currentTailId, 
  onTailSelect, 
  onNewTail, 
  isDarkMode = false 
}: TailSidebarProps) {
  const [tails, setTails] = useState<Tail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTailName, setNewTailName] = useState('');
  const [newTailDisplayName, setNewTailDisplayName] = useState('');

  // Tail一覧を取得
  const fetchTails = async () => {
    try {
      const response = await fetch('/api/tails');
      if (response.ok) {
        const tailsData = await response.json();
        setTails(tailsData);
      } else {
        setError('Tailの取得に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 新しいTailを作成
  const createTail = async () => {
    if (!newTailName.trim() || !newTailDisplayName.trim()) return;

    try {
      const response = await fetch('/api/tails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTailName.trim(),
          displayName: newTailDisplayName.trim(),
          description: '',
        }),
      });

      if (response.ok) {
        const newTail = await response.json();
        setTails(prev => [...prev, newTail]);
        setNewTailName('');
        setNewTailDisplayName('');
        setIsCreating(false);
        onTailSelect(newTail);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Tailの作成に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    }
  };

  useEffect(() => {
    fetchTails();
  }, []);

  const bgColor = isDarkMode ? 'bg-slate-800' : 'bg-gray-50';
  const textColor = isDarkMode ? 'text-slate-200' : 'text-gray-800';
  const hoverColor = isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const selectedColor = isDarkMode ? 'bg-slate-700 text-white' : 'bg-blue-100 text-blue-900';
  const borderColor = isDarkMode ? 'border-slate-600' : 'border-gray-200';

  if (loading) {
    return (
      <div className={`w-64 h-full ${bgColor} ${textColor} p-4 border-r ${borderColor}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-400 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-400 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-64 h-full ${bgColor} ${textColor} flex flex-col border-r ${borderColor}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tails</h2>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className={`p-1 rounded ${hoverColor} transition-colors`}
            title="新しいTailを作成"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* 新規作成フォーム */}
        {isCreating && (
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Tail名（英数字）"
              value={newTailName}
              onChange={(e) => setNewTailName(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'
              }`}
            />
            <input
              type="text"
              placeholder="表示名"
              value={newTailDisplayName}
              onChange={(e) => setNewTailDisplayName(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'
              }`}
            />
            <div className="flex space-x-2">
              <button
                onClick={createTail}
                disabled={!newTailName.trim() || !newTailDisplayName.trim()}
                className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                作成
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTailName('');
                  setNewTailDisplayName('');
                }}
                className={`flex-1 px-3 py-1 text-sm border rounded ${hoverColor} ${borderColor}`}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
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

      {/* Tail一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        {tails.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Tailがありません<br />
            新しいTailを作成してください
          </div>
        ) : (
          <div className="space-y-2">
            {tails.map((tail) => (
              <div
                key={tail.id}
                onClick={() => onTailSelect(tail)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentTailId === tail.id ? selectedColor : hoverColor
                }`}
              >
                <div className="font-medium">{tail.displayName}</div>
                <div className="text-sm opacity-70">{tail.name}</div>
                {tail.description && (
                  <div className="text-xs opacity-60 mt-1 truncate">
                    {tail.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="p-4 border-t border-slate-600">
        <div className="text-xs opacity-60 text-center">
          {tails.length} Tail{tails.length !== 1 && 's'}
        </div>
      </div>
    </div>
  );
}