import { useState, useEffect, useMemo } from 'react'
import { signInAPI } from '../api'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function SignIn() {
  const [signInInfo, setSignInInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [signing, setSigning] = useState(false)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0)

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

  const monthInfoList = useMemo(() => {
    const months = []
    const today = new Date()
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}年${d.getMonth() + 1}月`
      })
    }
    return months
  }, [])

  const getCalendarDays = (year, month) => {
    const days = []
    const signDays = getSignInDays()
    const makeupDaysLimit = signInInfo?.makeupDaysLimit || 90

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const totalDays = lastDay.getDate()
    const firstWeekday = firstDay.getDay()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const limitDate = new Date(today)
    limitDate.setDate(limitDate.getDate() - makeupDaysLimit)
    limitDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < firstWeekday; i++) {
      days.push({ empty: true, key: `empty-${i}` })
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month, day)
      dateObj.setHours(0, 0, 0, 0)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      const diffTime = today - dateObj
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      const isToday = diffDays === 0
      const signed = signDays.includes(dateStr)
      const isPast = diffDays > 0
      const isFuture = diffDays < 0
      const withinMakeupLimit = dateObj >= limitDate && isPast
      const canMakeup = withinMakeupLimit && !signed

      days.push({
        date: dateStr,
        isToday,
        signed,
        canMakeup,
        day,
        isFuture,
        isPast,
        key: dateStr
      })
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

  const currentMonth = monthInfoList[currentMonthIndex]
  const calendarDays = getCalendarDays(currentMonth.year, currentMonth.month)

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
        <div className="card-title">签到日历（最近三个月）</div>

        <div className="month-tabs">
          {monthInfoList.map((m, idx) => (
            <button
              key={idx}
              className={`month-tab ${currentMonthIndex === idx ? 'active' : ''}`}
              onClick={() => setCurrentMonthIndex(idx)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="calendar-weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="weekday">{w}</div>
          ))}
        </div>

        <div className="signin-calendar monthly">
          {calendarDays.map((day) => (
            day.empty ? (
              <div key={day.key} className="calendar-day empty" />
            ) : (
              <div
                key={day.key}
                className={`calendar-day ${day.isToday ? 'today' : ''} ${day.signed ? 'signed' : ''} ${day.canMakeup ? 'can-makeup' : ''} ${day.isFuture ? 'future' : ''}`}
                onClick={() => day.canMakeup && handleMakeup(day.date)}
                title={day.canMakeup ? `点击补签 ${day.date}` : day.date}
              >
                <span className="day-number">{day.day}</span>
                {day.signed && <span className="day-mark">✓</span>}
              </div>
            )
          ))}
        </div>
        <div className="calendar-legend">
          <span><i className="legend-dot signed"></i>已签到</span>
          <span><i className="legend-dot makeup"></i>可补签</span>
          <span><i className="legend-dot today"></i>今天</span>
          <span><i className="legend-dot future"></i>未来</span>
        </div>
      </div>
    </div>
  )
}
