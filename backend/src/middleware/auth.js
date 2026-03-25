import { get, run } from '../db/database.js';
import crypto from 'crypto';

// 验证管理员密码
export function verifyAdminPassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD not configured');
  }
  return password === adminPassword;
}

// 生成会话 token
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 创建会话
export async function createSession(token) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小时后过期
  await run(
    'INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)',
    [token, expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

// 验证会话
export async function verifySession(token) {
  if (!token) return false;
  
  const session = await get(
    'SELECT * FROM admin_sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP',
    [token]
  );
  
  if (!session) return false;
  
  // 清理过期会话
  await run('DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
  
  return true;
}

// 登出
export async function destroySession(token) {
  await run('DELETE FROM admin_sessions WHERE token = ?', [token]);
}

// Express 中间件
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  verifySession(token).then(isValid => {
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }
    next();
  }).catch(error => {
    res.status(500).json({ success: false, error: error.message });
  });
}
