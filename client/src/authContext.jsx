import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      authAPI.getMe()
        .then((data) => {
          const userData = data.user || data
          setUser(userData)
          const adminFlag = !!userData.isAdmin
          setIsAdmin(adminFlag)
          localStorage.setItem('isAdmin', adminFlag ? 'true' : 'false')
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('isAdmin')
          setToken(null)
          setIsAdmin(false)
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
    const userData = data.user || {}
    const adminFlag = !!userData.isAdmin
    localStorage.setItem('token', newToken)
    localStorage.setItem('isAdmin', adminFlag ? 'true' : 'false')
    setToken(newToken)
    setIsAdmin(adminFlag)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('isAdmin')
    setToken(null)
    setIsAdmin(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, login, logout, loading }}>
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
