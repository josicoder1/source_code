#!/usr/bin/env node
// migrate existing users.json and uploads/ to DynamoDB and S3
const fs = require('fs')
const path = require('path')
const USERS_FILE = path.join(__dirname, '..', 'server', 'users.json')
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

async function main() {
  const AWS = require('../server/aws/dynamo')
  const S3 = require('../server/aws/s3')
  console.log('Starting migration...')
  if (!fs.existsSync(USERS_FILE)) {
    console.log('No users.json found, skipping users migration')
  } else {
    const raw = fs.readFileSync(USERS_FILE,'utf8')
    const users = JSON.parse(raw || '[]')
    for (const u of users) {
      try {
        // use the new migration helper to preserve password hashes
        await AWS.createMigratedUser(u)
        console.log('Migrated user', u.username)
      } catch (e) {
        console.error('Failed migrate user', u.username, e.message)
      }
    }
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('No uploads directory found, skipping uploads migration')
    return
  }

  const walk = (dir) => {
    const results = []
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const ent of entries) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        results.push(...walk(full))
      } else if (ent.isFile()) {
        results.push(full)
      }
    }
    return results
  }

  const files = walk(UPLOADS_DIR)
  console.log('Found', files.length, 'files to upload to S3')
  for (const f of files) {
    const rel = path.relative(UPLOADS_DIR, f).split(path.sep).join('/')
    const key = rel
    try {
      const buffer = fs.readFileSync(f)
      await S3.uploadBuffer(buffer, key)
      console.log('Uploaded', rel)
    } catch (e) {
      console.error('Failed upload', f, e.message)
    }
  }
  console.log('Migration complete')
}

main().catch((e) => { console.error(e); process.exit(1) })
