import { useState, useEffect } from 'react'
import { petAPI, equipmentAPI } from '../api'

export default function Pet() {
  const [pets, setPets] = useState([])
  const [activePet, setActivePet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [healItems, setHealItems] = useState([])
  const [showHeal, setShowHeal] = useState(null)
  const [character, setCharacter] = useState(null)

  const fetchData = () => {
    Promise.all([
      petAPI.getPets(),
      equipmentAPI.getInventory()
    ]).then(([petData, invData]) => {
      setPets(petData.pets || [])
      setActivePet(petData.activePet)
      const healInv = invData.inventory?.filter(
        (inv) => inv.item?.effect?.type === 'heal_hp' && inv.quantity > 0
      ) || []
      setHealItems(healInv)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleActivate = async (petId) => {
    if (loading) return
    setLoading(true)
    setMessage('')
    try {
      const data = await petAPI.activate(petId)
      setPets(data.pets)
      setActivePet(data.activePet)
      setMessage(data.message || '出战成功！')
    } catch (err) {
      setMessage(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRest = async (petId) => {
    if (loading) return
    setLoading(true)
    setMessage('')
    try {
      const data = await petAPI.rest(petId)
      setPets(data.pets)
      setActivePet(data.activePet)
      setMessage(data.message || '休息中...')
    } catch (err) {
      setMessage(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleHeal = async (petId, itemId = null) => {
    if (loading) return
    setLoading(true)
    setMessage('')
    try {
      const data = await petAPI.heal(petId, itemId)
      setPets(data.pets)
      setMessage(data.message || '恢复成功！')
      if (data.gold !== undefined && character) {
        setCharacter({ ...character, gold: data.gold })
      }
      setShowHeal(null)
      fetchData()
    } catch (err) {
      setMessage(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRelease = async (petId) => {
    if (loading) return
    if (!window.confirm('确定要放生这只宠物吗？')) return
    setLoading(true)
    setMessage('')
    try {
      const data = await petAPI.release(petId)
      setPets(data.pets)
      setMessage(data.message || '放生成功！')
    } catch (err) {
      setMessage(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  if (!pets) return <div className="loading-screen">加载中...</div>

  return (
    <div>
      <h1 className="page-title">宠物管理</h1>

      {activePet && (
        <div className="card active-pet-card">
          <div className="card-title">当前出战宠物</div>
          <div className="pet-detail active">
            <div className="pet-header">
              <div
                className="pet-type"
                style={{ color: activePet.typeColor }}
              >
                {activePet.petInfo?.type}
              </div>
              <div className="pet-name">{activePet.name}</div>
              <div className="pet-species">({activePet.petInfo?.name})</div>
            </div>
            <div className="pet-stats-grid">
              <div className="stat-item">
                <span className="stat-label">等级</span>
                <span className="stat-value">{activePet.level}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">生命</span>
                <span className="stat-value hp">
                  {activePet.hp} / {activePet.max_hp}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">攻击</span>
                <span className="stat-value">{activePet.attack}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">防御</span>
                <span className="stat-value">{activePet.defense}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">速度</span>
                <span className="stat-value">{activePet.speed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">技能</span>
                <span className="stat-value skill">{activePet.petInfo?.skill}</span>
              </div>
            </div>
            <div className="progress-bar small">
              <div
                className="progress-fill hp"
                style={{ width: `${(activePet.hp / activePet.max_hp) * 100}%` }}
              />
            </div>
            <div className="progress-bar small" style={{ marginTop: '0.5rem' }}>
              <div
                className="progress-fill exp"
                style={{ width: `${(activePet.exp / activePet.expToNext) * 100}%` }}
              />
              <span className="progress-text">
                经验 {activePet.exp} / {activePet.expToNext}
              </span>
            </div>
            <div className="pet-actions">
              <button
                className="btn-action small"
                onClick={() => handleRest(activePet.id)}
                disabled={loading}
              >
                💤 休息恢复
              </button>
              <button
                className="btn-action small"
                onClick={() => setShowHeal(activePet.id)}
                disabled={loading}
              >
                💊 治疗
              </button>
            </div>

            {showHeal === activePet.id && (
              <div className="heal-panel">
                <div className="panel-title">选择恢复方式</div>
                <button
                  className="heal-option"
                  onClick={() => handleHeal(activePet.id, null)}
                  disabled={loading}
                >
                  <span>金币治疗 (10金币)</span>
                  <span className="heal-effect">恢复50%生命值</span>
                </button>
                {healItems.map((item) => (
                  <button
                    key={item.id}
                    className="heal-option"
                    onClick={() => handleHeal(activePet.id, item.item_id)}
                    disabled={loading}
                  >
                    <span>{item.item?.name} × {item.quantity}</span>
                    <span className="heal-effect">+{item.item?.effect?.value} HP</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className="card">
          <div
            style={{
              color: message.includes('成功') ? 'var(--color-success)' : message.includes('失败') ? 'var(--color-danger)' : 'var(--color-gold)'
            }}
          >
            {message}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">我的宠物 ({pets.length})</div>
        {pets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '2rem' }}>
            还没有宠物，去地图探索捕捉一只吧！
          </div>
        ) : (
          <div className="pet-list">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className={`pet-card ${pet.active ? 'active' : ''} ${pet.hp <= 0 ? 'defeated' : ''}`}
              >
                <div className="pet-card-header">
                  <div
                    className="pet-type-badge"
                    style={{ backgroundColor: pet.typeColor }}
                  >
                    {pet.petInfo?.type}
                  </div>
                  {pet.active && <span className="active-badge">出战中</span>}
                </div>
                <div className="pet-card-name">{pet.name}</div>
                <div className="pet-card-species">Lv.{pet.level} {pet.petInfo?.name}</div>
                <div className="pet-card-hp">
                  <div className="progress-bar small">
                    <div
                      className="progress-fill hp"
                      style={{ width: `${(pet.hp / pet.max_hp) * 100}%` }}
                    />
                  </div>
                  <span>{pet.hp}/{pet.max_hp}</span>
                </div>
                <div className="pet-card-stats">
                  <span>⚔️ {pet.attack}</span>
                  <span>🛡️ {pet.defense}</span>
                  <span>💨 {pet.speed}</span>
                </div>
                <div className="pet-card-actions">
                  {!pet.active && pet.hp > 0 && (
                    <button
                      className="btn-action small btn-activate"
                      onClick={() => handleActivate(pet.id)}
                      disabled={loading}
                    >
                      出战
                    </button>
                  )}
                  {pet.hp <= 0 && (
                    <button
                      className="btn-action small"
                      onClick={() => handleRest(pet.id)}
                      disabled={loading}
                    >
                      复活
                    </button>
                  )}
                  {!pet.active && (
                    <button
                      className="btn-action small btn-release"
                      onClick={() => handleRelease(pet.id)}
                      disabled={loading}
                    >
                      放生
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
