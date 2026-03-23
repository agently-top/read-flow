'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setArticle(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleReview = async (action: string) => {
    setProcessing(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, note })
      });
      alert(`已标记为"${action}"`);
      // TODO: 同步到思源笔记
    } catch (error) {
      alert('操作失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700">文章不存在</h1>
          <Link href="/list" className="text-blue-600 hover:underline mt-4 inline-block">← 返回列表</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link href="/list" className="text-blue-600 hover:underline">← 返回列表</Link>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 文章内容 */}
          <div className="lg:col-span-2">
            <article className="bg-white rounded-lg shadow p-8">
              <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
              <div className="text-sm text-gray-500 mb-6 flex flex-wrap gap-2">
                <span>{article.source}</span>
                {article.author && <span>· {article.author}</span>}
                <span>· {new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
                {article.status && (
                  <span className={`px-2 py-1 rounded text-xs ${
                    article.status === 'precious' ? 'bg-green-100 text-green-800' :
                    article.status === 'skipped' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {article.status}
                  </span>
                )}
              </div>
              
              {article.content ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content }} 
                />
              ) : (
                <div className="text-gray-400 italic">暂无正文内容</div>
              )}
              
              {article.url && (
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mt-6 inline-block"
                >
                  查看原文 →
                </a>
              )}
            </article>
          </div>
          
          {/* 审阅操作 */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">审阅操作</h3>
              
              <div className="grid grid-cols-1 gap-2 mb-4">
                <button
                  onClick={() => handleReview('precious')}
                  disabled={processing}
                  className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  ✅ 值得精读
                </button>
                <button
                  onClick={() => handleReview('skip')}
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
                  ⏰ 稍后阅读
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
                <p className="mt-1">"信息" 笔记本</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
