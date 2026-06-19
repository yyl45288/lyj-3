import { useState, useEffect } from 'react'
import { titleAPI } from '../api'

export default function Titles() {
  const [titles, setTitles] = useState([])
  const [equippedTitle, setEquippedTitle] = useState(null)
  const [stats, setStats] = useState({ total: 0, obtained: 0 })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  function loadTitles() {
    setLoading(true)
    titleAPI.getTitles()
      .then((data) => {
        setTitles(data.titles || [])
        setEquippedTitle(data.equippedTitle || null)
        setStats(data.stats || { total: 0, obtained: 0 })
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTitles()
  }, [])

  function handleEquip(titleId) {
    titleAPI.equipTitle(titleId)
      .then((data) => {
        setMessage(data.message)
        loadTitles()
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => setMessage(err.message))
  }

  function handleUnequip() {
    titleAPI.unequipTitle()
      .then((data) => {
        setMessage(data.message)
        loadTitles()
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => setMessage(err.message))
  }

  const obtainedList = titles.filter((t) => t.obtained)
  const lockedList = titles.filter((t) => !t.obtained)

  return (
    <div className="page-container">
      <h2 className="page-title">🏆 称号系统</h2>

      {message && <div className="game-message">{message}</div>}

      <div className="stats-bar">
        <div className="stat-item">称号总数：{stats.total}</div>
        <div className="stat-item">已获得：{stats.obtained}</div>
        {equippedTitle && (
          <div className="stat-item" style={{ color: '#d4af37', fontWeight: 700 }}>
            已佩戴：{equippedTitle.icon} {equippedTitle.name}
            <button
              className="btn-small"
              style={{ marginLeft: 10 }}
              onClick={handleUnequip}
            >
              卸下
            </button>
          </div>
        )}
      </div>

      {loading && <div className="loading">加载中...</div>}

      {!loading && (
        <>
          {equippedTitle && (
            <div className="section-card">
              <h3>当前佩戴</h3>
              <div className="title-card equipped">
                <div className="title-icon">{equippedTitle.icon}</div>
                <div className="title-info">
                  <div className="title-name">{equippedTitle.name}</div>
                  <div className="title-desc">{equippedTitle.description}</div>
                  <div className="title-stats">
                    {Object.entries(equippedTitle.stats || {}).map(([k, v]) => (
                      <span key={k} className="stat-tag">
                        {({ attack: '攻击', defense: '防御', speed: '速度', max_hp: '生命', max_mp: '灵力' }[k] || k)} +{v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="section-card">
            <h3>已获得称号</h3>
            {obtainedList.length === 0 ? (
              <div className="empty-tip">暂无获得的称号，完成成就可获得称号</div>
            ) : (
              <div className="item-grid">
                {obtainedList.map((t) => (
                  <div
                    key={t.id}
                    className={`title-card ${t.equipped ? 'equipped' : ''}`}
                  >
                    <div className="title-icon">{t.icon}</div>
                    <div className="title-info">
                      <div className="title-name">{t.name}</div>
                      <div className="title-desc">{t.description}</div>
                      <div className="title-stats">
                        {Object.entries(t.stats || {}).map(([k, v]) => (
                          <span key={k} className="stat-tag">
                            {({ attack: '攻击', defense: '防御', speed: '速度', max_hp: '生命', max_mp: '灵力' }[k] || k)} +{v}
                          </span>
                        ))}
                      </div>
                      {t.equipped ? (
                        <div className="equipped-tag">已佩戴</div>
                      ) : (
                        <button
                          className="btn-primary btn-small"
                          onClick={() => handleEquip(t.id)}
                        >
                          佩戴
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section-card">
            <h3>未获得称号</h3>
            {lockedList.length === 0 ? (
              <div className="empty-tip">所有称号已获得！</div>
            ) : (
              <div className="item-grid">
                {lockedList.map((t) => (
                  <div key={t.id} className="title-card locked">
                    <div className="title-icon">🔒</div>
                    <div className="title-info">
                      <div className="title-name">{t.name}</div>
                      <div className="title-desc">{t.description}</div>
                      <div className="title-stats">
                        {Object.entries(t.stats || {}).map(([k, v]) => (
                          <span key={k} className="stat-tag">
                            {({ attack: '攻击', defense: '防御', speed: '速度', max_hp: '生命', max_mp: '灵力' }[k] || k)} +{v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
