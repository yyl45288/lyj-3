const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = 'xiuxian_game_secret_2024';
const ADMIN_JWT_SECRET = 'xiuxian_admin_secret_2024';

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.isAdmin = false;
    next();
  } catch (err) {
    try {
      const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
      const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(decoded.id);
      if (admin) {
        req.user = decoded;
        req.isAdmin = true;
        return next();
      }
      return res.status(401).json({ error: '令牌无效或已过期' });
    } catch (err2) {
      return res.status(401).json({ error: '令牌无效或已过期' });
    }
  }
}

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(decoded.id);
    if (!admin) {
      return res.status(401).json({ error: '管理员不存在' });
    }
    req.admin = { id: admin.id, username: admin.username, role: admin.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

module.exports = { auth, adminAuth, JWT_SECRET, ADMIN_JWT_SECRET };
