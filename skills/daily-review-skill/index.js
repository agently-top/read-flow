/**
 * Daily Review Skill - 每日精选
 * 
 * 功能：从候选内容池中生成每日精选日报
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK || '';

/**
 * 获取待审阅文章
 */
async function getPendingArticles() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/articles?status=pending&limit=50`);
    return response.data.data || [];
  } catch (error) {
    console.error('获取待审阅文章失败:', error.message);
    return [];
  }
}

/**
 * 使用 LLM 分类整理文章
 */
async function categorizeArticles(articles) {
  try {
    const articleList = articles.map(a => 
      `- ${a.title} (来源：${a.source}, 分类：${a.category || '未分类'})`
    ).join('\n');
    
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: `你是一名专业的内容编辑，请将以下文章分类到这些栏目：
1. 今日大事 - 行业重要新闻
2. 变更与实践 - 技术更新、最佳实践
3. 安全与风险 - 安全漏洞、风险提示
4. 开源与工具 - 新开源项目、工具推荐
5. 洞察与数据点 - 深度分析、数据报告

返回 JSON 格式：
{
  "今日大事": [文章 ID 列表],
  "变更与实践": [文章 ID 列表],
  "安全与风险": [文章 ID 列表],
  "开源与工具": [文章 ID 列表],
  "洞察与数据点": [文章 ID 列表]
}

每个栏目选 2-5 篇最相关的文章，不要重复。`
          },
          {
            role: 'user',
            content: articleList
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const content = response.data.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('LLM 分类失败:', error.message);
    // 返回默认分类
    return {
      '今日大事': articles.slice(0, 5).map(a => a.id),
      '开源与工具': articles.slice(5, 10).map(a => a.id)
    };
  }
}

/**
 * 生成日报 Markdown
 */
function generateDailyReview(articles, categories) {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  let markdown = `## 📰 Read Flow 每日精选 - ${today}\n\n`;
  
  const articleMap = {};
  articles.forEach(a => articleMap[a.id] = a);
  
  for (const [category, articleIds] of Object.entries(categories)) {
    const selectedArticles = articleIds
      .map(id => articleMap[id])
      .filter(a => a);
    
    if (selectedArticles.length === 0) continue;
    
    markdown += `### ${category}\n`;
    
    selectedArticles.forEach(article => {
      markdown += `- [${article.title}](${article.url || '#'}) - ${article.source}\n`;
    });
    
    markdown += '\n';
  }
  
  markdown += `---
🤖 由 Read Flow 自动生成 | [查看详情](http://81.70.8.160/list)`;
  
  return markdown;
}

/**
 * 发送到飞书
 */
async function sendToFeishu(markdown) {
  if (!FEISHU_WEBHOOK) {
    console.log('⚠️ 未配置飞书 Webhook，跳过推送');
    return;
  }
  
  try {
    await axios.post(FEISHU_WEBHOOK, {
      msg_type: 'text',
      content: {
        text: markdown
      }
    });
    console.log('✅ 飞书推送成功');
  } catch (error) {
    console.error('❌ 飞书推送失败:', error.message);
  }
}

/**
 * 更新文章状态为 reviewing
 */
async function updateArticleStatus(articleIds) {
  for (const id of articleIds) {
    try {
      await axios.patch(`${BACKEND_URL}/api/articles/${id}/status`, {
        status: 'reviewing'
      });
    } catch (error) {
      console.error(`更新文章 ${id} 状态失败:`, error.message);
    }
  }
}

/**
 * 主函数：执行 Daily Review 流程
 */
export async function runDailyReview() {
  console.log('🚀 开始执行 Daily Review 流程...');
  
  try {
    // 1. 获取待审阅文章
    console.log('📥 获取待审阅文章...');
    const articles = await getPendingArticles();
    console.log(`找到 ${articles.length} 篇待审阅文章`);
    
    if (articles.length === 0) {
      console.log('ℹ️ 没有待审阅文章，跳过今日日报生成');
      return { generated: false, reason: 'no_articles' };
    }
    
    // 2. LLM 分类整理
    console.log('🤖 LLM 分类整理...');
    const categories = await categorizeArticles(articles);
    
    // 3. 生成日报
    console.log('📝 生成日报...');
    const dailyReview = generateDailyReview(articles, categories);
    console.log('\n' + dailyReview);
    
    // 4. 发送到飞书
    console.log('📤 发送飞书推送...');
    await sendToFeishu(dailyReview);
    
    // 5. 更新文章状态
    console.log('🔄 更新文章状态...');
    const allArticleIds = Object.values(categories).flat();
    await updateArticleStatus(allArticleIds);
    
    console.log('\n✅ Daily Review 完成');
    
    return {
      generated: true,
      articleCount: articles.length,
      review: dailyReview
    };
  } catch (error) {
    console.error('❌ Daily Review 执行失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (process.argv[1]?.includes('daily-review')) {
  runDailyReview().catch(console.error);
}
