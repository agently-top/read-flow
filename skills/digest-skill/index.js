/**
 * Digest Skill - 内容预处理（肖恩风格）
 * 
 * 功能：从 FreshRSS 获取未读文章，进行去重、摘要、质量检查
 * 分类体系：参考肖恩技术周刊的分类结构
 */

import axios from 'axios';

const FRESHRSS_URL = process.env.FRESHRSS_URL || 'http://localhost:8081';
const FRESHRSS_USER = process.env.FRESHRSS_USER || 'admin';
const FRESHRSS_PASSWORD = process.env.FRESHRSS_PASSWORD || 'FreshRSS2026!';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

let FRESHRSS_API_KEY = null;

/**
 * 肖恩技术周刊的分类体系
 */
const CATEGORIES = {
  '业界资讯': [
    '发布', '上线', '推出', '宣布', '融资', '收购', '投资', '合作',
    'openai', 'anthropic', 'google', 'microsoft', 'meta', 'amazon',
    '产品', '服务', '更新', '版本', 'new', 'launch', 'release'
  ],
  '佳文共赏': [
    '深度', '分析', '观点', '思考', '洞察', '趋势', '未来',
    '为什么', '如何', 'how', 'why', 'insight', 'analysis',
    'blog', 'article', 'essay', 'opinion'
  ],
  '技术博客': [
    '实践', '经验', '架构', '设计', '实现', '开发', '工程',
    'engineering', 'architecture', 'implementation', 'development',
    'tutorial', 'guide', 'how-to', 'best practice'
  ],
  '开源项目': [
    '开源', 'github', 'release', 'version', 'v1.', 'v2.', 'v3.',
    'project', 'library', 'framework', 'tool', 'package',
    'npm', 'pip', 'cargo', 'go module'
  ],
  '资源推荐': [
    '工具', '平台', '服务', '网站', 'app', '软件',
    'tool', 'platform', 'service', 'resource', 'saas'
  ],
  '学习资料': [
    '教程', '课程', '学习', '文档', '指南', '入门', '进阶',
    'tutorial', 'course', 'learn', 'guide', 'documentation',
    'book', 'pdf', 'video', 'lecture'
  ]
};

/**
 * 技术标签关键词
 */
const TECH_TAGS = {
  'AI': ['ai', '人工智能', 'llm', '大模型', '机器学习', '深度学习', 'nlp', 'cv', 'agent', '智能体'],
  '编程': ['编程', '代码', '开发', 'programming', 'coding', 'software'],
  '前端': ['frontend', 'react', 'vue', 'javascript', 'typescript', 'css', 'html'],
  '后端': ['backend', 'api', 'server', 'database', 'mysql', 'postgresql', 'redis'],
  'DevOps': ['devops', 'kubernetes', 'docker', 'ci/cd', 'deployment', 'infrastructure'],
  '数据': ['data', '大数据', 'analytics', 'etl', 'warehouse', 'lakehouse'],
  '安全': ['security', '安全', 'privacy', 'encryption', 'authentication'],
  '云原生': ['cloud', 'serverless', 'microservice', 'container', 'k8s']
};

/**
 * 登录 FreshRSS 获取 API Key
 */
async function loginToFreshRSS() {
  try {
    const response = await axios.post(
      `${FRESHRSS_URL}/api/greader.php/accounts/ClientLogin`,
      new URLSearchParams({ Email: FRESHRSS_USER, Passwd: FRESHRSS_PASSWORD, service: 'reader' }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const match = response.data.match(/Auth=([a-z0-9/]+)/i);
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
  if (!FRESHRSS_API_KEY) await loginToFreshRSS();
  
  const response = await axios.get(
    `${FRESHRSS_URL}/api/greader.php/reader/api/0/stream/contents/user/-/state/com.google/reading-list`,
    {
      headers: { 'Authorization': `GoogleLogin auth=${FRESHRSS_API_KEY}` },
      params: { xt: 'user/-/state/com.google/read', n: limit, output: 'json' }
    }
  );
  
  return response.data.items || [];
}

/**
 * 检查文章是否已存在
 */
async function articleExists(url) {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/articles?limit=1000`);
    return response.data.data.some(a => a.url === url);
  } catch (error) {
    return false;
  }
}

/**
 * 调用 LLM 生成摘要（肖恩风格：简洁、有价值）
 */
async function generateSummary(title, content) {
  try {
    const truncatedContent = content.substring(0, 2000);
    
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4.5-air',
        messages: [
          {
            role: 'system',
            content: '你是肖恩技术周刊的编辑。请用简洁的中文生成 100-200 字摘要，突出核心价值和关键信息。不要废话，直接说重点。'
          },
          {
            role: 'user',
            content: `标题：${title}\n\n内容：${truncatedContent}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
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
 * 肖恩风格的内容分类
 */
function categorize(title, content, source) {
  const text = (title + ' ' + content).toLowerCase();
  
  // 按优先级匹配分类
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  
  // 默认分类
  return '技术博客';
}

/**
 * 生成技术标签
 */
function generateTags(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  const tags = [];
  
  for (const [tag, keywords] of Object.entries(TECH_TAGS)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      tags.push(tag);
    }
  }
  
  // 限制标签数量
  return tags.slice(0, 5);
}

/**
 * 肖恩风格的质量评分
 */
function calculateQualityScore(title, content, source) {
  let score = 0.6;
  const text = (title + ' ' + content).toLowerCase();
  
  if (title.length > 10 && title.length < 80) score += 0.05;
  if (content.length > 300) score += 0.1;
  if (content.length > 1000) score += 0.1;
  
  const clickbaitWords = ['震惊', '重磅', '独家', '内幕', '揭秘', 'clickbait'];
  if (clickbaitWords.some(word => title.toLowerCase().includes(word.toLowerCase()))) score -= 0.2;
  
  const adWords = ['优惠', '购买', '限时', '免费', '加微信', 'discount', 'buy now'];
  if (adWords.some(word => content.toLowerCase().includes(word.toLowerCase()))) score -= 0.2;
  
  const techWords = ['code', 'api', 'github', '开发', '技术', 'engineering'];
  if (techWords.some(word => text.includes(word.toLowerCase()))) score += 0.1;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * 主函数：执行 Digest 流程（肖恩风格）
 */
export async function runDigest() {
  console.log('🚀 开始执行 Digest 流程（肖恩风格）...\n');
  
  try {
    // 1. 获取未读文章
    console.log('📥 从 FreshRSS 获取未读文章...');
    const items = await getUnreadArticles(100);
    console.log(`   找到 ${items.length} 篇未读文章\n`);
    
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
      
      console.log(`📝 处理：${item.title?.substring(0, 50)}...`);
      
      // 3. 生成摘要
      const content = item.content?.content || item.summary?.content || '';
      const summary = await generateSummary(item.title, content);
      
      // 4. 分类和标签
      const category = categorize(item.title, content, item.origin?.title);
      const tags = generateTags(item.title, content);
      
      // 5. 质量评分
      const qualityScore = calculateQualityScore(item.title, content, item.origin?.title);
      
      // 6. 跳过质量过低的文章（肖恩风格：精品筛选）
      if (qualityScore < 0.5) {
        console.log(`   ⚠️ 跳过（质量评分：${qualityScore.toFixed(2)}）`);
        skipped++;
        continue;
      }
      
      // 7. 保存到后端
      try {
        await axios.post(`${BACKEND_URL}/api/articles`, {
          title: item.title || '无标题',
          summary: summary,
          content: content,
          url: url,
          source: item.origin?.title || 'Unknown',
          author: item.author || '',
          published_at: new Date(item.published * 1000).toISOString(),
          category: category,
          tags: tags,
          quality_score: qualityScore,
          status: 'pending'
        });
        
        console.log(`   ✅ 导入成功 | 分类：${category} | 标签：${tags.join(', ') || '无'} | 评分：${qualityScore.toFixed(2)}`);
        imported++;
      } catch (error) {
        console.error(`   ❌ 保存失败：${error.message}`);
      }
    }
    
    console.log(`\n📊 Digest 完成:`);
    console.log(`   - 导入：${imported} 篇`);
    console.log(`   - 跳过：${skipped} 篇`);
    console.log(`   - 分类分布：业界资讯/佳文共赏/技术博客/开源项目/资源推荐/学习资料\n`);
    
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
