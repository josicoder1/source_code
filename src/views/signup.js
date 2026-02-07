import React, { useState } from 'react'
import Helmet from 'react-helmet'
// Footer intentionally omitted for signup page

const Signup = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      if (res.ok) {
        // ensure user stored locally for demo/admin approval flow
        try {
          const KEY = 'demo_users'
          const list = JSON.parse(localStorage.getItem(KEY) || '[]')
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
          list.push({ id, username, password, email, role: 'user', active: false })
          localStorage.setItem(KEY, JSON.stringify(list))
        } catch (e) {
          // ignore localStorage errors
        }
        // created, redirect to login
        window.location.href = '/login'
        return
      }
      const j = await res.json()
      setError(j && j.error ? j.error : 'Signup failed')
    } catch (err) {
      // fallback demo behavior: pretend success and redirect
      console.warn('Signup endpoint not available, falling back to demo')
      try {
        const KEY = 'demo_users'
        const list = JSON.parse(localStorage.getItem(KEY) || '[]')
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
        list.push({ id, username, password, email, role: 'user', active: false })
        localStorage.setItem(KEY, JSON.stringify(list))
      } catch (e) {}
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="file-manager-container1" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Helmet>
        <title>Sign up - Brilliant Questionable Gnat</title>
      </Helmet>
      <section className="preview-dashboard" style={{ width: '100%', maxWidth: 920 }}>
        <div className="preview-dashboard__container">
          <div className="preview-dashboard__main">
            <div className="preview-dashboard__viewer">
              <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', padding: 24 }}>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Create account</h2>
                <p style={{ marginTop: 0, marginBottom: 18, color: 'var(--color-on-surface-secondary)' }}>Register a new user account. Choose role `admin` to create an administrator.</p>
                <form onSubmit={submit}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} className="thq-input" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="thq-input" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="thq-input" />
                  </div>
                  {/* Role selection moved to sign-in page */}
                  {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="thq-button-filled" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
                    <button type="button" className="thq-button-outline" onClick={() => (window.location.href = '/login')}>Back to sign in</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer removed for a minimal signup experience */}
    </div>
  )
}

export default Signup
