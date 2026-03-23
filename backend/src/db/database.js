import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_URL || join(__dirname, '../../data/readflow.db');

// 确保 data 目录存在
const dbDir = dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

// 初始化数据库
export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // 加载或创建数据库
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 读取并执行 schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.run(schema);
  
  saveDatabase();
  console.log('Database initialized');
}

// 保存数据库到文件
export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// 包装为 promise 的辅助函数
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      db.run(sql, params);
      saveDatabase();
      resolve({ lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0], changes: db.getRowsModified() });
    } catch (error) {
      reject(error);
    }
  });
}

export function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    return Promise.resolve(results);
  } catch (error) {
    return Promise.reject(error);
  }
}

export function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      return Promise.resolve(result);
    }
    return Promise.resolve(null);
  } catch (error) {
    return Promise.reject(error);
  }
}

export default { initDatabase, run, all, get, saveDatabase };
