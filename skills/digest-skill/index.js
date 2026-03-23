/**
 * Digest Skill - 内容预处理
 * 
 * 功能：从 FreshRSS 获取未读文章，进行去重、摘要、质量检查
 */

import axios from 'axios';

const FRESHRSS_URL = process.env.FRESHRSS_URL || 'http://localhost:8081';
const FRESHRSS_USER = process.env.FRESHRSS_USER || 'admin';
const FRESHRSS_PASSWORD = process.env.FRESHRSS_PASSWORD || 'FreshRSS2026!';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

let FRESHRSS_API_KEY = null;

/**
 * 登录 FreshRSS 获取 API Key
 */
async function loginToFreshRSS() {
  try {
    const response = await axios.post(
      `${FRESHRSS_URL}/api/greader.php/accounts/ClientLogin`,
      new URLSearchParams({
        Email: FRESHRSS_USER,
        Passwd: FRESHRSS_PASSWORD,
        service: 'reader'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const match = response.data.match(/Auth=([a-z0-9]+)/i);
    if (match) {
      FRESHRSS_API_KEY = match[1];
      console.log('✅ FreshRSS 登录成功');
      return FRESHRSS_API_KEY;
    }
    throw new Error('无法提取 API Key');
  } catch (error) {
    console.error('❌ FreshRSS 登录失败:', error.message);
    throw error;
  }
}

/**
 * 获取未读文章
 */
async function getUnreadArticles(limit = 100) {
  if (!FRESHRSS_API_KEY) {
    await loginToFreshRSS();
  }

  try {
    const response = await axios.get(
      `${FRESHRSS_URL}/api/greader.php/reader/api/0/stream/contents/user/-/state/com.google/reading-list`,
      {
        headers: { 'Authorization': `GoogleLogin auth=${FRESHRSS_API_KEY}` },
        params: { 
          xt: 'user/-/state/com.google/read',  // 排除已读
          n: limit 
        }
      }
    );
    
    return response.data.items || [];
  } catch (error) {
    console.error('❌ 获取未读文章失败:', error.message);
    throw error;
  }
}

/**
 * 检查文章是否已存在
 */
async function articleExists(url) {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/articles?limit=1000`);
    const articles = response.data.data || [];
    return articles.some(a => a.url === url);
  } catch (error) {
    console.error('检查文章是否存在失败:', error.message);
    return false;
  }
}

/**
 * 调用 LLM 生成摘要
 */
async function generateSummary(title, content) {
  try {
    // 截取部分内容（避免 token 超限）
    const truncatedContent = content.substring(0, 2000);
    
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4.7',
        messages: [
          {
            role: 'system',
            content: '你是一名专业的内容编辑，请为文章生成简洁的摘要（200 字以内）。只返回摘要内容，不要其他说明。'
          },
          {
            role: 'user',
            content: `标题：${title}\n\n内容：${truncatedContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GLM_API_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0]?.message?.content || content.substring(0, 200);
  } catch (error) {
    console.error('生成摘要失败:', error.message);
    return content.substring(0, 200);
  }
}

/**
 * 质量评分（简单规则）
 */
function calculateQualityScore(title, content, source) {
  let score = 0.5;
  
  // 标题长度适中
  if (title.length > 10 && title.length < 100) score += 0.1;
  
  // 内容长度足够
  if (content.length > 500) score += 0.1;
  if (content.length > 2000) score += 0.1;
  
  // 排除标题党关键词
  const clickbaitWords = ['震惊', '重磅', '独家', '内幕', '揭秘'];
  const hasClickbait = clickbaitWords.some(word => title.includes(word));
  if (hasClickbait) score -= 0.2;
  
  // 排除广告特征
  const adWords = ['优惠', '购买', '限时', '免费', '加微信'];
  const hasAds = adWords.some(word => content.includes(word));
  if (hasAds) score -= 0.3;
  
  // 知名来源加分
  const trustedSources = ['36Kr', '虎嗅', 'InfoQ', 'GitHub', 'Hacker News'];
  if (trustedSources.some(s => source.includes(s))) score += 0.1;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * 自动分类
 */
function categorize(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  
  const categories = {
    'AI 技术': ['ai', '人工智能', 'llm', '大模型', '机器学习', '深度学习'],
    '工程实践': ['架构', 'devops', '微服务', '容器', 'kubernetes', 'docker'],
    '前端开发': ['frontend', 'react', 'vue', 'javascript', 'typescript', 'css'],
    '后端开发': ['backend', 'api', '数据库', 'mysql', 'postgresql', 'redis'],
    '行业动态': ['融资', '收购', '上市', '财报', '战略'],
    '开源项目': ['github', '开源', 'release', 'version']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  
  return '综合';
}

/**
 * 主函数：执行 Digest 流程
 */
export async function runDigest() {
  console.log('🚀 开始执行 Digest 流程...');
  
  try {
    // 1. 获取未读文章
    console.log('📥 获取未读文章...');
    const items = await getUnreadArticles(100);
    console.log(`找到 ${items.length} 篇未读文章`);
    
    let imported = 0;
    let skipped = 0;
    
    // 2. 处理每篇文章
    for (const item of items) {
      const url = item.canonical?.[0]?.href || item.id;
      
      // 检查是否已存在
      const exists = await articleExists(url);
      if (exists) {
        skipped++;
        continue;
      }
      
      console.log(`处理：${item.title}`);
      
      // 3. 生成摘要
      const content = item.content?.content || item.summary?.content || '';
      const summary = await generateSummary(item.title, content);
      
      // 4. 质量评分
      const qualityScore = calculateQualityScore(
        item.title,
        content,
        item.origin?.title || 'Unknown'
      );
      
      // 5. 自动分类
      const category = categorize(item.title, content);
      
      // 6. 跳过质量过低的文章
      if (qualityScore < 0.3) {
        console.log(`⚠️ 跳过质量过低文章：${item.title} (评分：${qualityScore})`);
        skipped++;
        continue;
      }
      
      // 7. 保存到后端 API
      try {
        await axios.post(`${BACKEND_URL}/api/articles`, {
          title: item.title,
          summary: summary,
          content: content,
          url: url,
          source: item.origin?.title || 'Unknown',
          author: item.author || '',
          published_at: new Date(item.published * 1000).toISOString(),
          category: category,
          tags: [],
          status: 'pending'
        });
        
        imported++;
        console.log(`✅ 导入成功：${item.title}`);
      } catch (error) {
        console.error(`❌ 保存失败：${item.title}`, error.message);
      }
    }
    
    console.log(`\n📊 Digest 完成:`);
    console.log(`   - 导入：${imported} 篇`);
    console.log(`   - 跳过：${skipped} 篇`);
    
    return { imported, skipped };
  } catch (error) {
    console.error('❌ Digest 执行失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (process.argv[1]?.includes('digest')) {
  runDigest().catch(console.error);
}
