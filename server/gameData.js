const REALMS = [
  { name: '练气期', levelReq: 1, expReq: 0, hpBonus: 0, mpBonus: 0, atkBonus: 0, defBonus: 0, speedBonus: 0, baseSuccessRate: 100 },
  { name: '筑基期', levelReq: 10, expReq: 1000, hpBonus: 50, mpBonus: 30, atkBonus: 5, defBonus: 3, speedBonus: 2, baseSuccessRate: 90 },
  { name: '金丹期', levelReq: 20, expReq: 5000, hpBonus: 150, mpBonus: 80, atkBonus: 15, defBonus: 10, speedBonus: 5, baseSuccessRate: 80 },
  { name: '元婴期', levelReq: 30, expReq: 15000, hpBonus: 300, mpBonus: 150, atkBonus: 30, defBonus: 20, speedBonus: 10, baseSuccessRate: 70 },
  { name: '化神期', levelReq: 40, expReq: 40000, hpBonus: 600, mpBonus: 300, atkBonus: 60, defBonus: 40, speedBonus: 20, baseSuccessRate: 60 },
  { name: '合体期', levelReq: 50, expReq: 100000, hpBonus: 1200, mpBonus: 600, atkBonus: 120, defBonus: 80, speedBonus: 40, baseSuccessRate: 50 },
  { name: '大乘期', levelReq: 60, expReq: 250000, hpBonus: 2500, mpBonus: 1200, atkBonus: 250, defBonus: 150, speedBonus: 80, baseSuccessRate: 40 },
  { name: '渡劫期', levelReq: 70, expReq: 600000, hpBonus: 5000, mpBonus: 2500, atkBonus: 500, defBonus: 300, speedBonus: 150, baseSuccessRate: 30 },
  { name: '仙人', levelReq: 80, expReq: 1500000, hpBonus: 10000, mpBonus: 5000, atkBonus: 1000, defBonus: 600, speedBonus: 300, baseSuccessRate: 20 }
];

const MAPS = [
  { id: 1, name: '青冥山', description: '入门修士常去的修炼之地，灵气较为稀薄', levelReq: 1, 
    monsters: [1, 2, 3], dropItems: [1, 3, 601, 602, 101, 201, 301, 401, 501], encounterRate: 0.4, dropRate: 0.3 },
  { id: 2, name: '黑风谷', description: '常有妖兽出没的危险峡谷', levelReq: 10,
    monsters: [4, 5, 6], dropItems: [2, 4, 602, 603, 102, 202, 302, 402, 502], encounterRate: 0.5, dropRate: 0.35 },
  { id: 3, name: '万妖林', description: '广袤的妖兽森林，危机四伏', levelReq: 20,
    monsters: [7, 8, 9], dropItems: [5, 6, 603, 604, 103, 203, 303, 403, 503], encounterRate: 0.55, dropRate: 0.4 },
  { id: 4, name: '毒龙沼泽', description: '瘴气弥漫的沼泽地，藏有剧毒妖兽', levelReq: 30,
    monsters: [10, 11, 12], dropItems: [2, 5, 603, 604, 701, 103, 203, 303, 403, 503], encounterRate: 0.6, dropRate: 0.4 },
  { id: 5, name: '极寒冰原', description: '终年积雪的冰原，适合高阶修士历练', levelReq: 45,
    monsters: [13, 14, 15], dropItems: [6, 604, 605, 701, 702, 104, 204, 304, 404, 504], encounterRate: 0.65, dropRate: 0.45 },
  { id: 6, name: '天魔窟', description: '上古魔族遗迹，蕴含强大的魔族气息', levelReq: 60,
    monsters: [16, 17, 18], dropItems: [605, 702, 703, 105, 205, 305, 405, 505], encounterRate: 0.7, dropRate: 0.5 }
];

const MONSTERS = [
  { id: 1, name: '野兔妖', level: 1, hp: 50, attack: 8, defense: 2, speed: 6, exp: 15, gold: 5, 
    catchRate: 40, petId: 1, description: '低级妖兽，攻击性弱' },
  { id: 2, name: '青蛇妖', level: 3, hp: 70, attack: 12, defense: 3, speed: 8, exp: 25, gold: 8,
    catchRate: 35, petId: 2, description: '灵活的蛇妖，有轻微毒性' },
  { id: 3, name: '野狼妖', level: 5, hp: 100, attack: 15, defense: 5, speed: 10, exp: 40, gold: 12,
    catchRate: 30, petId: 3, description: '凶猛的狼妖，成群出没' },
  { id: 4, name: '黑熊妖', level: 12, hp: 200, attack: 25, defense: 12, speed: 8, exp: 80, gold: 25,
    catchRate: 25, petId: 4, description: '力大无穷的黑熊妖' },
  { id: 5, name: '花豹妖', level: 15, hp: 180, attack: 30, defense: 10, speed: 18, exp: 100, gold: 30,
    catchRate: 22, petId: 5, description: '速度极快的花豹妖' },
  { id: 6, name: '石巨人', level: 18, hp: 350, attack: 28, defense: 25, speed: 5, exp: 120, gold: 40,
    catchRate: 15, petId: 6, description: '岩石凝聚的巨人，防御极高' },
  { id: 7, name: '树妖', level: 22, hp: 400, attack: 35, defense: 20, speed: 6, exp: 180, gold: 50,
    catchRate: 20, petId: 7, description: '千年老树成精，生命力顽强' },
  { id: 8, name: '赤焰狐', level: 25, hp: 300, attack: 45, defense: 15, speed: 25, exp: 220, gold: 65,
    catchRate: 18, petId: 8, description: '操控火焰的灵狐' },
  { id: 9, name: '铁甲犀', level: 28, hp: 500, attack: 40, defense: 35, speed: 7, exp: 260, gold: 75,
    catchRate: 12, petId: 9, description: '身披铁甲的犀牛妖' },
  { id: 10, name: '毒蜈', level: 32, hp: 450, attack: 55, defense: 20, speed: 20, exp: 350, gold: 90,
    catchRate: 15, petId: 10, description: '剧毒蜈蚣，触之即死' },
  { id: 11, name: '沼泽鳄', level: 35, hp: 600, attack: 50, defense: 30, speed: 12, exp: 400, gold: 100,
    catchRate: 10, petId: 11, description: '潜伏在沼泽中的巨鳄' },
  { id: 12, name: '蛇女', level: 38, hp: 550, attack: 65, defense: 25, speed: 22, exp: 480, gold: 120,
    catchRate: 8, petId: 12, description: '化形的蛇妖，善于魅惑' },
  { id: 13, name: '冰狼', level: 48, hp: 800, attack: 80, defense: 40, speed: 30, exp: 700, gold: 180,
    catchRate: 10, petId: 13, description: '冰原上的狼群首领' },
  { id: 14, name: '雪熊', level: 52, hp: 1000, attack: 90, defense: 50, speed: 10, exp: 850, gold: 220,
    catchRate: 8, petId: 14, description: '庞大的冰雪巨熊' },
  { id: 15, name: '冰凤', level: 55, hp: 900, attack: 120, defense: 45, speed: 40, exp: 1000, gold: 280,
    catchRate: 5, petId: 15, description: '传说中的冰系神鸟' },
  { id: 16, name: '魔将', level: 65, hp: 1500, attack: 150, defense: 70, speed: 25, exp: 1500, gold: 400,
    catchRate: 5, petId: 16, description: '魔族的低级将领' },
  { id: 17, name: '暗魔', level: 70, hp: 1800, attack: 180, defense: 80, speed: 35, exp: 2000, gold: 500,
    catchRate: 3, petId: 17, description: '暗影中的魔族刺客' },
  { id: 18, name: '天魔', level: 75, hp: 2500, attack: 220, defense: 100, speed: 30, exp: 3000, gold: 800,
    catchRate: 2, petId: 18, description: '天魔窟中最强大的存在' }
];

const PETS = [
  { id: 1, name: '野兔妖', type: '普通', baseHp: 50, baseAtk: 8, baseDef: 2, baseSpeed: 6, 
    growthHp: 5, growthAtk: 1.5, growthDef: 0.5, growthSpeed: 1, skill: '猛扑' },
  { id: 2, name: '青蛇妖', type: '普通', baseHp: 70, baseAtk: 12, baseDef: 3, baseSpeed: 8,
    growthHp: 6, growthAtk: 2, growthDef: 0.5, growthSpeed: 1.5, skill: '毒牙' },
  { id: 3, name: '野狼妖', type: '普通', baseHp: 100, baseAtk: 15, baseDef: 5, baseSpeed: 10,
    growthHp: 8, growthAtk: 2.5, growthDef: 0.8, growthSpeed: 1.5, skill: '撕咬' },
  { id: 4, name: '黑熊妖', type: '精英', baseHp: 200, baseAtk: 25, baseDef: 12, baseSpeed: 8,
    growthHp: 15, growthAtk: 3.5, growthDef: 1.8, growthSpeed: 1, skill: '重击' },
  { id: 5, name: '花豹妖', type: '精英', baseHp: 180, baseAtk: 30, baseDef: 10, baseSpeed: 18,
    growthHp: 12, growthAtk: 4.5, growthDef: 1.5, growthSpeed: 2.5, skill: '迅捷' },
  { id: 6, name: '石巨人', type: '精英', baseHp: 350, baseAtk: 28, baseDef: 25, baseSpeed: 5,
    growthHp: 25, growthAtk: 3.5, growthDef: 3.5, growthSpeed: 0.5, skill: '岩石护甲' },
  { id: 7, name: '树妖', type: '稀有', baseHp: 400, baseAtk: 35, baseDef: 20, baseSpeed: 6,
    growthHp: 30, growthAtk: 5, growthDef: 3, growthSpeed: 0.8, skill: '生命汲取' },
  { id: 8, name: '赤焰狐', type: '稀有', baseHp: 300, baseAtk: 45, baseDef: 15, baseSpeed: 25,
    growthHp: 20, growthAtk: 6.5, growthDef: 2, growthSpeed: 3.5, skill: '火焰吐息' },
  { id: 9, name: '铁甲犀', type: '稀有', baseHp: 500, baseAtk: 40, baseDef: 35, baseSpeed: 7,
    growthHp: 35, growthAtk: 5.5, growthDef: 5, growthSpeed: 0.8, skill: '冲锋' },
  { id: 10, name: '毒蜈', type: '史诗', baseHp: 450, baseAtk: 55, baseDef: 20, baseSpeed: 20,
    growthHp: 30, growthAtk: 7.5, growthDef: 2.5, growthSpeed: 2.5, skill: '剧毒领域' },
  { id: 11, name: '沼泽鳄', type: '史诗', baseHp: 600, baseAtk: 50, baseDef: 30, baseSpeed: 12,
    growthHp: 40, growthAtk: 6.5, growthDef: 4, growthSpeed: 1.5, skill: '死亡翻滚' },
  { id: 12, name: '蛇女', type: '史诗', baseHp: 550, baseAtk: 65, baseDef: 25, baseSpeed: 22,
    growthHp: 35, growthAtk: 8.5, growthDef: 3, growthSpeed: 3, skill: '魅惑之眼' },
  { id: 13, name: '冰狼', type: '史诗', baseHp: 800, baseAtk: 80, baseDef: 40, baseSpeed: 30,
    growthHp: 50, growthAtk: 10, growthDef: 5, growthSpeed: 4, skill: '冰霜吐息' },
  { id: 14, name: '雪熊', type: '传说', baseHp: 1000, baseAtk: 90, baseDef: 50, baseSpeed: 10,
    growthHp: 65, growthAtk: 11, growthDef: 7, growthSpeed: 1, skill: '暴雪' },
  { id: 15, name: '冰凤', type: '传说', baseHp: 900, baseAtk: 120, baseDef: 45, baseSpeed: 40,
    growthHp: 55, growthAtk: 15, growthDef: 6, growthSpeed: 5.5, skill: '涅槃重生' },
  { id: 16, name: '魔将', type: '传说', baseHp: 1500, baseAtk: 150, baseDef: 70, baseSpeed: 25,
    growthHp: 90, growthAtk: 18, growthDef: 9, growthSpeed: 3, skill: '魔焰斩' },
  { id: 17, name: '暗魔', type: '神话', baseHp: 1800, baseAtk: 180, baseDef: 80, baseSpeed: 35,
    growthHp: 110, growthAtk: 22, growthDef: 10, growthSpeed: 4.5, skill: '暗影刺杀' },
  { id: 18, name: '天魔', type: '神话', baseHp: 2500, baseAtk: 220, baseDef: 100, baseSpeed: 30,
    growthHp: 150, growthAtk: 28, growthDef: 13, growthSpeed: 4, skill: '天魔解体' }
];

const PET_TYPES = ['普通', '精英', '稀有', '史诗', '传说', '神话'];
const PET_TYPE_COLORS = {
  '普通': '#9ca3af',
  '精英': '#10b981', 
  '稀有': '#3b82f6',
  '史诗': '#8b5cf6',
  '传说': '#f59e0b',
  '神话': '#ef4444'
};

const ITEMS = [
  { id: 1, name: '小还丹', type: 'consumable', subType: 'pill', description: '恢复50点生命值', effect: { type: 'heal_hp', value: 50 }, price: 20 },
  { id: 2, name: '大还丹', type: 'consumable', subType: 'pill', description: '恢复200点生命值', effect: { type: 'heal_hp', value: 200 }, price: 80 },
  { id: 3, name: '聚灵丹', type: 'consumable', subType: 'pill', description: '恢复30点灵力值', effect: { type: 'heal_mp', value: 30 }, price: 25 },
  { id: 4, name: '回灵丹', type: 'consumable', subType: 'pill', description: '恢复100点灵力值', effect: { type: 'heal_mp', value: 100 }, price: 90 },
  { id: 5, name: '悟道丹', type: 'consumable', subType: 'pill', description: '获得100点修炼经验', effect: { type: 'exp', value: 100 }, price: 150 },
  { id: 6, name: '天悟丹', type: 'consumable', subType: 'pill', description: '获得500点修炼经验', effect: { type: 'exp', value: 500 }, price: 600 },

  { id: 101, name: '铁剑', type: 'equipment', subType: 'weapon', quality: 'common', slot: 'weapon', description: '普通铁剑', stats: { attack: 5 }, price: 50 },
  { id: 102, name: '精钢剑', type: 'equipment', subType: 'weapon', quality: 'uncommon', slot: 'weapon', description: '精钢锻造的剑', stats: { attack: 12 }, price: 150 },
  { id: 103, name: '灵纹剑', type: 'equipment', subType: 'weapon', quality: 'rare', slot: 'weapon', description: '刻有灵纹的仙剑', stats: { attack: 25, speed: 3 }, price: 500 },
  { id: 104, name: '天罡剑', type: 'equipment', subType: 'weapon', quality: 'epic', slot: 'weapon', description: '蕴含天罡之气的神剑', stats: { attack: 50, speed: 5 }, price: 2000 },
  { id: 105, name: '诛仙剑', type: 'equipment', subType: 'weapon', quality: 'legendary', slot: 'weapon', description: '传说中诛仙四剑之一', stats: { attack: 100, speed: 10 }, price: 10000 },

  { id: 201, name: '布帽', type: 'equipment', subType: 'helmet', quality: 'common', slot: 'helmet', description: '普通布帽', stats: { defense: 3 }, price: 40 },
  { id: 202, name: '铁盔', type: 'equipment', subType: 'helmet', quality: 'uncommon', slot: 'helmet', description: '铁制头盔', stats: { defense: 8 }, price: 120 },
  { id: 203, name: '灵玉冠', type: 'equipment', subType: 'helmet', quality: 'rare', slot: 'helmet', description: '灵玉打造的冠帽', stats: { defense: 15, mp: 20 }, price: 400 },
  { id: 204, name: '紫金冠', type: 'equipment', subType: 'helmet', quality: 'epic', slot: 'helmet', description: '紫金铸造的宝冠', stats: { defense: 30, mp: 50 }, price: 1800 },
  { id: 205, name: '仙灵冠', type: 'equipment', subType: 'helmet', quality: 'legendary', slot: 'helmet', description: '仙界流传的灵冠', stats: { defense: 60, mp: 100 }, price: 9000 },

  { id: 301, name: '布甲', type: 'equipment', subType: 'armor', quality: 'common', slot: 'armor', description: '普通布甲', stats: { defense: 5, hp: 20 }, price: 60 },
  { id: 302, name: '皮甲', type: 'equipment', subType: 'armor', quality: 'uncommon', slot: 'armor', description: '坚韧皮甲', stats: { defense: 12, hp: 50 }, price: 180 },
  { id: 303, name: '灵丝袍', type: 'equipment', subType: 'armor', quality: 'rare', slot: 'armor', description: '灵丝编织的道袍', stats: { defense: 25, hp: 100, mp: 30 }, price: 600 },
  { id: 304, name: '玄铁甲', type: 'equipment', subType: 'armor', quality: 'epic', slot: 'armor', description: '玄铁铸造的战甲', stats: { defense: 50, hp: 250, mp: 80 }, price: 2500 },
  { id: 305, name: '混元袍', type: 'equipment', subType: 'armor', quality: 'legendary', slot: 'armor', description: '蕴含混元之力的仙袍', stats: { defense: 100, hp: 500, mp: 200 }, price: 12000 },

  { id: 401, name: '草鞋', type: 'equipment', subType: 'boots', quality: 'common', slot: 'boots', description: '普通草鞋', stats: { speed: 3 }, price: 30 },
  { id: 402, name: '鹿皮靴', type: 'equipment', subType: 'boots', quality: 'uncommon', slot: 'boots', description: '灵鹿皮制成的靴子', stats: { speed: 8 }, price: 100 },
  { id: 403, name: '疾风靴', type: 'equipment', subType: 'boots', quality: 'rare', slot: 'boots', description: '蕴含疾风之力', stats: { speed: 15, attack: 5 }, price: 350 },
  { id: 404, name: '追云靴', type: 'equipment', subType: 'boots', quality: 'epic', slot: 'boots', description: '可追云逐月的宝靴', stats: { speed: 30, attack: 10 }, price: 1500 },
  { id: 405, name: '踏星靴', type: 'equipment', subType: 'boots', quality: 'legendary', slot: 'boots', description: '可踏碎星辰的仙靴', stats: { speed: 60, attack: 25 }, price: 8000 },

  { id: 501, name: '木环', type: 'equipment', subType: 'accessory', quality: 'common', slot: 'accessory', description: '普通木环', stats: { hp: 10, mp: 10 }, price: 35 },
  { id: 502, name: '玉佩', type: 'equipment', subType: 'accessory', quality: 'uncommon', slot: 'accessory', description: '温润玉佩', stats: { hp: 30, mp: 30 }, price: 110 },
  { id: 503, name: '灵石坠', type: 'equipment', subType: 'accessory', quality: 'rare', slot: 'accessory', description: '灵石雕琢的吊坠', stats: { hp: 60, mp: 60, defense: 5 }, price: 450 },
  { id: 504, name: '龙纹佩', type: 'equipment', subType: 'accessory', quality: 'epic', slot: 'accessory', description: '刻有龙纹的古佩', stats: { hp: 150, mp: 150, defense: 15 }, price: 2200 },
  { id: 505, name: '混沌珠', type: 'equipment', subType: 'accessory', quality: 'legendary', slot: 'accessory', description: '混沌中诞生的灵珠', stats: { hp: 300, mp: 300, defense: 30, attack: 20 }, price: 11000 },

  { id: 601, name: '低级捕兽网', type: 'consumable', subType: 'capture', description: '捕捉宠物的基础道具，增加10%捕捉成功率', effect: { type: 'capture_bonus', value: 10 }, price: 50 },
  { id: 602, name: '中级捕兽网', type: 'consumable', subType: 'capture', description: '捕捉宠物的进阶道具，增加25%捕捉成功率', effect: { type: 'capture_bonus', value: 25 }, price: 150 },
  { id: 603, name: '高级捕兽网', type: 'consumable', subType: 'capture', description: '捕捉宠物的高级道具，增加45%捕捉成功率', effect: { type: 'capture_bonus', value: 45 }, price: 400 },
  { id: 604, name: '灵级捕兽网', type: 'consumable', subType: 'capture', description: '蕴含灵气的捕捉道具，增加70%捕捉成功率', effect: { type: 'capture_bonus', value: 70 }, price: 1200 },
  { id: 605, name: '仙级捕兽网', type: 'consumable', subType: 'capture', description: '仙气缭绕的神级道具，增加100%捕捉成功率', effect: { type: 'capture_bonus', value: 100 }, price: 5000 },

  { id: 701, name: '渡劫丹', type: 'consumable', subType: 'tribulation', description: '增加10%渡天劫成功率', effect: { type: 'tribulation_bonus', value: 10 }, price: 1000 },
  { id: 702, name: '天劫丹', type: 'consumable', subType: 'tribulation', description: '增加25%渡天劫成功率', effect: { type: 'tribulation_bonus', value: 25 }, price: 5000 },
  { id: 703, name: '九转还魂丹', type: 'consumable', subType: 'tribulation', description: '增加50%渡天劫成功率，渡劫失败可保不死', effect: { type: 'tribulation_bonus', value: 50, saveOnFail: true }, price: 20000 }
];

const QUESTS = [
  {
    id: 1, name: '入门修行', type: 'main', description: '踏上修仙之路，完成第一次修炼',
    requirements: { level: 1 }, objectives: [{ type: 'cultivate', target: 1, description: '完成修炼1次' }],
    rewards: { exp: 50, gold: 30, items: [{ itemId: 1, quantity: 3 }] }
  },
  {
    id: 2, name: '筑基之路', type: 'main', description: '积累修为，准备突破筑基期',
    requirements: { level: 5 }, objectives: [{ type: 'cultivate', target: 10, description: '完成修炼10次' }],
    rewards: { exp: 200, gold: 100, items: [{ itemId: 5, quantity: 1 }] }
  },
  {
    id: 3, name: '金丹大道', type: 'main', description: '金丹期是修仙的重要关卡',
    requirements: { level: 15 }, objectives: [{ type: 'breakthrough', target: 1, description: '完成1次突破' }],
    rewards: { exp: 500, gold: 300, items: [{ itemId: 2, quantity: 2 }] }
  },
  {
    id: 4, name: '元婴之境', type: 'main', description: '元婴出窍，神通自现',
    requirements: { level: 30 }, objectives: [{ type: 'cultivate', target: 30, description: '完成修炼30次' }],
    rewards: { exp: 1500, gold: 800, items: [{ itemId: 6, quantity: 1 }] }
  },
  {
    id: 5, name: '化神通天', type: 'main', description: '化神期可操控天地灵气',
    requirements: { level: 45 }, objectives: [{ type: 'cultivate', target: 50, description: '完成修炼50次' }],
    rewards: { exp: 5000, gold: 3000, items: [{ itemId: 104, quantity: 1 }] }
  },
  {
    id: 6, name: '打坐修炼', type: 'daily', description: '每日打坐修炼，积累修为',
    requirements: { level: 1 }, objectives: [{ type: 'cultivate', target: 5, description: '完成修炼5次' }],
    rewards: { exp: 30, gold: 20, items: [] }
  },
  {
    id: 7, name: '采集灵药', type: 'daily', description: '采集灵药炼制丹药',
    requirements: { level: 5 }, objectives: [{ type: 'collect', target: 3, description: '采集灵药3次' }],
    rewards: { exp: 50, gold: 40, items: [{ itemId: 1, quantity: 2 }] }
  },
  {
    id: 8, name: '降妖除魔', type: 'daily', description: '消灭附近作恶的妖兽',
    requirements: { level: 10 }, objectives: [{ type: 'combat', target: 5, description: '击败5只妖兽' }],
    rewards: { exp: 100, gold: 80, items: [{ itemId: 3, quantity: 2 }] }
  },
  {
    id: 9, name: '炼丹修行', type: 'daily', description: '炼制丹药辅助修行',
    requirements: { level: 20 }, objectives: [{ type: 'craft', target: 3, description: '炼制3次丹药' }],
    rewards: { exp: 150, gold: 100, items: [{ itemId: 5, quantity: 1 }] }
  },
  {
    id: 10, name: '护送灵石', type: 'daily', description: '护送灵石到其他宗门',
    requirements: { level: 15 }, objectives: [{ type: 'escort', target: 1, description: '完成1次护送' }],
    rewards: { exp: 120, gold: 150, items: [] }
  }
];

const EQUIPMENT_SLOTS = ['weapon', 'helmet', 'armor', 'boots', 'accessory'];

const QUALITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const QUALITY_NAMES = { common: '普通', uncommon: '优秀', rare: '稀有', epic: '史诗', legendary: '传说' };

const TITLE_STATS_MAP = {
  '修仙新手': { attack: 2, defense: 1 },
  '勤勉修士': { attack: 5, defense: 3, max_hp: 20 },
  '修炼狂人': { attack: 15, defense: 8, max_hp: 80, max_mp: 40 },
  '初出茅庐': { attack: 3, speed: 1 },
  '除妖达人': { attack: 8, defense: 4 },
  '百战战神': { attack: 25, defense: 12, speed: 5, max_hp: 100 },
  '富甲一方': { max_hp: 50, max_mp: 30 },
  '筑基修士': { attack: 5, defense: 5, max_hp: 50 },
  '金丹真人': { attack: 15, defense: 10, max_hp: 150, max_mp: 80 },
  '元婴老祖': { attack: 30, defense: 20, max_hp: 300, max_mp: 150, speed: 5 },
  '签到达人': { max_hp: 30, max_mp: 20 },
  '坚持不懈': { defense: 3, max_hp: 40 },
  '宠物新手': { speed: 2 },
  '任务达人': { attack: 5, defense: 3, max_hp: 30 }
};

const SKILL_TYPE_NAMES = { active: '主动', passive: '被动' };
const SKILL_SUBTYPE_NAMES = { attack: '攻击', buff: '增益', heal: '治疗', passive: '被动' };

function getTitleStats(titleName) {
  return TITLE_STATS_MAP[titleName] || {};
}

function calculateSkillDamage(skill, charSkillLevel, characterAttack, monsterDefense) {
  const effect = skill.effect ? (typeof skill.effect === 'string' ? JSON.parse(skill.effect) : skill.effect) : {};
  const growth = skill.growth ? (typeof skill.growth === 'string' ? JSON.parse(skill.growth) : skill.growth) : {};
  const levelBonus = charSkillLevel > 1 ? ((charSkillLevel - 1) * (growth.powerPerLevel || 5)) : 0;
  const basePower = (skill.base_power || 0) + levelBonus;
  const multiplier = effect.multiplier || 1;
  let damage = Math.floor((characterAttack + basePower) * multiplier - monsterDefense);
  damage = Math.max(1, damage + Math.floor(Math.random() * 10));
  if (effect.type === 'damage_crit' && Math.random() < (effect.critChance || 0)) {
    damage = Math.floor(damage * (effect.critMultiplier || 1.5));
  }
  return { damage, isCrit: effect.type === 'damage_crit' && Math.random() < (effect.critChance || 0) };
}

function calculateSkillHeal(skill, charSkillLevel, playerMaxHp) {
  const effect = skill.effect ? (typeof skill.effect === 'string' ? JSON.parse(skill.effect) : skill.effect) : {};
  const growth = skill.growth ? (typeof skill.growth === 'string' ? JSON.parse(skill.growth) : skill.growth) : {};
  if (effect.type === 'heal') {
    const levelBonus = charSkillLevel > 1 ? ((charSkillLevel - 1) * (growth.valuePerLevel || 10)) : 0;
    return Math.floor((effect.value || 0) + levelBonus);
  }
  if (effect.type === 'damage_heal') {
    const healPercent = (effect.healPercent || 0) + (charSkillLevel > 1 ? ((charSkillLevel - 1) * (growth.healPerLevel || 0)) : 0);
    return Math.floor(playerMaxHp * healPercent);
  }
  return 0;
}

function getProficiencyToNextLevel(skill, currentLevel) {
  const base = skill.proficiency_per_level || 100;
  return base * currentLevel;
}

function applyPassiveSkillBonus(character, passiveSkills) {
  let result = { ...character };
  for (const ps of passiveSkills) {
    const skill = ps.skill || ps;
    const effect = skill.effect ? (typeof skill.effect === 'string' ? JSON.parse(skill.effect) : skill.effect) : {};
    const growth = skill.growth ? (typeof skill.growth === 'string' ? JSON.parse(skill.growth) : skill.growth) : {};
    const level = ps.level || 1;
    if (effect.type === 'passive') {
      const levelBonus = level > 1 ? ((level - 1) * (growth.valuePerLevel || 0)) : 0;
      const totalValue = (effect.value || 0) + levelBonus;
      const stat = effect.stat;
      if (stat === 'max_hp') { result.max_hp = (result.max_hp || 0) + totalValue; result.maxHp = result.max_hp; }
      if (stat === 'max_mp') { result.max_mp = (result.max_mp || 0) + totalValue; result.maxMp = result.max_mp; }
      if (stat === 'attack') { result.attack = (result.attack || 0) + totalValue; }
      if (stat === 'defense') { result.defense = (result.defense || 0) + totalValue; }
      if (stat === 'speed') { result.speed = (result.speed || 0) + totalValue; }
    }
  }
  return result;
}

function getItemById(id) {
  return ITEMS.find(item => item.id === id) || null;
}

function getQuestById(id) {
  return QUESTS.find(quest => quest.id === id) || null;
}

function getRealmByIndex(index) {
  if (index >= 0 && index < REALMS.length) return REALMS[index];
  return null;
}

function getRealmIndex(name) {
  return REALMS.findIndex(r => r.name === name);
}

function getMapById(id) {
  return MAPS.find(map => map.id === id) || null;
}

function getMonsterById(id) {
  return MONSTERS.find(monster => monster.id === id) || null;
}

function getPetById(id) {
  return PETS.find(pet => pet.id === id) || null;
}

function getExpToNextLevel(level) {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

function calculatePetStats(petData, level) {
  const pet = getPetById(petData.pet_id);
  if (!pet) return null;
  return {
    maxHp: Math.floor(pet.baseHp + pet.growthHp * (level - 1)),
    attack: Math.floor(pet.baseAtk + pet.growthAtk * (level - 1)),
    defense: Math.floor(pet.baseDef + pet.growthDef * (level - 1)),
    speed: Math.floor(pet.baseSpeed + pet.growthSpeed * (level - 1))
  };
}

module.exports = {
  REALMS,
  ITEMS,
  QUESTS,
  MAPS,
  MONSTERS,
  PETS,
  PET_TYPES,
  PET_TYPE_COLORS,
  EQUIPMENT_SLOTS,
  QUALITY_ORDER,
  QUALITY_NAMES,
  TITLE_STATS_MAP,
  SKILL_TYPE_NAMES,
  SKILL_SUBTYPE_NAMES,
  getTitleStats,
  calculateSkillDamage,
  calculateSkillHeal,
  getProficiencyToNextLevel,
  applyPassiveSkillBonus,
  getItemById,
  getQuestById,
  getRealmByIndex,
  getRealmIndex,
  getMapById,
  getMonsterById,
  getPetById,
  getExpToNextLevel,
  calculatePetStats
};
