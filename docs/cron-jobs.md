# Read Flow 定时任务配置

## 使用 OpenClaw Cron 管理

### 1. Digest 任务（每天 3 次）

```bash
# 早上 6:00
openclaw cron add --name "Digest Morning" --schedule "0 6 * * *" --command "cd /root/.openclaw/workspace/read-flow && node skills/digest-skill/index.js"

# 中午 12:00
openclaw cron add --name "Digest Noon" --schedule "0 12 * * *" --command "cd /root/.openclaw/workspace/read-flow && node skills/digest-skill/index.js"

# 晚上 18:00
openclaw cron add --name "Digest Evening" --schedule "0 18 * * *" --command "cd /root/.openclaw/workspace/read-flow && node skills/digest-skill/index.js"
```

### 2. Daily Review 任务（每天 20:00）

```bash
openclaw cron add --name "Daily Review" --schedule "0 20 * * *" --command "cd /root/.openclaw/workspace/read-flow && node skills/daily-review-skill/index.js"
```

### 3. FreshRSS 同步任务（每 30 分钟）

```bash
openclaw cron add --name "FreshRSS Sync" --schedule "*/30 * * * *" --command "curl -X POST http://localhost:3001/api/sync"
```

---

## 手动测试

### 测试 Digest
```bash
cd /root/.openclaw/workspace/read-flow
node skills/digest-skill/index.js
```

### 测试 Daily Review
```bash
cd /root/.openclaw/workspace/read-flow
node skills/daily-review-skill/index.js
```

---

## 环境变量配置

在 `/root/.openclaw/workspace/read-flow/.env` 文件中配置：

```env
# FreshRSS
FRESHRSS_URL=http://host.docker.internal:8081
FRESHRSS_USER=admin
FRESHRSS_PASSWORD=FreshRSS2026!

# 后端 API
BACKEND_URL=http://localhost:3001

# LLM (可选)
DEEPSEEK_API_KEY=your_api_key_here

# 飞书推送 (可选)
FEISHU_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
```
