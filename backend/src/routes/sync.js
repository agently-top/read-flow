import express from 'express';
import { syncFromFreshRSS } from '../scripts/sync-from-freshrss.js';

const router = express.Router();

// POST /api/sync - 同步 FreshRSS 文章
router.post('/', async (req, res) => {
  try {
    const count = await syncFromFreshRSS();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
