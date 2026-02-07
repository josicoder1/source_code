#!/usr/bin/env bash
set -euo pipefail

MINIO_ENDPOINT=${MINIO_ENDPOINT:-http://localhost:9000}
AWS_ENDPOINT=${AWS_ENDPOINT:-http://localhost:8000}
REGION=${AWS_REGION:-us-east-1}
BUCKET=${S3_BUCKET:-local-bucket}
TABLE=${DDB_FILES_TABLE:-Files}

# wait for services
sleep 2

echo "Creating MinIO bucket ${BUCKET}..."
# use awscli with s3 endpoint
aws --endpoint-url "${MINIO_ENDPOINT}" s3 mb "s3://${BUCKET}" || true

echo "Creating DynamoDB table ${TABLE}..."
aws --endpoint-url "${AWS_ENDPOINT}" dynamodb create-table \
  --table-name "${TABLE}" \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=fileId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=fileId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region "${REGION}" || true

echo "Done."
