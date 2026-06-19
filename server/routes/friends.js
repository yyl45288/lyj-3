const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

function isUserOnline(userId) {
  const online = db.prepare(`
    SELECT * FROM user_online 
    WHERE user_id = ? AND is_online = 1 
    AND datetime(last_heartbeat) > datetime('now', '-5 minutes')
  `).get(userId);
  return !!online;
}

router.get('/list', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const friends = db.prepare(`
    SELECT f.*, c.name as friend_name, c.level as friend_level, c.realm as friend_realm,
           u.id as friend_user_id
    FROM friends f
    JOIN characters c ON f.friend_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE f.character_id = ?
    ORDER BY c.name
  `).all(character.id);

  const friendsWithStatus = friends.map(f => ({
    ...f,
    isOnline: isUserOnline(f.friend_user_id)
  }));

  res.json({ friends: friendsWithStatus });
});

router.get('/requests', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const receivedRequests = db.prepare(`
    SELECT fr.*, c.name as sender_name, c.level as sender_level, c.realm as sender_realm
    FROM friend_requests fr
    JOIN characters c ON fr.sender_id = c.id
    WHERE fr.receiver_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `).all(character.id);

  const sentRequests = db.prepare(`
    SELECT fr.*, c.name as receiver_name, c.level as receiver_level, c.realm as receiver_realm
    FROM friend_requests fr
    JOIN characters c ON fr.receiver_id = c.id
    WHERE fr.sender_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `).all(character.id);

  res.json({
    received: receivedRequests,
    sent: sentRequests
  });
});

router.post('/request', auth, (req, res) => {
  const { receiverName, message } = req.body;
  
  if (!receiverName || receiverName.trim().length === 0) {
    return res.status(400).json({ error: '请输入要添加的好友名称' });
  }

  const sender = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!sender) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const receiver = db.prepare('SELECT * FROM characters WHERE name = ?').get(receiverName.trim());
  if (!receiver) {
    return res.status(404).json({ error: '该玩家不存在' });
  }

  if (sender.id === receiver.id) {
    return res.status(400).json({ error: '不能添加自己为好友' });
  }

  const existingFriend = db.prepare(`
    SELECT * FROM friends WHERE character_id = ? AND friend_id = ?
  `).get(sender.id, receiver.id);
  
  if (existingFriend) {
    return res.status(400).json({ error: '已经是好友了' });
  }

  const existingRequest = db.prepare(`
    SELECT * FROM friend_requests 
    WHERE ((sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?))
    AND status = 'pending'
  `).get(sender.id, receiver.id, receiver.id, sender.id);
  
  if (existingRequest) {
    return res.status(400).json({ error: '已经有未处理的好友申请' });
  }

  const result = db.prepare(`
    INSERT INTO friend_requests (sender_id, receiver_id, message)
    VALUES (?, ?, ?)
  `).run(sender.id, receiver.id, message || null);

  res.json({
    message: `已向 ${receiver.name} 发送好友申请`,
    request: {
      id: result.lastInsertRowid,
      receiver_name: receiver.name,
      receiver_level: receiver.level,
      receiver_realm: receiver.realm
    }
  });
});

router.post('/accept/:requestId', auth, (req, res) => {
  const { requestId } = req.params;
  
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const request = db.prepare(`
    SELECT * FROM friend_requests WHERE id = ? AND status = 'pending'
  `).get(requestId);
  
  if (!request) {
    return res.status(404).json({ error: '好友申请不存在或已处理' });
  }

  if (request.receiver_id !== character.id) {
    return res.status(403).json({ error: '无权处理此好友申请' });
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT OR IGNORE INTO friends (character_id, friend_id) VALUES (?, ?)
    `).run(character.id, request.sender_id);
    
    db.prepare(`
      INSERT OR IGNORE INTO friends (character_id, friend_id) VALUES (?, ?)
    `).run(request.sender_id, character.id);
    
    db.prepare(`
      UPDATE friend_requests SET status = 'accepted' WHERE id = ?
    `).run(requestId);
  });

  try {
    transaction();
    
    const newFriend = db.prepare(`
      SELECT c.*, u.id as user_id
      FROM characters c 
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(request.sender_id);
    
    const friendRecord = db.prepare('SELECT * FROM friends WHERE character_id = ? AND friend_id = ?').get(character.id, newFriend.id);
    
    res.json({
      message: `已添加 ${newFriend.name} 为好友`,
      friend: {
        id: friendRecord ? friendRecord.id : null,
        friend_id: newFriend.id,
        friend_name: newFriend.name,
        friend_level: newFriend.level,
        friend_realm: newFriend.realm,
        isOnline: isUserOnline(newFriend.user_id)
      }
    });
  } catch (err) {
    res.status(500).json({ error: '处理好友申请失败' });
  }
});

router.post('/reject/:requestId', auth, (req, res) => {
  const { requestId } = req.params;
  
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const request = db.prepare(`
    SELECT * FROM friend_requests WHERE id = ? AND status = 'pending'
  `).get(requestId);
  
  if (!request) {
    return res.status(404).json({ error: '好友申请不存在或已处理' });
  }

  if (request.receiver_id !== character.id) {
    return res.status(403).json({ error: '无权处理此好友申请' });
  }

  db.prepare(`
    UPDATE friend_requests SET status = 'rejected' WHERE id = ?
  `).run(requestId);

  res.json({ message: '已拒绝好友申请' });
});

router.delete('/:friendId', auth, (req, res) => {
  const { friendId } = req.params;
  
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const friend = db.prepare(`
    SELECT c.* FROM friends f
    JOIN characters c ON f.friend_id = c.id
    WHERE f.character_id = ? AND f.friend_id = ?
  `).get(character.id, friendId);
  
  if (!friend) {
    return res.status(404).json({ error: '该好友不存在' });
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      DELETE FROM friends WHERE character_id = ? AND friend_id = ?
    `).run(character.id, friendId);
    
    db.prepare(`
      DELETE FROM friends WHERE character_id = ? AND friend_id = ?
    `).run(friendId, character.id);
  });

  try {
    transaction();
    res.json({ message: `已删除好友 ${friend.name}` });
  } catch (err) {
    res.status(500).json({ error: '删除好友失败' });
  }
});

router.post('/heartbeat', auth, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  
  const existing = db.prepare('SELECT * FROM user_online WHERE user_id = ?').get(req.user.id);
  
  if (existing) {
    db.prepare(`
      UPDATE user_online 
      SET last_heartbeat = datetime('now'), is_online = 1, character_id = ?
      WHERE user_id = ?
    `).run(character ? character.id : null, req.user.id);
  } else {
    db.prepare(`
      INSERT INTO user_online (user_id, character_id, is_online, last_heartbeat)
      VALUES (?, ?, 1, datetime('now'))
    `).run(req.user.id, character ? character.id : null);
  }

  res.json({ online: true });
});

router.get('/search', auth, (req, res) => {
  const { keyword } = req.query;
  
  if (!keyword || keyword.trim().length === 0) {
    return res.status(400).json({ error: '请输入搜索关键词' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) {
    return res.status(404).json({ error: '角色不存在' });
  }

  const results = db.prepare(`
    SELECT c.*, u.id as user_id
    FROM characters c
    JOIN users u ON c.user_id = u.id
    WHERE c.name LIKE ? AND c.id != ?
    ORDER BY c.name
    LIMIT 20
  `).all(`%${keyword.trim()}%`, character.id);

  const resultsWithStatus = results.map(r => ({
    ...r,
    isOnline: isUserOnline(r.user_id),
    isFriend: !!db.prepare('SELECT * FROM friends WHERE character_id = ? AND friend_id = ?').get(character.id, r.id)
  }));

  res.json({ results: resultsWithStatus });
});

router.get('/online-count', auth, (req, res) => {
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM user_online 
    WHERE is_online = 1 AND datetime(last_heartbeat) > datetime('now', '-5 minutes')
  `).get().count;
  
  res.json({ onlineCount: count });
});

module.exports = router;
