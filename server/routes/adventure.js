const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getAdventureById, getItemById } = require('../gameData');
const { updateGoldAchievement } = require('./achievement');

const router = express.Router();

function applyRewards(characterId, rewards) {
  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
  if (!character) return;

  const messages = [];
  let newGold = character.gold;
  let newExp = character.exp;
  let newHp = character.hp;
  let newMp = character.mp;
  let newMaxHp = character.max_hp;
  let newMaxMp = character.max_mp;
  let newLevel = character.level;

  if (rewards.gold) {
    newGold += rewards.gold;
    messages.push(`获得${rewards.gold}金币`);
  }

  if (rewards.exp) {
    newExp += rewards.exp;
    messages.push(`获得${rewards.exp}点经验`);

    const expForLevel = character.level * 100;
    if (newExp >= expForLevel) {
      newLevel = character.level + 1;
      newMaxHp += 10;
      newMaxMp += 5;
      newHp = newMaxHp;
      newMp = newMaxMp;
      newExp = newExp - expForLevel;
      messages.push(`等级提升至${newLevel}级！`);
    }
  }

  if (rewards.hp) {
    newHp = Math.min(newMaxHp, newHp + rewards.hp);
    messages.push(`恢复${rewards.hp}点生命值`);
  }

  if (rewards.mp) {
    newMp = Math.min(newMaxMp, newMp + rewards.mp);
    messages.push(`恢复${rewards.mp}点灵力值`);
  }

  if (rewards.items && rewards.items.length > 0) {
    for (const rewardItem of rewards.items) {
      const itemInfo = getItemById(rewardItem.itemId);
      if (!itemInfo) continue;

      const existingItem = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0')
        .get(characterId, rewardItem.itemId);

      if (existingItem) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(rewardItem.quantity, existingItem.id);
      } else {
        db.prepare('INSERT INTO inventory (character_id, item_id, quantity, equipped, slot) VALUES (?, ?, ?, 0, NULL)')
          .run(characterId, rewardItem.itemId, rewardItem.quantity);
      }
      messages.push(`获得${itemInfo.name}×${rewardItem.quantity}`);
    }
  }

  db.prepare(`
    UPDATE characters SET gold = ?, exp = ?, level = ?, hp = ?, mp = ?, max_hp = ?, max_mp = ?
    WHERE id = ?
  `).run(newGold, newExp, newLevel, newHp, newMp, newMaxHp, newMaxMp, characterId);

  if (rewards.gold) {
    const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    updateGoldAchievement(characterId, updatedChar.gold);
  }

  return messages;
}

function applyRisks(characterId, risk) {
  if (!risk || !risk.hpDamage) return [];

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
  if (!character) return [];

  const newHp = Math.max(1, character.hp - risk.hpDamage);
  db.prepare('UPDATE characters SET hp = ? WHERE id = ?').run(newHp, characterId);

  return [`受到${risk.hpDamage}点伤害`];
}

function applyCosts(characterId, cost) {
  if (!cost) return { success: true, messages: [] };

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
  if (!character) return { success: false, messages: ['角色不存在'] };

  const messages = [];

  if (cost.gold) {
    if (character.gold < cost.gold) {
      return { success: false, messages: [`金币不足，需要${cost.gold}金币`] };
    }
    db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ?').run(cost.gold, characterId);
    messages.push(`花费${cost.gold}金币`);
  }

  return { success: true, messages };
}

router.get('/active', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const activeAdv = db.prepare('SELECT * FROM active_adventures WHERE character_id = ?').get(character.id);
  if (!activeAdv) {
    return res.json({ adventure: null });
  }

  const adventure = getAdventureById(activeAdv.adventure_id);
  if (!adventure) {
    db.prepare('DELETE FROM active_adventures WHERE character_id = ?').run(character.id);
    return res.json({ adventure: null });
  }

  res.json({
    adventure: {
      id: adventure.id,
      name: adventure.name,
      description: adventure.description,
      rarity: adventure.rarity,
      choices: adventure.choices.map((c, i) => ({
        index: i,
        text: c.text
      })),
      mapId: activeAdv.map_id,
      startedAt: activeAdv.created_at
    }
  });
});

router.post('/choose/:choiceIndex', auth, (req, res) => {
  const choiceIndex = parseInt(req.params.choiceIndex);
  if (isNaN(choiceIndex) || choiceIndex < 0) {
    return res.status(400).json({ error: '无效的选择' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const activeAdv = db.prepare('SELECT * FROM active_adventures WHERE character_id = ?').get(character.id);
  if (!activeAdv) {
    return res.status(400).json({ error: '当前没有进行中的奇遇事件' });
  }

  const adventure = getAdventureById(activeAdv.adventure_id);
  if (!adventure) {
    db.prepare('DELETE FROM active_adventures WHERE character_id = ?').run(character.id);
    return res.status(404).json({ error: '奇遇事件不存在' });
  }

  if (choiceIndex >= adventure.choices.length) {
    return res.status(400).json({ error: '无效的选择' });
  }

  const choice = adventure.choices[choiceIndex];

  const costResult = applyCosts(character.id, choice.cost);
  if (!costResult.success) {
    return res.status(400).json({ error: costResult.messages[0] });
  }

  const transaction = db.transaction(() => {
    const rewardMessages = applyRewards(character.id, choice.rewards || {});
    const riskMessages = applyRisks(character.id, choice.risk || {});

    db.prepare(`
      INSERT INTO adventure_logs (character_id, adventure_id, map_id, choice_index, result, rewards)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      character.id,
      adventure.id,
      activeAdv.map_id,
      choiceIndex,
      choice.resultText,
      JSON.stringify(choice.rewards || {})
    );

    db.prepare('DELETE FROM active_adventures WHERE character_id = ?').run(character.id);

    return [...costResult.messages, ...rewardMessages, ...riskMessages];
  });

  try {
    const messages = transaction();
    const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);

    res.json({
      message: choice.resultText,
      details: messages,
      result: {
        rewards: choice.rewards || {},
        risk: choice.risk || {},
        resultText: choice.resultText
      },
      character: {
        ...updatedChar,
        expToNext: updatedChar.level * 100
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '选择失败' });
  }
});

router.get('/logs', auth, (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);

  const logs = db.prepare(`
    SELECT * FROM adventure_logs
    WHERE character_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(character.id, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM adventure_logs WHERE character_id = ?')
    .get(character.id).count;

  const formattedLogs = logs.map(log => {
    const adventure = getAdventureById(log.adventure_id);
    return {
      id: log.id,
      adventureId: log.adventure_id,
      adventureName: adventure ? adventure.name : '未知奇遇',
      adventureRarity: adventure ? adventure.rarity : 'common',
      mapId: log.map_id,
      choiceIndex: log.choice_index,
      choiceText: (adventure && adventure.choices[log.choice_index]) ? adventure.choices[log.choice_index].text : '',
      result: log.result,
      rewards: log.rewards ? JSON.parse(log.rewards) : {},
      createdAt: log.created_at
    };
  });

  res.json({
    logs: formattedLogs,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / pageSize)
  });
});

module.exports = router;
module.exports.applyRewards = applyRewards;
