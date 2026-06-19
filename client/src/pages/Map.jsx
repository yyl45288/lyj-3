import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mapAPI, characterAPI, battleAPI, adventureAPI } from '../api'

const RARITY_NAMES = {
  common: '普通',
  rare: '稀有',
  epic: '史诗'
}

const RARITY_COLORS = {
  common: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee'
}

export default function Map() {
  const [maps, setMaps] = useState([])
  const [character, setCharacter] = useState(null)
  const [exploring, setExploring] = useState(false)
  const [logs, setLogs] = useState([])
  const [message, setMessage] = useState('')
  const [activeBattle, setActiveBattle] = useState(null)
  const [activeAdventure, setActiveAdventure] = useState(null)
  const [adventureResult, setAdventureResult] = useState(null)
  const navigate = useNavigate()

  const fetchData = () => {
    Promise.all([
      mapAPI.getMaps(),
      characterAPI.getCharacter(),
      battleAPI.getBattle(),
      adventureAPI.getActive().catch(() => ({ adventure: null }))
    ]).then(([mapData, charData, battleData, advData]) => {
      setMaps(mapData.maps || [])
      setCharacter(charData.character || charData)
      if (battleData.battle) {
        setActiveBattle(battleData.battle)
      }
      if (advData && advData.adventure) {
        setActiveAdventure(advData.adventure)
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

      if (result.type === 'adventure') {
        setActiveAdventure(result.adventure)
        setMessage(`触发奇遇：${result.adventure.name}！`)
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

  const handleAdventureChoice = async (choiceIndex) => {
    try {
      const data = await adventureAPI.makeChoice(choiceIndex)
      setAdventureResult(data)
      setActiveAdventure(null)
      setCharacter(data.character)
      setMessage(data.message)

      const newLog = {
        id: Date.now(),
        text: `奇遇：${data.message}`,
        type: 'adventure',
        time: new Date().toLocaleTimeString()
      }
      setLogs((prev) => [newLog, ...prev].slice(0, 10))
    } catch (err) {
      setMessage(err.message || '选择失败')
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

      {(activeAdventure || adventureResult) && (
        <div className="card">
          <div className="card-title">奇遇事件</div>
          {activeAdventure && (
            <div className="adventure-card" style={{ border: '2px solid ' + RARITY_COLORS[activeAdventure.rarity] }}>
              <div className="adventure-header">
                <span className="adventure-rarity" style={{ color: RARITY_COLORS[activeAdventure.rarity] }}>
                  【{RARITY_NAMES[activeAdventure.rarity]}】
                </span>
                <h3 className="adventure-name">{activeAdventure.name}</h3>
              </div>
              <div className="adventure-desc">{activeAdventure.description}</div>
              <div className="adventure-choices">
                <h4>选择你的行动：</h4>
                {activeAdventure.choices.map((choice) => (
                  <button
                    key={choice.index}
                    className="adventure-choice-btn"
                    onClick={() => handleAdventureChoice(choice.index)}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          {adventureResult && !activeAdventure && (
            <div className="adventure-result">
              <h3>奇遇结果</h3>
              <div className="result-message">{adventureResult.message}</div>
              {adventureResult.details && adventureResult.details.length > 0 && (
                <div className="result-details">
                  <div className="reward-list">
                    {adventureResult.details.map((detail, idx) => (
                      <div key={idx} className="reward-item">{detail}</div>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn-action" onClick={() => setAdventureResult(null)}>
                确定
              </button>
            </div>
          )}
        </div>
      )}

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
                      : log.type === 'adventure'
                      ? 'log-adventure'
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
