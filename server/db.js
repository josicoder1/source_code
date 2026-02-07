const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const REGION = process.env.AWS_REGION || 'us-east-1';
const USERS_TABLE = process.env.DDB_USERS_TABLE || 'Users';
const FILES_TABLE = process.env.DDB_FILES_TABLE || 'Files';
const S3_BUCKET = process.env.S3_BUCKET;

const ddbOptions = { region: REGION };
if (process.env.AWS_ENDPOINT) ddbOptions.endpoint = process.env.AWS_ENDPOINT;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ddbOptions.credentials = { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY };
const ddbClient = new DynamoDBClient(ddbOptions);
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const s3Options = { region: REGION };
const S3_ENDPOINT = process.env.MINIO_ENDPOINT || process.env.AWS_ENDPOINT;
if (S3_ENDPOINT) {
    s3Options.endpoint = S3_ENDPOINT;
    s3Options.forcePathStyle = true;
}
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) s3Options.credentials = { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY };
const s3Client = new S3Client(s3Options);

async function uploadFile(file, userId) {
    const fileId = crypto.randomUUID()
    const fileKey = `${userId}/${fileId}-${file.originalname}`

    // Check user's storage
    const { Item: user } = await ddbDocClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId },
    }));

    if (user.usedStorage + file.size > user.storageLimit) {
        throw new Error('Storage limit exceeded');
    }

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));

    // Save metadata to DynamoDB
    const fileMetadata = {
        fileId,
        userId,
        name: file.originalname,
        s3Key: fileKey,
        size: file.size,
        createdAt: new Date().toISOString(),
        isDeleted: false,
    };
    await ddbDocClient.send(new PutCommand({
        TableName: FILES_TABLE,
        Item: fileMetadata,
    }));

    // Update user's usedStorage
    await ddbDocClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET usedStorage = usedStorage + :size',
        ExpressionAttributeValues: {
            ':size': file.size,
        },
    }));

    return fileMetadata;
}

async function getFiles(userId) {
    const { Items } = await ddbDocClient.send(new QueryCommand({
        TableName: FILES_TABLE,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: 'isDeleted = :isDeleted',
        ExpressionAttributeValues: {
            ':userId': userId,
            ':isDeleted': false,
        },
    }));
    return Items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const FOLDERS_TABLE = process.env.DDB_FOLDERS_TABLE || 'Folders';
async function createFolder(userId, folderName, parentFolderId = null) {
    const folderId = crypto.randomUUID()
    const folder = {
        folderId,
        userId,
        name: folderName,
        parentFolderId,
        createdAt: new Date().toISOString(),
    };
    await ddbDocClient.send(new PutCommand({
        TableName: FOLDERS_TABLE,
        Item: folder,
    }));
    return folder;
}

const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
async function getFolders(userId) {
    const { Items } = await ddbDocClient.send(new ScanCommand({
        TableName: FOLDERS_TABLE,
        FilterExpression: '#u = :userId',
        ExpressionAttributeNames: { '#u': 'userId' },
        ExpressionAttributeValues: { ':userId': userId }
    }));
    return Items || [];
}

async function deleteFile(fileId) {
    await ddbDocClient.send(new UpdateCommand({
        TableName: FILES_TABLE,
        Key: { fileId },
        UpdateExpression: 'SET isDeleted = :isDeleted',
        ExpressionAttributeValues: {
            ':isDeleted': true,
        },
    }));
}

module.exports = {
    uploadFile,
    getFiles,
    createFolder,
    getFolders,
    deleteFile,
};
