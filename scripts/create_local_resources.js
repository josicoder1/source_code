const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3')
const { DynamoDBClient, CreateTableCommand, ListTablesCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb')

async function ensureBucket(s3, bucketName) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }))
    console.log('Bucket exists:', bucketName)
    return
  } catch (e) {
    console.log('Creating bucket:', bucketName)
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }))
    console.log('Bucket created:', bucketName)
  }
}

async function ensureTable(ddb, tableName, params) {
  const list = await ddb.send(new ListTablesCommand({}))
  if (list.TableNames && list.TableNames.includes(tableName)) {
    console.log('Table exists:', tableName)
    return
  }
  console.log('Creating table:', tableName)
  await ddb.send(new CreateTableCommand(Object.assign({ TableName: tableName }, params)))
  // wait for creation
  let ok = false
  for (let i = 0; i < 10; i++) {
    try {
      const desc = await ddb.send(new DescribeTableCommand({ TableName: tableName }))
      if (desc.Table && desc.Table.TableStatus === 'ACTIVE') { ok = true; break }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000))
  }
  if (!ok) throw new Error('table creation timed out: ' + tableName)
  console.log('Table created and active:', tableName)
}

async function main() {
  const REGION = process.env.AWS_REGION || 'us-east-1'
  const S3_ENDPOINT = process.env.MINIO_ENDPOINT || process.env.AWS_ENDPOINT || null
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
  const BUCKET = process.env.S3_BUCKET || 'local-bucket'
  const FILES_TABLE = process.env.DDB_FILES_TABLE || 'Files'
  const USERS_TABLE = process.env.DDB_USERS_TABLE || 'Users'
  const FOLDERS_TABLE = process.env.DDB_FOLDERS_TABLE || 'Folders'

  const s3Options = { region: REGION }
  if (S3_ENDPOINT) {
    s3Options.endpoint = S3_ENDPOINT
    s3Options.forcePathStyle = true
  }
  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) s3Options.credentials = { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }

  const s3 = new S3Client(s3Options)
  const ddbOptions = { region: REGION }
  if (process.env.AWS_ENDPOINT) ddbOptions.endpoint = process.env.AWS_ENDPOINT
  const ddb = new DynamoDBClient(ddbOptions)

  try {
    await ensureBucket(s3, BUCKET)
  } catch (e) {
    console.error('Bucket creation error:', e && e.message)
    process.exit(1)
  }

  try {
    await ensureTable(ddb, USERS_TABLE, {
      AttributeDefinitions: [{ AttributeName: 'username', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'username', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST'
    })

    await ensureTable(ddb, FILES_TABLE, {
      AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }, { AttributeName: 'fileId', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }, { AttributeName: 'fileId', KeyType: 'RANGE' }],
      BillingMode: 'PAY_PER_REQUEST'
    })
    await ensureTable(ddb, FOLDERS_TABLE, {
      AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }, { AttributeName: 'folderId', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }, { AttributeName: 'folderId', KeyType: 'RANGE' }],
      BillingMode: 'PAY_PER_REQUEST'
    })
  } catch (e) {
    console.error('Table creation error:', e && e.message)
    process.exit(1)
  }

  console.log('All local resources ensured.')
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1) })
}

module.exports = { main }
