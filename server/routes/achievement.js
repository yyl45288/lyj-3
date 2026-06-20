const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getRealmIndex, getItemById, TITLE_STATS_MAP, getTitleStats } = require('../gameData');

const router = express.Router();

const ACHIEVEMENT_TYPE_MAP = {
  cultivate: { name: '修炼', icon: '🌱' },
  combat: { name: '战斗', icon: '⚔️' },
  realm: { name: '境界', icon: '🌟' },
  gold: { name: '财富', icon: '💰' },
  sign_in: { name: '签到', icon: '📅' },
  consecutive_sign_in: { name: '连续签到', icon: '📆' },
  pet_catch: { name: '宠物', icon: '🐾' },
  quest_complete: { name: '任务', icon: '📜' }
};

router.get('/', auth, (req, res) => {
  try {
    const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
    if (!character) {
      return res.status(404).json({ error: '角色不存在' });
    }

    try {
      syncAchievementsWithExistingData(character.id);
    } catch (syncErr) {
      console.error('同步成就数据失败:', syncErr);
    }

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

    const types = [...new Set(achievements.map(a => a.type))].map(type => ({
      type,
      name: ACHIEVEMENT_TYPE_MAP[type]?.name || type,
      icon: ACHIEVEMENT_TYPE_MAP[type]?.icon || '🏆',
      total: achievements.filter(a => a.type === type).length,
      completed: achievementsWithProgress.filter(a => a.type === type && a.completed).length
    }));

    res.json({
      achievements: achievementsWithProgress,
      stats: {
        total: achievements.length,
        completed: completedCount,
        claimed: claimedCount
      },
      claimedTitles,
      types
    });
  } catch (err) {
    console.error('获取成就列表失败:', err);
    res.status(500).json({ error: '获取成就列表失败' });
  }
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
  try {
    const { achievementId } = req.params;
    const achId = parseInt(achievementId, 10);
    if (isNaN(achId)) {
      return res.status(400).json({ error: '无效的成就ID' });
    }

    const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
    if (!character) {
      return res.status(404).json({ error: '角色不存在' });
    }

    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achId);
    if (!achievement) {
      return res.status(404).json({ error: '成就不存在' });
    }

    const charAchievement = db.prepare(
      'SELECT * FROM character_achievements WHERE character_id = ? AND achievement_id = ?'
    ).get(character.id, achId);

    if (!charAchievement || charAchievement.completed !== 1) {
      return res.status(400).json({ error: '成就尚未完成' });
    }

    if (charAchievement.claimed === 1) {
      return res.status(400).json({ error: '奖励已领取' });
    }

    let rewards = {};
    try {
      rewards = achievement.rewards ? JSON.parse(achievement.rewards) : {};
    } catch (parseErr) {
      console.error('解析成就奖励失败:', parseErr);
      rewards = {};
    }

    const transaction = db.transaction(() => {
      let newGold = character.gold;
      let newExp = character.exp;
      let newLevel = character.level;
      let newMaxHp = character.max_hp;
      let newMaxMp = character.max_mp;
      let newHp = character.hp;
      let newMp = character.mp;

      if (rewards.gold && typeof rewards.gold === 'number') {
        newGold += rewards.gold;
      }
      if (newGold < 0) newGold = 0;

      if (rewards.exp && typeof rewards.exp === 'number') {
        newExp += rewards.exp;
        while (newExp >= newLevel * 100) {
          const expForLevel = newLevel * 100;
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

      if (rewards.items && Array.isArray(rewards.items) && rewards.items.length > 0) {
        for (const itemReward of rewards.items) {
          try {
            const item = getItemById(itemReward.itemId);
            if (item) {
              const existing = db.prepare(`
                SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0
              `).get(character.id, itemReward.itemId);

              if (existing) {
                db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
                  .run(itemReward.quantity || 1, existing.id);
              } else {
                db.prepare(`
                  INSERT INTO inventory (character_id, item_id, quantity, equipped, slot)
                  VALUES (?, ?, ?, 0, NULL)
                `).run(character.id, itemReward.itemId, itemReward.quantity || 1);
              }
            }
          } catch (itemErr) {
            console.error('发放成就物品奖励失败:', itemErr);
          }
        }
      }

      db.prepare(`
        UPDATE character_achievements SET claimed = 1, claimed_at = datetime('now')
        WHERE id = ?
      `).run(charAchievement.id);

      if (achievement.title && achievement.title.trim() !== '') {
        try {
          const titleName = achievement.title.trim();
          let title = db.prepare('SELECT * FROM titles WHERE name = ?').get(titleName);
          if (!title) {
            const stats = TITLE_STATS_MAP[titleName] || {};
            const r = db.prepare(`
              INSERT INTO titles (name, description, source, source_id, stats, icon, quality, sort_order)
              VALUES (?, ?, 'achievement', ?, ?, ?, 'common', ?)
            `).run(
              titleName,
              `完成成就「${achievement.name}」获得`,
              achievement.id,
              JSON.stringify(stats),
              achievement.icon || '🏆',
              achievement.sort_order || 0
            );
            title = { id: r.lastInsertRowid };
          }
          const existingCharTitle = db.prepare(
            'SELECT * FROM character_titles WHERE character_id = ? AND title_id = ?'
          ).get(character.id, title.id);
          if (!existingCharTitle) {
            db.prepare(`
              INSERT INTO character_titles (character_id, title_id, equipped)
              VALUES (?, ?, 0)
            `).run(character.id, title.id);
          }
        } catch (titleErr) {
          console.error('发放成就称号失败:', titleErr);
        }
      }
    });

    transaction();
    const grantedTitle = achievement.title ? { name: achievement.title } : null;
    res.json({
      message: grantedTitle
        ? `领取成就「${achievement.name}」奖励成功！获得称号「${grantedTitle.name}」！`
        : `领取成就「${achievement.name}」奖励成功！`,
      rewards,
      title: grantedTitle
    });
  } catch (err) {
    console.error('领取成就奖励失败:', err);
    res.status(500).json({ error: '领取奖励失败，请稍后重试' });
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
