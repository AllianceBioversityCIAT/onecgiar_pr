#!/bin/bash
set -e

# Generates environment.prod.ts from AWS Secrets Manager
#
# The secret should contain the environment object as JSON (same structure as environment.ts)
# The script will set production: true automatically
#
# Required environment variables:
#   AWS_REGION - AWS region (defaults to us-east-1)
#
# Optional environment variables:
#   FRONTEND_SECRET_ID - Secret ID in AWS Secrets Manager (defaults to prod/app/frontend/prms/reportingtool)

AWS_REGION="${AWS_REGION:-us-east-1}"
FRONTEND_SECRET_ID="${FRONTEND_SECRET_ID:-test/test/test}"

echo "Fetching frontend environment from AWS Secrets Manager..."

# Fetch secret from AWS Secrets Manager
SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$FRONTEND_SECRET_ID" \
    --query SecretString \
    --output text \
    --region "$AWS_REGION")

if [ -z "$SECRET_JSON" ]; then
    echo "Error: Failed to fetch secret from AWS Secrets Manager"
    exit 1
fi

# Generate environment.prod.ts
ENV_FILE="src/environments/environment.prod.ts"

echo "Generating $ENV_FILE..."

# Use node to parse JSON and generate TypeScript
node -e "
const secret = JSON.parse(process.argv[1]);

// Ensure production is true
secret.production = true;

// Generate TypeScript file content
const content = \`// THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated from AWS Secrets Manager

export const environment = \${JSON.stringify(secret, null, 2)};
\`;

console.log(content);
" "$SECRET_JSON" > "$ENV_FILE"

echo "Environment file generated successfully: $ENV_FILE"
