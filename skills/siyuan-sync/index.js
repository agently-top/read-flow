/**
 * SiYuan Notebook Integration
 * 
 * 功能：将精读内容同步到思源笔记
 */

import axios from 'axios';

const SIYUAN_API = process.env.SIYUAN_API_URL || 'http://host.docker.internal:6806';
const NOTEBOOK_ID = process.env.SIYUAN_NOTEBOOK_ID || '20250805163218-dqifw69'; // "信息" 笔记本

/**
 * 检查思源 API 连通性
 */
export async function checkSiYuanConnection() {
  try {
    const response = await axios.post(`${SIYUAN_API}/api/system/version`, {});
    console.log('✅ 思源笔记连接成功，版本:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 思源笔记连接失败:', error.message);
    return false;
  }
}

/**
 * 创建文档
 */
export async function createDocument(parentId, title, content) {
  try {
    const response = await axios.post(`${SIYUAN_API}/api/filetree/createDocWithMd`, {
      notebook: NOTEBOOK_ID,
      path: `/Read Flow/${title}`,
      markdown: content
    });
    
    console.log(`✅ 创建文档成功：${title}`);
    return response.data;
  } catch (error) {
    console.error(`❌ 创建文档失败：${title}`, error.message);
    throw error;
  }
}

/**
 * 追加内容块
 */
export async function appendBlock(documentId, content, dataType = 'markdown') {
  try {
    const response = await axios.post(`${SIYUAN_API}/api/block/appendMd`, {
      dataType,
      data: content,
      id: documentId
    });
    
    console.log(`✅ 追加内容块成功到文档 ${documentId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ 追加内容块失败:`, error.message);
    throw error;
  }
}

/**
 * 更新文档内容
 */
export async function updateDocument(documentId, content) {
  try {
    const response = await axios.post(`${SIYUAN_API}/api/block/updateMd`, {
      dataType: 'markdown',
      data: content,
      id: documentId
    });
    
    console.log(`✅ 更新文档成功：${documentId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ 更新文档失败:`, error.message);
    throw error;
  }
}

/**
 * 同步精读文章到思源
 */
export async function syncArticleToSiYuan(article) {
  try {
    // 1. 创建文档
    const docPath = `/Read Flow/${article.title.substring(0, 50)}`;
    
    const markdown = `# ${article.title}

> 来源：${article.source} | 作者：${article.author || '未知'} | 发布时间：${new Date(article.published_at).toLocaleDateString('zh-CN')}

## 摘要

${article.summary}

## 正文

${article.content || '暂无正文内容'}

## 元数据

- 分类：${article.category || '未分类'}
- 标签：${article.tags?.join(', ') || '无'}
- 质量评分：${article.quality_score || 'N/A'}
- 同步时间：${new Date().toLocaleString('zh-CN')}

---

*本文档由 Read Flow 自动同步*
`;

    await createDocument(NOTEBOOK_ID, docPath, markdown);
    
    console.log(`✅ 文章同步成功：${article.title}`);
    return true;
  } catch (error) {
    console.error(`❌ 文章同步失败：${article.title}`, error.message);
    return false;
  }
}

/**
 * 创建每日精选文档
 */
export async function createDailyReviewDoc(dailyReview, date) {
  try {
    const docPath = `/Read Flow/每日精选/${date.replace(/\//g, '-')}`;
    
    const markdown = `# 📰 每日精选 - ${date}

${dailyReview}

---

*本文档由 Read Flow 自动生成*
`;

    await createDocument(NOTEBOOK_ID, docPath, markdown);
    
    console.log(`✅ 每日精选文档创建成功：${date}`);
    return true;
  } catch (error) {
    console.error(`❌ 每日精选文档创建失败:`, error.message);
    return false;
  }
}

/**
 * 主函数：同步精读文章
 */
export async function syncPreciousArticles() {
  console.log('🚀 开始同步精读文章到思源...');
  
  try {
    // 检查连接
    const connected = await checkSiYuanConnection();
    if (!connected) {
      return { synced: 0, reason: 'connection_failed' };
    }
    
    // 获取精读文章
    const response = await axios.get('http://localhost:3001/api/articles?status=precious&limit=10');
    const articles = response.data.data || [];
    
    console.log(`找到 ${articles.length} 篇精读文章`);
    
    let synced = 0;
    for (const article of articles) {
      const success = await syncArticleToSiYuan(article);
      if (success) {
        synced++;
        // 更新状态为 synced
        await axios.patch('http://localhost:3001/api/articles/' + article.id + '/status', {
          status: 'synced'
        });
      }
    }
    
    console.log(`\n✅ 同步完成：${synced}/${articles.length} 篇`);
    
    return { synced, total: articles.length };
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (process.argv[1]?.includes('siyuan')) {
  syncPreciousArticles().catch(console.error);
}
