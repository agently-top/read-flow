'use client';
import { useEffect, useState } from 'react';

interface Article {
  id: number;
  title: string;
  summary: string;
  source: string;
  published_at: string;
}

export default function LatestArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?limit=6`)
      .then(res => res.json())
      .then(data => {
        setArticles(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">最新内容</h2>
        {loading ? (
          <p className="text-center text-gray-500">加载中...</p>
        ) : articles.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {articles.map(article => (
              <div key={article.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-xl font-semibold mb-2 line-clamp-2">{article.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{article.summary}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{article.source}</span>
                  <span>{new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">暂无内容，同步 FreshRSS 后查看</p>
        )}
      </div>
    </section>
  );
}
