import { getUnreadArticles, markAsRead } from '../services/freshrss.js';
import { Article } from '../models/Article.js';

export async function syncFromFreshRSS() {
  console.log('Syncing from FreshRSS...');
  
  const items = await getUnreadArticles();
  let imported = 0;
  
  for (const item of items) {
    try {
      // 检查是否已存在
      const existing = Article.findByUrl(item.id);
      if (existing) {
        continue;
      }
      
      // 创建文章
      Article.create({
        title: item.title,
        summary: item.summary?.content || '',
        content: item.content?.content || '',
        url: item.canonical?.[0]?.href || '',
        source: item.origin?.title || 'Unknown',
        author: item.author || '',
        published_at: new Date(item.published * 1000).toISOString(),
        status: 'pending'
      });
      
      // 标记为已读
      await markAsRead(item.id);
      imported++;
    } catch (error) {
      console.error(`Failed to import article ${item.title}:`, error.message);
    }
  }
  
  console.log(`Synced ${imported} articles from FreshRSS`);
  return imported;
}
