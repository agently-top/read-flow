import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import articleRoutes from './routes/articles.js';
import syncRoutes from './routes/sync.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/articles', articleRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 异步初始化数据库
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
