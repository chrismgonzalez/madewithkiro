# Environment Variable Setup Guide

This guide explains how to configure environment variables for the MadeWithKiro application with AWS Cognito authentication.

## Overview

The application uses environment variables to configure AWS Cognito authentication, API endpoints, and OAuth redirect URLs. Different environment files are used for development and production deployments.

## Environment Files

- `.env.development` - Local development configuration (localhost)
- `.env.production` - Production configuration (CloudFront/custom domain)
- `.env.example` - Template with all required variables and documentation

## Required Environment Variables

### API Configuration

```bash
# Backend API endpoint
VITE_API_BASE_URL=https://api.example.com
```

### AWS Cognito Configuration

```bash
# Cognito User Pool ID (from CloudFormation outputs)
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX

# Cognito App Client ID (from CloudFormation outputs)
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX

# AWS Region where Cognito is deployed
VITE_COGNITO_REGION=us-east-1

# Cognito Domain (without https://)
# Format: your-domain.auth.region.amazoncognito.com
VITE_COGNITO_DOMAIN=your-app.auth.us-east-1.amazoncognito.com
```

### AWS Amplify Configuration

These are aliases for Amplify compatibility:

```bash
# User Pool ID (same as VITE_COGNITO_USER_POOL_ID)
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX

# User Pool Client ID (same as VITE_COGNITO_CLIENT_ID)
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX

# Cognito Identity Pool ID (from CloudFormation outputs)
VITE_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# AWS Region (same as VITE_COGNITO_REGION)
VITE_AWS_REGION=us-east-1
```

### OAuth Redirect URLs

```bash
# OAuth callback URL after successful authentication
# Must match the callback URL configured in Cognito User Pool Client
VITE_OAUTH_REDIRECT_SIGN_IN=http://localhost:5173/auth/callback

# OAuth redirect URL after sign out
VITE_OAUTH_REDIRECT_SIGN_OUT=http://localhost:5173/
```

### Other Configuration

```bash
# Test user ID for development (optional, used before auth is implemented)
VITE_TEST_USER_ID=test-user-001

# Application environment
VITE_ENVIRONMENT=development
```

## Setup Instructions

### Step 1: Deploy AWS Infrastructure

First, deploy the SAM template to create Cognito resources:

```bash
# Deploy to development
sam build
sam deploy --config-env dev
```

### Step 2: Retrieve Cognito Configuration

After deployment, retrieve the Cognito configuration from CloudFormation outputs:

```bash
# Get User Pool ID
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text

# Get User Pool Client ID
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text

# Get Identity Pool ID
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' \
  --output text

# Get AWS Region
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoRegion`].OutputValue' \
  --output text
```

### Step 3: Create Cognito Domain

Create a Cognito domain for OAuth flows:

```bash
# Get User Pool ID from previous step
USER_POOL_ID="us-east-1_XXXXXXXXX"

# Create domain (must be unique across all AWS accounts)
aws cognito-idp create-user-pool-domain \
  --domain madewithkiro-dev-$(date +%s) \
  --user-pool-id $USER_POOL_ID

# The domain will be: madewithkiro-dev-<timestamp>.auth.<region>.amazoncognito.com
```

### Step 4: Update Environment Files

Copy the values from CloudFormation outputs to your environment file:

**For Development (.env.development):**

```bash
VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_DOMAIN=madewithkiro-dev-timestamp.auth.us-east-1.amazoncognito.com
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
VITE_AWS_REGION=us-east-1
VITE_OAUTH_REDIRECT_SIGN_IN=http://localhost:5173/auth/callback
VITE_OAUTH_REDIRECT_SIGN_OUT=http://localhost:5173/
VITE_TEST_USER_ID=test-user-001
VITE_ENVIRONMENT=development
```

**For Production (.env.production):**

```bash
VITE_API_BASE_URL=https://api.madewithkiro.com
VITE_COGNITO_USER_POOL_ID=us-east-1_YYYYYYYYY
VITE_COGNITO_CLIENT_ID=YYYYYYYYYYYYYYYYYYYYYYYYYY
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_DOMAIN=madewithkiro.auth.us-east-1.amazoncognito.com
VITE_USER_POOL_ID=us-east-1_YYYYYYYYY
VITE_USER_POOL_CLIENT_ID=YYYYYYYYYYYYYYYYYYYYYYYYYY
VITE_IDENTITY_POOL_ID=us-east-1:YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY
VITE_AWS_REGION=us-east-1
VITE_OAUTH_REDIRECT_SIGN_IN=https://madewithkiro.com/auth/callback
VITE_OAUTH_REDIRECT_SIGN_OUT=https://madewithkiro.com/
VITE_TEST_USER_ID=test-user-001
VITE_ENVIRONMENT=production
```

### Step 5: Configure OAuth Providers

Update your OAuth provider configurations with the Cognito domain:

**Google OAuth:**

- Go to Google Cloud Console → APIs & Services → Credentials
- Edit your OAuth client
- Add authorized redirect URI: `https://madewithkiro-dev-timestamp.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

**GitHub OAuth:**

- Go to GitHub Developer Settings → OAuth Apps
- Edit your OAuth app
- Update authorization callback URL: `https://madewithkiro-dev-timestamp.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

## Environment-Specific Configuration

### Development Environment

**Characteristics:**

- Uses localhost URLs for OAuth redirects
- Points to development API Gateway endpoint
- Uses development Cognito User Pool
- Allows testing without deploying to CloudFront

**OAuth Redirect URLs:**

```bash
VITE_OAUTH_REDIRECT_SIGN_IN=http://localhost:5173/auth/callback
VITE_OAUTH_REDIRECT_SIGN_OUT=http://localhost:5173/
```

### Production Environment

**Characteristics:**

- Uses production domain URLs for OAuth redirects
- Points to production API Gateway endpoint
- Uses production Cognito User Pool
- Deployed to CloudFront with custom domain

**OAuth Redirect URLs:**

```bash
VITE_OAUTH_REDIRECT_SIGN_IN=https://madewithkiro.com/auth/callback
VITE_OAUTH_REDIRECT_SIGN_OUT=https://madewithkiro.com/
```

## Multi-Domain Support

The application supports authentication on multiple domains (localhost, dev CloudFront, prod CloudFront) through dynamic redirect URL detection.

### Cognito Configuration

Configure multiple callback URLs in your Cognito User Pool Client:

```yaml
CallbackURLs:
  - http://localhost:5173/auth/callback
  - https://dev.madewithkiro.com/auth/callback
  - https://madewithkiro.com/auth/callback

LogoutURLs:
  - http://localhost:5173/
  - https://dev.madewithkiro.com/
  - https://madewithkiro.com/
```

### OAuth Provider Configuration

**Google OAuth:**
Add all domains to authorized JavaScript origins:

- `http://localhost:5173`
- `https://dev.madewithkiro.com`
- `https://madewithkiro.com`

**GitHub OAuth:**
Create separate OAuth apps for each environment (GitHub only allows one callback URL per app).

## Validation

After configuring environment variables, validate your setup:

### 1. Check Environment Variables

```bash
# Development
bun run dev

# Check console for Amplify configuration
# Should see: "Amplify configured with User Pool: us-east-1_XXXXXXXXX"
```

### 2. Test OAuth Flow

1. Navigate to `/auth` page
2. Click "Continue with Google" or "Continue with GitHub"
3. Complete OAuth flow
4. Verify redirect to `/auth/callback`
5. Verify redirect to home page after authentication

### 3. Verify Token Storage

Open browser DevTools → Application → Local Storage:

- Should see Amplify tokens stored
- Should see user session data

### 4. Test API Calls

Make an authenticated API call:

- Should include `Authorization: Bearer <token>` header
- Should receive successful response

## Troubleshooting

### Issue: "Invalid redirect URI"

**Cause:** OAuth redirect URL doesn't match Cognito configuration

**Solution:**

1. Check `VITE_OAUTH_REDIRECT_SIGN_IN` matches your current domain
2. Verify Cognito User Pool Client has the correct callback URL
3. Ensure OAuth provider has the correct redirect URI

### Issue: "User Pool not found"

**Cause:** Incorrect User Pool ID or region

**Solution:**

1. Verify `VITE_USER_POOL_ID` matches CloudFormation output
2. Verify `VITE_AWS_REGION` matches where Cognito is deployed
3. Check AWS credentials have access to the User Pool

### Issue: "Token expired"

**Cause:** Access token expired and refresh failed

**Solution:**

1. Check refresh token is valid (30-day expiration)
2. Verify Amplify is configured to refresh tokens automatically
3. Clear local storage and re-authenticate

### Issue: "CORS error on API calls"

**Cause:** API Gateway CORS not configured for your domain

**Solution:**

1. Verify API Gateway has CORS enabled
2. Check allowed origins include your domain
3. Ensure `Authorization` header is in allowed headers

## Security Best Practices

1. **Never commit environment files with real credentials**

   - Add `.env.development` and `.env.production` to `.gitignore`
   - Only commit `.env.example` with placeholder values

2. **Use different credentials for each environment**

   - Separate User Pools for dev and prod
   - Separate OAuth apps for dev and prod
   - Different API endpoints for dev and prod

3. **Rotate OAuth secrets regularly**

   - Update secrets in AWS Systems Manager Parameter Store
   - Redeploy SAM template to pick up new secrets

4. **Monitor authentication metrics**
   - Track authentication success/failure rates
   - Monitor token refresh patterns
   - Alert on unusual sign-out rates

## Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Amplify Auth Documentation](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [Google OAuth Setup Guide](./OAUTH-SETUP-QUICKSTART.md#google-oauth-setup)
- [GitHub OAuth Setup Guide](./OAUTH-SETUP-QUICKSTART.md#github-oauth-setup)
- [SAM Template Configuration](../template.yaml)
