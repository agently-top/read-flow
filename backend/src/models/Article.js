import db, { all, get, run } from '../db/database.js';

export class Article {
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM articles WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.source) {
      sql += ' AND source = ?';
      params.push(filters.source);
    }
    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.tags) {
      sql += ' AND tags LIKE ?';
      params.push(`%${filters.tags}%`);
    }
    if (filters.date_from) {
      sql += ' AND published_at >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      sql += ' AND published_at <= ?';
      params.push(filters.date_to + ' 23:59:59');
    }
    
    // 排序
    const allowedSorts = ['published_at', 'fetched_at', 'title'];
    const sort = allowedSorts.includes(filters.sort) ? filters.sort : 'published_at';
    sql += ` ORDER BY ${sort} DESC`;
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    return await all(sql, params);
  }

  static async findById(id) {
    return await get('SELECT * FROM articles WHERE id = ?', [id]);
  }

  static async findByUrl(url) {
    return await get('SELECT * FROM articles WHERE url = ?', [url]);
  }

  static async create(data) {
    const sql = `
      INSERT INTO articles (title, summary, content, url, source, author, published_at, category, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      data.title,
      data.summary,
      data.content,
      data.url,
      data.source,
      data.author,
      data.published_at,
      data.category,
      JSON.stringify(data.tags || []),
      data.status || 'pending'
    ]);
    return { id: result.lastInsertRowid, ...data };
  }

  static async updateStatus(id, status) {
    return await run(
      'UPDATE articles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
  }

  static async update(id, data) {
    const updates = [];
    const params = [];
    
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }
    
    if (updates.length === 0) return;
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    return await run(
      `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  static async createReview(articleId, note, action = 'review') {
    return await run(
      'INSERT INTO reviews (article_id, action, note) VALUES (?, ?, ?)',
      [articleId, action, note]
    );
  }

  static async delete(id) {
    // 先删关联的审阅记录
    await run('DELETE FROM reviews WHERE article_id = ?', [id]);
    return await run('DELETE FROM articles WHERE id = ?', [id]);
  }

  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM articles WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    const result = await get(sql, params);
    return result ? result.count : 0;
  }

  static async getDistinctSources(status = '') {
    if (status) {
      return await all('SELECT DISTINCT source FROM articles WHERE source IS NOT NULL AND status = ? ORDER BY source', [status]);
    }
    return await all('SELECT DISTINCT source FROM articles WHERE source IS NOT NULL ORDER BY source', []);
  }

  static async getDistinctTags(status = '') {
    let articles;
    if (status) {
      articles = await all('SELECT tags FROM articles WHERE tags IS NOT NULL AND status = ?', [status]);
    } else {
      articles = await all('SELECT tags FROM articles WHERE tags IS NOT NULL', []);
    }
    const tagSet = new Set();
    articles.forEach(article => {
      try {
        const tags = JSON.parse(article.tags);
        if (Array.isArray(tags)) {
          tags.forEach(tag => tagSet.add(tag));
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    });
    return Array.from(tagSet).sort();
  }
}
