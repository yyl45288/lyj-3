const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { REALMS, getRealmByIndex, getRealmIndex, getItemById } = require('../gameData');

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

    insertInventory.run(charId, 1, 5);
    insertInventory.run(charId, 3, 3);
    insertInventory.run(charId, 5, 1);
    insertInventory.run(charId, 101, 1);

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

  const newExp = character.exp + expGained;
  let leveledUp = false;
  let newLevel = character.level;
  let newMaxHp = character.max_hp;
  let newMaxMp = character.max_mp;
  let newHp = character.hp;
  let newMp = character.mp;

  const expForLevel = newLevel * 100;
  if (newExp >= expForLevel) {
    newLevel += 1;
    newMaxHp += 10;
    newMaxMp += 5;
    newHp = newMaxHp;
    newMp = newMaxMp;
    leveledUp = true;
  }

  const cultivateCount = character.cultivate_count + 1;

  db.prepare(`
    UPDATE characters SET exp = ?, level = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?, cultivate_count = ? WHERE id = ?
  `).run(newExp, newLevel, newMaxHp, newMaxMp, newHp, newMp, cultivateCount, character.id);

  updateActiveQuestProgress(character.id, 'cultivate', 1);

  const realmIndex = getRealmIndex(character.realm);
  const nextRealm = getRealmByIndex(realmIndex + 1);
  let canBreakthrough = false;
  if (nextRealm && newLevel >= nextRealm.levelReq && newExp >= nextRealm.expReq) {
    canBreakthrough = true;
  }

  res.json({
    message: leveledUp ? `修炼获得${expGained}点经验，等级提升至${newLevel}级！` : `修炼获得${expGained}点经验`,
    expGained,
    expGain: expGained,
    newExp,
    leveledUp,
    levelUp: leveledUp,
    newLevel,
    canBreakthrough
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

  if (character.exp < nextRealm.expReq) {
    return res.status(400).json({ error: `修为不足，需要${nextRealm.expReq}点经验` });
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

    updateActiveQuestProgress(character.id, 'breakthrough', 1);

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
