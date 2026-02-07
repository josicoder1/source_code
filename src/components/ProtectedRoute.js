import React, { useEffect, useState } from 'react'
import { Route, Redirect } from 'react-router-dom'

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' })
        if (r.ok) {
          if (mounted) { setAuthed(true); setChecking(false) }
          return
        }
      } catch (e) {
        // ignore
      }
      try {
        const s = localStorage.getItem('demo_session')
        if (s) {
          if (mounted) { setAuthed(true); setChecking(false); return }
        }
      } catch (e) {
        // ignore
      }
      if (mounted) { setAuthed(false); setChecking(false) }
    })()
    return () => { mounted = false }
  }, [])

  if (checking) return null

  return (
    <Route
      {...rest}
      render={(props) => (authed ? <Component {...props} /> : <Redirect to="/login" />)}
    />
  )
}

export default ProtectedRoute
