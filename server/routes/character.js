const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { REALMS, getRealmByIndex, getRealmIndex, getItemById, ITEMS } = require('../gameData');
const { updateAchievementProgress, updateRealmAchievement, updateGoldAchievement } = require('./achievement');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const inventory = db.prepare('SELECT * FROM inventory WHERE character_id = ?').all(character.id);
  const inventoryWithDetails = inventory.map(inv => {
    const itemData = getItemById(inv.item_id);
    return { ...inv, item: itemData };
  });

  const equipped = inventoryWithDetails.filter(i => i.equipped === 1);
  const backpack = inventoryWithDetails.filter(i => i.equipped === 0);

  const realmIndex = getRealmIndex(character.realm);
  const nextRealm = getRealmByIndex(realmIndex + 1);

  res.json({
    character: {
      ...character,
      maxHp: character.max_hp,
      maxMp: character.max_mp,
      expToNext: character.level * 100,
      wisdom: character.comprehension,
      realmIndex,
      nextRealm: nextRealm ? {
        name: nextRealm.name,
        levelReq: nextRealm.levelReq,
        expReq: nextRealm.expReq
      } : null
    },
    equipment: equipped,
    inventory: backpack
  });
});

router.post('/', auth, (req, res) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: '角色名不能为空' });
  }
  if (name.length > 12) {
    return res.status(400).json({ error: '角色名不能超过12个字符' });
  }

  const existing = db.prepare('SELECT id FROM characters WHERE user_id = ?').get(req.user.id);
  if (existing) {
    return res.status(409).json({ error: '已创建过角色' });
  }

  const insertChar = db.prepare(`
    INSERT INTO characters (user_id, name, realm, level, exp, hp, max_hp, mp, max_mp, attack, defense, speed, comprehension, gold)
    VALUES (?, ?, '练气期', 1, 0, 100, 100, 50, 50, 10, 5, 5, 5, 100)
  `);

  const insertInventory = db.prepare(`
    INSERT INTO inventory (character_id, item_id, quantity, equipped, slot) VALUES (?, ?, ?, 0, NULL)
  `);

  const transaction = db.transaction(() => {
    const result = insertChar.run(req.user.id, name.trim());
    const charId = result.lastInsertRowid;

    for (const item of ITEMS) {
      insertInventory.run(charId, item.id, 1);
    }

    return charId;
  });

  try {
    const charId = transaction();
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
    res.json({ message: '角色创建成功', character });
  } catch (err) {
    res.status(500).json({ error: '角色创建失败' });
  }
});

router.post('/cultivate', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const baseExp = 10;
  const comprehensionMultiplier = 1 + character.comprehension * 0.1;
  const randomMultiplier = 0.8 + Math.random() * 0.4;
  const expGained = Math.floor(baseExp * comprehensionMultiplier * randomMultiplier);

  const realmIndex = getRealmIndex(character.realm);
  const nextRealm = getRealmByIndex(realmIndex + 1);
  const maxLevel = nextRealm ? nextRealm.levelReq : 999;

  let newExp = character.exp + expGained;
  let leveledUp = false;
  let newLevel = character.level;
  let newMaxHp = character.max_hp;
  let newMaxMp = character.max_mp;
  let newHp = character.hp;
  let newMp = character.mp;
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

  const cultivateCount = character.cultivate_count + 1;

  db.prepare(`
    UPDATE characters SET exp = ?, level = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?, cultivate_count = ? WHERE id = ?
  `).run(newExp, newLevel, newMaxHp, newMaxMp, newHp, newMp, cultivateCount, character.id);

  updateActiveQuestProgress(character.id, 'cultivate', 1);
  updateAchievementProgress(character.id, 'cultivate', 1);

  let canTribulate = false;
  if (nextRealm && newLevel >= nextRealm.levelReq) {
    canTribulate = true;
  }

  let message = `修炼获得${expGained}点经验`;
  if (leveledUp) {
    message = `修炼获得${expGained}点经验，等级提升至${newLevel}级！`;
  } else if (overflowExp > 0) {
    message = `修炼获得${expGained}点经验（溢出${overflowExp}点经验，请渡天劫突破境界）`;
  }

  res.json({
    message,
    expGained,
    expGain: expGained,
    newExp,
    leveledUp,
    levelUp: leveledUp,
    newLevel,
    overflowExp,
    canTribulate,
    canBreakthrough: canTribulate
  });
});

router.post('/breakthrough', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const realmIndex = getRealmIndex(character.realm);
  const nextRealm = getRealmByIndex(realmIndex + 1);

  if (!nextRealm) {
    return res.status(400).json({ error: '已达最高境界' });
  }

  if (character.level < nextRealm.levelReq) {
    return res.status(400).json({ error: `等级不足，需要${nextRealm.levelReq}级` });
  }

  const successRate = Math.min(0.6 + character.comprehension * 0.02, 0.95);
  const roll = Math.random();
  const success = roll < successRate;

  if (success) {
    const newRealm = nextRealm.name;
    const newMaxHp = character.max_hp + nextRealm.hpBonus;
    const newMaxMp = character.max_mp + nextRealm.mpBonus;
    const newHp = newMaxHp;
    const newMp = newMaxMp;
    const newAttack = character.attack + nextRealm.atkBonus;
    const newDefense = character.defense + nextRealm.defBonus;
    const newSpeed = character.speed + nextRealm.speedBonus;

    db.prepare(`
      UPDATE characters SET realm = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE id = ?
    `).run(newRealm, newMaxHp, newMaxMp, newHp, newMp, newAttack, newDefense, newSpeed, character.id);

    const pets = db.prepare('SELECT * FROM pets WHERE character_id = ?').all(character.id);
    for (const pet of pets) {
      db.prepare('UPDATE pets SET hp = max_hp WHERE id = ?').run(pet.id);
    }

    updateActiveQuestProgress(character.id, 'breakthrough', 1);
    updateRealmAchievement(character.id, newRealm);

    res.json({
      message: `突破成功！晋升为${newRealm}！`,
      success: true,
      newRealm,
      bonusStats: {
        hp: nextRealm.hpBonus,
        mp: nextRealm.mpBonus,
        attack: nextRealm.atkBonus,
        defense: nextRealm.defBonus,
        speed: nextRealm.speedBonus
      }
    });
  } else {
    const expLoss = Math.floor(character.exp * 0.1);
    const newExp = character.exp - expLoss;

    db.prepare('UPDATE characters SET exp = ? WHERE id = ?').run(newExp, character.id);

    res.json({
      message: `突破失败！损失${expLoss}点修为`,
      success: false,
      expLost: expLoss,
      newExp
    });
  }
});

router.post('/tribulation', auth, (req, res) => {
  const { itemId } = req.body;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const realmIndex = getRealmIndex(character.realm);
  const nextRealm = getRealmByIndex(realmIndex + 1);

  if (!nextRealm) {
    return res.status(400).json({ error: '已达最高境界' });
  }

  const maxLevel = nextRealm.levelReq;
  if (character.level < maxLevel) {
    return res.status(400).json({ error: `等级不足，需要${maxLevel}级才能渡天劫` });
  }

  if (character.hp < character.max_hp) {
    return res.status(400).json({ error: '请先恢复生命值再渡天劫' });
  }

  let itemBonus = 0;
  let saveOnFail = false;
  let usedItem = null;

  if (itemId) {
    const tribItem = db.prepare(`
      SELECT inv.*, items.effect FROM inventory inv
      JOIN items ON inv.item_id = items.id
      WHERE inv.character_id = ? AND inv.item_id = ? AND inv.equipped = 0 AND inv.quantity > 0
    `).get(character.id, itemId);

    if (!tribItem) {
      return res.status(400).json({ error: '没有该渡劫道具' });
    }

    const effect = JSON.parse(tribItem.effect);
    if (effect.type !== 'tribulation_bonus') {
      return res.status(400).json({ error: '该道具不能用于渡天劫' });
    }

    itemBonus = effect.value;
    saveOnFail = effect.saveOnFail || false;
    usedItem = getItemById(itemId);

    db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?').run(tribItem.id);
    db.prepare('DELETE FROM inventory WHERE quantity <= 0 AND id = ?').run(tribItem.id);
  }

  const baseSuccessRate = nextRealm.baseSuccessRate || 50;
  const comprehensionBonus = character.comprehension * 2;
  const totalSuccessRate = Math.min(baseSuccessRate + itemBonus + comprehensionBonus, 95);

  const roll = Math.random() * 100;
  const success = roll < totalSuccessRate;

  if (success) {
    const newRealm = nextRealm.name;
    const newMaxHp = character.max_hp + nextRealm.hpBonus;
    const newMaxMp = character.max_mp + nextRealm.mpBonus;
    const newHp = newMaxHp;
    const newMp = newMaxMp;
    const newAttack = character.attack + nextRealm.atkBonus;
    const newDefense = character.defense + nextRealm.defBonus;
    const newSpeed = character.speed + nextRealm.speedBonus;
    const newExp = 0;

    db.prepare(`
      UPDATE characters SET realm = ?, exp = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE id = ?
    `).run(newRealm, newExp, newMaxHp, newMaxMp, newHp, newMp, newAttack, newDefense, newSpeed, character.id);

    const pets = db.prepare('SELECT * FROM pets WHERE character_id = ?').all(character.id);
    for (const pet of pets) {
      db.prepare('UPDATE pets SET hp = max_hp WHERE id = ?').run(pet.id);
    }

    updateActiveQuestProgress(character.id, 'breakthrough', 1);
    updateRealmAchievement(character.id, newRealm);

    res.json({
      message: `天劫降临！${usedItem ? `使用${usedItem.name}，` : ''}成功率${totalSuccessRate.toFixed(1)}%，渡劫成功！晋升为${newRealm}！`,
      success: true,
      tribulation: true,
      usedItem: usedItem ? usedItem.name : null,
      successRate: totalSuccessRate,
      newRealm,
      bonusStats: {
        hp: nextRealm.hpBonus,
        mp: nextRealm.mpBonus,
        attack: nextRealm.atkBonus,
        defense: nextRealm.defBonus,
        speed: nextRealm.speedBonus
      }
    });
  } else {
    if (saveOnFail) {
      const hpLoss = Math.floor(character.max_hp * 0.5);
      const expLoss = Math.floor(character.exp * 0.2);
      const newHp = Math.max(1, character.hp - hpLoss);
      const newExp = Math.max(0, character.exp - expLoss);

      db.prepare('UPDATE characters SET hp = ?, exp = ? WHERE id = ?').run(newHp, newExp, character.id);

      res.json({
        message: `天劫降临！使用${usedItem.name}，成功率${totalSuccessRate.toFixed(1)}%，渡劫失败！${usedItem.name}保住了你的性命！损失${expLoss}点修为，${hpLoss}点生命值。`,
        success: false,
        tribulation: true,
        usedItem: usedItem.name,
        successRate: totalSuccessRate,
        saved: true,
        expLost: expLoss,
        hpLost: hpLoss,
        newExp,
        newHp
      });
    } else {
      const deathPenalty = character.level >= 50 ? 0.3 : 0.2;
      const expLoss = Math.floor(character.exp * deathPenalty);
      const goldLoss = Math.floor(character.gold * 0.1);
      const newExp = Math.max(0, character.exp - expLoss);
      const newGold = Math.max(0, character.gold - goldLoss);
      const newHp = Math.floor(character.max_hp * 0.1);

      db.prepare('UPDATE characters SET exp = ?, gold = ?, hp = ? WHERE id = ?').run(newExp, newGold, newHp, character.id);

      res.json({
        message: `天劫降临！${usedItem ? `使用${usedItem.name}，` : ''}成功率${totalSuccessRate.toFixed(1)}%，渡劫失败！身受重伤，损失${expLoss}点修为，${goldLoss}金币。`,
        success: false,
        tribulation: true,
        usedItem: usedItem ? usedItem.name : null,
        successRate: totalSuccessRate,
        saved: false,
        expLost: expLoss,
        goldLost: goldLoss,
        newExp,
        newGold,
        newHp
      });
    }
  }
});

router.get('/tribulation/info', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const realmIndex = getRealmIndex(character.realm);
  const nextRealm = getRealmByIndex(realmIndex + 1);

  const tribItems = db.prepare(`
    SELECT inv.*, items.effect FROM inventory inv
    JOIN items ON inv.item_id = items.id
    WHERE inv.character_id = ? AND items.sub_type = 'tribulation' AND inv.equipped = 0 AND inv.quantity > 0
  `).all(character.id);

  const tribItemsWithDetails = tribItems.map(item => ({
    ...item,
    itemData: getItemById(item.item_id),
    effect: JSON.parse(item.effect)
  }));

  if (!nextRealm) {
    return res.json({
      canTribulate: false,
      reason: '已达最高境界',
      currentRealm: character.realm,
      tribItems: tribItemsWithDetails
    });
  }

  const baseSuccessRate = nextRealm.baseSuccessRate || 50;
  const comprehensionBonus = character.comprehension * 2;
  const minSuccessRate = baseSuccessRate + comprehensionBonus;

  const maxLevel = nextRealm.levelReq;
  const canTribulate = character.level >= maxLevel && character.hp >= character.max_hp;

  res.json({
    canTribulate,
    currentRealm: character.realm,
    nextRealm: {
      name: nextRealm.name,
      levelReq: nextRealm.levelReq,
      expReq: nextRealm.expReq,
      baseSuccessRate,
      hpBonus: nextRealm.hpBonus,
      mpBonus: nextRealm.mpBonus,
      atkBonus: nextRealm.atkBonus,
      defBonus: nextRealm.defBonus,
      speedBonus: nextRealm.speedBonus
    },
    characterLevel: character.level,
    characterExp: character.exp,
    characterHp: character.hp,
    characterMaxHp: character.max_hp,
    comprehensionBonus,
    minSuccessRate,
    tribItems: tribItemsWithDetails
  });
});

function updateActiveQuestProgress(characterId, objectiveType, amount) {
  const activeQuests = db.prepare(`
    SELECT cq.*, q.objectives FROM character_quests cq
    JOIN quests q ON cq.quest_id = q.id
    WHERE cq.character_id = ? AND cq.status = 'active'
  `).all(characterId);

  for (const quest of activeQuests) {
    const objectives = JSON.parse(quest.objectives);
    const matchingObjective = objectives.find(obj => obj.type === objectiveType);
    if (matchingObjective) {
      const newProgress = Math.min(quest.progress + amount, matchingObjective.target);
      db.prepare('UPDATE character_quests SET progress = ? WHERE id = ?')
        .run(newProgress, quest.id);
    }
  }
}

module.exports = router;
