const REALMS = [
  { name: '练气期', levelReq: 1, expReq: 0, hpBonus: 0, mpBonus: 0, atkBonus: 0, defBonus: 0, speedBonus: 0 },
  { name: '筑基期', levelReq: 10, expReq: 1000, hpBonus: 50, mpBonus: 30, atkBonus: 5, defBonus: 3, speedBonus: 2 },
  { name: '金丹期', levelReq: 20, expReq: 5000, hpBonus: 150, mpBonus: 80, atkBonus: 15, defBonus: 10, speedBonus: 5 },
  { name: '元婴期', levelReq: 35, expReq: 15000, hpBonus: 300, mpBonus: 150, atkBonus: 30, defBonus: 20, speedBonus: 10 },
  { name: '化神期', levelReq: 50, expReq: 40000, hpBonus: 600, mpBonus: 300, atkBonus: 60, defBonus: 40, speedBonus: 20 },
  { name: '合体期', levelReq: 70, expReq: 100000, hpBonus: 1200, mpBonus: 600, atkBonus: 120, defBonus: 80, speedBonus: 40 },
  { name: '大乘期', levelReq: 85, expReq: 250000, hpBonus: 2500, mpBonus: 1200, atkBonus: 250, defBonus: 150, speedBonus: 80 },
  { name: '渡劫期', levelReq: 95, expReq: 600000, hpBonus: 5000, mpBonus: 2500, atkBonus: 500, defBonus: 300, speedBonus: 150 },
  { name: '仙人', levelReq: 100, expReq: 1500000, hpBonus: 10000, mpBonus: 5000, atkBonus: 1000, defBonus: 600, speedBonus: 300 }
];

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
  { id: 505, name: '混沌珠', type: 'equipment', subType: 'accessory', quality: 'legendary', slot: 'accessory', description: '混沌中诞生的灵珠', stats: { hp: 300, mp: 300, defense: 30, attack: 20 }, price: 11000 }
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

module.exports = {
  REALMS,
  ITEMS,
  QUESTS,
  EQUIPMENT_SLOTS,
  QUALITY_ORDER,
  QUALITY_NAMES,
  getItemById,
  getQuestById,
  getRealmByIndex,
  getRealmIndex
};
