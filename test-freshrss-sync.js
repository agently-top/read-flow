#!/usr/bin/env node
import axios from 'axios';

const FRESHRSS_URL = 'http://localhost:8081';
const BACKEND_URL = 'http://localhost:3001';
const USER = 'admin';
const PASS = 'FreshRSS2026!';

async function sync() {
  console.log('🚀 开始 FreshRSS 同步...\n');
  
  // 1. 登录获取 Token
  const loginRes = await axios.post(`${FRESHRSS_URL}/api/greader.php/accounts/ClientLogin`, 
    new URLSearchParams({ Email: USER, Passwd: PASS, service: 'reader' }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const auth = loginRes.data.match(/Auth=([a-z0-9/]+)/i)?.[1];
  if (!auth) throw new Error('登录失败');
  console.log(`✅ FreshRSS 登录成功\n`);
  
  // 2. 获取未读文章
  const headers = { 'Authorization': `GoogleLogin auth=${auth}` };
  const unreadRes = await axios.get(`${FRESHRSS_URL}/api/greader.php/reader/api/0/stream/contents/user/-/state/com.google/reading-list`, {
    headers,
    params: { xt: 'user/-/state/com.google/read', n: 10, output: 'json' }
  });
  const items = unreadRes.data.items || [];
  console.log(`📥 获取到 ${items.length} 篇未读文章\n`);
  
  // 3. 获取已存在的文章 URL
  const existingRes = await axios.get(`${BACKEND_URL}/api/articles?limit=1000`);
  const existingUrls = new Set(existingRes.data.data.map(a => a.url));
  
  // 4. 导入新文章
  let imported = 0;
  for (const item of items.slice(0, 5)) {
    const url = item.canonical?.[0]?.href || item.id;
    if (existingUrls.has(url)) {
      console.log(`⏭️  跳过：${item.title?.substring(0, 50)}...`);
      continue;
    }
    
    const content = item.content?.content || item.summary?.content || '';
    await axios.post(`${BACKEND_URL}/api/articles`, {
      title: item.title || '无标题',
      summary: content.substring(0, 200),
      content: content,
      url: url,
      source: item.origin?.title || 'Unknown',
      author: item.author || '',
      published_at: new Date(item.published * 1000).toISOString(),
      category: '综合',
      status: 'pending'
    });
    
    console.log(`✅ 导入：${item.title?.substring(0, 50)}...`);
    imported++;
  }
  
  console.log(`\n📊 同步完成：导入 ${imported} 篇新文章`);
}

sync().catch(console.error);
