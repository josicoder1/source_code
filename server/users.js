const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const FILE = path.join(__dirname, 'users.json')

function load() {
  try {
    if (!fs.existsSync(FILE)) return []
    const raw = fs.readFileSync(FILE, 'utf8')
    return JSON.parse(raw || '[]')
  } catch (e) {
    return []
  }
}

function save(users) {
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2), 'utf8')
}

function genSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function hashPassword(password, salt) {
  const derived = crypto.pbkdf2Sync(String(password), String(salt), 100000, 64, 'sha512')
  return derived.toString('hex')
}

function findUser(username) {
  const users = load()
  return users.find((u) => u.username === username)
}

function validateUser(username, password) {
  const u = findUser(username)
  if (!u || !u.salt || !u.hash) return null
  const h = hashPassword(password, u.salt)
  if (h !== u.hash) return null
  // return safe user object
  return { username: u.username, role: u.role || 'user', email: u.email || null }
}

function createUser({ username, password, role = 'user', email = null, active = false }) {
  if (!username || !password) throw new Error('username and password required')
  username = String(username)
  const users = load()
  if (users.find((u) => u.username === username)) throw new Error('user exists')
  const salt = genSalt()
  const hash = hashPassword(password, salt)
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  const user = { id, username, salt, hash, role: role || 'user', email, active: !!active }
  users.push(user)
  save(users)
  return { id: user.id, username: user.username, role: user.role, email: user.email, active: user.active }
}

// ensure a default admin exists for demo
(function ensureDefaultAdmin() {
  try {
    const users = load()
    if (!users.find((u) => u.username === 'admin')) {
      const salt = genSalt()
      const hash = hashPassword('password', salt)
      users.push({ id: 'admin', username: 'admin', salt, hash, role: 'admin', email: 'admin@example.com', active: true })
      save(users)
    }
  } catch (e) {
    // ignore
  }
})()

module.exports = { load, save, findUser, validateUser, createUser }
