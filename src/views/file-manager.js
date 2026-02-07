import React, { useEffect, useRef, useState } from 'react'

import Script from 'dangerous-html/react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './file-manager.css'
import { listFiles, uploadFiles, deleteFile, createFolder, renameFile } from '../api/files'

const FileManager = (props) => {
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [currentPath, setCurrentPath] = useState('')
  const [folderOverlayOpen, setFolderOverlayOpen] = useState(false)
  const [overlayPath, setOverlayPath] = useState('')
  const [overlayFiles, setOverlayFiles] = useState([])
  const [overlayFolders, setOverlayFolders] = useState([])
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragMode, setDragMode] = useState(null) // 'files' | 'folders' | 'mixed'
  const [dragPreviewList, setDragPreviewList] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTargetFolder, setSelectedTargetFolder] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [folderOnlyMode, setFolderOnlyMode] = useState(false)
  const [pendingSource, setPendingSource] = useState(null) // 'drag'|'picker'|'create'
  const [modalPosition, setModalPosition] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // quick auth check — redirect to login if unauthorized; accept local demo_session fallback
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' })
        if (!r.ok) {
          const s = localStorage.getItem('demo_session')
          if (!s) window.location.href = '/login'
        }
      } catch (e) {
        const s = localStorage.getItem('demo_session')
        if (!s) window.location.href = '/login'
      }
    })()
  }, [])

  useEffect(() => { load() }, [])

  useEffect(() => { load(currentPath) }, [currentPath])

  async function load(path) {
    try {
      const data = await listFiles(path)
      setFiles(data.files || [])
      setFolders(data.folders || [])
    } catch (err) {
      console.error('listFiles failed', err)
      setFiles([])
      setFolders([])
    }
  }

  const normalizedQuery = (searchTerm || '').trim().toLowerCase()
  const filteredFolders = (!normalizedQuery || !folders) ? folders : folders.filter((d) => (d.name || '').toLowerCase().indexOf(normalizedQuery) !== -1)
  const filteredFiles = (!normalizedQuery || !files) ? files : files.filter((f) => {
    const name = (f.originalName || f.filename || '').toLowerCase()
    const rel = (f.relativePath || '').toLowerCase()
    return name.indexOf(normalizedQuery) !== -1 || rel.indexOf(normalizedQuery) !== -1
  })

  function handleUploadClick() {
    if (inputRef.current) inputRef.current.click()
  }

  async function handleFilesSelected(e) {
    const f = Array.from(e.target.files || [])
    if (f.length === 0) return
    // open folder selection modal with these files (picker)
    setPendingFiles(f)
    setSelectedTargetFolder('')
    setNewFolderName('')
    setPendingSource('picker')
    setModalPosition(null)
    setShowFolderModal(true)
  }

  function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  // Walk directory entries (webkit) to collect files with relative paths
  async function walkEntry(entry, pathPrefix = '') {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej))
      return [{ file, relativePath: pathPrefix + entry.name }]
    }
    if (entry.isDirectory) {
      const reader = entry.createReader()
      const entries = []
      // readEntries returns chunks; loop until empty
      while (true) {
        const chunk = await new Promise((resolve, reject) => reader.readEntries(resolve, reject))
        if (!chunk || chunk.length === 0) break
        entries.push(...chunk)
      }
      const results = []
      for (const en of entries) {
        const nested = await walkEntry(en, pathPrefix + entry.name + '/')
        results.push(...nested)
      }
      return results
    }
    return []
  }

  async function getFilesFromDataTransfer(items) {
    const collected = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      let entry = null
      if (typeof it.webkitGetAsEntry === 'function') entry = it.webkitGetAsEntry()
      // fallback: if no entry, try to get file directly
      if (entry) {
        const files = await walkEntry(entry, '')
        collected.push(...files)
      } else {
        const f = it.getAsFile && it.getAsFile()
        if (f) collected.push({ file: f, relativePath: f.name })
      }
    }
    return collected
  }

  async function confirmUpload() {
    if (!pendingFiles || pendingFiles.length === 0) {
      setShowFolderModal(false)
      setPendingFiles(null)
      return
    }
    setShowFolderModal(false)
    setPendingSource(null)
    setModalPosition(null)
    const target = (newFolderName && newFolderName.trim()) ? newFolderName.trim() : (selectedTargetFolder || '')

    // Create folder if a new folder name was provided
    if (newFolderName && newFolderName.trim()) {
      try {
        await createFolder({ name: newFolderName.trim(), parentPath: currentPath })
        await load()
        setSelectedTargetFolder(newFolderName.trim())
      } catch (e) {
        console.error('create folder failed', e)
        // continue with upload even if folder creation failed
      }
    }

    setUploading(true)
    setProgress(0)
    try {
      // Upload files (no progress callback)
      await uploadFiles(pendingFiles)
      await load()
      setProgress(100)
    } catch (e) {
      console.error('confirm upload failed', e)
      alert('Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
      setPendingFiles(null)
      setFolderOnlyMode(false)
    }
  }

  function cancelUpload() {
    setShowFolderModal(false)
    setPendingFiles(null)
    setSelectedTargetFolder('')
    setNewFolderName('')
    setFolderOnlyMode(false)
    setPendingSource(null)
    setModalPosition(null)
  }

  async function createFolderConfirm() {
    const name = (newFolderName || '').trim()
    if (!name) return alert('Enter a folder name')
    const temp = { name, mtime: Date.now() }
    setFolders((prev) => [temp, ...prev])
    setShowFolderModal(false)
    setPendingSource(null)
    setModalPosition(null)
    setNewFolderName('')
    setFolderOnlyMode(false)
    try {
      await createFolder({ name, parentPath: currentPath || '' })
      await load(currentPath)
    } catch (e) {
      console.error('create folder failed', e)
      setFolders((prev) => prev.filter((f) => !(f.name === temp.name && f.mtime === temp.mtime)))
      alert('Failed to create folder: ' + (e && e.message ? e.message : e))
    }
  }

  function handleDragOver(e) {
    preventDefaults(e)
    setIsDragOver(true)
    try {
      const items = e.dataTransfer && e.dataTransfer.items
      if (items && items.length > 0) {
        let hasFiles = false
        let hasFolders = false
        const preview = []
        for (let i = 0; i < items.length; i++) {
          const it = items[i]
          let entry = null
          if (typeof it.webkitGetAsEntry === 'function') entry = it.webkitGetAsEntry()
          if (entry) {
            if (entry.isDirectory) hasFolders = true
            if (entry.isFile) hasFiles = true
            preview.push(entry.name)
          } else {
            const f = it.getAsFile && it.getAsFile()
            if (f) {
              // if webkitRelativePath present, treat as folder content
              if (f.webkitRelativePath && f.webkitRelativePath.indexOf('/') !== -1) {
                hasFolders = true
                preview.push(f.webkitRelativePath.split('/')[0])
              } else {
                hasFiles = true
                preview.push(f.name)
              }
            }
          }
          if (preview.length >= 6) break
        }
        const mode = hasFolders && hasFiles ? 'mixed' : hasFolders ? 'folders' : hasFiles ? 'files' : null
        setDragMode(mode)
        setDragPreviewList(preview)
      }
    } catch (e) {
      setDragMode(null)
      setDragPreviewList([])
    }
  }

  function handleDragLeave(e) {
    preventDefaults(e)
    setIsDragOver(false)
    setDragMode(null)
    setDragPreviewList([])
  }

  async function handleDrop(e) {
    preventDefaults(e)
    setIsDragOver(false)
    const dt = e.dataTransfer
    if (!dt) return
    setUploading(true)
    setProgress(0)
    try {
      let toUpload = []
      if (dt.items && dt.items.length > 0) {
        const list = await getFilesFromDataTransfer(dt.items)
        if (list.length > 0) {
          toUpload = list
        } else {
          toUpload = Array.from(dt.files).map((f) => f)
        }
      } else {
        toUpload = Array.from(dt.files).map((f) => f)
      }

      if (toUpload.length === 0) return
      // open modal to choose target folder — position it over the drop target
      setPendingFiles(toUpload)
      setSelectedTargetFolder('')
      setNewFolderName('')
      setPendingSource('drag')
      try {
        const rect = e.currentTarget && e.currentTarget.getBoundingClientRect()
        if (rect) setModalPosition({ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2 })
        else setModalPosition(null)
      } catch (err) {
        setModalPosition(null)
      }
      setShowFolderModal(true)
    } catch (err) {
      console.error('drop upload failed', err)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  async function handleDelete(filename) {
    try {
      await deleteFile(filename)
      // Refresh the file list
      await load(currentPath)
      if (selectedFile && (selectedFile.filename === filename || selectedFile.relativePath === filename)) {
        setSelectedFile(null)
      }
    } catch (err) {
      console.error('delete failed', err)
      alert('Delete failed: ' + (err && err.message ? err.message : err))
    }
  }

  function handleSelectFile(file) {
    setSelectedFile(file)
  }

  function openRenameModal() {
    if (!selectedFile) return
    setRenameValue(selectedFile.originalName || selectedFile.filename || '')
    setRenameModalOpen(true)
  }

  function cancelRename() {
    setRenameModalOpen(false)
    setRenameValue('')
  }

  async function confirmRename() {
    if (!selectedFile || !renameValue) return alert('Enter a name')
    try {
      const pathToRename = selectedFile.relativePath || selectedFile.filename
      const res = await renameFile(pathToRename, renameValue)
      // reload current view
      await load(currentPath)
      // try to find updated file
      const updated = (await listFiles(currentPath)).files || []
      const found = updated.find((f) => f.relativePath === res.path || f.filename === res.name || f.url === res.url)
      if (found) setSelectedFile(found)
      setRenameModalOpen(false)
      setRenameValue('')
    } catch (e) {
      console.error('rename failed', e)
      alert('Rename failed: ' + (e && e.message ? e.message : e))
    }
  }

  function openShareModal() {
    if (!selectedFile) return
    setShareModalOpen(true)
  }

  function closeShareModal() {
    setShareModalOpen(false)
  }

  function copyShareLink() {
    if (!selectedFile || !selectedFile.url) return
    const url = selectedFile.url
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => alert('Link copied'))
    } else {
      window.prompt('Copy link', url)
    }
  }

  async function handleCreateFolder() {
    // open modal in folder-only mode
    setFolderOnlyMode(true)
    setNewFolderName('')
    setSelectedTargetFolder('')
    setPendingFiles(null)
    setPendingSource('create')
    setModalPosition(null)
    setShowFolderModal(true)
  }

  async function openFolderOverlay(path) {
    setOverlayPath(path)
    setFolderOverlayOpen(true)
    await loadOverlay(path)
  }

  function closeFolderOverlay() {
    setFolderOverlayOpen(false)
    setOverlayPath('')
    setOverlayFiles([])
    setOverlayFolders([])
    setOverlayLoading(false)
  }

  async function loadOverlay(path) {
    setOverlayLoading(true)
    try {
      const data = await listFiles(path)
      setOverlayFiles(data.files || [])
      setOverlayFolders(data.folders || [])
    } catch (e) {
      console.error('load overlay failed', e)
      setOverlayFiles([])
      setOverlayFolders([])
    } finally {
      setOverlayLoading(false)
    }
  }

  async function handleOverlayDelete(item) {
    if (!item) return
    const pathToDelete = item.relativePath || item.path || item.name
    if (!pathToDelete) return
    if (!window.confirm(`Move "${item.name || item.filename}" to Trash?`)) return
    try {
      await deleteFile(pathToDelete)
      // refresh overlay and main view
      await loadOverlay(overlayPath)
      await load(currentPath)
    } catch (e) {
      console.error('overlay delete failed', e)
      alert('Delete failed')
    }
  }

  function formatType(name) {
    if (!name) return ''
    const ext = (name.split('.').pop() || '').toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'Image'
    if (ext === 'pdf') return 'PDF Document'
    if (['doc', 'docx'].includes(ext)) return 'Word Document'
    if (['xls', 'xlsx'].includes(ext)) return 'Spreadsheet'
    if (['ppt', 'pptx'].includes(ext)) return 'Presentation'
    return ext ? ext.toUpperCase() + ' file' : ''
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return ''
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let v = bytes
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024
      i++
    }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
  }

  function formatDate(ms) {
    if (!ms) return ''
    try {
      return new Date(ms).toLocaleString()
    } catch (e) {
      return ''
    }
  }

  return (
    <div className="file-manager-container1">
      <Helmet>
        <title>File-Manager - Brilliant Questionable Gnat</title>
        <meta
          property="og:title"
          content="File-Manager - Brilliant Questionable Gnat"
        />
        <link
          rel="canonical"
          href="https://brilliant-questionable-gnat-ccdov6.teleporthq.app/file-manager"
        />
      </Helmet>
      <Navigation></Navigation>
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFilesSelected} />
        <div 
          onDragOver={handleDragOver} 
          onDragLeave={handleDragLeave} 
          onDrop={handleDrop} 
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
        >
          Drag and drop files here
        </div>
      <section className="workspace-header">
        <div className="workspace-header__inner">
          <div className="workspace-header__branding">
            <div className="workspace-header__logo">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.5 19a3.5 3.5 0 0 0 0-7h-1.5a7 7 0 1 0-11.76 6.92"></path>
                <path d="M12 13v8"></path>
                <path d="m9 16 3-3 3 3"></path>
              </svg>
              <span className="workspace-header__title">NimbusVault</span>
            </div>
            <nav className="workspace-header__breadcrumb">
                <span className="workspace-header__crumb">My Drive</span>
                {currentPath && (
                  currentPath.split('/').map((seg, idx, arr) => (
                    <React.Fragment key={idx}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                      <button className="workspace-header__crumb workspace-header__crumb--active" onClick={() => {
                        const next = arr.slice(0, idx + 1).join('/')
                        setCurrentPath(next)
                      }} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>{seg}</button>
                    </React.Fragment>
                  ))
                )}
            </nav>
          </div>
          <div className="workspace-header__search">
            <div className="workspace-header__search-wrapper">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-on-surface-secondary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input
                type="text"
                placeholder="Search files, folders, and shared items..."
                className="workspace-header__input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="workspace-header__actions">
            <div className="workspace-header__storage">
              <div className="workspace-header__storage-info">
                <span className="workspace-header__storage-text">75% used</span>
                <span className="workspace-header__storage-value">
                  3.2 GB of 5 GB
                </span>
              </div>
              <div className="workspace-header__progress-bar">
                <div className="file-manager-thq-workspace-headerprogress-fill-elm workspace-header__progress-fill"></div>
              </div>
            </div>
            <div className="workspace-header__button-group">
              <button className="btn btn-outline btn-sm" onClick={handleCreateFolder}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
                  <path d="M12 10v6"></path>
                  <path d="M9 13h6"></path>
                </svg>
                <span> New Folder </span>
              </button>
              <button className="btn btn-sm btn-primary" onClick={handleUploadClick}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12"></path>
                  <path d="m5 8 7-7 7 7"></path>
                  <path d="M2 21h20"></path>
                </svg>
                <span>
                  {' '}
                  Upload
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="sidebar-nav">
        <div className="sidebar-nav__container">
          <div className="sidebar-nav__wrapper">
            <div className="sidebar-nav__main">
              <details open="true" className="sidebar-nav__group">
                <summary className="sidebar-nav__summary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>Navigation</span>
                </summary>
                <div className="sidebar-nav__links">
                  <a href="#">
                    <div className="sidebar-nav__link sidebar-nav__link--active">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
                      </svg>
                      <span>
                        {' '}
                        My Drive
                        <span
                          dangerouslySetInnerHTML={{
                            __html: ' ',
                          }}
                        />
                      </span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="sidebar-nav__link">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <span>
                        {' '}
                        Shared with me
                        <span
                          dangerouslySetInnerHTML={{
                            __html: ' ',
                          }}
                        />
                      </span>
                    </div>
                  </a>
                  <a href="#">
                    <div className="sidebar-nav__link">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>
                        {' '}
                        Recent
                        <span
                          dangerouslySetInnerHTML={{
                            __html: ' ',
                          }}
                        />
                      </span>
                    </div>
                  </a>
                  <a href="/trash">
                    <div className="sidebar-nav__link">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span> Trash </span>
                    </div>
                  </a>
                </div>
              </details>
              <details className="sidebar-nav__group">
                <summary className="sidebar-nav__summary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>
                  </svg>
                  <span>Folders</span>
                </summary>
                <div className="sidebar-nav__tree">
                  <div className="sidebar-nav__tree-item">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6"></path>
                    </svg>
                    <span>Design Projects</span>
                  </div>
                  <div className="sidebar-nav__tree-item sidebar-nav__tree-item--nested">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                    <span>NimbusVault UI</span>
                  </div>
                  <div className="sidebar-nav__tree-item">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                    <span>Finance 2024</span>
                  </div>
                </div>
              </details>
            </div>
            <div className="sidebar-nav__footer">
              <div className="sidebar-nav__storage-card">
                <div className="sidebar-nav__storage-header">
                  <span className="sidebar-nav__storage-title">
                    Storage Summary
                  </span>
                  <span className="sidebar-nav__storage-percent">82%</span>
                </div>
                <div className="sidebar-nav__storage-bar">
                  <div className="file-manager-thq-sidebar-navstorage-fill-elm sidebar-nav__storage-fill"></div>
                </div>
                <p className="sidebar-nav__storage-description">
                  You have 820 MB left of your 5 GB plan.
                </p>
                <button className="sidebar-nav__upgrade btn btn-sm btn-accent">
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="file-showcase">
        <div className="file-showcase__header">
          <h2 className="section-title">Files &amp; Folders</h2>
          <div className="file-showcase__view-toggles">
            <button
              aria-label="Grid View"
              className="file-showcase__toggle file-showcase__toggle--active"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                <rect width="7" height="7" x="3" y="14" rx="1"></rect>
              </svg>
            </button>
            <button aria-label="List View" className="file-showcase__toggle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" x2="21" y1="6" y2="6"></line>
                <line x1="3" x2="21" y1="12" y2="12"></line>
                <line x1="3" x2="21" y1="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div
          className="file-showcase__grid"
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={isDragOver ? { outline: '2px dashed var(--color-primary)', background: 'rgba(0,0,0,0.03)' } : {}}
        >
          {filteredFolders && filteredFolders.length > 0 && (
            filteredFolders.map((d) => (
              <div className="file-card card file-card--folder" key={d.name} onClick={async () => {
                // open overlay for folder
                const next = currentPath ? `${currentPath}/${d.name}` : d.name
                await openFolderOverlay(next)
              }}>
                <div className="file-card__icon card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="var(--color-primary)" fillOpacity="0.06" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2" />
                  </svg>
                </div>
                <div className="file-card__info card-content">
                  <span className="file-card__name">{d.name}</span>
                  <span className="file-card__meta">{d.mtime ? formatDate(d.mtime) : ''}</span>
                </div>
              </div>
            ))
          )}

          {/* breadcrumb / path display */}
          {currentPath && (
            <div style={{ width: '100%', padding: '12px 18px', background: 'transparent' }}>
              <button className="btn btn-sm" onClick={() => setCurrentPath('')}>Back</button>
              <span style={{ marginLeft: 12, color: 'var(--color-on-surface-secondary)' }}>Path: {currentPath}</span>
            </div>
          )}

          {filteredFiles && filteredFiles.length > 0 ? (
            filteredFiles.map((f) => (
                <div className="file-card card" key={f.filename} onClick={() => handleSelectFile(f)} style={{ cursor: 'pointer' }}>
                <div className="file-card__icon card-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div className="file-card__info card-content">
                  <a href={f.url} target="_blank" rel="noreferrer" className="file-card__name" onClick={(e) => e.stopPropagation()}>
                    {f.originalName || f.filename}
                  </a>
                  <span className="file-card__meta">{(f.size ? formatBytes(f.size) : '')} {f.mtime ? '• ' + formatDate(f.mtime) : ''}</span>
                </div>
                <div className="file-card__actions card-actions">
                  <a className="btn btn-sm card-button" href={f.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Download</a>
                  <button className="btn btn-sm btn-danger card-button" onClick={(e) => { e.stopPropagation(); handleDelete(f.filename); }}>Delete</button>
                </div>
              </div>
            ))
          ) : (
            (filteredFolders.length === 0 && filteredFiles.length === 0) && <div className="file-empty-note">No files match your search.</div>
          )}
        </div>
      </section>
      <section className="action-overlay">
        <div className="action-overlay__container">
          <div className="action-overlay__card">
            <div className="action-overlay__header">
              <span className="action-overlay__title">
                Selected: Brand_Guidelines.pdf
              </span>
              <button aria-label="Deselect" className="action-overlay__close">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>
            <div className="action-overlay__grid">
              <button className="action-overlay__item">
                <div className="file-manager-thq-action-overlayicon-box-elm1">
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" x2="12" y1="15" y2="3"></line>
                  </svg>
                </div>
                <span>Download</span>
              </button>
              
              <button className="action-overlay__item action-overlay__item--danger">
                <div className="file-manager-thq-action-overlayicon-box-elm4">
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
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" x2="10" y1="11" y2="17"></line>
                    <line x1="14" x2="14" y1="11" y2="17"></line>
                  </svg>
                </div>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
        <button aria-label="Quick Upload" className="fab-primary" onClick={handleUploadClick}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" x2="12" y1="5" y2="19"></line>
            <line x1="5" x2="19" y1="12" y2="12"></line>
          </svg>
        </button>
      </section>
      <section id="recent-activity" className="activity-timeline">
        <div className="activity-timeline__container">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-timeline__list">
            <div className="activity-item">
              <div className="activity-item__marker"></div>
              <div className="activity-item__content">
                <div className="activity-item__header">
                  <img
                    src="https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500&amp;dpr=1"
                    alt="Sarah J."
                    className="activity-item__avatar"
                  />
                  <span className="activity-item__user">Sarah Jenkins</span>
                  <span className="activity-item__time">2 mins ago</span>
                </div>
                <p className="activity-item__text">
                  <span>
                    {' '}
                    Uploaded
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </span>
                  <span className="file-manager-thq-activity-itemhighlight-elm1">
                    Project_Proposal_v2.pdf
                  </span>
                  <span>
                    {' '}
                    to Marketing Assets.
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </span>
                </p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-item__marker"></div>
              <div className="activity-item__content">
                <div className="activity-item__header">
                  <img
                    src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500&amp;dpr=1"
                    alt="Mike R."
                    className="activity-item__avatar"
                  />
                  <span className="activity-item__user">Mike Ross</span>
                  <span className="activity-item__time">1 hour ago</span>
                </div>
                <p className="activity-item__text">
                  <span>
                    {' '}
                    Renamed
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </span>
                  <span className="file-manager-thq-activity-itemhighlight-elm2">
                    Old_Logo.svg
                  </span>
                  <span>
                    {' '}
                    to
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </span>
                  <span className="file-manager-thq-activity-itemhighlight-elm3">
                    Legacy_Logo_2023.svg
                  </span>
                  <span>
                    {' '}
                    .
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </span>
                </p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-item__marker"></div>
              <div className="activity-item__content">
                <div className="activity-item__header">
                  <div className="activity-item__avatar activity-item__avatar--initials">
                    <span>JD</span>
                  </div>
                  <span className="activity-item__user">John Doe</span>
                  <span className="activity-item__time">3 hours ago</span>
                </div>
                <p className="activity-item__text">
                  <span>
                    {' '}
                    Shared folder
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </span>
                  <span className="file-manager-thq-activity-itemhighlight-elm4">
                    Q4 Financials
                  </span>
                  <span>
                    {' '}
                    with 3 collaborators.
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="preview-dashboard">
        <div className="preview-dashboard__container">
          <div className="preview-dashboard__main">
              <div className="preview-dashboard__viewer">
                {selectedFile ? (
                  <div className="preview-dashboard__file-preview">
                      {(() => {
                      const name = selectedFile.originalName || selectedFile.filename || ''
                      const ext = (name.split('.').pop() || '').toLowerCase()
                      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                        return <img src={selectedFile.url} alt={name} style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 6 }} />
                      }
                      if (ext === 'pdf') {
                        return <iframe title={name} src={selectedFile.url} style={{ width: '100%', height: 420, border: 'none', borderRadius: 6 }} />
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-surface-secondary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          <p style={{ maxWidth: 360, textAlign: 'center' }}>{selectedFile.originalName || selectedFile.filename}</p>
                          <a href={selectedFile.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="btn btn-sm">Open in new tab</a>
                        </div>
                      )
                    })()}

                    <div className="preview-actions">
                      <a className="btn btn-sm" href={selectedFile.url} target="_blank" rel="noreferrer">Download</a>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(selectedFile.relativePath || selectedFile.filename)}>Delete</button>
                    </div>
                  </div>
                ) : (
                  <div className="preview-dashboard__file-placeholder">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-on-surface-secondary)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p>Select a file to preview its contents and details.</p>
                  </div>
                )}
              </div>
            </div>
          <aside className="preview-dashboard__sidebar">
            <div className="preview-dashboard__details">
              <h3 className="section-subtitle">File Details</h3>
              {selectedFile ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedFile.originalName || selectedFile.filename}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-secondary)' }}>{selectedFile.filename}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12 }}>{selectedFile.size ? formatBytes(selectedFile.size) : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-secondary)' }}>{selectedFile.mtime ? formatDate(selectedFile.mtime) : ''}</div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="preview-dashboard__meta-list">
                <div className="preview-dashboard__meta-item">
                  <span className="preview-dashboard__meta-label">Type</span>
                  <span className="preview-dashboard__meta-value">
                    {selectedFile ? formatType(selectedFile.originalName || selectedFile.filename) : '—'}
                  </span>
                </div>
                <div className="preview-dashboard__meta-item">
                  <span className="preview-dashboard__meta-label">Size</span>
                  <span className="preview-dashboard__meta-value">{selectedFile && selectedFile.size ? formatBytes(selectedFile.size) : '—'}</span>
                </div>
                <div className="preview-dashboard__meta-item">
                  <span className="preview-dashboard__meta-label">
                    Location
                  </span>
                  <span className="preview-dashboard__meta-value">
                    {selectedFile ? (selectedFile.folder ? `My Drive / ${selectedFile.folder}` : 'My Drive / Assets') : '—'}
                  </span>
                </div>
                <div className="preview-dashboard__meta-item">
                  <span className="preview-dashboard__meta-label">
                    Modified
                  </span>
                  <span className="preview-dashboard__meta-value">
                    {selectedFile && selectedFile.mtime ? formatDate(selectedFile.mtime) : '—'}
                  </span>
                </div>
              </div>
              {selectedFile && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <a className="btn btn-sm" href={selectedFile.url} target="_blank" rel="noreferrer">Open</a>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(selectedFile.filename)}>Delete</button>
                </div>
              )}
              {selectedFile ? (
                <div className="preview-dashboard__sharing">
                  <h4 className="preview-dashboard__subheading">Collaborators</h4>
                  <div className="preview-dashboard__user-list">
                    <div className="preview-dashboard__user-badge">
                      <img
                        src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500&amp;dpr=1"
                        alt="Owner"
                      />
                      <span>You (Owner)</span>
                    </div>
                    <div className="preview-dashboard__user-badge">
                      <img
                        src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500&amp;dpr=1"
                        alt="Editor"
                      />
                      <span>Alex Morgan</span>
                    </div>
                  </div>
                  <button className="preview-dashboard__manage-btn btn btn-outline btn-sm">
                    Manage Access
                  </button>
                </div>
              ) : (
                <div className="preview-dashboard__sharing">
                  <h4 className="preview-dashboard__subheading">Collaborators</h4>
                  <div className="preview-dashboard__user-list">
                    <div className="preview-dashboard__user-badge">
                      <img
                        src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500&amp;dpr=1"
                        alt="Owner"
                      />
                      <span>You (Owner)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
      <section className="empty-state-cta">
        <div className="empty-state-cta__container">
          <div
            className="empty-state-cta__spotlight"
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={isDragOver ? { outline: '2px dashed var(--color-primary)', background: 'rgba(0,0,0,0.03)' } : {}}
          >
            <div className="empty-state-cta__visual">
              <div className="empty-state-cta__icon-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 13v8"></path>
                  <path d="m8 17 4-4 4 4"></path>
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                </svg>
              </div>
            </div>
            <h2 className="hero-title">
              {isDragOver ? (
                dragMode === 'folders' ? 'Drop folders to upload' : dragMode === 'mixed' ? 'Drop files & folders to upload' : 'Drop files to upload'
              ) : 'Your vault is empty'}
            </h2>
            <p className="section-subtitle">
              {isDragOver ? (
                dragMode === 'folders' ? 'Release to upload folders now.' : dragMode === 'mixed' ? 'Release to upload files and folders now.' : 'Release to upload files now.'
              ) : 'Drag and drop files here to start uploading, or use the button below to browse your computer.'}
            </p>
            {isDragOver && dragPreviewList && dragPreviewList.length > 0 && (
              <div className="empty-drag-preview">
                {dragPreviewList.map((n, i) => (
                  <div key={i} className="empty-drag-badge">{n.length > 20 ? n.slice(0,18) + '…' : n}</div>
                ))}
              </div>
            )}
            <div className="empty-state-cta__actions">
              <button className="btn btn-primary btn-lg" onClick={handleUploadClick}>Upload Files</button>
              <button className="btn btn-lg btn-secondary" onClick={handleCreateFolder}>Create New Folder</button>
            </div>
            {uploading && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)' }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>{progress}%</div>
              </div>
            )}
            <div className="empty-state-cta__tips">
              <span className="empty-state-cta__tip-pill">
                Pro Tip: Use folders to organize by project
              </span>
              <span className="empty-state-cta__tip-pill">
                Pro Tip: Right-click files for quick actions
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="file-manager-container2">
        <div className="file-manager-container3">
          <Script
            html={`<style>
        @keyframes slideUp {from {transform: translateY(100px);
opacity: 0;}
to {transform: translateY(0);
opacity: 1;}}@keyframes pulse {0% {transform: scale(1);
opacity: 0.5;}
100% {transform: scale(1.5);
opacity: 0;}}
        </style> `}
          ></Script>
        </div>
      </div>
      <div className="file-manager-container4">
        <div className="file-manager-container5">
        </div>
      </div>
      {showFolderModal && (
        <div className="fm-modal-overlay">
          <div className="fm-modal-card" style={modalPosition ? { position: 'fixed', top: modalPosition.top + 'px', left: modalPosition.left + 'px', transform: 'translate(-50%, -50%)' } : {}}>
            <h3 className="fm-modal-header">Choose target folder</h3>
            <p className="fm-modal-sub">Select an existing folder or create a new one for this upload.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Existing folders</label>
                <select style={{ width: '100%', padding: '8px 10px' }} value={selectedTargetFolder} onChange={(e) => setSelectedTargetFolder(e.target.value)}>
                  <option value="">(root)</option>
                  {folders && folders.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Or create new</label>
                <input style={{ width: '100%', padding: '8px 10px' }} placeholder="New folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
              </div>
            </div>
            <div className="fm-modal-actions">
              <button className="btn btn-outline btn-sm" onClick={cancelUpload}>Cancel</button>
              {folderOnlyMode ? (
                <button className="btn btn-sm btn-primary" onClick={createFolderConfirm}>Create Folder</button>
              ) : (
                <button className="btn btn-sm btn-primary" onClick={confirmUpload}>Upload</button>
              )}
            </div>
          </div>
        </div>
      )}
      {renameModalOpen && (
        <div className="fm-modal-overlay">
          <div className="fm-modal-card">
            <h3 className="fm-modal-header">Rename file</h3>
            <div style={{ marginTop: 12 }}>
              <input style={{ width: '100%', padding: '8px 10px' }} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            </div>
            <div className="fm-modal-actions">
              <button className="btn btn-outline btn-sm" onClick={cancelRename}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={confirmRename}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {shareModalOpen && selectedFile && (
        <div className="fm-modal-overlay" onClick={closeShareModal}>
          <div className="fm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="fm-modal-header">Share file</h3>
            <p className="fm-modal-sub">Copy the link below to share this file.</p>
            <div style={{ marginTop: 12 }}>
              <input style={{ width: '100%', padding: '8px 10px' }} readOnly value={selectedFile.url || ''} />
            </div>
            <div className="fm-modal-actions">
              <button className="btn btn-outline btn-sm" onClick={closeShareModal}>Close</button>
              <button className="btn btn-sm btn-primary" onClick={copyShareLink}>Copy Link</button>
            </div>
          </div>
        </div>
      )}
      {folderOverlayOpen && (
        <div className="fm-modal-overlay" onClick={closeFolderOverlay}>
          <div className="fm-modal-card" style={{ maxWidth: 900, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="fm-modal-header" style={{ margin: 0 }}>Folder: {overlayPath}</h3>
                <div style={{ fontSize: 12, color: 'var(--color-on-surface-secondary)' }}>{overlayFolders.length} folders • {overlayFiles.length} files</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setCurrentPath(overlayPath); closeFolderOverlay(); }}>Open in page</button>
                <button className="btn btn-outline btn-sm" onClick={closeFolderOverlay}>Close</button>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {overlayLoading ? (
                <div>Loading...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                  {overlayFolders.map((d) => (
                    <div key={d.path || d.name} className="file-card card file-card--folder" onClick={() => loadOverlay(overlayPath ? `${overlayPath}/${d.name}` : d.name)}>
                      <div className="file-card__icon card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="var(--color-primary)" fillOpacity="0.06" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2" />
                        </svg>
                      </div>
                      <div className="file-card__info card-content">
                        <span className="file-card__name">{d.name}</span>
                        <span className="file-card__meta">{d.mtime ? formatDate(d.mtime) : ''}</span>
                      </div>
                      <div className="file-card__actions card-actions">
                        <a className="btn btn-sm card-button" href={`/api/folders/download?path=${encodeURIComponent(d.path || (overlayPath ? `${overlayPath}/${d.name}` : d.name))}`}>Download</a>
                        <button className="btn btn-sm card-button" onClick={() => { setCurrentPath(d.path || (overlayPath ? `${overlayPath}/${d.name}` : d.name)); closeFolderOverlay(); }}>Open</button>
                        <button className="btn btn-sm btn-danger card-button" onClick={() => handleOverlayDelete(d)}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {overlayFiles.map((f) => (
                    <div className="file-card card" key={f.relativePath || f.filename}>
                      <div className="file-card__icon card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      </div>
                      <div className="file-card__info card-content">
                        <a href={f.url} target="_blank" rel="noreferrer" className="file-card__name">{f.filename}</a>
                        <span className="file-card__meta">{f.size ? formatBytes(f.size) : ''}</span>
                      </div>
                      <div className="file-card__actions card-actions">
                        <a className="btn btn-sm card-button" href={f.url} target="_blank" rel="noreferrer">Download</a>
                        <button className="btn btn-sm btn-danger card-button" onClick={() => handleOverlayDelete(f)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <Footer></Footer>
      <a href="https://play.teleporthq.io/signup">
        <div
          aria-label="Sign up to TeleportHQ"
          className="file-manager-container6"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 19 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="file-manager-icon213"
          >
            <path
              d="M9.1017 4.64355H2.17867C0.711684 4.64355 -0.477539 5.79975 -0.477539 7.22599V13.9567C-0.477539 15.3829 0.711684 16.5391 2.17867 16.5391H9.1017C10.5687 16.5391 11.7579 15.3829 11.7579 13.9567V7.22599C11.7579 5.79975 10.5687 4.64355 9.1017 4.64355Z"
              fill="#B23ADE"
            ></path>
            <path
              d="M10.9733 12.7878C14.4208 12.7878 17.2156 10.0706 17.2156 6.71886C17.2156 3.3671 14.4208 0.649963 10.9733 0.649963C7.52573 0.649963 4.73096 3.3671 4.73096 6.71886C4.73096 10.0706 7.52573 12.7878 10.9733 12.7878Z"
              fill="#FF5C5C"
            ></path>
            <path
              d="M17.7373 13.3654C19.1497 14.1588 19.1497 15.4634 17.7373 16.2493L10.0865 20.5387C8.67402 21.332 7.51855 20.6836 7.51855 19.0968V10.5141C7.51855 8.92916 8.67402 8.2807 10.0865 9.07221L17.7373 13.3654Z"
              fill="#2874DE"
            ></path>
          </svg>
          <span className="file-manager-text36">Built in TeleportHQ</span>
        </div>
      </a>
    </div>
  )
}

export default FileManager
