import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../authContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>修仙录</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>道号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入道号"
              required
            />
          </div>
          <div className="form-group">
            <label>口令</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入口令"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登入中...' : '入仙门'}
          </button>
        </form>
        <div className="auth-link">
          尚无仙籍？<Link to="/register">拜入山门</Link>
        </div>
      </div>
    </div>
  )
}
