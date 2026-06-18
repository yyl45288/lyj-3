const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getMonsterById, getPetById, getItemById, getRealmIndex, getRealmByIndex, calculatePetStats } = require('../gameData');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const activeBattle = db.prepare('SELECT * FROM active_battles WHERE character_id = ?').get(character.id);
  if (!activeBattle) {
    return res.json({ battle: null });
  }

  const monster = getMonsterById(activeBattle.monster_id);
  const activePet = activeBattle.pet_id ? db.prepare('SELECT * FROM pets WHERE id = ?').get(activeBattle.pet_id) : null;
  const petData = activePet ? { ...activePet, petInfo: getPetById(activePet.pet_id) } : null;

  res.json({
    battle: {
      ...activeBattle,
      monster: {
        ...monster,
        currentHp: activeBattle.monster_hp
      },
      pet: petData,
      playerHp: activeBattle.player_hp,
      playerMaxHp: activeBattle.player_max_hp
    }
  });
});

router.post('/attack', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const activeBattle = db.prepare('SELECT * FROM active_battles WHERE character_id = ?').get(character.id);
  if (!activeBattle) {
    return res.status(400).json({ error: '当前没有进行中的战斗' });
  }

  const monster = getMonsterById(activeBattle.monster_id);
  const logs = [];
  let battleEnded = false;
  let battleResult = null;

  const playerDamage = Math.max(1, character.attack - monster.defense + Math.floor(Math.random() * 10));
  activeBattle.monster_hp -= playerDamage;
  logs.push(`你对${monster.name}造成了${playerDamage}点伤害！`);

  if (activeBattle.monster_hp <= 0) {
    battleEnded = true;
    battleResult = handleVictory(character, activeBattle, monster);
    logs.push(`${monster.name}被击败了！`);
    logs.push(`获得${monster.exp}点经验和${monster.gold}金币！`);
    if (battleResult.leveledUp) {
      logs.push(`等级提升至${battleResult.newLevel}级！`);
    }
  } else {
    if (activeBattle.pet_id && activeBattle.pet_hp > 0) {
      const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(activeBattle.pet_id);
      const petInfo = getPetById(pet.pet_id);
      const petDamage = Math.max(1, pet.attack - monster.defense + Math.floor(Math.random() * 5));
      activeBattle.monster_hp -= petDamage;
      logs.push(`${pet.name}(${petInfo.name})对${monster.name}造成了${petDamage}点伤害！`);

      if (activeBattle.monster_hp <= 0) {
        battleEnded = true;
        battleResult = handleVictory(character, activeBattle, monster);
        logs.push(`${monster.name}被击败了！`);
        logs.push(`获得${monster.exp}点经验和${monster.gold}金币！`);
        if (battleResult.leveledUp) {
          logs.push(`等级提升至${battleResult.newLevel}级！`);
        }
      }
    }

    if (!battleEnded) {
      if (activeBattle.pet_id && activeBattle.pet_hp > 0 && Math.random() < 0.5) {
        const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(activeBattle.pet_id);
        const petInfo = getPetById(pet.pet_id);
        const monsterToPetDamage = Math.max(1, monster.attack - pet.defense + Math.floor(Math.random() * 5));
        activeBattle.pet_hp -= monsterToPetDamage;
        logs.push(`${monster.name}对${pet.name}(${petInfo.name})造成了${monsterToPetDamage}点伤害！`);
        if (activeBattle.pet_hp <= 0) {
          activeBattle.pet_hp = 0;
          logs.push(`${pet.name}失去了战斗能力！`);
        }
      } else {
        const monsterDamage = Math.max(1, monster.attack - character.defense + Math.floor(Math.random() * 5));
        activeBattle.player_hp -= monsterDamage;
        logs.push(`${monster.name}对你造成了${monsterDamage}点伤害！`);

        if (activeBattle.player_hp <= 0) {
          battleEnded = true;
          battleResult = handleDefeat(character, activeBattle, monster);
          logs.push(`你被${monster.name}击败了...`);
        }
      }
    }
  }

  if (battleEnded) {
    db.prepare('DELETE FROM active_battles WHERE character_id = ?').run(character.id);
  } else {
    activeBattle.turn += 1;
    db.prepare(`
      UPDATE active_battles 
      SET monster_hp = ?, player_hp = ?, pet_hp = ?, turn = ?
      WHERE character_id = ?
    `).run(activeBattle.monster_hp, activeBattle.player_hp, activeBattle.pet_hp, activeBattle.turn, character.id);
  }

  const updatedCharacter = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  res.json({
    logs,
    battleEnded,
    battleResult,
    battle: battleEnded ? null : {
      ...activeBattle,
      monster: {
        ...monster,
        currentHp: activeBattle.monster_hp
      },
      playerHp: activeBattle.player_hp,
      playerMaxHp: activeBattle.player_max_hp
    },
    character: {
      ...updatedCharacter,
      expToNext: updatedCharacter.level * 100
    }
  });
});

router.post('/capture', auth, (req, res) => {
  const { captureItemId } = req.body;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const activeBattle = db.prepare('SELECT * FROM active_battles WHERE character_id = ?').get(character.id);
  if (!activeBattle) {
    return res.status(400).json({ error: '当前没有进行中的战斗' });
  }

  const monster = getMonsterById(activeBattle.monster_id);
  const logs = [];

  const captureItem = db.prepare(`
    SELECT inv.*, items.effect FROM inventory inv
    JOIN items ON inv.item_id = items.id
    WHERE inv.character_id = ? AND inv.item_id = ? AND inv.equipped = 0 AND inv.quantity > 0
  `).get(character.id, captureItemId);

  if (!captureItem) {
    return res.status(400).json({ error: '没有可用的捕捉道具' });
  }

  const effect = JSON.parse(captureItem.effect);
  if (effect.type !== 'capture_bonus') {
    return res.status(400).json({ error: '该道具不能用于捕捉' });
  }

  db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?').run(captureItem.id);
  db.prepare('DELETE FROM inventory WHERE quantity <= 0 AND id = ?').run(captureItem.id);

  const hpRatio = activeBattle.monster_hp / activeBattle.monster_max_hp;
  const baseRate = monster.catchRate;
  const hpBonus = (1 - hpRatio) * 30;
  const itemBonus = effect.value;
  const totalRate = Math.min(baseRate + hpBonus + itemBonus, 95);

  logs.push(`使用了${getItemById(captureItemId).name}，捕捉成功率：${totalRate.toFixed(1)}%`);

  const roll = Math.random() * 100;
  const success = roll < totalRate;

  if (success) {
    const petTemplate = getPetById(monster.petId);
    if (petTemplate) {
      const stats = calculatePetStats({ pet_id: monster.petId }, 1);
      const petName = petTemplate.name;

      db.prepare(`
        INSERT INTO pets (character_id, pet_id, name, level, exp, hp, max_hp, attack, defense, speed)
        VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?)
      `).run(character.id, monster.petId, petName, stats.maxHp, stats.maxHp, stats.attack, stats.defense, stats.speed);

      logs.push(`捕捉成功！${monster.name}成为了你的宠物！`);

      db.prepare(`
        INSERT INTO battle_logs (character_id, monster_id, result, exp_gained, gold_gained, pet_caught)
        VALUES (?, ?, 'captured', ?, ?, 1)
      `).run(character.id, monster.id, 0, 0);

      db.prepare('DELETE FROM active_battles WHERE character_id = ?').run(character.id);

      res.json({
        logs,
        battleEnded: true,
        battleResult: {
          type: 'captured',
          pet: {
            id: monster.petId,
            name: petName,
            type: petTemplate.type,
            level: 1
          }
        },
        battle: null
      });
    } else {
      logs.push('捕捉失败！该怪物无法被捕捉。');
      res.json({ logs, battleEnded: false, battle: activeBattle });
    }
  } else {
    logs.push(`捕捉失败！(${roll.toFixed(1)}% > ${totalRate.toFixed(1)}%)`);

    const monsterDamage = Math.max(1, monster.attack - character.defense + Math.floor(Math.random() * 5));
    activeBattle.player_hp -= monsterDamage;
    logs.push(`${monster.name}趁机攻击，对你造成了${monsterDamage}点伤害！`);

    let battleEnded = false;
    let battleResult = null;
    if (activeBattle.player_hp <= 0) {
      battleEnded = true;
      battleResult = handleDefeat(character, activeBattle, monster);
      logs.push(`你被${monster.name}击败了...`);
      db.prepare('DELETE FROM active_battles WHERE character_id = ?').run(character.id);
    } else {
      activeBattle.turn += 1;
      db.prepare(`
        UPDATE active_battles 
        SET monster_hp = ?, player_hp = ?, turn = ?
        WHERE character_id = ?
      `).run(activeBattle.monster_hp, activeBattle.player_hp, activeBattle.turn, character.id);
    }

    const updatedCharacter = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

    res.json({
      logs,
      battleEnded,
      battleResult,
      battle: battleEnded ? null : {
        ...activeBattle,
        monster: {
          ...monster,
          currentHp: activeBattle.monster_hp
        },
        playerHp: activeBattle.player_hp,
        playerMaxHp: activeBattle.player_max_hp
      },
      character: {
        ...updatedCharacter,
        expToNext: updatedCharacter.level * 100
      }
    });
  }
});

router.post('/flee', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const activeBattle = db.prepare('SELECT * FROM active_battles WHERE character_id = ?').get(character.id);
  if (!activeBattle) {
    return res.status(400).json({ error: '当前没有进行中的战斗' });
  }

  const monster = getMonsterById(activeBattle.monster_id);
  const logs = [];

  const fleeChance = Math.min(30 + (character.speed - monster.speed) * 5, 90);
  const roll = Math.random() * 100;
  const success = roll < fleeChance;

  if (success) {
    logs.push(`逃跑成功！(${roll.toFixed(1)}% < ${fleeChance.toFixed(1)}%)`);
    db.prepare('DELETE FROM active_battles WHERE character_id = ?').run(character.id);

    db.prepare(`
      INSERT INTO battle_logs (character_id, monster_id, result, exp_gained, gold_gained)
      VALUES (?, ?, 'fled', 0, 0)
    `).run(character.id, monster.id);

    res.json({
      logs,
      battleEnded: true,
      battleResult: { type: 'fled' },
      battle: null
    });
  } else {
    logs.push(`逃跑失败！(${roll.toFixed(1)}% > ${fleeChance.toFixed(1)}%)`);

    const monsterDamage = Math.max(1, monster.attack - character.defense + Math.floor(Math.random() * 5));
    activeBattle.player_hp -= monsterDamage;
    logs.push(`${monster.name}追上了你，造成了${monsterDamage}点伤害！`);

    let battleEnded = false;
    let battleResult = null;
    if (activeBattle.player_hp <= 0) {
      battleEnded = true;
      battleResult = handleDefeat(character, activeBattle, monster);
      logs.push(`你被${monster.name}击败了...`);
      db.prepare('DELETE FROM active_battles WHERE character_id = ?').run(character.id);
    } else {
      activeBattle.turn += 1;
      db.prepare(`
        UPDATE active_battles 
        SET player_hp = ?, turn = ?
        WHERE character_id = ?
      `).run(activeBattle.player_hp, activeBattle.turn, character.id);
    }

    const updatedCharacter = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

    res.json({
      logs,
      battleEnded,
      battleResult,
      battle: battleEnded ? null : {
        ...activeBattle,
        monster: {
          ...monster,
          currentHp: activeBattle.monster_hp
        },
        playerHp: activeBattle.player_hp,
        playerMaxHp: activeBattle.player_max_hp
      },
      character: {
        ...updatedCharacter,
        expToNext: updatedCharacter.level * 100
      }
    });
  }
});

function handleVictory(character, activeBattle, monster) {
  const expGained = monster.exp;
  const goldGained = monster.gold;
  let newExp = character.exp + expGained;
  let newGold = character.gold + goldGained;
  let newLevel = character.level;
  let newMaxHp = character.max_hp;
  let newMaxMp = character.max_mp;
  let newHp = character.hp;
  let leveledUp = false;

  const expForLevel = newLevel * 100;
  if (newExp >= expForLevel) {
    const realmIndex = getRealmIndex(character.realm);
    const nextRealm = getRealmByIndex(realmIndex + 1);
    const maxLevel = nextRealm ? nextRealm.levelReq - 1 : 999;

    if (newLevel < maxLevel) {
      newLevel += 1;
      newMaxHp += 10;
      newMaxMp += 5;
      newHp = newMaxHp;
      leveledUp = true;
      newExp = newExp - expForLevel;
    } else {
      newExp = expForLevel - 1;
    }
  }

  db.prepare(`
    UPDATE characters SET exp = ?, level = ?, max_hp = ?, max_mp = ?, hp = ?, gold = ? WHERE id = ?
  `).run(newExp, newLevel, newMaxHp, newMaxMp, newHp, newGold, character.id);

  if (activeBattle.pet_id) {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(activeBattle.pet_id);
    if (pet) {
      const petExpGained = Math.floor(expGained * 0.5);
      let petNewExp = pet.exp + petExpGained;
      let petNewLevel = pet.level;
      const petExpForLevel = petNewLevel * 80;

      if (petNewExp >= petExpForLevel) {
        petNewLevel += 1;
        petNewExp = petNewExp - petExpForLevel;
        const petStats = calculatePetStats({ pet_id: pet.pet_id }, petNewLevel);
        db.prepare(`
          UPDATE pets SET level = ?, exp = ?, max_hp = ?, hp = max_hp, attack = ?, defense = ?, speed = ? WHERE id = ?
        `).run(petNewLevel, petNewExp, petStats.maxHp, petStats.attack, petStats.defense, petStats.speed, pet.id);
      } else {
        db.prepare('UPDATE pets SET exp = ?, hp = ? WHERE id = ?').run(petNewExp, Math.min(pet.hp, pet.max_hp), pet.id);
      }
    }
  }

  db.prepare(`
    INSERT INTO battle_logs (character_id, monster_id, result, exp_gained, gold_gained)
    VALUES (?, ?, 'victory', ?, ?)
  `).run(character.id, monster.id, expGained, goldGained);

  updateActiveQuestProgress(character.id, 'combat', 1);

  return {
    type: 'victory',
    expGained,
    goldGained,
    newExp,
    newGold,
    newLevel,
    leveledUp,
    newMaxHp,
    newMaxMp
  };
}

function handleDefeat(character, activeBattle, monster) {
  const expLoss = Math.floor(character.exp * 0.1);
  const goldLoss = Math.floor(character.gold * 0.1);
  const newExp = Math.max(0, character.exp - expLoss);
  const newGold = Math.max(0, character.gold - goldLoss);
  const newHp = Math.floor(character.max_hp * 0.3);

  db.prepare(`
    UPDATE characters SET exp = ?, gold = ?, hp = ? WHERE id = ?
  `).run(newExp, newGold, newHp, character.id);

  db.prepare(`
    INSERT INTO battle_logs (character_id, monster_id, result, exp_gained, gold_gained)
    VALUES (?, ?, 'defeat', 0, 0)
  `).run(character.id, monster.id);

  return {
    type: 'defeat',
    expLoss,
    goldLoss,
    newExp,
    newGold,
    newHp
  };
}

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
