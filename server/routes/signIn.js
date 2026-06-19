const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getItemById } = require('../gameData');
const { updateAchievementProgress } = require('./achievement');

const router = express.Router();

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

function getConsecutiveDays(characterId) {
  const records = db.prepare(`
    SELECT sign_date FROM sign_in_records
    WHERE character_id = ? AND is_makeup = 0
    ORDER BY sign_date DESC
  `).all(characterId);

  if (records.length === 0) return 0;

  let consecutive = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const today = getTodayDate();
  const hasToday = records.some(r => r.sign_date === today);

  if (!hasToday) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (let i = 0; i < records.length; i++) {
    const recordDate = new Date(records[i].sign_date);
    recordDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));

    if (diffDays === consecutive) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}

function getTotalSignInDays(characterId) {
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM sign_in_records WHERE character_id = ?
  `).get(characterId);
  return count.count;
}

router.get('/info', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const today = getTodayDate();
  const todayRecord = db.prepare(
    'SELECT * FROM sign_in_records WHERE character_id = ? AND sign_date = ?'
  ).get(character.id, today);

  const hasSignedToday = !!todayRecord;
  const isMakeup = todayRecord ? todayRecord.is_makeup === 1 : false;

  const consecutiveDays = getConsecutiveDays(character.id);
  const totalDays = getTotalSignInDays(character.id);

  const dailyReward = db.prepare(
    "SELECT * FROM sign_in_rewards WHERE day_type = 'daily' ORDER BY sort_order LIMIT 1"
  ).get();

  const consecutiveRewards = db.prepare(
    "SELECT * FROM sign_in_rewards WHERE day_type = 'consecutive' ORDER BY day_number"
  ).all();

  const consecutiveRewardsWithDetails = consecutiveRewards.map(r => ({
    ...r,
    rewards: r.rewards ? JSON.parse(r.rewards) : null,
    achieved: consecutiveDays >= r.day_number,
    canClaim: false
  }));

  const lastMonthRecords = db.prepare(`
    SELECT sign_date, is_makeup FROM sign_in_records
    WHERE character_id = ? AND sign_date >= date('now', '-30 days')
    ORDER BY sign_date
  `).all(character.id);

  const makeupCost = 100;

  res.json({
    todaySigned: hasSignedToday,
    isMakeup,
    consecutiveDays,
    totalDays,
    dailyReward: dailyReward ? {
      ...dailyReward,
      rewards: dailyReward.rewards ? JSON.parse(dailyReward.rewards) : null
    } : null,
    consecutiveRewards: consecutiveRewardsWithDetails,
    signInRecords: lastMonthRecords,
    makeupCost
  });
});

router.post('/sign', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const today = getTodayDate();
  const existing = db.prepare(
    'SELECT * FROM sign_in_records WHERE character_id = ? AND sign_date = ?'
  ).get(character.id, today);

  if (existing) {
    return res.status(400).json({ error: '今日已签到' });
  }

  const dailyRewardRow = db.prepare(
    "SELECT * FROM sign_in_rewards WHERE day_type = 'daily' ORDER BY sort_order LIMIT 1"
  ).get();

  const dailyRewards = dailyRewardRow && dailyRewardRow.rewards
    ? JSON.parse(dailyRewardRow.rewards)
    : {};

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO sign_in_records (character_id, sign_date, is_makeup)
      VALUES (?, ?, 0)
    `).run(character.id, today);

    let newGold = character.gold;
    let newExp = character.exp;
    let newLevel = character.level;
    let newMaxHp = character.max_hp;
    let newMaxMp = character.max_mp;
    let newHp = character.hp;
    let newMp = character.mp;

    if (dailyRewards.gold) {
      newGold += dailyRewards.gold;
    }

    if (dailyRewards.exp) {
      newExp += dailyRewards.exp;
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

    if (dailyRewards.items && dailyRewards.items.length > 0) {
      for (const itemReward of dailyRewards.items) {
        const item = getItemById(itemReward.itemId);
        if (item) {
          const existingItem = db.prepare(`
            SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0
          `).get(character.id, itemReward.itemId);

          if (existingItem) {
            db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
              .run(itemReward.quantity, existingItem.id);
          } else {
            db.prepare(`
              INSERT INTO inventory (character_id, item_id, quantity, equipped, slot)
              VALUES (?, ?, ?, 0, NULL)
            `).run(character.id, itemReward.itemId, itemReward.quantity);
          }
        }
      }
    }
  });

  try {
    transaction();

    const newConsecutiveDays = getConsecutiveDays(character.id);
    const totalDays = getTotalSignInDays(character.id);

    updateAchievementProgress(character.id, 'sign_in', 1);
    updateAchievementProgress(character.id, 'consecutive_sign_in', newConsecutiveDays);

    const bonusRewards = [];
    const consecutiveRewards = db.prepare(
      "SELECT * FROM sign_in_rewards WHERE day_type = 'consecutive' ORDER BY day_number"
    ).all();

    for (const reward of consecutiveRewards) {
      if (newConsecutiveDays === reward.day_number) {
        const rewardData = reward.rewards ? JSON.parse(reward.rewards) : {};
        bonusRewards.push({
          dayNumber: reward.day_number,
          rewards: rewardData
        });

        const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
        let gold = char.gold;
        let exp = char.exp;
        let level = char.level;
        let maxHp = char.max_hp;
        let maxMp = char.max_mp;
        let hp = char.hp;
        let mp = char.mp;

        if (rewardData.gold) gold += rewardData.gold;
        if (rewardData.exp) {
          exp += rewardData.exp;
          const expForLevel = level * 100;
          if (exp >= expForLevel) {
            level += 1;
            maxHp += 10;
            maxMp += 5;
            hp = maxHp;
            mp = maxMp;
            exp = exp - expForLevel;
          }
        }

        db.prepare(`
          UPDATE characters SET gold = ?, exp = ?, level = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?
          WHERE id = ?
        `).run(gold, exp, level, maxHp, maxMp, hp, mp, character.id);

        if (rewardData.items && rewardData.items.length > 0) {
          for (const itemReward of rewardData.items) {
            const item = getItemById(itemReward.itemId);
            if (item) {
              const existingItem = db.prepare(`
                SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0
              `).get(character.id, itemReward.itemId);

              if (existingItem) {
                db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
                  .run(itemReward.quantity, existingItem.id);
              } else {
                db.prepare(`
                  INSERT INTO inventory (character_id, item_id, quantity, equipped, slot)
                  VALUES (?, ?, ?, 0, NULL)
                `).run(character.id, itemReward.itemId, itemReward.quantity);
              }
            }
          }
        }
      }
    }

    res.json({
      message: '签到成功！',
      dailyRewards,
      bonusRewards,
      consecutiveDays: newConsecutiveDays,
      totalDays
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '签到失败' });
  }
});

router.post('/makeup', auth, (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: '请指定补签日期' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate >= today) {
    return res.status(400).json({ error: '不能补签今天或未来的日期' });
  }

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (targetDate < thirtyDaysAgo) {
    return res.status(400).json({ error: '只能补签30天内的日期' });
  }

  const existing = db.prepare(
    'SELECT * FROM sign_in_records WHERE character_id = ? AND sign_date = ?'
  ).get(character.id, date);

  if (existing) {
    return res.status(400).json({ error: '该日期已签到' });
  }

  const makeupCost = 100;
  if (character.gold < makeupCost) {
    return res.status(400).json({ error: `金币不足，补签需要${makeupCost}金币` });
  }

  const dailyRewardRow = db.prepare(
    "SELECT * FROM sign_in_rewards WHERE day_type = 'daily' ORDER BY sort_order LIMIT 1"
  ).get();

  const dailyRewards = dailyRewardRow && dailyRewardRow.rewards
    ? JSON.parse(dailyRewardRow.rewards)
    : {};

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO sign_in_records (character_id, sign_date, is_makeup)
      VALUES (?, ?, 1)
    `).run(character.id, date);

    let newGold = character.gold - makeupCost;
    let newExp = character.exp;
    let newLevel = character.level;
    let newMaxHp = character.max_hp;
    let newMaxMp = character.max_mp;
    let newHp = character.hp;
    let newMp = character.mp;

    if (dailyRewards.gold) {
      newGold += dailyRewards.gold;
    }

    if (dailyRewards.exp) {
      newExp += dailyRewards.exp;
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

    if (dailyRewards.items && dailyRewards.items.length > 0) {
      for (const itemReward of dailyRewards.items) {
        const item = getItemById(itemReward.itemId);
        if (item) {
          const existingItem = db.prepare(`
            SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0
          `).get(character.id, itemReward.itemId);

          if (existingItem) {
            db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
              .run(itemReward.quantity, existingItem.id);
          } else {
            db.prepare(`
              INSERT INTO inventory (character_id, item_id, quantity, equipped, slot)
              VALUES (?, ?, ?, 0, NULL)
            `).run(character.id, itemReward.itemId, itemReward.quantity);
          }
        }
      }
    }
  });

  try {
    transaction();

    const totalDays = getTotalSignInDays(character.id);
    updateAchievementProgress(character.id, 'sign_in', 1);

    res.json({
      message: `补签成功！消耗${makeupCost}金币`,
      dailyRewards,
      makeupCost,
      totalDays
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '补签失败' });
  }
});

module.exports = router;
