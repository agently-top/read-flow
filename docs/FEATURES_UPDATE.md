# Read Flow 功能更新文档

## 新增功能概览

本次更新完善了 Read Flow 项目的三个核心功能：

1. **列表页面布局优化** - 左侧分类导航 + 右侧文章列表与高级筛选
2. **管理员登录系统** - 简单密码认证，支持文章精选和分类
3. **文章在线阅读** - 优化的阅读体验，支持管理员在线审阅

---

## 1. 列表页面布局

### 功能特性

- **左侧分类列表**（固定宽度 200px）
  - 显示所有文章分类
  - 显示每个分类的文章数量
  - 点击分类快速筛选
  - 支持"全部分类"选项

- **右侧文章列表**
  - 卡片式文章展示
  - 显示文章标题、摘要、来源、作者、发表时间
  - 显示文章状态标签（待审阅/精读/跳过/稍后）
  - 显示分类和标签
  - 点击"阅读"跳转到文章详情页

- **顶部高级筛选**
  - 状态筛选：全部/待审阅/精读/跳过/稍后阅读
  - 来源筛选：动态加载所有来源
  - 标签筛选：动态加载所有标签
  - 日期范围：开始日期和结束日期
  - 排序选项：发表时间/获取时间/标题
  - 一键清除筛选

### 页面结构

```
┌────────────────────────────────────────────────┐
│  Read Flow          管理员登录 | 高级筛选      │
├──────────┬─────────────────────────────────────┤
│          │  信息流                              │
│  分类    │  ┌───────────────────────────────┐  │
│  ──────  │  │ 状态 │ 来源 │ 标签 │ 排序    │  │
│  全部    │  │ 日期从 │ 日期到                │  │
│  科技 50 │  └───────────────────────────────┘  │
│  AI 32   │                                      │
│  设计 18 │  ┌───────────────────────────────┐  │
│  产品 12 │  │ 文章标题                       │  │
│          │  │ 文章摘要...                    │  │
│          │  │ 来源 · 作者 · 日期 #标签       │  │
│          │  └───────────────────────────────┘  │
└──────────┴─────────────────────────────────────┘
```

### API 端点

- `GET /api/articles/categories` - 获取所有分类
- `GET /api/articles/sources` - 获取所有来源
- `GET /api/articles/tags` - 获取所有标签
- `GET /api/articles?category=xxx&status=xxx&source=xxx` - 带筛选的文章列表

---

## 2. 管理员登录系统

### 功能特性

- **简单密码认证**
  - 仅需密码，无需账号
  - 密码存储在环境变量 `ADMIN_PASSWORD`
  - 会话有效期 24 小时
  - Token 存储在 localStorage

- **管理员功能**
  - 访问管理员仪表板
  - 审阅待处理文章
  - 标记文章状态（精读/跳过/稍后）
  - 添加审阅笔记
  - 查看统计信息

### 认证流程

1. 用户访问 `/admin/login`
2. 输入管理员密码
3. 后端验证密码（对比 `ADMIN_PASSWORD` 环境变量）
4. 验证成功生成 session token
5. Token 保存到 localStorage
6. 跳转到 `/admin/dashboard`

### 安全考虑

- 密码通过 HTTPS 传输（生产环境必须使用 HTTPS）
- Token 24 小时后自动过期
- 所有管理接口需要 Bearer Token 认证
- 支持手动登出销毁 session

### API 端点

- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/logout` - 管理员登出
- `GET /api/admin/session` - 验证当前会话
- `PATCH /api/admin/articles/:id` - 更新文章（管理员专属）
- `POST /api/admin/articles/:id/review` - 创建审阅记录
- `GET /api/admin/stats` - 获取统计信息

### 环境变量配置

```bash
# .env 文件
ADMIN_PASSWORD=your_secure_password_here
```

⚠️ **重要**: 生产环境请使用强密码并妥善保管

---

## 3. 文章在线阅读

### 功能特性

- **优化的阅读体验**
  - 清晰的文章排版
  - 响应式设计
  - 支持 HTML 内容渲染
  - 摘要高亮显示
  - 标签和分类展示

- **文章信息展示**
  - 来源、作者、发表时间
  - 文章状态标签
  - 分类和标签
  - 获取时间

- **管理员审阅**
  - 右侧固定审阅面板
  - 一键标记文章状态
  - 添加审阅笔记
  - 非管理员显示登录提示

- **保持原有路由**
  - `/article/:id` - 文章详情页
  - 向后兼容，不影响现有链接

### 页面结构

```
┌────────────────────────────────────────────────┐
│  Read Flow         ← 返回列表 | 管理面板       │
├────────────────────────────────────────────────┤
│                                               │
│  [精读] [AI 分类]                              │
│  文章标题                                      │
│  来源 · 作者 · 2026 年 3 月 24 日                 │
│  #标签 1 #标签 2 #标签 3                        │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ 文章摘要（高亮显示）                     │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  文章正文内容...                              │
│  （支持 HTML 格式）                             │
│                                               │
│  查看原文 →                                   │
│                                               │
└────────────────────────────────────────────────┘
```

---

## 数据库变更

### 新增表

#### categories（分类表）
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### admin_sessions（管理员会话表）
```sql
CREATE TABLE admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
```

### 新增索引

```sql
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);
```

---

## 文件结构

### 后端新增文件

```
backend/src/
├── middleware/
│   └── auth.js              # 认证中间件
├── models/
│   ├── Article.js           # 更新：添加 update、createReview 等方法
│   └── Category.js          # 新增：分类模型
├── routes/
│   ├── articles.js          # 更新：添加分类、来源、标签接口
│   └── admin.js             # 新增：管理员接口
└── db/
    └── schema.sql           # 更新：添加新表结构
```

### 前端新增文件

```
frontend/src/app/
├── list/
│   └── page.tsx             # 更新：列表页面（左侧分类 + 高级筛选）
├── article/
│   └── [id]/
│       └── page.tsx         # 更新：文章阅读页面
└── admin/
    ├── login/
    │   └── page.tsx         # 新增：管理员登录页面
    └── dashboard/
        └── page.tsx         # 新增：管理员仪表板
```

---

## 使用指南

### 1. 配置管理员密码

```bash
# 编辑 .env 文件
cd /root/.openclaw/workspace/read-flow
echo "ADMIN_PASSWORD=MySecurePassword2026" >> .env
```

### 2. 重启后端服务

```bash
cd backend
npm restart
# 或如果使用 docker
docker-compose restart backend
```

### 3. 访问管理员登录

1. 打开浏览器访问 `http://localhost:3000/admin/login`
2. 输入管理员密码
3. 点击"登录"
4. 登录后自动跳转到仪表板

### 4. 审阅文章

1. 在仪表板左侧选择待审阅文章
2. 右侧显示文章内容和审阅操作
3. 选择"精读"、"跳过"或"稍后"
4. 可选：添加审阅笔记
5. 文章自动标记并同步到思源笔记

### 5. 使用高级筛选

1. 在列表页面点击"高级筛选"
2. 设置筛选条件（状态、来源、标签、日期等）
3. 文章列表实时更新
4. 点击"清除筛选"重置所有条件

---

## API 文档

### 认证相关

#### POST /api/admin/login
管理员登录

**请求体:**
```json
{
  "password": "your_admin_password"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "token": "abc123...",
    "expiresAt": "2026-03-25T09:00:00.000Z"
  }
}
```

#### POST /api/admin/logout
管理员登出

**请求头:**
```
Authorization: Bearer <token>
```

#### GET /api/admin/session
验证当前会话

**请求头:**
```
Authorization: Bearer <token>
```

### 文章管理

#### PATCH /api/admin/articles/:id
更新文章（管理员专属）

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "status": "precious",
  "category": "AI",
  "tags": ["LLM", "OpenAI"],
  "note": "重要文章，值得精读"
}
```

#### POST /api/admin/articles/:id/review
创建审阅记录

**请求头:**
```
Authorization: Bearer <token>
```

**请求体:**
```json
{
  "action": "precious",
  "note": "审阅笔记内容"
}
```

### 统计信息

#### GET /api/admin/stats
获取统计信息

**请求头:**
```
Authorization: Bearer <token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "pending": 45,
    "precious": 80,
    "skipped": 25
  }
}
```

### 元数据

#### GET /api/articles/categories
获取所有分类

**响应:**
```json
{
  "success": true,
  "data": [
    { "category": "AI", "article_count": 32 },
    { "category": "科技", "article_count": 50 }
  ]
}
```

#### GET /api/articles/sources
获取所有来源

**响应:**
```json
{
  "success": true,
  "data": ["Hacker News", "TechCrunch", "The Verge"]
}
```

#### GET /api/articles/tags
获取所有标签

**响应:**
```json
{
  "success": true,
  "data": ["LLM", "OpenAI", "AI", "Startup"]
}
```

---

## 开发注意事项

### 1. 数据库迁移

首次启动时会自动创建新表。如果使用现有数据库，建议：

```bash
# 备份数据库
cp data/readflow.db data/readflow.db.backup

# 重启后端，自动应用新 schema
npm run dev
```

### 2. 环境变量

确保以下环境变量已配置：

```bash
# 必需
ADMIN_PASSWORD=your_password

# 可选但推荐
SIYUAN_NOTEBOOK_ID=your_notebook_id  # 用于同步精读内容
```

### 3. 前端构建

```bash
cd frontend
npm run build
npm run start
```

### 4. 错误处理

- 密码错误返回 401
- Token 过期返回 401
- 网络错误在前端显示友好提示
- 所有 API 错误都有明确的错误信息

---

## 后续优化建议

1. **分类管理界面** - 允许管理员创建、编辑、删除分类
2. **批量操作** - 支持批量标记文章状态
3. **标签管理** - 允许手动添加和管理标签
4. **搜索功能** - 全文搜索文章内容
5. **导出功能** - 导出精读文章到 Markdown 或 PDF
6. **RSS 订阅** - 为精读文章生成 RSS feed
7. **多用户支持** - 扩展为多用户系统
8. **操作日志** - 记录所有管理操作

---

## 故障排查

### 问题：管理员登录失败

**检查:**
1. `.env` 文件中是否配置了 `ADMIN_PASSWORD`
2. 后端是否重启以加载新环境变量
3. 浏览器控制台是否有错误信息

### 问题：分类列表为空

**检查:**
1. 数据库中是否有文章数据
2. 文章是否有 `category` 字段
3. 检查 `/api/articles/categories` API 响应

### 问题：审阅操作无响应

**检查:**
1. 管理员 token 是否过期
2. 网络连接是否正常
3. 后端日志是否有错误

---

## 更新日志

### v1.2.0 (2026-03-24)

**新增:**
- ✅ 列表页面左侧分类导航
- ✅ 高级筛选功能（状态、来源、标签、日期）
- ✅ 管理员登录系统
- ✅ 管理员仪表板
- ✅ 文章在线阅读优化
- ✅ 分类、来源、标签 API
- ✅ 管理员认证中间件

**改进:**
- ✅ 文章页面布局优化
- ✅ 响应式设计
- ✅ 错误处理优化

**数据库:**
- ✅ 新增 categories 表
- ✅ 新增 admin_sessions 表
- ✅ 新增分类和会话索引

---

**文档版本:** v1.2.0  
**更新日期:** 2026-03-24  
**作者:** Read Flow Team
