# Cloud based file storage App

Quick start

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm start
```

The project uses `craco` for configuration; the dev server runs on http://localhost:3000 by default.

Notes

- Node.js >= 18 is recommended (see `package.json`).
- To build for production: `npm run build`.
- To run tests: `npm test`.

If you want, I can open the app in your browser or commit these changes for you.

AWS Migration / Cloud Mode
-------------------------

This project can run in two modes:

- Default (local): files stored under the `uploads/` folder and users stored in a local JSON file.
- Cloud mode: file blobs in S3 and metadata/users in DynamoDB.

To enable cloud mode, set one or both environment flags when starting the server:

```bash
USE_S3=1 USE_DDB=1 npm start
```

Required environment variables (examples):

- `AWS_REGION` — e.g. `us-east-1`
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET` — the bucket to store file objects
- `DDB_USERS_TABLE` — DynamoDB table name for users (partition key: `username`)
- `DDB_FILES_TABLE` — DynamoDB table name for file metadata (partition key: `key`)

Quick AWS CLI commands to create basic resources (example):

```bash
# create an S3 bucket
aws s3api create-bucket --bucket my-app-bucket --region us-east-1 --create-bucket-configuration LocationConstraint=us-east-1

# create DynamoDB tables (simple examples)
aws dynamodb create-table --table-name Users --attribute-definitions AttributeName=username,AttributeType=S --key-schema AttributeName=username,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

aws dynamodb create-table --table-name Files --attribute-definitions AttributeName=key,AttributeType=S --key-schema AttributeName=key,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

Migration
---------

We included a migration helper: `scripts/migrate-to-aws.js` which will attempt to:

- import users from `server/users.json` (if present) into DynamoDB (new accounts will be created with a placeholder password — you should force password resets for migrated users),
- upload files under `uploads/` to the configured S3 bucket and write metadata records to the `Files` DynamoDB table.

Run the migration with AWS credentials available in your environment:

```bash
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=... S3_BUCKET=my-app-bucket DDB_USERS_TABLE=Users DDB_FILES_TABLE=Files node scripts/migrate-to-aws.js
```

Notes / Caveats
---------------

- The migration writes new password hashes using a placeholder password; ensure users reset passwords after migration.
- This code keeps the local filesystem behavior as a fallback; enable `USE_S3=1` and `USE_DDB=1` when you're ready to switch.
- For production, use a proper session store (Redis) or replace sessions with signed JWTs and secure cookie settings.

If you'd like, I can add a script that creates the DynamoDB tables and bucket via the AWS SDK, or wire a safer password-migration flow.
