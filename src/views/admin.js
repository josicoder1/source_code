import React, { useEffect, useState, useRef } from 'react'
import Helmet from 'react-helmet'
import Footer from '../components/footer'

const Admin = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const fetchUsersRef = useRef(null)
  const [toast, setToast] = useState(null)
  const [detailUser, setDetailUser] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  useEffect(() => {
    // prevent background scroll while modal open
    if (detailOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
    return undefined
  }, [detailOpen])

  useEffect(() => {
    // get current user from server, fallback to localStorage demo_session
    let mounted = true
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' })
        if (r.ok) {
          const j = await r.json()
          if (mounted) setCurrentUser(j.user || null)
        } else {
          // try localStorage fallback
          const s = localStorage.getItem('demo_session')
          if (s) {
            try { const parsed = JSON.parse(s); if (mounted) setCurrentUser(parsed) } catch (e) { if (mounted) setCurrentUser(null) }
          } else {
            if (mounted) setCurrentUser(null)
          }
        }
      } catch (e) {
        const s = localStorage.getItem('demo_session')
        if (s) {
          try { const parsed = JSON.parse(s); if (mounted) setCurrentUser(parsed) } catch (err) { if (mounted) setCurrentUser(null) }
        } else {
          if (mounted) setCurrentUser(null)
        }
      } finally {
        if (mounted) setAuthChecking(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    // after auth resolved, load users — prefer admin-protected list, fall back to public demo list
    if (authChecking) return

    const load = async () => {
      setLoading(true)
      try {
        let res = await fetch('/api/admin/users', { credentials: 'include' })
        if (res.status === 403) {
          // not authorized to see protected list — try public endpoint
          res = await fetch('/api/admin/users/public', { credentials: 'include' })
        }
        if (res.ok) {
          const data = await res.json()
          let serverUsers = data.users || []
          // merge local demo_users
          try {
            const local = JSON.parse(localStorage.getItem('demo_users') || '[]')
            const mapped = local.map((u) => ({ id: u.id, username: u.username, email: u.email || null, role: u.role || 'user', active: !!u.active }))
            // merge serverUsers + mapped local users (avoid duplicates by username)
            const seen = new Set(serverUsers.map((s) => s.username))
            const combined = serverUsers.concat(mapped.filter((m) => !seen.has(m.username)))
            setUsers(combined)
          } catch (e) {
            setUsers(serverUsers)
          }
        } else {
          // fallback demo list
          // include any local demo_users as fallback
          try {
            const local = JSON.parse(localStorage.getItem('demo_users') || '[]')
            const mapped = local.map((u) => ({ id: u.id, username: u.username, email: u.email || null, role: u.role || 'user', active: !!u.active }))
            setUsers(mapped.length ? mapped : [
              { id: '1', username: 'admin', email: 'admin@example.com', role: 'admin', active: true },
              { id: '2', username: 'alice', email: 'alice@example.com', role: 'user', active: true },
              { id: '3', username: 'bob', email: 'bob@example.com', role: 'user', active: false },
            ])
          } catch (e) {
            setUsers([
              { id: '1', username: 'admin', email: 'admin@example.com', role: 'admin', active: true },
              { id: '2', username: 'alice', email: 'alice@example.com', role: 'user', active: true },
              { id: '3', username: 'bob', email: 'bob@example.com', role: 'user', active: false },
            ])
          }
        }
      } catch (err) {
        setUsers([
          { id: '1', username: 'admin', email: 'admin@example.com', role: 'admin', active: true },
          { id: '2', username: 'alice', email: 'alice@example.com', role: 'user', active: true },
        ])
      } finally {
        setLoading(false)
      }
    }

    // expose fetch function for reuse after actions
    fetchUsersRef.current = load
    load()
  }, [authChecking, currentUser])

  // enable/disable toggle removed — admins may Approve or Delete users only

  const approveUser = async (u) => {
    if (!(currentUser && currentUser.role === 'admin')) return
    try {
      await fetch(`/api/admin/users/${encodeURIComponent(u.id)}/approve`, { method: 'POST', credentials: 'include' })
      // refresh list
      // update localStorage demo_users if present
      try {
        const KEY = 'demo_users'
        const list = JSON.parse(localStorage.getItem(KEY) || '[]')
        const idx = list.findIndex((x) => x.id === u.id || x.username === u.username)
        if (idx !== -1) { list[idx].active = true; localStorage.setItem(KEY, JSON.stringify(list)) }
      } catch (e) {}
      setToast(`${u.username} approved`)
      setTimeout(() => setToast(null), 3000)
      fetchUsersRef.current && fetchUsersRef.current()
    } catch (err) {
      console.error('approve failed', err)
    }
  }

  const removeUser = async (u) => {
    if (!window.confirm(`Delete user ${u.username}? This cannot be undone.`)) return
    if (!(currentUser && currentUser.role === 'admin')) return
    setUsers((prev) => prev.filter((p) => p.id !== u.id))
    try {
      await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, { method: 'DELETE', credentials: 'include' })
    } catch (err) {
      // if server call failed, still remove from localStorage if present
    }
    try {
      const KEY = 'demo_users'
      const list = JSON.parse(localStorage.getItem(KEY) || '[]')
      const newList = list.filter((x) => !(x.id === u.id || x.username === u.username))
      localStorage.setItem(KEY, JSON.stringify(newList))
    } catch (err) {
      // ignore localStorage errors
    }
    setToast(`${u.username} removed`)
    setTimeout(() => setToast(null), 3000)
    fetchUsersRef.current && fetchUsersRef.current()
  }

  return (
    <div className="file-manager-container1">
      <Helmet>
        <title>Admin - Brilliant Questionable Gnat</title>
      </Helmet>
      <section className="workspace-header">
        <div className="workspace-header__inner">
          <div className="workspace-header__branding">
            <div className="workspace-header__logo">
              <a href="/">
                <div aria-label="NimbusVault Home" className="navigation-brand">
                  <div className="navigation-logo-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9"></path>
                    </svg>
                  </div>
                  <span className="section-title">NimbusVault</span>
                </div>
              </a>
            </div>
            <nav className="workspace-header__breadcrumb">
              <span className="workspace-header__crumb">Admin</span>
            </nav>
          </div>
        </div>
      </section>

      <section style={{ padding: 94 }}>
        <h2 className="section-title">User Management</h2>
        <p className="section-subtitle">View and control application users.</p>

        <div style={{ marginTop: 12 }}>
          {authChecking ? (
            <div>Checking authentication…</div>
          ) : error ? (
            <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>
          ) : (
            currentUser && (
              <div style={{ marginBottom: 12 }}>
                Signed in as <strong>{currentUser.username}</strong> ({currentUser.role})
              </div>
            )
          )}
          {loading ? (
            <div>Loading users…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Dev-only impersonation helper */}
              {process.env.NODE_ENV !== 'production' && (
                <div style={{ marginBottom: 8 }}>
                  <button
                    className="btn btn-sm"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await fetch('/dev/impersonate-cloud-admin', { method: 'POST', credentials: 'include' })
                        const r = await fetch('/api/auth/me', { credentials: 'include' })
                        if (r.ok) {
                          const j = await r.json()
                          setCurrentUser(j.user || null)
                          setToast('Impersonated cloud-admin')
                          setTimeout(() => setToast(null), 3000)
                          fetchUsersRef.current && fetchUsersRef.current()
                        }
                      } catch (e) {
                        setToast('Impersonation failed')
                        setTimeout(() => setToast(null), 3000)
                      } finally { setLoading(false) }
                    }}
                  >
                    Impersonate cloud-admin (dev)
                  </button>
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-surface-elevated)' }}>
                    <th style={{ padding: '8px 6px' }}>Username</th>
                    <th style={{ padding: '8px 6px' }}>Email</th>
                    <th style={{ padding: '8px 6px' }}>Role</th>
                    <th style={{ padding: '8px 6px' }}>Status</th>
                    <th style={{ padding: '8px 6px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '10px 6px' }}>{u.username}</td>
                      <td style={{ padding: '10px 6px' }}>{u.email}</td>
                      <td style={{ padding: '10px 6px' }}>{u.role}</td>
                      <td style={{ padding: '10px 6px' }}>{u.active ? 'Active' : 'Pending'}</td>
                      <td style={{ padding: '10px 6px' }}>
                        {u.active ? (
                          <>
                            <button className="btn btn-sm btn-outline" style={{ marginLeft: 8 }} onClick={() => { setDetailUser(u); setDetailOpen(true) }}>Details</button>
                            <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => removeUser(u)} disabled={!(currentUser && currentUser.role === 'admin')}>Delete</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => approveUser(u)} disabled={!(currentUser && currentUser.role === 'admin')}>
                              Approve
                            </button>
                            <button className="btn btn-sm btn-outline" style={{ marginLeft: 8 }} onClick={() => removeUser(u)} disabled={!(currentUser && currentUser.role === 'admin')}>
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {toast && (
                <div style={{ position: 'fixed', right: 20, top: 20, background: 'var(--color-surface-elevated)', padding: '8px 12px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 950 }}>
                  {toast}
                </div>
              )}
              {detailOpen && detailUser && (
                <div className="fm-modal-overlay" onClick={() => { setDetailOpen(false); setDetailUser(null) }}>
                  <div className="fm-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 640, maxWidth: '95%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0 }}>User details</h3>
                      <button className="btn btn-sm" onClick={() => { setDetailOpen(false); setDetailUser(null) }}>Close</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <strong>Username</strong>
                        <div style={{ marginTop: 6 }}>{detailUser.username}</div>
                      </div>
                      <div>
                        <strong>Email</strong>
                        <div style={{ marginTop: 6 }}>{detailUser.email || '—'}</div>
                      </div>
                      <div>
                        <strong>Role</strong>
                        <div style={{ marginTop: 6 }}>{detailUser.role || 'user'}</div>
                      </div>
                      <div>
                        <strong>Status</strong>
                        <div style={{ marginTop: 6 }}>{detailUser.active ? 'Active' : 'Pending'}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                        <strong>ID</strong>
                        <div style={{ marginTop: 6, wordBreak: 'break-all' }}>{detailUser.id}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                      {!detailUser.active && (
                        <button className="btn btn-primary" onClick={async () => { await approveUser(detailUser); setDetailOpen(false); setDetailUser(null) }} disabled={!(currentUser && currentUser.role === 'admin')}>Approve</button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={async () => { if (!confirm(`Delete user ${detailUser.username}?`)) return; await removeUser(detailUser); setDetailOpen(false); setDetailUser(null) }} disabled={!(currentUser && currentUser.role === 'admin')}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Admin
