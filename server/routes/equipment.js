const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getItemById, EQUIPMENT_SLOTS } = require('../gameData');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const equipped = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND equipped = 1').all(character.id);
  const equipment = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const inv = equipped.find(e => e.slot === slot);
    if (inv) {
      const item = getItemById(inv.item_id);
      equipment[slot] = item ? { ...item, inventoryId: inv.id } : null;
    } else {
      equipment[slot] = null;
    }
  }

  res.json({ equipment });
});

router.post('/equip', auth, (req, res) => {
  const itemId = parseInt(req.body.itemId);
  if (!itemId) {
    return res.status(400).json({ error: '缺少物品ID' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const item = getItemById(itemId);
  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }
  if (item.type !== 'equipment') {
    return res.status(400).json({ error: '该物品不是装备' });
  }

  const invItem = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0').get(character.id, itemId);
  if (!invItem) {
    return res.status(404).json({ error: '背包中没有该物品' });
  }

  const slot = item.slot;
  const currentEquipped = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND equipped = 1 AND slot = ?').get(character.id, slot);

  const transaction = db.transaction(() => {
    if (currentEquipped) {
      const oldItem = getItemById(currentEquipped.item_id);
      if (oldItem && oldItem.stats) {
        unequipStats(character, oldItem.stats);
      }
      db.prepare('UPDATE inventory SET equipped = 0, slot = NULL WHERE id = ?').run(currentEquipped.id);
    }

    db.prepare('UPDATE inventory SET equipped = 1, slot = ? WHERE id = ?').run(slot, invItem.id);

    if (item.stats) {
      equipStats(character, item.stats);
    }
  });

  transaction();

  const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
  res.json({
    message: currentEquipped ? `装备${item.name}，替换了原有装备` : `装备了${item.name}`,
    character: updatedChar,
    equippedItem: item
  });
});

router.post('/unequip', auth, (req, res) => {
  const slot = req.body.slot;
  if (!EQUIPMENT_SLOTS.includes(slot)) {
    return res.status(400).json({ error: '无效的装备槽位' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const equipped = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND equipped = 1 AND slot = ?').get(character.id, slot);
  if (!equipped) {
    return res.status(400).json({ error: '该槽位没有装备' });
  }

  const item = getItemById(equipped.item_id);

  const transaction = db.transaction(() => {
    if (item && item.stats) {
      unequipStats(character, item.stats);
    }
    db.prepare('UPDATE inventory SET equipped = 0, slot = NULL WHERE id = ?').run(equipped.id);
  });

  transaction();

  const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
  res.json({
    message: `卸下了${item ? item.name : '装备'}`,
    character: updatedChar
  });
});

router.get('/inventory', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const items = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND equipped = 0').all(character.id);
  const inventory = items.map(inv => {
    const itemData = getItemById(inv.item_id);
    if (!itemData) return null;
    return {
      id: itemData.id,
      name: itemData.name,
      type: itemData.type,
      subType: itemData.subType,
      quality: itemData.quality,
      slot: itemData.slot,
      description: itemData.description,
      effect: itemData.effect,
      stats: itemData.stats,
      price: itemData.price,
      quantity: inv.quantity,
      inventoryId: inv.id
    };
  }).filter(Boolean);

  res.json({ inventory });
});

router.post('/use', auth, (req, res) => {
  const itemId = parseInt(req.body.itemId);
  if (!itemId) {
    return res.status(400).json({ error: '缺少物品ID' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const item = getItemById(itemId);
  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }
  if (item.type !== 'consumable') {
    return res.status(400).json({ error: '该物品无法使用' });
  }

  const invItem = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0').get(character.id, itemId);
  if (!invItem) {
    return res.status(404).json({ error: '背包中没有该物品' });
  }

  const effect = item.effect;
  let message = '';

  const transaction = db.transaction(() => {
    if (invItem.quantity <= 1) {
      db.prepare('DELETE FROM inventory WHERE id = ?').run(invItem.id);
    } else {
      db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?').run(invItem.id);
    }

    switch (effect.type) {
      case 'heal_hp': {
        const newHp = Math.min(character.hp + effect.value, character.max_hp);
        db.prepare('UPDATE characters SET hp = ? WHERE id = ?').run(newHp, character.id);
        message = `使用${item.name}，恢复${effect.value}点生命值`;
        break;
      }
      case 'heal_mp': {
        const newMp = Math.min(character.mp + effect.value, character.max_mp);
        db.prepare('UPDATE characters SET mp = ? WHERE id = ?').run(newMp, character.id);
        message = `使用${item.name}，恢复${effect.value}点灵力值`;
        break;
      }
      case 'exp': {
        const newExp = character.exp + effect.value;
        db.prepare('UPDATE characters SET exp = ? WHERE id = ?').run(newExp, character.id);
        message = `使用${item.name}，获得${effect.value}点修炼经验`;
        break;
      }
      default:
        message = `使用了${item.name}`;
    }
  });

  transaction();

  const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
  res.json({ message, character: updatedChar });
});

function equipStats(character, stats) {
  const updates = [];
  const values = [];

  if (stats.attack) { updates.push('attack = attack + ?'); values.push(stats.attack); }
  if (stats.defense) { updates.push('defense = defense + ?'); values.push(stats.defense); }
  if (stats.speed) { updates.push('speed = speed + ?'); values.push(stats.speed); }
  if (stats.hp) { updates.push('max_hp = max_hp + ?'); values.push(stats.hp); }
  if (stats.mp) { updates.push('max_mp = max_mp + ?'); values.push(stats.mp); }

  if (updates.length > 0) {
    values.push(character.id);
    db.prepare(`UPDATE characters SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
}

function unequipStats(character, stats) {
  const updates = [];
  const values = [];

  if (stats.attack) { updates.push('attack = attack - ?'); values.push(stats.attack); }
  if (stats.defense) { updates.push('defense = defense - ?'); values.push(stats.defense); }
  if (stats.speed) { updates.push('speed = speed - ?'); values.push(stats.speed); }
  if (stats.hp) { updates.push('max_hp = max_hp - ?'); values.push(stats.hp); }
  if (stats.mp) { updates.push('max_mp = max_mp - ?'); values.push(stats.mp); }

  if (updates.length > 0) {
    values.push(character.id);
    db.prepare(`UPDATE characters SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
    if (updatedChar.hp > updatedChar.max_hp) {
      db.prepare('UPDATE characters SET hp = max_hp WHERE id = ?').run(character.id);
    }
    if (updatedChar.mp > updatedChar.max_mp) {
      db.prepare('UPDATE characters SET mp = max_mp WHERE id = ?').run(character.id);
    }
  }
}

module.exports = router;
