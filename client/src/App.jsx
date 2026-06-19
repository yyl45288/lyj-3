import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './authContext'
import { characterAPI } from './api'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import CreateCharacter from './pages/CreateCharacter'
import GameHome from './pages/GameHome'
import Character from './pages/Character'
import Cultivate from './pages/Cultivate'
import Equipment from './pages/Equipment'
import Inventory from './pages/Inventory'
import Quest from './pages/Quest'
import Map from './pages/Map'
import Battle from './pages/Battle'
import Pet from './pages/Pet'
import Achievement from './pages/Achievement'
import SignIn from './pages/SignIn'

function AuthGuard({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="loading-screen">加载中...</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function CharacterGuard({ children }) {
  const [character, setCharacter] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    characterAPI.getCharacter()
      .then((data) => {
        setCharacter(data.character || data)
        setLoading(false)
      })
      .catch(() => {
        setCharacter(null)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="loading-screen">加载中...</div>
  }
  if (!character) {
    return <Navigate to="/create-character" replace />
  }
  return children
}

function GameLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="game-layout">
      <nav className="game-nav">
        <div className="nav-brand">修仙录</div>
        <div className="nav-links">
          <NavLink to="/" end>首页</NavLink>
          <NavLink to="/sign-in">签到</NavLink>
          <NavLink to="/achievements">成就</NavLink>
          <NavLink to="/character">角色</NavLink>
          <NavLink to="/cultivate">修炼</NavLink>
          <NavLink to="/maps">探索</NavLink>
          <NavLink to="/pets">宠物</NavLink>
          <NavLink to="/equipment">装备</NavLink>
          <NavLink to="/inventory">背包</NavLink>
          <NavLink to="/quests">任务</NavLink>
        </div>
        <div className="nav-user">
          <span>{user?.username}</span>
          <button className="btn-logout" onClick={logout}>退出</button>
        </div>
      </nav>
      <main className="game-main">
        <Outlet />
      </main>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">加载中...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/register" element={
        user ? <Navigate to="/" replace /> : <Register />
      } />
      <Route path="/create-character" element={
        <AuthGuard><CreateCharacter /></AuthGuard>
      } />
      <Route element={
        <AuthGuard><CharacterGuard><GameLayout /></CharacterGuard></AuthGuard>
      }>
        <Route path="/" element={<GameHome />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/achievements" element={<Achievement />} />
        <Route path="/character" element={<Character />} />
        <Route path="/cultivate" element={<Cultivate />} />
        <Route path="/maps" element={<Map />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/pets" element={<Pet />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/quests" element={<Quest />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
