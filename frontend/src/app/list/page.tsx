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
  const [filters, setFilters] = useState({ status: '', sort: 'published_at' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(filters as Record<string, string>);
    if (!filters.status) params.delete('status');
    
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setArticles(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-bold text-gray-900">
              Read Flow
            </Link>
            <div className="flex items-center gap-4">
              <select
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">全部状态</option>
                <option value="pending">待审阅</option>
                <option value="precious">精读</option>
                <option value="skipped">跳过</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">信息流</h1>
        
        {loading ? (
          <p className="text-gray-500 text-sm">加载中...</p>
        ) : articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map(article => (
              <article
                key={article.id}
                className="border border-gray-200 rounded-lg p-5 hover:border-gray-400 hover:shadow-sm transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-medium text-gray-900 flex-1 pr-4">
                    {article.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      article.status === 'precious'
                        ? 'bg-gray-900 text-white'
                        : article.status === 'skipped'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {article.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.summary}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>
                    {article.source} {article.author && `· ${article.author}`}
                  </span>
                  <Link
                    href={`/article/${article.id}`}
                    className="text-gray-900 hover:underline font-medium"
                  >
                    阅读 →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无内容</p>
            <p className="text-gray-400 text-sm mt-2">请先同步 FreshRSS 文章</p>
          </div>
        )}
      </main>
    </div>
  );
}
