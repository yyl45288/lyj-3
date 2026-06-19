import { useState, useEffect } from 'react'
import { signInAPI } from '../api'

export default function SignIn() {
  const [signInInfo, setSignInInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [signing, setSigning] = useState(false)

  const loadInfo = () => {
    setLoading(true)
    signInAPI.getInfo()
      .then((data) => {
        setSignInInfo(data)
      })
      .catch((err) => {
        setMessage(err.message || '加载失败')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadInfo()
  }, [])

  const handleSignIn = () => {
    if (signing || signInInfo?.todaySigned) return
    setSigning(true)
    signInAPI.signIn()
      .then((data) => {
        setMessage(data.message || '签到成功！')
        if (data.bonusRewards && data.bonusRewards.length > 0) {
          data.bonusRewards.forEach((r) => {
            setMessage((prev) => prev + ` 连续${r.dayNumber}天奖励已发放！`)
          })
        }
        loadInfo()
        setTimeout(() => setMessage(''), 5000)
      })
      .catch((err) => {
        setMessage(err.message || '签到失败')
        setTimeout(() => setMessage(''), 3000)
      })
      .finally(() => setSigning(false))
  }

  const handleMakeup = (date) => {
    if (!window.confirm(`确定要补签 ${date} 吗？需要消耗${signInInfo?.makeupCost || 100}金币。`)) {
      return
    }
    signInAPI.makeup(date)
      .then((data) => {
        setMessage(data.message || '补签成功！')
        loadInfo()
        setTimeout(() => setMessage(''), 3000)
      })
      .catch((err) => {
        setMessage(err.message || '补签失败')
        setTimeout(() => setMessage(''), 3000)
      })
  }

  const getSignInDays = () => {
    if (!signInInfo?.signInRecords) return []
    return signInInfo.signInRecords.map((r) => r.sign_date)
  }

  const getCalendarDays = () => {
    const days = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const isToday = i === 0
      const signed = getSignInDays().includes(dateStr)
      const isPast = i > 0
      const canMakeup = isPast && !signed
      days.push({ date: dateStr, isToday, signed, canMakeup, day: date.getDate() })
    }
    return days
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

  if (loading) return <div className="loading-screen">加载中...</div>
  if (!signInInfo) return <div className="card">加载失败</div>

  const calendarDays = getCalendarDays()

  return (
    <div className="signin-page">
      <div className="card">
        <div className="card-title">每日签到</div>
        {message && <div className="message">{message}</div>}

        <div className="signin-stats">
          <div className="stat-item">
            <div className="stat-value">{signInInfo.totalDays}</div>
            <div className="stat-label">累计签到</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{signInInfo.consecutiveDays}</div>
            <div className="stat-label">连续签到</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{signInInfo.makeupCost}</div>
            <div className="stat-label">补签消耗(金币)</div>
          </div>
        </div>

        <div className="signin-action">
          <button
            className={`btn-primary large ${signInInfo.todaySigned ? 'disabled' : ''}`}
            onClick={handleSignIn}
            disabled={signInInfo.todaySigned || signing}
          >
            {signing ? '签到中...' : signInInfo.todaySigned ? '今日已签到' : '立即签到'}
          </button>
          {signInInfo.dailyReward && (
            <div className="daily-reward">
              今日奖励：{formatRewards(signInInfo.dailyReward.rewards)}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">连续签到奖励</div>
        <div className="consecutive-rewards">
          {signInInfo.consecutiveRewards?.map((reward) => (
            <div
              key={reward.id}
              className={`consecutive-reward-item ${reward.achieved ? 'achieved' : ''}`}
            >
              <div className="reward-day">第{reward.day_number}天</div>
              <div className="reward-content">{formatRewards(reward.rewards)}</div>
              <div className="reward-status">
                {reward.achieved ? '✓ 已达成' : '未达成'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">签到日历（近30天）</div>
        <div className="signin-calendar">
          {calendarDays.map((day) => (
            <div
              key={day.date}
              className={`calendar-day ${day.isToday ? 'today' : ''} ${day.signed ? 'signed' : ''} ${day.canMakeup ? 'can-makeup' : ''}`}
              onClick={() => day.canMakeup && handleMakeup(day.date)}
              title={day.canMakeup ? `点击补签 ${day.date}` : day.date}
            >
              <span className="day-number">{day.day}</span>
              {day.signed && <span className="day-mark">✓</span>}
            </div>
          ))}
        </div>
        <div className="calendar-legend">
          <span><i className="legend-dot signed"></i>已签到</span>
          <span><i className="legend-dot makeup"></i>可补签</span>
          <span><i className="legend-dot today"></i>今天</span>
        </div>
      </div>
    </div>
  )
}
