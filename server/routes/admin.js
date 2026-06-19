const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { adminAuth, ADMIN_JWT_SECRET } = require('../middleware');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  if (!bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    ADMIN_JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    admin: { id: admin.id, username: admin.username, role: admin.role }
  });
});

router.get('/me', adminAuth, (req, res) => {
  res.json({ admin: req.admin });
});

router.get('/items', adminAuth, (req, res) => {
  const { page = 1, pageSize = 20, type, keyword } = req.query;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (type) {
    whereClause += ' AND type = ?';
    params.push(type);
  }
  if (keyword) {
    whereClause += ' AND name LIKE ?';
    params.push(`%${keyword}%`);
  }

  const items = db.prepare(`
    SELECT * FROM items ${whereClause} ORDER BY id LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM items ${whereClause}`).get(...params).count;

  const itemsWithDetails = items.map(item => ({
    ...item,
    effect: item.effect ? JSON.parse(item.effect) : null,
    stats: item.stats ? JSON.parse(item.stats) : null
  }));

  res.json({ items: itemsWithDetails, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

router.post('/items', adminAuth, (req, res) => {
  const { name, type, subType, quality, slot, description, effect, stats, price } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: '物品名称和类型不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO items (name, type, sub_type, quality, slot, description, effect, stats, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    type,
    subType || null,
    quality || null,
    slot || null,
    description || null,
    effect ? JSON.stringify(effect) : null,
    stats ? JSON.stringify(stats) : null,
    price || 0
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.json({ message: '物品创建成功', item: {
    ...item,
    effect: item.effect ? JSON.parse(item.effect) : null,
    stats: item.stats ? JSON.parse(item.stats) : null
  }});
});

router.put('/items/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { name, type, subType, quality, slot, description, effect, stats, price } = req.body;

  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '物品不存在' });
  }

  db.prepare(`
    UPDATE items SET name = ?, type = ?, sub_type = ?, quality = ?, slot = ?, description = ?, effect = ?, stats = ?, price = ?
    WHERE id = ?
  `).run(
    name,
    type,
    subType || null,
    quality || null,
    slot || null,
    description || null,
    effect ? JSON.stringify(effect) : null,
    stats ? JSON.stringify(stats) : null,
    price || 0,
    id
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  res.json({ message: '物品更新成功', item: {
    ...item,
    effect: item.effect ? JSON.parse(item.effect) : null,
    stats: item.stats ? JSON.parse(item.stats) : null
  }});
});

router.delete('/items/:id', adminAuth, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '物品不存在' });
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  res.json({ message: '物品删除成功' });
});

router.get('/achievements', adminAuth, (req, res) => {
  const achievements = db.prepare('SELECT * FROM achievements ORDER BY sort_order, id').all();

  const achievementsWithDetails = achievements.map(ach => ({
    ...ach,
    rewards: ach.rewards ? JSON.parse(ach.rewards) : null
  }));

  res.json({ achievements: achievementsWithDetails });
});

router.post('/achievements', adminAuth, (req, res) => {
  const { name, description, type, targetValue, title, rewards, icon, sortOrder } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: '成就名称和类型不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO achievements (name, description, type, target_value, title, rewards, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    description || null,
    type,
    targetValue || 1,
    title || null,
    rewards ? JSON.stringify(rewards) : null,
    icon || null,
    sortOrder || 0
  );

  const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    message: '成就创建成功',
    achievement: {
      ...achievement,
      rewards: achievement.rewards ? JSON.parse(achievement.rewards) : null
    }
  });
});

router.put('/achievements/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, type, targetValue, title, rewards, icon, sortOrder } = req.body;

  const existing = db.prepare('SELECT id FROM achievements WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '成就不存在' });
  }

  db.prepare(`
    UPDATE achievements SET name = ?, description = ?, type = ?, target_value = ?, title = ?, rewards = ?, icon = ?, sort_order = ?
    WHERE id = ?
  `).run(
    name,
    description || null,
    type,
    targetValue || 1,
    title || null,
    rewards ? JSON.stringify(rewards) : null,
    icon || null,
    sortOrder || 0,
    id
  );

  const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);
  res.json({
    message: '成就更新成功',
    achievement: {
      ...achievement,
      rewards: achievement.rewards ? JSON.parse(achievement.rewards) : null
    }
  });
});

router.delete('/achievements/:id', adminAuth, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM achievements WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '成就不存在' });
  }

  db.prepare('DELETE FROM achievements WHERE id = ?').run(id);
  db.prepare('DELETE FROM character_achievements WHERE achievement_id = ?').run(id);
  res.json({ message: '成就删除成功' });
});

router.get('/sign-in-rewards', adminAuth, (req, res) => {
  const rewards = db.prepare('SELECT * FROM sign_in_rewards ORDER BY sort_order, id').all();

  const rewardsWithDetails = rewards.map(r => ({
    ...r,
    rewards: r.rewards ? JSON.parse(r.rewards) : null
  }));

  res.json({ rewards: rewardsWithDetails });
});

router.post('/sign-in-rewards', adminAuth, (req, res) => {
  const { dayType, dayNumber, rewards, sortOrder } = req.body;

  if (!dayType) {
    return res.status(400).json({ error: '奖励类型不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO sign_in_rewards (day_type, day_number, rewards, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(
    dayType,
    dayNumber || null,
    rewards ? JSON.stringify(rewards) : null,
    sortOrder || 0
  );

  const reward = db.prepare('SELECT * FROM sign_in_rewards WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    message: '签到奖励创建成功',
    reward: {
      ...reward,
      rewards: reward.rewards ? JSON.parse(reward.rewards) : null
    }
  });
});

router.put('/sign-in-rewards/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { dayType, dayNumber, rewards, sortOrder } = req.body;

  const existing = db.prepare('SELECT id FROM sign_in_rewards WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '签到奖励不存在' });
  }

  db.prepare(`
    UPDATE sign_in_rewards SET day_type = ?, day_number = ?, rewards = ?, sort_order = ?
    WHERE id = ?
  `).run(
    dayType,
    dayNumber || null,
    rewards ? JSON.stringify(rewards) : null,
    sortOrder || 0,
    id
  );

  const reward = db.prepare('SELECT * FROM sign_in_rewards WHERE id = ?').get(id);
  res.json({
    message: '签到奖励更新成功',
    reward: {
      ...reward,
      rewards: reward.rewards ? JSON.parse(reward.rewards) : null
    }
  });
});

router.delete('/sign-in-rewards/:id', adminAuth, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM sign_in_rewards WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '签到奖励不存在' });
  }

  db.prepare('DELETE FROM sign_in_rewards WHERE id = ?').run(id);
  res.json({ message: '签到奖励删除成功' });
});

router.get('/stats', adminAuth, (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const characterCount = db.prepare('SELECT COUNT(*) as count FROM characters').get().count;
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get().count;

  res.json({
    stats: {
      userCount,
      characterCount,
      itemCount,
      achievementCount
    }
  });
});

router.get('/users', adminAuth, (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  const users = db.prepare(`
    SELECT u.id, u.username, u.created_at, c.name as character_name, c.realm, c.level
    FROM users u
    LEFT JOIN characters c ON u.id = c.user_id
    ORDER BY u.id DESC
    LIMIT ? OFFSET ?
  `).all(parseInt(pageSize), offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  res.json({ users, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

module.exports = router;
