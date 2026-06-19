import { useState, useEffect, useRef } from 'react'
import { afkAPI, characterAPI } from '../api'

export default function AfkCultivate() {
  const [afkStatus, setAfkStatus] = useState(null)
  const [character, setCharacter] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentRewards, setCurrentRewards] = useState({ exp: 0, gold: 0 })
  const timerRef = useRef(null)

  const fetchData = () => {
    Promise.all([
      afkAPI.getStatus(),
      characterAPI.getCharacter()
    ]).then(([afkData, charData]) => {
      setAfkStatus(afkData)
      setCharacter(charData.character || charData)
      if (afkData.pendingRewards) {
        setCurrentRewards({
          exp: afkData.pendingRewards.exp,
          gold: afkData.pendingRewards.gold
        })
      }
    }).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (afkStatus?.isActive) {
      timerRef.current = setInterval(() => {
        afkAPI.getStatus().then((data) => {
          setAfkStatus(data)
          if (data.pendingRewards) {
            setCurrentRewards({
              exp: data.pendingRewards.exp,
              gold: data.pendingRewards.gold
            })
          }
        }).catch(() => {})
      }, 3000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [afkStatus?.isActive])

  const handleStart = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await afkAPI.startAfk()
      setMessage(data.message)
      fetchData()
    } catch (err) {
      setMessage(err.message || '开始挂机失败')
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await afkAPI.stopAfk()
      setMessage(data.message)
      setCurrentRewards({
        exp: data.pendingExp || 0,
        gold: data.pendingGold || 0
      })
      fetchData()
    } catch (err) {
      setMessage(err.message || '停止挂机失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCollect = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await afkAPI.collectRewards()
      setMessage(data.message)
      fetchData()
    } catch (err) {
      setMessage(err.message || '领取收益失败')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}小时${mins}分钟`
    }
    return `${mins}分钟`
  }

  if (!afkStatus || !character) {
    return <div className="loading-screen">加载中...</div>
  }

  const config = afkStatus.config
  const hasPendingRewards = currentRewards.exp > 0 || currentRewards.gold > 0
  const canCollect = afkStatus.isActive ? 
    afkStatus.pendingRewards?.offlineMinutes >= config.minCollectMinutes : 
    hasPendingRewards

  return (
    <div>
      <h1 className="page-title">挂机修炼</h1>

      <div className="card">
        <div className="afk-area">
          <div className="afk-status-banner">
            <div className={`afk-status-indicator ${afkStatus.isActive ? 'active' : 'inactive'}`}>
              {afkStatus.isActive ? '● 挂机中' : '○ 未挂机'}
            </div>
            {afkStatus.isActive && afkStatus.startTime && (
              <div className="afk-start-time">
                开始时间: {new Date(afkStatus.startTime).toLocaleString()}
              </div>
            )}
          </div>

          <div className="afk-info-grid">
            <div className="afk-info-card">
              <div className="info-label">当前境界</div>
              <div className="info-value">{character.realm}</div>
            </div>
            <div className="afk-info-card">
              <div className="info-label">当前等级</div>
              <div className="info-value">{character.level} 级</div>
            </div>
            <div className="afk-info-card">
              <div className="info-label">基础经验/分钟</div>
              <div className="info-value">{config.expPerMinute}</div>
            </div>
            <div className="afk-info-card">
              <div className="info-label">基础金币/分钟</div>
              <div className="info-value">{config.goldPerMinute}</div>
            </div>
          </div>

          <div className="afk-bonus-section">
            <div className="section-title">收益加成</div>
            <div className="bonus-list">
              <div className="bonus-item">
                <span>等级加成</span>
                <span className="bonus-value">+{((1 + (character.level - 1) * config.levelMultiplier - 1) * 100).toFixed(1)}%</span>
              </div>
              <div className="bonus-item">
                <span>境界加成</span>
                <span className="bonus-value">+{((1 + (['练气期', '筑基期', '金丹期', '元婴期', '化神期', '合体期', '大乘期', '渡劫期', '仙人'].indexOf(character.realm)) * config.realmMultiplier - 1) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="afk-rewards-section">
            <div className="section-title">
              {afkStatus.isActive ? '当前累计收益' : '待领取收益'}
            </div>
            <div className="rewards-display">
              <div className="reward-item">
                <span className="reward-icon">✨</span>
                <span className="reward-label">经验</span>
                <span className="reward-value">{currentRewards.exp.toLocaleString()}</span>
              </div>
              <div className="reward-item">
                <span className="reward-icon">💰</span>
                <span className="reward-label">金币</span>
                <span className="reward-value">{currentRewards.gold.toLocaleString()}</span>
              </div>
            </div>
            {afkStatus.isActive && afkStatus.pendingRewards && (
              <div className="rewards-time-info">
                <div>已挂机: {formatTime(afkStatus.pendingRewards.offlineMinutes)}</div>
                {afkStatus.pendingRewards.capped && (
                  <div className="capped-warning">
                    ⚠️ 已达到最大累计时间 ({formatTime(afkStatus.pendingRewards.maxMinutes)})，请及时领取
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="afk-actions">
            {!afkStatus.isActive ? (
              <button
                className="btn-action btn-afk-start"
                onClick={handleStart}
                disabled={loading}
              >
                {loading ? '启动中...' : '开始挂机修炼'}
              </button>
            ) : (
              <div className="afk-active-actions">
                <button
                  className="btn-action btn-afk-collect"
                  onClick={handleCollect}
                  disabled={loading || !canCollect}
                >
                  {loading ? '领取中...' : canCollect ? '领取收益' : `需挂机${config.minCollectMinutes}分钟`}
                </button>
                <button
                  className="btn-secondary btn-afk-stop"
                  onClick={handleStop}
                  disabled={loading}
                >
                  停止挂机
                </button>
              </div>
            )}
            {!afkStatus.isActive && hasPendingRewards && (
              <button
                className="btn-action btn-afk-collect"
                onClick={handleCollect}
                disabled={loading}
                style={{ marginTop: '1rem' }}
              >
                {loading ? '领取中...' : '领取待收收益'}
              </button>
            )}
          </div>

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

      <div className="card">
        <div className="card-title">挂机规则说明</div>
        <div className="afk-rules">
          <ul>
            <li>挂机期间即使关闭游戏，也会累计收益</li>
            <li>收益根据等级和境界有额外加成</li>
            <li>最大累计时间为 {config.maxOfflineHours} 小时，超过后不再累计</li>
            <li>每次领取至少需要挂机 {config.minCollectMinutes} 分钟</li>
            <li>挂机中可随时领取收益，领取后计时重置</li>
            <li>经验收益可触发等级提升和突破</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
