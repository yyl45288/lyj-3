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

router.get('/skills', adminAuth, (req, res) => {
  const skills = db.prepare('SELECT * FROM skills ORDER BY sort_order, id').all();
  const skillsWithDetails = skills.map(s => ({
    ...s,
    effect: s.effect ? JSON.parse(s.effect) : null,
    growth: s.growth ? JSON.parse(s.growth) : null
  }));
  res.json({ skills: skillsWithDetails });
});

router.post('/skills', adminAuth, (req, res) => {
  const { name, description, type, subtype, level_req, realm_req, mp_cost, cooldown, base_power, effect, growth, proficiency_per_level, max_level, icon, sort_order } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: '技能名称和类型不能为空' });
  }
  const result = db.prepare(`
    INSERT INTO skills (name, description, type, subtype, level_req, realm_req, mp_cost, cooldown, base_power, effect, growth, proficiency_per_level, max_level, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, description || null, type, subtype || null,
    level_req || 1, realm_req || null, mp_cost || 0, cooldown || 0,
    base_power || 0,
    effect ? JSON.stringify(effect) : null,
    growth ? JSON.stringify(growth) : null,
    proficiency_per_level || 100, max_level || 10,
    icon || null, sort_order || 0
  );
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    message: '技能创建成功',
    skill: { ...skill, effect: skill.effect ? JSON.parse(skill.effect) : null, growth: skill.growth ? JSON.parse(skill.growth) : null }
  });
});

router.put('/skills/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, type, subtype, level_req, realm_req, mp_cost, cooldown, base_power, effect, growth, proficiency_per_level, max_level, icon, sort_order } = req.body;
  const existing = db.prepare('SELECT id FROM skills WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '技能不存在' });

  db.prepare(`
    UPDATE skills SET name = ?, description = ?, type = ?, subtype = ?, level_req = ?, realm_req = ?, mp_cost = ?, cooldown = ?, base_power = ?, effect = ?, growth = ?, proficiency_per_level = ?, max_level = ?, icon = ?, sort_order = ?
    WHERE id = ?
  `).run(
    name, description || null, type, subtype || null,
    level_req || 1, realm_req || null, mp_cost || 0, cooldown || 0,
    base_power || 0,
    effect ? JSON.stringify(effect) : null,
    growth ? JSON.stringify(growth) : null,
    proficiency_per_level || 100, max_level || 10,
    icon || null, sort_order || 0, id
  );
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
  res.json({
    message: '技能更新成功',
    skill: { ...skill, effect: skill.effect ? JSON.parse(skill.effect) : null, growth: skill.growth ? JSON.parse(skill.growth) : null }
  });
});

router.delete('/skills/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM skills WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '技能不存在' });
  db.prepare('DELETE FROM skills WHERE id = ?').run(id);
  db.prepare('DELETE FROM character_skills WHERE skill_id = ?').run(id);
  res.json({ message: '技能删除成功' });
});

router.get('/dungeons', adminAuth, (req, res) => {
  const dungeons = db.prepare('SELECT * FROM dungeons ORDER BY sort_order, id').all();
  const dungeonsWithDetails = dungeons.map(d => ({
    ...d,
    monsters: d.monsters ? JSON.parse(d.monsters) : [],
    firstClearRewards: d.first_clear_rewards ? JSON.parse(d.first_clear_rewards) : null,
    clearRewards: d.clear_rewards ? JSON.parse(d.clear_rewards) : null
  }));
  res.json({ dungeons: dungeonsWithDetails });
});

router.post('/dungeons', adminAuth, (req, res) => {
  const { name, description, level_req, realm_req, daily_limit, monsters, first_clear_rewards, clear_rewards, icon, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: '副本名称不能为空' });

  const result = db.prepare(`
    INSERT INTO dungeons (name, description, level_req, realm_req, daily_limit, monsters, first_clear_rewards, clear_rewards, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, description || null, level_req || 1, realm_req || null,
    daily_limit || 3,
    monsters ? JSON.stringify(monsters) : '[]',
    first_clear_rewards ? JSON.stringify(first_clear_rewards) : null,
    clear_rewards ? JSON.stringify(clear_rewards) : null,
    icon || null, sort_order || 0
  );
  const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    message: '副本创建成功',
    dungeon: {
      ...dungeon,
      monsters: dungeon.monsters ? JSON.parse(dungeon.monsters) : [],
      firstClearRewards: dungeon.first_clear_rewards ? JSON.parse(dungeon.first_clear_rewards) : null,
      clearRewards: dungeon.clear_rewards ? JSON.parse(dungeon.clear_rewards) : null
    }
  });
});

router.put('/dungeons/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, level_req, realm_req, daily_limit, monsters, first_clear_rewards, clear_rewards, icon, sort_order } = req.body;
  const existing = db.prepare('SELECT id FROM dungeons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '副本不存在' });

  db.prepare(`
    UPDATE dungeons SET name = ?, description = ?, level_req = ?, realm_req = ?, daily_limit = ?, monsters = ?, first_clear_rewards = ?, clear_rewards = ?, icon = ?, sort_order = ?
    WHERE id = ?
  `).run(
    name, description || null, level_req || 1, realm_req || null,
    daily_limit || 3,
    monsters ? JSON.stringify(monsters) : '[]',
    first_clear_rewards ? JSON.stringify(first_clear_rewards) : null,
    clear_rewards ? JSON.stringify(clear_rewards) : null,
    icon || null, sort_order || 0, id
  );
  const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(id);
  res.json({
    message: '副本更新成功',
    dungeon: {
      ...dungeon,
      monsters: dungeon.monsters ? JSON.parse(dungeon.monsters) : [],
      firstClearRewards: dungeon.first_clear_rewards ? JSON.parse(dungeon.first_clear_rewards) : null,
      clearRewards: dungeon.clear_rewards ? JSON.parse(dungeon.clear_rewards) : null
    }
  });
});

router.delete('/dungeons/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM dungeons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '副本不存在' });
  db.prepare('DELETE FROM dungeons WHERE id = ?').run(id);
  db.prepare('DELETE FROM dungeon_records WHERE dungeon_id = ?').run(id);
  db.prepare('DELETE FROM dungeon_battles WHERE dungeon_id = ?').run(id);
  res.json({ message: '副本删除成功' });
});

router.get('/titles', adminAuth, (req, res) => {
  const titles = db.prepare('SELECT * FROM titles ORDER BY sort_order, id').all();
  const titlesWithDetails = titles.map(t => ({
    ...t,
    stats: t.stats ? JSON.parse(t.stats) : null
  }));
  res.json({ titles: titlesWithDetails });
});

router.post('/titles', adminAuth, (req, res) => {
  const { name, description, source, source_id, stats, icon, quality, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: '称号名称不能为空' });

  const result = db.prepare(`
    INSERT INTO titles (name, description, source, source_id, stats, icon, quality, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, description || null, source || 'achievement', source_id || null,
    stats ? JSON.stringify(stats) : null,
    icon || null, quality || 'common', sort_order || 0
  );
  const title = db.prepare('SELECT * FROM titles WHERE id = ?').get(result.lastInsertRowid);
  res.json({
    message: '称号创建成功',
    title: { ...title, stats: title.stats ? JSON.parse(title.stats) : null }
  });
});

router.put('/titles/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, source, source_id, stats, icon, quality, sort_order } = req.body;
  const existing = db.prepare('SELECT id FROM titles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '称号不存在' });

  db.prepare(`
    UPDATE titles SET name = ?, description = ?, source = ?, source_id = ?, stats = ?, icon = ?, quality = ?, sort_order = ?
    WHERE id = ?
  `).run(
    name, description || null, source || 'achievement', source_id || null,
    stats ? JSON.stringify(stats) : null,
    icon || null, quality || 'common', sort_order || 0, id
  );
  const title = db.prepare('SELECT * FROM titles WHERE id = ?').get(id);
  res.json({
    message: '称号更新成功',
    title: { ...title, stats: title.stats ? JSON.parse(title.stats) : null }
  });
});

router.delete('/titles/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM titles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '称号不存在' });
  db.prepare('DELETE FROM titles WHERE id = ?').run(id);
  db.prepare('DELETE FROM character_titles WHERE title_id = ?').run(id);
  res.json({ message: '称号删除成功' });
});

router.get('/stats', adminAuth, (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const characterCount = db.prepare('SELECT COUNT(*) as count FROM characters').get().count;
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get().count;
  const skillCount = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;
  const dungeonCount = db.prepare('SELECT COUNT(*) as count FROM dungeons').get().count;
  const titleCount = db.prepare('SELECT COUNT(*) as count FROM titles').get().count;

  res.json({
    stats: {
      userCount,
      characterCount,
      itemCount,
      achievementCount,
      skillCount,
      dungeonCount,
      titleCount
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
