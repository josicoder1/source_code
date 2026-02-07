import React, { useEffect, useState } from 'react'
import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './file-manager.css'
import './trash.css'
import { listTrash, restoreTrash, deleteTrash } from '../api/files'

const Trash = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await listTrash()
      setItems(data.items || [])
    } catch (e) {
      console.error('list trash failed', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(it) {
    if (!it || !it.path) return
    setWorking(it.path)
    try {
      await restoreTrash(it.path)
      await load()
    } catch (e) {
      console.error('restore failed', e)
      alert('Restore failed')
    } finally {
      setWorking(null)
    }
  }

  async function handlePermanentDelete(it) {
    if (!it || !it.path) return
    if (!window.confirm('Permanently delete "' + it.name + '"? This cannot be undone.')) return
    setWorking(it.path)
    try {
      await deleteTrash(it.path)
      await load()
    } catch (e) {
      console.error('delete trash failed', e)
      alert('Delete failed')
    } finally {
      setWorking(null)
    }
  }

  async function handleDownload(it) {
    if (!it || !it.path) return
    setWorking(it.path)
    try {
      const { getTrashDownloadUrl } = await import('../api/files')
      const url = await getTrashDownloadUrl(it.path)
      if (!url) return alert('No download URL available')
      window.open(url, '_blank')
    } catch (e) {
      console.error('download failed', e)
      alert('Download failed')
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="file-manager-container1">
      <Navigation />
      <section className="file-showcase">
        <div className="file-showcase__header">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <h2 className="section-title">Trash Bin</h2>
            <button className="btn empty-trash-btn" onClick={async () => {
              if (!window.confirm('Permanently delete all items in Trash? This cannot be undone.')) return
              try {
                setLoading(true)
                await import('../api/files').then(m => m.emptyTrash())
                await load()
              } catch (e) { console.error(e); alert('Failed to empty trash') } finally { setLoading(false) }
            }}>Empty Trash</button>
          </div>
          <p className="section-subtitle">Items you've deleted recently. Restore or permanently remove them.</p>
        </div>
        <div className="file-showcase__grid">
          {loading ? (
            <div style={{ padding: 28 }}>Loading...</div>
          ) : items.length === 0 ? (
            <div className="file-empty-note">Trash is empty.</div>
          ) : (
            items.map((it) => (
              <div key={it.path} className={it.type === 'folder' ? 'file-card card file-card--folder' : 'file-card card'}>
                <div className="file-card__icon card-icon">
                  {it.type === 'folder' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="var(--color-primary)" fillOpacity="0.06" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  )}
                </div>
                <div className="file-card__info card-content">
                  <span className="file-card__name">{it.name}</span>
                  <span className="file-card__meta">{it.mtime ? new Date(it.mtime).toLocaleString() : ''} {it.size ? '• ' + (it.size/1024).toFixed(1) + ' KB' : ''}</span>
                </div>
                <div className="file-card__actions card-actions">
                  <button className="btn btn-sm card-button" disabled={working} onClick={(e) => { e.stopPropagation(); handleRestore(it); }}>Restore</button>
                  <button className="btn btn-sm btn-danger card-button" disabled={working} onClick={(e) => { e.stopPropagation(); handlePermanentDelete(it); }}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default Trash
