const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { TITLE_STATS_MAP, getTitleStats } = require('../gameData');

const router = express.Router();

function syncAllPredefinedTitles() {
  const achievementTitles = db.prepare(`
    SELECT a.* FROM achievements a
    WHERE a.title IS NOT NULL AND a.title != ''
  `).all();

  for (const ach of achievementTitles) {
    const titleName = ach.title;
    const existing = db.prepare('SELECT * FROM titles WHERE name = ?').get(titleName);
    if (!existing) {
      const stats = TITLE_STATS_MAP[titleName] || {};
      db.prepare(`
        INSERT INTO titles (name, description, source, source_id, stats, icon, quality, sort_order)
        VALUES (?, ?, 'achievement', ?, ?, ?, 'common', ?)
      `).run(titleName, `完成成就「${ach.name}」获得`, ach.id, JSON.stringify(stats), ach.icon || '🏆', ach.sort_order || 0);
    }
  }
}

function syncAchievementTitles(characterId) {
  syncAllPredefinedTitles();

  const completedAchievements = db.prepare(`
    SELECT a.* FROM achievements a
    JOIN character_achievements ca ON ca.achievement_id = a.id
    WHERE ca.character_id = ? AND ca.claimed = 1 AND a.title IS NOT NULL AND a.title != ''
  `).all(characterId);

  for (const ach of completedAchievements) {
    const titleName = ach.title;
    const title = db.prepare('SELECT * FROM titles WHERE name = ?').get(titleName);
    if (title) {
      const existingCharTitle = db.prepare(
        'SELECT * FROM character_titles WHERE character_id = ? AND title_id = ?'
      ).get(characterId, title.id);
      if (!existingCharTitle) {
        db.prepare(`
          INSERT INTO character_titles (character_id, title_id, equipped)
          VALUES (?, ?, 0)
        `).run(characterId, title.id);
      }
    }
  }
}

function applyTitleStats(character, titleStats) {
  const result = { ...character };
  if (!titleStats) return result;
  if (titleStats.attack) result.attack = (result.attack || 0) + titleStats.attack;
  if (titleStats.defense) result.defense = (result.defense || 0) + titleStats.defense;
  if (titleStats.speed) result.speed = (result.speed || 0) + titleStats.speed;
  if (titleStats.max_hp) {
    result.max_hp = (result.max_hp || 0) + titleStats.max_hp;
    result.maxHp = result.max_hp;
  }
  if (titleStats.max_mp) {
    result.max_mp = (result.max_mp || 0) + titleStats.max_mp;
    result.maxMp = result.max_mp;
  }
  return result;
}

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  syncAchievementTitles(character.id);

  const allTitles = db.prepare('SELECT * FROM titles ORDER BY sort_order, id').all();
  const charTitles = db.prepare(
    'SELECT * FROM character_titles WHERE character_id = ?'
  ).all(character.id);

  const charTitleMap = {};
  for (const ct of charTitles) {
    charTitleMap[ct.title_id] = ct;
  }

  const equipped = charTitles.find(ct => ct.equipped === 1);
  const equippedTitle = equipped ? allTitles.find(t => t.id === equipped.title_id) : null;

  const titlesWithDetails = allTitles.map(title => {
    const ct = charTitleMap[title.id];
    const stats = title.stats ? (typeof title.stats === 'string' ? JSON.parse(title.stats) : title.stats) : getTitleStats(title.name);
    return {
      ...title,
      stats,
      obtained: !!ct,
      equipped: ct ? ct.equipped === 1 : false,
      obtainedAt: ct ? ct.obtained_at : null
    };
  });

  res.json({
    titles: titlesWithDetails,
    equippedTitle: equippedTitle ? {
      ...equippedTitle,
      stats: equippedTitle.stats ? (typeof equippedTitle.stats === 'string' ? JSON.parse(equippedTitle.stats) : equippedTitle.stats) : getTitleStats(equippedTitle.name)
    } : null,
    stats: {
      total: allTitles.length,
      obtained: charTitles.length
    }
  });
});

router.post('/equip/:titleId', auth, (req, res) => {
  const { titleId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const charTitle = db.prepare(`
    SELECT ct.*, t.* FROM character_titles ct
    JOIN titles t ON t.id = ct.title_id
    WHERE ct.character_id = ? AND ct.title_id = ?
  `).get(character.id, titleId);

  if (!charTitle) {
    return res.status(400).json({ error: '你尚未获得该称号' });
  }

  const currentlyEquipped = db.prepare(
    'SELECT * FROM character_titles WHERE character_id = ? AND equipped = 1'
  ).get(character.id);

  const newTitleStats = charTitle.stats ? (typeof charTitle.stats === 'string' ? JSON.parse(charTitle.stats) : charTitle.stats) : getTitleStats(charTitle.name);

  const transaction = db.transaction(() => {
    let currentChar = { ...character };

    if (currentlyEquipped && currentlyEquipped.title_id !== parseInt(titleId)) {
      const oldTitle = db.prepare('SELECT * FROM titles WHERE id = ?').get(currentlyEquipped.title_id);
      if (oldTitle) {
        const oldStats = oldTitle.stats ? (typeof oldTitle.stats === 'string' ? JSON.parse(oldTitle.stats) : oldTitle.stats) : getTitleStats(oldTitle.name);
        if (oldStats.attack) currentChar.attack -= oldStats.attack;
        if (oldStats.defense) currentChar.defense -= oldStats.defense;
        if (oldStats.speed) currentChar.speed -= oldStats.speed;
        if (oldStats.max_hp) {
          currentChar.max_hp -= oldStats.max_hp;
          if (currentChar.hp > currentChar.max_hp) currentChar.hp = currentChar.max_hp;
        }
        if (oldStats.max_mp) {
          currentChar.max_mp -= oldStats.max_mp;
          if (currentChar.mp > currentChar.max_mp) currentChar.mp = currentChar.max_mp;
        }
      }
      db.prepare('UPDATE character_titles SET equipped = 0 WHERE id = ?').run(currentlyEquipped.id);
    }

    if (!currentlyEquipped || currentlyEquipped.title_id !== parseInt(titleId)) {
      if (newTitleStats.attack) currentChar.attack += newTitleStats.attack;
      if (newTitleStats.defense) currentChar.defense += newTitleStats.defense;
      if (newTitleStats.speed) currentChar.speed += newTitleStats.speed;
      if (newTitleStats.max_hp) currentChar.max_hp += newTitleStats.max_hp;
      if (newTitleStats.max_mp) currentChar.max_mp += newTitleStats.max_mp;
    }

    db.prepare('UPDATE character_titles SET equipped = 1 WHERE character_id = ? AND title_id = ?')
      .run(character.id, titleId);

    db.prepare(`
      UPDATE characters SET attack = ?, defense = ?, speed = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?
      WHERE id = ?
    `).run(
      Math.max(0, currentChar.attack),
      Math.max(0, currentChar.defense),
      Math.max(0, currentChar.speed),
      Math.max(1, currentChar.max_hp),
      Math.max(1, currentChar.max_mp),
      Math.min(currentChar.hp, currentChar.max_hp),
      Math.min(currentChar.mp, currentChar.max_mp),
      character.id
    );
  });

  try {
    transaction();
    const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
    res.json({
      message: `佩戴称号「${charTitle.name}」成功！`,
      title: {
        id: charTitle.title_id,
        name: charTitle.name,
        stats: newTitleStats
      },
      character: updatedChar
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '佩戴称号失败' });
  }
});

router.post('/unequip', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const equipped = db.prepare(
    'SELECT ct.*, t.* FROM character_titles ct JOIN titles t ON t.id = ct.title_id WHERE ct.character_id = ? AND ct.equipped = 1'
  ).get(character.id);

  if (!equipped) {
    return res.status(400).json({ error: '当前没有佩戴的称号' });
  }

  const titleStats = equipped.stats ? (typeof equipped.stats === 'string' ? JSON.parse(equipped.stats) : equipped.stats) : getTitleStats(equipped.name);

  const transaction = db.transaction(() => {
    let currentChar = { ...character };
    if (titleStats.attack) currentChar.attack -= titleStats.attack;
    if (titleStats.defense) currentChar.defense -= titleStats.defense;
    if (titleStats.speed) currentChar.speed -= titleStats.speed;
    if (titleStats.max_hp) {
      currentChar.max_hp -= titleStats.max_hp;
      if (currentChar.hp > currentChar.max_hp) currentChar.hp = currentChar.max_hp;
    }
    if (titleStats.max_mp) {
      currentChar.max_mp -= titleStats.max_mp;
      if (currentChar.mp > currentChar.max_mp) currentChar.mp = currentChar.max_mp;
    }

    db.prepare('UPDATE character_titles SET equipped = 0 WHERE id = ?').run(equipped.id);

    db.prepare(`
      UPDATE characters SET attack = ?, defense = ?, speed = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?
      WHERE id = ?
    `).run(
      Math.max(0, currentChar.attack),
      Math.max(0, currentChar.defense),
      Math.max(0, currentChar.speed),
      Math.max(1, currentChar.max_hp),
      Math.max(1, currentChar.max_mp),
      Math.min(currentChar.hp, currentChar.max_hp),
      Math.min(currentChar.mp, currentChar.max_mp),
      character.id
    );
  });

  try {
    transaction();
    const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
    res.json({
      message: `已卸下称号「${equipped.name}」`,
      character: updatedChar
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '卸下称号失败' });
  }
});

module.exports = router;
module.exports.syncAchievementTitles = syncAchievementTitles;
module.exports.applyTitleStats = applyTitleStats;
module.exports.getTitleStats = getTitleStats;
