import express from 'express';
import { Article } from '../models/Article.js';

const router = express.Router();

// GET /api/articles - 获取文章列表
router.get('/', async (req, res) => {
  try {
    const articles = await Article.findAll({
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
