const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getPetById, PET_TYPES, PET_TYPE_COLORS, calculatePetStats } = require('../gameData');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const pets = db.prepare('SELECT * FROM pets WHERE character_id = ? ORDER BY active DESC, level DESC').all(character.id);
  const petsWithDetails = pets.map(pet => {
    const petInfo = getPetById(pet.pet_id);
    return {
      ...pet,
      petInfo,
      typeColor: PET_TYPE_COLORS[petInfo.type] || '#9ca3af',
      expToNext: pet.level * 80
    };
  });

  const activePet = petsWithDetails.find(p => p.active === 1) || null;

  res.json({
    pets: petsWithDetails,
    activePet,
    petTypes: PET_TYPES,
    petTypeColors: PET_TYPE_COLORS
  });
});

router.post('/activate/:petId', auth, (req, res) => {
  const { petId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND character_id = ?').get(petId, character.id);
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }

  if (pet.hp <= 0) {
    return res.status(400).json({ error: '该宠物已失去战斗能力，请先恢复' });
  }

  const transaction = db.transaction(() => {
    db.prepare('UPDATE pets SET active = 0 WHERE character_id = ?').run(character.id);
    db.prepare('UPDATE pets SET active = 1 WHERE id = ?').run(petId);
  });

  transaction();

  const pets = db.prepare('SELECT * FROM pets WHERE character_id = ? ORDER BY active DESC, level DESC').all(character.id);
  const petsWithDetails = pets.map(p => {
    const petInfo = getPetById(p.pet_id);
    return {
      ...p,
      petInfo,
      typeColor: PET_TYPE_COLORS[petInfo.type] || '#9ca3af',
      expToNext: p.level * 80
    };
  });

  res.json({
    message: `${pet.name}已出战！`,
    pets: petsWithDetails,
    activePet: petsWithDetails.find(p => p.active === 1)
  });
});

router.post('/rest/:petId', auth, (req, res) => {
  const { petId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND character_id = ?').get(petId, character.id);
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }

  const healAmount = Math.floor(pet.max_hp * 0.3);
  const newHp = Math.min(pet.hp + healAmount, pet.max_hp);

  db.prepare('UPDATE pets SET hp = ?, active = 0 WHERE id = ?').run(newHp, petId);

  const pets = db.prepare('SELECT * FROM pets WHERE character_id = ? ORDER BY active DESC, level DESC').all(character.id);
  const petsWithDetails = pets.map(p => {
    const petInfo = getPetById(p.pet_id);
    return {
      ...p,
      petInfo,
      typeColor: PET_TYPE_COLORS[petInfo.type] || '#9ca3af',
      expToNext: p.level * 80
    };
  });

  res.json({
    message: `${pet.name}休息中，恢复了${newHp - pet.hp}点生命值`,
    pets: petsWithDetails,
    activePet: petsWithDetails.find(p => p.active === 1) || null,
    healed: newHp - pet.hp
  });
});

router.post('/heal/:petId', auth, (req, res) => {
  const { petId } = req.params;
  const { itemId } = req.body;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND character_id = ?').get(petId, character.id);
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }

  if (itemId) {
    const healItem = db.prepare(`
      SELECT inv.*, items.effect FROM inventory inv
      JOIN items ON inv.item_id = items.id
      WHERE inv.character_id = ? AND inv.item_id = ? AND inv.equipped = 0 AND inv.quantity > 0
    `).get(character.id, itemId);

    if (!healItem) {
      return res.status(400).json({ error: '没有可用的恢复道具' });
    }

    const effect = JSON.parse(healItem.effect);
    let healAmount = 0;
    if (effect.type === 'heal_hp') {
      healAmount = effect.value;
    } else {
      return res.status(400).json({ error: '该道具不能用于恢复宠物' });
    }

    db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?').run(healItem.id);
    db.prepare('DELETE FROM inventory WHERE quantity <= 0 AND id = ?').run(healItem.id);

    const newHp = Math.min(pet.hp + healAmount, pet.max_hp);
    db.prepare('UPDATE pets SET hp = ? WHERE id = ?').run(newHp, petId);

    const pets = db.prepare('SELECT * FROM pets WHERE character_id = ? ORDER BY active DESC, level DESC').all(character.id);
    const petsWithDetails = pets.map(p => {
      const petInfo = getPetById(p.pet_id);
      return {
        ...p,
        petInfo,
        typeColor: PET_TYPE_COLORS[petInfo.type] || '#9ca3af',
        expToNext: p.level * 80
      };
    });

    res.json({
      message: `使用道具恢复了${newHp - pet.hp}点生命值`,
      pets: petsWithDetails,
      healed: newHp - pet.hp
    });
  } else {
    const cost = 10;
    if (character.gold < cost) {
      return res.status(400).json({ error: '金币不足' });
    }

    const healAmount = Math.floor(pet.max_hp * 0.5);
    const newHp = Math.min(pet.hp + healAmount, pet.max_hp);

    db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ?').run(cost, character.id);
    db.prepare('UPDATE pets SET hp = ? WHERE id = ?').run(newHp, petId);

    const pets = db.prepare('SELECT * FROM pets WHERE character_id = ? ORDER BY active DESC, level DESC').all(character.id);
    const petsWithDetails = pets.map(p => {
      const petInfo = getPetById(p.pet_id);
      return {
        ...p,
        petInfo,
        typeColor: PET_TYPE_COLORS[petInfo.type] || '#9ca3af',
        expToNext: p.level * 80
      };
    });

    res.json({
      message: `花费${cost}金币恢复了${newHp - pet.hp}点生命值`,
      pets: petsWithDetails,
      healed: newHp - pet.hp,
      gold: character.gold - cost
    });
  }
});

router.post('/release/:petId', auth, (req, res) => {
  const { petId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND character_id = ?').get(petId, character.id);
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }

  if (pet.active === 1) {
    return res.status(400).json({ error: '出战中的宠物无法放生' });
  }

  const petInfo = getPetById(pet.pet_id);
  const goldReward = Math.floor(petInfo.baseHp * 0.5 + pet.level * 10);

  db.prepare('DELETE FROM pets WHERE id = ?').run(petId);
  db.prepare('UPDATE characters SET gold = gold + ? WHERE id = ?').run(goldReward, character.id);

  const pets = db.prepare('SELECT * FROM pets WHERE character_id = ? ORDER BY active DESC, level DESC').all(character.id);
  const petsWithDetails = pets.map(p => {
    const petInfo = getPetById(p.pet_id);
    return {
      ...p,
      petInfo,
      typeColor: PET_TYPE_COLORS[petInfo.type] || '#9ca3af',
      expToNext: p.level * 80
    };
  });

  res.json({
    message: `放生了${pet.name}，获得${goldReward}金币`,
    pets: petsWithDetails,
    goldReward,
    gold: character.gold + goldReward
  });
});

module.exports = router;
