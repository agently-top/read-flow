import express from 'express';
import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';

const router = express.Router();

// GET /api/articles - 获取文章列表
router.get('/', async (req, res) => {
  try {
    // 检查是否已认证
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const { verifySession } = await import('../middleware/auth.js');
    const isAdmin = token && await verifySession(token);
    
    // 未登录用户只能查看精选文章
    const status = isAdmin ? req.query.status : 'precious';
    
    const articles = await Article.findAll({
      status: status,
      source: req.query.source,
      category: req.query.category,
      tags: req.query.tags,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 50
    });
    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/articles/sources - 获取所有来源（必须在/:id 之前）
router.get('/sources', async (req, res) => {
  try {
    // 检查是否已认证
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const { verifySession } = await import('../middleware/auth.js');
    const isAdmin = token && await verifySession(token);
    
    // 管理员查全部来源，游客只看精选
    const status = isAdmin ? (req.query.status || '') : 'precious';
    
    const sources = await Article.getDistinctSources(status);
    res.json({ success: true, data: sources.map(s => s.source) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/articles/tags - 获取所有标签（必须在/:id 之前）
router.get('/tags', async (req, res) => {
  try {
    // 检查是否已认证
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const { verifySession } = await import('../middleware/auth.js');
    const isAdmin = token && await verifySession(token);
    
    // 管理员查全部标签，游客只看精选
    const status = isAdmin ? (req.query.status || '') : 'precious';
    
    const tags = await Article.getDistinctTags(status);
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/articles/categories - 获取所有分类（必须在/:id 之前）
router.get('/categories', async (req, res) => {
  try {
    // 检查是否已认证
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const { verifySession } = await import('../middleware/auth.js');
    const isAdmin = token && await verifySession(token);
    
    // 未登录用户只查看精选文章分类，管理员可以查看所有状态
    const status = isAdmin ? (req.query.status || '') : 'precious';
    
    const categories = await Category.findAll(status);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/articles/:id - 获取单篇文章（必须在最后）
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/articles - 创建文章
router.post('/', async (req, res) => {
  try {
    const article = await Article.create(req.body);
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/articles/:id/status - 更新文章状态
router.patch('/:id/status', async (req, res) => {
  try {
    await Article.updateStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
