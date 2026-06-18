import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { characterAPI } from '../api'

export default function CreateCharacter() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await characterAPI.createCharacter(name)
      navigate('/')
    } catch (err) {
      setError(err.message || '创建角色失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-character-area">
      <div className="create-character-card">
        <h2>开创仙途</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>角色名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请为你的修仙之路取名"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '创建中...' : '踏入仙途'}
          </button>
        </form>
      </div>
    </div>
  )
}
