#!/bin/bash
set -e

# Frontend deployment script for S3 + CloudFront
# Uploads build files and creates CloudFront invalidation
#
# Required environment variables:
#   FRONTEND_BUCKET - S3 bucket name (from CloudFormation stack output)
#   CLOUDFRONT_CDN_ID - CloudFront distribution ID (from CloudFormation stack output)
#   AWS_REGION - AWS region (passed from Jenkinsfile)

AWS_REGION="${AWS_REGION:-us-east-1}"

echo "Starting frontend deployment..."
echo "AWS Region: $AWS_REGION"

# Validate required environment variables
if [ -z "$FRONTEND_BUCKET" ]; then
    echo "Error: FRONTEND_BUCKET environment variable is not set"
    exit 1
fi

if [ -z "$CLOUDFRONT_CDN_ID" ]; then
    echo "Error: CLOUDFRONT_CDN_ID environment variable is not set"
    exit 1
fi

echo "Target S3 bucket: $FRONTEND_BUCKET"
echo "CloudFront distribution: $CLOUDFRONT_CDN_ID"

# ============================================================
# STEP 1: Detect build output folder
# ============================================================
BUILD_DIR=""
if [ -d "dist/onecgiar-pr-client/browser" ]; then
    BUILD_DIR="dist/onecgiar-pr-client/browser"
elif [ -d "dist/onecgiar-pr-client" ]; then
    BUILD_DIR="dist/onecgiar-pr-client"
elif [ -d "dist" ]; then
    BUILD_DIR="dist"
elif [ -d "build" ]; then
    BUILD_DIR="build"
else
    echo "Error: No build output folder found (dist/ or build/)"
    exit 1
fi

echo "Using build directory: $BUILD_DIR"

# ============================================================
# STEP 2: Upload files with appropriate cache headers
# ============================================================
echo "Uploading to S3..."

# Upload index.html with no-cache headers
echo "Uploading index.html (no-cache)..."
aws s3 cp "$BUILD_DIR/index.html" "s3://$FRONTEND_BUCKET/index.html" \
    --region "$AWS_REGION" \
    --cache-control "max-age=0,no-cache,no-store,must-revalidate" \
    --content-type "text/html"

# Sync JSON files with no-cache
echo "Uploading JSON files (no-cache)..."
aws s3 sync "$BUILD_DIR" "s3://$FRONTEND_BUCKET/" \
    --region "$AWS_REGION" \
    --exclude "*" \
    --include "*.json" \
    --cache-control "max-age=0,no-cache,no-store,must-revalidate"

# Upload all other assets with long cache (hashed files)
echo "Uploading assets (long cache)..."
aws s3 sync "$BUILD_DIR" "s3://$FRONTEND_BUCKET/" \
    --region "$AWS_REGION" \
    --exclude "index.html" \
    --exclude "*.json" \
    --cache-control "max-age=31536000,immutable" \
    --delete

echo "S3 sync completed"

# ============================================================
# STEP 3: Create CloudFront invalidation
# ============================================================
echo "Creating CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_CDN_ID" \
    --paths "/*" \
    --region "$AWS_REGION" \
    --query 'Invalidation.Id' \
    --output text)

echo "CloudFront invalidation created: $INVALIDATION_ID"
echo "Frontend deployment completed successfully"
