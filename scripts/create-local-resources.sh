#!/usr/bin/env bash
set -euo pipefail

AWS_ENDPOINT=${AWS_ENDPOINT:-http://localhost:4566}
REGION=${AWS_REGION:-us-east-1}
TABLE=${DDB_FILES_TABLE:-Files}
BUCKET=${S3_BUCKET:-local-bucket}

echo "Using endpoint: ${AWS_ENDPOINT} region: ${REGION}"

echo "Creating S3 bucket ${BUCKET}..."
aws --endpoint-url "${AWS_ENDPOINT}" s3 mb "s3://${BUCKET}" --region "${REGION}" || true

echo "Creating DynamoDB table ${TABLE}..."
aws --endpoint-url "${AWS_ENDPOINT}" dynamodb create-table \
  --table-name "${TABLE}" \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=fileId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=fileId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region "${REGION}" || true

echo "Done."
