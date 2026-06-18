import { useState, useEffect } from 'react'
import { equipmentAPI } from '../api'
import { qualityClass } from './Equipment'

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const fetchInventory = () => {
    equipmentAPI.getInventory()
      .then((data) => setInventory(data.inventory || data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleEquip = async (itemId) => {
    setMessage('')
    try {
      await equipmentAPI.equipItem(itemId)
      setMessage('装备成功')
      fetchInventory()
      setSelectedItem(null)
    } catch (err) {
      setMessage(err.message || '装备失败')
    }
  }

  const handleUse = async (itemId) => {
    setMessage('')
    try {
      await equipmentAPI.useItem(itemId)
      setMessage('使用成功')
      fetchInventory()
      setSelectedItem(null)
    } catch (err) {
      setMessage(err.message || '使用失败')
    }
  }

  if (loading) return <div className="loading-screen">加载中...</div>

  return (
    <div>
      <h1 className="page-title">背包</h1>

      {message && (
        <div className="card" style={{ textAlign: 'center', color: message.includes('成功') ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {message}
        </div>
      )}

      <div className="inventory-list">
        {inventory.length === 0 && (
          <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '2rem' }}>
            背包空空如也
          </div>
        )}
        {inventory.map((item, index) => (
          <div
            key={item.id || item._id || index}
            className={`inventory-item ${selectedItem === (item.id || item._id || index) ? 'selected' : ''}`}
            onClick={() => setSelectedItem(item.id || item._id || index)}
          >
            <div className={`item-name ${qualityClass(item.quality)}`}>
              {item.name}
            </div>
            <div className="item-quantity">数量: {item.quantity || 1}</div>
            {item.quality && (
              <div className={`item-quantity ${qualityClass(item.quality)}`}>
                {item.quality}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedItem !== null && (() => {
        const item = inventory.find((i, idx) => (i.id || i._id || idx) === selectedItem)
        if (!item) return null
        return (
          <div className="item-detail">
            <h3 className={qualityClass(item.quality)}>{item.name}</h3>
            {item.description && <p>{item.description}</p>}
            {item.type && <p>类型: {item.type}</p>}
            {item.quality && <p>品质: <span className={qualityClass(item.quality)}>{item.quality}</span></p>}
            {item.quantity && <p>数量: {item.quantity}</p>}
            {item.stats && Object.keys(item.stats).length > 0 && (
              <div>
                <p style={{ marginTop: '0.5rem', color: 'var(--color-gold)' }}>属性加成:</p>
                {Object.entries(item.stats).map(([key, val]) => (
                  <p key={key}>  {key}: +{val}</p>
                ))}
              </div>
            )}
            <div className="item-actions">
              {item.type === 'equipment' && (
                <button className="btn-action btn-small" onClick={() => handleEquip(item.id || item._id)}>
                  装备
                </button>
              )}
              {item.type === 'consumable' && (
                <button className="btn-action btn-small" onClick={() => handleUse(item.id || item._id)}>
                  使用
                </button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
