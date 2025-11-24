# OAuth Setup Quick Start

This guide walks you through setting up Google and GitHub OAuth for MadeWithKiro authentication.

## Overview

The authentication setup has two parts:

1. **OAuth Provider Configuration** - Set up Google and GitHub OAuth apps
2. **AWS SSM Parameter Storage** - Store OAuth secrets securely in AWS

## Prerequisites

- AWS CLI installed and configured
- Access to Google Cloud Console
- Access to GitHub Developer Settings

## Step 1: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Name**: MadeWithKiro Dev (or Prod)
   - **Authorized JavaScript origins**:
     - Development: `http://localhost:5173`
     - Production: `https://madewithkiro.com`
   - **Authorized redirect URIs**:
     - Development: `https://madewithkiro-dev-<account-id>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
     - Production: `https://madewithkiro-prod-<account-id>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
7. Click **Create**
8. **Save the Client ID and Client Secret**

> **Note**: You'll get the exact Cognito domain after deploying the SAM template. You can update the redirect URIs later.

## Step 2: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Configure:
   - **Application name**: MadeWithKiro Dev (or Prod)
   - **Homepage URL**:
     - Development: `http://localhost:5173`
     - Production: `https://madewithkiro.com`
   - **Authorization callback URL**:
     - Development: `https://madewithkiro-dev-<account-id>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
     - Production: `https://madewithkiro-prod-<account-id>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
4. Click **Register application**
5. Click **Generate a new client secret**
6. **Save the Client ID and Client Secret**

> **Note**: You'll get the exact Cognito domain after deploying the SAM template. You can update the callback URL later.

## Step 3: Store OAuth Secrets in AWS SSM

Now store your OAuth secrets securely in AWS Systems Manager Parameter Store:

### For Development Environment

```bash
# Set environment variables (replace with your actual secrets)
export GOOGLE_CLIENT_SECRET='your-google-client-secret-dev'
export GITHUB_CLIENT_SECRET='your-github-client-secret-dev'

# Store in SSM Parameter Store
make setup-ssm-dev
```

### For Production Environment

```bash
# Set environment variables (replace with your actual secrets)
export GOOGLE_CLIENT_SECRET='your-google-client-secret-prod'
export GITHUB_CLIENT_SECRET='your-github-client-secret-prod'

# Store in SSM Parameter Store
make setup-ssm-prod
```

## Step 4: Deploy Infrastructure

Now deploy the SAM template with your OAuth Client IDs:

### Development Deployment

```bash
# Deploy with OAuth Client IDs
sam deploy \
  --config-env dev \
  --parameter-overrides \
    GoogleClientId='your-google-client-id' \
    GitHubClientId='your-github-client-id'
```

Or update `samconfig.toml` with your Client IDs and run:

```bash
make deploy-dev
```

### Production Deployment

```bash
make deploy-prod
```

## Step 5: Get Cognito Domain

After deployment, get your Cognito domain:

```bash
# For dev
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text

# For prod
aws cloudformation describe-stacks \
  --stack-name madewithkiro-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text
```

## Step 6: Update OAuth Redirect URIs

Now that you have the exact Cognito domain, update your OAuth apps:

### Update Google OAuth App

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth client
4. Update **Authorized redirect URIs** with the exact Cognito domain
5. Click **Save**

### Update GitHub OAuth App

1. Go back to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on your OAuth App
3. Update **Authorization callback URL** with the exact Cognito domain
4. Click **Update application**

## Step 7: Configure Frontend

Get the Cognito configuration and update your frontend environment variables:

```bash
# Generate .env file from stack outputs
make setup-env-dev  # or make setup-env-prod
```

This will create/update your `.env.development` or `.env.production` file with:

- `VITE_USER_POOL_ID`
- `VITE_USER_POOL_CLIENT_ID`
- `VITE_IDENTITY_POOL_ID`
- `VITE_COGNITO_DOMAIN`
- `VITE_AWS_REGION`

## Step 8: Test Authentication

1. Start the development server:

   ```bash
   make dev
   ```

2. Navigate to `http://localhost:5173/auth`

3. Click "Continue with Google" or "Continue with GitHub"

4. Complete the OAuth flow

5. Verify you're redirected back and authenticated

## Troubleshooting

### "Invalid redirect URI" Error

**Cause**: The redirect URI in your OAuth app doesn't match the Cognito domain.

**Solution**: Double-check that the redirect URI exactly matches:

```
https://<your-cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
```

### "Client secret not found" Error

**Cause**: SSM parameters weren't created or have wrong names.

**Solution**: Verify parameters exist:

```bash
aws ssm get-parameter --name /madewithkiro/google-client-secret
aws ssm get-parameter --name /madewithkiro/github-client-secret
```

### "Access denied" Error

**Cause**: User denied permission on OAuth consent screen.

**Solution**: This is expected behavior. User can retry authentication.

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use different OAuth apps** for dev and prod
3. **Rotate secrets regularly** (update SSM parameters)
4. **Limit OAuth scopes** to only what's needed
5. **Monitor SSM parameter access** via CloudTrail

## What Happens Behind the Scenes

1. **SAM Template** references SSM parameters using `{{resolve:ssm-secure:...}}`
2. **CloudFormation** retrieves secrets from SSM during deployment
3. **Cognito** uses the secrets to configure identity providers
4. **Secrets never appear** in CloudFormation templates or logs
5. **IAM permissions** control who can access the secrets

## Next Steps

- [Deploy to production](./DEPLOYMENT-GUIDE.md)
- [Configure custom domain](./DOMAIN-SETUP.md)
- [Set up CI/CD pipeline](./CICD-SETUP.md)

## Related Documentation

- [SSM Parameter Setup Guide](./SSM-PARAMETER-SETUP.md) - Detailed script documentation
- [Authentication Design](../.kiro/specs/social-authentication/design.md) - Technical design
- [Requirements](../.kiro/specs/social-authentication/requirements.md) - Feature requirements
