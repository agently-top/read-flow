'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Article {
  id: number;
  title: string;
  summary: string;
  content?: string;
  source: string;
  author: string;
  published_at: string;
  status: string;
  category: string;
  tags: string;
  url?: string;
}

interface Category {
  category: string;
  article_count: number;
}

interface Stats {
  total: number;
  pending: number;
  precious: number;
  skipped: number;
}

export default function AdminDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  // 验证登录状态
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const expires = localStorage.getItem('admin_expires');
    
    if (!token || (expires && new Date(expires) < new Date())) {
      router.push('/admin/login');
      return;
    }

    // 验证会话
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/session`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_expires');
          router.push('/admin/login');
        }
      })
      .catch(() => {
        router.push('/admin/login');
      });
  }, [router]);

  // 加载数据
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const fetchData = async () => {
      try {
        const [articlesRes, categoriesRes, tagsRes, statsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?limit=100&status=pending`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/categories`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/tags`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const articlesData = await articlesRes.json();
        const categoriesData = await categoriesRes.json();
        const tagsData = await tagsRes.json();
        const statsData = await statsRes.json();

        if (articlesData.success) setArticles(articlesData.data || []);
        if (categoriesData.success) setCategories(categoriesData.data || []);
        if (tagsData.success) setTags(tagsData.data || []);
        if (statsData.success) setStats(statsData.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleReview = async (action: string) => {
    if (!selectedArticle) return;
    
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setProcessing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/articles/${selectedArticle.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: action,
          note: note || undefined
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`已标记为"${action}"`);
        setArticles(prev => prev.filter(a => a.id !== selectedArticle.id));
        setSelectedArticle(null);
        setNote('');
        
        // 更新统计
        if (stats) {
          setStats({
            ...stats,
            pending: stats.pending - 1,
            [action === 'precious' ? 'precious' : action === 'skipped' ? 'skipped' : 'pending']: 
              stats[action === 'precious' ? 'precious' : action === 'skipped' ? 'skipped' : 'pending'] + 1
          });
        }
      } else {
        alert('操作失败：' + data.error);
      }
    } catch (error) {
      alert('操作失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_expires');
    router.push('/');
  };

  const parseTags = (tagsStr: string) => {
    try {
      return tagsStr ? JSON.parse(tagsStr) : [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-lg font-bold text-gray-900">
                Read Flow
              </Link>
              <span className="text-sm text-gray-500">管理员面板</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/list" className="text-sm text-gray-600 hover:text-gray-900">
                返回列表
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 左侧文章列表 */}
        <aside className="w-[400px] bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">待审阅文章 ({stats?.pending || 0})</h2>
            <div className="space-y-2">
              {articles.map(article => (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`w-full text-left p-3 rounded-md border transition ${
                    selectedArticle?.id === article.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                    {article.title}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {article.source} · {new Date(article.published_at).toLocaleDateString('zh-CN')}
                  </div>
                </button>
              ))}
              {articles.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  暂无待审阅文章
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* 右侧审阅面板 */}
        <main className="flex-1 p-6">
          {selectedArticle ? (
            <div className="max-w-3xl">
              <article className="bg-white rounded-lg shadow p-6 mb-6">
                <h1 className="text-2xl font-bold mb-3">{selectedArticle.title}</h1>
                <div className="text-sm text-gray-500 mb-4 flex flex-wrap gap-2">
                  <span>{selectedArticle.source}</span>
                  {selectedArticle.author && <span>· {selectedArticle.author}</span>}
                  <span>· {new Date(selectedArticle.published_at).toLocaleDateString('zh-CN')}</span>
                </div>
                
                {selectedArticle.summary && (
                  <p className="text-gray-700 mb-4">{selectedArticle.summary}</p>
                )}
                
                {selectedArticle.content ? (
                  <div 
                    className="prose max-w-none mb-4"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }} 
                  />
                ) : (
                  <div className="text-gray-400 italic mb-4">暂无正文内容</div>
                )}
                
                {selectedArticle.url && (
                  <a 
                    href={selectedArticle.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm inline-block"
                  >
                    查看原文 →
                  </a>
                )}
              </article>

              <div className="bg-white rounded-lg shadow p-6 sticky top-20">
                <h3 className="text-lg font-semibold mb-4">审阅操作</h3>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => handleReview('precious')}
                    disabled={processing}
                    className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    ✅ 精读
                  </button>
                  <button
                    onClick={() => handleReview('skipped')}
                    disabled={processing}
                    className="bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    ⛔ 跳过
                  </button>
                  <button
                    onClick={() => handleReview('later')}
                    disabled={processing}
                    className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    ⏰ 稍后
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    笔记（可选）
                  </label>
                  <textarea
                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="记录想法、摘要或关键点..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  <p>精读内容将同步到思源笔记</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-128px)]">
              <div className="text-center text-gray-500">
                <p className="text-lg">选择左侧文章开始审阅</p>
                <p className="text-sm mt-2">或使用高级筛选查找特定文章</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
