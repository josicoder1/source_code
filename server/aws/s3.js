const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const path = require('path')

const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET = process.env.S3_BUCKET || 'my-app-bucket'
// Prefer MINIO_ENDPOINT (for MinIO) else AWS_ENDPOINT (LocalStack or AWS)
const S3_ENDPOINT = process.env.MINIO_ENDPOINT || process.env.AWS_ENDPOINT || null

// Support custom endpoint (LocalStack or MinIO) and path-style addressing
const s3ClientOptions = { region: REGION }
if (S3_ENDPOINT) {
  s3ClientOptions.endpoint = S3_ENDPOINT
  s3ClientOptions.forcePathStyle = true
}

// If explicit credentials provided (useful for MinIO), pass them
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3ClientOptions.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
}

const s3 = new S3Client(s3ClientOptions)

async function uploadBuffer(buffer, key, contentType) {
  try {
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType, ContentLength: Buffer.isBuffer(buffer) ? buffer.length : undefined })
    const res = await s3.send(cmd)
    return res
  } catch (e) {
    console.error('S3 uploadBuffer error:', e && e.message ? e.message : e)
    throw e
  }
}

async function getPresignedUrl(key, expiresSeconds = 3600) {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    return await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds })
  } catch (e) {
    console.warn('S3 getPresignedUrl failed:', e && e.message ? e.message : e)
    throw e
  }
}

async function deleteObject(key) {
  const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  return await s3.send(cmd)
}

async function copyObject(srcKey, destKey) {
  const copySource = `${BUCKET}/${srcKey}`
  const cmd = new CopyObjectCommand({ Bucket: BUCKET, CopySource: copySource, Key: destKey })
  return await s3.send(cmd)
}

async function getObjectStream(key) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  const res = await s3.send(cmd)
  // res.Body is a stream (Readable) in Node.js
  return res.Body
}

function normalizeKey(p) {
  if (!p) return ''
  // ensure no leading slash and trim whitespace
  const s = String(p).trim()
  return s.startsWith('/') ? s.slice(1) : s
}

module.exports = { uploadBuffer, getPresignedUrl, normalizeKey, deleteObject, copyObject, getObjectStream }
