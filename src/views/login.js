import React, { useEffect, useState } from 'react'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // ensure default local users exist for demo/local auth
    try {
      const KEY = 'demo_users'
      if (!localStorage.getItem(KEY)) {
        const defaults = [
          { id: '1', username: 'admin', password: 'password', role: 'admin', email: 'admin@example.com', active: true },
          { id: '2', username: 'user', password: 'password', role: 'user', email: 'user@example.com', active: true },
        ]
        localStorage.setItem(KEY, JSON.stringify(defaults))
      }
    } catch (err) {
      // ignore
    }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      })
      let j = null
      try { j = await r.json() } catch (err) { j = null }
      if (r.ok) {
        /*
        if (j && j.token) {
          localStorage.setItem('token', j.token)
        }
        */
        const userRole = (j && (j.role || (j.user && j.user.role))) || role || 'user'
        try { localStorage.setItem('demo_session', JSON.stringify({ username, role: userRole })) } catch (e) {}
        if (userRole === 'admin') window.location.href = '/admin'
        else window.location.href = '/'
        return
      }
      // server returned error — try localStorage fallback
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]')
      const match = users.find((u) => u.username === username && u.password === password)
      if (match) {
        if (!match.active) {
          setError('Account not approved yet')
          setLoading(false)
          return
        }
        const userRole = match.role || 'user'
        try { localStorage.setItem('demo_session', JSON.stringify({ username, role: userRole })) } catch (e) {}
        if (userRole === 'admin') window.location.href = '/admin'
        else window.location.href = '/'
        return
      }
      setError(j && j.error ? j.error : 'Login failed')
      setLoading(false)
    } catch (err) {
      // network error — try localStorage fallback
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]')
      const match = users.find((u) => u.username === username && u.password === password)
      if (match) {
        if (!match.active) {
          setError('Account not approved yet')
          setLoading(false)
          return
        }
        const userRole = match.role || 'user'
        try { localStorage.setItem('demo_session', JSON.stringify({ username, role: userRole })) } catch (e) {}
        if (userRole === 'admin') window.location.href = '/admin'
        else window.location.href = '/'
        return
      }
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <div className="file-manager-container1" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section className="preview-dashboard" style={{ width: '100%', maxWidth: 920 }}>
        <div className="preview-dashboard__container">
          <div className="preview-dashboard__main">
            <div className="preview-dashboard__viewer">
              <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', padding: 24 }}>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Sign in</h2>
                <p style={{ marginTop: 0, marginBottom: 18, color: 'var(--color-on-surface-secondary)' }}>Sign in to access your files</p>
                <form onSubmit={submit}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} className="thq-input" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="thq-input" />
                  </div>
                  {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="thq-button-filled" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
                    <button type="button" className="thq-button-outline" onClick={() => { setUsername('admin'); setPassword('password'); setRole('admin') }}>Demo</button>
                    <button type="button" className="thq-button-outline" onClick={() => { window.location.href = '/signup' }}>Create account</button>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Sign in as</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="thq-input">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Login
