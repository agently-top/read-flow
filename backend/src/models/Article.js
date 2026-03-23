import db from '../db/database.js';

export class Article {
  static findAll(filters = {}) {
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
    
    return db.prepare(sql).all(...params);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  }

  static findByUrl(url) {
    return db.prepare('SELECT * FROM articles WHERE url = ?').get(url);
  }

  static create(data) {
    const sql = `
      INSERT INTO articles (title, summary, content, url, source, author, published_at, category, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = db.prepare(sql).run(
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
    );
    return { id: result.lastInsertRowid, ...data };
  }

  static updateStatus(id, status) {
    return db.prepare(`
      UPDATE articles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, id);
  }

  static count(filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM articles WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    return db.prepare(sql).get(...params).count;
  }
}
