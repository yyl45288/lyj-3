const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const {
  getRealmIndex,
  getProficiencyToNextLevel,
  applyPassiveSkillBonus
} = require('../gameData');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const allSkills = db.prepare('SELECT * FROM skills ORDER BY sort_order, id').all();
  const charSkills = db.prepare(
    'SELECT * FROM character_skills WHERE character_id = ?'
  ).all(character.id);

  const charSkillMap = {};
  for (const cs of charSkills) {
    charSkillMap[cs.skill_id] = cs;
  }

  const skillsWithDetails = allSkills.map(skill => {
    const cs = charSkillMap[skill.id];
    const effect = skill.effect ? (typeof skill.effect === 'string' ? JSON.parse(skill.effect) : skill.effect) : {};
    const growth = skill.growth ? (typeof skill.growth === 'string' ? JSON.parse(skill.growth) : skill.growth) : {};
    const level = cs ? cs.level : 0;
    const proficiency = cs ? cs.proficiency : 0;
    const profToNext = cs && cs.level < (skill.max_level || 10)
      ? getProficiencyToNextLevel(skill, cs.level)
      : 0;

    let canLearn = character.level >= (skill.level_req || 1);
    if (skill.realm_req) {
      const reqRealmIdx = getRealmIndex(skill.realm_req);
      const charRealmIdx = getRealmIndex(character.realm);
      canLearn = canLearn && charRealmIdx >= reqRealmIdx;
    }

    return {
      ...skill,
      effect,
      growth,
      learned: !!cs,
      level,
      proficiency,
      proficiencyToNext: profToNext,
      canLearn,
      learnedAt: cs ? cs.learned_at : null
    };
  });

  const learned = skillsWithDetails.filter(s => s.learned);
  const withBonus = applyPassiveSkillBonus(character, learned.filter(s => s.type === 'passive'));

  res.json({
    skills: skillsWithDetails,
    character: {
      ...withBonus,
      maxHp: withBonus.max_hp,
      maxMp: withBonus.max_mp,
      expToNext: withBonus.level * 100
    },
    stats: {
      total: allSkills.length,
      learned: charSkills.length,
      active: learned.filter(s => s.type === 'active').length,
      passive: learned.filter(s => s.type === 'passive').length
    }
  });
});

router.post('/learn/:skillId', auth, (req, res) => {
  const { skillId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId);
  if (!skill) {
    return res.status(404).json({ error: '技能不存在' });
  }

  const existing = db.prepare(
    'SELECT * FROM character_skills WHERE character_id = ? AND skill_id = ?'
  ).get(character.id, skillId);
  if (existing) {
    return res.status(400).json({ error: '已学习该技能' });
  }

  if (character.level < (skill.level_req || 1)) {
    return res.status(400).json({ error: `等级不足，需要${skill.level_req}级` });
  }

  if (skill.realm_req) {
    const reqRealmIdx = getRealmIndex(skill.realm_req);
    const charRealmIdx = getRealmIndex(character.realm);
    if (charRealmIdx < reqRealmIdx) {
      return res.status(400).json({ error: `境界不足，需要${skill.realm_req}` });
    }
  }

  db.prepare(`
    INSERT INTO character_skills (character_id, skill_id, level, proficiency)
    VALUES (?, ?, 1, 0)
  `).run(character.id, skillId);

  const effect = skill.effect ? (typeof skill.effect === 'string' ? JSON.parse(skill.effect) : skill.effect) : {};
  let updatedChar = { ...character };
  if (skill.type === 'passive' && effect.type === 'passive') {
    const growth = skill.growth ? (typeof skill.growth === 'string' ? JSON.parse(skill.growth) : skill.growth) : {};
    const totalValue = (effect.value || 0);
    if (effect.stat === 'max_hp') updatedChar.max_hp += totalValue;
    if (effect.stat === 'max_mp') updatedChar.max_mp += totalValue;
    if (effect.stat === 'attack') updatedChar.attack += totalValue;
    if (effect.stat === 'defense') updatedChar.defense += totalValue;
    if (effect.stat === 'speed') updatedChar.speed += totalValue;
    if (effect.stat === 'max_hp' || effect.stat === 'max_mp') {
      db.prepare(`
        UPDATE characters SET max_hp = ?, max_mp = ?, attack = ?, defense = ?, speed = ?
        WHERE id = ?
      `).run(updatedChar.max_hp, updatedChar.max_mp, updatedChar.attack, updatedChar.defense, updatedChar.speed, character.id);
    } else if (effect.stat === 'attack' || effect.stat === 'defense' || effect.stat === 'speed') {
      db.prepare(`
        UPDATE characters SET attack = ?, defense = ?, speed = ? WHERE id = ?
      `).run(updatedChar.attack, updatedChar.defense, updatedChar.speed, character.id);
    }
  }

  res.json({
    message: `成功学习技能「${skill.name}」！`,
    skill: {
      id: skill.id,
      name: skill.name,
      type: skill.type,
      level: 1,
      proficiency: 0
    },
    character: {
      ...updatedChar,
      maxHp: updatedChar.max_hp,
      maxMp: updatedChar.max_mp
    }
  });
});

router.post('/upgrade/:skillId', auth, (req, res) => {
  const { skillId } = req.params;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId);
  if (!skill) {
    return res.status(404).json({ error: '技能不存在' });
  }

  const charSkill = db.prepare(
    'SELECT * FROM character_skills WHERE character_id = ? AND skill_id = ?'
  ).get(character.id, skillId);
  if (!charSkill) {
    return res.status(400).json({ error: '尚未学习该技能' });
  }

  const maxLevel = skill.max_level || 10;
  if (charSkill.level >= maxLevel) {
    return res.status(400).json({ error: '技能已满级' });
  }

  const requiredProf = getProficiencyToNextLevel(skill, charSkill.level);
  if (charSkill.proficiency < requiredProf) {
    return res.status(400).json({ error: `熟练度不足，需要${requiredProf}点` });
  }

  const effect = skill.effect ? (typeof skill.effect === 'string' ? JSON.parse(skill.effect) : skill.effect) : {};
  const growth = skill.growth ? (typeof skill.growth === 'string' ? JSON.parse(skill.growth) : skill.growth) : {};

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE character_skills SET level = level + 1, proficiency = proficiency - ?
      WHERE id = ?
    `).run(requiredProf, charSkill.id);

    if (skill.type === 'passive' && effect.type === 'passive') {
      const increment = growth.valuePerLevel || 0;
      let currentChar = { ...character };
      if (effect.stat === 'max_hp') currentChar.max_hp += increment;
      if (effect.stat === 'max_mp') currentChar.max_mp += increment;
      if (effect.stat === 'attack') currentChar.attack += increment;
      if (effect.stat === 'defense') currentChar.defense += increment;
      if (effect.stat === 'speed') currentChar.speed += increment;
      db.prepare(`
        UPDATE characters SET max_hp = ?, max_mp = ?, attack = ?, defense = ?, speed = ? WHERE id = ?
      `).run(currentChar.max_hp, currentChar.max_mp, currentChar.attack, currentChar.defense, currentChar.speed, character.id);
    }
  });

  try {
    transaction();
    const newCharSkill = db.prepare(
      'SELECT * FROM character_skills WHERE id = ?'
    ).get(charSkill.id);
    const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
    res.json({
      message: `技能「${skill.name}」升级至${newCharSkill.level}级！`,
      skill: {
        id: skill.id,
        level: newCharSkill.level,
        proficiency: newCharSkill.proficiency,
        proficiencyToNext: newCharSkill.level < maxLevel
          ? getProficiencyToNextLevel(skill, newCharSkill.level)
          : 0
      },
      character: {
        ...updatedChar,
        maxHp: updatedChar.max_hp,
        maxMp: updatedChar.max_mp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '技能升级失败' });
  }
});

function addSkillProficiency(characterId, skillId, amount = 10) {
  const charSkill = db.prepare(
    'SELECT * FROM character_skills WHERE character_id = ? AND skill_id = ?'
  ).get(characterId, skillId);
  if (!charSkill) return;

  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId);
  if (!skill) return;

  const maxLevel = skill.max_level || 10;
  const requiredProf = charSkill.level < maxLevel
    ? getProficiencyToNextLevel(skill, charSkill.level)
    : Infinity;

  const newProf = Math.min(charSkill.proficiency + amount, requiredProf);
  db.prepare('UPDATE character_skills SET proficiency = ? WHERE id = ?')
    .run(newProf, charSkill.id);
}

module.exports = router;
module.exports.addSkillProficiency = addSkillProficiency;
