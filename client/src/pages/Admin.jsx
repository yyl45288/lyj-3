import { useState, useEffect } from 'react'
import { adminAPI } from '../api'

function ItemSearchSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const selected = options.find(o => String(o.value) === String(value))
  const filtered = keyword
    ? options.filter(o => String(o.label).toLowerCase().includes(keyword.toLowerCase()))
    : options
  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    background: 'rgba(10,10,26,0.8)',
    color: '#e0e0e0',
    border: '1px solid rgba(126,200,227,0.3)',
    borderRadius: 6,
    boxSizing: 'border-box'
  }
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        type="text"
        value={open ? keyword : (selected ? selected.label : '')}
        onChange={e => setKeyword(e.target.value)}
        onFocus={() => { setOpen(true); setKeyword('') }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder={placeholder || '搜索或选择物品'}
        style={inputStyle}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          maxHeight: 220, overflowY: 'auto',
          background: '#0a0a1a',
          border: '1px solid rgba(126,200,227,0.4)',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
        }}>
          {filtered.length === 0 && <div style={{ padding: '0.5rem', color: '#666', fontSize: '0.85rem' }}>无匹配物品</div>}
          {filtered.map(o => (
            <div
              key={o.value}
              onMouseDown={() => { onChange(o.value); setOpen(false); setKeyword('') }}
              style={{
                padding: '0.5rem 0.7rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                background: String(o.value) === String(value) ? 'rgba(126,200,227,0.2)' : 'transparent',
                color: String(o.value) === String(value) ? '#7ec8e3' : '#e0e0e0',
                borderBottom: '1px solid rgba(126,200,227,0.1)'
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ITEM_TYPES = [
  { value: 'consumable', label: '消耗品' },
  { value: 'equipment', label: '装备' },
  { value: 'material', label: '材料' },
  { value: 'quest', label: '任务物品' },
  { value: 'treasure', label: '宝物' }
]

const ITEM_SUBTYPES = {
  consumable: [
    { value: 'pill', label: '丹药' },
    { value: 'capture', label: '捕捉道具' },
    { value: 'tribulation', label: '渡劫道具' },
    { value: 'food', label: '食物' },
    { value: 'scroll', label: '卷轴' }
  ],
  equipment: [
    { value: 'weapon', label: '武器' },
    { value: 'helmet', label: '头盔' },
    { value: 'armor', label: '铠甲' },
    { value: 'boots', label: '靴子' },
    { value: 'accessory', label: '饰品' }
  ],
  material: [
    { value: 'ore', label: '矿石' },
    { value: 'herb', label: '草药' },
    { value: 'beast_core', label: '兽核' },
    { value: 'fabric', label: '布料' }
  ],
  quest: [
    { value: 'quest_item', label: '任务物品' }
  ],
  treasure: [
    { value: 'chest', label: '宝箱' },
    { value: 'gift', label: '礼包' }
  ]
}

const EQUIPMENT_SLOTS = [
  { value: 'weapon', label: '武器' },
  { value: 'helmet', label: '头盔' },
  { value: 'armor', label: '铠甲' },
  { value: 'boots', label: '靴子' },
  { value: 'accessory', label: '饰品' }
]

const QUALITIES = [
  { value: 'common', label: '普通' },
  { value: 'uncommon', label: '优秀' },
  { value: 'rare', label: '稀有' },
  { value: 'epic', label: '史诗' },
  { value: 'legendary', label: '传说' },
  { value: 'mythic', label: '神话' }
]

const STAT_FIELDS = [
  { value: 'attack', label: '攻击力' },
  { value: 'defense', label: '防御力' },
  { value: 'speed', label: '速度' },
  { value: 'hp', label: '生命值' },
  { value: 'max_hp', label: '最大生命' },
  { value: 'mp', label: '灵力值' },
  { value: 'max_mp', label: '最大灵力' },
  { value: 'crit_rate', label: '暴击率%' },
  { value: 'crit_damage', label: '暴击伤害%' },
  { value: 'dodge', label: '闪避率%' },
  { value: 'hp_regen', label: '生命回复' },
  { value: 'mp_regen', label: '灵力回复' }
]

const EFFECT_TYPES = [
  { value: 'heal_hp', label: '恢复生命值' },
  { value: 'heal_mp', label: '恢复灵力值' },
  { value: 'exp', label: '获得经验' },
  { value: 'gold', label: '获得金币' },
  { value: 'capture_bonus', label: '捕捉成功率+%' },
  { value: 'tribulation_bonus', label: '渡劫成功率+%' },
  { value: 'buff_attack', label: '攻击力加成%' },
  { value: 'buff_defense', label: '防御力加成%' },
  { value: 'buff_speed', label: '速度加成%' },
  { value: 'revive', label: '原地复活' }
]

const SKILL_SUBTYPES = [
  { value: 'damage', label: '普通伤害' },
  { value: 'damage_crit', label: '暴击伤害' },
  { value: 'damage_heal', label: '伤害+吸血' },
  { value: 'damage_aoe', label: '范围伤害' },
  { value: 'heal', label: '治疗' },
  { value: 'heal_group', label: '群体治疗' },
  { value: 'buff', label: '增益效果' },
  { value: 'debuff', label: '减益效果' },
  { value: 'shield', label: '护盾' },
  { value: 'passive', label: '被动加成' }
]

const DUNGEON_REWARD_FIELDS = [
  { value: 'gold', label: '金币' },
  { value: 'exp', label: '经验值' },
  { value: 'items', label: '物品奖励' }
]

const REALM_OPTIONS = [
  { value: '', label: '无要求' },
  { value: '练气期', label: '练气期' },
  { value: '筑基期', label: '筑基期' },
  { value: '金丹期', label: '金丹期' },
  { value: '元婴期', label: '元婴期' },
  { value: '化神期', label: '化神期' },
  { value: '合体期', label: '合体期' },
  { value: '大乘期', label: '大乘期' },
  { value: '渡劫期', label: '渡劫期' },
  { value: '仙人', label: '仙人' }
]

const TITLE_SOURCES = [
  { value: 'achievement', label: '成就' },
  { value: 'event', label: '活动' },
  { value: 'dungeon', label: '副本' },
  { value: 'manual', label: '手动发放' },
  { value: 'vip', label: 'VIP' },
  { value: 'ranking', label: '排行榜' }
]

const DAY_TYPE_OPTIONS = [
  { value: 'daily', label: '每日签到' },
  { value: 'consecutive', label: '连续签到' },
  { value: 'cumulative', label: '累计签到' }
]

const MONSTER_OPTIONS = [
  { value: 1, label: '1-野兔妖' },
  { value: 2, label: '2-青蛇妖' },
  { value: 3, label: '3-野狼妖' },
  { value: 4, label: '4-黑熊妖' },
  { value: 5, label: '5-花豹妖' },
  { value: 6, label: '6-石巨人' },
  { value: 7, label: '7-树妖' },
  { value: 8, label: '8-赤焰狐' },
  { value: 9, label: '9-铁甲犀' },
  { value: 10, label: '10-毒蜈' },
  { value: 11, label: '11-沼泽鳄' },
  { value: 12, label: '12-蛇女' },
  { value: 13, label: '13-冰狼' },
  { value: 14, label: '14-雪熊' },
  { value: 15, label: '15-冰凤' },
  { value: 16, label: '16-魔将' },
  { value: 17, label: '17-暗魔' },
  { value: 18, label: '18-天魔' }
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState({})
  const [items, setItems] = useState([])
  const [achievements, setAchievements] = useState([])
  const [signInRewards, setSignInRewards] = useState([])
  const [users, setUsers] = useState([])
  const [skills, setSkills] = useState([])
  const [dungeons, setDungeons] = useState([])
  const [titles, setTitles] = useState([])
  const [afkConfig, setAfkConfig] = useState([])
  const [itemOptions, setItemOptions] = useState([])
  const [editingAfkConfig, setEditingAfkConfig] = useState(null)
  const [showAfkModal, setShowAfkModal] = useState(false)
  const [afkConfigForm, setAfkConfigForm] = useState({
    config_key: '', config_value: '', description: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const [showItemModal, setShowItemModal] = useState(false)
  const [showAchModal, setShowAchModal] = useState(false)
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [showDungeonModal, setShowDungeonModal] = useState(false)
  const [showTitleModal, setShowTitleModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editingAch, setEditingAch] = useState(null)
  const [editingSkill, setEditingSkill] = useState(null)
  const [editingDungeon, setEditingDungeon] = useState(null)
  const [editingTitle, setEditingTitle] = useState(null)
  const [editingReward, setEditingReward] = useState(null)
  const [editingUser, setEditingUser] = useState(null)

  const [itemForm, setItemForm] = useState({
    name: '', type: '', sub_type: '', quality: 'common', slot: '',
    price: 0, description: '',
    effectType: '', effectValue: 0,
    stats: []
  })

  const [skillForm, setSkillForm] = useState({
    name: '', description: '', type: 'active', subtype: 'damage',
    levelReq: 1, realmReq: '', mpCost: 10, cooldown: 0, basePower: 10,
    effectType: '', effectValue: 0, effectMultiplier: 1, effectCritChance: 0, effectCritMultiplier: 1.5, effectStat: '',
    growthPower: 5, growthValue: 10, growthHeal: 0, growthStat: 0,
    proficiencyPerLevel: 100, maxLevel: 10,
    icon: '⚔️', sortOrder: 1
  })

  const [dungeonForm, setDungeonForm] = useState({
    name: '', description: '', levelReq: 1, realmReq: '', dailyLimit: 3,
    waves: [[], [], []],
    firstClearGold: 0, firstClearExp: 0, firstClearItems: [],
    clearGold: 0, clearExp: 0, clearItems: [],
    icon: '🏰', sortOrder: 1
  })

  const [titleForm, setTitleForm] = useState({
    name: '', description: '', source: 'achievement', sourceId: 0,
    stats: [],
    icon: '🏅', quality: 'common', sortOrder: 1
  })

  const [rewardForm, setRewardForm] = useState({
    dayType: 'daily', dayNumber: 0,
    gold: 0, exp: 0, items: [],
    sortOrder: 0
  })

  const [userForm, setUserForm] = useState({
    gold: 0, exp: 0, level: 1, realm: '',
    attack: 0, defense: 0, speed: 0,
    maxHp: 0, maxMp: 0, hp: 0, mp: 0
  })
  const [resetPwdModal, setResetPwdModal] = useState(false)
  const [resetPwdUserId, setResetPwdUserId] = useState(null)
  const [resetPwdValue, setResetPwdValue] = useState('')

  const [achForm, setAchForm] = useState({
    name: '', description: '', type: 'cultivate', target_value: 1,
    title: '', icon: '🏆', sort_order: 1,
    rewardGold: 0, rewardExp: 0, rewardItems: []
  })

  const tabs = [
    { key: 'stats', label: '数据统计', icon: '📊' },
    { key: 'items', label: '物品管理', icon: '🎒' },
    { key: 'achievements', label: '成就管理', icon: '🏆' },
    { key: 'skills', label: '技能管理', icon: '⚔️' },
    { key: 'dungeons', label: '副本管理', icon: '🏰' },
    { key: 'titles', label: '称号管理', icon: '🏅' },
    { key: 'rewards', label: '签到奖励', icon: '🎁' },
    { key: 'afk', label: '挂机配置', icon: '⏰' },
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
      if (itemOptions.length === 0) {
        const data = await adminAPI.getItems({ pageSize: 500 })
        const opts = (data.items || data || []).map(i => ({ value: i.id, label: `#${i.id} ${i.name}` }))
        setItemOptions(opts)
      }
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
        case 'skills': {
          const data = await adminAPI.getSkills()
          setSkills(data.skills || data || [])
          break
        }
        case 'dungeons': {
          const data = await adminAPI.getDungeons()
          setDungeons(data.dungeons || data || [])
          break
        }
        case 'titles': {
          const data = await adminAPI.getTitles()
          setTitles(data.titles || data || [])
          break
        }
        case 'afk': {
          const data = await adminAPI.getAfkConfig()
          setAfkConfig(data.configs || data || [])
          break
        }
      }
    } catch (err) {
      showMsg(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const addItemStat = () => {
    setItemForm({ ...itemForm, stats: [...itemForm.stats, { stat: 'attack', value: 0 }] })
  }
  const updateItemStat = (idx, field, value) => {
    const s = [...itemForm.stats]
    s[idx] = { ...s[idx], [field]: field === 'value' ? parseInt(value) || 0 : value }
    setItemForm({ ...itemForm, stats: s })
  }
  const removeItemStat = (idx) => {
    setItemForm({ ...itemForm, stats: itemForm.stats.filter((_, i) => i !== idx) })
  }

  const parseEffectToForm = (effect) => {
    if (!effect) return { effectType: '', effectValue: 0, effectSaveOnFail: false }
    const e = typeof effect === 'string' ? JSON.parse(effect) : effect
    const type = e.type || (e.saveOnFail ? 'tribulation_bonus' : '')
    const value = e.value ?? e.healPercent ?? 0
    return { effectType: type, effectValue: value, effectSaveOnFail: !!e.saveOnFail }
  }

  const parseStatsToForm = (stats) => {
    if (!stats) return []
    const s = typeof stats === 'string' ? JSON.parse(stats) : stats
    return Object.entries(s).map(([stat, value]) => ({ stat, value }))
  }

  const formStatsToObject = (arr) => {
    const obj = {}
    arr.forEach(s => { if (s.stat) obj[s.stat] = parseInt(s.value) || 0 })
    return Object.keys(obj).length > 0 ? obj : null
  }

  const formEffectToObject = (type, value, saveOnFail) => {
    if (!type) return null
    const obj = { type, value: parseInt(value) || 0 }
    if (saveOnFail) obj.saveOnFail = true
    return obj
  }

  const openNewItem = () => {
    setEditingItem(null)
    setItemForm({
      name: '', type: '', sub_type: '', quality: 'common', slot: '',
      price: 0, description: '',
      effectType: '', effectValue: 0, effectSaveOnFail: false,
      stats: []
    })
    setShowItemModal(true)
  }

  const openEditItem = (item) => {
    const eff = parseEffectToForm(item.effect)
    setEditingItem(item)
    setItemForm({
      name: item.name || '',
      type: item.type || '',
      sub_type: item.sub_type || item.subType || '',
      quality: item.quality || 'common',
      slot: item.slot || '',
      price: item.price || 0,
      description: item.description || '',
      effectType: eff.effectType || '',
      effectValue: eff.effectValue || 0,
      effectSaveOnFail: eff.effectSaveOnFail || false,
      stats: parseStatsToForm(item.stats)
    })
    setShowItemModal(true)
  }

  const changeItemType = (newType) => {
    setItemForm({
      ...itemForm,
      type: newType,
      sub_type: '',
      slot: newType === 'equipment' ? itemForm.slot : '',
      effectType: newType === 'consumable' ? itemForm.effectType : '',
      effectValue: newType === 'consumable' ? itemForm.effectValue : 0,
      effectSaveOnFail: newType === 'consumable' ? itemForm.effectSaveOnFail : false,
      stats: (newType === 'equipment' || itemForm.stats.length > 0) ? itemForm.stats : []
    })
  }

  const saveItem = async () => {
    if (!itemForm.name || !itemForm.type) {
      showMsg('请填写物品名称和类型', 'error')
      return
    }
    if (itemForm.type === 'equipment' && !itemForm.slot) {
      showMsg('装备类型必须选择装备部位', 'error')
      return
    }
    if (itemForm.type === 'consumable' && itemForm.effectType && (!itemForm.effectValue || itemForm.effectValue <= 0)) {
      showMsg('已选择使用效果，请填写有效的效果数值', 'error')
      return
    }
    try {
      const isConsumable = itemForm.type === 'consumable'
      const isEquipment = itemForm.type === 'equipment'
      const data = {
        name: itemForm.name,
        type: itemForm.type,
        subType: itemForm.sub_type,
        quality: itemForm.quality,
        slot: isEquipment ? itemForm.slot : null,
        price: parseInt(itemForm.price) || 0,
        description: itemForm.description,
        effect: isConsumable ? formEffectToObject(itemForm.effectType, itemForm.effectValue, itemForm.effectSaveOnFail) : null,
        stats: isEquipment ? formStatsToObject(itemForm.stats) : null
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
      const data2 = await adminAPI.getItems({ pageSize: 500 })
      const opts = (data2.items || data2 || []).map(i => ({ value: i.id, label: `#${i.id} ${i.name}` }))
      setItemOptions(opts)
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

  const parseSkillEffectToForm = (effect) => {
    if (!effect) return {}
    const e = typeof effect === 'string' ? JSON.parse(effect) : effect
    return {
      effectType: e.type || '',
      effectValue: e.value || 0,
      effectMultiplier: e.multiplier || 1,
      effectCritChance: e.critChance || 0,
      effectCritMultiplier: e.critMultiplier || 1.5,
      effectHealPercent: e.healPercent || 0,
      effectStat: e.stat || '',
      effectStatValue: e.statValue || 0
    }
  }

  const parseSkillGrowthToForm = (growth) => {
    if (!growth) return {}
    const g = typeof growth === 'string' ? JSON.parse(growth) : growth
    return {
      growthPower: g.powerPerLevel || 5,
      growthValue: g.valuePerLevel || 10,
      growthHeal: g.healPerLevel || 0,
      growthStat: g.statPerLevel || 0,
      growthCritChance: g.critChancePerLevel || 0
    }
  }

  const formSkillEffectToObject = (f) => {
    if (!f.effectType) return null
    const obj = { type: f.effectType }
    if (f.effectValue) obj.value = parseInt(f.effectValue) || 0
    if (f.effectMultiplier && f.effectMultiplier !== 1) obj.multiplier = parseFloat(f.effectMultiplier) || 1
    if (f.effectCritChance) obj.critChance = parseFloat(f.effectCritChance) || 0
    if (f.effectCritMultiplier && f.effectCritMultiplier !== 1.5) obj.critMultiplier = parseFloat(f.effectCritMultiplier) || 1.5
    if (f.effectHealPercent) obj.healPercent = parseFloat(f.effectHealPercent) || 0
    if (f.effectStat) { obj.stat = f.effectStat; obj.statValue = parseInt(f.effectStatValue) || 0 }
    return obj
  }

  const formSkillGrowthToObject = (f) => {
    const obj = {}
    if (f.growthPower) obj.powerPerLevel = parseInt(f.growthPower) || 0
    if (f.growthValue) obj.valuePerLevel = parseInt(f.growthValue) || 0
    if (f.growthHeal) obj.healPerLevel = parseFloat(f.growthHeal) || 0
    if (f.growthStat) obj.statPerLevel = parseInt(f.growthStat) || 0
    if (f.growthCritChance) obj.critChancePerLevel = parseFloat(f.growthCritChance) || 0
    return Object.keys(obj).length > 0 ? obj : null
  }

  const openNewSkill = () => {
    setEditingSkill(null)
    setSkillForm({
      name: '', description: '', type: 'active', subtype: 'damage',
      levelReq: 1, realmReq: '', mpCost: 10, cooldown: 0, basePower: 10,
      effectType: '', effectValue: 0, effectMultiplier: 1, effectCritChance: 0, effectCritMultiplier: 1.5, effectStat: '', effectStatValue: 0, effectHealPercent: 0,
      growthPower: 5, growthValue: 10, growthHeal: 0, growthStat: 0, growthCritChance: 0,
      proficiencyPerLevel: 100, maxLevel: 10,
      icon: '⚔️', sortOrder: 1
    })
    setShowSkillModal(true)
  }

  const openEditSkill = (skill) => {
    setEditingSkill(skill)
    const eff = parseSkillEffectToForm(skill.effect)
    const grw = parseSkillGrowthToForm(skill.growth)
    setSkillForm({
      name: skill.name || '', description: skill.description || '',
      type: skill.type || 'active', subtype: skill.subtype || 'damage',
      levelReq: skill.level_req || skill.levelReq || 1,
      realmReq: skill.realm_req || skill.realmReq || '',
      mpCost: skill.mp_cost || skill.mpCost || 0,
      cooldown: skill.cooldown || 0,
      basePower: skill.base_power || skill.basePower || 0,
      proficiencyPerLevel: skill.proficiency_per_level || skill.proficiencyPerLevel || 100,
      maxLevel: skill.max_level || skill.maxLevel || 10,
      icon: skill.icon || '⚔️', sortOrder: skill.sort_order || skill.sortOrder || 1,
      ...eff, ...grw
    })
    setShowSkillModal(true)
  }

  const saveSkill = async () => {
    if (!skillForm.name) {
      showMsg('请填写技能名称', 'error')
      return
    }
    try {
      const data = {
        name: skillForm.name, description: skillForm.description,
        type: skillForm.type, subtype: skillForm.subtype,
        levelReq: parseInt(skillForm.levelReq) || 1,
        realmReq: skillForm.realmReq || null,
        mpCost: parseInt(skillForm.mpCost) || 0,
        cooldown: parseInt(skillForm.cooldown) || 0,
        basePower: parseInt(skillForm.basePower) || 0,
        effect: formSkillEffectToObject(skillForm),
        growth: formSkillGrowthToObject(skillForm),
        proficiencyPerLevel: parseInt(skillForm.proficiencyPerLevel) || 100,
        maxLevel: parseInt(skillForm.maxLevel) || 10,
        icon: skillForm.icon,
        sortOrder: parseInt(skillForm.sortOrder) || 1
      }
      if (editingSkill) {
        await adminAPI.updateSkill(editingSkill.id, data)
        showMsg('技能更新成功')
      } else {
        await adminAPI.createSkill(data)
        showMsg('技能创建成功')
      }
      setShowSkillModal(false)
      loadTabData('skills')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }

  const deleteSkill = async (id, name) => {
    if (!window.confirm(`确定要删除技能「${name}」吗？此操作不可恢复。`)) return
    try {
      await adminAPI.deleteSkill(id)
      showMsg(`技能「${name}」已删除`)
      loadTabData('skills')
    } catch (err) {
      showMsg(err.message || '删除失败', 'error')
    }
  }

  const addWave = () => {
    setDungeonForm({ ...dungeonForm, waves: [...dungeonForm.waves, []] })
  }
  const removeWave = (idx) => {
    const w = dungeonForm.waves.filter((_, i) => i !== idx)
    setDungeonForm({ ...dungeonForm, waves: w.length ? w : [[]] })
  }
  const toggleMonsterInWave = (waveIdx, monsterId) => {
    const w = dungeonForm.waves.map((wave, i) => {
      if (i !== waveIdx) return wave
      if (wave.includes(monsterId)) return wave.filter(id => id !== monsterId)
      return [...wave, monsterId]
    })
    setDungeonForm({ ...dungeonForm, waves: w })
  }

  const addRewardItem = (formKey, itemKey) => {
    setDungeonForm({ ...dungeonForm, [formKey]: [...dungeonForm[formKey], { itemId: '', quantity: 1 }] })
  }
  const updateRewardItem = (formKey, idx, field, value) => {
    const arr = dungeonForm[formKey].map((it, i) => i === idx ? { ...it, [field]: field === 'quantity' ? parseInt(value) || 0 : parseInt(value) || '' } : it)
    setDungeonForm({ ...dungeonForm, [formKey]: arr })
  }
  const removeRewardItem = (formKey, idx) => {
    setDungeonForm({ ...dungeonForm, [formKey]: dungeonForm[formKey].filter((_, i) => i !== idx) })
  }

  const parseDungeonToForm = (d) => {
    const waves = d.monsters ? (typeof d.monsters === 'string' ? JSON.parse(d.monsters) : d.monsters) : [[], [], []]
    const fcr = d.first_clear_rewards ? (typeof d.first_clear_rewards === 'string' ? JSON.parse(d.first_clear_rewards) : d.first_clear_rewards) : {}
    const cr = d.clear_rewards ? (typeof d.clear_rewards === 'string' ? JSON.parse(d.clear_rewards) : d.clear_rewards) : {}
    return {
      name: d.name || '', description: d.description || '',
      levelReq: d.level_req || d.levelReq || 1,
      realmReq: d.realm_req || d.realmReq || '',
      dailyLimit: d.daily_limit || d.dailyLimit || 3,
      waves: Array.isArray(waves) && waves.length ? waves : [[], [], []],
      firstClearGold: fcr.gold || 0, firstClearExp: fcr.exp || 0, firstClearItems: fcr.items || [],
      clearGold: cr.gold || 0, clearExp: cr.exp || 0, clearItems: cr.items || [],
      icon: d.icon || '🏰', sortOrder: d.sort_order || d.sortOrder || 1
    }
  }

  const formDungeonToData = (f) => {
    const firstClearRewards = {}
    if (f.firstClearGold > 0) firstClearRewards.gold = parseInt(f.firstClearGold)
    if (f.firstClearExp > 0) firstClearRewards.exp = parseInt(f.firstClearExp)
    const fci = (f.firstClearItems || []).filter(i => i.itemId && i.quantity > 0)
    if (fci.length) firstClearRewards.items = fci.map(i => ({ itemId: parseInt(i.itemId), quantity: parseInt(i.quantity) }))

    const clearRewards = {}
    if (f.clearGold > 0) clearRewards.gold = parseInt(f.clearGold)
    if (f.clearExp > 0) clearRewards.exp = parseInt(f.clearExp)
    const ci = (f.clearItems || []).filter(i => i.itemId && i.quantity > 0)
    if (ci.length) clearRewards.items = ci.map(i => ({ itemId: parseInt(i.itemId), quantity: parseInt(i.quantity) }))

    return {
      name: f.name, description: f.description,
      levelReq: parseInt(f.levelReq) || 1,
      realmReq: f.realmReq || null,
      dailyLimit: parseInt(f.dailyLimit) || 3,
      monsters: f.waves,
      firstClearRewards: Object.keys(firstClearRewards).length ? firstClearRewards : null,
      clearRewards: Object.keys(clearRewards).length ? clearRewards : null,
      icon: f.icon,
      sortOrder: parseInt(f.sortOrder) || 1
    }
  }

  const openNewDungeon = () => {
    setEditingDungeon(null)
    setDungeonForm({
      name: '', description: '', levelReq: 1, realmReq: '', dailyLimit: 3,
      waves: [[], [], []],
      firstClearGold: 0, firstClearExp: 0, firstClearItems: [],
      clearGold: 0, clearExp: 0, clearItems: [],
      icon: '🏰', sortOrder: 1
    })
    setShowDungeonModal(true)
  }

  const openEditDungeon = (d) => {
    setEditingDungeon(d)
    setDungeonForm(parseDungeonToForm(d))
    setShowDungeonModal(true)
  }

  const saveDungeon = async () => {
    if (!dungeonForm.name) {
      showMsg('请填写副本名称', 'error')
      return
    }
    if (dungeonForm.waves.length === 0 || dungeonForm.waves.every(w => w.length === 0)) {
      showMsg('请至少配置一波怪物', 'error')
      return
    }
    try {
      const data = formDungeonToData(dungeonForm)
      if (editingDungeon) {
        await adminAPI.updateDungeon(editingDungeon.id, data)
        showMsg('副本更新成功')
      } else {
        await adminAPI.createDungeon(data)
        showMsg('副本创建成功')
      }
      setShowDungeonModal(false)
      await loadTabData('dungeons')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }

  const deleteDungeon = async (id, name) => {
    if (!window.confirm(`确定要删除副本「${name}」吗？此操作不可恢复。`)) return
    try {
      await adminAPI.deleteDungeon(id)
      showMsg(`副本「${name}」已删除`)
      loadTabData('dungeons')
    } catch (err) {
      showMsg(err.message || '删除失败', 'error')
    }
  }

  const addTitleStat = () => {
    setTitleForm({ ...titleForm, stats: [...titleForm.stats, { stat: 'attack', value: 0 }] })
  }
  const updateTitleStat = (idx, field, value) => {
    const s = [...titleForm.stats]
    s[idx] = { ...s[idx], [field]: field === 'value' ? parseInt(value) || 0 : value }
    setTitleForm({ ...titleForm, stats: s })
  }
  const removeTitleStat = (idx) => {
    setTitleForm({ ...titleForm, stats: titleForm.stats.filter((_, i) => i !== idx) })
  }

  const openNewTitle = () => {
    setEditingTitle(null)
    setTitleForm({
      name: '', description: '', source: 'achievement', sourceId: 0,
      stats: [],
      icon: '🏅', quality: 'common', sortOrder: 1
    })
    setShowTitleModal(true)
  }

  const openEditTitle = (t) => {
    setEditingTitle(t)
    setTitleForm({
      name: t.name || '', description: t.description || '',
      source: t.source || 'achievement',
      sourceId: t.source_id || t.sourceId || 0,
      stats: parseStatsToForm(t.stats),
      icon: t.icon || '🏅', quality: t.quality || 'common',
      sortOrder: t.sort_order || t.sortOrder || 1
    })
    setShowTitleModal(true)
  }

  const saveTitle = async () => {
    if (!titleForm.name) {
      showMsg('请填写称号名称', 'error')
      return
    }
    try {
      const data = {
        name: titleForm.name, description: titleForm.description,
        source: titleForm.source,
        sourceId: parseInt(titleForm.sourceId) || 0,
        stats: formStatsToObject(titleForm.stats),
        icon: titleForm.icon, quality: titleForm.quality,
        sortOrder: parseInt(titleForm.sortOrder) || 1
      }
      if (editingTitle) {
        await adminAPI.updateTitle(editingTitle.id, data)
        showMsg('称号更新成功')
      } else {
        await adminAPI.createTitle(data)
        showMsg('称号创建成功')
      }
      setShowTitleModal(false)
      loadTabData('titles')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }

  const addRewardSigItem = () => {
    setRewardForm({ ...rewardForm, items: [...rewardForm.items, { itemId: '', quantity: 1 }] })
  }
  const updateRewardSigItem = (idx, field, value) => {
    const arr = rewardForm.items.map((it, i) => i === idx ? { ...it, [field]: field === 'quantity' ? parseInt(value) || 0 : parseInt(value) || '' } : it)
    setRewardForm({ ...rewardForm, items: arr })
  }
  const removeRewardSigItem = (idx) => {
    setRewardForm({ ...rewardForm, items: rewardForm.items.filter((_, i) => i !== idx) })
  }

  const parseRewardToForm = (r) => {
    const rw = r.rewards ? (typeof r.rewards === 'string' ? JSON.parse(r.rewards) : r.rewards) : {}
    return {
      dayType: r.day_type || r.dayType || 'daily',
      dayNumber: r.day_number || r.dayNumber || 0,
      gold: rw.gold || 0, exp: rw.exp || 0,
      items: rw.items || [],
      sortOrder: r.sort_order || r.sortOrder || 0
    }
  }
  const formRewardToData = (f) => {
    const rewards = {}
    if (f.gold > 0) rewards.gold = parseInt(f.gold)
    if (f.exp > 0) rewards.exp = parseInt(f.exp)
    const it = (f.items || []).filter(i => i.itemId && i.quantity > 0)
    if (it.length) rewards.items = it.map(i => ({ itemId: parseInt(i.itemId), quantity: parseInt(i.quantity) }))
    return {
      dayType: f.dayType,
      dayNumber: f.dayType === 'daily' ? null : (parseInt(f.dayNumber) || 1),
      rewards: Object.keys(rewards).length ? rewards : {},
      sortOrder: parseInt(f.sortOrder) || 0
    }
  }

  const openNewReward = () => {
    setEditingReward(null)
    setRewardForm({
      dayType: 'daily', dayNumber: 0,
      gold: 0, exp: 0, items: [],
      sortOrder: 0
    })
    setShowRewardModal(true)
  }
  const openEditReward = (r) => {
    setEditingReward(r)
    setRewardForm(parseRewardToForm(r))
    setShowRewardModal(true)
  }
  const saveReward = async () => {
    if (rewardForm.dayType !== 'daily' && (!rewardForm.dayNumber || rewardForm.dayNumber < 1)) {
      showMsg('请填写签到天数', 'error'); return
    }
    try {
      const data = formRewardToData(rewardForm)
      if (editingReward) {
        await adminAPI.updateSignInReward(editingReward.id, data)
        showMsg('签到奖励更新成功')
      } else {
        await adminAPI.createSignInReward(data)
        showMsg('签到奖励创建成功')
      }
      setShowRewardModal(false)
      loadTabData('rewards')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }
  const deleteReward = async (id) => {
    if (!window.confirm('确定要删除该签到奖励吗？此操作不可恢复。')) return
    try {
      await adminAPI.deleteSignInReward(id)
      showMsg('签到奖励已删除')
      loadTabData('rewards')
    } catch (err) {
      showMsg(err.message || '删除失败', 'error')
    }
  }

  const openEditUser = async (u) => {
    try {
      const data = await adminAPI.getUser(u.id)
      const user = data.user || u
      setEditingUser(user)
      setUserForm({
        gold: user.gold != null ? user.gold : 0,
        exp: user.exp != null ? user.exp : 0,
        level: user.level || 1,
        realm: user.realm || '',
        attack: user.attack != null ? user.attack : 0,
        defense: user.defense != null ? user.defense : 0,
        speed: user.speed != null ? user.speed : 0,
        maxHp: user.max_hp != null ? user.max_hp : 0,
        maxMp: user.max_mp != null ? user.max_mp : 0,
        hp: user.hp != null ? user.hp : 0,
        mp: user.mp != null ? user.mp : 0
      })
      setShowUserModal(true)
    } catch (err) {
      showMsg(err.message || '加载用户失败', 'error')
    }
  }
  const saveUser = async () => {
    if (!editingUser) return
    try {
      const data = {
        gold: parseInt(userForm.gold) || 0,
        exp: parseInt(userForm.exp) || 0,
        level: parseInt(userForm.level) || 1,
        realm: userForm.realm || null,
        attack: parseInt(userForm.attack) || 0,
        defense: parseInt(userForm.defense) || 0,
        speed: parseInt(userForm.speed) || 0,
        maxHp: parseInt(userForm.maxHp) || 0,
        maxMp: parseInt(userForm.maxMp) || 0,
        hp: parseInt(userForm.hp) || 0,
        mp: parseInt(userForm.mp) || 0
      }
      await adminAPI.updateUser(editingUser.id, data)
      showMsg('用户数据更新成功')
      setShowUserModal(false)
      loadTabData('users')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }
  const deleteUser = async (id, username) => {
    if (!window.confirm(`确定要删除用户「${username}」吗？此操作不可恢复，将删除该用户的所有数据！`)) return
    try {
      await adminAPI.deleteUser(id)
      showMsg(`用户「${username}」已删除`)
      loadTabData('users')
    } catch (err) {
      showMsg(err.message || '删除失败', 'error')
    }
  }
  const openResetPwd = (id) => {
    setResetPwdUserId(id)
    setResetPwdValue('')
    setResetPwdModal(true)
  }
  const confirmResetPwd = async () => {
    if (!resetPwdValue || resetPwdValue.length < 6) {
      showMsg('密码至少6位', 'error'); return
    }
    try {
      await adminAPI.resetUserPassword(resetPwdUserId, resetPwdValue)
      showMsg('密码重置成功')
      setResetPwdModal(false)
    } catch (err) {
      showMsg(err.message || '重置失败', 'error')
    }
  }

  const deleteTitle = async (id, name) => {
    if (!window.confirm(`确定要删除称号「${name}」吗？此操作不可恢复。`)) return
    try {
      await adminAPI.deleteTitle(id)
      showMsg(`称号「${name}」已删除`)
      loadTabData('titles')
    } catch (err) {
      showMsg(err.message || '删除失败', 'error')
    }
  }

  const openEditAfkConfig = (config) => {
    setEditingAfkConfig(config)
    setAfkConfigForm({
      config_key: config.config_key || '',
      config_value: config.config_value || '',
      description: config.description || ''
    })
    setShowAfkModal(true)
  }

  const saveAfkConfig = async () => {
    if (!afkConfigForm.config_key || afkConfigForm.config_value === '') {
      showMsg('请填写配置键和配置值', 'error')
      return
    }
    try {
      await adminAPI.updateAfkConfig(
        afkConfigForm.config_key,
        afkConfigForm.config_value,
        afkConfigForm.description
      )
      showMsg('挂机配置更新成功')
      setShowAfkModal(false)
      loadTabData('afk')
    } catch (err) {
      showMsg(err.message || '保存失败', 'error')
    }
  }

  const afkConfigLabel = (key) => ({
    exp_per_minute: '每分钟经验值',
    gold_per_minute: '每分钟金币',
    max_offline_hours: '最大离线累计时间(小时)',
    level_multiplier: '等级加成系数',
    realm_multiplier: '境界加成系数',
    min_collect_minutes: '最小领取间隔(分钟)'
  })[key] || key

  const achAddRewardItem = () => {
    setAchForm({
      ...achForm,
      rewardItems: [...achForm.rewardItems, { itemId: '', quantity: 1 }]
    })
  }

  const achUpdateRewardItem = (idx, field, value) => {
    const newItems = [...achForm.rewardItems]
    newItems[idx] = { ...newItems[idx], [field]: field === 'quantity' ? parseInt(value) || 0 : value }
    setAchForm({ ...achForm, rewardItems: newItems })
  }

  const achRemoveRewardItem = (idx) => {
    const newItems = achForm.rewardItems.filter((_, i) => i !== idx)
    setAchForm({ ...achForm, rewardItems: newItems })
  }

  const qualityColor = (q) => ({
    common: '#cccccc', uncommon: '#1eff00', rare: '#0070dd', epic: '#a335ee',
    legendary: '#ff8000', mythic: '#e60000'
  })[q] || '#cccccc'

  const qualityText = (q) => ({
    common: '普通', uncommon: '优秀', rare: '稀有', epic: '史诗',
    legendary: '传说', mythic: '神话'
  })[q] || q

  const itemTypeText = (t) => ({
    consumable: '消耗品', equipment: '装备', material: '材料',
    quest: '任务物品', treasure: '宝物'
  })[t] || t

  const itemSubtypeText = (t) => ({
    pill: '丹药', capture: '捕捉道具', tribulation: '渡劫道具', food: '食物', scroll: '卷轴',
    weapon: '武器', helmet: '头盔', armor: '铠甲', boots: '靴子', accessory: '饰品',
    ore: '矿石', herb: '草药', beast_core: '兽核', fabric: '布料',
    quest_item: '任务物品', chest: '宝箱', gift: '礼包'
  })[t] || t

  const slotText = (s) => ({
    weapon: '武器', helmet: '头盔', armor: '铠甲', boots: '靴子', accessory: '饰品'
  })[s] || s

  const achTypeText = (t) => ({
    cultivate: '修炼次数', combat: '战斗胜利', gold: '金币累计', realm: '境界等级',
    sign_in: '累计签到', consecutive_sign_in: '连续签到', pet_catch: '宠物捕获', quest_complete: '任务完成'
  })[t] || t

  const skillSubtypeText = (s) => {
    const opt = SKILL_SUBTYPES.find(o => o.value === s)
    return opt ? opt.label : s
  }

  const titleSourceText = (s) => {
    const opt = TITLE_SOURCES.find(o => o.value === s)
    return opt ? opt.label : s
  }

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
                <div className="stat-item"><div className="stat-value">{stats.skillCount || 0}</div><div className="stat-label">技能数</div></div>
                <div className="stat-item"><div className="stat-value">{stats.dungeonCount || 0}</div><div className="stat-label">副本数</div></div>
                <div className="stat-item"><div className="stat-value">{stats.titleCount || 0}</div><div className="stat-label">称号数</div></div>
                <div className="stat-item"><div className="stat-value">{stats.todaySignIns || 0}</div><div className="stat-label">今日签到</div></div>
                <div className="stat-item"><div className="stat-value">{stats.totalSignIns || 0}</div><div className="stat-label">累计签到</div></div>
                <div className="stat-item"><div className="stat-value">{stats.onlineCount || 0}</div><div className="stat-label">当前在线</div></div>
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
                    <th>品质</th><th>价格</th><th>属性/效果</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td style={{ color: qualityColor(item.quality), fontWeight: 700 }}>{item.name}</td>
                        <td>{itemTypeText(item.type)}</td>
                        <td>{item.sub_type ? itemSubtypeText(item.sub_type) : '-'}</td>
                        <td><span style={{ color: qualityColor(item.quality) }}>{qualityText(item.quality)}</span></td>
                        <td>{item.price}</td>
                        <td style={{ color: '#7ec8e3', fontSize: '0.8rem', maxWidth: '250px' }}>
                          {item.stats && typeof item.stats === 'object'
                            ? Object.entries(item.stats).map(([k, v]) => {
                                const sf = STAT_FIELDS.find(s => s.value === k)
                                return `${sf ? sf.label : k}+${v}`
                              }).join(' ')
                            : item.effect && typeof item.effect === 'object'
                            ? (() => {
                                const ef = EFFECT_TYPES.find(e => e.value === item.effect.type)
                                return ef ? `${ef.label}${item.effect.value || ''}` : '特殊效果'
                              })()
                            : '-'}
                        </td>
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

          {activeTab === 'skills' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>技能列表</div>
                <button className="btn-primary" onClick={openNewSkill}>+ 新增技能</button>
              </div>
              <div className="admin-table">
                <table>
                  <thead><tr>
                    <th>ID</th><th>图标</th><th>名称</th><th>类型</th><th>子类型</th>
                    <th>等级要求</th><th>灵力消耗</th><th>威力</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {skills.map(s => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td style={{ fontSize: '1.2rem' }}>{s.icon}</td>
                        <td>{s.name}</td>
                        <td style={{ color: s.type === 'active' ? '#e67e22' : '#9b59b6' }}>
                          {s.type === 'active' ? '主动技能' : '被动技能'}
                        </td>
                        <td>{s.subtype ? skillSubtypeText(s.subtype) : '-'}</td>
                        <td>Lv.{s.level_req || s.levelReq}</td>
                        <td>{s.mp_cost ?? s.mpCost ?? 0}</td>
                        <td>{s.base_power ?? s.basePower ?? 0}</td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => openEditSkill(s)}>编辑</button>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#c0392b' }} onClick={() => deleteSkill(s.id, s.name)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'dungeons' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>副本列表</div>
                <button className="btn-primary" onClick={openNewDungeon}>+ 新增副本</button>
              </div>
              <div className="admin-table">
                <table>
                  <thead><tr>
                    <th>ID</th><th>图标</th><th>名称</th><th>等级要求</th>
                    <th>每日次数</th><th>波次数</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {dungeons.map(d => (
                      <tr key={d.id}>
                        <td>{d.id}</td>
                        <td style={{ fontSize: '1.2rem' }}>{d.icon}</td>
                        <td>{d.name}</td>
                        <td>Lv.{d.level_req}</td>
                        <td>{d.daily_limit}</td>
                        <td>{Array.isArray(d.monsters) ? d.monsters.length : 0}</td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => openEditDungeon(d)}>编辑</button>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#c0392b' }} onClick={() => deleteDungeon(d.id, d.name)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'titles' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>称号列表</div>
                <button className="btn-primary" onClick={openNewTitle}>+ 新增称号</button>
              </div>
              <div className="admin-table">
                <table>
                  <thead><tr>
                    <th>ID</th><th>图标</th><th>名称</th><th>品质</th><th>来源</th>
                    <th>属性加成</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {titles.map(t => (
                      <tr key={t.id}>
                        <td>{t.id}</td>
                        <td style={{ fontSize: '1.2rem' }}>{t.icon}</td>
                        <td style={{ color: qualityColor(t.quality), fontWeight: 700 }}>{t.name}</td>
                        <td><span style={{ color: qualityColor(t.quality) }}>{qualityText(t.quality)}</span></td>
                        <td>{titleSourceText(t.source)}</td>
                        <td style={{ color: '#7ec8e3', fontSize: '0.85rem' }}>
                          {t.stats && typeof t.stats === 'object'
                            ? Object.entries(t.stats).map(([k, v]) => {
                                const sf = STAT_FIELDS.find(s => s.value === k)
                                return `${sf ? sf.label : k}+${v}`
                              }).join(' ')
                            : '-'}
                        </td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => openEditTitle(t)}>编辑</button>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#c0392b' }} onClick={() => deleteTitle(t.id, t.name)}>删除</button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>签到奖励配置</div>
                <button className="btn-primary" onClick={openNewReward}>+ 新增奖励</button>
              </div>
              <div className="admin-table">
                <table>
                  <thead><tr><th>ID</th><th>类型</th><th>天数</th><th>奖励内容</th><th>操作</th></tr></thead>
                  <tbody>
                    {signInRewards.map(r => {
                      const rw = typeof r.rewards === 'string' ? JSON.parse(r.rewards) : r.rewards || {}
                      return (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{r.day_type === 'daily' ? '每日签到' : r.day_type === 'consecutive' ? '连续签到' : '累计签到'}</td>
                          <td>{r.day_type === 'daily' ? '-' : r.day_number}</td>
                          <td style={{ color: '#f0d878', fontSize: '0.85rem' }}>
                            {rw.gold ? `金币+${rw.gold} ` : ''}
                            {rw.exp ? `经验+${rw.exp} ` : ''}
                            {rw.items && rw.items.length ? rw.items.map(i => {
                              const it = itemOptions.find(o => o.value === i.itemId)
                              return ` ${it ? it.label.split(' ').slice(1).join(' ') : '物品#'+i.itemId}x${i.quantity}`
                            }).join(' ') : ''}
                            {!rw.gold && !rw.exp && (!rw.items || !rw.items.length) ? '-' : ''}
                          </td>
                          <td>
                            <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => openEditReward(r)}>编辑</button>
                            <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#c0392b' }} onClick={() => deleteReward(r.id)}>删除</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'afk' && (
            <div>
              <div className="card-title">挂机修炼配置</div>
              <div className="admin-table">
                <table>
                  <thead><tr>
                    <th>ID</th><th>配置项</th><th>配置键</th><th>当前值</th><th>说明</th><th>更新时间</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {afkConfig.map(config => (
                      <tr key={config.id}>
                        <td>{config.id}</td>
                        <td style={{ fontWeight: 700 }}>{afkConfigLabel(config.config_key)}</td>
                        <td style={{ color: '#888', fontFamily: 'monospace', fontSize: '0.85rem' }}>{config.config_key}</td>
                        <td style={{ color: '#7ec8e3', fontWeight: 700 }}>{config.config_value}</td>
                        <td style={{ color: '#aaa', fontSize: '0.85rem' }}>{config.description || '-'}</td>
                        <td style={{ fontSize: '0.8rem', color: '#888' }}>{config.updated_at ? new Date(config.updated_at).toLocaleString() : '-'}</td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openEditAfkConfig(config)}>编辑</button>
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
                    <th>角色</th><th>境界</th><th>等级</th><th>金币</th>
                    <th>攻击/防御/速度</th><th>操作</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td style={{ fontWeight: 700 }}>{u.username}</td>
                        <td style={{ fontSize: '0.8rem', color: '#888' }}>{u.created_at}</td>
                        <td>{u.character_name || '-'}</td>
                        <td style={{ color: '#7ec8e3' }}>{u.realm || '-'}</td>
                        <td>Lv.{u.level || '-'}</td>
                        <td style={{ color: '#f0d878' }}>{u.gold != null ? u.gold : '-'}</td>
                        <td style={{ fontSize: '0.85rem', color: '#aaa' }}>
                          {u.attack != null ? `${u.attack}/${u.defense}/${u.speed}` : '-'}
                        </td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginRight: '0.3rem' }} onClick={() => openEditUser(u)}>编辑</button>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginRight: '0.3rem', background: '#2980b9' }} onClick={() => openResetPwd(u.id)}>重置密码</button>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#c0392b' }} onClick={() => deleteUser(u.id, u.username)}>删除</button>
                        </td>
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
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{editingItem ? '编辑物品' : '新增物品'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>物品名称 *</label><input type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} /></div>
              <div className="form-group"><label>类型 *</label>
                <select value={itemForm.type} onChange={e => changeItemType(e.target.value)} style={selectStyle}>
                  <option value="">请选择类型</option>
                  {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {itemForm.type && ITEM_SUBTYPES[itemForm.type] && (
                <div className="form-group"><label>子类型</label>
                  <select value={itemForm.sub_type} onChange={e => setItemForm({ ...itemForm, sub_type: e.target.value })} style={selectStyle}>
                    <option value="">请选择子类型</option>
                    {ITEM_SUBTYPES[itemForm.type].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}
              {!itemForm.type && <div className="form-group"><label>子类型</label><div style={{ padding: '0.7rem', color: '#666' }}>请先选择类型</div></div>}
              <div className="form-group"><label>品质</label>
                <select value={itemForm.quality} onChange={e => setItemForm({ ...itemForm, quality: e.target.value })} style={selectStyle}>
                  {QUALITIES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>
              {itemForm.type === 'equipment' ? (
                <div className="form-group"><label>装备部位</label>
                  <select value={itemForm.slot} onChange={e => setItemForm({ ...itemForm, slot: e.target.value })} style={selectStyle}>
                    <option value="">请选择部位</option>
                    {EQUIPMENT_SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group"><label>装备部位</label><div style={{ padding: '0.7rem', color: '#666' }}>仅装备类型需要</div></div>
              )}
              <div className="form-group"><label>价格（金币）</label><input type="number" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>物品描述</label><input type="text" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>

            {itemForm.type === 'consumable' && (
              <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
                <div className="section-title" style={{ marginBottom: '0.8rem', fontSize: '1rem' }}>🧪 使用效果配置</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div className="form-group"><label>效果类型</label>
                    <select value={itemForm.effectType} onChange={e => setItemForm({ ...itemForm, effectType: e.target.value })} style={selectStyle}>
                      <option value="">无效果</option>
                      {EFFECT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>效果数值</label>
                    <input type="number" value={itemForm.effectValue} onChange={e => setItemForm({ ...itemForm, effectValue: e.target.value })} disabled={!itemForm.effectType} />
                  </div>
                </div>
                {itemForm.effectType === 'tribulation_bonus' && (
                  <div className="form-group" style={{ marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={!!itemForm.effectSaveOnFail} onChange={e => setItemForm({ ...itemForm, effectSaveOnFail: e.target.checked })} />
                      渡劫失败时保不死
                    </label>
                  </div>
                )}
              </div>
            )}

            {(itemForm.type === 'equipment' || itemForm.stats.length > 0) && (
              <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <div className="section-title" style={{ marginBottom: 0, fontSize: '1rem' }}>⚔️ 属性加成配置</div>
                  <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={addItemStat}>+ 添加属性</button>
                </div>
                {itemForm.stats.length === 0 && (
                  <div style={{ color: '#666', fontStyle: 'italic', padding: '0.5rem' }}>暂无属性加成</div>
                )}
                {itemForm.stats.map((stat, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <select value={stat.stat} onChange={e => updateItemStat(idx, 'stat', e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                      {STAT_FIELDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <input type="number" placeholder="数值" value={stat.value} onChange={e => updateItemStat(idx, 'value', e.target.value)} style={{ width: '100px', padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }} />
                    <button onClick={() => removeItemStat(idx)} style={{ padding: '0.5rem 0.8rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>删除</button>
                  </div>
                ))}
              </div>
            )}

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
                <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={achAddRewardItem}>+ 添加道具</button>
              </div>
              {achForm.rewardItems && achForm.rewardItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {achForm.rewardItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <ItemSearchSelect
                        options={itemOptions}
                        value={item.itemId}
                        onChange={v => achUpdateRewardItem(idx, 'itemId', v)}
                        placeholder="搜索物品名称"
                      />
                      <input type="number" placeholder="数量" value={item.quantity}
                        onChange={e => achUpdateRewardItem(idx, 'quantity', e.target.value)}
                        style={{ width: '80px', padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }}
                      />
                      <button onClick={() => achRemoveRewardItem(idx)}
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

      {showSkillModal && (
        <div className="modal-overlay" onClick={() => setShowSkillModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{editingSkill ? '编辑技能' : '新增技能'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>技能名称 *</label><input type="text" value={skillForm.name} onChange={e => setSkillForm({ ...skillForm, name: e.target.value })} /></div>
              <div className="form-group"><label>图标（emoji）</label><input type="text" value={skillForm.icon} onChange={e => setSkillForm({ ...skillForm, icon: e.target.value })} /></div>
              <div className="form-group"><label>技能类型</label>
                <select value={skillForm.type} onChange={e => setSkillForm({ ...skillForm, type: e.target.value })} style={selectStyle}>
                  <option value="active">主动技能</option>
                  <option value="passive">被动技能</option>
                </select>
              </div>
              <div className="form-group"><label>技能效果分类</label>
                <select value={skillForm.subtype} onChange={e => setSkillForm({ ...skillForm, subtype: e.target.value })} style={selectStyle}>
                  {SKILL_SUBTYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>等级要求</label><input type="number" value={skillForm.levelReq} onChange={e => setSkillForm({ ...skillForm, levelReq: e.target.value })} /></div>
              <div className="form-group"><label>境界要求</label>
                <select value={skillForm.realmReq} onChange={e => setSkillForm({ ...skillForm, realmReq: e.target.value })} style={selectStyle}>
                  {REALM_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>灵力消耗</label><input type="number" value={skillForm.mpCost} onChange={e => setSkillForm({ ...skillForm, mpCost: e.target.value })} /></div>
              <div className="form-group"><label>冷却回合</label><input type="number" value={skillForm.cooldown} onChange={e => setSkillForm({ ...skillForm, cooldown: e.target.value })} /></div>
              <div className="form-group"><label>基础威力</label><input type="number" value={skillForm.basePower} onChange={e => setSkillForm({ ...skillForm, basePower: e.target.value })} /></div>
              <div className="form-group"><label>每级熟练度需求</label><input type="number" value={skillForm.proficiencyPerLevel} onChange={e => setSkillForm({ ...skillForm, proficiencyPerLevel: e.target.value })} /></div>
              <div className="form-group"><label>最大等级</label><input type="number" value={skillForm.maxLevel} onChange={e => setSkillForm({ ...skillForm, maxLevel: e.target.value })} /></div>
              <div className="form-group"><label>排序（越小越靠前）</label><input type="number" value={skillForm.sortOrder} onChange={e => setSkillForm({ ...skillForm, sortOrder: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>技能描述</label><input type="text" value={skillForm.description} onChange={e => setSkillForm({ ...skillForm, description: e.target.value })} /></div>

            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
              <div className="section-title" style={{ marginBottom: '0.8rem', fontSize: '1rem' }}>⚡ 技能效果配置</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div className="form-group"><label>效果类型</label>
                  <select value={skillForm.effectType} onChange={e => setSkillForm({ ...skillForm, effectType: e.target.value })} style={selectStyle}>
                    <option value="">无（仅基础威力）</option>
                    <option value="damage">普通伤害</option>
                    <option value="damage_crit">暴击伤害</option>
                    <option value="damage_heal">伤害+吸血</option>
                    <option value="damage_aoe">范围伤害</option>
                    <option value="heal">治疗</option>
                    <option value="heal_group">群体治疗</option>
                    <option value="buff">增益效果</option>
                    <option value="debuff">减益效果</option>
                    <option value="shield">护盾</option>
                    <option value="passive">被动属性加成</option>
                  </select>
                </div>
                <div className="form-group"><label>效果固定数值</label><input type="number" value={skillForm.effectValue} onChange={e => setSkillForm({ ...skillForm, effectValue: e.target.value })} /></div>
                <div className="form-group"><label>伤害倍率（x1.0 = 100%）</label><input type="number" step="0.1" value={skillForm.effectMultiplier} onChange={e => setSkillForm({ ...skillForm, effectMultiplier: e.target.value })} /></div>
                {(skillForm.effectType === 'damage_crit') && (
                  <>
                    <div className="form-group"><label>暴击触发几率（0-1）</label><input type="number" step="0.05" value={skillForm.effectCritChance} onChange={e => setSkillForm({ ...skillForm, effectCritChance: e.target.value })} /></div>
                    <div className="form-group"><label>暴击伤害倍率（x1.5 = 150%）</label><input type="number" step="0.1" value={skillForm.effectCritMultiplier} onChange={e => setSkillForm({ ...skillForm, effectCritMultiplier: e.target.value })} /></div>
                  </>
                )}
                {(skillForm.effectType === 'damage_heal') && (
                  <div className="form-group"><label>吸血百分比（0-1）</label><input type="number" step="0.05" value={skillForm.effectHealPercent} onChange={e => setSkillForm({ ...skillForm, effectHealPercent: e.target.value })} /></div>
                )}
                {(skillForm.effectType === 'passive' || skillForm.effectType === 'buff' || skillForm.effectType === 'debuff') && (
                  <>
                    <div className="form-group"><label>影响属性</label>
                      <select value={skillForm.effectStat} onChange={e => setSkillForm({ ...skillForm, effectStat: e.target.value })} style={selectStyle}>
                        <option value="">请选择</option>
                        {STAT_FIELDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>属性数值</label><input type="number" value={skillForm.effectStatValue} onChange={e => setSkillForm({ ...skillForm, effectStatValue: e.target.value })} /></div>
                  </>
                )}
              </div>
            </div>

            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
              <div className="section-title" style={{ marginBottom: '0.8rem', fontSize: '1rem' }}>📈 每级成长配置</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div className="form-group"><label>威力增加/级</label><input type="number" value={skillForm.growthPower} onChange={e => setSkillForm({ ...skillForm, growthPower: e.target.value })} /></div>
                <div className="form-group"><label>数值增加/级（治疗/伤害等）</label><input type="number" value={skillForm.growthValue} onChange={e => setSkillForm({ ...skillForm, growthValue: e.target.value })} /></div>
                <div className="form-group"><label>吸血%增加/级</label><input type="number" step="0.01" value={skillForm.growthHeal} onChange={e => setSkillForm({ ...skillForm, growthHeal: e.target.value })} /></div>
                <div className="form-group"><label>被动属性增加/级</label><input type="number" value={skillForm.growthStat} onChange={e => setSkillForm({ ...skillForm, growthStat: e.target.value })} /></div>
                <div className="form-group"><label>暴击率%增加/级</label><input type="number" step="0.01" value={skillForm.growthCritChance} onChange={e => setSkillForm({ ...skillForm, growthCritChance: e.target.value })} /></div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowSkillModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveSkill}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showDungeonModal && (
        <div className="modal-overlay" onClick={() => setShowDungeonModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{editingDungeon ? '编辑副本' : '新增副本'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>副本名称 *</label><input type="text" value={dungeonForm.name} onChange={e => setDungeonForm({ ...dungeonForm, name: e.target.value })} /></div>
              <div className="form-group"><label>图标（emoji）</label><input type="text" value={dungeonForm.icon} onChange={e => setDungeonForm({ ...dungeonForm, icon: e.target.value })} /></div>
              <div className="form-group"><label>等级要求</label><input type="number" value={dungeonForm.levelReq} onChange={e => setDungeonForm({ ...dungeonForm, levelReq: e.target.value })} /></div>
              <div className="form-group"><label>境界要求</label>
                <select value={dungeonForm.realmReq} onChange={e => setDungeonForm({ ...dungeonForm, realmReq: e.target.value })} style={selectStyle}>
                  {REALM_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>每日挑战次数</label><input type="number" value={dungeonForm.dailyLimit} onChange={e => setDungeonForm({ ...dungeonForm, dailyLimit: e.target.value })} /></div>
              <div className="form-group"><label>排序（越小越靠前）</label><input type="number" value={dungeonForm.sortOrder} onChange={e => setDungeonForm({ ...dungeonForm, sortOrder: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>副本描述</label><input type="text" value={dungeonForm.description} onChange={e => setDungeonForm({ ...dungeonForm, description: e.target.value })} /></div>

            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <div className="section-title" style={{ marginBottom: 0, fontSize: '1rem' }}>👹 怪物波次配置</div>
                <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={addWave}>+ 添加波次</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dungeonForm.waves.map((wave, wi) => (
                  <div key={wi} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: '#e67e22' }}>第 {wi + 1} 波（共 {wave.length} 只怪物）</span>
                      <button onClick={() => removeWave(wi)} style={{ padding: '0.2rem 0.6rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>删除波次</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem' }}>
                      {MONSTER_OPTIONS.map(m => (
                        <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.3rem', background: wave.includes(m.value) ? 'rgba(230,126,34,0.2)' : 'transparent', borderRadius: 4, cursor: 'pointer' }}>
                          <input type="checkbox" checked={wave.includes(m.value)} onChange={() => toggleMonsterInWave(wi, m.value)} />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
              <div className="section-title" style={{ marginBottom: '0.8rem', fontSize: '1rem' }}>🏆 首次通关奖励</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div className="form-group"><label>金币奖励</label><input type="number" value={dungeonForm.firstClearGold} onChange={e => setDungeonForm({ ...dungeonForm, firstClearGold: e.target.value })} /></div>
                <div className="form-group"><label>经验奖励</label><input type="number" value={dungeonForm.firstClearExp} onChange={e => setDungeonForm({ ...dungeonForm, firstClearExp: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#d4af37', fontSize: '0.9rem' }}>道具奖励</span>
                  <button className="btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => addRewardItem('firstClearItems', 'firstClearItems')}>+ 添加道具</button>
                </div>
                {dungeonForm.firstClearItems.length === 0 && <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.85rem' }}>暂无道具奖励</div>}
                {dungeonForm.firstClearItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <ItemSearchSelect
                      options={itemOptions}
                      value={item.itemId}
                      onChange={v => updateRewardItem('firstClearItems', idx, 'itemId', v)}
                      placeholder="搜索物品名称"
                    />
                    <input type="number" placeholder="数量" value={item.quantity} onChange={e => updateRewardItem('firstClearItems', idx, 'quantity', e.target.value)} style={{ width: '80px', padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }} />
                    <button onClick={() => removeRewardItem('firstClearItems', idx)} style={{ padding: '0.5rem 0.8rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>删除</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
              <div className="section-title" style={{ marginBottom: '0.8rem', fontSize: '1rem' }}>🎁 普通通关奖励</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div className="form-group"><label>金币奖励</label><input type="number" value={dungeonForm.clearGold} onChange={e => setDungeonForm({ ...dungeonForm, clearGold: e.target.value })} /></div>
                <div className="form-group"><label>经验奖励</label><input type="number" value={dungeonForm.clearExp} onChange={e => setDungeonForm({ ...dungeonForm, clearExp: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#d4af37', fontSize: '0.9rem' }}>道具奖励</span>
                  <button className="btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => addRewardItem('clearItems', 'clearItems')}>+ 添加道具</button>
                </div>
                {dungeonForm.clearItems.length === 0 && <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.85rem' }}>暂无道具奖励</div>}
                {dungeonForm.clearItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <ItemSearchSelect
                      options={itemOptions}
                      value={item.itemId}
                      onChange={v => updateRewardItem('clearItems', idx, 'itemId', v)}
                      placeholder="搜索物品名称"
                    />
                    <input type="number" placeholder="数量" value={item.quantity} onChange={e => updateRewardItem('clearItems', idx, 'quantity', e.target.value)} style={{ width: '80px', padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }} />
                    <button onClick={() => removeRewardItem('clearItems', idx)} style={{ padding: '0.5rem 0.8rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>删除</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowDungeonModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveDungeon}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showTitleModal && (
        <div className="modal-overlay" onClick={() => setShowTitleModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{editingTitle ? '编辑称号' : '新增称号'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>称号名称 *</label><input type="text" value={titleForm.name} onChange={e => setTitleForm({ ...titleForm, name: e.target.value })} /></div>
              <div className="form-group"><label>图标（emoji）</label><input type="text" value={titleForm.icon} onChange={e => setTitleForm({ ...titleForm, icon: e.target.value })} /></div>
              <div className="form-group"><label>来源</label>
                <select value={titleForm.source} onChange={e => setTitleForm({ ...titleForm, source: e.target.value })} style={selectStyle}>
                  {TITLE_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>来源ID（可选）</label><input type="number" value={titleForm.sourceId} onChange={e => setTitleForm({ ...titleForm, sourceId: e.target.value })} /></div>
              <div className="form-group"><label>品质</label>
                <select value={titleForm.quality} onChange={e => setTitleForm({ ...titleForm, quality: e.target.value })} style={selectStyle}>
                  {QUALITIES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>排序（越小越靠前）</label><input type="number" value={titleForm.sortOrder} onChange={e => setTitleForm({ ...titleForm, sortOrder: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>描述</label><input type="text" value={titleForm.description} onChange={e => setTitleForm({ ...titleForm, description: e.target.value })} /></div>

            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <div className="section-title" style={{ marginBottom: 0, fontSize: '1rem' }}>⭐ 属性加成配置</div>
                <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={addTitleStat}>+ 添加属性</button>
              </div>
              {titleForm.stats.length === 0 && (
                <div style={{ color: '#666', fontStyle: 'italic', padding: '0.5rem' }}>暂无属性加成</div>
              )}
              {titleForm.stats.map((stat, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <select value={stat.stat} onChange={e => updateTitleStat(idx, 'stat', e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                    {STAT_FIELDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <input type="number" placeholder="数值" value={stat.value} onChange={e => updateTitleStat(idx, 'value', e.target.value)} style={{ width: '100px', padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }} />
                  <button onClick={() => removeTitleStat(idx)} style={{ padding: '0.5rem 0.8rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>删除</button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowTitleModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveTitle}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showRewardModal && (
        <div className="modal-overlay" onClick={() => setShowRewardModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{editingReward ? '编辑签到奖励' : '新增签到奖励'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>签到类型</label>
                <select value={rewardForm.dayType} onChange={e => setRewardForm({ ...rewardForm, dayType: e.target.value })} style={selectStyle}>
                  {DAY_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {rewardForm.dayType !== 'daily' && (
                <div className="form-group"><label>第几天 *</label><input type="number" value={rewardForm.dayNumber} onChange={e => setRewardForm({ ...rewardForm, dayNumber: e.target.value })} /></div>
              )}
              <div className="form-group"><label>排序</label><input type="number" value={rewardForm.sortOrder} onChange={e => setRewardForm({ ...rewardForm, sortOrder: e.target.value })} /></div>
              <div className="form-group"><label>金币奖励</label><input type="number" value={rewardForm.gold} onChange={e => setRewardForm({ ...rewardForm, gold: e.target.value })} /></div>
              <div className="form-group"><label>经验奖励</label><input type="number" value={rewardForm.exp} onChange={e => setRewardForm({ ...rewardForm, exp: e.target.value })} /></div>
            </div>

            <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(10,10,26,0.5)', borderRadius: 8, border: '1px solid rgba(126,200,227,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <div className="section-title" style={{ marginBottom: 0, fontSize: '1rem' }}>🎁 物品奖励</div>
                <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={addRewardSigItem}>+ 添加物品</button>
              </div>
              {rewardForm.items.length === 0 && (
                <div style={{ color: '#666', fontStyle: 'italic', padding: '0.5rem' }}>暂无物品奖励</div>
              )}
              {rewardForm.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <ItemSearchSelect
                    options={itemOptions}
                    value={item.itemId}
                    onChange={v => updateRewardSigItem(idx, 'itemId', v)}
                    placeholder="搜索物品名称"
                  />
                  <input type="number" placeholder="数量" value={item.quantity} onChange={e => updateRewardSigItem(idx, 'quantity', e.target.value)} style={{ width: '100px', padding: '0.5rem', background: 'rgba(10,10,26,0.8)', color: '#e0e0e0', border: '1px solid rgba(126,200,227,0.3)', borderRadius: 6 }} />
                  <button onClick={() => removeRewardSigItem(idx)} style={{ padding: '0.5rem 0.8rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>删除</button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowRewardModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveReward}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{`编辑用户：${editingUser?.username || ''}（角色：${editingUser?.charName || ''}）`}</div>
            <div style={{ padding: '0.8rem', marginBottom: '0.8rem', background: 'rgba(10,10,26,0.5)', borderRadius: 6 }}>
              <div style={{ color: '#7ec8e3', fontSize: '0.9rem', marginBottom: '0.3rem' }}>用户 ID：{editingUser?.id || ''}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>用户名：<b style={{ color: '#fff' }}>{editingUser?.username || ''}</b></span>
                <span>角色名：<b style={{ color: '#fff' }}>{editingUser?.charName || ''}</b></span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="form-group"><label>境界</label>
                <select value={userForm.realm} onChange={e => setUserForm({ ...userForm, realm: e.target.value })} style={selectStyle}>
                  {REALM_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>等级</label><input type="number" value={userForm.level} onChange={e => setUserForm({ ...userForm, level: e.target.value })} /></div>
              <div className="form-group"><label>金币</label><input type="number" value={userForm.gold} onChange={e => setUserForm({ ...userForm, gold: e.target.value })} /></div>
              <div className="form-group"><label>经验</label><input type="number" value={userForm.exp} onChange={e => setUserForm({ ...userForm, exp: e.target.value })} /></div>
              <div className="form-group"><label>攻击</label><input type="number" value={userForm.attack} onChange={e => setUserForm({ ...userForm, attack: e.target.value })} /></div>
              <div className="form-group"><label>防御</label><input type="number" value={userForm.defense} onChange={e => setUserForm({ ...userForm, defense: e.target.value })} /></div>
              <div className="form-group"><label>速度</label><input type="number" value={userForm.speed} onChange={e => setUserForm({ ...userForm, speed: e.target.value })} /></div>
              <div className="form-group"><label>最大气血</label><input type="number" value={userForm.maxHp} onChange={e => setUserForm({ ...userForm, maxHp: e.target.value })} /></div>
              <div className="form-group"><label>最大灵力</label><input type="number" value={userForm.maxMp} onChange={e => setUserForm({ ...userForm, maxMp: e.target.value })} /></div>
              <div className="form-group"><label>当前气血</label><input type="number" value={userForm.hp} onChange={e => setUserForm({ ...userForm, hp: e.target.value })} /></div>
              <div className="form-group"><label>当前灵力</label><input type="number" value={userForm.mp} onChange={e => setUserForm({ ...userForm, mp: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowUserModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveUser}>保存</button>
            </div>
          </div>
        </div>
      )}

      {resetPwdModal && (
        <div className="modal-overlay" onClick={() => setResetPwdModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-title">重置用户密码</div>
            <div style={{ color: '#e67e22', marginBottom: '0.8rem' }}>
              正在重置 <b>{resettingUser?.username || ''}</b> 的密码
            </div>
            <div className="form-group">
              <label>新密码 *</label>
              <input type="password" value={resetPwdValue} onChange={e => setResetPwdValue(e.target.value)} placeholder="请输入新密码" />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7ec8e3' }}>密码将使用 bcrypt 加密后存储</div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setResetPwdModal(false)}>取消</button>
              <button className="btn-primary" onClick={confirmResetPwd}>确认重置</button>
            </div>
          </div>
        </div>
      )}

      {showAfkModal && (
        <div className="modal-overlay" onClick={() => setShowAfkModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">编辑挂机配置</div>
            <div className="form-group">
              <label>配置项</label>
              <input type="text" value={afkConfigLabel(afkConfigForm.config_key)} disabled style={{ background: 'rgba(10,10,26,0.5)', color: '#888' }} />
            </div>
            <div className="form-group">
              <label>配置键</label>
              <input type="text" value={afkConfigForm.config_key} disabled style={{ background: 'rgba(10,10,26,0.5)', color: '#888', fontFamily: 'monospace' }} />
            </div>
            <div className="form-group">
              <label>配置值 *</label>
              <input type="text" value={afkConfigForm.config_value} onChange={e => setAfkConfigForm({ ...afkConfigForm, config_value: e.target.value })} placeholder="请输入配置值" />
            </div>
            <div className="form-group">
              <label>说明</label>
              <input type="text" value={afkConfigForm.description} onChange={e => setAfkConfigForm({ ...afkConfigForm, description: e.target.value })} placeholder="配置说明" />
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowAfkModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveAfkConfig}>保存</button>
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
