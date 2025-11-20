# MadeWithKiro Deployment Guide

## Overview

This guide walks you through deploying MadeWithKiro to AWS. The application uses CloudFront for both dev and prod environments to ensure HTTPS everywhere.

## Prerequisites

- ✅ AWS CLI installed and configured
- ✅ AWS SAM CLI installed
- ✅ Bun installed (for frontend)
- ✅ uv installed (for Python backend)
- ✅ AWS account with appropriate permissions

### Install AWS SAM CLI

```bash
# macOS with Homebrew
brew install aws-sam-cli

# Or follow: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

## Deployment Process

### Step 1: Initial Deployment (Backend + Infrastructure)

Deploy the backend infrastructure to AWS:

```bash
make deploy-dev
```

This will:

- Build Lambda functions with dependencies
- Create DynamoDB table
- Set up Cognito User Pool
- Deploy API Gateway
- Create S3 bucket for frontend
- **Create CloudFront distribution** (takes ~10-15 minutes)
- Configure all IAM roles and policies

**Note:** The first deployment will use `http://localhost:5173` as the Cognito callback URL. This is temporary.

### Step 2: Update Cognito Callback URL

After the first deployment completes, you need to update the Cognito callback URL to use the CloudFront distribution:

#### Option A: Automatic Update (Recommended)

```bash
./scripts/update-cognito-callback.sh dev
```

This script will:

1. Fetch the CloudFront URL from stack outputs
2. Backup your `samconfig.toml`
3. Update the callback URL automatically
4. Prompt you to redeploy

#### Option B: Manual Update

1. Get the CloudFront URL:

   ```bash
   make outputs-dev
   ```

2. Look for the `CloudFrontUrl` output (e.g., `https://d111111abcdef8.cloudfront.net`)

3. Update `samconfig.toml`:

   ```toml
   [dev.deploy.parameters]
   parameter_overrides = [
     "Environment=dev",
     "CognitoCallbackURL=https://d111111abcdef8.cloudfront.net",  # ← Update this
     "DomainName=",
     "HostedZoneId=",
   ]
   ```

4. Redeploy to update Cognito:
   ```bash
   make deploy-dev
   ```

### Step 3: Build and Upload Frontend

Once the infrastructure is ready:

```bash
# Build the frontend
make build

# Upload to S3 (will sync to CloudFront)
make upload-frontend-dev
```

### Step 4: Verify Deployment

Check all stack outputs:

```bash
make outputs-dev
```

You should see:

- ✅ ApiUrl - Your API Gateway endpoint
- ✅ CloudFrontUrl - Your frontend URL (use this!)
- ✅ CloudFrontDistributionId - For cache invalidation
- ✅ UserPoolId - Cognito User Pool ID
- ✅ UserPoolClientId - Cognito Client ID

### Step 5: Configure Frontend Environment

Create a `.env` file for local development:

```bash
make setup-env-dev
```

Or manually create `.env`:

```env
VITE_API_URL=https://xxxxx.execute-api.us-west-2.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=us-west-2_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=https://madewithkiro-dev-123456789.auth.us-west-2.amazoncognito.com
```

## Development Workflow

### Local Development

Run the frontend locally against the deployed backend:

```bash
# Start local dev server
make dev

# Frontend runs at http://localhost:5173
# Calls deployed AWS API
```

**Note:** For local development, you may want to keep `CognitoCallbackURL=http://localhost:5173` in samconfig.toml and add both URLs to Cognito's allowed callbacks.

### Deploy Backend Changes

```bash
make deploy-dev
```

### Deploy Frontend Changes

```bash
make upload-frontend-dev
```

### Invalidate CloudFront Cache

After uploading new frontend files:

```bash
make invalidate-cloudfront-dev
```

## Production Deployment

### Prerequisites

1. Custom domain configured in Route 53
2. Update `samconfig.toml` with your domain:
   ```toml
   [prod.deploy.parameters]
   parameter_overrides = [
     "Environment=prod",
     "CognitoCallbackURL=https://madewithkiro.com",
     "DomainName=madewithkiro.com",
     "HostedZoneId=Z00541582Q16QTXW4013F",
   ]
   ```

### Deploy to Production

```bash
# Deploy infrastructure
make deploy-prod

# Upload frontend
make upload-frontend-prod

# Invalidate cache
make invalidate-cloudfront-prod
```

## Useful Commands

### View Logs

```bash
# All Lambda logs
make logs

# Profile Lambda only
make logs-profile

# Application Lambda only
make logs-application
```

### Check Deployment Status

```bash
make status
```

### View Stack Outputs

```bash
# Dev environment
make outputs-dev

# Prod environment
make outputs-prod
```

### Run Tests

```bash
make test
```

### Clean Build Artifacts

```bash
make clean
```

## Troubleshooting

### CloudFront Distribution Not Created

If CloudFront isn't created, check:

1. The `CreateCloudFront` condition in `template.yaml`
2. Stack events in CloudFormation console
3. IAM permissions for CloudFront

### Cognito Authentication Fails

Common issues:

1. **Callback URL mismatch** - Ensure Cognito callback URL matches your frontend URL
2. **CORS errors** - Check API Gateway CORS configuration
3. **Token validation fails** - Verify Cognito User Pool ID and Client ID in frontend

### Frontend Shows 403 Errors

This usually means:

1. CloudFront OAC not configured correctly
2. S3 bucket policy missing CloudFront permissions
3. Files not uploaded to S3

Fix:

```bash
make upload-frontend-dev
```

### Lambda Function Errors

View logs:

```bash
make logs-profile
# or
make logs-application
```

Common issues:

1. Missing environment variables
2. DynamoDB permissions
3. Python dependencies not bundled

## Architecture

```
User Browser
    ↓ HTTPS
CloudFront (CDN)
    ↓
    ├─→ S3 (Static Frontend)
    └─→ API Gateway
         ↓
         ├─→ Cognito (Auth)
         └─→ Lambda Functions
              ↓
              DynamoDB
```

## Cost Estimates

**Dev Environment (light usage):**

- DynamoDB: ~$1-5/month (on-demand)
- Lambda: Free tier covers most dev usage
- API Gateway: ~$3.50/million requests
- CloudFront: ~$0.085/GB + $0.01/10k requests
- S3: ~$0.023/GB storage
- Cognito: Free for first 50k MAUs

**Estimated dev cost: $5-15/month**

## Security Notes

1. **Never commit secrets** - Use environment variables
2. **Enable MFA** on AWS account
3. **Review IAM policies** - Ensure least privilege
4. **Monitor CloudWatch** - Set up alarms for errors
5. **Keep dependencies updated** - Run `bun update` and `uv pip compile` regularly

## Next Steps

After successful deployment:

1. ✅ Test authentication flow
2. ✅ Create a test profile
3. ✅ Add a test application
4. ✅ Verify gallery displays correctly
5. ✅ Test on mobile devices
6. ✅ Set up monitoring and alarms

## Support

For issues:

1. Check CloudWatch logs: `make logs`
2. Review stack events in CloudFormation console
3. Verify all outputs: `make outputs-dev`
4. Check this guide's troubleshooting section
