'use client';

// インラインSVGアイコンを使用（@heroicons/react依存関係を削除）

interface BreadcrumbItem {
  id: string;
  title: string;
  path: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (articleId: string) => void;
  tailName: string;
  isDarkMode?: boolean;
}

export default function Breadcrumbs({ 
  items, 
  onNavigate, 
  tailName,
  isDarkMode = false 
}: BreadcrumbsProps) {
  const handleClick = (item: BreadcrumbItem) => {
    onNavigate(item.id);
  };

  const textColor = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const hoverColor = isDarkMode ? 'hover:text-white' : 'hover:text-slate-900';
  const iconColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <nav className={`flex items-center space-x-1 text-sm ${textColor}`} aria-label="パンくずリスト">
      {/* Tailのルート */}
      <div className={`flex items-center space-x-1 ${hoverColor} cursor-pointer`}>
        <svg className={`h-4 w-4 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0a2 2 0 002-2h12l2 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        <span className="font-medium">{tailName}</span>
      </div>
      
      {/* 記事の階層 */}
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center space-x-1">
          <svg className={`h-3 w-3 ${iconColor} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button
            onClick={() => handleClick(item)}
            className={`${hoverColor} transition-colors duration-200 truncate max-w-xs`}
            title={item.title}
          >
            {index === items.length - 1 ? (
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {item.title}
              </span>
            ) : (
              <span className="hover:underline">{item.title}</span>
            )}
          </button>
        </div>
      ))}
    </nav>
  );
}

// Notion風のパンくずリストコンポーネント
interface NotionStyleBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (articleId: string) => void;
  tailName: string;
  isDarkMode?: boolean;
}

export function NotionStyleBreadcrumbs({
  items,
  onNavigate,
  tailName,
  isDarkMode = false
}: NotionStyleBreadcrumbsProps) {
  const handleClick = (item: BreadcrumbItem) => {
    onNavigate(item.id);
  };

  const bgColor = isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100/50';
  const textColor = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const hoverBg = isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200';

  return (
    <div className={`flex items-center space-x-1 p-2 rounded-lg ${bgColor} backdrop-blur-sm`}>
      {/* Tailルート */}
      <div className={`px-2 py-1 rounded text-xs font-medium ${textColor} ${hoverBg} transition-colors cursor-pointer`}>
        {tailName}
      </div>
      
      {/* 記事階層 */}
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center space-x-1">
          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>/</span>
          <button
            onClick={() => handleClick(item)}
            className={`px-2 py-1 rounded text-xs ${textColor} ${hoverBg} transition-colors truncate max-w-32`}
            title={item.title}
          >
            {item.title}
          </button>
        </div>
      ))}
    </div>
  );
}