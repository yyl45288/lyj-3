import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mapAPI, characterAPI, battleAPI } from '../api'

export default function Map() {
  const [maps, setMaps] = useState([])
  const [character, setCharacter] = useState(null)
  const [exploring, setExploring] = useState(false)
  const [logs, setLogs] = useState([])
  const [message, setMessage] = useState('')
  const [activeBattle, setActiveBattle] = useState(null)
  const navigate = useNavigate()

  const fetchData = () => {
    Promise.all([
      mapAPI.getMaps(),
      characterAPI.getCharacter(),
      battleAPI.getBattle()
    ]).then(([mapData, charData, battleData]) => {
      setMaps(mapData.maps || [])
      setCharacter(charData.character || charData)
      if (battleData.battle) {
        setActiveBattle(battleData.battle)
      }
    }).catch(() => {})
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeBattle) {
      navigate('/battle')
    }
  }, [activeBattle, navigate])

  const handleExplore = async (mapId) => {
    setExploring(true)
    setMessage('')
    try {
      const data = await mapAPI.explore(mapId)
      const result = data.result

      const newLog = {
        id: Date.now(),
        text: result.message,
        type: result.type,
        time: new Date().toLocaleTimeString()
      }
      setLogs((prev) => [newLog, ...prev].slice(0, 10))

      if (result.type === 'encounter') {
        setActiveBattle(data.result.monster)
        setTimeout(() => navigate('/battle'), 500)
      }

      setCharacter(data.character)
      if (result.type === 'encounter') {
        setMessage(`遭遇了${result.monster.name}！`)
      }
    } catch (err) {
      setMessage(err.message || '探索失败')
    } finally {
      setExploring(false)
    }
  }

  if (!character || maps.length === 0) return <div className="loading-screen">加载中...</div>

  return (
    <div>
      <h1 className="page-title">地图探索</h1>

      <div className="card">
        <div className="card-title">角色状态</div>
        <div className="character-status">
          <div className="status-row">
            <span className="status-label">{character.name}</span>
            <span className="status-value">{character.realm} Lv.{character.level}</span>
          </div>
          <div className="status-row">
            <span className="status-label">生命值</span>
            <span className="status-value hp">
              {character.hp} / {character.max_hp}
            </span>
          </div>
          <div className="progress-bar small">
            <div
              className="progress-fill hp"
              style={{ width: `${(character.hp / character.max_hp) * 100}%` }}
            />
          </div>
          <div className="status-row">
            <span className="status-label">修为</span>
            <span className="status-value">
              {character.exp} / {character.expToNext}
            </span>
          </div>
          <div className="progress-bar small">
            <div
              className="progress-fill"
              style={{ width: `${(character.exp / character.expToNext) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">可探索地图</div>
        <div className="map-list">
          {maps.map((map) => (
            <div
              key={map.id}
              className={`map-card ${!map.unlocked ? 'locked' : ''}`}
            >
              <div className="map-header">
                <div className="map-name">{map.name}</div>
                <div className="map-level">
                  等级要求: {map.levelReq}
                </div>
              </div>
              <div className="map-description">{map.description}</div>
              <div className="map-info">
                <span>遇怪率: {(map.encounterRate * 100).toFixed(0)}%</span>
                <span>掉落率: {(map.dropRate * 100).toFixed(0)}%</span>
              </div>
              <button
                className="btn-action btn-explore"
                onClick={() => handleExplore(map.id)}
                disabled={!map.unlocked || exploring || character.hp <= 0}
              >
                {!map.unlocked
                  ? '未解锁'
                  : character.hp <= 0
                  ? '生命不足'
                  : exploring
                  ? '探索中...'
                  : '开始闲逛'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className="card">
          <div
            style={{
              color: message.includes('遭遇') || message.includes('失败')
                ? 'var(--color-danger)'
                : message.includes('获得')
                ? 'var(--color-success)'
                : 'var(--color-gold)',
              fontSize: '1rem'
            }}
          >
            {message}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="card">
          <div className="card-title">探索日志</div>
          <div className="explore-log">
            {logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span style={{ marginRight: '0.5rem', fontSize: '0.8rem' }}>[{log.time}]</span>
                <span
                  className={
                    log.type === 'encounter'
                      ? 'log-encounter'
                      : log.type === 'item'
                      ? 'log-item'
                      : 'log-explore'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
