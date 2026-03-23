/**
 * Daily Review Skill - 每日精选（肖恩风格）
 * 
 * 功能：从候选内容池中生成每日精选日报
 * 栏目结构：参考肖恩技术周刊
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK || '';

/**
 * 肖恩技术周刊的栏目结构
 */
const SECTIONS = {
  '业界资讯': '行业动态、产品发布、公司动态',
  '佳文共赏': '深度文章、观点分析、趋势洞察',
  '技术博客': '技术实践、工程经验、架构设计',
  '开源项目': '新开源工具、框架、库',
  '资源推荐': '工具、平台、服务、网站',
  '学习资料': '教程、课程、文档、指南'
};

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
 * 使用 LLM 按肖恩栏目分类整理文章
 */
async function categorizeArticles(articles) {
  try {
    const articleList = articles.map(a => 
      `- ID:${a.id} [${a.category}] ${a.title} (来源：${a.source}, 标签：${a.tags?.join(',') || '无'})`
    ).join('\n');
    
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4.7',
        messages: [
          {
            role: 'system',
            content: `你是肖恩技术周刊的编辑。请将以下文章分类到肖恩周刊的栏目中。

栏目说明：
- 业界资讯：行业动态、产品发布、公司动态
- 佳文共赏：深度文章、观点分析、趋势洞察
- 技术博客：技术实践、工程经验、架构设计
- 开源项目：新开源工具、框架、库
- 资源推荐：工具、平台、服务、网站
- 学习资料：教程、课程、文档、指南

返回 JSON 格式：
{
  "业界资讯": [文章 ID 列表],
  "佳文共赏": [文章 ID 列表],
  "技术博客": [文章 ID 列表],
  "开源项目": [文章 ID 列表],
  "资源推荐": [文章 ID 列表],
  "学习资料": [文章 ID 列表]
}

每个栏目选 2-5 篇最相关的文章，不要重复。优先选择质量评分高的文章。`
          },
          {
            role: 'user',
            content: articleList
          }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GLM_API_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const content = response.data.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('LLM 分类失败:', error.message);
    // 返回按预分类的默认分类
    const defaultCategories = {};
    articles.forEach(a => {
      const category = a.category || '技术博客';
      if (!defaultCategories[category]) defaultCategories[category] = [];
      if (defaultCategories[category].length < 5) {
        defaultCategories[category].push(a.id);
      }
    });
    return defaultCategories;
  }
}

/**
 * 生成肖恩风格的日报 Markdown
 */
function generateDailyReview(articles, categories) {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  let markdown = `## 📰 肖恩技术周刊 - 每日精选\n\n`;
  markdown += `**${today}**\n\n`;
  markdown += `记录有价值的技术内容。\n\n---\n\n`;
  
  const articleMap = {};
  articles.forEach(a => articleMap[a.id] = a);
  
  for (const [section, articleIds] of Object.entries(SECTIONS)) {
    const ids = categories[section] || [];
    if (ids.length === 0) continue;
    
    const selectedArticles = ids.map(id => articleMap[id]).filter(a => a);
    if (selectedArticles.length === 0) continue;
    
    markdown += `## ${section}\n\n`;
    
    selectedArticles.forEach((article, index) => {
      markdown += `### ${index + 1}. [${article.title}](${article.url || '#'})\n\n`;
      
      if (article.summary) {
        markdown += `${article.summary}\n\n`;
      }
      
      markdown += `> 来源：${article.source}`;
      if (article.author) markdown += ` | 作者：${article.author}`;
      if (article.tags && article.tags.length > 0) {
        markdown += ` | 标签：${article.tags.join(', ')}`;
      }
      markdown += `\n\n`;
    });
    
    markdown += `---\n\n`;
  }
  
  markdown += `🤖 由 Read Flow 自动生成 | [查看详情](http://81.70.8.160:3000/list)\n`;
  
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
      content: { text: markdown }
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
 * 主函数：执行 Daily Review 流程（肖恩风格）
 */
export async function runDailyReview() {
  console.log('🚀 开始执行 Daily Review 流程（肖恩风格）...\n');
  
  try {
    // 1. 获取待审阅文章
    console.log('📥 获取待审阅文章...');
    const articles = await getPendingArticles();
    console.log(`   找到 ${articles.length} 篇待审阅文章\n`);
    
    if (articles.length === 0) {
      console.log('ℹ️ 没有待审阅文章，跳过今日日报生成\n');
      return { generated: false, reason: 'no_articles' };
    }
    
    // 2. LLM 按肖恩栏目分类
    console.log('🤖 LLM 按肖恩栏目分类整理...\n');
    const categories = await categorizeArticles(articles);
    
    // 3. 生成日报
    console.log('📝 生成肖恩风格日报...\n');
    const dailyReview = generateDailyReview(articles, categories);
    console.log(dailyReview);
    
    // 4. 发送到飞书
    console.log('\n📤 发送飞书推送...');
    await sendToFeishu(dailyReview);
    
    // 5. 更新文章状态
    console.log('\n🔄 更新文章状态...');
    const allArticleIds = Object.values(categories).flat();
    await updateArticleStatus(allArticleIds);
    
    console.log('\n✅ Daily Review 完成\n');
    
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
