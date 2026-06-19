const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getRealmIndex, getItemById } = require('../gameData');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  syncAchievementsWithExistingData(character.id);

  const achievements = db.prepare('SELECT * FROM achievements ORDER BY sort_order, id').all();

  const characterAchievements = db.prepare(
    'SELECT * FROM character_achievements WHERE character_id = ?'
  ).all(character.id);

  const achievementMap = {};
  for (const ca of characterAchievements) {
    achievementMap[ca.achievement_id] = ca;
  }

  const achievementsWithProgress = achievements.map(ach => {
    const progress = achievementMap[ach.id];
    return {
      ...ach,
      rewards: ach.rewards ? JSON.parse(ach.rewards) : null,
      progress: progress ? progress.progress : 0,
      completed: progress ? progress.completed === 1 : false,
      claimed: progress ? progress.claimed === 1 : false,
      completedAt: progress ? progress.completed_at : null,
      claimedAt: progress ? progress.claimed_at : null
    };
  });

  const completedCount = achievementsWithProgress.filter(a => a.completed).length;
  const claimedCount = achievementsWithProgress.filter(a => a.claimed).length;

  const claimedTitles = achievementsWithProgress
    .filter(a => a.claimed && a.title)
    .map(a => a.title);

  res.json({
    achievements: achievementsWithProgress,
    stats: {
      total: achievements.length,
      completed: completedCount,
      claimed: claimedCount
    },
    claimedTitles
  });
});

function syncAchievementsWithExistingData(characterId) {
  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
  if (!character) return;

  const cultivateCount = character.cultivate_count || 0;
  if (cultivateCount > 0) {
    const achList = db.prepare("SELECT * FROM achievements WHERE type = 'cultivate'").all();
    for (const ach of achList) {
      syncSingleAchievement(characterId, ach.id, cultivateCount, ach.target_value);
    }
  }

  const combatStats = db.prepare(`
    SELECT COUNT(*) as count FROM battle_logs 
    WHERE character_id = ? AND result = 'victory'
  `).get(characterId);
  if (combatStats && combatStats.count > 0) {
    const achList = db.prepare("SELECT * FROM achievements WHERE type = 'combat'").all();
    for (const ach of achList) {
      syncSingleAchievement(characterId, ach.id, combatStats.count, ach.target_value);
    }
  }

  const realmIndex = getRealmIndex(character.realm) + 1;
  if (realmIndex > 0) {
    const achList = db.prepare("SELECT * FROM achievements WHERE type = 'realm'").all();
    for (const ach of achList) {
      syncSingleAchievement(characterId, ach.id, realmIndex, ach.target_value);
    }
  }

  if (character.gold > 0) {
    const achList = db.prepare("SELECT * FROM achievements WHERE type = 'gold'").all();
    for (const ach of achList) {
      syncSingleAchievement(characterId, ach.id, character.gold, ach.target_value);
    }
  }

  const petCount = db.prepare('SELECT COUNT(*) as count FROM pets WHERE character_id = ?').get(characterId).count;
  if (petCount > 0) {
    const achList = db.prepare("SELECT * FROM achievements WHERE type = 'pet_catch'").all();
    for (const ach of achList) {
      syncSingleAchievement(characterId, ach.id, petCount, ach.target_value);
    }
  }

  const questCompleteCount = db.prepare(`
    SELECT COUNT(*) as count FROM character_quests 
    WHERE character_id = ? AND status = 'completed'
  `).get(characterId).count;
  if (questCompleteCount > 0) {
    const achList = db.prepare("SELECT * FROM achievements WHERE type = 'quest_complete'").all();
    for (const ach of achList) {
      syncSingleAchievement(characterId, ach.id, questCompleteCount, ach.target_value);
    }
  }

  const signInCount = db.prepare('SELECT COUNT(*) as count FROM sign_in_records WHERE character_id = ?').get(characterId).count;
  if (signInCount > 0) {
    const achList = db.prepare("SELECT * FROM achievements WHERE type = 'sign_in'").all();
    for (const ach of achList) {
      syncSingleAchievement(characterId, ach.id, signInCount, ach.target_value);
    }
  }
}

function syncSingleAchievement(characterId, achievementId, actualValue, targetValue) {
  let charAch = db.prepare(
    'SELECT * FROM character_achievements WHERE character_id = ? AND achievement_id = ?'
  ).get(characterId, achievementId);

  if (!charAch) {
    const result = db.prepare(`
      INSERT INTO character_achievements (character_id, achievement_id, progress, completed)
      VALUES (?, ?, 0, 0)
    `).run(characterId, achievementId);
    charAch = { id: result.lastInsertRowid, progress: 0, completed: 0 };
  }

  if (charAch.completed === 1) return;

  const newProgress = Math.min(actualValue, targetValue);
  if (newProgress > charAch.progress) {
    const isCompleted = newProgress >= targetValue;
    if (isCompleted) {
      db.prepare(`
        UPDATE character_achievements
        SET progress = ?, completed = 1, completed_at = datetime('now')
        WHERE id = ?
      `).run(newProgress, charAch.id);
    } else {
      db.prepare('UPDATE character_achievements SET progress = ? WHERE id = ?')
        .run(newProgress, charAch.id);
    }
  }
}

router.post('/claim/:achievementId', auth, (req, res) => {
  const { achievementId } = req.params;

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
  if (!achievement) {
    return res.status(404).json({ error: '成就不存在' });
  }

  const charAchievement = db.prepare(
    'SELECT * FROM character_achievements WHERE character_id = ? AND achievement_id = ?'
  ).get(character.id, achievementId);

  if (!charAchievement || charAchievement.completed !== 1) {
    return res.status(400).json({ error: '成就尚未完成' });
  }

  if (charAchievement.claimed === 1) {
    return res.status(400).json({ error: '奖励已领取' });
  }

  const rewards = achievement.rewards ? JSON.parse(achievement.rewards) : {};

  const transaction = db.transaction(() => {
    let newGold = character.gold;
    let newExp = character.exp;
    let newLevel = character.level;
    let newMaxHp = character.max_hp;
    let newMaxMp = character.max_mp;
    let newHp = character.hp;
    let newMp = character.mp;

    if (rewards.gold) {
      newGold += rewards.gold;
    }

    if (rewards.exp) {
      newExp += rewards.exp;
      const expForLevel = newLevel * 100;
      if (newExp >= expForLevel) {
        newLevel += 1;
        newMaxHp += 10;
        newMaxMp += 5;
        newHp = newMaxHp;
        newMp = newMaxMp;
        newExp = newExp - expForLevel;
      }
    }

    db.prepare(`
      UPDATE characters SET gold = ?, exp = ?, level = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?
      WHERE id = ?
    `).run(newGold, newExp, newLevel, newMaxHp, newMaxMp, newHp, newMp, character.id);

    if (rewards.items && rewards.items.length > 0) {
      for (const itemReward of rewards.items) {
        const item = getItemById(itemReward.itemId);
        if (item) {
          const existing = db.prepare(`
            SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0
          `).get(character.id, itemReward.itemId);

          if (existing) {
            db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
              .run(itemReward.quantity, existing.id);
          } else {
            db.prepare(`
              INSERT INTO inventory (character_id, item_id, quantity, equipped, slot)
              VALUES (?, ?, ?, 0, NULL)
            `).run(character.id, itemReward.itemId, itemReward.quantity);
          }
        }
      }
    }

    db.prepare(`
      UPDATE character_achievements SET claimed = 1, claimed_at = datetime('now')
      WHERE id = ?
    `).run(charAchievement.id);
  });

  try {
    transaction();
    res.json({
      message: `领取成就「${achievement.name}」奖励成功！`,
      rewards,
      title: achievement.title
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '领取奖励失败' });
  }
});

function updateAchievementProgress(characterId, achievementType, amount = 1) {
  const achievements = db.prepare(
    'SELECT * FROM achievements WHERE type = ?'
  ).all(achievementType);

  if (achievements.length === 0) return;

  for (const achievement of achievements) {
    let charAch = db.prepare(
      'SELECT * FROM character_achievements WHERE character_id = ? AND achievement_id = ?'
    ).get(characterId, achievement.id);

    if (!charAch) {
      const result = db.prepare(`
        INSERT INTO character_achievements (character_id, achievement_id, progress, completed)
        VALUES (?, ?, 0, 0)
      `).run(characterId, achievement.id);
      charAch = { id: result.lastInsertRowid, progress: 0, completed: 0 };
    }

    if (charAch.completed === 1) continue;

    const newProgress = Math.min(charAch.progress + amount, achievement.target_value);
    const isCompleted = newProgress >= achievement.target_value;

    if (isCompleted) {
      db.prepare(`
        UPDATE character_achievements
        SET progress = ?, completed = 1, completed_at = datetime('now')
        WHERE id = ?
      `).run(newProgress, charAch.id);
    } else {
      db.prepare('UPDATE character_achievements SET progress = ? WHERE id = ?')
        .run(newProgress, charAch.id);
    }
  }
}

function updateRealmAchievement(characterId, realmName) {
  const realmIndex = getRealmIndex(realmName) + 1;
  if (realmIndex <= 0) return;

  const achievements = db.prepare("SELECT * FROM achievements WHERE type = 'realm'").all();

  for (const achievement of achievements) {
    let charAch = db.prepare(
      'SELECT * FROM character_achievements WHERE character_id = ? AND achievement_id = ?'
    ).get(characterId, achievement.id);

    if (!charAch) {
      const result = db.prepare(`
        INSERT INTO character_achievements (character_id, achievement_id, progress, completed)
        VALUES (?, ?, 0, 0)
      `).run(characterId, achievement.id);
      charAch = { id: result.lastInsertRowid, progress: 0, completed: 0 };
    }

    if (charAch.completed === 1) continue;

    if (realmIndex >= achievement.target_value) {
      db.prepare(`
        UPDATE character_achievements
        SET progress = ?, completed = 1, completed_at = datetime('now')
        WHERE id = ?
      `).run(achievement.target_value, charAch.id);
    }
  }
}

function updateGoldAchievement(characterId, totalGold) {
  const achievements = db.prepare("SELECT * FROM achievements WHERE type = 'gold'").all();

  for (const achievement of achievements) {
    let charAch = db.prepare(
      'SELECT * FROM character_achievements WHERE character_id = ? AND achievement_id = ?'
    ).get(characterId, achievement.id);

    if (!charAch) {
      const result = db.prepare(`
        INSERT INTO character_achievements (character_id, achievement_id, progress, completed)
        VALUES (?, ?, 0, 0)
      `).run(characterId, achievement.id);
      charAch = { id: result.lastInsertRowid, progress: 0, completed: 0 };
    }

    if (charAch.completed === 1) continue;

    const newProgress = Math.min(totalGold, achievement.target_value);
    if (newProgress >= achievement.target_value) {
      db.prepare(`
        UPDATE character_achievements
        SET progress = ?, completed = 1, completed_at = datetime('now')
        WHERE id = ?
      `).run(achievement.target_value, charAch.id);
    } else if (newProgress > charAch.progress) {
      db.prepare('UPDATE character_achievements SET progress = ? WHERE id = ?')
        .run(newProgress, charAch.id);
    }
  }
}

module.exports = router;
module.exports.updateAchievementProgress = updateAchievementProgress;
module.exports.updateRealmAchievement = updateRealmAchievement;
module.exports.updateGoldAchievement = updateGoldAchievement;
