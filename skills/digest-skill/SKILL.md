# Digest Skill - 内容预处理

**Use when:** 定时从 FreshRSS 获取未读文章，进行去重、摘要、质量检查。

**Trigger:** Cron 每天 6:00/12:00/18:00 执行

**Output:** 结构化的候选内容池（存入后端 API）

## 核心功能

1. **获取未读文章** - 从 FreshRSS API 拉取未读内容
2. **URL 去重** - 检查后端数据库，跳过已存在的文章
3. **内容摘要** - 调用 LLM 生成简洁摘要（200 字以内）
4. **质量检查** - 过滤广告、低质、标题党内容
5. **分类标签** - 自动识别文章类别和关键词

## 工作流程

```
FreshRSS → 获取未读 → URL 去重 → LLM 摘要 → 质量评分 → 后端 API
```

## 输出格式

```json
{
  "title": "文章标题",
  "summary": "AI 生成的摘要",
  "content": "正文内容",
  "url": "原文链接",
  "source": "来源名称",
  "author": "作者",
  "published_at": "发布时间",
  "category": "自动分类",
  "quality_score": 0.85,
  "status": "pending"
}
```
