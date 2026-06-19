import { useState, useEffect } from 'react'
import { dungeonAPI } from '../api'

export default function Dungeons() {
  const [dungeons, setDungeons] = useState([])
  const [activeBattle, setActiveBattle] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [battleResult, setBattleResult] = useState(null)

  function loadData() {
    setLoading(true)
    dungeonAPI.getDungeons()
      .then((data) => {
        setDungeons(data.dungeons || [])
        if (data.activeBattle) {
          setActiveBattle(data.activeBattle)
        }
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false))
  }

  function loadBattle() {
    dungeonAPI.getBattle()
      .then((data) => {
        if (data.battle) setActiveBattle(data.battle)
        else setActiveBattle(null)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadBattle, 2000)
    return () => clearInterval(interval)
  }, [])

  function handleChallenge(dungeonId) {
    setMessage('')
    setBattleResult(null)
    setLogs([])
    dungeonAPI.challenge(dungeonId)
      .then((data) => {
        setMessage(data.message)
        setActiveBattle(data.battle)
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => setMessage(err.message))
  }

  function handleAttack() {
    dungeonAPI.attack()
      .then((data) => {
        setLogs((prev) => [...prev, ...data.logs])
        if (data.battleEnded) {
          setActiveBattle(null)
          setBattleResult(data.battleResult)
          loadData()
        } else {
          setActiveBattle(data.battle)
        }
      })
      .catch((err) => setMessage(err.message))
  }

  function handleFlee() {
    dungeonAPI.flee()
      .then((data) => {
        setActiveBattle(null)
        setMessage(data.message)
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => setMessage(err.message))
  }

  if (activeBattle) {
    const monster = activeBattle.monster
    const monsterHpPercent = Math.max(0, (activeBattle.monster_hp / activeBattle.monster_max_hp) * 100)
    const playerHpPercent = Math.max(0, (activeBattle.player_hp / activeBattle.player_max_hp) * 100)
    const petHpPercent = activeBattle.pet_id && activeBattle.pet_max_hp
      ? Math.max(0, (activeBattle.pet_hp / activeBattle.pet_max_hp) * 100)
      : 0

    return (
      <div className="page-container">
        <h2 className="page-title">
          ⚔️ 副本战斗 - {activeBattle.dungeon?.name}（第 {activeBattle.current_wave}/{activeBattle.total_waves} 波）
        </h2>
        {message && <div className="game-message">{message}</div>}

        <div className="battle-area">
          <div className="battle-side enemy-side">
            <div className="character-card monster-card">
              <div className="char-name">{monster?.name}</div>
              <div className="hp-bar">
                <div className="hp-fill" style={{ width: `${monsterHpPercent}%` }} />
                <span className="hp-text">{activeBattle.monster_hp} / {activeBattle.monster_max_hp}</span>
              </div>
              <div className="char-level">Lv.{monster?.level}</div>
            </div>
          </div>

          <div className="battle-side player-side">
            {activeBattle.pet && (
              <div className="character-card pet-card small">
                <div className="char-name">{activeBattle.pet.name}</div>
                <div className="hp-bar">
                  <div className="hp-fill" style={{ width: `${petHpPercent}%` }} />
                  <span className="hp-text">{activeBattle.pet_hp} / {activeBattle.pet_max_hp}</span>
                </div>
              </div>
            )}
            <div className="character-card player-card">
              <div className="char-name">你</div>
              <div className="hp-bar">
                <div className="hp-fill" style={{ width: `${playerHpPercent}%` }} />
                <span className="hp-text">{activeBattle.player_hp} / {activeBattle.player_max_hp}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="battle-actions">
          <button className="btn-primary" onClick={handleAttack}>攻击</button>
          <button className="btn-secondary" onClick={handleFlee}>退出副本</button>
        </div>

        <div className="battle-log">
          <h4>战斗日志</h4>
          {logs.length === 0 && <div className="empty-tip">战斗进行中...</div>}
          {logs.map((log, i) => (
            <div key={i} className="log-line">{log}</div>
          ))}
        </div>
      </div>
    )
  }

  if (battleResult) {
    return (
      <div className="page-container">
        <h2 className="page-title">
          {battleResult.type === 'victory' ? '🎉 通关成功！' : battleResult.type === 'defeat' ? '💀 挑战失败' : '退出副本'}
        </h2>
        {battleResult.message && <div className="game-message success">{battleResult.message}</div>}
        {battleResult.isFirstClear && <div className="game-message success">✨ 首次通关额外奖励！</div>}
        {battleResult.rewards && (
          <div className="section-card">
            <h3>获得奖励</h3>
            <div className="stats-bar">
              {battleResult.rewards.gold > 0 && <div className="stat-item">💰 金币 +{battleResult.rewards.gold}</div>}
              {battleResult.rewards.exp > 0 && <div className="stat-item">✨ 经验 +{battleResult.rewards.exp}</div>}
              {battleResult.rewards.leveledUp && <div className="stat-item" style={{ color: '#d4af37' }}>⬆️ 等级提升至 Lv.{battleResult.rewards.newLevel}</div>}
            </div>
            {battleResult.rewards.items && battleResult.rewards.items.length > 0 && (
              <div className="item-grid">
                {battleResult.rewards.items.map((it, idx) => (
                  <div key={idx} className="item-card small">
                    <div className="item-name">🎁 物品奖励</div>
                    <div className="item-desc">物品ID: {it.itemId} × {it.quantity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {battleResult.type === 'defeat' && (
          <div className="section-card">
            <h3>损失</h3>
            <div className="stats-bar">
              <div className="stat-item">经验 -{battleResult.expLoss || 0}</div>
              <div className="stat-item">生命恢复至 {battleResult.newHp || 0}</div>
            </div>
          </div>
        )}
        <button className="btn-primary" onClick={() => { setBattleResult(null); loadData() }}>
          返回副本列表
        </button>
      </div>
    )
  }

  return (
    <div className="page-container">
      <h2 className="page-title">🏯 副本系统</h2>

      {message && <div className="game-message">{message}</div>}

      {loading && <div className="loading">加载中...</div>}

      {!loading && (
        <div className="section-card">
          {dungeons.length === 0 ? (
            <div className="empty-tip">暂无副本</div>
          ) : (
            <div className="item-grid">
              {dungeons.map((d) => (
                <div
                  key={d.id}
                  className={`dungeon-card ${d.canEnter ? '' : 'locked'}`}
                >
                  <div className="dungeon-header">
                    <span className="dungeon-icon">{d.icon || '🏰'}</span>
                    <div className="dungeon-info">
                      <div className="dungeon-name">{d.name}</div>
                      <div className="dungeon-desc">{d.description}</div>
                    </div>
                  </div>

                  <div className="dungeon-meta">
                    <span>要求：{d.realm_req ? `${d.realm_req} ` : ''}Lv.{d.level_req}+</span>
                    <span>每日挑战：{d.todayCount} / {d.dailyLimit}</span>
                    <span>总通关：{d.totalCleared} 次</span>
                    {d.firstCleared && <span style={{ color: '#d4af37' }}>✔ 首通已达</span>}
                  </div>

                  <div className="rewards-box">
                    <div className="rewards-title">通关奖励</div>
                    {d.clearRewards?.gold && <span className="reward-tag">💰 {d.clearRewards.gold}</span>}
                    {d.clearRewards?.exp && <span className="reward-tag">✨ {d.clearRewards.exp}</span>}
                    {d.firstCleared === false && d.firstClearRewards && (
                      <>
                        <div className="rewards-title" style={{ color: '#d4af37' }}>首次通关奖励</div>
                        {d.firstClearRewards.gold && <span className="reward-tag gold">💰 {d.firstClearRewards.gold}</span>}
                        {d.firstClearRewards.exp && <span className="reward-tag gold">✨ {d.firstClearRewards.exp}</span>}
                        {d.firstClearRewards.items?.map((it, idx) => (
                          <span key={idx} className="reward-tag gold">🎁 x{it.quantity}</span>
                        ))}
                      </>
                    )}
                  </div>

                  {d.canEnter ? (
                    d.canChallengeToday ? (
                      <button
                        className="btn-primary"
                        onClick={() => handleChallenge(d.id)}
                      >
                        挑战副本
                      </button>
                    ) : (
                      <div className="locked-tag">今日次数已用完</div>
                    )
                  ) : (
                    <div className="locked-tag">
                      {d.realm_req ? `需要 ${d.realm_req}` : `需要 Lv.${d.level_req}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
