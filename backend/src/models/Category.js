import db, { all, get } from '../db/database.js';

export class Category {
  static async findAll(status = '') {
    // 空字符串表示所有状态，否则只统计指定状态
    const statusCondition = status ? 'AND status = ?' : '';
    const sql = `
      SELECT 
        category,
        COUNT(id) as article_count
      FROM articles 
      WHERE category IS NOT NULL AND category != ''
        ${statusCondition}
      GROUP BY category
      ORDER BY article_count DESC
    `;
    return await all(sql, status ? [status] : []);
  }

  static async findById(id) {
    const sql = `
      SELECT 
        c.*,
        COUNT(a.id) as article_count
      FROM (
        SELECT DISTINCT category FROM articles WHERE category IS NOT NULL AND category != ''
      ) c
      LEFT JOIN articles a ON c.category = a.category
      WHERE c.category = ?
      GROUP BY c.category
    `;
    return await get(sql, [id]);
  }

  static async create(data) {
    const sql = `
      INSERT INTO categories (name, description, color, sort_order)
      VALUES (?, ?, ?, ?)
    `;
    const result = await run(sql, [
      data.name,
      data.description || '',
      data.color || '#3b82f6',
      data.sort_order || 0
    ]);
    return { id: result.lastInsertRowid, ...data };
  }

  static async update(id, data) {
    const sql = `
      UPDATE categories 
      SET name = ?, description = ?, color = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await run(sql, [data.name, data.description, data.color, data.sort_order, id]);
  }

  static async delete(id) {
    return await run('DELETE FROM categories WHERE id = ?', [id]);
  }
}
