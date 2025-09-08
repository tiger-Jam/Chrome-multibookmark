'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
// データベース版を使用
import { Article, saveArticle, updateArticle } from '../lib/articleStorageDB';
import ArticleSidebar from './ArticleSidebar';
import ImportExportButtons from './ImportExportButtons';


// Live Previewプラグインを作成する関数
const createLivePreviewPlugin = (isDarkMode: boolean) => ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
    const decorations = [];
    const doc = view.state.doc;
    const selection = view.state.selection.main;
    
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      const lineText = line.text;
      const lineStart = line.from;
      const lineEnd = line.to;
      
      // この行が選択範囲に含まれているかチェック
      const isLineSelected = selection.from <= lineEnd && selection.to >= lineStart;
      
      if (lineText.trim()) {
        let isBlockElement = false;
        
        // 見出しの処理
        const headingMatch = lineText.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch && !isLineSelected) {
          const level = headingMatch[1].length;
          const hashEnd = lineStart + headingMatch[1].length + 1; // +1 for space
          const textStart = hashEnd;
          const textEnd = lineEnd;
          
          // #記号を薄く表示
          decorations.push({
            from: lineStart,
            to: hashEnd,
            decoration: Decoration.mark({
              class: 'heading-syntax',
              attributes: { style: 'opacity: 0.3; color: #666;' }
            })
          });
          
          // 見出しテキストにサイズとスタイルを適用
          const fontSize = level === 1 ? '2em' : 
                          level === 2 ? '1.5em' :
                          level === 3 ? '1.25em' :
                          level === 4 ? '1.1em' :
                          level === 5 ? '1em' : '0.9em';
          const fontWeight = level <= 3 ? 'bold' : '600';
          
          const headingColor = level <= 2 ? (isDarkMode ? '#e2e8f0' : '#1e293b') : 
                              level === 3 ? (isDarkMode ? '#cbd5e1' : '#334155') : 
                              (isDarkMode ? '#94a3b8' : '#64748b');
          const borderStyle = level === 1 ? (isDarkMode ? 'border-bottom: 2px solid #475569;' : 'border-bottom: 2px solid #cbd5e1;') : '';
          
          decorations.push({
            from: textStart,
            to: textEnd,
            decoration: Decoration.mark({
              class: `heading-${level}`,
              attributes: { 
                style: `font-size: ${fontSize}; font-weight: ${fontWeight}; line-height: 1.3; color: ${headingColor}; display: inline-block; padding-top: 0.5em; padding-bottom: 0.3em; ${borderStyle}` 
              }
            })
          });
          isBlockElement = true;
        }
        
        // 引用の処理
        const blockquoteMatch = lineText.match(/^(>\s*)/);
        if (blockquoteMatch && !isLineSelected) {
          const markerEnd = lineStart + blockquoteMatch[1].length;
          
          // 引用符を矢印に変える装飾
          decorations.push({
            from: lineStart,
            to: markerEnd,
            decoration: Decoration.replace({
              widget: new (class extends WidgetType {
                toDOM() {
                  const span = document.createElement('span');
                  span.textContent = '► ';
                  span.style.opacity = '0.6';
                  span.style.color = '#3b82f6';
                  span.style.fontWeight = 'bold';
                  return span;
                }
              })()
            })
          });
          
          // 引用テキストに背景色とボーダーを追加
          const quoteBgColor = isDarkMode ? '#1e293b' : '#eff6ff';
          const quoteBorderColor = '#3b82f6';
          const quoteTextColor = isDarkMode ? '#cbd5e1' : '#475569';
          
          decorations.push({
            from: markerEnd,
            to: lineEnd,
            decoration: Decoration.mark({
              class: 'blockquote-text',
              attributes: { 
                style: `background-color: ${quoteBgColor}; border-left: 4px solid ${quoteBorderColor}; padding: 8px 12px; margin: 4px 0; display: inline-block; border-radius: 0 4px 4px 0; font-style: italic; color: ${quoteTextColor};` 
              }
            })
          });
          isBlockElement = true;
        }
        
        // チェックボックスの処理
        const checkboxMatch = lineText.match(/^(\s*-\s*\[([x\s])\]\s*)/);
        if (checkboxMatch && !isLineSelected) {
          const markerEnd = lineStart + checkboxMatch[1].length;
          const isChecked = checkboxMatch[2].toLowerCase() === 'x';
          
          decorations.push({
            from: lineStart,
            to: markerEnd,
            decoration: Decoration.replace({
              widget: new (class extends WidgetType {
                toDOM() {
                  const span = document.createElement('span');
                  const checkbox = document.createElement('input');
                  checkbox.type = 'checkbox';
                  checkbox.checked = isChecked;
                  checkbox.disabled = true;
                  checkbox.style.marginRight = '8px';
                  span.appendChild(checkbox);
                  return span;
                }
              })()
            })
          });
          isBlockElement = true;
        }
        
        // 通常のリストの処理
        if (!isBlockElement) {
          const listMatch = lineText.match(/^(\s*[-*+]\s+)/);
          if (listMatch && !isLineSelected) {
            const markerEnd = lineStart + listMatch[1].length;
            const indent = lineText.match(/^(\s*)/)?.[1]?.length || 0;
            
            decorations.push({
              from: lineStart,
              to: markerEnd,
              decoration: Decoration.replace({
                widget: new (class extends WidgetType {
                  toDOM() {
                    const span = document.createElement('span');
                    span.textContent = '• ';
                    span.style.color = '#666';
                    span.style.paddingLeft = `${indent * 20}px`;
                    return span;
                  }
                })()
              })
            });
            isBlockElement = true;
          }
        }
        
        // 番号付きリストの処理
        if (!isBlockElement) {
          const orderedListMatch = lineText.match(/^(\s*)(\d+)\.\s+/);
          if (orderedListMatch && !isLineSelected) {
            const fullMatch = lineText.match(/^(\s*\d+\.\s+)/)?.[1] || '';
            const markerEnd = lineStart + fullMatch.length;
            const indent = orderedListMatch[1].length;
            const number = orderedListMatch[2];
            
            decorations.push({
              from: lineStart,
              to: markerEnd,
              decoration: Decoration.replace({
                widget: new (class extends WidgetType {
                  toDOM() {
                    const span = document.createElement('span');
                    span.textContent = `${number}. `;
                    span.style.color = '#666';
                    span.style.paddingLeft = `${indent * 20}px`;
                    return span;
                  }
                })()
              })
            });
            isBlockElement = true;
          }
        }
        
        // インライン要素の処理（行が選択されていない場合のみ）
        if (!isLineSelected) {
          console.log('Processing line for inline elements:', lineText, 'isBlockElement:', isBlockElement);
          // 太字の処理
          const boldRegex = /\*\*(.*?)\*\*/g;
          let boldMatch;
          while ((boldMatch = boldRegex.exec(lineText)) !== null) {
            console.log('Bold match found:', boldMatch[0], 'in line:', lineText);
            const start = lineStart + boldMatch.index;
            const end = start + boldMatch[0].length;
            const innerStart = start + 2;
            const innerEnd = end - 2;
            
            // **を薄く表示
            decorations.push({
              from: start,
              to: innerStart,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            decorations.push({
              from: innerEnd,
              to: end,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            // 内容を太字にする
            decorations.push({
              from: innerStart,
              to: innerEnd,
              decoration: Decoration.mark({
                class: 'bold-text',
                attributes: { style: 'font-weight: bold !important; color: inherit;' }
              })
            });
          }
        
          // 斜体の処理（太字でない部分のみ - より安全な正規表現を使用）
          const italicMatches = [];
          const italicRegex = /\*([^*]+)\*/g;
          let italicMatch;
          while ((italicMatch = italicRegex.exec(lineText)) !== null) {
            // 太字の一部でないかチェック
            const prevChar = lineText.charAt(italicMatch.index - 1);
            const nextChar = lineText.charAt(italicMatch.index + italicMatch[0].length);
            if (prevChar !== '*' && nextChar !== '*') {
              italicMatches.push(italicMatch);
            }
          }
          
          for (const match of italicMatches) {
            const start = lineStart + match.index;
            const end = start + match[0].length;
            const innerStart = start + 1;
            const innerEnd = end - 1;
            
            // *を薄く表示
            decorations.push({
              from: start,
              to: innerStart,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            decorations.push({
              from: innerEnd,
              to: end,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            // 内容を斜体にする
            decorations.push({
              from: innerStart,
              to: innerEnd,
              decoration: Decoration.mark({
                class: 'italic-text',
                attributes: { style: 'font-style: italic !important; color: inherit;' }
              })
            });
          }
          
          // 打ち消し線の処理
          const strikeRegex = /~~(.*?)~~/g;
          let strikeMatch;
          while ((strikeMatch = strikeRegex.exec(lineText)) !== null) {
            const start = lineStart + strikeMatch.index;
            const end = start + strikeMatch[0].length;
            const innerStart = start + 2;
            const innerEnd = end - 2;
            
            // ~~を薄く表示
            decorations.push({
              from: start,
              to: innerStart,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            decorations.push({
              from: innerEnd,
              to: end,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            // 内容に打ち消し線
            decorations.push({
              from: innerStart,
              to: innerEnd,
              decoration: Decoration.mark({
                class: 'strike-text',
                attributes: { style: 'text-decoration: line-through !important; color: inherit;' }
              })
            });
          }
          
          // 内部リンクの処理
          const linkRegex = /\[\[([^\]]+)\]\]/g;
          let linkMatch;
          while ((linkMatch = linkRegex.exec(lineText)) !== null) {
            const start = lineStart + linkMatch.index;
            const end = start + linkMatch[0].length;
            const innerStart = start + 2;
            const innerEnd = end - 2;
            
            // [[]]を薄く表示
            decorations.push({
              from: start,
              to: innerStart,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            decorations.push({
              from: innerEnd,
              to: end,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            // リンク内容をリンク色で表示
            decorations.push({
              from: innerStart,
              to: innerEnd,
              decoration: Decoration.mark({
                class: 'link-text',
                attributes: { style: 'color: #3b82f6; text-decoration: underline;' }
              })
            });
          }
          
          // インラインコードの処理
          const codeRegex = /`([^`]+)`/g;
          let codeMatch;
          while ((codeMatch = codeRegex.exec(lineText)) !== null) {
            const start = lineStart + codeMatch.index;
            const end = start + codeMatch[0].length;
            const innerStart = start + 1;
            const innerEnd = end - 1;
            
            // `を薄く表示
            decorations.push({
              from: start,
              to: innerStart,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            decorations.push({
              from: innerEnd,
              to: end,
              decoration: Decoration.mark({
                class: 'syntax-marker',
                attributes: { style: 'opacity: 0.3;' }
              })
            });
            // コード内容
            const codeBgColor = isDarkMode ? '#374151' : '#f1f5f9';
            const codeTextColor = isDarkMode ? '#e2e8f0' : '#1e293b';
            
            decorations.push({
              from: innerStart,
              to: innerEnd,
              decoration: Decoration.mark({
                class: 'code-text',
                attributes: { style: `background-color: ${codeBgColor}; color: ${codeTextColor}; padding: 2px 4px; border-radius: 3px; font-family: monospace;` }
              })
            });
          }
        }
          
          // タグの処理
          const tagRegex = /(^|\s)(#[\w\u4e00-\u9fa5]+)/g;
          let tagMatch;
          while ((tagMatch = tagRegex.exec(lineText)) !== null) {
            const start = lineStart + tagMatch.index + tagMatch[1].length;
            const end = start + tagMatch[2].length;
            
            const tagBgColor = isDarkMode ? '#581c87' : '#f3e8ff';
            const tagTextColor = isDarkMode ? '#e2e8f0' : '#8b5cf6';
            
            decorations.push({
              from: start,
              to: end,
              decoration: Decoration.mark({
                class: 'tag-text',
                attributes: { style: `color: ${tagTextColor}; background-color: ${tagBgColor}; padding: 1px 6px; border-radius: 12px; font-size: 0.875em;` }
              })
            });
          }
      }
    }
    
      // decorations配列を位置でソートしてからDecoration.setに渡す
      decorations.sort((a, b) => a.from - b.from);
      const sortedDecorations = decorations.map(d => d.decoration.range(d.from, d.to));
      this.decorations = Decoration.set(sortedDecorations);
    }
  },
  {
    decorations: v => v.decorations,
  }
);

export default function ObsidianEditor() {
  const { data: session } = useSession();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [content, setContent] = useState<string>(`# Welcome to Kyuubi Live Preview! 

これは**Obsidian**の*Live Preview*モードを再現しています。

## 機能説明

**太字**、*斜体*、~~打ち消し線~~は選択していない時は装飾されて表示され、選択時にMarkdown記法が見えます。

### 内部リンク
[[ページ名]] や [[ページ名|表示名]] も同様です。

### タグ
#重要 #テスト #プログラミング 

### インラインコード
\`console.log("Hello")\` も隠されます。

### 引用
> これは引用です
> 選択すると > が見えます

### リスト
- 項目1
- 項目2
- 項目3

1. 番号付き項目1
2. 番号付き項目2

### チェックボックス
- [ ] 未完了タスク
- [x] 完了タスク

行を選択してみてください！Markdown記法が表示されます。`);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 記事を選択したときの処理
  const handleArticleSelect = async (article: Article) => {
    // 現在の記事を保存
    if (currentArticle && content !== currentArticle.content) {
      await updateArticle(currentArticle.id, { content });
    }
    
    setCurrentArticle(article);
    setContent(article.content);
    
    // エディタの内容を更新
    if (viewRef.current) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: article.content },
      });
    }
  };

  // 新規記事作成
  const handleNewArticle = async () => {
    const newArticle = await saveArticle({
      title: '新しい記事',
      content: '# 新しい記事\n\nここから編集を始めてください。',
      tags: [],
    });
    handleArticleSelect(newArticle);
  };

  // 記事を保存
  const saveCurrentArticle = useCallback(async () => {
    if (!currentArticle) return;
    
    setIsSaving(true);
    try {
      // タイトルをコンテンツの最初の#見出しから抽出
      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : currentArticle.title;
      
      // タグをコンテンツから抽出
      const tagMatches = content.match(/#(\w+)/g);
      const tags = tagMatches ? Array.from(new Set(tagMatches.map(tag => tag.slice(1)))) : [];
      
      await updateArticle(currentArticle.id, { 
        title, 
        content, 
        tags 
      });
      
      setCurrentArticle(prev => prev ? { ...prev, title, content, tags } : null);
    } catch (error) {
      console.error('保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentArticle, content]);

  // 自動保存機能は削除（手動保存のみ）

  useEffect(() => {
    if (!editorRef.current) return;
    
    // 既存のエディタがある場合は破棄しない（初回のみ作成）
    if (viewRef.current) return;

    const startState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        highlightSelectionMatches(),
        markdown(),
        autocompletion(),
        createLivePreviewPlugin(isDarkMode),
        EditorView.lineWrapping,
        keymap.of([
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          // Ctrl+S で手動保存
          {
            key: 'Ctrl-s',
            mac: 'Cmd-s',
            run: () => {
              // viewRef経由で最新の関数を呼び出す
              const saveBtn = document.querySelector('[data-save-button]') as HTMLButtonElement;
              if (saveBtn) saveBtn.click();
              return true;
            }
          }
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            setContent(newContent);
          }
        }),
        ...(isDarkMode ? [oneDark] : []),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.theme({
          '&': {
            fontSize: '16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            height: 'calc(100vh - 140px)',
            maxHeight: 'calc(100vh - 140px)',
          },
          '.cm-content': {
            padding: '20px',
            lineHeight: '1.6',
          },
          '.cm-focused .cm-cursor': {
            borderLeftColor: '#6366f1',
            borderLeftWidth: '2px',
          },
          '.cm-line': {
            padding: '2px 0',
          },
          '.cm-activeLine': {
            backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
          },
          '.cm-editor': {
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          },
          '.cm-scroller': {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'auto',
            height: '100%',
          },
          
          // Live Preview ウィジェットのスタイル
          '.live-preview-heading-1': {
            fontSize: '2rem',
            fontWeight: 'bold',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            display: 'block',
            marginBottom: '0.5rem',
            borderBottom: isDarkMode ? '2px solid #475569' : '2px solid #cbd5e1',
            paddingBottom: '0.25rem',
          },
          '.live-preview-heading-2': {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: isDarkMode ? '#e2e8f0' : '#334155',
            display: 'block',
            marginBottom: '0.25rem',
          },
          '.live-preview-heading-3': {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            display: 'block',
            marginBottom: '0.25rem',
          },
          '.live-preview-heading-4': {
            fontSize: '1.125rem',
            fontWeight: '600',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            display: 'block',
          },
          '.live-preview-heading-5': {
            fontSize: '1rem',
            fontWeight: '600',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            display: 'block',
          },
          '.live-preview-heading-6': {
            fontSize: '0.875rem',
            fontWeight: '600',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            display: 'block',
          },
          '.live-preview-bold': {
            fontWeight: 'bold',
            color: isDarkMode ? '#fbbf24' : '#d97706',
          },
          '.live-preview-italic': {
            fontStyle: 'italic',
            color: isDarkMode ? '#34d399' : '#059669',
          },
          '.live-preview-strikethrough': {
            textDecoration: 'line-through',
            color: isDarkMode ? '#94a3b8' : '#64748b',
          },
          '.live-preview-link': {
            color: isDarkMode ? '#60a5fa' : '#3b82f6',
            textDecoration: 'none',
            backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: isDarkMode ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
            cursor: 'pointer',
          },
          '.live-preview-tag': {
            color: isDarkMode ? '#a78bfa' : '#8b5cf6',
            backgroundColor: isDarkMode ? 'rgba(167, 139, 250, 0.15)' : 'rgba(139, 92, 246, 0.15)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: isDarkMode ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
          },
          '.live-preview-code': {
            backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
            color: isDarkMode ? '#f87171' : '#dc2626',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          },
          '.live-preview-blockquote': {
            borderLeft: isDarkMode ? '4px solid #60a5fa' : '4px solid #3b82f6',
            backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            padding: '0.5rem 1rem',
            marginLeft: '0',
            fontStyle: 'italic',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            display: 'block',
          },
          '.live-preview-list': {
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '0.25rem',
          },
          '.list-bullet': {
            color: isDarkMode ? '#60a5fa' : '#3b82f6',
            fontWeight: 'bold',
            marginRight: '0.5rem',
            flexShrink: 0,
          },
          '.live-preview-orderedlist': {
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '0.25rem',
          },
          '.ordered-list-number': {
            color: isDarkMode ? '#fbbf24' : '#d97706',
            fontWeight: '600',
            marginRight: '0.5rem',
            flexShrink: 0,
          },
          '.live-preview-checkbox': {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.25rem',
          },
          '.checkbox-container': {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          },
          '.checkbox-input': {
            marginRight: '0.5rem',
            flexShrink: 0,
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // 依存配列を空にして、初回のみ実行
  
  // isDarkModeが変更された場合の処理
  useEffect(() => {
    if (!viewRef.current) return;
    
    // Live Previewプラグインを更新
    viewRef.current.dispatch({
      effects: [
        // プラグインの再作成が必要な場合はここで処理
      ]
    });
  }, [isDarkMode]);

  return (
    <div className={`h-screen flex ${isDarkMode ? 'dark bg-slate-900' : 'bg-white'}`}>
      {/* サイドバー */}
      <ArticleSidebar
        currentArticleId={currentArticle?.id}
        onArticleSelect={handleArticleSelect}
        onNewArticle={handleNewArticle}
        isDarkMode={isDarkMode}
      />

      {/* メインエディタエリア */}
      <div className="flex-1 flex flex-col h-full">
        {/* ツールバー */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <h1 className={`font-semibold ${
              isDarkMode ? 'text-slate-200' : 'text-gray-800'
            }`}>
              {currentArticle?.title || 'Kyuubi Editor'}
            </h1>
            
            {isSaving && (
              <span className={`text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}>
                保存中...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ImportExportButtons
              currentArticle={currentArticle}
              onArticleImported={handleArticleSelect}
              isDarkMode={isDarkMode}
            />
            
            <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />
            
            <button
              onClick={() => saveCurrentArticle()}
              data-save-button
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                isDarkMode 
                  ? 'bg-green-700 hover:bg-green-600 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              💾 保存
            </button>
            
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title={isDarkMode ? 'ライトモード' : 'ダークモード'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />

            {/* ユーザー情報 */}
            {session && (
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt="ユーザーアバター"
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-slate-200' : 'text-gray-800'
                  }`}>
                    {session.user?.name}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    isDarkMode 
                      ? 'bg-red-700 hover:bg-red-600 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  title="サインアウト"
                >
                  🚪 サインアウト
                </button>
              </div>
            )}
          </div>
        </div>

        {/* エディタ */}
        <div className="flex-1 overflow-hidden">
          <div ref={editorRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}