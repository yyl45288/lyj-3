import { useState, useEffect } from 'react'
import { equipmentAPI } from '../api'

const SLOT_LABELS = {
  weapon: '武器',
  helmet: '头盔',
  armor: '铠甲',
  boots: '鞋子',
  accessory: '饰品'
}

const qualityClass = (quality) => {
  const map = {
    common: 'quality-common',
    uncommon: 'quality-uncommon',
    rare: 'quality-rare',
    epic: 'quality-epic',
    legendary: 'quality-legendary',
    mythic: 'quality-mythic',
    white: 'quality-common',
    green: 'quality-uncommon',
    blue: 'quality-rare',
    purple: 'quality-epic',
    orange: 'quality-legendary',
    red: 'quality-mythic'
  }
  return map[quality] || 'quality-common'
}

export { qualityClass }

export default function Equipment() {
  const [equipment, setEquipment] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const fetchEquipment = () => {
    equipmentAPI.getEquipment()
      .then((data) => setEquipment(data.equipment || data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEquipment()
  }, [])

  const handleUnequip = async (slot) => {
    setMessage('')
    try {
      await equipmentAPI.unequip(slot)
      setMessage(`已卸下${SLOT_LABELS[slot] || slot}`)
      fetchEquipment()
    } catch (err) {
      setMessage(err.message || '卸下失败')
    }
  }

  if (loading) return <div className="loading-screen">加载中...</div>

  const slots = Object.keys(SLOT_LABELS)

  return (
    <div>
      <h1 className="page-title">装备</h1>

      {message && (
        <div className="card" style={{ textAlign: 'center', color: message.includes('已卸下') ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-title">装备栏</div>
        <div className="equipment-grid">
          {slots.map((slot) => {
            const item = equipment[slot]
            return (
              <div key={slot} className={`equip-slot ${!item ? 'empty' : ''}`}>
                <div className="slot-label">{SLOT_LABELS[slot]}</div>
                {item ? (
                  <>
                    <div className={`slot-item-name ${qualityClass(item.quality)}`}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                        {item.description}
                      </div>
                    )}
                    <button className="btn-unequip" onClick={() => handleUnequip(slot)}>
                      卸下
                    </button>
                  </>
                ) : (
                  <div style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>空</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
