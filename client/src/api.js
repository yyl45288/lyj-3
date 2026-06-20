const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || '请求失败')
  }
  return data
}

export const authAPI = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  register: (username, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getMe: () => request('/auth/me')
}

export const characterAPI = {
  getCharacter: () => request('/character'),
  createCharacter: (name) =>
    request('/character', {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
  cultivate: () =>
    request('/character/cultivate', { method: 'POST' }),
  breakthrough: () =>
    request('/character/breakthrough', { method: 'POST' })
}

export const equipmentAPI = {
  getEquipment: () => request('/equipment'),
  equipItem: (itemId) =>
    request('/equipment/equip', {
      method: 'POST',
      body: JSON.stringify({ itemId })
    }),
  unequip: (slot) =>
    request('/equipment/unequip', {
      method: 'POST',
      body: JSON.stringify({ slot })
    }),
  getInventory: () => request('/equipment/inventory'),
  useItem: (itemId) =>
    request('/equipment/use', {
      method: 'POST',
      body: JSON.stringify({ itemId })
    })
}

export const questAPI = {
  getAvailable: () => request('/quests/available'),
  getActive: () => request('/quests/active'),
  acceptQuest: (questId) =>
    request('/quests/accept', {
      method: 'POST',
      body: JSON.stringify({ questId })
    }),
  completeQuest: (questId) =>
    request('/quests/complete', {
      method: 'POST',
      body: JSON.stringify({ questId })
    })
}

export const mapAPI = {
  getMaps: () => request('/maps'),
  explore: (mapId) =>
    request(`/maps/explore/${mapId}`, {
      method: 'POST'
    })
}

export const battleAPI = {
  getBattle: () => request('/battle'),
  attack: () =>
    request('/battle/attack', {
      method: 'POST'
    }),
  useSkill: (skillId) =>
    request(`/battle/skill/${skillId}`, {
      method: 'POST'
    }),
  capture: (captureItemId) =>
    request('/battle/capture', {
      method: 'POST',
      body: JSON.stringify({ captureItemId })
    }),
  flee: () =>
    request('/battle/flee', {
      method: 'POST'
    })
}

export const titleAPI = {
  getTitles: () => request('/titles'),
  equipTitle: (titleId) =>
    request(`/titles/equip/${titleId}`, {
      method: 'POST'
    }),
  unequipTitle: () =>
    request('/titles/unequip', {
      method: 'POST'
    })
}

export const skillAPI = {
  getSkills: () => request('/skills'),
  learnSkill: (skillId) =>
    request(`/skills/learn/${skillId}`, {
      method: 'POST'
    }),
  upgradeSkill: (skillId) =>
    request(`/skills/upgrade/${skillId}`, {
      method: 'POST'
    })
}

export const dungeonAPI = {
  getDungeons: () => request('/dungeons'),
  challenge: (dungeonId) =>
    request(`/dungeons/challenge/${dungeonId}`, {
      method: 'POST'
    }),
  getBattle: () => request('/dungeons/battle'),
  attack: () =>
    request('/dungeons/attack', {
      method: 'POST'
    }),
  flee: () =>
    request('/dungeons/flee', {
      method: 'POST'
    })
}

export const petAPI = {
  getPets: () => request('/pets'),
  activate: (petId) =>
    request(`/pets/activate/${petId}`, {
      method: 'POST'
    }),
  rest: (petId) =>
    request(`/pets/rest/${petId}`, {
      method: 'POST'
    }),
  heal: (petId, itemId) =>
    request(`/pets/heal/${petId}`, {
      method: 'POST',
      body: itemId ? JSON.stringify({ itemId }) : '{}'
    }),
  release: (petId) =>
    request(`/pets/release/${petId}`, {
      method: 'POST'
    })
}

export const tribulationAPI = {
  getInfo: () => request('/character/tribulation/info'),
  undergo: (itemId) =>
    request('/character/tribulation', {
      method: 'POST',
      body: itemId ? JSON.stringify({ itemId }) : '{}'
    })
}

export const achievementAPI = {
  getAchievements: () => request('/achievements'),
  claimReward: (achievementId) =>
    request(`/achievements/claim/${achievementId}`, {
      method: 'POST'
    })
}

export const signInAPI = {
  getInfo: () => request('/sign-in/info'),
  signIn: () =>
    request('/sign-in/sign', {
      method: 'POST'
    }),
  makeup: (date) =>
    request('/sign-in/makeup', {
      method: 'POST',
      body: JSON.stringify({ date })
    })
}

export const marketAPI = {
  getListings: (params) => {
    const query = new URLSearchParams(params || {}).toString()
    return request(`/market/list?${query}`)
  },
  getMyListings: () => request('/market/my-listings'),
  createListing: (itemId, quantity, price) =>
    request('/market/list', {
      method: 'POST',
      body: JSON.stringify({ itemId, quantity, price })
    }),
  cancelListing: (listingId) =>
    request(`/market/cancel/${listingId}`, {
      method: 'POST'
    }),
  buyListing: (listingId) =>
    request(`/market/buy/${listingId}`, {
      method: 'POST'
    }),
  getRecords: (params) => {
    const query = new URLSearchParams(params || {}).toString()
    return request(`/market/records?${query}`)
  }
}

export const adventureAPI = {
  getActive: () => request('/adventures/active'),
  makeChoice: (choiceIndex) =>
    request(`/adventures/choose/${choiceIndex}`, {
      method: 'POST'
    }),
  getLogs: (params) => {
    const query = new URLSearchParams(params || {}).toString()
    return request(`/adventures/logs?${query}`)
  }
}

export const afkAPI = {
  getStatus: () => request('/afk/status'),
  startAfk: () =>
    request('/afk/start', { method: 'POST' }),
  stopAfk: () =>
    request('/afk/stop', { method: 'POST' }),
  collectRewards: () =>
    request('/afk/collect', { method: 'POST' })
}

export const friendAPI = {
  getFriends: () => request('/friends/list'),
  getRequests: () => request('/friends/requests'),
  sendRequest: (receiverName, message) =>
    request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ receiverName, message })
    }),
  acceptRequest: (requestId) =>
    request(`/friends/accept/${requestId}`, { method: 'POST' }),
  rejectRequest: (requestId) =>
    request(`/friends/reject/${requestId}`, { method: 'POST' }),
  deleteFriend: (friendId) =>
    request(`/friends/${friendId}`, { method: 'DELETE' }),
  heartbeat: () =>
    request('/friends/heartbeat', { method: 'POST' }),
  search: (keyword) =>
    request(`/friends/search?keyword=${encodeURIComponent(keyword)}`),
  getOnlineCount: () => request('/friends/online-count')
}

export const adminAPI = {
  login: (username, password) =>
    request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getMe: () => request('/admin/me'),
  getStats: () => request('/admin/stats'),
  getAfkConfig: () => request('/admin/afk-config'),
  updateAfkConfig: (key, configValue, description) =>
    request(`/admin/afk-config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ configValue, description })
    }),
  getItems: (params) => {
    const query = new URLSearchParams(params).toString()
    return request(`/admin/items?${query}`)
  },
  createItem: (data) =>
    request('/admin/items', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateItem: (id, data) =>
    request(`/admin/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteItem: (id) =>
    request(`/admin/items/${id}`, {
      method: 'DELETE'
    }),
  getAchievements: () => request('/admin/achievements'),
  createAchievement: (data) =>
    request('/admin/achievements', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAchievement: (id, data) =>
    request(`/admin/achievements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteAchievement: (id) =>
    request(`/admin/achievements/${id}`, {
      method: 'DELETE'
    }),
  getSignInRewards: () => request('/admin/sign-in-rewards'),
  createSignInReward: (data) =>
    request('/admin/sign-in-rewards', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateSignInReward: (id, data) =>
    request(`/admin/sign-in-rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteSignInReward: (id) =>
    request(`/admin/sign-in-rewards/${id}`, {
      method: 'DELETE'
    }),
  getUsers: (params) => {
    const query = new URLSearchParams(params).toString()
    return request(`/admin/users?${query}`)
  },
  getUser: (id) => request(`/admin/users/${id}`),
  updateUser: (id, data) =>
    request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteUser: (id) =>
    request(`/admin/users/${id}`, { method: 'DELETE' }),
  resetUserPassword: (id, newPassword) =>
    request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    }),
  getSkills: () => request('/admin/skills'),
  createSkill: (data) =>
    request('/admin/skills', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateSkill: (id, data) =>
    request(`/admin/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteSkill: (id) =>
    request(`/admin/skills/${id}`, {
      method: 'DELETE'
    }),
  getDungeons: () => request('/admin/dungeons'),
  createDungeon: (data) =>
    request('/admin/dungeons', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateDungeon: (id, data) =>
    request(`/admin/dungeons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteDungeon: (id) =>
    request(`/admin/dungeons/${id}`, {
      method: 'DELETE'
    }),
  getTitles: () => request('/admin/titles'),
  createTitle: (data) =>
    request('/admin/titles', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateTitle: (id, data) =>
    request(`/admin/titles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteTitle: (id) =>
    request(`/admin/titles/${id}`, {
      method: 'DELETE'
    })
}
