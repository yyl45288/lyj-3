import { useState, useEffect } from 'react'
import { characterAPI } from '../api'

export default function Cultivate() {
  const [character, setCharacter] = useState(null)
  const [logs, setLogs] = useState([])
  const [cultivating, setCultivating] = useState(false)
  const [breakLoading, setBreakLoading] = useState(false)
  const [message, setMessage] = useState('')

  const fetchCharacter = () => {
    characterAPI.getCharacter()
      .then((data) => setCharacter(data.character || data))
      .catch(() => {})
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

  if (!character) return <div className="loading-screen">加载中...</div>

  const expPercent = (character.exp / character.expToNext) * 100

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
          </div>

          <div className="cultivate-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${expPercent}%` }} />
              <span className="progress-text">
                {character.exp} / {character.expToNext}
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
            <button
              className="btn-breakthrough"
              onClick={handleBreakthrough}
              disabled={breakLoading || expPercent < 100}
            >
              {breakLoading ? '突破中...' : '尝试突破'}
            </button>
          </div>

          {message && (
            <div style={{
              marginTop: '1rem',
              color: message.includes('成功') ? 'var(--color-success)' : 'var(--color-danger)',
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
