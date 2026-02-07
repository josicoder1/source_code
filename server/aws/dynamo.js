const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')

const REGION = process.env.AWS_REGION || 'us-east-1'
const USERS_TABLE = process.env.DDB_USERS_TABLE || 'Users'
const FILES_TABLE = process.env.DDB_FILES_TABLE || 'Files'

// NEW CODE (active): allow custom endpoint for local testing (LocalStack)
const clientOptions = { region: REGION }
if (process.env.AWS_ENDPOINT) clientOptions.endpoint = process.env.AWS_ENDPOINT
const client = new DynamoDBClient(clientOptions)
const ddb = DynamoDBDocumentClient.from(client)

function genSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function hashPassword(password, salt) {
  const derived = crypto.pbkdf2Sync(String(password), String(salt), 100000, 64, 'sha512')
  return derived.toString('hex')
}

async function getUserByUsername(username) {
  const key = { username }
  try {
    const res = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: key }))
    return res.Item || null
  } catch (e) {
    throw e
  }
}

async function createUser({ id, username, password, role = 'user', email = null, active = false }) {
  const salt = genSalt()
  const hash = hashPassword(password, salt)
  const item = { id: id || (Date.now().toString(36) + Math.random().toString(36).slice(2,9)), username, salt, hash, role, email, active }
  await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: item }))
  return { id: item.id, username: item.username, role: item.role, email: item.email, active: item.active }
}

async function validateUser(username, password) {
  const u = await getUserByUsername(username)
  if (!u || !u.salt || !u.hash) return null
  const h = hashPassword(password, u.salt)
  if (h !== u.hash) return null
  return { username: u.username, role: u.role || 'user', email: u.email || null, active: !!u.active }
}

async function listUsers() {
  const res = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }))
  const items = res.Items || []
  return items.map((u) => ({ id: u.id, username: u.username, email: u.email || null, role: u.role || 'user', active: !!u.active }))
}

async function setUserActive(idOrUsername, active) {
  // attempt to find by username first
  let key = { username: idOrUsername }
  try {
    const r = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: key }))
    if (!r.Item) {
      // try by id (scan)
      const s = await ddb.send(new ScanCommand({ TableName: USERS_TABLE, FilterExpression: '#id = :id', ExpressionAttributeNames: { '#id': 'id' }, ExpressionAttributeValues: { ':id': idOrUsername } }))
      if (!s.Items || s.Items.length === 0) throw new Error('not found')
      key = { username: s.Items[0].username }
    }
    await ddb.send(new UpdateCommand({ TableName: USERS_TABLE, Key: key, UpdateExpression: 'SET #active = :a', ExpressionAttributeNames: { '#active': 'active' }, ExpressionAttributeValues: { ':a': !!active } }))
    return true
  } catch (e) {
    throw e
  }
}

async function deleteUser(idOrUsername) {
  // try get by username
  try {
    const r = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { username: idOrUsername } }))
    if (r && r.Item) {
      await ddb.send(new DeleteCommand({ TableName: USERS_TABLE, Key: { username: idOrUsername } }))
      return true
    }
    // else scan by id
    const s = await ddb.send(new ScanCommand({ TableName: USERS_TABLE, FilterExpression: '#id = :id', ExpressionAttributeNames: { '#id': 'id' }, ExpressionAttributeValues: { ':id': idOrUsername } }))
    if (!s.Items || s.Items.length === 0) return false
    const username = s.Items[0].username
    await ddb.send(new DeleteCommand({ TableName: USERS_TABLE, Key: { username } }))
    return true
  } catch (e) {
    throw e
  }
}

async function createMigratedUser(user) {
  // for migration script, assumes user has { username, salt, hash, ... }
  if (!user || !user.username || !user.salt || !user.hash) throw new Error('invalid user object for migration')
  const item = {
    id: user.id || (Date.now().toString(36) + Math.random().toString(36).slice(2,9)),
    username: user.username,
    salt: user.salt,
    hash: user.hash,
    role: user.role || 'user',
    email: user.email || null,
    active: !!user.active,
  }
  await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: item }))
  return { id: item.id, username: item.username, role: item.role, email: item.email, active: item.active }
}

module.exports = { getUserByUsername, createUser, validateUser, listUsers, setUserActive, deleteUser, createMigratedUser }

// File metadata helpers
const FILES_KEY = process.env.DDB_FILES_TABLE || FILES_TABLE

async function putFileMetadata(item) {
  // item should include: key, originalName, size, mimeType, mtime, url
  if (!item || !item.key) throw new Error('invalid item')
  await ddb.send(new PutCommand({ TableName: FILES_KEY, Item: item }))
  return item
}

async function deleteFileMetadata(key) {
  try {
    await ddb.send(new DeleteCommand({ TableName: FILES_KEY, Key: { key } }))
    return true
  } catch (e) { throw e }
}

async function getFileMetadata(key) {
  try {
    const res = await ddb.send(new GetCommand({ TableName: FILES_KEY, Key: { key } }))
    return res.Item || null
  } catch (e) {
    throw e
  }
}

async function listFiles(prefix = '') {
  // return folders and files under prefix
  const outFiles = []
  const outFolders = new Map()
  // naive scan with begins_with
  const params = {}
  if (prefix) {
    params.FilterExpression = 'begins_with(#k, :p)'
    params.ExpressionAttributeNames = { '#k': 'key' }
    params.ExpressionAttributeValues = { ':p': prefix }
  }
  params.TableName = FILES_KEY
  const res = await ddb.send(new ScanCommand(params))
  const items = res.Items || []
  for (const it of items) {
    const k = it.key || ''
    const rel = prefix ? (k.startsWith(prefix) ? k.slice(prefix.length).replace(/^\//, '') : k) : k
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0) continue
    if (parts.length === 1) {
      outFiles.push({ filename: parts[0], relativePath: k, size: it.size, mtime: it.mtime, url: it.url })
    } else {
      const folderName = parts[0]
      if (!outFolders.has(folderName)) outFolders.set(folderName, { name: folderName, path: prefix ? prefix.replace(/\/$/, '') + '/' + folderName : folderName, mtime: it.mtime })
    }
  }
  return { files: outFiles, folders: Array.from(outFolders.values()) }
}

// OLD CODE (commented)
/*
async function putFileMetadata(item) {
  // item should include: key, originalName, size, mimeType, mtime, url
  if (!item || !item.key) throw new Error('invalid item')
  await ddb.send(new PutCommand({ TableName: FILES_KEY, Item: item }))
  return item
}

async function deleteFileMetadata(key) {
  try {
    await ddb.send(new DeleteCommand({ TableName: FILES_KEY, Key: { key } }))
    return true
  } catch (e) { throw e }
}

async function getFileMetadata(key) {
  try {
    const res = await ddb.send(new GetCommand({ TableName: FILES_KEY, Key: { key } }))
    return res.Item || null
  } catch (e) {
    throw e
  }
}

async function listFiles(prefix = '') {
  // return folders and files under prefix
  const outFiles = []
  const outFolders = new Map()
  // naive scan with begins_with
  const params = {}
  if (prefix) {
    params.FilterExpression = 'begins_with(#k, :p)'
    params.ExpressionAttributeNames = { '#k': 'key' }
    params.ExpressionAttributeValues = { ':p': prefix }
  }
  params.TableName = FILES_KEY
  const res = await ddb.send(new ScanCommand(params))
  const items = res.Items || []
  for (const it of items) {
    const k = it.key || ''
    const rel = prefix ? (k.startsWith(prefix) ? k.slice(prefix.length).replace(/^\//, '') : k) : k
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0) continue
    if (parts.length === 1) {
      outFiles.push({ filename: parts[0], relativePath: k, size: it.size, mtime: it.mtime, url: it.url })
    } else {
      const folderName = parts[0]
      if (!outFolders.has(folderName)) outFolders.set(folderName, { name: folderName, path: prefix ? prefix.replace(/\/$/, '') + '/' + folderName : folderName, mtime: it.mtime })
    }
  }
  return { files: outFiles, folders: Array.from(outFolders.values()) }
}
*/

// NEW CODE (active)
// Use built-in crypto.randomUUID() instead of importing ESM-only `uuid` package
const S3Helper = require('./s3')

const FILES_TABLE_NAME = process.env.DDB_FILES_TABLE || 'Files'
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'demo-user'

async function putFileMetadata(item) {
  // Required fields: userId, fileId, fileName, fileSize, fileType, folderId, s3Key, createdAt, isDeleted
  if (!item) throw new Error('invalid item')
  const now = new Date().toISOString()
  const userId = item.userId || DEFAULT_USER_ID
  const fileId = item.fileId || crypto.randomUUID()
  const s3Key = item.s3Key || item.key || item.originalName || `${fileId}`
  const fileName = item.fileName || item.originalName || item.name || s3Key.split('/').pop()
  const fileSize = typeof item.fileSize === 'number' ? item.fileSize : (item.size || 0)
  const fileType = item.fileType || item.mimeType || 'application/octet-stream'
  const folderId = item.folderId || ''
  const isDeleted = !!item.isDeleted

  const dbItem = {
    userId,
    fileId,
    fileName,
    fileSize,
    fileType,
    folderId,
    s3Key,
    createdAt: item.createdAt || now,
    isDeleted,
    // preserve original url if included
    url: item.url || null,
  }

  await ddb.send(new PutCommand({ TableName: FILES_TABLE_NAME, Item: dbItem }))
  return dbItem
}

async function getFileMetadata(userId, fileId) {
  const u = userId || DEFAULT_USER_ID
  try {
    const res = await ddb.send(new GetCommand({ TableName: FILES_TABLE_NAME, Key: { userId: u, fileId } }))
    return res.Item || null
  } catch (e) { throw e }
}

async function deleteFileMetadata(userId, fileId) {
  // Soft delete: set isDeleted = true
  const u = userId || DEFAULT_USER_ID
  try {
    await ddb.send(new UpdateCommand({ TableName: FILES_TABLE_NAME, Key: { userId: u, fileId }, UpdateExpression: 'SET isDeleted = :d', ExpressionAttributeValues: { ':d': true } }))
    return true
  } catch (e) { throw e }
}

async function listFiles(prefix = '') {
  // List files for DEFAULT_USER_ID, return { files, folders } matching previous API shape
  const u = DEFAULT_USER_ID
  // Use Scan with FilterExpression on userId and isDeleted
  const params = { TableName: FILES_TABLE_NAME, FilterExpression: '#uid = :u AND isDeleted = :d', ExpressionAttributeNames: { '#uid': 'userId' }, ExpressionAttributeValues: { ':u': u, ':d': false } }
  if (prefix) {
    // prefix should match start of s3Key
    params.FilterExpression += ' AND begins_with(s3Key, :p)'
    params.ExpressionAttributeValues[':p'] = prefix
  }

  const res = await ddb.send(new ScanCommand(params))
  const items = res.Items || []

  const outFiles = []
  const outFolders = new Map()
  for (const it of items) {
    const k = it.s3Key || ''
    const rel = prefix ? (k.startsWith(prefix) ? k.slice(prefix.length).replace(/^\//, '') : k) : k
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0) continue
    if (parts.length === 1) {
      // generate a presigned url for frontend to download if url not present
      let url = it.url || null
      if (!url) {
        try { url = await S3Helper.getPresignedUrl(k, 3600) } catch (e) { url = null }
      }
      outFiles.push({ filename: parts[0], relativePath: k, size: it.fileSize, mtime: it.createdAt, url })
    } else {
      const folderName = parts[0]
      if (!outFolders.has(folderName)) outFolders.set(folderName, { name: folderName, path: prefix ? (prefix.replace(/\/$/, '') + '/' + folderName) : folderName, mtime: it.createdAt })
    }
  }
  return { files: outFiles, folders: Array.from(outFolders.values()) }
}

module.exports = Object.assign(module.exports, { putFileMetadata, deleteFileMetadata, listFiles, getFileMetadata })

// Find a file item by its s3Key (scans table) - returns the first match
async function findByS3Key(s3Key) {
  if (!s3Key) return null
  const params = { TableName: FILES_TABLE_NAME, FilterExpression: '#k = :k', ExpressionAttributeNames: { '#k': 's3Key' }, ExpressionAttributeValues: { ':k': s3Key } }
  const res = await ddb.send(new ScanCommand(params))
  const items = res.Items || []
  return items.length ? items[0] : null
}

// Rename file metadata (update s3Key and fileName)
async function renameFileMetadata(userId, fileId, newS3Key, newFileName) {
  const u = userId || DEFAULT_USER_ID
  try {
    const update = { TableName: FILES_TABLE_NAME, Key: { userId: u, fileId } }
    const expr = []
    const names = {}
    const values = {}
    if (newS3Key) { expr.push('#s = :s'); names['#s'] = 's3Key'; values[':s'] = newS3Key }
    if (newFileName) { expr.push('#n = :n'); names['#n'] = 'fileName'; values[':n'] = newFileName }
    if (expr.length === 0) throw new Error('nothing to update')
    update.UpdateExpression = 'SET ' + expr.join(', ')
    update.ExpressionAttributeNames = names
    update.ExpressionAttributeValues = values
    await ddb.send(new UpdateCommand(update))
    return true
  } catch (e) { throw e }
}

module.exports = Object.assign(module.exports, { findByS3Key, renameFileMetadata })

// expose low-level helpers for server-side operations
async function _rawScan(params) {
  return await ddb.send(new ScanCommand(params))
}
async function _rawDelete(params) {
  return await ddb.send(new DeleteCommand(params))
}

module.exports = Object.assign(module.exports, { _rawScan, _rawDelete })

