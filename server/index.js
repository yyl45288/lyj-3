const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/character');
const equipmentRoutes = require('./routes/equipment');
const questRoutes = require('./routes/quest');
const mapRoutes = require('./routes/map');
const battleRoutes = require('./routes/battle');
const petRoutes = require('./routes/pet');
const adminRoutes = require('./routes/admin');
const achievementRoutes = require('./routes/achievement');
const signInRoutes = require('./routes/signIn');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/sign-in', signInRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`修仙游戏服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;
