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
    
    sql += ' ORDER BY published_at DESC';
    
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
}
