const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getRealmIndex } = require('../gameData');
const { updateAchievementProgress } = require('./achievement');

const router = express.Router();

function getAfkConfig() {
  const configs = db.prepare('SELECT config_key, config_value FROM afk_config').all();
  const result = {};
  for (const c of configs) {
    result[c.config_key] = parseFloat(c.config_value);
  }
  return result;
}

function calculateAfkRewards(character, offlineSeconds) {
  const config = getAfkConfig();
  const realmIndex = getRealmIndex(character.realm);
  
  const levelBonus = 1 + (character.level - 1) * config.level_multiplier;
  const realmBonus = 1 + realmIndex * config.realm_multiplier;
  
  const minutes = offlineSeconds / 60;
  const maxMinutes = config.max_offline_hours * 60;
  const effectiveMinutes = Math.min(minutes, maxMinutes);
  
  const baseExp = config.exp_per_minute * effectiveMinutes;
  const baseGold = config.gold_per_minute * effectiveMinutes;
  
  const totalExp = Math.floor(baseExp * levelBonus * realmBonus);
  const totalGold = Math.floor(baseGold * levelBonus * realmBonus);
  
  return {
    exp: totalExp,
    gold: totalGold,
    offlineMinutes: Math.floor(minutes),
    effectiveMinutes: Math.floor(effectiveMinutes),
    capped: minutes > maxMinutes,
    maxMinutes: Math.floor(maxMinutes)
  };
}

router.get('/status', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  let afkStatus = db.prepare('SELECT * FROM character_afk WHERE character_id = ?').get(character.id);
  
  if (!afkStatus) {
    db.prepare('INSERT INTO character_afk (character_id) VALUES (?)').run(character.id);
    afkStatus = db.prepare('SELECT * FROM character_afk WHERE character_id = ?').get(character.id);
  }

  const config = getAfkConfig();
  let pendingRewards = { exp: 0, gold: 0, offlineMinutes: 0, effectiveMinutes: 0, capped: false, maxMinutes: 0 };
  
  if (afkStatus.is_active) {
    const now = Date.now();
    const startTime = new Date(afkStatus.start_time).getTime();
    const offlineSeconds = (now - startTime) / 1000;
    pendingRewards = calculateAfkRewards(character, offlineSeconds);
  } else if (afkStatus.pending_exp > 0 || afkStatus.pending_gold > 0) {
    pendingRewards = {
      exp: afkStatus.pending_exp,
      gold: afkStatus.pending_gold,
      offlineMinutes: 0,
      effectiveMinutes: 0,
      capped: false,
      maxMinutes: Math.floor(config.max_offline_hours * 60)
    };
  }

  res.json({
    isActive: afkStatus.is_active === 1,
    startTime: afkStatus.start_time,
    lastCollectTime: afkStatus.last_collect_time,
    totalOfflineSeconds: afkStatus.total_offline_seconds,
    pendingExp: afkStatus.pending_exp,
    pendingGold: afkStatus.pending_gold,
    pendingRewards,
    config: {
      expPerMinute: config.exp_per_minute,
      goldPerMinute: config.gold_per_minute,
      maxOfflineHours: config.max_offline_hours,
      levelMultiplier: config.level_multiplier,
      realmMultiplier: config.realm_multiplier,
      minCollectMinutes: config.min_collect_minutes
    }
  });
});

router.post('/start', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const existing = db.prepare('SELECT * FROM character_afk WHERE character_id = ?').get(character.id);
  
  if (existing && existing.is_active === 1) {
    return res.status(400).json({ error: '已经在挂机修炼中' });
  }

  const now = new Date().toISOString();
  
  if (existing) {
    db.prepare(`
      UPDATE character_afk 
      SET is_active = 1, start_time = ?, pending_exp = 0, pending_gold = 0 
      WHERE character_id = ?
    `).run(now, character.id);
  } else {
    db.prepare(`
      INSERT INTO character_afk (character_id, is_active, start_time)
      VALUES (?, 1, ?)
    `).run(character.id, now);
  }

  res.json({
    message: '开始挂机修炼',
    startTime: now
  });
});

router.post('/stop', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const afkStatus = db.prepare('SELECT * FROM character_afk WHERE character_id = ?').get(character.id);
  
  if (!afkStatus || afkStatus.is_active === 0) {
    return res.status(400).json({ error: '当前没有在挂机修炼' });
  }

  const now = Date.now();
  const startTime = new Date(afkStatus.start_time).getTime();
  const offlineSeconds = (now - startTime) / 1000;
  
  const rewards = calculateAfkRewards(character, offlineSeconds);
  const nowStr = new Date().toISOString();
  
  const totalSeconds = afkStatus.total_offline_seconds + offlineSeconds;
  
  db.prepare(`
    UPDATE character_afk 
    SET is_active = 0, start_time = NULL, pending_exp = ?, pending_gold = ?, 
        total_offline_seconds = ?, last_collect_time = ?
    WHERE character_id = ?
  `).run(rewards.exp, rewards.gold, totalSeconds, nowStr, character.id);

  res.json({
    message: '已停止挂机修炼，收益已存入待领取',
    pendingExp: rewards.exp,
    pendingGold: rewards.gold,
    offlineSeconds: Math.floor(offlineSeconds),
    rewards
  });
});

router.post('/collect', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const afkStatus = db.prepare('SELECT * FROM character_afk WHERE character_id = ?').get(character.id);
  
  if (!afkStatus) {
    return res.status(400).json({ error: '没有挂机记录' });
  }

  let expToAdd = afkStatus.pending_exp;
  let goldToAdd = afkStatus.pending_gold;

  if (afkStatus.is_active === 1) {
    const now = Date.now();
    const startTime = new Date(afkStatus.start_time).getTime();
    const offlineSeconds = (now - startTime) / 1000;
    
    const config = getAfkConfig();
    const minSeconds = config.min_collect_minutes * 60;
    
    if (offlineSeconds < minSeconds) {
      return res.status(400).json({ 
        error: `挂机时间不足${config.min_collect_minutes}分钟，暂时无法领取` 
      });
    }
    
    const rewards = calculateAfkRewards(character, offlineSeconds);
    expToAdd = rewards.exp;
    goldToAdd = rewards.gold;
    
    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE character_afk 
      SET start_time = ?, last_collect_time = ?, pending_exp = 0, pending_gold = 0,
          total_offline_seconds = total_offline_seconds + ?
      WHERE character_id = ?
    `).run(nowStr, nowStr, Math.floor(offlineSeconds), character.id);
  } else {
    if (expToAdd === 0 && goldToAdd === 0) {
      return res.status(400).json({ error: '没有待领取的收益' });
    }
    
    db.prepare(`
      UPDATE character_afk 
      SET pending_exp = 0, pending_gold = 0, last_collect_time = ?
      WHERE character_id = ?
    `).run(new Date().toISOString(), character.id);
  }

  const realmIndex = getRealmIndex(character.realm);
  const nextRealm = getRealmIndex(character.realm) >= 0 ? 
    require('../gameData').REALMS[realmIndex + 1] : null;
  const maxLevel = nextRealm ? nextRealm.levelReq : 999;

  let newExp = character.exp + expToAdd;
  let newLevel = character.level;
  let newMaxHp = character.max_hp;
  let newMaxMp = character.max_mp;
  let newHp = character.hp;
  let newMp = character.mp;
  let leveledUp = false;
  let overflowExp = 0;

  const expForLevel = newLevel * 100;
  if (newExp >= expForLevel && newLevel < maxLevel) {
    newLevel += 1;
    newMaxHp += 10;
    newMaxMp += 5;
    newHp = newMaxHp;
    newMp = newMaxMp;
    leveledUp = true;
    newExp = newExp - expForLevel;
  } else if (newExp >= expForLevel && newLevel >= maxLevel) {
    overflowExp = newExp - expForLevel + 1;
    newExp = expForLevel - 1;
  }

  const newGold = character.gold + goldToAdd;

  db.prepare(`
    UPDATE characters 
    SET exp = ?, level = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?, gold = ?
    WHERE id = ?
  `).run(newExp, newLevel, newMaxHp, newMaxMp, newHp, newMp, newGold, character.id);

  updateAchievementProgress(character.id, 'cultivate', Math.floor(expToAdd / 10));
  const { updateGoldAchievement } = require('./achievement');
  if (updateGoldAchievement) {
    updateGoldAchievement(character.id, goldToAdd);
  }

  let canTribulate = false;
  if (nextRealm && newLevel >= nextRealm.levelReq) {
    canTribulate = true;
  }

  let message = `领取成功！获得${expToAdd}点经验，${goldToAdd}金币`;
  if (leveledUp) {
    message = `领取成功！获得${expToAdd}点经验，${goldToAdd}金币，等级提升至${newLevel}级！`;
  } else if (overflowExp > 0) {
    message = `领取成功！获得${expToAdd}点经验，${goldToAdd}金币（溢出${overflowExp}点经验，请渡天劫突破境界）`;
  }

  res.json({
    message,
    expGained: expToAdd,
    goldGained: goldToAdd,
    newExp,
    newLevel,
    newGold,
    leveledUp,
    overflowExp,
    canTribulate
  });
});

module.exports = router;
