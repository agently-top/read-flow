import express from 'express';
import { Article } from '../models/Article.js';
import { verifyAdminPassword, generateToken, createSession, destroySession, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/admin/login - 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password required' });
    }
    
    if (!verifyAdminPassword(password)) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
    const token = generateToken();
    const session = await createSession(token);
    
    res.json({ 
      success: true, 
      data: { 
        token: session.token,
        expiresAt: session.expiresAt
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/logout - 管理员登出
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      await destroySession(token);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/session - 验证当前会话
router.get('/session', requireAuth, async (req, res) => {
  res.json({ success: true, data: { authenticated: true } });
});

// PATCH /api/admin/articles/:id - 更新文章（管理员专属）
router.patch('/articles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, category, tags, note } = req.body;
    
    // 跳过 = 直接删除
    if (status === 'skipped') {
      await Article.delete(id);
      return res.json({ success: true, data: null, deleted: true });
    }
    
    // 更新文章状态和分类
    if (status !== undefined || category !== undefined || tags !== undefined) {
      await Article.update(id, { status, category, tags });
    }
    
    // 如果有笔记，创建审阅记录
    if (note) {
      await Article.createReview(id, note);
    }
    
    const updatedArticle = await Article.findById(id);
    res.json({ success: true, data: updatedArticle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/articles/:id/review - 创建审阅记录
router.post('/articles/:id/review', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;
    
    await Article.createReview(id, note, action);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/stats - 获取统计信息
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const total = await Article.count();
    const pending = await Article.count({ status: 'pending' });
    const precious = await Article.count({ status: 'precious' });
    const skipped = await Article.count({ status: 'skipped' });
    
    res.json({ 
      success: true, 
      data: { total, pending, precious, skipped } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
