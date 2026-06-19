import { useState, useEffect, useCallback } from 'react'
import { adventureAPI, characterAPI } from '../api'

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

export default function Adventure() {
  const [activeTab, setActiveTab] = useState('active')
  const [activeAdventure, setActiveAdventure] = useState(null)
  const [logs, setLogs] = useState([])
  const [character, setCharacter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [resultData, setResultData] = useState(null)
  const [logsPage, setLogsPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)

  const loadCharacter = useCallback(async () => {
    try {
      const data = await characterAPI.getCharacter()
      setCharacter(data.character)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const loadActive = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adventureAPI.getActive()
      setActiveAdventure(data.adventure)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adventureAPI.getLogs({
        page: logsPage,
        pageSize: 20
      })
      setLogs(data.logs || [])
      setTotalLogs(data.total || 0)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }, [logsPage])

  useEffect(() => {
    loadCharacter()
    if (activeTab === 'active') {
      loadActive()
    } else if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs()
    }
  }, [logsPage, loadLogs, activeTab])

  const handleChoice = async (choiceIndex) => {
    if (!activeAdventure) return

    try {
      const data = await adventureAPI.makeChoice(choiceIndex)
      setResultData(data)
      setMessage(data.message)
      setCharacter(data.character)
      setActiveAdventure(null)
      loadCharacter()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const renderActive = () => (
    <div className="adventure-active">
      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : resultData ? (
        <div className="adventure-result">
          <h3>奇遇结果</h3>
          <div className="result-message">{resultData.message}</div>
          <div className="result-details">
            {resultData.details && resultData.details.length > 0 && (
              <div className="reward-list">
                {resultData.details.map((detail, idx) => (
                  <div key={idx} className="reward-item">{detail}</div>
                ))}
              </div>
            )}
          </div>
          <button className="btn-action" onClick={() => setResultData(null)}>
            确定
          </button>
        </div>
      ) : activeAdventure ? (
        <div className="adventure-card">
          <div className="adventure-header">
            <span
              className="adventure-rarity"
              style={{ color: RARITY_COLORS[activeAdventure.rarity] }}
            >
              【{RARITY_NAMES[activeAdventure.rarity]}】
            </span>
            <h3 className="adventure-name">{activeAdventure.name}</h3>
          </div>
          <div className="adventure-desc">
            {activeAdventure.description}
          </div>
          <div className="adventure-choices">
            <h4>选择你的行动：</h4>
            {activeAdventure.choices.map((choice) => (
              <button
                key={choice.index}
                className="adventure-choice-btn"
                onClick={() => handleChoice(choice.index)}
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>当前没有进行中的奇遇事件</p>
          <p className="hint">前往地图探索有几率触发奇遇事件</p>
        </div>
      )}
    </div>
  )

  const renderLogs = () => (
    <div className="adventure-logs">
      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">暂无奇遇记录</div>
      ) : (
        <>
          <div className="quest-list">
            {logs.map((log) => (
              <div key={log.id} className="quest-item">
                <div className="quest-info">
                  <div className="quest-title" style={{ color: RARITY_COLORS[log.adventureRarity] }}>
                    【{RARITY_NAMES[log.adventureRarity]}】{log.adventureName}
                  </div>
                  <div className="quest-desc">
                    选择：{log.choiceText}
                  </div>
                  <div className="quest-rewards">
                    结果：{log.result}
                  </div>
                  <div className="quest-rewards">时间：{log.createdAt}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              className="btn-small"
              onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
              disabled={logsPage <= 1}
            >
              上一页
            </button>
            <span>第 {logsPage} / {Math.ceil(totalLogs / 20) || 1} 页</span>
            <button
              className="btn-small"
              onClick={() => setLogsPage(logsPage + 1)}
              disabled={logsPage * 20 >= totalLogs}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="page">
      <h2>奇遇事件</h2>
      {character && (
        <div className="character-stats">
          <span>生命：<span className="hp">{character.hp}/{character.max_hp}</span></span>
          <span>灵力：<span className="mp">{character.mp}/{character.max_mp}</span></span>
        </div>
      )}

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => { setActiveTab('active'); setResultData(null) }}
        >
          当前奇遇
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          奇遇记录
        </button>
      </div>

      {message && (
        <div className="message">{message}</div>
      )}

      <div className="page-content">
        {activeTab === 'active' && renderActive()}
        {activeTab === 'logs' && renderLogs()}
      </div>
    </div>
  )
}
