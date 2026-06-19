import { useState, useEffect, useCallback } from 'react'
import { marketAPI, equipmentAPI, characterAPI } from '../api'

const QUALITY_NAMES = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
}

const QUALITY_COLORS = {
  common: '#ffffff',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000'
}

const ITEM_TYPE_NAMES = {
  consumable: '消耗品',
  material: '材料',
  equipment: '装备',
  currency: '货币',
  weapon: '武器',
  helmet: '头盔',
  armor: '衣服',
  boots: '鞋子',
  accessory: '饰品',
  pill: '丹药',
  capture: '捕兽网',
  tribulation: '渡劫丹'
}

const getItemTypeName = (item) => {
  if (!item) return ''
  const subType = item.subType || item.itemSubType
  const type = item.type || item.itemType
  if (subType && ITEM_TYPE_NAMES[subType]) return ITEM_TYPE_NAMES[subType]
  if (type && ITEM_TYPE_NAMES[type]) return ITEM_TYPE_NAMES[type]
  return subType || type || ''
}

export default function Market() {
  const [activeTab, setActiveTab] = useState('listings')
  const [listings, setListings] = useState([])
  const [myListings, setMyListings] = useState([])
  const [records, setRecords] = useState([])
  const [inventory, setInventory] = useState([])
  const [character, setCharacter] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedListing, setSelectedListing] = useState(null)
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [filters, setFilters] = useState({
    itemType: '',
    quality: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  })
  const [recordsFilter, setRecordsFilter] = useState('all')
  const [recordsPage, setRecordsPage] = useState(1)
  const [totalListings, setTotalListings] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)

  const loadCharacter = useCallback(async () => {
    try {
      const data = await characterAPI.getCharacter()
      setCharacter(data.character)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const loadListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.itemType) params.itemType = filters.itemType
      if (filters.quality) params.quality = filters.quality
      params.sortBy = filters.sortBy
      params.sortOrder = filters.sortOrder
      params.page = filters.page
      params.pageSize = filters.pageSize

      const data = await marketAPI.getListings(params)
      setListings(data.listings || [])
      setTotalListings(data.total || 0)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadMyListings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await marketAPI.getMyListings()
      setMyListings(data.listings || [])
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInventory = useCallback(async () => {
    try {
      const data = await equipmentAPI.getInventory()
      setInventory(data.inventory?.filter(i => !i.equipped) || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const data = await marketAPI.getRecords({
        type: recordsFilter,
        page: recordsPage,
        pageSize: 20
      })
      setRecords(data.records || [])
      setTotalRecords(data.total || 0)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }, [recordsFilter, recordsPage])

  useEffect(() => {
    loadCharacter()
    if (activeTab === 'listings') {
      loadListings()
    } else if (activeTab === 'my-listings') {
      loadMyListings()
    } else if (activeTab === 'sell') {
      loadInventory()
    } else if (activeTab === 'records') {
      loadRecords()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'listings') {
      loadListings()
    }
  }, [filters, loadListings, activeTab])

  useEffect(() => {
    if (activeTab === 'records') {
      loadRecords()
    }
  }, [recordsFilter, recordsPage, loadRecords, activeTab])

  useEffect(() => {
    if (selectedItem) {
      setSellQuantity(1)
      setSellPrice(Math.floor(selectedItem.price * 1.5))
    }
  }, [selectedItem])

  const handleBuy = async (listing) => {
    if (!window.confirm(`确定要花费${listing.price}金币购买${listing.itemName}×${listing.quantity}吗？`)) {
      return
    }
    try {
      const data = await marketAPI.buyListing(listing.id)
      setMessage(data.message)
      setCharacter(data.character)
      loadListings()
      setSelectedListing(null)
    } catch (err) {
      setMessage(err.message)
    }
  }

  const handleCancel = async (listingId) => {
    if (!window.confirm('确定要取消此挂单吗？物品将返还背包。')) {
      return
    }
    try {
      const data = await marketAPI.cancelListing(listingId)
      setMessage(data.message)
      loadMyListings()
      loadInventory()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const handleSell = async () => {
    if (!selectedItem) {
      setMessage('请选择要出售的物品')
      return
    }
    if (sellQuantity <= 0 || sellQuantity > selectedItem.quantity) {
      setMessage('数量无效')
      return
    }
    if (sellPrice <= 0) {
      setMessage('价格必须大于0')
      return
    }
    try {
      const data = await marketAPI.createListing(selectedItem.id, sellQuantity, sellPrice)
      setMessage(data.message)
      setCharacter(data.character)
      setSelectedItem(null)
      loadInventory()
      loadMyListings()
      setActiveTab('my-listings')
    } catch (err) {
      setMessage(err.message)
    }
  }

  const qualityClass = (quality) => {
    return `quality-${quality || 'common'}`
  }

  const renderListings = () => (
    <div className="market-listings">
      <div className="filter-bar">
        <select
          value={filters.itemType}
          onChange={(e) => setFilters({ ...filters, itemType: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">全部类型</option>
          {Object.entries(ITEM_TYPE_NAMES).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
        <select
          value={filters.quality}
          onChange={(e) => setFilters({ ...filters, quality: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">全部品质</option>
          {Object.entries(QUALITY_NAMES).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="created_at">按时间</option>
          <option value="price">按总价</option>
          <option value="quantity">按数量</option>
        </select>
        <select
          value={filters.sortOrder}
          onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
        <span className="listings-count">共 {totalListings} 条</span>
      </div>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : listings.length === 0 ? (
        <div className="empty-state">暂无挂单</div>
      ) : (
        <>
          <div className="inventory-grid">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className={`inventory-item ${qualityClass(listing.itemQuality)}`}
                onClick={() => setSelectedListing(listing)}
              >
                <div className="item-icon">{listing.itemName?.charAt(0)}</div>
                <div className="item-quantity">{listing.quantity}</div>
                <div className="item-name">{listing.itemName}</div>
                <div className="item-price">{listing.price}金</div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              className="btn-small"
              onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
              disabled={filters.page <= 1}
            >
              上一页
            </button>
            <span>第 {filters.page} / {Math.ceil(totalListings / filters.pageSize) || 1} 页</span>
            <button
              className="btn-small"
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page * filters.pageSize >= totalListings}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )

  const renderMyListings = () => (
    <div className="my-listings">
      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : myListings.length === 0 ? (
        <div className="empty-state">暂无挂单，去"出售物品"上架吧</div>
      ) : (
        <div className="quest-list">
          {myListings.map((listing) => (
            <div key={listing.id} className={`quest-item ${qualityClass(listing.itemQuality)}`}>
              <div className="quest-info">
                <div className="quest-title">{listing.itemName}×{listing.quantity}</div>
                <div className="quest-desc">
                  总价：{listing.price}金（单价：{listing.pricePerUnit}金）
                </div>
                <div className="quest-rewards">
                  状态：{listing.status === 'active' ? '出售中' : listing.status === 'sold' ? '已售出' : '已取消'}
                  {listing.status === 'sold' && listing.soldAt && ` · ${listing.soldAt}`}
                </div>
                <div className="quest-rewards">上架时间：{listing.createdAt}</div>
              </div>
              <div className="quest-actions">
                {listing.status === 'active' && (
                  <button className="btn-action btn-danger" onClick={() => handleCancel(listing.id)}>
                    取消挂单
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSell = () => (
    <div className="sell-page">
      <div className="sell-inventory">
        <h3>选择物品</h3>
        {inventory.length === 0 ? (
          <div className="empty-state">背包中没有可出售的物品</div>
        ) : (
          <div className="inventory-grid">
            {inventory.map((item) => (
              <div
                key={item.id}
                className={`inventory-item ${qualityClass(item.quality)} ${selectedItem?.id === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="item-icon">{item.name?.charAt(0)}</div>
                <div className="item-quantity">{item.quantity}</div>
                <div className="item-name">{item.name}</div>
                <div className="item-price">参考价{item.price}金</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="sell-form">
          <h3>出售信息</h3>
          <div className="item-detail-card">
            <div className={`item-detail-name ${qualityClass(selectedItem.quality)}`}>
              {selectedItem.name}
            </div>
            <div className="item-detail-info">
              <p>类型：{getItemTypeName(selectedItem)}</p>
              <p>品质：{QUALITY_NAMES[selectedItem.quality] || selectedItem.quality || '普通'}</p>
              <p>可售数量：{selectedItem.quantity}</p>
              <p>参考单价：{selectedItem.price}金</p>
            </div>

            <div className="form-group">
              <label>出售数量：</label>
              <input
                type="number"
                min="1"
                max={selectedItem.quantity}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(Math.max(1, Math.min(selectedItem.quantity, parseInt(e.target.value) || 1)))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>总价格（金币）：</label>
              <input
                type="number"
                min="1"
                value={sellPrice}
                onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 0))}
                className="form-input"
              />
              <div className="form-hint">单价：{Math.floor(sellPrice / sellQuantity) || 0}金</div>
            </div>

            <div className="form-group">
              <label>手续费（5%）：</label>
              <span>{Math.floor(sellPrice * 0.05)}金</span>
            </div>

            <button className="btn-action" onClick={handleSell}>
              确认挂单
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const renderRecords = () => (
    <div className="trade-records">
      <div className="filter-bar">
        <div className="record-tabs">
          <button
            className={`tab-btn ${recordsFilter === 'all' ? 'active' : ''}`}
            onClick={() => { setRecordsFilter('all'); setRecordsPage(1) }}
          >
            全部
          </button>
          <button
            className={`tab-btn ${recordsFilter === 'buy' ? 'active' : ''}`}
            onClick={() => { setRecordsFilter('buy'); setRecordsPage(1) }}
          >
            购买记录
          </button>
          <button
            className={`tab-btn ${recordsFilter === 'sell' ? 'active' : ''}`}
            onClick={() => { setRecordsFilter('sell'); setRecordsPage(1) }}
          >
            出售记录
          </button>
        </div>
        <span className="listings-count">共 {totalRecords} 条</span>
      </div>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">暂无交易记录</div>
      ) : (
        <>
          <div className="quest-list">
            {records.map((record) => (
              <div key={record.id} className={`quest-item ${qualityClass(record.itemQuality)}`}>
                <div className="quest-info">
                  <div className="quest-title">
                    {record.isBuy ? '购买' : '出售'}：{record.itemName}×{record.quantity}
                  </div>
                  <div className="quest-desc">
                    {record.isBuy ? `卖家：${record.sellerName}` : `买家：${record.buyerName}`}
                  </div>
                  <div className="quest-rewards">
                    总价：{record.totalPrice}金（单价：{record.pricePerUnit}金）
                  </div>
                  <div className="quest-rewards">时间：{record.createdAt}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              className="btn-small"
              onClick={() => setRecordsPage(Math.max(1, recordsPage - 1))}
              disabled={recordsPage <= 1}
            >
              上一页
            </button>
            <span>第 {recordsPage} / {Math.ceil(totalRecords / 20) || 1} 页</span>
            <button
              className="btn-small"
              onClick={() => setRecordsPage(recordsPage + 1)}
              disabled={recordsPage * 20 >= totalRecords}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )

  const renderListingDetail = () => {
    if (!selectedListing) return null

    return (
      <div className="item-detail-panel">
        <div className="item-detail">
          <button className="btn-small close-btn" onClick={() => setSelectedListing(null)}>
            关闭
          </button>
          <h3 className={qualityClass(selectedListing.itemQuality)}>
            {selectedListing.itemName}
          </h3>
          <div className="item-detail-info">
            <p>类型：{getItemTypeName(selectedListing)}</p>
            <p>品质：{QUALITY_NAMES[selectedListing.itemQuality] || selectedListing.itemQuality || '普通'}</p>
            <p>数量：{selectedListing.quantity}</p>
            <p>卖家：{selectedListing.sellerName}</p>
            <p>总价：{selectedListing.price}金</p>
            <p>单价：{selectedListing.pricePerUnit}金</p>
            <p>上架时间：{selectedListing.createdAt}</p>
          </div>
          {selectedListing.itemDescription && (
            <div className="item-detail-desc">
              <p>{selectedListing.itemDescription}</p>
            </div>
          )}
          {!selectedListing.isOwn && (
            <button
              className="btn-action"
              onClick={() => handleBuy(selectedListing)}
              disabled={character && character.gold < selectedListing.price}
            >
              购买（{selectedListing.price}金）
            </button>
          )}
          {selectedListing.isOwn && (
            <div className="form-hint">这是你自己的挂单</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2>交易行</h2>
      {character && (
        <div className="character-stats">
          <span>金币：<span className="gold">{character.gold}</span></span>
        </div>
      )}

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('listings')}
        >
          交易大厅
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-listings')}
        >
          我的挂单
        </button>
        <button
          className={`tab-btn ${activeTab === 'sell' ? 'active' : ''}`}
          onClick={() => setActiveTab('sell')}
        >
          出售物品
        </button>
        <button
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          交易记录
        </button>
      </div>

      {message && (
        <div className="message">{message}</div>
      )}

      <div className="page-content">
        {activeTab === 'listings' && renderListings()}
        {activeTab === 'my-listings' && renderMyListings()}
        {activeTab === 'sell' && renderSell()}
        {activeTab === 'records' && renderRecords()}
      </div>

      {selectedListing && renderListingDetail()}
    </div>
  )
}
