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
    throw new Error(data.message || '请求失败')
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
