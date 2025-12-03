#!/bin/bash

# Setup AWS OIDC Provider and IAM Roles for GitHub Actions
# This script automates the setup of AWS infrastructure needed for GitHub Actions CI/CD

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_ORG="${GITHUB_ORG:-}"
GITHUB_REPO="${GITHUB_REPO:-madewithkiro}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
AWS_REGION="${AWS_REGION:-us-west-2}"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists aws; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi

if ! command_exists jq; then
    print_warning "jq not found. Install it for better JSON handling (optional)."
fi

# Get AWS account ID if not set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    print_info "Getting AWS account ID..."
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS Account ID: $AWS_ACCOUNT_ID"
fi

# Get GitHub org/user if not set
if [ -z "$GITHUB_ORG" ]; then
    echo -e "${YELLOW}Enter your GitHub organization or username:${NC}"
    read -r GITHUB_ORG
fi

print_info "Configuration:"
echo "  GitHub: $GITHUB_ORG/$GITHUB_REPO"
echo "  AWS Account: $AWS_ACCOUNT_ID"
echo "  AWS Region: $AWS_REGION"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}Do you want to proceed with the setup? (y/n)${NC}"
read -r confirm
if [ "$confirm" != "y" ]; then
    print_warning "Setup cancelled."
    exit 0
fi

# Step 1: Create OIDC Provider
print_info "Step 1: Creating OIDC Identity Provider..."

OIDC_PROVIDER_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" >/dev/null 2>&1; then
    print_warning "OIDC provider already exists. Skipping creation."
else
    aws iam create-open-id-connect-provider \
        --url https://token.actions.githubusercontent.com \
        --client-id-list sts.amazonaws.com \
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
    
    print_success "OIDC provider created: $OIDC_PROVIDER_ARN"
fi

# Step 2: Create Dev Role
print_info "Step 2: Creating Dev IAM Role..."

DEV_ROLE_NAME="GitHubActions-MadeWithKiro-Dev"
DEV_TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_PROVIDER_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
        }
      }
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$DEV_ROLE_NAME" >/dev/null 2>&1; then
    print_warning "Dev role already exists. Updating trust policy..."
    echo "$DEV_TRUST_POLICY" > /tmp/trust-policy-dev.json
    aws iam update-assume-role-policy \
        --role-name "$DEV_ROLE_NAME" \
        --policy-document file:///tmp/trust-policy-dev.json
    rm /tmp/trust-policy-dev.json
else
    echo "$DEV_TRUST_POLICY" > /tmp/trust-policy-dev.json
    aws iam create-role \
        --role-name "$DEV_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy-dev.json \
        --description "GitHub Actions role for MadeWithKiro Dev environment"
    rm /tmp/trust-policy-dev.json
    print_success "Dev role created: $DEV_ROLE_NAME"
fi

# Attach policies to Dev role
print_info "Attaching policies to Dev role..."

POLICIES=(
    "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess"
    "arn:aws:iam::aws:policy/AmazonS3FullAccess"
    "arn:aws:iam::aws:policy/AWSLambda_FullAccess"
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
    "arn:aws:iam::aws:policy/CloudFrontFullAccess"
    "arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator"
    "arn:aws:iam::aws:policy/IAMFullAccess"
    "arn:aws:iam::aws:policy/AmazonCognitoPowerUser"
    "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
)

for policy in "${POLICIES[@]}"; do
    if aws iam get-role-policy --role-name "$DEV_ROLE_NAME" --policy-name "$(basename "$policy")" >/dev/null 2>&1; then
        print_warning "Policy already attached: $policy"
    else
        aws iam attach-role-policy --role-name "$DEV_ROLE_NAME" --policy-arn "$policy" 2>/dev/null || true
    fi
done

print_success "Policies attached to Dev role"

# Step 3: Create Prod Role
print_info "Step 3: Creating Prod IAM Role..."

PROD_ROLE_NAME="GitHubActions-MadeWithKiro-Prod"
PROD_TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_PROVIDER_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/tags/v*"
        }
      }
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$PROD_ROLE_NAME" >/dev/null 2>&1; then
    print_warning "Prod role already exists. Updating trust policy..."
    echo "$PROD_TRUST_POLICY" > /tmp/trust-policy-prod.json
    aws iam update-assume-role-policy \
        --role-name "$PROD_ROLE_NAME" \
        --policy-document file:///tmp/trust-policy-prod.json
    rm /tmp/trust-policy-prod.json
else
    echo "$PROD_TRUST_POLICY" > /tmp/trust-policy-prod.json
    aws iam create-role \
        --role-name "$PROD_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy-prod.json \
        --description "GitHub Actions role for MadeWithKiro Prod environment"
    rm /tmp/trust-policy-prod.json
    print_success "Prod role created: $PROD_ROLE_NAME"
fi

# Attach policies to Prod role
print_info "Attaching policies to Prod role..."

for policy in "${POLICIES[@]}"; do
    if aws iam get-role-policy --role-name "$PROD_ROLE_NAME" --policy-name "$(basename "$policy")" >/dev/null 2>&1; then
        print_warning "Policy already attached: $policy"
    else
        aws iam attach-role-policy --role-name "$PROD_ROLE_NAME" --policy-arn "$policy" 2>/dev/null || true
    fi
done

print_success "Policies attached to Prod role"

# Summary
echo ""
print_success "Setup complete! 🎉"
echo ""
print_info "Next steps:"
echo ""
echo "1. Add the following secrets to your GitHub repository:"
echo "   Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "   ${GREEN}AWS_ROLE_ARN_DEV${NC}:"
echo "   arn:aws:iam::${AWS_ACCOUNT_ID}:role/${DEV_ROLE_NAME}"
echo ""
echo "   ${GREEN}AWS_ROLE_ARN_PROD${NC}:"
echo "   arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROD_ROLE_NAME}"
echo ""
echo "2. Configure production environment protection:"
echo "   Settings → Environments → New environment → 'production'"
echo "   - Add required reviewers"
echo "   - Set deployment branches to 'v*' tags"
echo ""
echo "3. Test the CI/CD pipeline:"
echo "   - Create a PR to trigger tests"
echo "   - Merge to main to trigger dev deployment"
echo "   - Create a tag (v1.0.0) to trigger prod deployment"
echo ""
print_warning "Note: You may need to adjust IAM permissions based on your specific requirements."
