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
    <section className="py-12 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">最新内容</h2>
          <a href="/list" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            查看全部 →
          </a>
        </div>
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">加载中...</p>
        ) : articles.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {articles.map(article => (
              <a
                key={article.id}
                href={`/article/${article.id}`}
                className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition block"
              >
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                  {article.summary}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>{article.source}</span>
                  <span>
                    {new Date(article.published_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">暂无内容，同步 FreshRSS 后查看</p>
        )}
      </div>
    </section>
  );
}
