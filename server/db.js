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
`);

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
}

seedData();

module.exports = db;
