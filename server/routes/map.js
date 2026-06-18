const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { MAPS, getMapById, getMonsterById, getItemById } = require('../gameData');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const mapsWithDetails = MAPS.map(map => ({
    ...map,
    unlocked: character.level >= map.levelReq
  }));

  res.json({
    maps: mapsWithDetails,
    currentLevel: character.level
  });
});

router.post('/explore/:mapId', auth, (req, res) => {
  const { mapId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const map = getMapById(parseInt(mapId));
  if (!map) {
    return res.status(404).json({ error: '地图不存在' });
  }

  if (character.level < map.levelReq) {
    return res.status(400).json({ error: `等级不足，需要${map.levelReq}级才能进入` });
  }

  if (character.hp <= 0) {
    return res.status(400).json({ error: '生命值为0，无法探索，请先恢复' });
  }

  const rand = Math.random();
  let result;

  db.prepare('INSERT INTO exploration_logs (character_id, map_id, action) VALUES (?, ?, ?)')
    .run(character.id, map.id, 'explore');

  if (rand < map.encounterRate) {
    const monsterIndex = Math.floor(Math.random() * map.monsters.length);
    const monsterId = map.monsters[monsterIndex];
    const monster = getMonsterById(monsterId);

    result = {
      type: 'encounter',
      message: `遭遇了${monster.name}！`,
      monster: {
        ...monster,
        currentHp: monster.hp
      }
    };

    const existingBattle = db.prepare('SELECT id FROM active_battles WHERE character_id = ?').get(character.id);
    if (existingBattle) {
      db.prepare('DELETE FROM active_battles WHERE character_id = ?').run(character.id);
    }

    const activePet = db.prepare('SELECT * FROM pets WHERE character_id = ? AND active = 1').get(character.id);

    db.prepare(`
      INSERT INTO active_battles (character_id, monster_id, monster_hp, monster_max_hp, player_hp, player_max_hp, pet_id, pet_hp, pet_max_hp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      character.id,
      monster.id,
      monster.hp,
      monster.hp,
      character.hp,
      character.max_hp,
      activePet ? activePet.id : null,
      activePet ? activePet.hp : null,
      activePet ? activePet.max_hp : null
    );

  } else if (rand < map.encounterRate + map.dropRate) {
    const dropIndex = Math.floor(Math.random() * map.dropItems.length);
    const itemId = map.dropItems[dropIndex];
    const item = getItemById(itemId);
    const quantity = Math.random() < 0.3 ? 2 : 1;

    const existingInv = db.prepare('SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0')
      .get(character.id, itemId);

    if (existingInv) {
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(quantity, existingInv.id);
    } else {
      db.prepare('INSERT INTO inventory (character_id, item_id, quantity, equipped, slot) VALUES (?, ?, ?, 0, NULL)')
        .run(character.id, itemId, quantity);
    }

    db.prepare('INSERT INTO exploration_logs (character_id, map_id, action, result) VALUES (?, ?, ?, ?)')
      .run(character.id, map.id, 'found_item', JSON.stringify({ itemId, quantity }));

    result = {
      type: 'item',
      message: `捡到了${quantity}个${item.name}！`,
      item: {
        ...item,
        quantity
      }
    };

  } else {
    const baseExp = Math.floor(5 + map.levelReq * 2);
    const newExp = character.exp + baseExp;

    const expForLevel = character.level * 100;
    const realmIndex = db.prepare('SELECT realm FROM characters WHERE id = ?').get(character.id);
    const { getRealmIndex, getRealmByIndex } = require('../gameData');
    const currentRealmIdx = getRealmIndex(realmIndex.realm);
    const nextRealm = getRealmByIndex(currentRealmIdx + 1);
    const maxLevel = nextRealm ? nextRealm.levelReq - 1 : 999;

    let finalExp = newExp;
    let overflowExp = 0;
    if (character.level >= maxLevel && newExp >= expForLevel) {
      overflowExp = newExp - expForLevel + 1;
      finalExp = expForLevel - 1;
    }

    db.prepare('UPDATE characters SET exp = ? WHERE id = ?').run(finalExp, character.id);

    db.prepare('INSERT INTO exploration_logs (character_id, map_id, action, result) VALUES (?, ?, ?, ?)')
      .run(character.id, map.id, 'explore_exp', JSON.stringify({ exp: baseExp }));

    result = {
      type: 'explore',
      message: `闲逛了一会儿，获得了${baseExp}点经验${overflowExp > 0 ? `（溢出${overflowExp}点经验，请突破境界）` : ''}`,
      expGained: baseExp,
      overflowExp,
      newExp: finalExp
    };
  }

  const updatedCharacter = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  res.json({
    result,
    character: {
      ...updatedCharacter,
      expToNext: updatedCharacter.level * 100
    }
  });
});

module.exports = router;
