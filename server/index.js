const express = require('express')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const crypto = require('crypto')

// const jwt = require('jsonwebtoken')
// const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-is-long'

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()
const PORT = process.env.PORT || 4001

// Frontend URL and CORS origin can be configured via environment variables.
// `FRONTEND_URL` should be the public URL where the React app is hosted.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

app.use(cors({
  origin: process.env.CORS_ORIGIN || FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.use('/uploads', express.static(UPLOAD_DIR))

// Cookie defaults for auth routes. Use env overrides during development if needed.
const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  sameSite: process.env.COOKIE_SAMESITE || 'none',
  secure: process.env.COOKIE_SECURE === '1' || false,
}

// For local development, browsers require SameSite=None cookies to be Secure (HTTPS).
// Use dev-friendly cookie settings when not in production so cookies are accepted on localhost.
if (process.env.NODE_ENV !== 'production') {
  COOKIE_OPTIONS.sameSite = process.env.COOKIE_SAMESITE || 'lax'
  COOKIE_OPTIONS.secure = false
}

// Simple cookie helper (no extra dependency)
function parseCookie(req, name) {
  const cookieHeader = req.headers && req.headers.cookie
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';').map(p => p.trim())
  for (const p of parts) {
    if (p.startsWith(name + '=')) return decodeURIComponent(p.split('=')[1])
  }
  return null
}

// Require login before redirecting to frontend root
app.get('/', (req, res) => {
  const user = parseCookie(req, 'AUTH_USER')
  if (!user) return res.redirect(FRONTEND_URL + '/login')
  return res.redirect(FRONTEND_URL)
})

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body || '')
  next()
})

// Require login for frontend routes: redirect to frontend login when no AUTH_USER cookie.
// Exclude API and static asset routes so API calls and uploads still work.
app.use((req, res, next) => {
  try {
    if (req.method === 'GET') {
      const path = req.path || req.url || ''
      const isApi = path.startsWith('/api')
      const isStatic = path.startsWith('/uploads') || path.startsWith('/assets') || path.startsWith('/public')
      if (!isApi && !isStatic) {
        const user = parseCookie(req, 'AUTH_USER')
        if (!user) return res.redirect(FRONTEND_URL + '/login')
      }
    }
  } catch (e) {
    // swallow and continue
  }
  next()
})

// local file-backed users helper (fallback)
const UsersFile = require('./users')

// optional DynamoDB helpers
let DDB = null
let S3 = null
const USE_DDB = !!(process.env.USE_DDB === '1')
const USE_S3 = !!(process.env.USE_S3 === '1')

if (USE_DDB || USE_S3) {
  try {
    if (USE_DDB) {
      DDB = require('./aws/dynamo')
      console.log('DynamoDB helpers loaded')
    }
    if (USE_S3) {
      S3 = require('./aws/s3')
      console.log('S3 helpers loaded')
    }
  } catch (e) {
    console.warn('Failed to load AWS helpers:', e && e.message)
    DDB = null
    S3 = null
  }
}

const memoryUpload = require('multer')({ storage: require('multer').memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

// protect /api routes except auth and health
/*
app.use('/api', (req, res, next) => {
  if (req.path && (req.path.startsWith('/auth') || req.path === '/health')) return next()
  
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }
})
*/

// Helper wrappers that route to DDB when enabled, else file helper
async function createUser(opts) {
  if (USE_DDB && DDB && DDB.createUser) return await DDB.createUser(opts)
  return UsersFile.createUser(opts)
}

async function validateUser(username, password) {
  if (USE_DDB && DDB && DDB.validateUser) return await DDB.validateUser(username, password)
  return UsersFile.validateUser(username, password)
}

async function listUsers() {
  if (USE_DDB && DDB && DDB.listUsers) return await DDB.listUsers()
  // fallback: load file users
  try {
    const users = UsersFile.load()
    return users.map((u) => ({ id: u.id, username: u.username, email: u.email || null, role: u.role || 'user', active: !!u.active }))
  } catch (e) { return [] }
}

async function setUserActive(idOrUsername, active) {
  if (USE_DDB && DDB && DDB.setUserActive) return await DDB.setUserActive(idOrUsername, active)
  // fallback: modify file
  const all = UsersFile.load()
  const idx = all.findIndex((x) => x.username === idOrUsername || x.id === idOrUsername)
  if (idx === -1) return false
  all[idx].active = !!active
  UsersFile.save(all)
  return true
}

// auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body || {}
    const { role } = req.body || {}
    if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' })
    const user = await createUser({ username, password, email, role: role || 'user', active: false })
    // set auth cookie
    try { res.cookie('AUTH_USER', encodeURIComponent(user.username || user.id), COOKIE_OPTIONS) } catch (e) {}
    return res.json({ ok: true, user })
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message || 'failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' })
    const u = await validateUser(username, password)
    if (!u) return res.status(401).json({ ok: false, error: 'invalid credentials' })
    if (u.active === false) return res.status(403).json({ ok: false, error: 'account not active' })
    
    // const token = jwt.sign({ username: u.username, role: u.role, email: u.email }, JWT_SECRET, { expiresIn: '1d' })
    // set simple auth cookie for frontend routing (httpOnly)
    try {
      res.cookie('AUTH_USER', encodeURIComponent(u.username || u.id || 'user'), COOKIE_OPTIONS)
    } catch (e) {}

    // ensure user is stored in cloud (DynamoDB) with role if DDB is enabled and user is only local
    try {
      if (USE_DDB && DDB && DDB.getUserByUsername && DDB.createUser) {
        const existing = await DDB.getUserByUsername(username).catch(() => null)
        if (!existing) {
          // create user record in DDB using provided password (best-effort)
          await DDB.createUser({ username, password, role: u.role || 'user', email: u.email || null })
        }
      }
    } catch (e) {
      console.warn('failed to ensure user in DDB:', e && e.message)
    }
    return res.json({ ok: true, user: u/*, token*/ })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'login failed' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  // clear auth cookie
  try { res.clearCookie && res.clearCookie('AUTH_USER', COOKIE_OPTIONS) } catch (e) {}
  res.json({ ok: true })
})

// derive current user from AUTH_USER cookie (supports DDB or local users)
async function getUserFromCookie(req) {
  try {
    const name = parseCookie(req, 'AUTH_USER')
    if (!name) return null
    const uname = decodeURIComponent(name)
    if (USE_DDB && DDB && DDB.getUserByUsername) {
      try {
        const item = await DDB.getUserByUsername(uname)
        if (!item) return null
        return { id: item.id || item.username, username: item.username, role: item.role || 'user', email: item.email || null, active: !!item.active }
      } catch (e) { /* fallback to local */ }
    }
    try {
      const all = UsersFile.load()
      const found = all.find(u => u.username === uname || u.id === uname)
      if (!found) return null
      return { id: found.id || found.username, username: found.username, role: found.role || 'user', email: found.email || null, active: !!found.active }
    } catch (e) { return null }
  } catch (e) { return null }
}

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getUserFromCookie(req)
    return res.json({ ok: true, user })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message })
  }
})

// admin endpoints (authorize via cookie-derived user)
app.get('/api/admin/users', async (req, res) => {
  try {
    const cur = await getUserFromCookie(req)
    if (!cur || (cur.role !== 'admin' && cur.username !== 'admin')) return res.status(403).json({ ok: false, error: 'forbidden' })
    const users = await listUsers()
    res.json({ ok: true, users })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

app.post('/api/admin/users/:id/approve', async (req, res) => {
  try {
    const cur = await getUserFromCookie(req)
    if (!cur || (cur.role !== 'admin' && cur.username !== 'admin')) return res.status(403).json({ ok: false, error: 'forbidden' })
    const id = req.params.id
    const ok = await setUserActive(id, true)
    res.json({ ok: !!ok })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// file upload endpoint
app.post('/api/files/upload', memoryUpload.array('files'), async (req, res) => {
  if (USE_S3 && S3 && USE_DDB && DDB) {
    // AWS S3+DDB path
    try {
      const files = req.files || []
      const uploaded = []
      for (const f of files) {
        // if folderId provided, prefix the S3 key so files are grouped under that folder
        const base = S3.normalizeKey(f.originalname)
        const key = (req.body.folderId && String(req.body.folderId).trim()) ? `${String(req.body.folderId).replace(/^\/+|\/+$/g, '')}/${base}` : base
        await S3.uploadBuffer(f.buffer, key, f.mimetype, f.size)
        const presigned = await S3.getPresignedUrl(key, 3600).catch(() => null)
        // Use `key` (logical listing key) that includes folder prefix so DDB listing groups files correctly.
        const logicalKey = (req.body.folderId && String(req.body.folderId).trim()) ? `${String(req.body.folderId).replace(/^\/+|\/+$/g, '')}/${base}` : base
        const meta = {
          key: logicalKey,
          userId: process.env.DEFAULT_USER_ID || 'demo-user',
          fileName: f.originalname,
          fileSize: f.size,
          fileType: f.mimetype,
          folderId: req.body.folderId || '',
          s3Key: key,
          createdAt: new Date().toISOString(),
          isDeleted: false,
          url: presigned,
        }
        const saved = await DDB.putFileMetadata(meta)

        uploaded.push({
          key: saved.key || key,
          filename: saved.fileName || f.originalname,
          originalName: saved.fileName || f.originalname,
          size: saved.fileSize || f.size,
          mimeType: saved.fileType || f.mimetype,
          mtime: saved.createdAt || new Date().toISOString(),
          url: saved.url || presigned
        })
      }
      return res.json({ ok: true, files: uploaded })
    } catch (e) {
      console.error('s3 upload failed', e)
      return res.status(500).json({ ok: false, error: 'upload failed' })
    }
  }

  // Fallback to filesystem
  const diskStorage = require('multer').diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'))
    }
  })

  const diskUpload = require('multer')({ storage: diskStorage }).array('files')

  diskUpload(req, res, (err) => {
    if (err) {
      console.error('Disk upload failed:', err)
      return res.status(500).json({ ok: false, error: 'upload failed' })
    }
    const files = (req.files || []).map(f => ({
      key: f.filename,
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
      mtime: new Date().toISOString(),
      url: `/uploads/${f.filename}`,
    }))
    return res.json({ ok: true, files })
  })
})

// List files endpoint
app.get('/api/files', async (req, res) => {
  const p = req.query.path || ''
  if (USE_DDB && DDB) {
    try {
      const result = await DDB.listFiles(p)
      // Also include any folders stored in the separate Folders table (legacy helper)
      try {
        const db = require('./db')
        const userId = process.env.DEFAULT_USER_ID || 'demo-user'
        const ddbFolders = await db.getFolders(userId)
        if (Array.isArray(ddbFolders) && ddbFolders.length) {
          const existing = new Set((result.folders || []).map(f => f.name))
          for (const f of ddbFolders) {
            if (!existing.has(f.name)) {
              ;(result.folders || (result.folders = [])).push({ name: f.name, path: f.folderId, mtime: f.createdAt })
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load legacy folders from db', e && e.message)
      }
      return res.json(result)
    } catch (e) {
      console.error('Failed to list files from DDB', e)
      return res.status(500).json({ ok: false, error: 'failed to list files' })
    }
  }

  // Filesystem fallback
  try {
    const targetDir = p ? path.join(UPLOAD_DIR, p) : UPLOAD_DIR
    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true })
    const files = []
    const folders = []
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue
      const fpath = path.join(targetDir, ent.name)
      const relPath = path.relative(UPLOAD_DIR, fpath)
      const stat = await fs.promises.stat(fpath)
      if (ent.isDirectory()) {
        folders.push({ name: ent.name, path: relPath, mtime: stat.mtimeMs })
      } else {
        files.push({ filename: ent.name, originalName: ent.name, relativePath: relPath, size: stat.size, mtime: stat.mtimeMs, url: `/uploads/${relPath}` })
      }
    }
    return res.json({ ok: true, files, folders })
  } catch (e) {
    console.error('Failed to list files from fs', e)
    return res.status(500).json({ ok: false, error: 'failed to list files' })
  }
})

// Delete file endpoint (supports S3+DDB)
app.delete('/api/files', async (req, res) => {
  try {
    const { path: filePath } = req.query
    if (!filePath) return res.status(400).json({ ok: false, error: 'File path required' })

    if (USE_S3 && S3 && USE_DDB && DDB) {
      try {
        const meta = await DDB.findByS3Key(filePath)
        if (!meta) return res.status(404).json({ ok: false, error: 'file metadata not found' })
        const userId = meta.userId || process.env.DEFAULT_USER_ID || 'demo-user'
        const fileId = meta.fileId
        await S3.deleteObject(meta.s3Key)
        await DDB.deleteFileMetadata(userId, fileId)
        return res.json({ ok: true })
      } catch (e) {
        console.error('S3 delete failed', e)
        return res.status(500).json({ ok: false, error: 'delete failed' })
      }
    }

    // Filesystem deletion
    const fullPath = path.join(UPLOAD_DIR, filePath)
    await fs.promises.unlink(fullPath)
    return res.json({ ok: true })
  } catch (e) {
    console.error('Delete failed:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

// Rename file endpoint (supports S3+DDB)
app.put('/api/files/rename', async (req, res) => {
  try {
    const { oldPath, newName } = req.body
    if (!oldPath || !newName) {
      return res.status(400).json({ ok: false, error: 'oldPath and newName required' })
    }

    if (USE_S3 && S3 && USE_DDB && DDB) {
      try {
        const meta = await DDB.findByS3Key(oldPath)
        if (!meta) return res.status(404).json({ ok: false, error: 'file metadata not found' })
        const userId = meta.userId || process.env.DEFAULT_USER_ID || 'demo-user'
        const fileId = meta.fileId
        const parts = oldPath.split('/').filter(Boolean)
        parts[parts.length - 1] = newName
        const destKey = parts.join('/')
        await S3.copyObject(oldPath, destKey)
        await S3.deleteObject(oldPath)
        await DDB.renameFileMetadata(userId, fileId, destKey, newName)
        const url = await S3.getPresignedUrl(destKey, 3600).catch(() => null)
        return res.json({ ok: true, name: newName, path: destKey, url })
      } catch (e) {
        console.error('S3 rename failed', e)
        return res.status(500).json({ ok: false, error: 'rename failed' })
      }
    }

    // Filesystem rename
    const oldFullPath = path.join(UPLOAD_DIR, oldPath)
    const dir = path.dirname(oldFullPath)
    const newFullPath = path.join(dir, newName)
    await fs.promises.rename(oldFullPath, newFullPath)
    const relPath = path.relative(UPLOAD_DIR, newFullPath)
    return res.json({ ok: true, name: newName, path: relPath, url: `/uploads/${relPath}` })
  } catch (e) {
    console.error('Rename failed:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

// Trash endpoints
app.get('/api/trash', async (req, res) => {
  try {
    if (USE_DDB && DDB) {
      // list items with isDeleted = true
      let items = await (async () => {
        // Reuse DDB scan but filter for isDeleted true
        const u = process.env.DEFAULT_USER_ID || 'demo-user'
        const params = { TableName: process.env.DDB_FILES_TABLE || 'Files', FilterExpression: '#uid = :u AND isDeleted = :d', ExpressionAttributeNames: { '#uid': 'userId' }, ExpressionAttributeValues: { ':u': u, ':d': true } }
        const resDb = await DDB._rawScan ? DDB._rawScan(params) : null
        // If DDB helper exposes no rawScan, fallback to listFiles and filter (less efficient)
        if (!resDb) {
          const all = await DDB.listFiles('')
          const items = (all.files || []).filter(Boolean).map(f => ({ name: f.filename, path: f.relativePath || f.filename, mtime: f.mtime, size: f.size || 0, type: f.relativePath && f.relativePath.indexOf('/') !== -1 ? 'folder' : 'file' }))
          return items
        }
        const rows = await resDb
        const itemsOut = (rows.Items || []).map(it => ({ name: it.fileName, path: it.s3Key, mtime: it.createdAt, size: it.fileSize || 0, type: (it.s3Key && it.s3Key.endsWith('/')) ? 'folder' : 'file' }))
        return itemsOut
      })()

      // Deduplicate items by `path` (keep newest by mtime)
      try {
        const map = new Map()
        for (const it of items) {
          const p = it.path || it.s3Key || it.relativePath || it.name
          if (!p) continue
          const existing = map.get(p)
          const itMtime = it.mtime ? new Date(it.mtime).getTime() : 0
          const exMtime = existing && existing.mtime ? new Date(existing.mtime).getTime() : 0
          if (!existing || itMtime > exMtime) map.set(p, it)
        }
        items = Array.from(map.values())
      } catch (e) {
        console.warn('trash dedupe failed', e && e.message)
      }

      return res.json({ ok: true, items })
    }
    return res.json({ ok: true, items: [] })
  } catch (e) {
    console.error('trash list failed', e)
    return res.status(500).json({ ok: false, error: 'failed to list trash' })
  }
})

app.post('/api/trash/restore', async (req, res) => {
  try {
    const { path: filePath } = req.body || {}
    if (!filePath) return res.status(400).json({ ok: false, error: 'path required' })
    if (USE_DDB && DDB) {
      const meta = await DDB.findByS3Key(filePath)
      if (!meta) return res.status(404).json({ ok: false, error: 'not found' })
      await DDB.renameFileMetadata(meta.userId || process.env.DEFAULT_USER_ID || 'demo-user', meta.fileId, meta.s3Key, meta.fileName) // noop update to ensure item exists
      // set isDeleted = false
      await ddbUpdateIsDeletedFalse(DDB, meta.userId || process.env.DEFAULT_USER_ID || 'demo-user', meta.fileId)
      return res.json({ ok: true })
    }
    return res.status(501).json({ ok: false, error: 'not supported' })
  } catch (e) {
    console.error('trash restore failed', e)
    return res.status(500).json({ ok: false, error: 'restore failed' })
  }
})

app.delete('/api/trash', async (req, res) => {
  try {
    const filePath = req.query.path || req.body && req.body.path
    if (!filePath) return res.status(400).json({ ok: false, error: 'path required' })
    if (USE_DDB && DDB && S3) {
      const meta = await DDB.findByS3Key(filePath)
      if (!meta) return res.status(404).json({ ok: false, error: 'not found' })
      await S3.deleteObject(meta.s3Key)
      // permanently remove item from DDB
      try {
        await DDB._rawDelete ? DDB._rawDelete({ TableName: process.env.DDB_FILES_TABLE || 'Files', Key: { userId: meta.userId, fileId: meta.fileId } }) : await (async () => { /* best-effort */ return true })()
      } catch (e) { /* ignore */ }
      return res.json({ ok: true })
    }
    return res.status(501).json({ ok: false, error: 'not supported' })
  } catch (e) {
    console.error('trash delete failed', e)
    return res.status(500).json({ ok: false, error: 'delete failed' })
  }
})

// Download/preview a trashed item (returns presigned URL or local path)
app.get('/api/trash/download', async (req, res) => {
  try {
    const p = req.query.path || ''
    if (!p) return res.status(400).json({ ok: false, error: 'path required' })

    if (USE_DDB && DDB) {
      const meta = await DDB.findByS3Key(p)
      if (!meta) return res.status(404).json({ ok: false, error: 'not found' })
      // always generate a fresh presigned URL when S3 is available (stored urls may expire)
      let url = null
      if (S3) {
        try {
          url = await S3.getPresignedUrl(meta.s3Key, 3600)
        } catch (e) {
          // fallback to stored url if presign fails
          url = meta.url || null
        }
      } else {
        url = meta.url || null
      }
      return res.json({ ok: true, url })
    }

    // Filesystem fallback: serve static uploads path
    const full = path.join(UPLOAD_DIR, p)
    if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: 'not found' })
    return res.json({ ok: true, url: `/uploads/${p}` })
  } catch (e) {
    console.error('trash download failed', e)
    return res.status(500).json({ ok: false, error: 'download failed' })
  }
})

// Empty trash (permanently delete all items marked isDeleted)
app.post('/api/trash/empty', async (req, res) => {
  try {
    if (!(USE_DDB && DDB && S3)) return res.status(501).json({ ok: false, error: 'not supported' })
    // attempt to scan for deleted items
    const params = { TableName: process.env.DDB_FILES_TABLE || 'Files', FilterExpression: '#uid = :u AND isDeleted = :d', ExpressionAttributeNames: { '#uid': 'userId' }, ExpressionAttributeValues: { ':u': process.env.DEFAULT_USER_ID || 'demo-user', ':d': true } }
    const resDb = await (DDB._rawScan ? DDB._rawScan(params) : null)
    const rows = resDb ? (await resDb).Items || [] : []
    for (const it of rows) {
      try {
        if (it.s3Key && S3) await S3.deleteObject(it.s3Key)
      } catch (e) { /* ignore */ }
      try {
        if (DDB._rawDelete) await DDB._rawDelete({ TableName: process.env.DDB_FILES_TABLE || 'Files', Key: { userId: it.userId, fileId: it.fileId } })
      } catch (e) { /* ignore */ }
    }
    return res.json({ ok: true, deleted: rows.length })
  } catch (e) {
    console.error('empty trash failed', e)
    return res.status(500).json({ ok: false, error: 'empty failed' })
  }
})

// helper to update isDeleted = false using DDB UpdateCommand via internal helper if present
async function ddbUpdateIsDeletedFalse(DDBhelper, userId, fileId) {
  try {
    if (DDBhelper.updateIsDeleted == null) {
      // attempt raw UpdateCommand via underlying client if available
      if (DDBhelper._rawUpdate) return await DDBhelper._rawUpdate({ TableName: process.env.DDB_FILES_TABLE || 'Files', Key: { userId, fileId }, UpdateExpression: 'SET isDeleted = :f', ExpressionAttributeValues: { ':f': false } })
      // otherwise use renameFileMetadata as fallback to perform an update setting isDeleted false
      return await DDBhelper.putFileMetadata({ userId, fileId, s3Key: (await DDBhelper.getFileMetadata(userId, fileId)).s3Key, fileName: (await DDBhelper.getFileMetadata(userId, fileId)).fileName, fileSize: (await DDBhelper.getFileMetadata(userId, fileId)).fileSize, fileType: (await DDBhelper.getFileMetadata(userId, fileId)).fileType, folderId: (await DDBhelper.getFileMetadata(userId, fileId)).folderId, createdAt: (await DDBhelper.getFileMetadata(userId, fileId)).createdAt, isDeleted: false })
    }
    return await DDBhelper.updateIsDeleted(userId, fileId, false)
  } catch (e) {
    throw e
  }
}

// Create folder endpoint
app.post('/api/folders', async (req, res) => {
  try {
    const { name, parentPath = '' } = req.body || {}
    if (!name) return res.status(400).json({ ok: false, error: 'Folder name required' })

    if (USE_DDB && DDB) {
      try {
        // Use server/db.js createFolder which manages folder table
        const db = require('./db')
        const userId = process.env.DEFAULT_USER_ID || 'demo-user'
        const folder = await db.createFolder(userId, name, parentPath || null)
        return res.json({ ok: true, name: folder.name, path: folder.folderId, folder })
      } catch (e) {
        console.error('DDB create folder failed', e)
        return res.status(500).json({ ok: false, error: 'create folder failed' })
      }
    }

    // Filesystem fallback: create directory under UPLOAD_DIR
    const fullPath = path.join(UPLOAD_DIR, parentPath || '', name)
    await fs.promises.mkdir(fullPath, { recursive: true })
    return res.json({ ok: true, name, path: path.join(parentPath || '', name) })
  } catch (e) {
    console.error('Create folder failed', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Development helper: set a passwordless session cookie for the cloud admin user.
// Only enabled when not in production to avoid accidental exposure.
app.get('/dev/impersonate-cloud-admin', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'forbidden' })
  const username = 'cloud-admin'
  try {
    res.cookie('AUTH_USER', encodeURIComponent(username), COOKIE_OPTIONS)
  } catch (e) {
    console.warn('failed to set cookie', e && e.message)
  }
  return res.json({ ok: true, user: username })
})

// Development helper: clear the impersonation cookie
app.get('/dev/clear-impersonation', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'forbidden' })
  try { res.clearCookie && res.clearCookie('AUTH_USER', COOKIE_OPTIONS) } catch (e) {}
  return res.json({ ok: true })
})

// Also allow POST versions so middleware that redirects GETs won't block the call.
app.post('/dev/impersonate-cloud-admin', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'forbidden' })
  const username = 'cloud-admin'
  try {
    res.cookie('AUTH_USER', encodeURIComponent(username), COOKIE_OPTIONS)
  } catch (e) {}
  return res.json({ ok: true, user: username })
})

app.post('/dev/clear-impersonation', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'forbidden' })
  try { res.clearCookie && res.clearCookie('AUTH_USER', COOKIE_OPTIONS) } catch (e) {}
  return res.json({ ok: true })
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))
