import { useState, useEffect } from 'react'
import { characterAPI, titleAPI } from '../api'

export default function Character() {
  const [character, setCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [equippedTitle, setEquippedTitle] = useState(null)

  const fetchCharacter = () => {
    Promise.all([
      characterAPI.getCharacter(),
      titleAPI.getTitles().catch(() => ({}))
    ]).then(([charData, titleData]) => {
      setCharacter(charData.character || charData)
      setEquippedTitle(titleData.equippedTitle || null)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCharacter()
  }, [])

  const handleBreakthrough = async () => {
    setActionLoading(true)
    setMessage('')
    try {
      const data = await characterAPI.breakthrough()
      setMessage(data.message || '突破成功！')
      fetchCharacter()
    } catch (err) {
      setMessage(err.message || '突破失败')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="loading-screen">加载中...</div>
  if (!character) return null

  const expPercent = (character.exp / character.expToNext) * 100

  return (
    <div>
      <h1 className="page-title">角色详情</h1>

      {message && <div className="card" style={{ textAlign: 'center', color: message.includes('成功') ? 'var(--color-success)' : 'var(--color-danger)' }}>{message}</div>}

      <div className="card">
        <div className="card-title">
          {character.name}
          {equippedTitle && (
            <span style={{ marginLeft: '0.8rem', fontSize: '1rem', color: '#d4af37', fontWeight: 500 }}>
              「{equippedTitle.icon || '🏅'} {equippedTitle.name}」
            </span>
          )}
        </div>
        <div className="stat-grid">
          {equippedTitle && (
            <div className="stat-item">
              <span className="stat-label">当前称号</span>
              <span className="stat-value" style={{ color: '#d4af37' }}>
                {equippedTitle.name}
                {equippedTitle.stats && Object.entries(equippedTitle.stats).map(([k, v]) => (
                  <span key={k} style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: '#7ec8e3' }}>
                    +{v} {({attack:'攻',defense:'防',speed:'速',max_hp:'血',max_mp:'灵'})[k] || k}
                  </span>
                ))}
              </span>
            </div>
          )}
          <div className="stat-item">
            <span className="stat-label">境界</span>
            <span className="stat-value">{character.realm}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">等级</span>
            <span className="stat-value">{character.level}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">经验</span>
            <span className="stat-value">{character.exp} / {character.expToNext}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">生命</span>
            <span className="stat-value">{character.hp} / {character.maxHp}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">灵力</span>
            <span className="stat-value">{character.mp} / {character.maxMp}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">攻击</span>
            <span className="stat-value">{character.attack}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">防御</span>
            <span className="stat-value">{character.defense}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">速度</span>
            <span className="stat-value">{character.speed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">悟性</span>
            <span className="stat-value">{character.wisdom || character.intelligence}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">金币</span>
            <span className="stat-value">{character.gold}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">修为进度</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${expPercent}%` }} />
          <span className="progress-text">{Math.floor(expPercent)}%</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            className="btn-breakthrough"
            onClick={handleBreakthrough}
            disabled={actionLoading || expPercent < 100}
          >
            {actionLoading ? '突破中...' : '尝试突破'}
          </button>
        </div>
      </div>
    </div>
  )
}
