import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { battleAPI, characterAPI, equipmentAPI } from '../api'

export default function Battle() {
  const [battle, setBattle] = useState(null)
  const [character, setCharacter] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCapture, setShowCapture] = useState(false)
  const [captureItems, setCaptureItems] = useState([])
  const [battleEnded, setBattleEnded] = useState(false)
  const [battleResult, setBattleResult] = useState(null)
  const navigate = useNavigate()

  const fetchData = () => {
    Promise.all([
      battleAPI.getBattle(),
      characterAPI.getCharacter(),
      equipmentAPI.getInventory()
    ]).then(([battleData, charData, invData]) => {
      setBattle(battleData.battle)
      setCharacter(charData.character || charData)
      const captureInv = invData.inventory?.filter(
        (inv) => inv.effect?.type === 'capture_bonus' && inv.quantity > 0
      ) || []
      setCaptureItems(captureInv)
      if (!battleData.battle) {
        setBattleEnded(true)
      }
    }).catch(() => {
      navigate('/maps')
    })
  }

  useEffect(() => {
    fetchData()
  }, [navigate])

  const handleAttack = async () => {
    if (loading || battleEnded) return
    setLoading(true)
    try {
      const data = await battleAPI.attack()
      setLogs((prev) => [...data.logs, ...prev].slice(0, 20))
      setBattle(data.battle)
      setCharacter(data.character)

      if (data.battleEnded) {
        setBattleEnded(true)
        setBattleResult(data.battleResult)
      }
    } catch (err) {
      const newLog = {
        id: Date.now(),
        text: err.message || '攻击失败',
        type: 'error'
      }
      setLogs((prev) => [newLog, ...prev].slice(0, 20))
    } finally {
      setLoading(false)
    }
  }

  const handleCapture = async (itemId) => {
    if (loading || battleEnded) return
    setLoading(true)
    try {
      const data = await battleAPI.capture(itemId)
      setLogs((prev) => [...data.logs, ...prev].slice(0, 20))
      setBattle(data.battle)
      if (data.character) {
        setCharacter(data.character)
      }
      setShowCapture(false)

      if (data.battleEnded) {
        setBattleEnded(true)
        setBattleResult(data.battleResult)
      }
      fetchData()
    } catch (err) {
      const newLog = {
        id: Date.now(),
        text: err.message || '捕捉失败',
        type: 'error'
      }
      setLogs((prev) => [newLog, ...prev].slice(0, 20))
      setLoading(false)
    }
  }

  const handleFlee = async () => {
    if (loading || battleEnded) return
    setLoading(true)
    try {
      const data = await battleAPI.flee()
      setLogs((prev) => [...data.logs, ...prev].slice(0, 20))
      setBattle(data.battle)
      if (data.character) {
        setCharacter(data.character)
      }

      if (data.battleEnded) {
        setBattleEnded(true)
        setBattleResult(data.battleResult)
      }
    } catch (err) {
      const newLog = {
        id: Date.now(),
        text: err.message || '逃跑失败',
        type: 'error'
      }
      setLogs((prev) => [newLog, ...prev].slice(0, 20))
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = () => {
    navigate('/maps')
  }

  if (!battle && !battleEnded) return <div className="loading-screen">加载中...</div>

  const monster = battle?.monster
  const pet = battle?.pet

  return (
    <div className="battle-page">
      <h1 className="page-title">战斗</h1>

      {battle && (
        <div className="card battle-arena">
          <div className="battle-enemy">
            <div className="enemy-info">
              <div className="enemy-name">{monster?.name}</div>
              <div className="enemy-level">Lv.{monster?.level}</div>
            </div>
            <div className="enemy-stats">
              <div className="stat-row">
                <span>生命值</span>
                <span className="hp-value">
                  {battle.monster_hp} / {battle.monster_max_hp}
                </span>
              </div>
              <div className="progress-bar enemy">
                <div
                  className="progress-fill hp"
                  style={{ width: `${(battle.monster_hp / battle.monster_max_hp) * 100}%` }}
                />
              </div>
              <div className="enemy-desc">{monster?.description}</div>
            </div>
          </div>

          <div className="battle-vs">VS</div>

          <div className="battle-player">
            <div className="player-info">
              <div className="player-name">{character?.name}</div>
              <div className="player-level">
                {character?.realm} Lv.{character?.level}
              </div>
            </div>
            <div className="player-stats">
              <div className="stat-row">
                <span>生命值</span>
                <span className="hp-value">
                  {battle.player_hp} / {battle.player_max_hp}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill hp"
                  style={{ width: `${(battle.player_hp / battle.player_max_hp) * 100}%` }}
                />
              </div>
            </div>

            {pet && battle.pet_hp > 0 && (
              <div className="pet-stats">
                <div className="pet-name">
                  🐾 {pet.name} ({pet.petInfo?.name})
                </div>
                <div className="stat-row">
                  <span>HP</span>
                  <span className="hp-value">
                    {battle.pet_hp} / {battle.pet_max_hp}
                  </span>
                </div>
                <div className="progress-bar small">
                  <div
                    className="progress-fill pet"
                    style={{ width: `${(battle.pet_hp / battle.pet_max_hp) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!battleEnded && battle && (
        <div className="card battle-actions">
          <div className="action-grid">
            <button
              className="btn-action btn-attack"
              onClick={handleAttack}
              disabled={loading}
            >
              ⚔️ 攻击
            </button>
            <button
              className="btn-action btn-capture"
              onClick={() => setShowCapture(!showCapture)}
              disabled={loading || captureItems.length === 0}
            >
              🪤 捕捉
            </button>
            <button
              className="btn-action btn-flee"
              onClick={handleFlee}
              disabled={loading}
            >
              🏃 逃跑
            </button>
          </div>

          {showCapture && captureItems.length > 0 && (
            <div className="capture-panel">
              <div className="panel-title">选择捕捉道具</div>
              <div className="capture-items">
                {captureItems.map((item) => (
                  <button
                    key={item.id}
                    className="capture-item"
                    onClick={() => handleCapture(item.id)}
                    disabled={loading}
                  >
                    <div className="item-name">{item.name}</div>
                    <div className="item-desc">
                      +{item.effect?.value}% 成功率 × {item.quantity}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {battleEnded && battleResult && (
        <div className="card battle-result">
          <div
            className={`result-title ${battleResult.type}`}
          >
            {battleResult.type === 'victory' && '🎉 战斗胜利！'}
            {battleResult.type === 'defeat' && '💀 战斗失败...'}
            {battleResult.type === 'fled' && '🏃 成功逃脱！'}
            {battleResult.type === 'captured' && '✨ 捕捉成功！'}
          </div>
          <div className="result-details">
            {battleResult.type === 'victory' && (
              <>
                <div className="reward-item">
                  经验 +{battleResult.expGained}
                </div>
                <div className="reward-item">
                  金币 +{battleResult.goldGained}
                </div>
                {battleResult.leveledUp && (
                  <div className="level-up">
                    ⬆ 等级提升至 {battleResult.newLevel} 级！
                  </div>
                )}
              </>
            )}
            {battleResult.type === 'defeat' && (
              <>
                <div className="penalty-item">
                  经验 -{battleResult.expLost}
                </div>
                <div className="penalty-item">
                  金币 -{battleResult.goldLost}
                </div>
              </>
            )}
            {battleResult.type === 'captured' && (
              <div className="pet-capture">
                🐾 获得宠物: {battleResult.pet.name} ({battleResult.pet.type})
              </div>
            )}
          </div>
          <button className="btn-action" onClick={handleReturn}>
            返回地图
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="card battle-logs">
          <div className="card-title">战斗日志</div>
          <div className="battle-log-list">
            {logs.map((log, index) => (
              <div key={typeof log === 'string' ? index : log.id || index} className="log-entry">
                {typeof log === 'string' ? log : log.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
