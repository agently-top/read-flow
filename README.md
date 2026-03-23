# Read Flow - 漏斗式阅读工作流

> 汇流万象，智能提纯，沉淀真知

基于 [肖恩的漏斗式阅读工作流](https://shawnxie.top/blogs/tools/read-flow-2026.html) 构建的完整信息处理系统。

## 🎯 核心功能

- 📰 **RSS 聚合** - FreshRSS 统一订阅管理
- 🤖 **AI 预处理** - 自动去重、摘要、质量评分
- 📊 **每日精选** - LLM 分类整理，生成日报
- 🌐 **Web 审阅** - 简洁黑白风格，流畅阅读体验
- 📚 **知识库沉淀** - 思源笔记自动同步
- 📱 **飞书推送** - 日报自动推送到群

## 🏗️ 技术架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  FreshRSS   │────▶│  OpenClaw    │────▶│  Next.js    │
│  (8081)     │     │  Skills      │     │  (3000)     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Express API │     │  SiYuan     │
                    │  (3001)      │     │  Notebook   │
                    └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   SQLite     │
                    │  (sql.js)    │
                    └──────────────┘
```

## 🚀 快速开始

### 1. 启动服务

```bash
cd /root/.openclaw/workspace/read-flow
docker-compose up -d
```

### 2. 访问服务

| 服务 | 地址 |
|------|------|
| 前端 Web | http://81.70.8.160:3000 |
| 后端 API | http://81.70.8.160:3001 |
| FreshRSS | http://81.70.8.160:8081 |

### 3. 配置环境变量

创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# FreshRSS
FRESHRSS_URL=http://host.docker.internal:8081
FRESHRSS_USER=admin
FRESHRSS_PASSWORD=FreshRSS2026!

# LLM (可选，用于摘要生成)
DEEPSEEK_API_KEY=your_api_key_here

# 飞书推送 (可选)
FEISHU_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxx

# 思源笔记 (可选)
SIYUAN_API_URL=http://host.docker.internal:6806
SIYUAN_NOTEBOOK_ID=20250805163218-dqifw69
```

### 4. 运行技能脚本

**手动执行 Digest：**
```bash
docker exec readflow-backend node skills/digest-skill/index.js
```

**手动执行 Daily Review：**
```bash
docker exec readflow-backend node skills/daily-review-skill/index.js
```

**手动同步思源：**
```bash
docker exec readflow-backend node skills/siyuan-sync/index.js
```

## 📋 定时任务

参考 [docs/cron-jobs.md](docs/cron-jobs.md)

建议配置：
- **Digest**: 每天 6:00, 12:00, 18:00
- **Daily Review**: 每天 20:00
- **思源同步**: 每天 21:00

## 📁 项目结构

```
read-flow/
├── backend/              # Node.js Express 后端
│   ├── src/
│   │   ├── db/          # 数据库层 (sql.js)
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # API 路由
│   │   └── services/    # 外部服务集成
│   └── Dockerfile
├── frontend/             # Next.js 前端
│   ├── src/
│   │   ├── app/         # 页面路由
│   │   └── components/  # UI 组件
│   └── Dockerfile
├── skills/               # OpenClaw 技能
│   ├── digest-skill/    # 内容预处理
│   ├── daily-review-skill/ # 每日精选
│   └── siyuan-sync/     # 思源同步
├── docs/                 # 文档
├── docker-compose.yml    # Docker 编排
└── README.md
```

## 🎨 UI 设计

参考 [Lumina](https://lumina.shawnxie.top/) 的黑白简洁风格：
- 极简配色（黑/白/灰）
- 清晰的层次结构
- 流畅的阅读体验

## 📊 API 文档

### 文章相关

```bash
# 获取文章列表
GET /api/articles?status=pending&limit=50

# 获取单篇文章
GET /api/articles/:id

# 创建文章
POST /api/articles
{
  "title": "文章标题",
  "summary": "摘要",
  "content": "正文",
  "url": "原文链接",
  "source": "来源",
  "status": "pending"
}

# 更新文章状态
PATCH /api/articles/:id/status
{
  "status": "precious"  // pending, reviewing, precious, skipped, synced
}
```

### 同步相关

```bash
# 同步 FreshRSS
POST /api/sync
```

## 🛠️ 开发

### 本地开发后端

```bash
cd backend
npm install
npm run dev
```

### 本地开发前端

```bash
cd frontend
npm install
npm run dev
```

## 📝 Git 工作流

```bash
# 提交代码
git add .
git commit -m "描述清晰的提交信息"
git push
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

*基于漏斗式阅读工作流构建 | Powered by OpenClaw*
