import { useState, useEffect } from 'react'
import { friendAPI } from '../api'

export default function Friends() {
  const [activeTab, setActiveTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState({ received: [], sent: [] })
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFriendName, setAddFriendName] = useState('')
  const [addFriendMessage, setAddFriendMessage] = useState('')
  const [selectedFriend, setSelectedFriend] = useState(null)

  const fetchData = () => {
    Promise.all([
      friendAPI.getFriends(),
      friendAPI.getRequests(),
      friendAPI.getOnlineCount()
    ]).then(([friendsData, requestsData, countData]) => {
      setFriends(friendsData.friends || [])
      setRequests(requestsData || { received: [], sent: [] })
      setOnlineCount(countData.onlineCount || 0)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      friendAPI.heartbeat().catch(() => {})
    }, 60000)
    friendAPI.heartbeat().catch(() => {})
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return
    setLoading(true)
    try {
      const data = await friendAPI.search(searchKeyword.trim())
      setSearchResults(data.results || [])
    } catch (err) {
      setMessage(err.message || '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSendRequest = async (receiverName, messageText = '') => {
    setLoading(true)
    setMessage('')
    try {
      const data = await friendAPI.sendRequest(receiverName, messageText || addFriendMessage)
      setMessage(data.message)
      setShowAddModal(false)
      setAddFriendName('')
      setAddFriendMessage('')
      fetchData()
    } catch (err) {
      setMessage(err.message || '发送好友申请失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId) => {
    setLoading(true)
    setMessage('')
    try {
      const data = await friendAPI.acceptRequest(requestId)
      setMessage(data.message)
      fetchData()
    } catch (err) {
      setMessage(err.message || '接受好友申请失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRejectRequest = async (requestId) => {
    setLoading(true)
    setMessage('')
    try {
      const data = await friendAPI.rejectRequest(requestId)
      setMessage(data.message)
      fetchData()
    } catch (err) {
      setMessage(err.message || '拒绝好友申请失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFriend = async (friendId, friendName) => {
    if (!window.confirm(`确定要删除好友 ${friendName} 吗？`)) return
    setLoading(true)
    setMessage('')
    try {
      const data = await friendAPI.deleteFriend(friendId)
      setMessage(data.message)
      fetchData()
    } catch (err) {
      setMessage(err.message || '删除好友失败')
    } finally {
      setLoading(false)
    }
  }

  const onlineFriends = friends.filter(f => f.isOnline)
  const offlineFriends = friends.filter(f => !f.isOnline)

  return (
    <div>
      <h1 className="page-title">好友系统</h1>

      {message && (
        <div className={`message-bar ${message.includes('成功') ? 'success' : message.includes('失败') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="friends-header">
          <div className="online-count">
            当前在线: <span className="highlight">{onlineCount}</span> 人
          </div>
          <button className="btn-action btn-add-friend" onClick={() => setShowAddModal(true)}>
            + 添加好友
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            好友列表 ({friends.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            好友申请 ({(requests.received || []).length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            搜索
          </button>
        </div>

        {activeTab === 'friends' && (
          <div className="friends-list">
            {onlineFriends.length > 0 && (
              <div className="friend-group">
                <div className="group-title">在线好友 ({onlineFriends.length})</div>
                {onlineFriends.map(friend => (
                  <div key={friend.id} className="friend-item clickable" onClick={() => setSelectedFriend(friend)}>
                    <div className="friend-avatar online">
                      {friend.friend_name?.charAt(0) || '?'}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">
                        {friend.friend_name}
                        <span className="status-dot online" title="在线" />
                      </div>
                      <div className="friend-details">
                        {friend.friend_realm} · Lv.{friend.friend_level}
                      </div>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFriend(friend.friend_id, friend.friend_name); }}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
            {offlineFriends.length > 0 && (
              <div className="friend-group">
                <div className="group-title">离线好友 ({offlineFriends.length})</div>
                {offlineFriends.map(friend => (
                  <div key={friend.id} className="friend-item offline clickable" onClick={() => setSelectedFriend(friend)}>
                    <div className="friend-avatar">
                      {friend.friend_name?.charAt(0) || '?'}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">
                        {friend.friend_name}
                        <span className="status-dot" title="离线" />
                      </div>
                      <div className="friend-details">
                        {friend.friend_realm} · Lv.{friend.friend_level}
                      </div>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFriend(friend.friend_id, friend.friend_name); }}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
            {friends.length === 0 && (
              <div className="empty-state">
                还没有好友，点击右上角添加好友吧~
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-list">
            {requests.received && requests.received.length > 0 && (
              <div className="request-group">
                <div className="group-title">收到的申请 ({requests.received.length})</div>
                {requests.received.map(req => (
                  <div key={req.id} className="request-item">
                    <div className="friend-avatar">
                      {req.sender_name?.charAt(0) || '?'}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">{req.sender_name}</div>
                      <div className="friend-details">
                        {req.sender_realm} · Lv.{req.sender_level}
                      </div>
                      {req.message && (
                        <div className="request-message">"{req.message}"</div>
                      )}
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn-accept"
                        onClick={() => handleAcceptRequest(req.id)}
                        disabled={loading}
                      >
                        接受
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleRejectRequest(req.id)}
                        disabled={loading}
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {requests.sent && requests.sent.length > 0 && (
              <div className="request-group">
                <div className="group-title">发送的申请 ({requests.sent.length})</div>
                {requests.sent.map(req => (
                  <div key={req.id} className="request-item sent">
                    <div className="friend-avatar">
                      {req.receiver_name?.charAt(0) || '?'}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">{req.receiver_name}</div>
                      <div className="friend-details">
                        {req.receiver_realm} · Lv.{req.receiver_level}
                      </div>
                      <div className="request-status">等待处理中...</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!requests.received || requests.received.length === 0) && 
             (!requests.sent || requests.sent.length === 0) && (
              <div className="empty-state">
                暂无好友申请
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="search-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="输入玩家名称搜索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="btn-action"
                onClick={handleSearch}
                disabled={loading || !searchKeyword.trim()}
              >
                {loading ? '搜索中...' : '搜索'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(result => (
                  <div key={result.id} className="search-result-item">
                    <div className={`friend-avatar ${result.isOnline ? 'online' : ''}`}>
                      {result.name?.charAt(0) || '?'}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">
                        {result.name}
                        <span className={`status-dot ${result.isOnline ? 'online' : ''}`} />
                      </div>
                      <div className="friend-details">
                        {result.realm} · Lv.{result.level}
                      </div>
                    </div>
                    {result.isFriend ? (
                      <span className="badge">已是好友</span>
                    ) : (
                      <button
                        className="btn-add"
                        onClick={() => handleSendRequest(result.name)}
                        disabled={loading}
                      >
                        加好友
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {searchKeyword && searchResults.length === 0 && !loading && (
              <div className="empty-state">
                未找到相关玩家
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加好友</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>玩家名称</label>
                <input
                  type="text"
                  placeholder="请输入要添加的玩家名称"
                  value={addFriendName}
                  onChange={(e) => setAddFriendName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>验证信息 (可选)</label>
                <input
                  type="text"
                  placeholder="请输入验证信息"
                  value={addFriendMessage}
                  onChange={(e) => setAddFriendMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button
                className="btn-action"
                onClick={() => handleSendRequest(addFriendName)}
                disabled={loading || !addFriendName.trim()}
              >
                {loading ? '发送中...' : '发送申请'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedFriend && (
        <div className="modal-overlay" onClick={() => setSelectedFriend(null)}>
          <div className="modal-content friend-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>好友详情</h3>
              <button className="modal-close" onClick={() => setSelectedFriend(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="friend-detail-header">
                <div className={`friend-avatar large ${selectedFriend.isOnline ? 'online' : ''}`}>
                  {selectedFriend.friend_name?.charAt(0) || '?'}
                </div>
                <div className="friend-detail-info">
                  <div className="friend-detail-name">
                    {selectedFriend.friend_name}
                    <span className={`status-dot ${selectedFriend.isOnline ? 'online' : ''}`} />
                  </div>
                  <div className="friend-detail-status">
                    {selectedFriend.isOnline ? '当前在线' : '当前离线'}
                  </div>
                </div>
              </div>

              <div className="friend-detail-stats">
                <div className="stat-item">
                  <div className="stat-label">境界</div>
                  <div className="stat-value">{selectedFriend.friend_realm}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">等级</div>
                  <div className="stat-value">Lv.{selectedFriend.friend_level}</div>
                </div>
              </div>

              <div className="friend-detail-info-section">
                <div className="info-row">
                  <span className="info-label">好友关系</span>
                  <span className="info-value">
                    {selectedFriend.created_at ? `成为好友于 ${new Date(selectedFriend.created_at).toLocaleDateString()}` : '暂无数据'}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedFriend(null)}>
                关闭
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  handleDeleteFriend(selectedFriend.friend_id, selectedFriend.friend_name);
                  setSelectedFriend(null);
                }}
              >
                删除好友
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
