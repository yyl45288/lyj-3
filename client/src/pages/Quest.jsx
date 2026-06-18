import { useState, useEffect } from 'react'
import { questAPI } from '../api'

export default function Quest() {
  const [tab, setTab] = useState('available')
  const [available, setAvailable] = useState([])
  const [active, setActive] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const fetchQuests = () => {
    Promise.all([
      questAPI.getAvailable().catch(() => ({ quests: [] })),
      questAPI.getActive().catch(() => ({ quests: [] }))
    ]).then(([availData, activeData]) => {
      setAvailable(availData.quests || availData || [])
      setActive(activeData.quests || activeData || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchQuests()
  }, [])

  const handleAccept = async (questId) => {
    setMessage('')
    try {
      await questAPI.acceptQuest(questId)
      setMessage('任务已接取')
      fetchQuests()
    } catch (err) {
      setMessage(err.message || '接取失败')
    }
  }

  const handleComplete = async (questId) => {
    setMessage('')
    try {
      await questAPI.completeQuest(questId)
      setMessage('任务完成！')
      fetchQuests()
    } catch (err) {
      setMessage(err.message || '完成失败')
    }
  }

  if (loading) return <div className="loading-screen">加载中...</div>

  const currentList = tab === 'available' ? available : active

  return (
    <div>
      <h1 className="page-title">任务</h1>

      {message && (
        <div className="card" style={{ textAlign: 'center', color: message.includes('成功') || message.includes('已接取') || message.includes('完成') ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {message}
        </div>
      )}

      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'available' ? 'active' : ''}`}
          onClick={() => setTab('available')}
        >
          可接取
        </button>
        <button
          className={`tab-btn ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          进行中
        </button>
      </div>

      <div className="quest-list">
        {currentList.length === 0 && (
          <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '2rem' }}>
            {tab === 'available' ? '暂无可接取的任务' : '暂无进行中的任务'}
          </div>
        )}
        {currentList.map((quest, index) => (
          <div key={quest.id || quest._id || index} className="quest-item">
            <div className="quest-name">{quest.name}</div>
            {quest.type && <div className="quest-type">类型: {quest.type}</div>}
            {quest.description && <div className="quest-desc">{quest.description}</div>}
            {tab === 'active' && quest.target && (
              <div className="quest-progress">
                {quest.objectiveDescription || '进度'}: {quest.progress || 0} / {quest.target}
              </div>
            )}
            {quest.reward && (
              <div className="quest-reward">
                奖励: {quest.reward}
              </div>
            )}
            <div className="quest-actions">
              {tab === 'available' && (
                <button
                  className="btn-action btn-small"
                  onClick={() => handleAccept(quest.id || quest._id)}
                >
                  接取
                </button>
              )}
              {tab === 'active' && (
                <button
                  className="btn-action btn-small"
                  onClick={() => handleComplete(quest.id || quest._id)}
                  disabled={quest.progress < quest.target}
                >
                  {(quest.progress >= quest.target) ? '完成' : '未完成'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
