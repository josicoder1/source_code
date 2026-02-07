#!/usr/bin/env node
// Script: create_default_cloud_user.js
// Creates a user using server/aws/dynamo.js createUser helper.
// Usage example:
// USE_DDB=1 AWS_ENDPOINT=http://localhost:8000 DDB_USERS_TABLE=Users USERNAME=cloud-admin PASSWORD=SuperSecret123 ROLE=admin node scripts/create_default_cloud_user.js

(async function(){
  try {
    const DDB = require('../server/aws/dynamo')
    const username = process.env.USERNAME || 'cloud-admin'
    const password = process.env.PASSWORD || 'password'
    const role = process.env.ROLE || 'admin'
    const email = process.env.EMAIL || null
    if (!process.env.USE_DDB) console.warn('Note: USE_DDB not set; attempting to call DDB helper anyway')
    console.log('Creating user:', username)
    const user = await DDB.createUser({ username, password, role, email, active: true })
    console.log('User created:')
    console.log(JSON.stringify(user, null, 2))
  } catch (e) {
    console.error('Failed to create user:', e && e.message)
    process.exit(1)
  }
})()
