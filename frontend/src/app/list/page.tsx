'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Article {
  id: number;
  title: string;
  summary: string;
  source: string;
  author: string;
  published_at: string;
  status: string;
  category: string;
  tags: string;
}

interface Category {
  category: string;
  article_count: number;
}

interface Filters {
  status: string;
  source: string;
  category: string;
  tags: string;
  date_from: string;
  date_to: string;
  sort: string;
}

export default function ListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    status: 'precious', // 默认只显示精选文章
    source: '',
    category: '',
    tags: '',
    date_from: '',
    date_to: '',
    sort: 'published_at'
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // 检查是否已登录 & 手机端默认收起侧边栏
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsAdmin(!!token);
    
    // 手机端默认收起
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    
    // 检查主题
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // 构造带认证的请求头
  const getHeaders = (): HeadersInit => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  };

  // 加载分类、来源、标签
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getHeaders();
        const [categoriesRes, sourcesRes, tagsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/categories`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/sources`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/tags`, { headers })
        ]);
        
        const categoriesData = await categoriesRes.json();
        const sourcesData = await sourcesRes.json();
        const tagsData = await tagsRes.json();
        
        if (categoriesData.success) setCategories(categoriesData.data || []);
        if (sourcesData.success) setSources(sourcesData.data || []);
        if (tagsData.success) setTags(tagsData.data || []);
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };
    
    fetchData();
  }, []);

  // 加载文章列表
  useEffect(() => {
    const params = new URLSearchParams();
    
    // 未登录用户只能查看精选文章
    if (!isAdmin) {
      params.set('status', 'precious');
    } else {
      // 管理员可以查看所有状态
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    }
    
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?${params.toString()}`, {
      headers: getHeaders()
    })
      .then(res => res.json())
      .then(data => {
        setArticles(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters, isAdmin]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      source: '',
      category: '',
      tags: '',
      date_from: '',
      date_to: '',
      sort: 'published_at'
    });
  };

  const parseTags = (tagsStr: string) => {
    try {
      return tagsStr ? JSON.parse(tagsStr) : [];
    } catch {
      return [];
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
              Read Flow
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title={sidebarOpen ? '收起分类' : '展开分类'}
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  )}
                </svg>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                {showFilters ? '隐藏筛选' : '高级筛选'}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title={isDark ? '切换浅色模式' : '切换深色模式'}
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    localStorage.removeItem('admin_token');
                    window.location.reload();
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  退出登录
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* 手机端遮罩层 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 左侧分类列表 - 可收起 */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'} fixed md:sticky top-[64px] left-0 z-10 w-[200px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-y-auto transition-transform duration-200 ${!sidebarOpen ? 'md:hidden' : ''}`}>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">分类</h2>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => handleFilterChange('category', '')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                    filters.category === ''
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  全部分类
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.category}>
                  <button
                    onClick={() => handleFilterChange('category', cat.category)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition flex justify-between items-center ${
                      filters.category === cat.category
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{cat.category}</span>
                    <span className="text-xs opacity-60 dark:opacity-70">{cat.article_count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* 右侧文章列表 */}
        <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)]">
          <div className="mb-6">
            {/* 高级筛选 - 所有用户可用 */}
            {showFilters && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {isAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">状态</label>
                    <select
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="">全部状态</option>
                      <option value="pending">待审阅</option>
                      <option value="precious">精读</option>
                      <option value="later">稍后阅读</option>
                    </select>
                  </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">来源</label>
                    <select
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={filters.source}
                      onChange={(e) => handleFilterChange('source', e.target.value)}
                    >
                      <option value="">全部来源</option>
                      {sources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">标签</label>
                    <select
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={filters.tags}
                      onChange={(e) => handleFilterChange('tags', e.target.value)}
                    >
                      <option value="">全部标签</option>
                      {tags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">排序</label>
                    <select
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={filters.sort}
                      onChange={(e) => handleFilterChange('sort', e.target.value)}
                    >
                      <option value="published_at">发表时间</option>
                      <option value="fetched_at">获取时间</option>
                      <option value="title">标题</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">开始日期</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">结束日期</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline"
                  >
                    清除筛选
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {loading ? (
            <p className="text-gray-500 text-sm">加载中...</p>
          ) : articles.length > 0 ? (
            <div className="space-y-3">
              {articles.map(article => (
                <article
                  key={article.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white flex-1 pr-4">
                      {article.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        article.status === 'precious'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : article.status === 'skipped'
                          ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          : article.status === 'later'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {article.status === 'precious' ? '精读' : 
                       article.status === 'skipped' ? '跳过' :
                       article.status === 'later' ? '稍后' : '待审阅'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {article.summary}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex flex-wrap gap-2">
                      <span>{article.source}</span>
                      {article.author && <span>· {article.author}</span>}
                      <span>· {formatDate(article.published_at)}</span>
                      {article.category && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{article.category}</span>
                      )}
                      {parseTags(article.tags).slice(0, 3).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded">#{tag}</span>
                      ))}
                    </div>
                    <Link
                      href={`/article/${article.id}`}
                      className="text-gray-900 dark:text-white hover:underline font-medium"
                    >
                      阅读 →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">暂无内容</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">请调整筛选条件或同步 FreshRSS 文章</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
