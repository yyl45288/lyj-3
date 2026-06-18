const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getQuestById, getItemById } = require('../gameData');

const router = express.Router();

function formatReward(rewards) {
  const parts = [];
  if (rewards.exp) parts.push(`经验+${rewards.exp}`);
  if (rewards.gold) parts.push(`金币+${rewards.gold}`);
  if (rewards.items) {
    for (const rewardItem of rewards.items) {
      const itemInfo = getItemById(rewardItem.itemId);
      if (itemInfo) parts.push(`${itemInfo.name}×${rewardItem.quantity}`);
    }
  }
  return parts.join(', ');
}

router.get('/available', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const acceptedQuests = db.prepare('SELECT quest_id FROM character_quests WHERE character_id = ?').all(character.id);
  const acceptedIds = acceptedQuests.map(q => q.quest_id);

  const quests = db.prepare('SELECT * FROM quests').all();
  const available = quests.filter(q => {
    if (acceptedIds.includes(q.id)) return false;
    const requirements = JSON.parse(q.requirements);
    if (requirements.level && character.level < requirements.level) return false;
    return true;
  }).map(q => {
    const rewards = JSON.parse(q.rewards);
    return {
      id: q.id,
      name: q.name,
      type: q.type,
      description: q.description,
      requirements: JSON.parse(q.requirements),
      objectives: JSON.parse(q.objectives),
      rewards,
      reward: formatReward(rewards)
    };
  });

  res.json({ quests: available });
});

router.get('/active', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const activeQuests = db.prepare(`
    SELECT cq.*, q.name, q.description, q.type, q.objectives, q.rewards
    FROM character_quests cq
    JOIN quests q ON cq.quest_id = q.id
    WHERE cq.character_id = ? AND cq.status = 'active'
  `).all(character.id);

  const quests = activeQuests.map(q => {
    const objectives = JSON.parse(q.objectives);
    const rewards = JSON.parse(q.rewards);
    return {
      id: q.quest_id,
      name: q.name,
      description: q.description,
      type: q.type,
      objectives,
      rewards,
      reward: formatReward(rewards),
      progress: q.progress,
      target: objectives[0] ? objectives[0].target : 1,
      objectiveDescription: objectives[0] ? objectives[0].description : '',
      status: q.status,
      acceptedAt: q.accepted_at
    };
  });

  res.json({ quests });
});

router.post('/accept', auth, (req, res) => {
  const questId = parseInt(req.body.questId);
  if (!questId) {
    return res.status(400).json({ error: '缺少任务ID' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const questData = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
  if (!questData) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const requirements = JSON.parse(questData.requirements);
  if (requirements.level && character.level < requirements.level) {
    return res.status(400).json({ error: `等级不足，需要${requirements.level}级` });
  }

  const existing = db.prepare('SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ?').get(character.id, questId);
  if (existing) {
    return res.status(400).json({ error: '已接取该任务' });
  }

  db.prepare('INSERT INTO character_quests (character_id, quest_id, status, progress) VALUES (?, ?, ?, ?)')
    .run(character.id, questId, 'active', 0);

  const questInfo = {
    id: questData.id,
    name: questData.name,
    type: questData.type,
    description: questData.description,
    objectives: JSON.parse(questData.objectives),
    rewards: JSON.parse(questData.rewards)
  };

  res.json({ message: `接取任务：${questData.name}`, quest: questInfo });
});

router.post('/complete', auth, (req, res) => {
  const questId = parseInt(req.body.questId);
  if (!questId) {
    return res.status(400).json({ error: '缺少任务ID' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const charQuest = db.prepare('SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = \'active\'')
    .get(character.id, questId);
  if (!charQuest) {
    return res.status(404).json({ error: '未找到该进行中的任务' });
  }

  const questData = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
  if (!questData) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const objectives = JSON.parse(questData.objectives);
  const targetProgress = objectives[0] ? objectives[0].target : 1;
  if (charQuest.progress < targetProgress) {
    return res.status(400).json({ error: `任务进度不足，当前${charQuest.progress}/${targetProgress}` });
  }

  const rewards = JSON.parse(questData.rewards);
  const messages = [];

  const transaction = db.transaction(() => {
    db.prepare('UPDATE character_quests SET status = ?, completed_at = datetime(\'now\') WHERE id = ?')
      .run('completed', charQuest.id);

    if (rewards.exp) {
      db.prepare('UPDATE characters SET exp = exp + ? WHERE id = ?').run(rewards.exp, character.id);
      messages.push(`获得${rewards.exp}点经验`);
    }

    if (rewards.gold) {
      db.prepare('UPDATE characters SET gold = gold + ? WHERE id = ?').run(rewards.gold, character.id);
      messages.push(`获得${rewards.gold}金币`);
    }

    if (rewards.items && rewards.items.length > 0) {
      for (const rewardItem of rewards.items) {
        const itemInfo = getItemById(rewardItem.itemId);
        if (!itemInfo) continue;

        const existingItem = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0')
          .get(character.id, rewardItem.itemId);

        if (existingItem) {
          db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(rewardItem.quantity, existingItem.id);
        } else {
          db.prepare('INSERT INTO inventory (character_id, item_id, quantity, equipped, slot) VALUES (?, ?, ?, 0, NULL)')
            .run(character.id, rewardItem.itemId, rewardItem.quantity);
        }
        messages.push(`获得${itemInfo.name}×${rewardItem.quantity}`);
      }
    }
  });

  transaction();

  const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);

  res.json({
    message: `完成任务：${questData.name}！`,
    rewardDetails: messages,
    character: updatedChar
  });
});

module.exports = router;
