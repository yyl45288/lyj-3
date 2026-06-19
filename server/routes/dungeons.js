const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const {
  getMonsterById,
  getPetById,
  getItemById,
  getRealmIndex,
  calculatePetStats
} = require('../gameData');
const { addSkillProficiency } = require('./skills');

const router = express.Router();

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function grantRewards(characterId, rewards) {
  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
  if (!character || !rewards) return;

  const r = typeof rewards === 'string' ? JSON.parse(rewards) : rewards;
  let newGold = character.gold;
  let newExp = character.exp;
  let newLevel = character.level;
  let newMaxHp = character.max_hp;
  let newMaxMp = character.max_mp;
  let newHp = character.hp;
  let newMp = character.mp;
  let leveledUp = false;

  if (r.gold) newGold += r.gold;
  if (r.exp) {
    newExp += r.exp;
    const realmIndex = getRealmIndex(character.realm);
    const { getRealmByIndex } = require('../gameData');
    const nextRealm = getRealmByIndex(realmIndex + 1);
    const maxLevel = nextRealm ? nextRealm.levelReq : 999;
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
      newExp = expForLevel - 1;
    }
  }

  db.prepare(`
    UPDATE characters SET gold = ?, exp = ?, level = ?, max_hp = ?, max_mp = ?, hp = ?, mp = ?
    WHERE id = ?
  `).run(newGold, newExp, newLevel, newMaxHp, newMaxMp, newHp, newMp, characterId);

  if (r.items && r.items.length > 0) {
    for (const itemReward of r.items) {
      const item = getItemById(itemReward.itemId);
      if (item) {
        const existing = db.prepare(`
          SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0
        `).get(characterId, itemReward.itemId);
        if (existing) {
          db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
            .run(itemReward.quantity, existing.id);
        } else {
          db.prepare(`
            INSERT INTO inventory (character_id, item_id, quantity, equipped, slot)
            VALUES (?, ?, ?, 0, NULL)
          `).run(characterId, itemReward.itemId, itemReward.quantity);
        }
      }
    }
  }

  return { gold: r.gold || 0, exp: r.exp || 0, items: r.items || [], newLevel, leveledUp };
}

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const dungeons = db.prepare('SELECT * FROM dungeons ORDER BY sort_order, id').all();
  const today = getTodayDate();

  const dungeonsWithDetails = dungeons.map(d => {
    const monsters = d.monsters ? (typeof d.monsters === 'string' ? JSON.parse(d.monsters) : d.monsters) : [];
    const firstClear = d.first_clear_rewards ? (typeof d.first_clear_rewards === 'string' ? JSON.parse(d.first_clear_rewards) : d.first_clear_rewards) : {};
    const clearRewards = d.clear_rewards ? (typeof d.clear_rewards === 'string' ? JSON.parse(d.clear_rewards) : d.clear_rewards) : {};
    const canEnter = character.level >= (d.level_req || 1);

    const record = db.prepare(`
      SELECT * FROM dungeon_records WHERE character_id = ? AND dungeon_id = ? AND challenge_date = ?
    `).get(character.id, d.id, today);

    const allTimeRecord = db.prepare(`
      SELECT MAX(first_cleared) as cleared, MAX(cleared_count) as total_cleared
      FROM dungeon_records WHERE character_id = ? AND dungeon_id = ?
    `).get(character.id, d.id);

    return {
      ...d,
      monsters,
      firstClearRewards: firstClear,
      clearRewards,
      canEnter,
      unlocked: canEnter,
      totalWaves: monsters.length,
      todayCount: record ? record.challenge_count : 0,
      dailyLimit: d.daily_limit || 3,
      canChallengeToday: !record || record.challenge_count < (d.daily_limit || 3),
      firstCleared: allTimeRecord ? allTimeRecord.cleared === 1 : false,
      totalCleared: allTimeRecord ? allTimeRecord.total_cleared || 0 : 0
    };
  });

  const activeBattle = db.prepare('SELECT * FROM dungeon_battles WHERE character_id = ?').get(character.id);

  res.json({
    dungeons: dungeonsWithDetails,
    activeBattle: activeBattle ? {
      ...activeBattle,
      monster: {
        ...getMonsterById(activeBattle.monster_id),
        currentHp: activeBattle.monster_hp
      }
    } : null,
    currentLevel: character.level
  });
});

router.post('/challenge/:dungeonId', auth, (req, res) => {
  const { dungeonId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const existing = db.prepare('SELECT * FROM dungeon_battles WHERE character_id = ?').get(character.id);
  if (existing) {
    return res.status(400).json({ error: '当前有进行中的副本战斗' });
  }

  const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(dungeonId);
  if (!dungeon) {
    return res.status(404).json({ error: '副本不存在' });
  }

  if (character.level < (dungeon.level_req || 1)) {
    return res.status(400).json({ error: `等级不足，需要${dungeon.level_req}级` });
  }

  if (dungeon.realm_req) {
    const reqIdx = getRealmIndex(dungeon.realm_req);
    const charIdx = getRealmIndex(character.realm);
    if (charIdx < reqIdx) {
      return res.status(400).json({ error: `境界不足，需要${dungeon.realm_req}` });
    }
  }

  if (character.hp <= 0) {
    return res.status(400).json({ error: '生命值为0，无法挑战副本' });
  }

  const today = getTodayDate();
  const dailyLimit = dungeon.daily_limit || 3;
  let record = db.prepare(`
    SELECT * FROM dungeon_records WHERE character_id = ? AND dungeon_id = ? AND challenge_date = ?
  `).get(character.id, dungeon.id, today);

  if (record && record.challenge_count >= dailyLimit) {
    return res.status(400).json({ error: `今日挑战次数已用完（${dailyLimit}次）` });
  }

  const waves = dungeon.monsters ? (typeof dungeon.monsters === 'string' ? JSON.parse(dungeon.monsters) : dungeon.monsters) : [];
  if (waves.length === 0) {
    return res.status(400).json({ error: '副本配置错误：没有怪物' });
  }

  const firstWaveMonsters = waves[0] || [];
  const monsterId = firstWaveMonsters[Math.floor(Math.random() * firstWaveMonsters.length)];
  const monster = getMonsterById(monsterId);
  if (!monster) {
    return res.status(400).json({ error: '副本配置错误：怪物不存在' });
  }

  const transaction = db.transaction(() => {
    if (record) {
      db.prepare('UPDATE dungeon_records SET challenge_count = challenge_count + 1 WHERE id = ?').run(record.id);
    } else {
      const r = db.prepare(`
        INSERT INTO dungeon_records (character_id, dungeon_id, challenge_date, challenge_count, first_cleared, cleared_count)
        VALUES (?, ?, ?, 1, 0, 0)
      `).run(character.id, dungeon.id, today);
      record = { id: r.lastInsertRowid, challenge_count: 1 };
    }

    const activePet = db.prepare('SELECT * FROM pets WHERE character_id = ? AND active = 1').get(character.id);
    db.prepare(`
      INSERT INTO dungeon_battles (character_id, dungeon_id, current_wave, total_waves, monster_id, monster_hp, monster_max_hp, player_hp, player_max_hp, pet_id, pet_hp, pet_max_hp, turn)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      character.id,
      dungeon.id,
      waves.length,
      monsterId,
      monster.hp,
      monster.hp,
      character.hp,
      character.max_hp,
      activePet ? activePet.id : null,
      activePet ? activePet.hp : null,
      activePet ? activePet.max_hp : null
    );
  });

  try {
    transaction();
    const battle = db.prepare('SELECT * FROM dungeon_battles WHERE character_id = ?').get(character.id);
    res.json({
      message: `进入副本「${dungeon.name}」，第1波遭遇${monster.name}！`,
      battle: {
        ...battle,
        dungeon: { id: dungeon.id, name: dungeon.name },
        monster: {
          ...monster,
          currentHp: battle.monster_hp
        },
        totalWaves: waves.length,
        currentWave: 1
      },
      remainingCount: dailyLimit - record.challenge_count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '进入副本失败' });
  }
});

router.get('/battle', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const battle = db.prepare('SELECT * FROM dungeon_battles WHERE character_id = ?').get(character.id);
  if (!battle) {
    return res.json({ battle: null });
  }

  const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(battle.dungeon_id);
  const monster = getMonsterById(battle.monster_id);
  const activePet = battle.pet_id ? db.prepare('SELECT * FROM pets WHERE id = ?').get(battle.pet_id) : null;
  const petData = activePet ? { ...activePet, petInfo: getPetById(activePet.pet_id) } : null;

  res.json({
    battle: {
      ...battle,
      dungeon: dungeon ? { id: dungeon.id, name: dungeon.name } : null,
      monster: {
        ...monster,
        currentHp: battle.monster_hp
      },
      pet: petData
    }
  });
});

router.post('/attack', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const battle = db.prepare('SELECT * FROM dungeon_battles WHERE character_id = ?').get(character.id);
  if (!battle) {
    return res.status(400).json({ error: '没有进行中的副本战斗' });
  }

  const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(battle.dungeon_id);
  const monster = getMonsterById(battle.monster_id);
  const logs = [];
  let battleEnded = false;
  let battleResult = null;
  let nextWave = false;

  const playerDamage = Math.max(1, character.attack - monster.defense + Math.floor(Math.random() * 10));
  battle.monster_hp -= playerDamage;
  logs.push(`你对${monster.name}造成了${playerDamage}点伤害！`);

  if (battle.monster_hp <= 0) {
    logs.push(`${monster.name}被击败了！`);
    if (battle.current_wave >= battle.total_waves) {
      battleEnded = true;
      battleResult = handleDungeonVictory(character, battle, dungeon);
    } else {
      nextWave = true;
    }
  } else {
    if (battle.pet_id && battle.pet_hp > 0) {
      const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(battle.pet_id);
      const petInfo = getPetById(pet.pet_id);
      const petDamage = Math.max(1, pet.attack - monster.defense + Math.floor(Math.random() * 5));
      battle.monster_hp -= petDamage;
      logs.push(`${pet.name}对${monster.name}造成了${petDamage}点伤害！`);
      if (battle.monster_hp <= 0) {
        logs.push(`${monster.name}被击败了！`);
        if (battle.current_wave >= battle.total_waves) {
          battleEnded = true;
          battleResult = handleDungeonVictory(character, battle, dungeon);
        } else {
          nextWave = true;
        }
      }
    }

    if (!battleEnded && !nextWave) {
      if (battle.pet_id && battle.pet_hp > 0 && Math.random() < 0.5) {
        const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(battle.pet_id);
        const petInfo = getPetById(pet.pet_id);
        const dmg = Math.max(1, monster.attack - pet.defense + Math.floor(Math.random() * 5));
        battle.pet_hp -= dmg;
        logs.push(`${monster.name}对${pet.name}造成了${dmg}点伤害！`);
        if (battle.pet_hp <= 0) {
          battle.pet_hp = 0;
          logs.push(`${pet.name}失去了战斗能力！`);
        }
      } else {
        const dmg = Math.max(1, monster.attack - character.defense + Math.floor(Math.random() * 5));
        battle.player_hp -= dmg;
        logs.push(`${monster.name}对你造成了${dmg}点伤害！`);
        if (battle.player_hp <= 0) {
          battleEnded = true;
          battleResult = handleDungeonDefeat(character, battle, dungeon);
          logs.push(`你被${monster.name}击败了...`);
        }
      }
    }
  }

  if (nextWave) {
    const waves = dungeon.monsters ? (typeof dungeon.monsters === 'string' ? JSON.parse(dungeon.monsters) : dungeon.monsters) : [];
    const nextWaveIdx = battle.current_wave;
    if (nextWaveIdx < waves.length) {
      const nextWaveMonsters = waves[nextWaveIdx] || [];
      const nextMonsterId = nextWaveMonsters[Math.floor(Math.random() * nextWaveMonsters.length)];
      const nextMonster = getMonsterById(nextMonsterId);
      if (nextMonster) {
        battle.current_wave += 1;
        battle.monster_id = nextMonsterId;
        battle.monster_hp = nextMonster.hp;
        battle.monster_max_hp = nextMonster.hp;
        battle.turn = 1;
        logs.push(`第${battle.current_wave}波：${nextMonster.name}出现了！`);
      }
    }
  }

  if (battleEnded) {
    db.prepare('DELETE FROM dungeon_battles WHERE character_id = ?').run(character.id);
  } else {
    battle.turn += 1;
    db.prepare(`
      UPDATE dungeon_battles SET monster_hp = ?, monster_id = ?, current_wave = ?, player_hp = ?, pet_hp = ?, turn = ?
      WHERE character_id = ?
    `).run(battle.monster_hp, battle.monster_id, battle.current_wave, battle.player_hp, battle.pet_hp, battle.turn, character.id);
  }

  const updatedChar = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const activePet = battle.pet_id ? db.prepare('SELECT * FROM pets WHERE id = ?').get(battle.pet_id) : null;
  const petData = activePet ? { ...activePet, petInfo: getPetById(activePet.pet_id) } : null;
  const currentMonster = getMonsterById(battle.monster_id);

  res.json({
    logs,
    battleEnded,
    battleResult,
    nextWave,
    battle: battleEnded ? null : {
      ...battle,
      dungeon: { id: dungeon.id, name: dungeon.name },
      monster: {
        ...currentMonster,
        currentHp: battle.monster_hp
      },
      pet: petData,
      playerHp: battle.player_hp,
      playerMaxHp: battle.player_max_hp,
      petHp: battle.pet_hp,
      petMaxHp: battle.pet_max_hp
    },
    character: {
      ...updatedChar,
      expToNext: updatedChar.level * 100
    }
  });
});

function handleDungeonVictory(character, battle, dungeon) {
  const today = getTodayDate();
  const record = db.prepare(`
    SELECT * FROM dungeon_records WHERE character_id = ? AND dungeon_id = ? AND challenge_date = ?
  `).get(character.id, dungeon.id, today);

  const isFirstClear = !record || record.first_cleared !== 1;
  let rewardsResult;

  const transaction = db.transaction(() => {
    if (isFirstClear) {
      rewardsResult = grantRewards(character.id, dungeon.first_clear_rewards);
      db.prepare(`
        UPDATE dungeon_records SET first_cleared = 1, cleared_count = cleared_count + 1, first_cleared_at = datetime('now')
        WHERE character_id = ? AND dungeon_id = ? AND challenge_date = ?
      `).run(character.id, dungeon.id, today);
    } else {
      rewardsResult = grantRewards(character.id, dungeon.clear_rewards);
      db.prepare(`
        UPDATE dungeon_records SET cleared_count = cleared_count + 1
        WHERE character_id = ? AND dungeon_id = ? AND challenge_date = ?
      `).run(character.id, dungeon.id, today);
    }

    db.prepare('UPDATE characters SET hp = ? WHERE id = ?').run(Math.max(1, battle.player_hp), character.id);
    if (battle.pet_id) {
      db.prepare('UPDATE pets SET hp = ? WHERE id = ?').run(Math.max(1, battle.pet_hp), battle.pet_id);
    }
  });

  transaction();

  return {
    type: 'victory',
    isFirstClear,
    rewards: rewardsResult,
    message: isFirstClear ? '🎉 首次通关！' : '🎉 通关成功！'
  };
}

function handleDungeonDefeat(character, battle, dungeon) {
  const expLoss = Math.floor(character.exp * 0.05);
  const newExp = Math.max(0, character.exp - expLoss);
  const newHp = Math.floor(character.max_hp * 0.2);

  db.prepare('UPDATE characters SET exp = ?, hp = ? WHERE id = ?').run(newExp, newHp, character.id);

  if (battle.pet_id) {
    const petNewHp = Math.floor(battle.pet_max_hp * 0.2);
    db.prepare('UPDATE pets SET hp = ? WHERE id = ?').run(petNewHp, battle.pet_id);
  }

  return {
    type: 'defeat',
    expLoss,
    newHp,
    newExp
  };
}

router.post('/flee', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const battle = db.prepare('SELECT * FROM dungeon_battles WHERE character_id = ?').get(character.id);
  if (!battle) {
    return res.status(400).json({ error: '没有进行中的副本战斗' });
  }

  const transaction = db.transaction(() => {
    db.prepare('UPDATE characters SET hp = ? WHERE id = ?').run(Math.max(1, battle.player_hp), character.id);
    if (battle.pet_id) {
      db.prepare('UPDATE pets SET hp = ? WHERE id = ?').run(Math.max(1, battle.pet_hp), battle.pet_id);
    }
    db.prepare('DELETE FROM dungeon_battles WHERE character_id = ?').run(character.id);
  });

  try {
    transaction();
    res.json({
      message: '已退出副本',
      battleEnded: true,
      battleResult: { type: 'fled' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '退出副本失败' });
  }
});

module.exports = router;
