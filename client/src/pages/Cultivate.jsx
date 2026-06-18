import { useState, useEffect } from 'react'
import { characterAPI, tribulationAPI } from '../api'

export default function Cultivate() {
  const [character, setCharacter] = useState(null)
  const [logs, setLogs] = useState([])
  const [cultivating, setCultivating] = useState(false)
  const [breakLoading, setBreakLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tribulationInfo, setTribulationInfo] = useState(null)
  const [showTribulation, setShowTribulation] = useState(false)
  const [tribulationLoading, setTribulationLoading] = useState(false)

  const fetchCharacter = () => {
    Promise.all([
      characterAPI.getCharacter(),
      tribulationAPI.getInfo()
    ]).then(([charData, tribData]) => {
      setCharacter(charData.character || charData)
      setTribulationInfo(tribData)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchCharacter()
  }, [])

  const handleCultivate = async () => {
    setCultivating(true)
    setMessage('')
    try {
      const data = await characterAPI.cultivate()
      const result = data.result || data
      const expGain = result.expGain || result.exp || 0
      const levelUp = result.levelUp || false

      const newLog = {
        id: Date.now(),
        text: levelUp
          ? `修炼获得 ${expGain} 经验 —— 等级提升！`
          : `修炼获得 ${expGain} 经验`,
        expGain,
        levelUp,
        time: new Date().toLocaleTimeString()
      }
      setLogs((prev) => [newLog, ...prev].slice(0, 10))

      if (result.message) setMessage(result.message)
      fetchCharacter()
    } catch (err) {
      setMessage(err.message || '修炼失败')
    } finally {
      setCultivating(false)
    }
  }

  const handleBreakthrough = async () => {
    setBreakLoading(true)
    setMessage('')
    try {
      const data = await characterAPI.breakthrough()
      setMessage(data.message || '突破成功！')
      fetchCharacter()
    } catch (err) {
      setMessage(err.message || '突破失败')
    } finally {
      setBreakLoading(false)
    }
  }

  const handleTribulation = async (itemId = null) => {
    setTribulationLoading(true)
    setMessage('')
    try {
      const data = await tribulationAPI.undergo(itemId)
      setMessage(data.message)
      setShowTribulation(false)
      fetchCharacter()
    } catch (err) {
      setMessage(err.message || '渡劫失败')
    } finally {
      setTribulationLoading(false)
    }
  }

  if (!character) return <div className="loading-screen">加载中...</div>

  const expPercent = (character.exp / character.expToNext) * 100
  const canBreakthrough = tribulationInfo?.canTribulate || expPercent >= 100
  const needsTribulation = character.level >= 10 && tribulationInfo?.nextRealm

  return (
    <div>
      <h1 className="page-title">修炼</h1>

      <div className="card">
        <div className="cultivate-area">
          <div className="cultivate-info">
            <div className="realm-name">{character.realm}</div>
            <div style={{ color: 'var(--color-text-dim)', marginBottom: '0.5rem' }}>
              等级 {character.level}
            </div>
            {tribulationInfo?.nextRealm && (
              <div className="next-realm-info">
                下一境界: {tribulationInfo.nextRealm.name} (需要 {tribulationInfo.nextRealm.levelReq} 级)
              </div>
            )}
          </div>

          <div className="cultivate-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${expPercent}%` }} />
              <span className="progress-text">
                {character.exp} / {character.expToNext}
                {needsTribulation && character.level >= tribulationInfo.nextRealm.levelReq && (
                  <span className="overflow-warning"> (经验已满，请渡劫！)</span>
                )}
              </span>
            </div>
          </div>

          <button
            className="btn-action btn-cultivate"
            onClick={handleCultivate}
            disabled={cultivating}
          >
            {cultivating ? '修炼中...' : '修 炼'}
          </button>

          <div style={{ marginTop: '1.5rem' }}>
            {needsTribulation ? (
              <div>
                <button
                  className="btn-tribulation"
                  onClick={() => setShowTribulation(!showTribulation)}
                  disabled={tribulationLoading || !tribulationInfo?.canTribulate}
                >
                  {tribulationLoading ? '渡劫中...' : '⚡ 渡天劫'}
                </button>
                {!tribulationInfo?.canTribulate && tribulationInfo && (
                  <div style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {character.level < tribulationInfo.nextRealm.levelReq
                      ? `需要等级 ${tribulationInfo.nextRealm.levelReq}`
                      : character.hp < character.max_hp
                      ? '需要满血状态'
                      : ''}
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn-breakthrough"
                onClick={handleBreakthrough}
                disabled={breakLoading || expPercent < 100}
              >
                {breakLoading ? '突破中...' : '尝试突破'}
              </button>
            )}
          </div>

          {showTribulation && tribulationInfo && (
            <div className="tribulation-panel">
              <div className="panel-title">天劫降临！</div>
              <div className="tribulation-info">
                <div className="tribulation-success-rate">
                  基础成功率: <span className="highlight">{tribulationInfo.minSuccessRate.toFixed(1)}%</span>
                </div>
                <div className="tribulation-rewards">
                  <div className="reward-title">渡劫成功奖励:</div>
                  <div className="reward-list">
                    <span>🏆 晋升 {tribulationInfo.nextRealm.name}</span>
                    <span>❤️ +{tribulationInfo.nextRealm.hpBonus} 生命值</span>
                    <span>💠 +{tribulationInfo.nextRealm.mpBonus} 灵力</span>
                    <span>⚔️ +{tribulationInfo.nextRealm.atkBonus} 攻击</span>
                    <span>🛡️ +{tribulationInfo.nextRealm.defBonus} 防御</span>
                    <span>💨 +{tribulationInfo.nextRealm.speedBonus} 速度</span>
                  </div>
                </div>
                {tribulationInfo.tribItems && tribulationInfo.tribItems.length > 0 && (
                  <div className="tribulation-items">
                    <div className="items-title">使用渡劫道具:</div>
                    <div className="items-list">
                      {tribulationInfo.tribItems.map((item) => (
                        <button
                          key={item.id}
                          className="trib-item-btn"
                          onClick={() => handleTribulation(item.item_id)}
                          disabled={tribulationLoading}
                        >
                          <span>{item.itemData?.name} × {item.quantity}</span>
                          <span className="item-bonus">+{item.effect?.value}% 成功率{item.effect?.saveOnFail ? ' (免死)' : ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  className="btn-action btn-tribulation-final"
                  onClick={() => handleTribulation(null)}
                  disabled={tribulationLoading}
                >
                  ⚡ 直接渡劫 ({tribulationInfo.minSuccessRate.toFixed(1)}%)
                </button>
              </div>
            </div>
          )}

          {message && (
            <div style={{
              marginTop: '1rem',
              color: message.includes('成功') ? 'var(--color-success)' : message.includes('失败') ? 'var(--color-danger)' : 'var(--color-gold)',
              fontSize: '0.95rem'
            }}>
              {message}
            </div>
          )}
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card">
          <div className="card-title">修炼日志</div>
          <div className="cultivate-log">
            {logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span style={{ marginRight: '0.5rem', fontSize: '0.8rem' }}>[{log.time}]</span>
                {log.text}
                {log.levelUp && <span className="level-up"> ⬆ 等级提升！</span>}
                {!log.levelUp && <span className="exp-gain"> +{log.expGain}经验</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
