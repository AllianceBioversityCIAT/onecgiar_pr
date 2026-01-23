#!/bin/bash
set -e

# Generates environment.prod.ts from AWS Secrets Manager
#
# Supports two secret formats:
#   1. JSON object: { "apiBaseUrl": "...", ... }
#   2. TypeScript content: export const environment = { ... };
#
# Required environment variables:
#   AWS_REGION - AWS region (passed from Jenkinsfile)
#   FRONTEND_SECRET_ID - Secret ID in AWS Secrets Manager (passed from Jenkinsfile)

AWS_REGION="${AWS_REGION:-us-east-1}"
FRONTEND_SECRET_ID="${FRONTEND_SECRET_ID:-test/test/frontend/prms/test}"

echo "Fetching frontend environment from AWS Secrets Manager..."
echo "Secret ID: $FRONTEND_SECRET_ID"
echo "Region: $AWS_REGION"

# Fetch secret from AWS Secrets Manager
SECRET_CONTENT=$(aws secretsmanager get-secret-value \
    --secret-id "$FRONTEND_SECRET_ID" \
    --query SecretString \
    --output text \
    --region "$AWS_REGION")

if [ -z "$SECRET_CONTENT" ]; then
    echo "Error: Failed to fetch secret from AWS Secrets Manager"
    exit 1
fi

# Generate environment.prod.ts
ENV_FILE="src/environments/environment.prod.ts"

echo "Generating $ENV_FILE..."

# Detect format: JSON starts with { or [, TypeScript starts with // or export
FIRST_CHAR=$(echo "$SECRET_CONTENT" | head -c 1)
FIRST_WORD=$(echo "$SECRET_CONTENT" | head -c 10)

if [[ "$FIRST_CHAR" == "{" ]] || [[ "$FIRST_CHAR" == "[" ]]; then
    echo "Detected JSON format, converting to TypeScript..."
    
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
" "$SECRET_CONTENT" > "$ENV_FILE"

elif [[ "$FIRST_WORD" == "//"* ]] || [[ "$SECRET_CONTENT" == *"export const"* ]] || [[ "$SECRET_CONTENT" == *"export {"* ]]; then
    echo "Detected TypeScript format, using directly..."
    
    # Write TypeScript content directly, ensuring production: true
    node -e "
let content = process.argv[1];

// Add header if not present
if (!content.includes('AUTO-GENERATED')) {
    content = '// THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY\n// Generated from AWS Secrets Manager\n\n' + content;
}

// Ensure production is true (replace production: false with production: true)
content = content.replace(/production\s*:\s*false/g, 'production: true');

// If production is not set, add it after 'environment = {'
if (!content.includes('production')) {
    content = content.replace(/(export const environment\s*=\s*\{)/, '\$1\n  production: true,');
}

console.log(content);
" "$SECRET_CONTENT" > "$ENV_FILE"

else
    echo "Error: Unknown secret format. Expected JSON or TypeScript."
    echo "First 100 characters of secret:"
    echo "$SECRET_CONTENT" | head -c 100
    exit 1
fi

echo "Environment file generated successfully: $ENV_FILE"
