const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');
const { getItemById } = require('../gameData');
const { updateGoldAchievement } = require('./achievement');

const router = express.Router();

const LISTING_FEE_PERCENT = 5;
const MAX_ACTIVE_LISTINGS = 20;

router.get('/list', auth, (req, res) => {
  const { itemType, quality, sortBy = 'created_at', sortOrder = 'desc', page = 1, pageSize = 20 } = req.query;
  
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  let whereClauses = ["status = 'active'"];
  let params = [];

  if (itemType) {
    whereClauses.push('item_id IN (SELECT id FROM items WHERE type = ? OR sub_type = ?)');
    params.push(itemType, itemType);
  }

  if (quality) {
    whereClauses.push('item_id IN (SELECT id FROM items WHERE quality = ?)');
    params.push(quality);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  
  const validSortColumns = ['created_at', 'price', 'quantity'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);

  const listings = db.prepare(`
    SELECT ml.*, c.name as seller_name, i.name as item_name, i.type as item_type, i.sub_type as item_sub_type, i.quality as item_quality, 
           i.description as item_description, i.effect as item_effect, i.stats as item_stats, i.price as base_price
    FROM market_listings ml
    JOIN characters c ON ml.seller_id = c.id
    JOIN items i ON ml.item_id = i.id
    ${whereSql}
    ORDER BY ml.${sortColumn} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM market_listings ml
    JOIN items i ON ml.item_id = i.id
    ${whereSql}
  `).get(...params).count;

  const formattedListings = listings.map(l => ({
    id: l.id,
    sellerId: l.seller_id,
    sellerName: l.seller_name,
    itemId: l.item_id,
    itemName: l.item_name,
    itemType: l.item_type,
    itemSubType: l.item_sub_type,
    itemQuality: l.item_quality,
    itemDescription: l.item_description,
    itemEffect: l.item_effect ? JSON.parse(l.item_effect) : null,
    itemStats: l.item_stats ? JSON.parse(l.item_stats) : null,
    basePrice: l.base_price,
    quantity: l.quantity,
    price: l.price,
    pricePerUnit: Math.floor(l.price / l.quantity),
    status: l.status,
    createdAt: l.created_at,
    isOwn: l.seller_id === character.id
  }));

  res.json({
    listings: formattedListings,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / pageSize)
  });
});

router.get('/my-listings', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const listings = db.prepare(`
    SELECT ml.*, i.name as item_name, i.type as item_type, i.sub_type as item_sub_type, i.quality as item_quality,
           i.description as item_description, i.price as base_price
    FROM market_listings ml
    JOIN items i ON ml.item_id = i.id
    WHERE ml.seller_id = ?
    ORDER BY ml.created_at DESC
  `).all(character.id);

  const formattedListings = listings.map(l => ({
    id: l.id,
    itemId: l.item_id,
    itemName: l.item_name,
    itemType: l.item_type,
    itemSubType: l.item_sub_type,
    itemQuality: l.item_quality,
    itemDescription: l.item_description,
    basePrice: l.base_price,
    quantity: l.quantity,
    price: l.price,
    pricePerUnit: Math.floor(l.price / l.quantity),
    status: l.status,
    createdAt: l.created_at,
    soldAt: l.sold_at
  }));

  res.json({ listings: formattedListings });
});

router.post('/list', auth, (req, res) => {
  const itemId = parseInt(req.body.itemId);
  const quantity = parseInt(req.body.quantity) || 1;
  const price = parseInt(req.body.price);

  if (!itemId || !price || price <= 0) {
    return res.status(400).json({ error: '参数无效' });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: '数量必须大于0' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const item = getItemById(itemId);
  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  const invItem = db.prepare('SELECT * FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0')
    .get(character.id, itemId);
  if (!invItem || invItem.quantity < quantity) {
    return res.status(400).json({ error: '背包中物品数量不足' });
  }

  const activeCount = db.prepare("SELECT COUNT(*) as count FROM market_listings WHERE seller_id = ? AND status = 'active'")
    .get(character.id).count;
  if (activeCount >= MAX_ACTIVE_LISTINGS) {
    return res.status(400).json({ error: `最多同时挂单${MAX_ACTIVE_LISTINGS}个` });
  }

  const fee = Math.floor(price * LISTING_FEE_PERCENT / 100);
  if (character.gold < fee) {
    return res.status(400).json({ error: `金币不足，需要支付${fee}金币手续费` });
  }

  const transaction = db.transaction(() => {
    if (invItem.quantity === quantity) {
      db.prepare('DELETE FROM inventory WHERE id = ?').run(invItem.id);
    } else {
      db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE id = ?').run(quantity, invItem.id);
    }

    db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ?').run(fee, character.id);

    const result = db.prepare(`
      INSERT INTO market_listings (seller_id, item_id, quantity, price, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(character.id, itemId, quantity, price);

    return { listingId: result.lastInsertRowid, fee };
  });

  try {
    const { listingId, fee } = transaction();
    const updatedChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
    
    res.json({
      message: `成功挂单${item.name}×${quantity}`,
      listingId,
      fee,
      character: updatedChar
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '挂单失败' });
  }
});

router.post('/cancel/:listingId', auth, (req, res) => {
  const listingId = parseInt(req.params.listingId);
  if (!listingId) {
    return res.status(400).json({ error: '缺少挂单ID' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const listing = db.prepare('SELECT * FROM market_listings WHERE id = ?').get(listingId);
  if (!listing) {
    return res.status(404).json({ error: '挂单不存在' });
  }
  if (listing.seller_id !== character.id) {
    return res.status(403).json({ error: '只能取消自己的挂单' });
  }
  if (listing.status !== 'active') {
    return res.status(400).json({ error: '该挂单无法取消' });
  }

  const item = getItemById(listing.item_id);

  const transaction = db.transaction(() => {
    const existingInv = db.prepare('SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0')
      .get(character.id, listing.item_id);
    
    if (existingInv) {
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(listing.quantity, existingInv.id);
    } else {
      db.prepare('INSERT INTO inventory (character_id, item_id, quantity, equipped, slot) VALUES (?, ?, ?, 0, NULL)')
        .run(character.id, listing.item_id, listing.quantity);
    }

    db.prepare("UPDATE market_listings SET status = 'cancelled' WHERE id = ?").run(listingId);
  });

  try {
    transaction();
    res.json({
      message: `已取消挂单，${item ? item.name : '物品'}已返还背包`,
      listingId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '取消失败' });
  }
});

router.post('/buy/:listingId', auth, (req, res) => {
  const listingId = parseInt(req.params.listingId);
  if (!listingId) {
    return res.status(400).json({ error: '缺少挂单ID' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const listing = db.prepare('SELECT * FROM market_listings WHERE id = ?').get(listingId);
  if (!listing) {
    return res.status(404).json({ error: '挂单不存在' });
  }
  if (listing.status !== 'active') {
    return res.status(400).json({ error: '该挂单已售出或已取消' });
  }
  if (listing.seller_id === character.id) {
    return res.status(400).json({ error: '不能购买自己的挂单' });
  }
  if (character.gold < listing.price) {
    return res.status(400).json({ error: '金币不足' });
  }

  const item = getItemById(listing.item_id);
  const seller = db.prepare('SELECT * FROM characters WHERE id = ?').get(listing.seller_id);

  const transaction = db.transaction(() => {
    db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ?').run(listing.price, character.id);

    const existingInv = db.prepare('SELECT id FROM inventory WHERE character_id = ? AND item_id = ? AND equipped = 0')
      .get(character.id, listing.item_id);
    
    if (existingInv) {
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(listing.quantity, existingInv.id);
    } else {
      db.prepare('INSERT INTO inventory (character_id, item_id, quantity, equipped, slot) VALUES (?, ?, ?, 0, NULL)')
        .run(character.id, listing.item_id, listing.quantity);
    }

    db.prepare('UPDATE characters SET gold = gold + ? WHERE id = ?').run(listing.price, listing.seller_id);

    db.prepare("UPDATE market_listings SET status = 'sold', sold_at = datetime('now') WHERE id = ?")
      .run(listingId);

    db.prepare(`
      INSERT INTO trade_records (listing_id, seller_id, buyer_id, item_id, quantity, price_per_unit, total_price, trade_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'market')
    `).run(listingId, listing.seller_id, character.id, listing.item_id, listing.quantity, 
           Math.floor(listing.price / listing.quantity), listing.price);
  });

  try {
    transaction();
    
    const buyerChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(character.id);
    updateGoldAchievement(character.id, buyerChar.gold);
    
    const sellerChar = db.prepare('SELECT * FROM characters WHERE id = ?').get(listing.seller_id);
    updateGoldAchievement(listing.seller_id, sellerChar.gold);

    res.json({
      message: `成功购买${item ? item.name : '物品'}×${listing.quantity}`,
      listingId,
      item,
      quantity: listing.quantity,
      totalPrice: listing.price,
      character: buyerChar
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '购买失败' });
  }
});

router.get('/records', auth, (req, res) => {
  const { type = 'all', page = 1, pageSize = 20 } = req.query;
  
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  let whereClauses = [];
  let params = [];

  if (type === 'buy') {
    whereClauses.push('buyer_id = ?');
    params.push(character.id);
  } else if (type === 'sell') {
    whereClauses.push('seller_id = ?');
    params.push(character.id);
  } else {
    whereClauses.push('(seller_id = ? OR buyer_id = ?)');
    params.push(character.id, character.id);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);

  const records = db.prepare(`
    SELECT tr.*, i.name as item_name, i.quality as item_quality,
           sc.name as seller_name, bc.name as buyer_name
    FROM trade_records tr
    JOIN items i ON tr.item_id = i.id
    JOIN characters sc ON tr.seller_id = sc.id
    JOIN characters bc ON tr.buyer_id = bc.id
    ${whereSql}
    ORDER BY tr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM trade_records
    ${whereSql}
  `).get(...params).count;

  const formattedRecords = records.map(r => ({
    id: r.id,
    listingId: r.listing_id,
    sellerId: r.seller_id,
    sellerName: r.seller_name,
    buyerId: r.buyer_id,
    buyerName: r.buyer_name,
    itemId: r.item_id,
    itemName: r.item_name,
    itemQuality: r.item_quality,
    quantity: r.quantity,
    pricePerUnit: r.price_per_unit,
    totalPrice: r.total_price,
    tradeType: r.trade_type,
    createdAt: r.created_at,
    isBuy: r.buyer_id === character.id,
    isSell: r.seller_id === character.id
  }));

  res.json({
    records: formattedRecords,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / pageSize)
  });
});

module.exports = router;
