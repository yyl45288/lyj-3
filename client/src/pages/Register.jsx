import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../api'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authAPI.register(username, password)
      navigate('/login')
    } catch (err) {
      setError(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>拜入山门</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>道号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请取一个道号"
              required
            />
          </div>
          <div className="form-group">
            <label>口令</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请设定口令"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '注册中...' : '拜入山门'}
          </button>
        </form>
        <div className="auth-link">
          已有仙籍？<Link to="/login">返回登录</Link>
        </div>
      </div>
    </div>
  )
}
