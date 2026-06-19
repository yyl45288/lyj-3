const Database = require('better-sqlite3');
const path = require('path');
const { ITEMS, QUESTS } = require('./gameData');

const db = new Database(path.join(__dirname, 'game.db'));

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
}

seedData();

module.exports = db;
