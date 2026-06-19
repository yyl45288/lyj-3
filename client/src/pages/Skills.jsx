import { useState, useEffect } from 'react'
import { skillAPI, characterAPI } from '../api'

const TYPE_NAMES = { active: '主动', passive: '被动' }
const SUBTYPE_NAMES = { attack: '攻击', buff: '增益', heal: '治疗', passive: '被动' }

export default function Skills() {
  const [skills, setSkills] = useState([])
  const [character, setCharacter] = useState(null)
  const [stats, setStats] = useState({ total: 0, learned: 0, active: 0, passive: 0 })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState('all')

  function loadData() {
    setLoading(true)
    Promise.all([skillAPI.getSkills(), characterAPI.getCharacter()])
      .then(([skillData, charData]) => {
        setSkills(skillData.skills || [])
        setStats(skillData.stats || {})
        setCharacter(charData.character || charData)
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleLearn(skillId) {
    skillAPI.learnSkill(skillId)
      .then((data) => {
        setMessage(data.message)
        loadData()
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => setMessage(err.message))
  }

  function handleUpgrade(skillId) {
    skillAPI.upgradeSkill(skillId)
      .then((data) => {
        setMessage(data.message)
        loadData()
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => setMessage(err.message))
  }

  const filtered = skills.filter((s) => {
    if (tab === 'all') return true
    if (tab === 'learned') return s.learned
    if (tab === 'unlearned') return !s.learned
    return s.type === tab
  })

  return (
    <div className="page-container">
      <h2 className="page-title">📖 技能系统</h2>

      {message && <div className="game-message">{message}</div>}

      <div className="stats-bar">
        <div className="stat-item">技能总数：{stats.total}</div>
        <div className="stat-item">已学习：{stats.learned}</div>
        <div className="stat-item">主动：{stats.active}</div>
        <div className="stat-item">被动：{stats.passive}</div>
      </div>

      {character && (
        <div className="stats-bar">
          <div className="stat-item">等级：Lv.{character.level}</div>
          <div className="stat-item">境界：{character.realm}</div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          全部
        </button>
        <button
          className={`tab-btn ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          主动
        </button>
        <button
          className={`tab-btn ${tab === 'passive' ? 'active' : ''}`}
          onClick={() => setTab('passive')}
        >
          被动
        </button>
        <button
          className={`tab-btn ${tab === 'learned' ? 'active' : ''}`}
          onClick={() => setTab('learned')}
        >
          已学
        </button>
        <button
          className={`tab-btn ${tab === 'unlearned' ? 'active' : ''}`}
          onClick={() => setTab('unlearned')}
        >
          未学
        </button>
      </div>

      {loading && <div className="loading">加载中...</div>}

      {!loading && (
        <div className="section-card">
          {filtered.length === 0 ? (
            <div className="empty-tip">暂无技能</div>
          ) : (
            <div className="item-grid">
              {filtered.map((s) => {
                const maxLevel = s.max_level || 10
                const isMaxLevel = s.level >= maxLevel
                const profPercent = s.proficiencyToNext > 0
                  ? Math.floor((s.proficiency / s.proficiencyToNext) * 100)
                  : 100

                return (
                  <div
                    key={s.id}
                    className={`skill-card ${s.learned ? 'learned' : 'unlearned'} type-${s.type}`}
                  >
                    <div className="skill-header">
                      <span className="skill-icon">{s.icon || '✨'}</span>
                      <div className="skill-header-info">
                        <div className="skill-name">{s.name}</div>
                        <div className="skill-type-tags">
                          <span className={`tag tag-${s.type}`}>{TYPE_NAMES[s.type]}</span>
                          <span className="tag">{SUBTYPE_NAMES[s.subtype] || s.subtype}</span>
                        </div>
                      </div>
                      {s.learned && (
                        <div className="skill-level">Lv.{s.level}/{maxLevel}</div>
                      )}
                    </div>

                    <div className="skill-desc">{s.description}</div>

                    <div className="skill-meta">
                      {s.type === 'active' && <span>灵力消耗：{s.mp_cost || 0}</span>}
                      <span>
                        要求：{s.realm_req ? `${s.realm_req} ` : ''}Lv.{s.level_req}+
                      </span>
                    </div>

                    {s.learned ? (
                      <>
                        {!isMaxLevel && (
                          <div className="proficiency-bar">
                            <div
                              className="proficiency-fill"
                              style={{ width: `${profPercent}%` }}
                            />
                            <div className="proficiency-text">
                              熟练度 {s.proficiency} / {s.proficiencyToNext}
                            </div>
                          </div>
                        )}
                        {isMaxLevel ? (
                          <div className="max-level-tag">已满级</div>
                        ) : (
                          <button
                            className="btn-primary btn-small"
                            disabled={s.proficiency < s.proficiencyToNext}
                            onClick={() => handleUpgrade(s.id)}
                          >
                            升级技能
                          </button>
                        )}
                      </>
                    ) : s.canLearn ? (
                      <button
                        className="btn-primary btn-small"
                        onClick={() => handleLearn(s.id)}
                      >
                        学习技能
                      </button>
                    ) : (
                      <div className="locked-tag">
                        {s.realm_req
                          ? `需要 ${s.realm_req}`
                          : `需要 Lv.${s.level_req}`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
