# Read Flow 实现计划

> **For agent:** REQUIRED SUB-SKILL: Use Section 5 (Subagent-Driven Development) to implement this plan.

**Goal:** 构建完整的漏斗式阅读工作流系统，包含 FreshRSS 聚合、Node.js 后端、Next.js 前端、OpenClaw 编排、思源笔记集成。

**Architecture:** 
- 后端：Node.js Express + SQLite（Docker 部署）
- 前端：Next.js 14 + Tailwind CSS（Docker 部署）
- 编排：OpenClaw Skills（Digest/Daily Review/Weekly）
- 数据流：FreshRSS → OpenClaw → 后端 API → 前端展示 → 思源沉淀

**Tech Stack:** Node.js, Express, Next.js 14, Tailwind CSS, SQLite, Docker Compose, OpenClaw, SiYuan API

---

## 阶段 1：项目基础设施（Day 1）

### Task 1: 创建项目目录结构
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/`
- Create: `/root/.openclaw/workspace/read-flow/backend/`
- Create: `/root/.openclaw/workspace/read-flow/frontend/`
- Create: `/root/.openclaw/workspace/read-flow/docker/`
- Create: `/root/.openclaw/workspace/read-flow/docs/`

**Step 1:** 创建目录结构
```bash
cd /root/.openclaw/workspace/read-flow
mkdir -p backend frontend docker docs/plans
```

**Step 2:** 创建 `.gitignore`
```
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
backend/data/*.db
frontend/.next
```

**Step 3:** 提交
```bash
git add .
git commit -m "Setup project structure"
```

---

### Task 2: 编写 Docker Compose 配置
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/docker-compose.yml`

**Step 1:** 编写 docker-compose.yml（包含完整服务定义）
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: readflow-backend
    restart: unless-stopped
    ports:
      - "8082:3001"
    volumes:
      - ./backend:/app
      - backend-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=/app/data/readflow.db
      - OPENCLAW_API_URL=http://host.docker.internal:8888
      - SIYUAN_API_URL=http://host.docker.internal:6806
    networks:
      - readflow-network

  frontend:
    build: ./frontend
    container_name: readflow-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:8082
    depends_on:
      - backend
    networks:
      - readflow-network

networks:
  readflow-network:
    driver: bridge

volumes:
  backend-data:
```

**Step 2:** 提交
```bash
git add docker-compose.yml
git commit -m "Add Docker Compose configuration"
```

---

## 阶段 2：后端开发（Day 2-3）

### Task 3: 初始化 Node.js 后端项目
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/backend/package.json`
- Create: `/root/.openclaw/workspace/read-flow/backend/src/index.js`

**Step 1:** 创建 package.json
```json
{
  "name": "readflow-backend",
  "version": "1.0.0",
  "description": "Read Flow Backend API",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "axios": "^1.6.7"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}
```

**Step 2:** 创建 src/index.js（基础 Express 服务器）
```javascript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
```

**Step 3:** 创建 Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**Step 4:** 安装依赖并测试
```bash
cd backend
npm install
npm run dev
# 访问 http://localhost:8082/health 验证
```

**Step 5:** 提交
```bash
git add .
git commit -m "Initialize backend with Express"
```

---

### Task 4: 实现数据库层
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/backend/src/db/database.js`
- Create: `/root/.openclaw/workspace/read-flow/backend/src/db/schema.sql`

**Step 1:** 创建 schema.sql
```sql
-- 文章内容表
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  url TEXT UNIQUE,
  source TEXT,
  author TEXT,
  published_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending', -- pending, reviewing, precious, skipped
  category TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 审阅记录表
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- precious, skip, later
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 来源质量表
CREATE TABLE IF NOT EXISTS source_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT UNIQUE NOT NULL,
  total_count INTEGER DEFAULT 0,
  precious_count INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  quality_score REAL DEFAULT 0.5,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
```

**Step 2:** 创建 database.js
```javascript
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_URL || join(__dirname, '../../data/readflow.db');

// 确保 data 目录存在
const dbDir = dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// 初始化数据库
function initDatabase() {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('Database initialized');
}

initDatabase();

export default db;
```

**Step 3:** 更新 index.js 添加数据库路由
```javascript
import dbRoutes from './routes/db.js';
app.use('/api/db', dbRoutes);
```

**Step 4:** 测试数据库初始化
```bash
npm run dev
# 检查 data/readflow.db 是否创建成功
```

**Step 5:** 提交
```bash
git add .
git commit -m "Add SQLite database layer"
```

---

### Task 5: 实现文章 API
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/backend/src/routes/articles.js`
- Create: `/root/.openclaw/workspace/read-flow/backend/src/models/Article.js`

**Step 1:** 创建 Article 模型
```javascript
import db from '../db/database.js';

export class Article {
  static findAll(filters = {}) {
    let sql = 'SELECT * FROM articles WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.source) {
      sql += ' AND source = ?';
      params.push(filters.source);
    }
    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    
    sql += ' ORDER BY published_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    return db.prepare(sql).all(...params);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  }

  static create(data) {
    const sql = `
      INSERT INTO articles (title, summary, content, url, source, author, published_at, category, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = db.prepare(sql).run(
      data.title,
      data.summary,
      data.content,
      data.url,
      data.source,
      data.author,
      data.published_at,
      data.category,
      JSON.stringify(data.tags || [])
    );
    return { id: result.lastInsertRowid, ...data };
  }

  static updateStatus(id, status) {
    return db.prepare(`
      UPDATE articles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, id);
  }

  static count(filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM articles WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    return db.prepare(sql).get(...params).count;
  }
}
```

**Step 2:** 创建 articles 路由
```javascript
import express from 'express';
import { Article } from '../models/Article.js';

const router = express.Router();

// GET /api/articles - 获取文章列表
router.get('/', (req, res) => {
  try {
    const articles = Article.findAll({
      status: req.query.status,
      source: req.query.source,
      category: req.query.category,
      limit: parseInt(req.query.limit) || 50
    });
    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/articles/:id - 获取单篇文章
router.get('/:id', (req, res) => {
  try {
    const article = Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/articles - 创建文章
router.post('/', (req, res) => {
  try {
    const article = Article.create(req.body);
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/articles/:id/status - 更新文章状态
router.patch('/:id/status', (req, res) => {
  try {
    Article.updateStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

**Step 3:** 更新 index.js 添加文章路由
```javascript
import articleRoutes from './routes/articles.js';
app.use('/api/articles', articleRoutes);
```

**Step 4:** 测试 API
```bash
# 创建测试文章
curl -X POST http://localhost:8082/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试文章",
    "summary": "这是一个测试",
    "content": "正文内容",
    "url": "https://example.com/test",
    "source": "Test Source",
    "published_at": "2026-03-23T10:00:00Z"
  }'

# 获取文章列表
curl http://localhost:8082/api/articles
```

**Step 5:** 提交
```bash
git add .
git commit -m "Implement articles API"
```

---

### Task 6: 实现 FreshRSS 集成
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/backend/src/services/freshrss.js`

**Step 1:** 创建 FreshRSS 服务
```javascript
import axios from 'axios';

const FRESHRSS_URL = process.env.FRESHRSS_URL || 'http://localhost:8081';
const FRESHRSS_USER = process.env.FRESHRSS_USER || 'admin';
const FRESHRSS_PASSWORD = process.env.FRESHRSS_PASSWORD || 'FreshRSS2026!';

let FRESHRSS_API_KEY = null;

// 登录获取 API Key
export async function loginToFreshRSS() {
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
      console.log('FreshRSS login successful');
      return FRESHRSS_API_KEY;
    }
    throw new Error('Failed to extract API key');
  } catch (error) {
    console.error('FreshRSS login failed:', error.message);
    throw error;
  }
}

// 获取未读文章
export async function getUnreadArticles() {
  if (!FRESHRSS_API_KEY) {
    await loginToFreshRSS();
  }

  try {
    const response = await axios.get(
      `${FRESHRSS_URL}/api/greader.php/reader/api/0/stream/contents/user/-/state/com.google/reading-list`,
      {
        headers: { 'Authorization': `GoogleLogin auth=${FRESHRSS_API_KEY}` },
        params: { xt: 'user/-/state/com.google/read', n: 100 }
      }
    );
    
    return response.data.items || [];
  } catch (error) {
    console.error('Failed to fetch unread articles:', error.message);
    throw error;
  }
}

// 标记文章为已读
export async function markAsRead(articleId) {
  if (!FRESHRSS_API_KEY) {
    await loginToFreshRSS();
  }

  try {
    await axios.post(
      `${FRESHRSS_URL}/api/greader.php/reader/api/0/edit-tag`,
      new URLSearchParams({
        i: articleId,
        a: 'user/-/state/com.google/read'
      }),
      {
        headers: {
          'Authorization': `GoogleLogin auth=${FRESHRSS_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  } catch (error) {
    console.error('Failed to mark as read:', error.message);
    throw error;
  }
}
```

**Step 2:** 创建同步脚本
```javascript
// src/scripts/sync-from-freshrss.js
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
```

**Step 3:** 添加同步 API 路由
```javascript
// routes/sync.js
import { syncFromFreshRSS } from '../scripts/sync-from-freshrss.js';

router.post('/sync', async (req, res) => {
  try {
    const count = await syncFromFreshRSS();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Step 4:** 测试同步
```bash
curl -X POST http://localhost:8082/api/sync
```

**Step 5:** 提交
```bash
git add .
git commit -m "Add FreshRSS integration"
```

---

## 阶段 3：前端开发（Day 4-5）

### Task 7: 初始化 Next.js 前端项目
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/frontend/`

**Step 1:** 创建 Next.js 项目
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Step 2:** 配置环境变量
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8082
```

**Step 3:** 测试开发服务器
```bash
npm run dev
# 访问 http://localhost:3000
```

**Step 4:** 提交
```bash
git add .
git commit -m "Initialize Next.js frontend"
```

---

### Task 8: 实现首页（Landing Page）
**Files:**
- Modify: `/root/.openclaw/workspace/read-flow/frontend/src/app/page.tsx`
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/components/Hero.tsx`
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/components/LatestArticles.tsx`

**Step 1:** 创建 Hero 组件
```tsx
export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Read Flow</h1>
        <p className="text-xl mb-8 opacity-90">
          汇流万象，智能提纯，沉淀真知
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/list"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            浏览内容
          </a>
          <a
            href="https://github.com/agently-top/read-flow"
            className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
          >
            了解更多
          </a>
        </div>
      </div>
    </section>
  );
}
```

**Step 2:** 创建 LatestArticles 组件
```tsx
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

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?limit=6`)
      .then(res => res.json())
      .then(data => setArticles(data.data || []));
  }, []);

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">最新内容</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {articles.map(article => (
            <div key={article.id} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{article.summary}</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{article.source}</span>
                <span>{new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 3:** 更新首页
```tsx
import Hero from '@/components/Hero';
import LatestArticles from '@/components/LatestArticles';

export default function Home() {
  return (
    <main>
      <Hero />
      <LatestArticles />
      <footer className="bg-gray-900 text-white py-8 text-center">
        <p>© 2026 Read Flow. Powered by OpenClaw.</p>
      </footer>
    </main>
  );
}
```

**Step 4:** 测试首页
```bash
npm run dev
# 访问 http://localhost:3000
```

**Step 5:** 提交
```bash
git add .
git commit -m "Implement landing page"
```

---

### Task 9: 实现列表页（/list）
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/app/list/page.tsx`
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/components/ArticleCard.tsx`
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/components/FilterBar.tsx`

**Step 1:** 创建 ArticleCard 组件
```tsx
interface ArticleCardProps {
  article: {
    id: number;
    title: string;
    summary: string;
    source: string;
    author: string;
    published_at: string;
    status: string;
  };
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    reviewing: 'bg-blue-100 text-blue-800',
    precious: 'bg-green-100 text-green-800',
    skipped: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold">{article.title}</h3>
        <span className={`px-2 py-1 rounded text-xs ${statusColors[article.status as keyof typeof statusColors]}`}>
          {article.status}
        </span>
      </div>
      <p className="text-gray-600 mb-4 line-clamp-3">{article.summary}</p>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{article.source} {article.author && `· ${article.author}`}</span>
        <a href={`/article/${article.id}`} className="text-blue-600 hover:underline">
          阅读 →
        </a>
      </div>
    </div>
  );
}
```

**Step 2:** 创建 FilterBar 组件
```tsx
interface FilterBarProps {
  onFilterChange: (filters: any) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid md:grid-cols-4 gap-4">
        <select
          className="border rounded px-3 py-2"
          onChange={(e) => onFilterChange({ status: e.target.value })}
        >
          <option value="">全部状态</option>
          <option value="pending">待审阅</option>
          <option value="reviewing">审阅中</option>
          <option value="precious">精读</option>
          <option value="skipped">跳过</option>
        </select>
        
        <select
          className="border rounded px-3 py-2"
          onChange={(e) => onFilterChange({ source: e.target.value })}
        >
          <option value="">全部来源</option>
          {/* 动态加载来源 */}
        </select>
        
        <select
          className="border rounded px-3 py-2"
          onChange={(e) => onFilterChange({ sort: e.target.value })}
        >
          <option value="published_at">时间倒序</option>
          <option value="-published_at">时间正序</option>
        </select>
        
        <input
          type="text"
          placeholder="搜索..."
          className="border rounded px-3 py-2"
          onChange={(e) => onFilterChange({ search: e.target.value })}
        />
      </div>
    </div>
  );
}
```

**Step 3:** 创建列表页
```tsx
'use client';
import { useEffect, useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import FilterBar from '@/components/FilterBar';

export default function ListPage() {
  const [articles, setArticles] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(filters as any);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?${params}`)
      .then(res => res.json())
      .then(data => setArticles(data.data || []));
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">信息流</h1>
        <FilterBar onFilterChange={setFilters} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article: any) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 4:** 测试列表页
```bash
npm run dev
# 访问 http://localhost:3000/list
```

**Step 5:** 提交
```bash
git add .
git commit -m "Implement articles list page"
```

---

### Task 10: 实现审阅详情页（/article/[id]）
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/app/article/[id]/page.tsx`
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/components/ArticleViewer.tsx`
- Create: `/root/.openclaw/workspace/read-flow/frontend/src/components/ReviewActions.tsx`

**Step 1:** 创建 ReviewActions 组件
```tsx
'use client';

interface ReviewActionsProps {
  articleId: number;
  onReview: (action: 'precious' | 'skip' | 'later', note: string) => void;
}

export default function ReviewActions({ articleId, onReview }: ReviewActionsProps) {
  const [note, setNote] = useState('');

  const handleAction = (action: 'precious' | 'skip' | 'later') => {
    onReview(action, note);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-4">
      <h3 className="text-lg font-semibold mb-4">审阅操作</h3>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => handleAction('precious')}
          className="bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          值得精读
        </button>
        <button
          onClick={() => handleAction('skip')}
          className="bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition"
        >
          跳过
        </button>
        <button
          onClick={() => handleAction('later')}
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          稍后
        </button>
      </div>
      
      <textarea
        className="w-full border rounded p-2 text-sm"
        rows={3}
        placeholder="记录想法（可选）..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  );
}
```

**Step 2:** 创建审阅详情页
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReviewActions from '@/components/ReviewActions';

export default function ArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${params.id}`)
      .then(res => res.json())
      .then(data => setArticle(data.data));
  }, [params.id]);

  const handleReview = async (action: string, note: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${params.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action })
    });
    
    // TODO: 同步到思源笔记
    alert(`已标记为 ${action}`);
  };

  if (!article) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <article className="bg-white rounded-lg shadow p-8">
              <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
              <div className="text-sm text-gray-500 mb-6">
                <span>{article.source}</span>
                {article.author && <span> · {article.author}</span>}
                <span> · {new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
              </div>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
              {article.url && (
                <a href={article.url} target="_blank" className="text-blue-600 hover:underline mt-4 inline-block">
                  查看原文 →
                </a>
              )}
            </article>
          </div>
          <div>
            <ReviewActions articleId={article.id} onReview={handleReview} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 3:** 测试审阅页
```bash
npm run dev
# 访问 http://localhost:3000/article/1
```

**Step 4:** 提交
```bash
git add .
git commit -m "Implement article detail page with review actions"
```

---

## 阶段 4：OpenClaw 技能开发（Day 6-7）

### Task 11: 创建 Digest Skill
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/skills/digest-skill/SKILL.md`
- Create: `/root/.openclaw/workspace/read-flow/skills/digest-skill/index.js`

**Step 1:** 创建 Digest Skill 描述
```markdown
# Digest Skill - 内容预处理

**Use when:** 定时从 FreshRSS 获取未读文章，进行去重、摘要、质量检查。

**Trigger:** Cron 每天 6:00/12:00/18:00 执行

**Output:** 结构化的候选内容池（JSON）
```

**Step 2:** 创建 Digest 脚本
```javascript
// digest/index.js
import axios from 'axios';

export async function runDigest() {
  // 1. 从 FreshRSS 获取未读文章
  // 2. URL 去重
  // 3. 调用 LLM 生成摘要
  // 4. 质量检查（过滤广告、低质内容）
  // 5. 输出到后端 API
  console.log('Digest running...');
}
```

**Step 3:** 提交
```bash
git add .
git commit -m "Add Digest skill scaffold"
```

---

### Task 12: 创建 Daily Review Skill
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/skills/daily-review-skill/SKILL.md`
- Create: `/root/.openclaw/workspace/read-flow/skills/daily-review-skill/index.js`

**Step 1:** 设计栏目结构
- 今日大事
- 变更与实践
- 安全与风险
- 开源与工具
- 洞察与数据点

**Step 2:** 提交
```bash
git add .
git commit -m "Add Daily Review skill scaffold"
```

---

### Task 13: 思源笔记集成
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/backend/src/services/siyuan.js`

**Step 1:** 创建思源服务
```javascript
import axios from 'axios';

const SIYUAN_API = process.env.SIYUAN_API_URL || 'http://localhost:6806';

export async function createDocument(notebook, title, content) {
  // 调用思源 API 创建文档
}

export async function appendBlock(documentId, content) {
  // 追加内容块
}
```

**Step 2:** 提交
```bash
git add .
git commit -m "Add SiYuan integration"
```

---

## 阶段 5：部署与测试（Day 8）

### Task 14: 配置生产环境
**Files:**
- Create: `/root/.openclaw/workspace/read-flow/.env.production`

**Step 1:** 创建环境变量文件
```env
# Backend
DATABASE_URL=/app/data/readflow.db
FRESHRSS_URL=http://localhost:8081
FRESHRSS_USER=admin
FRESHRSS_PASSWORD=FreshRSS2026!
SIYUAN_API_URL=http://host.docker.internal:6806

# Frontend
NEXT_PUBLIC_API_URL=http://your-server-ip:8082
```

**Step 2:** 提交
```bash
git add .
git commit -m "Add production environment config"
```

---

### Task 15: 部署测试
**Step 1:** 启动所有服务
```bash
cd /root/.openclaw/workspace/read-flow
docker-compose up -d
```

**Step 2:** 验证服务
```bash
# 检查容器状态
docker-compose ps

# 测试后端健康
curl http://localhost:8082/health

# 测试前端
curl http://localhost:3000
```

**Step 3:** 提交
```bash
git add .
git commit -m "Production deployment"
```

---

## 验收标准

### 功能验收
- [ ] 首页正常显示（Landing Page + 最新内容）
- [ ] 列表页可筛选、排序、搜索
- [ ] 审阅页可正常阅读、标记状态
- [ ] FreshRSS 同步正常工作
- [ ] 思源笔记集成正常

### 性能验收
- [ ] 列表加载 < 2 秒
- [ ] API 响应 < 500ms
- [ ] 无内存泄漏

### 代码质量
- [ ] 所有代码通过 ESLint
- [ ] 关键功能有测试覆盖
- [ ] Git 提交历史清晰

---

## 下一步

计划完成。请确认：

1. **计划是否完整？** 是否需要调整任务粒度？
2. **执行方式选择：**
   - **方案 A：Subagent 驱动（本 session）** - 每个任务一个子代理，快速迭代
   - **方案 B：独立 session** - 另开 session 批量执行

选择后开始执行。