const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, JWT_SECRET, ADMIN_JWT_SECRET } = require('../middleware');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度应为2-20个字符' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于6个字符' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash);

  const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: result.lastInsertRowid, username } });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (user) {
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(user.id);
    return res.json({
      token,
      user: { id: user.id, username: user.username, isAdmin: false },
      character: character || null
    });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (admin) {
    if (!bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      ADMIN_JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      token,
      user: { id: admin.id, username: admin.username, isAdmin: true, role: admin.role },
      character: null
    });
  }

  return res.status(401).json({ error: '用户名或密码错误' });
});

router.get('/me', auth, (req, res) => {
  if (req.isAdmin) {
    const admin = db.prepare('SELECT id, username, role, created_at FROM admins WHERE id = ?').get(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }
    return res.json({
      user: { id: admin.id, username: admin.username, isAdmin: true, role: admin.role, created_at: admin.created_at },
      character: null
    });
  }

  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(user.id);

  res.json({ user: { ...user, isAdmin: false }, character });
});

module.exports = router;
