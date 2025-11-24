# Deployment Guide with OAuth Authentication

This guide covers deploying MadeWithKiro with OAuth authentication using the automated Makefile commands.

## Overview

The deployment process includes:

1. **OAuth Setup** - Configure Google and GitHub OAuth providers
2. **SSM Parameter Storage** - Store OAuth secrets securely
3. **Infrastructure Deployment** - Deploy SAM template with Cognito
4. **Frontend Configuration** - Configure React app with Cognito settings
5. **Validation** - Test OAuth flows end-to-end

## Prerequisites

- AWS CLI installed and configured
- SAM CLI installed
- Bun package manager installed
- OAuth apps created (see [OAuth Setup Guide](./OAUTH-SETUP-QUICKSTART.md))
- OAuth Client IDs and Secrets ready

## Quick Start

### 1. Store OAuth Secrets

```bash
# Set environment variables
export GOOGLE_CLIENT_SECRET='your-google-client-secret'
export GITHUB_CLIENT_SECRET='your-github-client-secret'

# For development
make setup-ssm-dev

# For production
make setup-ssm-prod
```

### 2. Deploy Infrastructure

```bash
# Development
make deploy-dev

# Production
make deploy-prod
```

The deployment will automatically:

- Validate OAuth credentials exist in SSM
- Build SAM application
- Deploy CloudFormation stack
- Configure Cognito with OAuth providers
- Display stack outputs

### 3. Configure Frontend

```bash
# Generate .env file from stack outputs
make setup-env-dev  # or make setup-env-prod

# Build frontend
make build

# Upload to S3
make upload-frontend-dev  # or make upload-frontend-prod
```

## Detailed Deployment Steps

### Step 1: Validate Prerequisites

Check that all required tools are installed:

```bash
make check-deps
```

Expected output:

```
✓ bun installed
✓ uv installed
✓ sam installed
✓ aws cli installed
✓ python3 installed
```

### Step 2: Configure OAuth Providers

If you haven't already, create OAuth apps:

1. **Google OAuth**: Follow [OAuth Setup Guide](./OAUTH-SETUP-QUICKSTART.md#step-1-create-google-oauth-app)
2. **GitHub OAuth**: Follow [OAuth Setup Guide](./OAUTH-SETUP-QUICKSTART.md#step-2-create-github-oauth-app)

Save your Client IDs and Client Secrets.

### Step 3: Store OAuth Secrets in SSM

The `setup-ssm-*` commands will:

- Validate environment variables are set
- Check OAuth secret format and length
- Store secrets as encrypted SecureString parameters
- Verify parameters were created successfully

```bash
# Set secrets (replace with your actual values)
export GOOGLE_CLIENT_SECRET='your-google-client-secret'
export GITHUB_CLIENT_SECRET='your-github-client-secret'

# Optional: Set Client IDs for reference
export GOOGLE_CLIENT_ID='your-google-client-id'
export GITHUB_CLIENT_ID='your-github-client-id'

# Store in SSM for development
make setup-ssm-dev
```

**Output:**

```
Setting up SSM parameters for dev environment...
Checking prerequisites...
✓ AWS CLI installed
Using AWS Account: 123456789012
Using AWS Identity: arn:aws:iam::123456789012:user/developer

Validating environment variables...
Validating OAuth secret formats...
✓ OAuth secrets validated

Setting up SSM parameters for dev environment...
Storing parameter: /madewithkiro/google-client-secret
✓ Created parameter: /madewithkiro/google-client-secret
✓ Verified parameter exists: /madewithkiro/google-client-secret

Storing parameter: /madewithkiro/github-client-secret
✓ Created parameter: /madewithkiro/github-client-secret
✓ Verified parameter exists: /madewithkiro/github-client-secret

✓ All parameters stored successfully for dev environment!
✓ SSM parameters configured for dev
```

### Step 4: Validate OAuth Configuration

Before deploying, validate that OAuth secrets are properly configured:

```bash
# Validate dev environment
make validate-oauth-dev

# Validate prod environment
make validate-oauth-prod
```

This checks that:

- OAuth secrets exist in SSM Parameter Store
- Parameters are accessible with current AWS credentials
- No deployment will fail due to missing secrets

### Step 5: Update SAM Configuration (Optional)

If you want to customize deployment parameters, edit `samconfig.toml`:

```toml
[dev.deploy.parameters]
parameter_overrides = [
  "Environment=dev",
  "CognitoCallbackURL=http://localhost:5173",
  "GoogleClientId=your-google-client-id",
  "GitHubClientId=your-github-client-id",
]
```

### Step 6: Deploy Infrastructure

The deployment command will:

1. Validate SAM template
2. Build Lambda functions
3. **Validate OAuth credentials** (automatic)
4. Package and upload to S3
5. Deploy CloudFormation stack
6. Display stack outputs

```bash
# Deploy to development
make deploy-dev
```

**Output:**

```
Building SAM application...
✓ SAM build completed

Validating OAuth credentials for dev environment...
✓ Google OAuth secret exists: /madewithkiro/google-client-secret
✓ GitHub OAuth secret exists: /madewithkiro/github-client-secret
✓ All OAuth credentials validated for dev environment!
✓ OAuth credentials validated

Deploying to development environment...
Deploying with following values
===============================
Stack name                   : madewithkiro-dev
Region                       : us-west-2
Confirm changeset            : False
...

✓ Deployment to dev completed

Fetching stack outputs...
---------------------------------------------------------
|                    DescribeStacks                     |
+---------------------------+---------------------------+
|  OutputKey                |  OutputValue              |
+---------------------------+---------------------------+
|  UserPoolId               |  us-west-2_ABC123DEF      |
|  UserPoolClientId         |  1a2b3c4d5e6f7g8h9i0j     |
|  IdentityPoolId           |  us-west-2:abc-123-def    |
|  UserPoolDomain           |  madewithkiro-dev-123     |
|  ApiEndpoint              |  https://api.example.com  |
+---------------------------+---------------------------+
```

### Step 7: Get Cognito Domain

After deployment, retrieve the Cognito domain:

```bash
# For development
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text
```

The domain will be in format: `madewithkiro-dev-<account-id>.auth.<region>.amazoncognito.com`

### Step 8: Update OAuth Redirect URIs

Now update your OAuth apps with the exact Cognito domain:

**Google OAuth:**

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Update redirect URI: `https://<cognito-domain>/oauth2/idpresponse`
4. Save

**GitHub OAuth:**

1. Go to GitHub Developer Settings → OAuth Apps
2. Edit your OAuth app
3. Update callback URL: `https://<cognito-domain>/oauth2/idpresponse`
4. Update application

### Step 9: Configure Frontend

Generate environment variables from stack outputs:

```bash
make setup-env-dev
```

This creates `.env.development` with:

```bash
VITE_AWS_REGION=us-west-2
VITE_USER_POOL_ID=us-west-2_ABC123DEF
VITE_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
VITE_IDENTITY_POOL_ID=us-west-2:abc-123-def
VITE_COGNITO_DOMAIN=madewithkiro-dev-123.auth.us-west-2.amazoncognito.com
VITE_OAUTH_REDIRECT_SIGN_IN=http://localhost:5173/auth/callback
VITE_OAUTH_REDIRECT_SIGN_OUT=http://localhost:5173/
VITE_API_BASE_URL=https://api.example.com
```

### Step 10: Build and Deploy Frontend

```bash
# Build frontend for development
make build-dev

# Upload to S3
make upload-frontend-dev

# Invalidate CloudFront cache (if using custom domain)
make invalidate-cloudfront-dev
```

### Step 11: Test Authentication

1. Start local development server:

   ```bash
   make dev
   ```

2. Navigate to `http://localhost:5173/auth`

3. Test Google OAuth:

   - Click "Continue with Google"
   - Complete OAuth flow
   - Verify redirect back to app
   - Check user is authenticated

4. Test GitHub OAuth:
   - Sign out
   - Click "Continue with GitHub"
   - Complete OAuth flow
   - Verify authentication

## Production Deployment

Production deployment follows the same process with additional safeguards:

```bash
# 1. Store production OAuth secrets
export GOOGLE_CLIENT_SECRET='your-prod-google-secret'
export GITHUB_CLIENT_SECRET='your-prod-github-secret'
make setup-ssm-prod

# 2. Validate OAuth configuration
make validate-oauth-prod

# 3. Deploy infrastructure (requires confirmation)
make deploy-prod

# 4. Configure frontend
make setup-env-prod

# 5. Build and upload frontend (requires confirmation)
make upload-frontend-prod

# 6. Invalidate CloudFront cache
make invalidate-cloudfront-prod
```

## Makefile Commands Reference

### OAuth Configuration

| Command                    | Description                         |
| -------------------------- | ----------------------------------- |
| `make setup-ssm-dev`       | Store OAuth secrets in SSM (dev)    |
| `make setup-ssm-prod`      | Store OAuth secrets in SSM (prod)   |
| `make validate-oauth-dev`  | Validate OAuth secrets exist (dev)  |
| `make validate-oauth-prod` | Validate OAuth secrets exist (prod) |

### Deployment

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `make sam-build`    | Build SAM application                         |
| `make sam-validate` | Validate SAM template                         |
| `make deploy-dev`   | Deploy to development (validates OAuth first) |
| `make deploy-prod`  | Deploy to production (validates OAuth first)  |

### Frontend

| Command                     | Description                             |
| --------------------------- | --------------------------------------- |
| `make build`                | Build frontend for production           |
| `make build-dev`            | Build frontend for development          |
| `make upload-frontend-dev`  | Upload frontend to S3 (dev)             |
| `make upload-frontend-prod` | Upload frontend to S3 (prod)            |
| `make setup-env-dev`        | Generate .env from stack outputs (dev)  |
| `make setup-env-prod`       | Generate .env from stack outputs (prod) |

### Monitoring

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `make logs`         | Tail Lambda logs (dev)             |
| `make outputs-dev`  | Show CloudFormation outputs (dev)  |
| `make outputs-prod` | Show CloudFormation outputs (prod) |
| `make status`       | Show deployment status             |

## Troubleshooting

### OAuth Validation Fails

**Error:**

```
✗ Google OAuth secret not found: /madewithkiro/google-client-secret
Run 'make setup-ssm-dev' to configure OAuth secrets
```

**Solution:**

```bash
export GOOGLE_CLIENT_SECRET='your-secret'
export GITHUB_CLIENT_SECRET='your-secret'
make setup-ssm-dev
```

### Deployment Fails with "Parameter not found"

**Error:**

```
Parameter /madewithkiro/google-client-secret not found
```

**Solution:**

The SSM parameters weren't created. Run:

```bash
make setup-ssm-dev
```

### OAuth Secret Validation Fails

**Error:**

```
✗ GOOGLE_CLIENT_SECRET appears to be too short (10 characters)
OAuth secrets are typically at least 20 characters.
```

**Solution:**

Verify you're using the actual OAuth client secret, not the client ID. OAuth secrets are typically 30-50 characters long.

### "Invalid redirect URI" During OAuth

**Error:** User sees "redirect_uri_mismatch" error from Google/GitHub

**Solution:**

1. Get your Cognito domain:

   ```bash
   make outputs-dev
   ```

2. Update OAuth app redirect URI to match exactly:

   ```
   https://<cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```

### Deployment Succeeds but Authentication Fails

**Checklist:**

1. Verify OAuth secrets are correct:

   ```bash
   make validate-oauth-dev
   ```

2. Check Cognito User Pool has identity providers:

   ```bash
   aws cognito-idp describe-user-pool \
     --user-pool-id <your-pool-id> \
     --query 'UserPool.SupportedIdentityProviders'
   ```

3. Verify redirect URIs match in OAuth apps

4. Check CloudWatch logs for errors:

   ```bash
   make logs
   ```

## Security Considerations

### OAuth Secrets

- **Never commit** OAuth secrets to version control
- **Use different secrets** for dev and prod
- **Rotate secrets** regularly (update SSM parameters)
- **Limit IAM access** to SSM parameters

### SSM Parameters

- Stored as **SecureString** (encrypted with KMS)
- Only accessible by **CloudFormation** during deployment
- **Not visible** in CloudFormation templates or console
- **Audit access** via CloudTrail

### Deployment Safety

- **Validation runs automatically** before deployment
- **Production requires confirmation** for destructive operations
- **Secrets never logged** or displayed in output
- **IAM permissions** control who can deploy

## Best Practices

1. **Separate OAuth apps** for dev and prod
2. **Test in dev** before deploying to prod
3. **Validate OAuth** before every deployment
4. **Monitor CloudWatch logs** for authentication errors
5. **Document OAuth setup** for team members
6. **Rotate secrets** on a schedule
7. **Use least privilege** IAM policies

## Next Steps

- [Configure Custom Domain](./DOMAIN-SETUP.md)
- [Set Up CI/CD Pipeline](./CICD-SETUP.md)
- [Monitor Authentication](./MONITORING.md)
- [OAuth Setup Details](./OAUTH-SETUP-QUICKSTART.md)

## Related Documentation

- [SSM Parameter Setup Script](./SSM-PARAMETER-SETUP.md)
- [Authentication Design](../.kiro/specs/social-authentication/design.md)
- [Makefile Commands](../Makefile)
