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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 检查是否为管理员
    const token = localStorage.getItem('admin_token');
    const expires = localStorage.getItem('admin_expires');
    if (token && (!expires || new Date(expires) > new Date())) {
      setIsAdmin(true);
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setArticle(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleReview = async (action: string) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('请先登录管理员账户');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/articles/${params.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: action, note })
      });

      const data = await res.json();
      
      if (data.success) {
        if (data.deleted) {
          alert('文章已删除');
          window.location.href = '/list';
          return;
        }
        alert(`已标记为"${action}"`);
        setArticle(data.data);
        setNote('');
      } else {
        alert('操作失败：' + data.error);
      }
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
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-bold text-gray-900">
              Read Flow
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/list" className="text-sm text-gray-600 hover:text-gray-900">
                ← 返回列表
              </Link>
              {isAdmin && (
                <Link href="/admin/dashboard" className="text-sm text-gray-900 font-medium">
                  管理面板
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* 文章内容 */}
            <div className="lg:col-span-3">
              <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* 文章头部 */}
                <div className="border-b border-gray-200 px-8 py-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        article.status === 'precious' ? 'bg-green-100 text-green-800' :
                        article.status === 'skipped' ? 'bg-gray-100 text-gray-800' :
                        article.status === 'later' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {article.status === 'precious' ? '✅ 精读' :
                         article.status === 'skipped' ? '⛔ 跳过' :
                         article.status === 'later' ? '⏰ 稍后' : '📋 待审阅'}
                      </span>
                    )}
                    {article.category && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {article.category}
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {article.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{article.source}</span>
                    {article.author && (
                      <>
                        <span>·</span>
                        <span>{article.author}</span>
                      </>
                    )}
                    <span>·</span>
                    <time dateTime={article.published_at}>
                      {formatDate(article.published_at)}
                    </time>
                  </div>
                  
                  {parseTags(article.tags).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {parseTags(article.tags).map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 文章正文 */}
                <div className="px-8 py-6">
                  {article.summary && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-900">
                      <p className="text-gray-700 italic">{article.summary}</p>
                    </div>
                  )}
                  
                  {article.content ? (
                    <div 
                      className="prose prose-gray max-w-none
                        prose-headings:font-bold prose-headings:text-gray-900
                        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-lg prose-img:border prose-img:border-gray-200
                        prose-blockquote:border-l-4 prose-blockquote:border-gray-900 prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4
                        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-gray-900 prose-pre:text-gray-100"
                      dangerouslySetInnerHTML={{ __html: article.content }} 
                    />
                  ) : (
                    <div className="text-gray-400 italic text-center py-12">
                      暂无正文内容，请查看原文
                    </div>
                  )}
                  
                  {article.url && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <span>查看原文</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </article>
            </div>
            
            {/* 右侧审阅面板 */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                {isAdmin && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">审阅操作</h3>
                    
                    <div className="space-y-2 mb-4">
                      <button
                        onClick={() => handleReview('precious')}
                        disabled={processing}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
                      >
                        ✅ 值得精读
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
                            handleReview('skipped');
                          }
                        }}
                        disabled={processing}
                        className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                      >
                        🗑️ 删除
                      </button>
                      <button
                        onClick={() => handleReview('later')}
                        disabled={processing}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
                      >
                        ⏰ 稍后阅读
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        笔记（可选）
                      </label>
                      <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="记录想法、摘要或关键点..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p>精读内容将同步到</p>
                      <p>思源笔记"信息"笔记本</p>
                    </div>
                  </div>
                )}

                {/* 文章信息 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">文章信息</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">获取时间</dt>
                      <dd className="text-gray-900">
                        {article.fetched_at && formatDate(article.fetched_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">状态</dt>
                      <dd className="text-gray-900 capitalize">
                        {article.status || '待审阅'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
