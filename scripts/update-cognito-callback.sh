#!/bin/bash

# Script to update Cognito callback URL with CloudFront distribution URL
# Usage: ./scripts/update-cognito-callback.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="madewithkiro-${ENVIRONMENT}"

echo "🔍 Fetching CloudFront distribution URL for ${ENVIRONMENT}..."

# Get CloudFront domain name from stack outputs
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$CLOUDFRONT_URL" ] || [ "$CLOUDFRONT_URL" == "None" ]; then
  echo "❌ CloudFront URL not found. Make sure the stack is deployed."
  exit 1
fi

echo "✅ Found CloudFront URL: ${CLOUDFRONT_URL}"
echo ""
echo "📝 Update your samconfig.toml with this callback URL:"
echo ""
echo "  CognitoCallbackURL=${CLOUDFRONT_URL}"
echo ""
echo "Then redeploy with: make deploy-${ENVIRONMENT}"
echo ""

# Optionally update samconfig.toml automatically
read -p "Would you like to automatically update samconfig.toml? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Backup samconfig.toml
  cp samconfig.toml samconfig.toml.backup
  echo "✅ Backed up samconfig.toml to samconfig.toml.backup"
  
  # Update the callback URL in samconfig.toml
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|CognitoCallbackURL=http://localhost:5173|CognitoCallbackURL=${CLOUDFRONT_URL}|g" samconfig.toml
  else
    # Linux
    sed -i "s|CognitoCallbackURL=http://localhost:5173|CognitoCallbackURL=${CLOUDFRONT_URL}|g" samconfig.toml
  fi
  
  echo "✅ Updated samconfig.toml with CloudFront URL"
  echo ""
  echo "🚀 Now redeploy to update Cognito:"
  echo "   make deploy-${ENVIRONMENT}"
else
  echo "⏭️  Skipped automatic update. Please update manually."
fi
