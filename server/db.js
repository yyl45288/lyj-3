const Database = require('better-sqlite3');
const path = require('path');
const { ITEMS, QUESTS, TITLE_STATS_MAP } = require('./gameData');

const db = new Database(path.join(__dirname, 'game_v5.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    realm TEXT DEFAULT '练气期',
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    mp INTEGER DEFAULT 50,
    max_mp INTEGER DEFAULT 50,
    attack INTEGER DEFAULT 10,
    defense INTEGER DEFAULT 5,
    speed INTEGER DEFAULT 5,
    comprehension INTEGER DEFAULT 5,
    gold INTEGER DEFAULT 100,
    cultivate_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    equipped INTEGER DEFAULT 0,
    slot TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS character_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    quest_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    accepted_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    hp INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    attack INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS battle_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    monster_id INTEGER NOT NULL,
    result TEXT NOT NULL,
    exp_gained INTEGER DEFAULT 0,
    gold_gained INTEGER DEFAULT 0,
    pet_caught INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exploration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    map_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    result TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS active_battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL UNIQUE,
    monster_id INTEGER NOT NULL,
    monster_hp INTEGER NOT NULL,
    monster_max_hp INTEGER NOT NULL,
    player_hp INTEGER NOT NULL,
    player_max_hp INTEGER NOT NULL,
    pet_id INTEGER,
    pet_hp INTEGER,
    pet_max_hp INTEGER,
    turn INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    target_value INTEGER DEFAULT 1,
    title TEXT,
    rewards TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS character_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    claimed INTEGER DEFAULT 0,
    completed_at TEXT,
    claimed_at TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE(character_id, achievement_id)
  );

  CREATE TABLE IF NOT EXISTS sign_in_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    sign_date TEXT NOT NULL,
    is_makeup INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, sign_date)
  );

  CREATE TABLE IF NOT EXISTS sign_in_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_type TEXT NOT NULL,
    day_number INTEGER,
    rewards TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'achievement',
    source_id INTEGER,
    stats TEXT,
    icon TEXT,
    quality TEXT DEFAULT 'common',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS character_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    title_id INTEGER NOT NULL,
    equipped INTEGER DEFAULT 0,
    obtained_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
    UNIQUE(character_id, title_id)
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    subtype TEXT,
    level_req INTEGER DEFAULT 1,
    realm_req TEXT,
    mp_cost INTEGER DEFAULT 0,
    cooldown INTEGER DEFAULT 0,
    base_power INTEGER DEFAULT 0,
    effect TEXT,
    growth TEXT,
    proficiency_per_level INTEGER DEFAULT 100,
    max_level INTEGER DEFAULT 10,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS character_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    level INTEGER DEFAULT 1,
    proficiency INTEGER DEFAULT 0,
    learned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE(character_id, skill_id)
  );

  CREATE TABLE IF NOT EXISTS dungeons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    level_req INTEGER DEFAULT 1,
    realm_req TEXT,
    daily_limit INTEGER DEFAULT 3,
    monsters TEXT,
    first_clear_rewards TEXT,
    clear_rewards TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dungeon_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    dungeon_id INTEGER NOT NULL,
    challenge_date TEXT NOT NULL,
    challenge_count INTEGER DEFAULT 0,
    first_cleared INTEGER DEFAULT 0,
    cleared_count INTEGER DEFAULT 0,
    first_cleared_at TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE,
    UNIQUE(character_id, dungeon_id, challenge_date)
  );

  CREATE TABLE IF NOT EXISTS dungeon_battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL UNIQUE,
    dungeon_id INTEGER NOT NULL,
    current_wave INTEGER DEFAULT 1,
    total_waves INTEGER DEFAULT 1,
    monster_id INTEGER NOT NULL,
    monster_hp INTEGER NOT NULL,
    monster_max_hp INTEGER NOT NULL,
    player_hp INTEGER NOT NULL,
    player_max_hp INTEGER NOT NULL,
    pet_id INTEGER,
    pet_hp INTEGER,
    pet_max_hp INTEGER,
    turn INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE
  );
`);

  try {
    const dupes = db.prepare(`
      SELECT character_id, item_id, MIN(id) as keep_id, SUM(quantity) as total_qty
      FROM inventory WHERE equipped = 0
      GROUP BY character_id, item_id
      HAVING COUNT(*) > 1
    `).all();
    for (const d of dupes) {
      db.prepare('DELETE FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0')
        .run(d.character_id, d.item_id);
      db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?')
        .run(d.total_qty, d.keep_id);
    }
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_char_item_unequipped
      ON inventory(character_id, item_id) WHERE equipped = 0`);
  } catch (err) {
    console.error('创建inventory唯一索引失败:', err.message);
  }

function seedData() {
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type=\'table\' AND name=\'items\'').get();
  if (itemCount.count === 0) {
    db.exec(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        sub_type TEXT,
        quality TEXT,
        slot TEXT,
        description TEXT,
        effect TEXT,
        stats TEXT,
        price INTEGER DEFAULT 0
      )
    `);

    const insertItem = db.prepare(`
      INSERT INTO items (id, name, type, sub_type, quality, slot, description, effect, stats, price)
      VALUES (@id, @name, @type, @subType, @quality, @slot, @description, @effect, @stats, @price)
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertItem.run({
          id: item.id,
          name: item.name,
          type: item.type,
          subType: item.subType || null,
          quality: item.quality || null,
          slot: item.slot || null,
          description: item.description,
          effect: item.effect ? JSON.stringify(item.effect) : null,
          stats: item.stats ? JSON.stringify(item.stats) : null,
          price: item.price || 0
        });
      }
    });

    insertMany(ITEMS);
  }

  const questCount = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type=\'table\' AND name=\'quests\'').get();
  if (questCount.count === 0) {
    db.exec(`
      CREATE TABLE quests (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        requirements TEXT,
        objectives TEXT,
        rewards TEXT
      )
    `);

    const insertQuest = db.prepare(`
      INSERT INTO quests (id, name, type, description, requirements, objectives, rewards)
      VALUES (@id, @name, @type, @description, @requirements, @objectives, @rewards)
    `);

    const insertMany = db.transaction((quests) => {
      for (const quest of quests) {
        insertQuest.run({
          id: quest.id,
          name: quest.name,
          type: quest.type,
          description: quest.description,
          requirements: JSON.stringify(quest.requirements),
          objectives: JSON.stringify(quest.objectives),
          rewards: JSON.stringify(quest.rewards)
        });
      }
    });

    insertMany(QUESTS);
  }

  const existingItems = db.prepare('SELECT id FROM items').all().map(i => i.id);
  const newItems = ITEMS.filter(item => !existingItems.includes(item.id));
  if (newItems.length > 0) {
    const insertItem = db.prepare(`
      INSERT OR IGNORE INTO items (id, name, type, sub_type, quality, slot, description, effect, stats, price)
      VALUES (@id, @name, @type, @subType, @quality, @slot, @description, @effect, @stats, @price)
    `);
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertItem.run({
          id: item.id,
          name: item.name,
          type: item.type,
          subType: item.subType || null,
          quality: item.quality || null,
          slot: item.slot || null,
          description: item.description,
          effect: item.effect ? JSON.stringify(item.effect) : null,
          stats: item.stats ? JSON.stringify(item.stats) : null,
          price: item.price || 0
        });
      }
    });
    insertMany(newItems);
  }

  const bcrypt = require('bcryptjs');
  const passwordHash = bcrypt.hashSync('admin123', 10);
  const existingAdmin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
  if (!existingAdmin) {
    db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
      .run('admin', passwordHash, 'super_admin');
  } else {
    db.prepare('UPDATE admins SET password_hash = ?, role = ? WHERE username = ?')
      .run(passwordHash, 'super_admin', 'admin');
  }

  const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get().count;
  if (achievementCount === 0) {
    const defaultAchievements = [
      { name: '初入仙途', description: '完成第一次修炼', type: 'cultivate', target_value: 1, title: '修仙新手', rewards: JSON.stringify({ gold: 100, exp: 50 }), icon: '🌱', sort_order: 1 },
      { name: '勤修不辍', description: '累计修炼100次', type: 'cultivate', target_value: 100, title: '勤勉修士', rewards: JSON.stringify({ gold: 500, exp: 200, items: [{ itemId: 5, quantity: 2 }] }), icon: '📚', sort_order: 2 },
      { name: '修炼狂人', description: '累计修炼1000次', type: 'cultivate', target_value: 1000, title: '修炼狂人', rewards: JSON.stringify({ gold: 2000, exp: 1000, items: [{ itemId: 6, quantity: 5 }] }), icon: '🔥', sort_order: 3 },
      { name: '初战告捷', description: '击败第一只妖兽', type: 'combat', target_value: 1, title: '初出茅庐', rewards: JSON.stringify({ gold: 50, exp: 30 }), icon: '⚔️', sort_order: 4 },
      { name: '降妖除魔', description: '累计击败100只妖兽', type: 'combat', target_value: 100, title: '除妖达人', rewards: JSON.stringify({ gold: 1000, exp: 500 }), icon: '🗡️', sort_order: 5 },
      { name: '百战百胜', description: '累计击败1000只妖兽', type: 'combat', target_value: 1000, title: '百战战神', rewards: JSON.stringify({ gold: 5000, exp: 2000, items: [{ itemId: 103, quantity: 1 }] }), icon: '🏆', sort_order: 6 },
      { name: '腰缠万贯', description: '累计获得10000金币', type: 'gold', target_value: 10000, title: '富甲一方', rewards: JSON.stringify({ gold: 2000 }), icon: '💰', sort_order: 7 },
      { name: '筑基成功', description: '突破到筑基期', type: 'realm', target_value: 2, title: '筑基修士', rewards: JSON.stringify({ gold: 500, exp: 200 }), icon: '🌟', sort_order: 8 },
      { name: '金丹大道', description: '突破到金丹期', type: 'realm', target_value: 3, title: '金丹真人', rewards: JSON.stringify({ gold: 2000, exp: 1000 }), icon: '💫', sort_order: 9 },
      { name: '元婴出窍', description: '突破到元婴期', type: 'realm', target_value: 4, title: '元婴老祖', rewards: JSON.stringify({ gold: 5000, exp: 3000 }), icon: '✨', sort_order: 10 },
      { name: '签到达人', description: '累计签到30天', type: 'sign_in', target_value: 30, title: '签到达人', rewards: JSON.stringify({ gold: 1000, items: [{ itemId: 3, quantity: 10 }] }), icon: '📅', sort_order: 11 },
      { name: '持之以恒', description: '连续签到7天', type: 'consecutive_sign_in', target_value: 7, title: '坚持不懈', rewards: JSON.stringify({ gold: 500, items: [{ itemId: 1, quantity: 5 }] }), icon: '📆', sort_order: 12 },
      { name: '宠物收集家', description: '捕获第一只宠物', type: 'pet_catch', target_value: 1, title: '宠物新手', rewards: JSON.stringify({ gold: 200 }), icon: '🐾', sort_order: 13 },
      { name: '任务达人', description: '完成10个任务', type: 'quest_complete', target_value: 10, title: '任务达人', rewards: JSON.stringify({ gold: 800, exp: 400 }), icon: '📜', sort_order: 14 }
    ];

    const insertAchievement = db.prepare(`
      INSERT INTO achievements (name, description, type, target_value, title, rewards, icon, sort_order)
      VALUES (@name, @description, @type, @target_value, @title, @rewards, @icon, @sort_order)
    `);

    const insertMany = db.transaction((achievements) => {
      for (const ach of achievements) {
        insertAchievement.run(ach);
      }
    });

    insertMany(defaultAchievements);

    const insertTitle = db.prepare(`
      INSERT INTO titles (name, description, source, source_id, stats, icon, quality, sort_order)
      VALUES (@name, @description, 'achievement', @source_id, @stats, @icon, 'common', @sort_order)
    `);
    const insertTitles = db.transaction((achievements) => {
      for (const ach of achievements) {
        if (ach.title) {
          const stats = TITLE_STATS_MAP[ach.title] || {};
          insertTitle.run({
            name: ach.title,
            description: `完成成就「${ach.name}」获得`,
            source_id: 0,
            stats: JSON.stringify(stats),
            icon: ach.icon || '🏆',
            sort_order: ach.sort_order || 0
          });
        }
      }
    });
    insertTitles(defaultAchievements);
  }

  const signInRewardCount = db.prepare('SELECT COUNT(*) as count FROM sign_in_rewards').get().count;
  if (signInRewardCount === 0) {
    const defaultSignInRewards = [
      { day_type: 'daily', day_number: 1, rewards: JSON.stringify({ gold: 50, exp: 20 }), sort_order: 1 },
      { day_type: 'consecutive', day_number: 3, rewards: JSON.stringify({ gold: 100, exp: 50, items: [{ itemId: 1, quantity: 2 }] }), sort_order: 2 },
      { day_type: 'consecutive', day_number: 7, rewards: JSON.stringify({ gold: 300, exp: 150, items: [{ itemId: 3, quantity: 3 }] }), sort_order: 3 },
      { day_type: 'consecutive', day_number: 15, rewards: JSON.stringify({ gold: 800, exp: 400, items: [{ itemId: 5, quantity: 2 }] }), sort_order: 4 },
      { day_type: 'consecutive', day_number: 30, rewards: JSON.stringify({ gold: 2000, exp: 1000, items: [{ itemId: 102, quantity: 1 }] }), sort_order: 5 }
    ];

    const insertReward = db.prepare(`
      INSERT INTO sign_in_rewards (day_type, day_number, rewards, sort_order)
      VALUES (@day_type, @day_number, @rewards, @sort_order)
    `);

    const insertMany = db.transaction((rewards) => {
      for (const reward of rewards) {
        insertReward.run(reward);
      }
    });

    insertMany(defaultSignInRewards);
  }

  const skillCount = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;
  if (skillCount === 0) {
    const defaultSkills = [
      { name: '基础剑法', description: '最基础的剑术攻击，造成少量伤害', type: 'active', subtype: 'attack', level_req: 1, mp_cost: 5, base_power: 15, effect: JSON.stringify({ type: 'damage', multiplier: 1.2 }), growth: JSON.stringify({ powerPerLevel: 5 }), proficiency_per_level: 100, max_level: 10, icon: '🗡️', sort_order: 1 },
      { name: '御火术', description: '操控火焰攻击敌人', type: 'active', subtype: 'attack', level_req: 5, mp_cost: 15, base_power: 35, effect: JSON.stringify({ type: 'damage', multiplier: 1.5, element: 'fire' }), growth: JSON.stringify({ powerPerLevel: 10 }), proficiency_per_level: 150, max_level: 10, icon: '🔥', sort_order: 2 },
      { name: '御水术', description: '操控水流进行攻击并恢复少量生命', type: 'active', subtype: 'attack', level_req: 5, mp_cost: 15, base_power: 25, effect: JSON.stringify({ type: 'damage_heal', damageMultiplier: 1.3, healPercent: 0.1 }), growth: JSON.stringify({ powerPerLevel: 8, healPerLevel: 0.01 }), proficiency_per_level: 150, max_level: 10, icon: '💧', sort_order: 3 },
      { name: '雷击术', description: '召唤雷电攻击敌人，有几率造成双倍伤害', type: 'active', subtype: 'attack', level_req: 10, realm_req: '练气期', mp_cost: 25, base_power: 50, effect: JSON.stringify({ type: 'damage_crit', multiplier: 1.6, critChance: 0.2, critMultiplier: 2.0 }), growth: JSON.stringify({ powerPerLevel: 12 }), proficiency_per_level: 200, max_level: 10, icon: '⚡', sort_order: 4 },
      { name: '玄冰术', description: '释放极寒之力冻结敌人并造成伤害', type: 'active', subtype: 'attack', level_req: 15, mp_cost: 30, base_power: 70, effect: JSON.stringify({ type: 'damage', multiplier: 1.8, element: 'ice' }), growth: JSON.stringify({ powerPerLevel: 15 }), proficiency_per_level: 200, max_level: 10, icon: '❄️', sort_order: 5 },
      { name: '五雷轰顶', description: '召唤五道天雷轰击敌人', type: 'active', subtype: 'attack', level_req: 25, realm_req: '筑基期', mp_cost: 50, base_power: 120, effect: JSON.stringify({ type: 'damage', multiplier: 2.2, element: 'thunder' }), growth: JSON.stringify({ powerPerLevel: 20 }), proficiency_per_level: 250, max_level: 10, icon: '🌩️', sort_order: 6 },
      { name: '护体金光', description: '短时间内提升防御力', type: 'active', subtype: 'buff', level_req: 3, mp_cost: 10, base_power: 0, effect: JSON.stringify({ type: 'buff', stat: 'defense', value: 10, duration: 3 }), growth: JSON.stringify({ valuePerLevel: 3 }), proficiency_per_level: 120, max_level: 10, icon: '🛡️', sort_order: 7 },
      { name: '疾风步', description: '短时间内大幅提升速度', type: 'active', subtype: 'buff', level_req: 8, mp_cost: 12, base_power: 0, effect: JSON.stringify({ type: 'buff', stat: 'speed', value: 8, duration: 3 }), growth: JSON.stringify({ valuePerLevel: 2 }), proficiency_per_level: 120, max_level: 10, icon: '💨', sort_order: 8 },
      { name: '回春术', description: '恢复自身大量生命值', type: 'active', subtype: 'heal', level_req: 6, mp_cost: 20, base_power: 0, effect: JSON.stringify({ type: 'heal', value: 80 }), growth: JSON.stringify({ valuePerLevel: 15 }), proficiency_per_level: 150, max_level: 10, icon: '💚', sort_order: 9 },
      { name: '金刚不坏', description: '被动提升最大生命值', type: 'passive', subtype: 'passive', level_req: 2, effect: JSON.stringify({ type: 'passive', stat: 'max_hp', value: 20 }), growth: JSON.stringify({ valuePerLevel: 10 }), proficiency_per_level: 100, max_level: 10, icon: '💪', sort_order: 10 },
      { name: '灵力充沛', description: '被动提升最大灵力值', type: 'passive', subtype: 'passive', level_req: 4, effect: JSON.stringify({ type: 'passive', stat: 'max_mp', value: 15 }), growth: JSON.stringify({ valuePerLevel: 8 }), proficiency_per_level: 100, max_level: 10, icon: '🔮', sort_order: 11 },
      { name: '战意', description: '被动提升攻击力', type: 'passive', subtype: 'passive', level_req: 7, effect: JSON.stringify({ type: 'passive', stat: 'attack', value: 5 }), growth: JSON.stringify({ valuePerLevel: 3 }), proficiency_per_level: 120, max_level: 10, icon: '⚔️', sort_order: 12 },
      { name: '铁壁', description: '被动提升防御力', type: 'passive', subtype: 'passive', level_req: 9, effect: JSON.stringify({ type: 'passive', stat: 'defense', value: 4 }), growth: JSON.stringify({ valuePerLevel: 2 }), proficiency_per_level: 120, max_level: 10, icon: '🛡️', sort_order: 13 },
      { name: '身轻如燕', description: '被动提升速度', type: 'passive', subtype: 'passive', level_req: 12, effect: JSON.stringify({ type: 'passive', stat: 'speed', value: 3 }), growth: JSON.stringify({ valuePerLevel: 2 }), proficiency_per_level: 120, max_level: 10, icon: '🦅', sort_order: 14 }
    ];

    const insertSkill = db.prepare(`
      INSERT INTO skills (name, description, type, subtype, level_req, realm_req, mp_cost, cooldown, base_power, effect, growth, proficiency_per_level, max_level, icon, sort_order)
      VALUES (@name, @description, @type, @subtype, @level_req, @realm_req, @mp_cost, @cooldown, @base_power, @effect, @growth, @proficiency_per_level, @max_level, @icon, @sort_order)
    `);

    const insertMany = db.transaction((skills) => {
      for (const skill of skills) {
        const s = {
          name: '', description: '', type: 'active', subtype: '',
          level_req: 1, realm_req: '', mp_cost: 0, cooldown: 0, base_power: 0,
          effect: null, growth: null, proficiency_per_level: 100, max_level: 10,
          icon: '', sort_order: 0,
          ...skill
        };
        insertSkill.run(s);
      }
    });

    insertMany(defaultSkills);
  }

  const dungeonCount = db.prepare('SELECT COUNT(*) as count FROM dungeons').get().count;
  if (dungeonCount === 0) {
    const defaultDungeons = [
      {
        name: '青冥秘境', description: '初级修士试炼之地，灵气充盈', level_req: 5, daily_limit: 3,
        monsters: JSON.stringify([[1], [2], [3]]),
        first_clear_rewards: JSON.stringify({ gold: 500, exp: 300, items: [{ itemId: 101, quantity: 1 }] }),
        clear_rewards: JSON.stringify({ gold: 200, exp: 150, items: [{ itemId: 1, quantity: 3 }] }),
        icon: '🌿', sort_order: 1
      },
      {
        name: '黑风魔窟', description: '隐藏在黑风谷深处的魔窟', level_req: 15, daily_limit: 3,
        monsters: JSON.stringify([[4], [5], [6]]),
        first_clear_rewards: JSON.stringify({ gold: 1500, exp: 800, items: [{ itemId: 102, quantity: 1 }, { itemId: 3, quantity: 5 }] }),
        clear_rewards: JSON.stringify({ gold: 500, exp: 400, items: [{ itemId: 2, quantity: 3 }] }),
        icon: '🌑', sort_order: 2
      },
      {
        name: '万妖巢穴', description: '万妖林深处，群妖聚集之地', level_req: 25, daily_limit: 2,
        monsters: JSON.stringify([[7], [8], [9]]),
        first_clear_rewards: JSON.stringify({ gold: 5000, exp: 2000, items: [{ itemId: 103, quantity: 1 }] }),
        clear_rewards: JSON.stringify({ gold: 1500, exp: 1000, items: [{ itemId: 5, quantity: 3 }] }),
        icon: '🌲', sort_order: 3
      },
      {
        name: '毒龙殿', description: '盘踞在毒龙沼泽深处的毒龙巢穴', level_req: 35, daily_limit: 2,
        monsters: JSON.stringify([[10], [11], [12]]),
        first_clear_rewards: JSON.stringify({ gold: 10000, exp: 5000, items: [{ itemId: 203, quantity: 1 }, { itemId: 6, quantity: 5 }] }),
        clear_rewards: JSON.stringify({ gold: 3000, exp: 2500, items: [{ itemId: 4, quantity: 5 }] }),
        icon: '🐉', sort_order: 4
      },
      {
        name: '寒冰祭坛', description: '极寒冰原中心的古老祭坛', level_req: 50, daily_limit: 2,
        monsters: JSON.stringify([[13], [14], [15]]),
        first_clear_rewards: JSON.stringify({ gold: 30000, exp: 15000, items: [{ itemId: 104, quantity: 1 }] }),
        clear_rewards: JSON.stringify({ gold: 8000, exp: 6000, items: [{ itemId: 6, quantity: 5 }] }),
        icon: '❄️', sort_order: 5
      },
      {
        name: '天魔殿', description: '天魔窟最深处，上古魔族的圣殿', level_req: 65, daily_limit: 1,
        monsters: JSON.stringify([[16], [17], [18]]),
        first_clear_rewards: JSON.stringify({ gold: 100000, exp: 50000, items: [{ itemId: 105, quantity: 1 }, { itemId: 505, quantity: 1 }] }),
        clear_rewards: JSON.stringify({ gold: 20000, exp: 15000, items: [{ itemId: 702, quantity: 2 }] }),
        icon: '👹', sort_order: 6
      }
    ];

    const insertDungeon = db.prepare(`
      INSERT INTO dungeons (name, description, level_req, realm_req, daily_limit, monsters, first_clear_rewards, clear_rewards, icon, sort_order)
      VALUES (@name, @description, @level_req, @realm_req, @daily_limit, @monsters, @first_clear_rewards, @clear_rewards, @icon, @sort_order)
    `);

    const insertMany = db.transaction((dungeons) => {
      for (const dungeon of dungeons) {
        const d = {
          name: '', description: '', level_req: 1, realm_req: '', daily_limit: 3,
          monsters: '[]', first_clear_rewards: '{}', clear_rewards: '{}',
          icon: '', sort_order: 0,
          ...dungeon
        };
        insertDungeon.run(d);
      }
    });

    insertMany(defaultDungeons);
  }
}

seedData();

module.exports = db;
