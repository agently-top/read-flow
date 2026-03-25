# Read Flow 部署信息

## 🌐 访问地址

**主站:** http://81.70.8.160:3000/

**列表页:** http://81.70.8.160:3000/list

**管理员登录:** http://81.70.8.160:3000/admin/login

---

## 👤 用户访问

### 未登录用户
- 只能查看**精选文章**（status = precious）
- 可以浏览列表、阅读文章
- 无法使用筛选功能

### 管理员
- **密码:** `SN2008@+`
- 登录后可以：
  - 查看所有状态文章（待审阅/精读/跳过/稍后）
  - 使用高级筛选（来源/标签/日期/分类）
  - 手动精选和分类文章
  - 添加审阅笔记

---

## 🔧 后端 API

**地址:** http://81.70.8.160:3001

### 公开接口
- `GET /api/articles` - 获取文章列表（未登录只返回精选）
- `GET /api/articles/:id` - 获取单篇文章
- `GET /api/articles/categories` - 获取分类列表
- `GET /api/articles/sources` - 获取来源列表
- `GET /api/articles/tags` - 获取标签列表

### 管理员接口
- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/logout` - 管理员登出
- `PATCH /api/articles/:id/status` - 更新文章状态
- `POST /api/articles/:id/review` - 添加审阅记录

---

## 📦 Docker 容器

```bash
# 查看容器状态
docker ps | grep readflow

# 查看日志
docker logs readflow-backend
docker logs readflow-frontend

# 重启服务
cd /root/.openclaw/workspace/read-flow
docker-compose restart

# 停止服务
docker-compose down
```

---

## 🔐 修改管理员密码

1. 编辑 `.env` 文件：
```bash
cd /root/.openclaw/workspace/read-flow
nano .env
# 修改 ADMIN_PASSWORD=你的新密码
```

2. 更新 `docker-compose.yml` 中的环境变量

3. 重启容器：
```bash
docker-compose restart backend
```

---

## 📊 当前状态

- ✅ FreshRSS 同步正常
- ✅ GLM 摘要生成正常
- ✅ 权限控制生效
- ✅ 外部访问正常

**部署时间:** 2026-03-24  
**版本:** v1.2.0
