import { useState, useEffect } from 'react'
import { achievementAPI } from '../api'

export default function Achievement() {
  const [achievements, setAchievements] = useState([])
  const [stats, setStats] = useState({ total: 0, completed: 0, claimed: 0 })
  const [claimedTitles, setClaimedTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadAchievements = () => {
    setLoading(true)
    achievementAPI.getAchievements()
      .then((data) => {
        setAchievements(data.achievements || [])
        setStats(data.stats || { total: 0, completed: 0, claimed: 0 })
        setClaimedTitles(data.claimedTitles || [])
      })
      .catch((err) => {
        setMessage(err.message || '加载失败')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAchievements()
  }, [])

  const handleClaim = (achievementId) => {
    achievementAPI.claimReward(achievementId)
      .then((data) => {
        setMessage(data.message || '领取成功！')
        loadAchievements()
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => {
        setMessage(err.message || '领取失败')
        setTimeout(() => setMessage(''), 3000)
      })
  }

  const formatRewards = (rewards) => {
    if (!rewards) return ''
    const parts = []
    if (rewards.gold) parts.push(`金币+${rewards.gold}`)
    if (rewards.exp) parts.push(`经验+${rewards.exp}`)
    if (rewards.items && rewards.items.length > 0) {
      parts.push(`道具×${rewards.items.length}种`)
    }
    return parts.join('，')
  }

  const formatProgressText = (ach) => {
    const realms = ['练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '真仙', '金仙', '太乙金仙', '大罗金仙', '准圣', '圣人']
    if (ach.type === 'realm') {
      const curRealm = realms[Math.max(0, Math.min(ach.progress - 1, realms.length - 1))] || '-'
      const tgtRealm = realms[Math.max(0, Math.min(ach.target_value - 1, realms.length - 1))] || '-'
      return `${curRealm} → ${tgtRealm}`
    }
    if (ach.type === 'gold') {
      return `${ach.progress.toLocaleString()} / ${ach.target_value.toLocaleString()}`
    }
    if (ach.type === 'sign_in' || ach.type === 'consecutive_sign_in') {
      return `${ach.progress}天 / ${ach.target_value}天`
    }
    return `${ach.progress} / ${ach.target_value}`
  }

  if (loading) return <div className="loading-screen">加载中...</div>

  return (
    <div className="achievement-page">
      <div className="card">
        <div className="card-title">成就系统</div>
        {message && <div className="message">{message}</div>}
        
        <div className="achievement-stats">
          <div className="stat-item">
            <div className="stat-value">{stats.completed}/{stats.total}</div>
            <div className="stat-label">已完成</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.claimed}</div>
            <div className="stat-label">已领取</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{claimedTitles.length}</div>
            <div className="stat-label">已获得称号</div>
          </div>
        </div>

        {claimedTitles.length > 0 && (
          <div className="claimed-titles">
            <div className="section-title">我的称号</div>
            <div className="title-list">
              {claimedTitles.map((title, index) => (
                <span key={index} className="title-badge">{title}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">成就列表</div>
        <div className="achievement-list">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`achievement-item ${ach.completed ? 'completed' : ''} ${ach.claimed ? 'claimed' : ''}`}
            >
              <div className="achievement-icon">{ach.icon || '🏆'}</div>
              <div className="achievement-info">
                <div className="achievement-name">
                  {ach.name}
                  {ach.title && <span className="achievement-title">「{ach.title}」</span>}
                </div>
                <div className="achievement-desc">{ach.description}</div>
                <div className="achievement-progress">
                  <div className="progress-bar small">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min((ach.progress / ach.target_value) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {formatProgressText(ach)}
                  </span>
                </div>
                <div className="achievement-rewards">
                  奖励：{formatRewards(ach.rewards)}
                </div>
              </div>
              <div className="achievement-action">
                {ach.claimed ? (
                  <span className="status-text claimed">已领取</span>
                ) : ach.completed ? (
                  <button
                    className="btn-primary"
                    onClick={() => handleClaim(ach.id)}
                  >
                    领取奖励
                  </button>
                ) : (
                  <span className="status-text">未完成</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
