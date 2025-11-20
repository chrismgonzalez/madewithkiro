#!/bin/bash

# Setup environment variables from CloudFormation outputs
# Usage: ./scripts/setup-env.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="madewithkiro-${ENVIRONMENT}"

echo "🔍 Fetching CloudFormation outputs for ${STACK_NAME}..."

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
    echo "❌ Stack ${STACK_NAME} not found. Deploy first with: make deploy-${ENVIRONMENT}"
    exit 1
fi

# Get outputs
API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
COGNITO_DOMAIN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' --output text)
REGION=$(aws configure get region || echo "us-east-1")

# Create .env file
ENV_FILE=".env.${ENVIRONMENT}"

echo "📝 Creating ${ENV_FILE}..."

cat > "$ENV_FILE" << EOF
# AWS Configuration for ${ENVIRONMENT}
VITE_API_URL=${API_URL}
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${CLIENT_ID}
VITE_COGNITO_DOMAIN=${COGNITO_DOMAIN}
VITE_AWS_REGION=${REGION}

# Environment
VITE_ENVIRONMENT=${ENVIRONMENT}
EOF

echo "✅ Environment file created: ${ENV_FILE}"
echo ""
echo "📋 Configuration:"
echo "  API URL: ${API_URL}"
echo "  User Pool ID: ${USER_POOL_ID}"
echo "  Client ID: ${CLIENT_ID}"
echo "  Cognito Domain: ${COGNITO_DOMAIN}"
echo "  Region: ${REGION}"
echo ""
echo "💡 To use this configuration:"
echo "  cp ${ENV_FILE} .env.local"
echo ""
echo "🚀 Then run: make dev"
