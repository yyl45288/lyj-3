import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { characterAPI } from '../api'

export default function GameHome() {
  const [character, setCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    characterAPI.getCharacter()
      .then((data) => setCharacter(data.character || data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-screen">加载中...</div>
  if (!character) return null

  return (
    <div>
      <div className="card">
        <div className="home-character-info">
          <div className="home-character-name">{character.name}</div>
          <div className="home-realm">{character.realm}</div>
          <div className="home-level">等级 {character.level}</div>
        </div>
        <div className="quick-actions">
          <button className="btn-action btn-cultivate" onClick={() => navigate('/cultivate')}>
            开始修炼
          </button>
          <button className="btn-action" onClick={() => navigate('/quests')}>
            查看任务
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">修为进度</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(character.exp / character.expToNext) * 100}%` }}
          />
          <span className="progress-text">
            {character.exp} / {character.expToNext}
          </span>
        </div>
      </div>

      <div className="announcement-area">
        <h3>仙界公告</h3>
        <p>欢迎来到修仙录！修仙之路漫漫，唯有勤修苦练，方能证道成仙。</p>
        <p>修炼可获得经验，经验满后可尝试突破境界。装备可提升战力，任务可获取丰厚奖励。</p>
      </div>
    </div>
  )
}
