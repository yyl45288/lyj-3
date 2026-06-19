import { useState, useEffect } from 'react'
import { adminAPI } from '../api'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState({})
  const [items, setItems] = useState([])
  const [achievements, setAchievements] = useState([])
  const [signInRewards, setSignInRewards] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const [showItemModal, setShowItemModal] = useState(false)
  const [showAchModal, setShowAchModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editingAch, setEditingAch] = useState(null)

  const [itemForm, setItemForm] = useState({
    name: '', type: '', sub_type: '', quality: 'common', slot: '',
    price: 0, description: '', effect_str: '', stats_str: ''
  })

  const [achForm, setAchForm] = useState({
    name: '', description: '', type: 'cultivate', target_value: 1,
    title: '', icon: '🏆', sort_order: 1,
    rewardGold: 0, rewardExp: 0, rewardItems: []
  })

  const tabs = [
    { key: 'stats', label: '数据统计', icon: '📊' },
    { key: 'items', label: '物品管理', icon: '🎒' },
    { key: 'achievements', label: '成就管理', icon: '🏆' },
    { key: 'rewards', label: '签到奖励', icon: '🎁' },
    { key: 'users', label: '用户列表', icon: '👥' },
  ]

  useEffect(() => {
    loadTabData(activeTab)
  }, [activeTab])

  const showMsg = (msg, type = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  const loadTabData = async (tab) => {
    setLoading(true)
    try {
      switch (tab) {
        case 'stats': {
          const data = await adminAPI.getStats()
          setStats(data.stats || {})
          break
        }
        case 'items': {
          const data = await adminAPI.getItems({ pageSize: 100 })
          setItems(data.items || data || [])
          break
        }
        case 'achievements': {
          const data = await adminAPI.getAchievements()
          setAchievements(data.achievements || data || [])
          break
        }
        case 'rewards': {
          const data = await adminAPI.getSignInRewards()
          setSignInRewards(data.rewards || data || [])
          break
        }
        case 'users': {
          const data = await adminAPI.getUsers({ pageSize: 100 })
          setUsers(data.users || data || [])
          break
        }
      }
    } catch (err) {
      showMsg(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openNewItem = () => {
    setEditingItem(null)
    setItemForm({
      name: '', type: '', sub_type: '', quality: 'common', slot: '',
      price: 0, description: '', effect_str: '', stats_str: ''
    })
    setShowItemModal(true)
  }

  const openEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      name: item.name || '',
      type: item.type || '',
      sub_type: item.sub_type || '',
      quality: item.quality || 'common',
      slot: item.slot || '',
      price: item.price || 0,
      description: item.description || '',
      effect_str: item.effect ? (typeof item.effect === 'string' ? item.effect : JSON.stringify(item.effect)) : '',
      stats_str: item.stats ? (typeof item.stats === 'string' ? item.stats : JSON.stringify(item.stats)) : ''
    })
    setShowItemModal(true)
  }

  const saveItem = async () => {
    if (!itemForm.name || !itemForm.type) {
      showMsg('请填写物品名称和类型', 'error')
      return
    }
    try {
      const data = {
        name: itemForm.name,
        type: itemForm.type,
        subType: itemForm.sub_type,
        quality: itemForm.quality,
        slot: itemForm.slot,
        price: parseInt(itemForm.price) || 0,
        description: itemForm.description,
        effect: itemForm.effect_str ? JSON.parse(itemForm.effect_str) : null,
        stats: itemForm.stats_str ? JSON.parse(itemForm.stats_str) : null
      }
      if (editingItem) {
        await adminAPI.updateItem(editingItem.id, data)
        showMsg('物品更新成功')
      } else {
        await adminAPI.createItem(data)
        showMsg('物品创建成功')
      }
      setShowItemModal(false)
      loadTabData('items')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }

  const deleteItem = async (id, name) => {
    if (!window.confirm(`确定要删除物品「${name}」吗？此操作不可恢复。`)) return
    try {
      await adminAPI.deleteItem(id)
      showMsg(`物品「${name}」已删除`)
      loadTabData('items')
    } catch (err) {
      showMsg(err.message || '删除失败', 'error')
    }
  }

  const openNewAch = () => {
    setEditingAch(null)
    setAchForm({
      name: '', description: '', type: 'cultivate', target_value: 1,
      title: '', icon: '🏆', sort_order: 1,
      rewardGold: 0, rewardExp: 0, rewardItems: []
    })
    setShowAchModal(true)
  }

  const openEditAch = (ach) => {
    setEditingAch(ach)
    const rewards = ach.rewards ? (typeof ach.rewards === 'string' ? JSON.parse(ach.rewards) : ach.rewards) : {}
    setAchForm({
      name: ach.name || '',
      description: ach.description || '',
      type: ach.type || 'cultivate',
      target_value: ach.target_value || 1,
      title: ach.title || '',
      icon: ach.icon || '🏆',
      sort_order: ach.sort_order || 1,
      rewardGold: rewards.gold || 0,
      rewardExp: rewards.exp || 0,
      rewardItems: rewards.items || []
    })
    setShowAchModal(true)
  }

  const saveAch = async () => {
    if (!achForm.name || !achForm.type) {
      showMsg('请填写成就名称和类型', 'error')
      return
    }
    try {
      const rewards = {}
      if (achForm.rewardGold > 0) rewards.gold = parseInt(achForm.rewardGold) || 0
      if (achForm.rewardExp > 0) rewards.exp = parseInt(achForm.rewardExp) || 0
      if (achForm.rewardItems && achForm.rewardItems.length > 0) {
        rewards.items = achForm.rewardItems.filter(i => i.itemId && i.quantity > 0)
      }

      const data = {
        name: achForm.name,
        description: achForm.description,
        type: achForm.type,
        targetValue: parseInt(achForm.target_value) || 1,
        title: achForm.title,
        icon: achForm.icon,
        sortOrder: parseInt(achForm.sort_order) || 1,
        rewards
      }

      if (editingAch) {
        await adminAPI.updateAchievement(editingAch.id, data)
        showMsg('成就更新成功')
      } else {
        await adminAPI.createAchievement(data)
        showMsg('成就创建成功')
      }
      setShowAchModal(false)
      loadTabData('achievements')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }

  const deleteAch = async (id, name) => {
    if (!window.confirm(`确定要删除成就「${name}」吗？此操作不可恢复。`)) return
    try {
      await adminAPI.deleteAchievement(id)
      showMsg(`成就「${name}」已删除`)
      loadTabData('achievements')
    } catch (err) {
      showMsg(err.message || '删除失败', 'error')
    }
  }

  const addRewardItem = () => {
    setAchForm({
      ...achForm,
      rewardItems: [...achForm.rewardItems, { itemId: '', quantity: 1 }]
    })
  }

  const updateRewardItem = (idx, field, value) => {
    const newItems = [...achForm.rewardItems]
    newItems[idx] = { ...newItems[idx], [field]: field === 'quantity' ? parseInt(value) || 0 : value }
    setAchForm({ ...achForm, rewardItems: newItems })
  }

  const removeRewardItem = (idx) => {
    const newItems = achForm.rewardItems.filter((_, i) => i !== idx)
    setAchForm({ ...achForm, rewardItems: newItems })
  }

  const qualityColor = (q) => ({
    common: '#cccccc', uncommon: '#1eff00', rare: '#0070dd', epic: '#a335ee',
    legendary: '#ff8000', mythic: '#e60000'
  })[q] || '#cccccc'

  const achTypeText = (t) => ({
    cultivate: '修炼次数', combat: '战斗胜利', gold: '金币累计', realm: '境界等级',
    sign_in: '累计签到', consecutive_sign_in: '连续签到', pet_catch: '宠物捕获', quest_complete: '任务完成'
  })[t] || t

  return (
    <div className="admin-page">
      <div className="card">
        <div className="card-title">🛡️ 修仙管理后台</div>
        {message && <div className={`message ${messageType === 'error' ? 'error-msg' : ''}`}>{message}</div>}

        <div className="admin-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="loading-screen">加载中...</div> : (
        <div className="card">
          {activeTab === 'stats' && (
            <div>
              <div className="card-title">数据统计</div>
              <div className="achievement-stats">
                <div className="stat-item"><div className="stat-value">{stats.totalUsers || stats.userCount || 0}</div><div className="stat-label">总用户数</div></div>
                <div className="stat-item"><div className="stat-value">{stats.totalCharacters || stats.characterCount || 0}</div><div className="stat-label">总角色数</div></div>
                <div className="stat-item"><div className="stat-value">{stats.totalItems || stats.itemCount || 0}</div><div className="stat-label">物品数</div></div>
                <div className="stat-item"><div className="stat-value">{stats.totalAchievements || stats.achievementCount || 0}</div><div className="stat-label">成就数</div></div>
                <div className="stat-item"><div className="stat-value">{stats.todaySignIns || 0}</div><div className="stat-label">今日签到</div></div>
                <div className="stat-item"><div className="stat-value">{stats.totalSignIns || 0}</div><div className="stat-label">累计签到</div></div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>物品列表</div>
                <button className="btn-primary" onClick={openNewItem}>+ 新增物品</button>
              </div>
              <div className="admin-table">
                <table>
                  <thead><tr>
                    <th>ID</th><th>名称</th><th>类型</th><th>子类型</th>
                    <th>品质</th><th>价格</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td style={{ color: qualityColor(item.quality), fontWeight: 700 }}>{item.name}</td>
                        <td>{item.type}</td>
                        <td>{item.sub_type || '-'}</td>
                        <td><span style={{ color: qualityColor(item.quality) }}>{item.quality}</span></td>
                        <td>{item.price}</td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => openEditItem(item)}>编辑</button>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#c0392b' }} onClick={() => deleteItem(item.id, item.name)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>成就列表</div>
                <button className="btn-primary" onClick={openNewAch}>+ 新增成就</button>
              </div>
              <div className="admin-table">
                <table>
                  <thead><tr>
                    <th>ID</th><th>图标</th><th>名称</th><th>类型</th>
                    <th>目标</th><th>称号</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {achievements.map(ach => (
                      <tr key={ach.id}>
                        <td>{ach.id}</td>
                        <td style={{ fontSize: '1.2rem' }}>{ach.icon}</td>
                        <td>{ach.name}</td>
                        <td>{achTypeText(ach.type)}</td>
                        <td>{ach.target_value}</td>
                        <td style={{ color: '#d4af37' }}>{ach.title || '-'}</td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => openEditAch(ach)}>编辑</button>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#c0392b' }} onClick={() => deleteAch(ach.id, ach.name)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div>
              <div className="card-title">签到奖励配置</div>
              <div className="admin-table">
                <table>
                  <thead><tr><th>ID</th><th>类型</th><th>天数</th><th>奖励内容</th></tr></thead>
                  <tbody>
                    {signInRewards.map(r => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.day_type === 'daily' ? '每日签到' : `连续${r.day_number}天`}</td>
                        <td>{r.day_type === 'daily' ? '-' : r.day_number}</td>
                        <td style={{ color: '#f0d878' }}>
                          {typeof r.rewards === 'string' ? r.rewards : JSON.stringify(r.rewards || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="card-title">用户列表</div>
              <div className="admin-table">
                <table>
                  <thead><tr>
                    <th>ID</th><th>用户名</th><th>注册时间</th>
                    <th>角色</th><th>境界</th><th>金币</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.username}</td>
                        <td>{u.created_at}</td>
                        <td>{u.character_name || '-'}</td>
                        <td style={{ color: '#7ec8e3' }}>{u.realm || '-'}</td>
                        <td>{u.gold != null ? u.gold : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editingItem ? '编辑物品' : '新增物品'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>物品名称 *</label><input type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} /></div>
              <div className="form-group"><label>类型 *</label><input type="text" value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value })} placeholder="consumable/weapon/armor" /></div>
              <div className="form-group"><label>子类型</label><input type="text" value={itemForm.sub_type} onChange={e => setItemForm({ ...itemForm, sub_type: e.target.value })} placeholder="potion/sword/helmet" /></div>
              <div className="form-group"><label>品质</label>
                <select value={itemForm.quality} onChange={e => setItemForm({ ...itemForm, quality: e.target.value })} style={selectStyle}>
                  <option value="common">普通</option><option value="uncommon">优秀</option>
                  <option value="rare">稀有</option><option value="epic">史诗</option>
                  <option value="legendary">传说</option><option value="mythic">神话</option>
                </select>
              </div>
              <div className="form-group"><label>装备部位</label><input type="text" value={itemForm.slot} onChange={e => setItemForm({ ...itemForm, slot: e.target.value })} placeholder="weapon/helmet/armor..." /></div>
              <div className="form-group"><label>价格</label><input type="number" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>描述</label><input type="text" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>
            <div className="form-group"><label>效果 (JSON)</label>
              <textarea value={itemForm.effect_str} onChange={e => setItemForm({ ...itemForm, effect_str: e.target.value })}
                placeholder='{"heal": 100} 或 {"buff": "attack", "value": 20}'
                style={textareaStyle}
              />
            </div>
            <div className="form-group"><label>属性 (JSON)</label>
              <textarea value={itemForm.stats_str} onChange={e => setItemForm({ ...itemForm, stats_str: e.target.value })}
                placeholder='{"attack": 10, "defense": 5}'
                style={textareaStyle}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowItemModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveItem}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showAchModal && (
        <div className="modal-overlay" onClick={() => setShowAchModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editingAch ? '编辑成就' : '新增成就'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>成就名称 *</label><input type="text" value={achForm.name} onChange={e => setAchForm({ ...achForm, name: e.target.value })} /></div>
              <div className="form-group"><label>成就类型 *</label>
                <select value={achForm.type} onChange={e => setAchForm({ ...achForm, type: e.target.value })} style={selectStyle}>
                  <option value="cultivate">修炼次数</option>
                  <option value="combat">战斗胜利</option>
                  <option value="gold">金币累计</option>
                  <option value="realm">境界等级</option>
                  <option value="sign_in">累计签到</option>
                  <option value="consecutive_sign_in">连续签到</option>
                  <option value="pet_catch">宠物捕获</option>
                  <option value="quest_complete">任务完成</option>
                </select>
              </div>
              <div className="form-group"><label>目标值</label><input type="number" value={achForm.target_value} onChange={e => setAchForm({ ...achForm, target_value: e.target.value })} /></div>
              <div className="form-group"><label>排序</label><input type="number" value={achForm.sort_order} onChange={e => setAchForm({ ...achForm, sort_order: e.target.value })} /></div>
              <div className="form-group"><label>称号</label><input type="text" value={achForm.title} onChange={e => setAchForm({ ...achForm, title: e.target.value })} placeholder="可留空" /></div>
              <div className="form-group"><label>图标</label><input type="text" value={achForm.icon} onChange={e => setAchForm({ ...achForm, icon: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>描述</label><input type="text" value={achForm.description} onChange={e => setAchForm({ ...achForm, description: e.target.value })} /></div>

            <div className="section-title" style={{ marginTop: '1.2rem', marginBottom: '0.8rem' }}>🎁 奖励配置</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
              <div className="form-group"><label>金币奖励</label><input type="number" value={achForm.rewardGold} onChange={e => setAchForm({ ...achForm, rewardGold: e.target.value })} placeholder="0" /></div>
              <div className="form-group"><label>经验奖励</label><input type="number" value={achForm.rewardExp} onChange={e => setAchForm({ ...achForm, rewardExp: e.target.value })} placeholder="0" /></div>
            </div>

            <div style={{ marginBottom: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: '#d4af37', fontSize: '0.9rem' }}>道具奖励</span>
                <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={addRewardItem}>+ 添加道具</button>
              </div>
              {achForm.rewardItems && achForm.rewardItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {achForm.rewardItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="text" placeholder="物品ID" value={item.itemId}
                        onChange={e => updateRewardItem(idx, 'itemId', e.target.value)}
                        style={{ flex: 1, padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }}
                      />
                      <input type="number" placeholder="数量" value={item.quantity}
                        onChange={e => updateRewardItem(idx, 'quantity', e.target.value)}
                        style={{ width: '80px', padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }}
                      />
                      <button onClick={() => removeRewardItem(idx)}
                        style={{ padding: '0.5rem 0.8rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                      >删除</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#8888aa', fontSize: '0.85rem', fontStyle: 'italic' }}>暂无道具奖励</div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowAchModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveAch}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const selectStyle = {
  width: '100%',
  padding: '0.7rem',
  background: 'rgba(10,10,26,0.8)',
  color: '#e0e0e0',
  border: '1px solid rgba(126,200,227,0.3)',
  borderRadius: 6,
  fontFamily: 'inherit'
}

const textareaStyle = {
  width: '100%',
  padding: '0.7rem',
  background: 'rgba(10,10,26,0.8)',
  color: '#e0e0e0',
  border: '1px solid rgba(126,200,227,0.3)',
  borderRadius: 6,
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  minHeight: '60px',
  resize: 'vertical'
}
