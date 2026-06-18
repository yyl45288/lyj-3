import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      authAPI.getMe()
        .then((data) => {
          setUser(data.user || data)
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const data = await authAPI.login(username, password)
    const newToken = data.token
    localStorage.setItem('token', newToken)
    setToken(newToken)
    const meData = await authAPI.getMe()
    setUser(meData.user || meData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
