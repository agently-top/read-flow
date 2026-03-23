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
}

export default function ListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filters, setFilters] = useState({ status: '', source: '', sort: 'published_at' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(filters as Record<string, string>);
    if (!filters.status) params.delete('status');
    if (!filters.source) params.delete('source');
    
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setArticles(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    reviewing: 'bg-blue-100 text-blue-800',
    precious: 'bg-green-100 text-green-800',
    skipped: 'bg-gray-100 text-gray-800',
    later: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">信息流</h1>
          <Link href="/" className="text-blue-600 hover:underline">← 返回首页</Link>
        </div>
        
        {/* 筛选栏 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <select
              className="border rounded px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">全部状态</option>
              <option value="pending">待审阅</option>
              <option value="reviewing">审阅中</option>
              <option value="precious">精读</option>
              <option value="skipped">跳过</option>
              <option value="later">稍后</option>
            </select>
            
            <select
              className="border rounded px-3 py-2"
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="published_at">时间倒序</option>
              <option value="-published_at">时间正序</option>
            </select>
            
            <input
              type="text"
              placeholder="搜索标题..."
              className="border rounded px-3 py-2 md:col-span-2"
              onChange={(e) => {
                // TODO: 实现搜索
              }}
            />
          </div>
        </div>
        
        {/* 文章列表 */}
        {loading ? (
          <p className="text-center text-gray-500">加载中...</p>
        ) : articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <div key={article.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold line-clamp-2">{article.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ml-2 ${statusColors[article.status] || 'bg-gray-100'}`}>
                    {article.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4 line-clamp-3">{article.summary}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{article.source} {article.author && `· ${article.author}`}</span>
                  <Link href={`/article/${article.id}`} className="text-blue-600 hover:underline whitespace-nowrap">
                    阅读 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">暂无内容</p>
            <p className="text-gray-400 mt-2">请先同步 FreshRSS 文章</p>
          </div>
        )}
      </div>
    </div>
  );
}
