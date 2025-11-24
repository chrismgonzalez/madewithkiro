# OAuth Provider Setup Guide

## Table of Contents

- [Overview](#overview)
- [Google OAuth Setup](#google-oauth-setup)
- [GitHub OAuth Setup](#github-oauth-setup)
- [SSM Parameter Storage](#ssm-parameter-storage)
- [Cognito Domain Configuration](#cognito-domain-configuration)
- [Callback URL Configuration](#callback-url-configuration)
- [Multi-Domain Setup](#multi-domain-setup)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

This guide provides comprehensive instructions for setting up OAuth authentication with Google and GitHub for the MadeWithKiro platform. The authentication system uses AWS Cognito as the identity provider, with Google and GitHub as federated identity sources.

### Architecture Overview

```
User → OAuth Provider (Google/GitHub) → Cognito User Pool → Application
```

### Prerequisites

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Google Cloud Platform account
- GitHub account
- Access to deploy CloudFormation stacks

### What You'll Need

- Google OAuth Client ID and Client Secret
- GitHub OAuth Client ID and Client Secret
- AWS region for Cognito deployment
- Domain names for callback URLs (localhost, dev, prod)

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Click **New Project**
4. Enter project details:
   - **Project name**: `MadeWithKiro` (or your preferred name)
   - **Organization**: Select your organization (if applicable)
   - **Location**: Select parent folder (if applicable)
5. Click **Create**
6. Wait for the project to be created (this may take a few seconds)
7. Select the newly created project from the project dropdown

### Step 2: Enable Required APIs

1. In the Google Cloud Console, open the navigation menu (☰)
2. Navigate to **APIs & Services** → **Library**
3. Search for **Google+ API**
4. Click on **Google+ API** in the search results
5. Click **Enable**
6. Wait for the API to be enabled

> **Note**: The Google+ API is required for retrieving user profile information (name, email, picture) during OAuth authentication.

### Step 3: Configure OAuth Consent Screen

The OAuth consent screen is what users see when they authenticate with Google.

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **User Type**:
   - **Internal**: Only for Google Workspace users (if applicable)
   - **External**: For all users (recommended for public applications)
3. Click **Create**

#### OAuth Consent Screen Configuration

Fill in the required fields:

**App Information:**

- **App name**: `MadeWithKiro`
- **User support email**: Your email address
- **App logo**: (Optional) Upload your application logo (120x120px PNG/JPG)

**App Domain:**

- **Application home page**: `https://madewithkiro.com` (or your domain)
- **Application privacy policy link**: `https://madewithkiro.com/privacy` (if available)
- **Application terms of service link**: `https://madewithkiro.com/terms` (if available)

**Authorized Domains:**

- Add `madewithkiro.com` (your production domain)
- Add `amazoncognito.com` (for Cognito redirect)

**Developer Contact Information:**

- **Email addresses**: Your email address

Click **Save and Continue**

#### Scopes Configuration

1. On the **Scopes** page, click **Add or Remove Scopes**
2. Select the following scopes:
   - `email` - View your email address
   - `profile` - See your personal info, including any personal info you've made publicly available
   - `openid` - Authenticate using OpenID Connect
3. Click **Update**
4. Click **Save and Continue**

> **Important**: Only request the scopes your application needs. Requesting unnecessary scopes may cause users to deny access.

#### Test Users (Development Only)

For development and testing, add test users:

1. Click **Add Users**
2. Enter email addresses of test users (one per line)
3. Click **Add**
4. Click **Save and Continue**

> **Note**: In development mode, only test users can authenticate. Once you publish your app, any Google user can authenticate.

#### Review and Publish

1. Review your OAuth consent screen configuration
2. Click **Back to Dashboard**
3. (Optional) Click **Publish App** when ready for production
   - Development apps are limited to 100 users
   - Published apps require Google verification for sensitive scopes

### Step 4: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen (you should have already done this)
4. Select **Application type**: **Web application**
5. Enter **Name**: `MadeWithKiro Web Client - Dev` (or `Prod` for production)

#### Configure Authorized JavaScript Origins

Add the domains where your application will run:

**For Development:**

```
http://localhost:5173
http://localhost:3000
```

**For Production:**

```
https://madewithkiro.com
https://www.madewithkiro.com
```

> **Note**: Do not include trailing slashes or paths in JavaScript origins.

#### Configure Authorized Redirect URIs

Add the Cognito callback URLs:

**For Development:**

```
https://<cognito-domain-dev>.auth.<region>.amazoncognito.com/oauth2/idpresponse
```

**For Production:**

```
https://<cognito-domain-prod>.auth.<region>.amazoncognito.com/oauth2/idpresponse
```

> **Important**: You'll get the exact Cognito domain after deploying your SAM template. You can add placeholder values now and update them later.

**Example:**

```
https://madewithkiro-dev-abc123.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
https://madewithkiro-prod-xyz789.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

6. Click **Create**

### Step 5: Save Google OAuth Credentials

After creating the OAuth client, you'll see a dialog with your credentials:

1. **Copy the Client ID** - You'll need this for your SAM template
2. **Copy the Client Secret** - You'll store this in AWS SSM Parameter Store
3. Click **OK**

> **Security Warning**: Never commit the Client Secret to version control. Store it securely in AWS SSM Parameter Store.

You can always retrieve these credentials later:

1. Navigate to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. View the Client ID and Client Secret

### Step 6: Download Credentials (Optional)

For backup purposes, you can download the credentials as JSON:

1. Click the download icon (⬇) next to your OAuth client
2. Save the JSON file securely
3. **Do not commit this file to version control**

---

## GitHub OAuth Setup

### Step 1: Navigate to Developer Settings

1. Log in to [GitHub](https://github.com)
2. Click your profile picture in the top-right corner
3. Click **Settings**
4. Scroll down and click **Developer settings** in the left sidebar
5. Click **OAuth Apps** in the left sidebar

### Step 2: Create New OAuth App

1. Click **New OAuth App** (or **Register a new application**)
2. Fill in the application details:

#### Application Details

**Application name:**

- Development: `MadeWithKiro Dev`
- Production: `MadeWithKiro`

**Homepage URL:**

- Development: `http://localhost:5173`
- Production: `https://madewithkiro.com`

**Application description:** (Optional but recommended)

```
Showcase platform for applications built with Kiro. Share your Kiro-built projects with the community.
```

**Authorization callback URL:**

```
https://<cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
```

> **Important**: GitHub OAuth Apps only support ONE callback URL. You'll need to create separate OAuth Apps for development and production environments.

**Example callback URLs:**

- Dev: `https://madewithkiro-dev-abc123.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
- Prod: `https://madewithkiro-prod-xyz789.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

3. Click **Register application**

### Step 3: Generate Client Secret

1. After registering, you'll see your **Client ID** - copy this
2. Click **Generate a new client secret**
3. **Copy the Client Secret immediately** - you won't be able to see it again
4. Store the Client Secret securely (you'll add it to AWS SSM Parameter Store)

> **Security Warning**: The Client Secret is only shown once. If you lose it, you'll need to generate a new one.

### Step 4: Configure Application Settings (Optional)

You can customize additional settings:

**Application logo:**

- Upload a 200x200px PNG or JPG logo
- This appears on the OAuth authorization screen

**Badge:**

- (Optional) Add a badge to display on your GitHub profile

**Enable Device Flow:**

- Leave unchecked (not needed for web applications)

**Webhook URL:**

- Leave empty (not needed for authentication)

### Step 5: Save GitHub OAuth Credentials

Make note of:

- **Client ID**: Visible on the OAuth App page
- **Client Secret**: Copied in Step 3 (store securely)

### Step 6: Create Separate Apps for Each Environment

Repeat Steps 2-5 to create separate OAuth Apps:

1. **MadeWithKiro Dev**

   - Homepage: `http://localhost:5173`
   - Callback: `https://<cognito-dev-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`

2. **MadeWithKiro Prod**
   - Homepage: `https://madewithkiro.com`
   - Callback: `https://<cognito-prod-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`

> **Why separate apps?** GitHub only allows one callback URL per OAuth App, so you need separate apps for different environments.

---

## SSM Parameter Storage

AWS Systems Manager Parameter Store provides secure, encrypted storage for OAuth secrets. This keeps secrets out of your code and CloudFormation templates.

### Why Use SSM Parameter Store?

- **Security**: Secrets are encrypted with AWS KMS
- **Access Control**: IAM policies control who can read secrets
- **Audit Trail**: CloudTrail logs all access to parameters
- **Version Control**: Parameter Store maintains version history
- **No Hardcoding**: Secrets never appear in code or templates

### Parameter Naming Convention

Use a consistent naming pattern for parameters:

```
/madewithkiro/<environment>/<provider>-client-secret
```

**Examples:**

- `/madewithkiro/dev/google-client-secret`
- `/madewithkiro/dev/github-client-secret`
- `/madewithkiro/prod/google-client-secret`
- `/madewithkiro/prod/github-client-secret`

### Store Parameters Using AWS CLI

#### Development Environment

```bash
# Google OAuth Client Secret
aws ssm put-parameter \
  --name "/madewithkiro/dev/google-client-secret" \
  --value "YOUR_GOOGLE_CLIENT_SECRET_HERE" \
  --type "SecureString" \
  --description "Google OAuth client secret for development environment" \
  --tags "Key=Environment,Value=dev" "Key=Application,Value=MadeWithKiro" \
  --overwrite

# GitHub OAuth Client Secret
aws ssm put-parameter \
  --name "/madewithkiro/dev/github-client-secret" \
  --value "YOUR_GITHUB_CLIENT_SECRET_HERE" \
  --type "SecureString" \
  --description "GitHub OAuth client secret for development environment" \
  --tags "Key=Environment,Value=dev" "Key=Application,Value=MadeWithKiro" \
  --overwrite
```

#### Production Environment

```bash
# Google OAuth Client Secret
aws ssm put-parameter \
  --name "/madewithkiro/prod/google-client-secret" \
  --value "YOUR_GOOGLE_CLIENT_SECRET_HERE" \
  --type "SecureString" \
  --description "Google OAuth client secret for production environment" \
  --tags "Key=Environment,Value=prod" "Key=Application,Value=MadeWithKiro" \
  --overwrite

# GitHub OAuth Client Secret
aws ssm put-parameter \
  --name "/madewithkiro/prod/github-client-secret" \
  --value "YOUR_GITHUB_CLIENT_SECRET_HERE" \
  --type "SecureString" \
  --description "GitHub OAuth client secret for production environment" \
  --tags "Key=Environment,Value=prod" "Key=Application,Value=MadeWithKiro" \
  --overwrite
```

### Store Parameters Using Makefile

The project includes a Makefile with commands to simplify parameter storage:

```bash
# Set environment variables
export GOOGLE_CLIENT_SECRET='your-google-secret'
export GITHUB_CLIENT_SECRET='your-github-secret'

# Store in SSM for development
make setup-ssm-dev

# Store in SSM for production
make setup-ssm-prod
```

### Verify Parameters Were Created

```bash
# List all parameters
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Values=/madewithkiro/"

# Get parameter value (requires decrypt permission)
aws ssm get-parameter \
  --name "/madewithkiro/dev/google-client-secret" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text
```

### IAM Permissions Required

To create and read SSM parameters, you need these IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:DescribeParameters"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/madewithkiro/*"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:Encrypt"],
      "Resource": "arn:aws:kms:*:*:key/*"
    }
  ]
}
```

### Parameter Rotation Best Practices

1. **Rotate secrets regularly** (every 90 days recommended)
2. **Update both the OAuth provider and SSM** when rotating
3. **Test in development** before rotating production secrets
4. **Monitor CloudTrail** for unauthorized access attempts
5. **Use parameter versions** to track changes

---

## Cognito Domain Configuration

After deploying your SAM template, you need to configure a Cognito domain for OAuth redirects.

### Understanding Cognito Domains

Cognito provides two types of domains:

1. **Amazon Cognito Domain**: `<your-domain-prefix>.auth.<region>.amazoncognito.com`

   - Free
   - Quick to set up
   - Includes "amazoncognito.com" in URL

2. **Custom Domain**: `auth.yourdomain.com`
   - Requires ACM certificate
   - Professional appearance
   - Additional configuration required

For this guide, we'll use the Amazon Cognito domain.

### Create Cognito Domain

#### Using AWS CLI

```bash
# Get User Pool ID from CloudFormation outputs
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Create domain (must be globally unique)
aws cognito-idp create-user-pool-domain \
  --domain madewithkiro-dev-$(date +%s) \
  --user-pool-id $USER_POOL_ID

# Get the domain name
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --query 'UserPool.Domain' \
  --output text
```

#### Using AWS Console

1. Navigate to **Amazon Cognito** in AWS Console
2. Click on your User Pool
3. Go to **App integration** tab
4. Scroll to **Domain** section
5. Click **Actions** → **Create Cognito domain**
6. Enter a domain prefix (must be globally unique):
   - Development: `madewithkiro-dev-<random-suffix>`
   - Production: `madewithkiro-prod-<random-suffix>`
7. Click **Create Cognito domain**

### Verify Domain Creation

```bash
# Check domain status
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --query 'UserPool.Domain'
```

The domain will be:

```
<your-prefix>.auth.<region>.amazoncognito.com
```

**Example:**

```
madewithkiro-dev-1234567890.auth.us-east-1.amazoncognito.com
```

---

## Callback URL Configuration

After creating your Cognito domain, you must update the OAuth provider callback URLs to match exactly.

### Understanding Callback URLs

The callback URL is where the OAuth provider redirects users after authentication. It must match exactly between:

1. **OAuth Provider Configuration** (Google/GitHub)
2. **Cognito User Pool Client Configuration**
3. **Frontend Application Configuration**

### Callback URL Format

```
https://<cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
```

**Example:**

```
https://madewithkiro-dev-1234567890.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### Update Google OAuth Callback URLs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, click **Add URI**
5. Enter the exact Cognito callback URL:
   ```
   https://<your-cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```
6. Click **Save**

### Update GitHub OAuth Callback URL

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps**
3. Click on your OAuth App
4. Update **Authorization callback URL** with the exact Cognito callback URL:
   ```
   https://<your-cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```
5. Click **Update application**

### Update Cognito User Pool Client

The SAM template should already include callback URLs, but you can verify and update them:

#### Using AWS CLI

```bash
# Get User Pool Client ID
CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

# Update callback URLs
aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --callback-urls \
    "http://localhost:5173/auth/callback" \
    "https://dev.madewithkiro.com/auth/callback" \
  --logout-urls \
    "http://localhost:5173/" \
    "https://dev.madewithkiro.com/"
```

#### Using AWS Console

1. Navigate to **Amazon Cognito** → Your User Pool
2. Go to **App integration** tab
3. Click on your App client
4. Scroll to **Hosted UI settings**
5. Update **Allowed callback URLs**:
   ```
   http://localhost:5173/auth/callback
   https://dev.madewithkiro.com/auth/callback
   https://madewithkiro.com/auth/callback
   ```
6. Update **Allowed sign-out URLs**:
   ```
   http://localhost:5173/
   https://dev.madewithkiro.com/
   https://madewithkiro.com/
   ```
7. Click **Save changes**

### Verify Callback URL Configuration

Test that callback URLs are configured correctly:

```bash
# Describe User Pool Client
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --query 'UserPoolClient.CallbackURLs'
```

---

## Multi-Domain Setup

For testing authentication across multiple domains (localhost, development, production), you need to configure OAuth providers to accept requests from all domains.

### Why Multi-Domain Support?

- **Local Development**: Test on `http://localhost:5173`
- **Development Environment**: Test on `https://dev.madewithkiro.com`
- **Production Environment**: Deploy to `https://madewithkiro.com`

### Google OAuth Multi-Domain Configuration

Google OAuth supports multiple authorized origins and redirect URIs in a single OAuth client.

#### Authorized JavaScript Origins

Add all domains where your application runs:

```
http://localhost:5173
http://localhost:3000
https://dev.madewithkiro.com
https://madewithkiro.com
```

#### Authorized Redirect URIs

Add Cognito callback URLs for all environments:

```
https://madewithkiro-dev-<suffix>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
https://madewithkiro-prod-<suffix>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### GitHub OAuth Multi-Domain Configuration

GitHub OAuth Apps only support ONE callback URL per app. You have two options:

#### Option 1: Separate Apps (Recommended)

Create separate OAuth Apps for each environment:

1. **MadeWithKiro Dev**

   - Callback: `https://madewithkiro-dev-<suffix>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
   - Use for localhost and dev environment

2. **MadeWithKiro Prod**
   - Callback: `https://madewithkiro-prod-<suffix>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
   - Use for production environment

#### Option 2: GitHub Apps (Advanced)

GitHub Apps support multiple callback URLs but require more complex setup. For most use cases, separate OAuth Apps are simpler.

### Cognito Multi-Domain Configuration

Configure Cognito User Pool Client with all callback URLs:

```yaml
# template.yaml
CognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    CallbackURLs:
      - http://localhost:5173/auth/callback
      - http://localhost:3000/auth/callback
      - https://dev.madewithkiro.com/auth/callback
      - https://madewithkiro.com/auth/callback
    LogoutURLs:
      - http://localhost:5173/
      - http://localhost:3000/
      - https://dev.madewithkiro.com/
      - https://madewithkiro.com/
```

### Dynamic Redirect URL Detection

The frontend application automatically detects the current domain and uses the appropriate redirect URL:

```typescript
// src/config/amplify.ts
const getCurrentDomain = (): string => {
  return window.location.origin;
};

const getRedirectUrls = () => {
  const currentDomain = getCurrentDomain();

  return {
    redirectSignIn: `${currentDomain}/auth/callback`,
    redirectSignOut: `${currentDomain}/`,
  };
};
```

This allows the same build to work on localhost, dev, and prod without code changes.

### Testing Multi-Domain Setup

Test authentication on each domain:

1. **Localhost**: `http://localhost:5173`

   ```bash
   bun run dev
   # Navigate to http://localhost:5173/auth
   # Test Google and GitHub OAuth
   ```

2. **Development**: `https://dev.madewithkiro.com`

   ```bash
   # Deploy to dev environment
   make deploy-dev
   # Navigate to https://dev.madewithkiro.com/auth
   # Test Google and GitHub OAuth
   ```

3. **Production**: `https://madewithkiro.com`
   ```bash
   # Deploy to production
   make deploy-prod
   # Navigate to https://madewithkiro.com/auth
   # Test Google and GitHub OAuth
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "redirect_uri_mismatch" Error

**Symptoms:**

- Error message: "The redirect URI in the request does not match the ones authorized for the OAuth client"
- Occurs when clicking "Continue with Google"

**Causes:**

1. Redirect URI in OAuth app doesn't match Cognito domain
2. Typo in redirect URI (extra slash, wrong protocol, etc.)
3. Cognito domain not configured

**Solutions:**

1. Verify the exact Cognito domain:

   ```bash
   aws cognito-idp describe-user-pool \
     --user-pool-id $USER_POOL_ID \
     --query 'UserPool.Domain'
   ```

2. Check Google OAuth redirect URIs:

   - Go to Google Cloud Console → Credentials
   - Verify redirect URI exactly matches:
     ```
     https://<cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
     ```

3. Ensure no trailing slashes or extra characters

#### Issue: "invalid_client" Error

**Symptoms:**

- Error message: "Client authentication failed"
- Occurs during OAuth callback

**Causes:**

1. Client Secret not found in SSM Parameter Store
2. Client Secret doesn't match OAuth provider
3. SSM parameter name is incorrect

**Solutions:**

1. Verify SSM parameter exists:

   ```bash
   aws ssm get-parameter \
     --name "/madewithkiro/dev/google-client-secret" \
     --with-decryption
   ```

2. Verify parameter name in SAM template matches:

   ```yaml
   ProviderDetails:
     client_secret: !Sub "{{resolve:ssm-secure:/madewithkiro/${Environment}/google-client-secret}}"
   ```

3. Regenerate Client Secret if necessary and update SSM

#### Issue: "access_denied" Error

**Symptoms:**

- Error message: "User denied access"
- User is redirected back to app with error

**Causes:**

1. User clicked "Cancel" on OAuth consent screen
2. User denied requested permissions
3. OAuth app not approved for requested scopes

**Solutions:**

1. This is expected behavior - user chose not to authenticate
2. Display friendly error message and allow retry
3. Ensure OAuth consent screen is properly configured
4. Request only necessary scopes

#### Issue: "User Pool Client does not exist"

**Symptoms:**

- Error during Cognito configuration
- OAuth flow doesn't initiate

**Causes:**

1. User Pool Client not created yet
2. Client ID in environment variables is incorrect
3. Wrong AWS region configured

**Solutions:**

1. Verify User Pool Client exists:

   ```bash
   aws cognito-idp describe-user-pool-client \
     --user-pool-id $USER_POOL_ID \
     --client-id $CLIENT_ID
   ```

2. Check CloudFormation outputs:

   ```bash
   aws cloudformation describe-stacks \
     --stack-name madewithkiro-dev \
     --query 'Stacks[0].Outputs'
   ```

3. Update `.env.development` with correct values

#### Issue: Profile Picture Not Loading

**Symptoms:**

- User authenticates successfully
- Profile picture shows default avatar instead of social profile picture

**Causes:**

1. Picture URL not retrieved from OAuth provider
2. CORS issue loading external image
3. Image URL is invalid or expired

**Solutions:**

1. Verify attribute mapping in Cognito:

   ```bash
   aws cognito-idp describe-identity-provider \
     --user-pool-id $USER_POOL_ID \
     --provider-name Google \
     --query 'IdentityProvider.AttributeMapping'
   ```

2. Check that `picture` attribute is mapped:

   - Google: `picture` → `picture`
   - GitHub: `avatar_url` → `picture`

3. Verify user attributes after authentication:

   ```typescript
   const attributes = await Auth.userAttributes(cognitoUser);
   console.log("User attributes:", attributes);
   ```

4. Ensure ProfilePicture component handles errors:
   ```typescript
   <img src={pictureUrl} onError={() => setImageError(true)} alt="Profile" />
   ```

#### Issue: "Network Error" During Authentication

**Symptoms:**

- Authentication fails with network error
- No redirect to OAuth provider

**Causes:**

1. Cognito domain not accessible
2. Firewall blocking OAuth requests
3. DNS resolution issues
4. CORS configuration issues

**Solutions:**

1. Test Cognito domain accessibility:

   ```bash
   curl https://<cognito-domain>.auth.<region>.amazoncognito.com
   ```

2. Check browser console for CORS errors

3. Verify network connectivity:

   ```bash
   ping <cognito-domain>.auth.<region>.amazoncognito.com
   ```

4. Try from different network (mobile hotspot, etc.)

#### Issue: Session Not Persisting

**Symptoms:**

- User authenticates successfully
- After page refresh, user is logged out
- Session doesn't persist across browser sessions

**Causes:**

1. Refresh token not being stored
2. Browser blocking localStorage/cookies
3. Token expiration too short
4. Amplify not configured correctly

**Solutions:**

1. Verify Amplify storage configuration:

   ```typescript
   // Check browser storage
   console.log(
     "Local storage:",
     localStorage.getItem("amplify-signin-with-hostedUI")
   );
   ```

2. Check browser privacy settings:

   - Ensure cookies and localStorage are enabled
   - Disable "Block all cookies" setting
   - Try in incognito mode to rule out extensions

3. Verify refresh token settings in Cognito:

   ```bash
   aws cognito-idp describe-user-pool-client \
     --user-pool-id $USER_POOL_ID \
     --client-id $CLIENT_ID \
     --query 'UserPoolClient.RefreshTokenValidity'
   ```

4. Ensure AuthContext checks for existing session:
   ```typescript
   useEffect(() => {
     checkUser(); // Should run on mount
   }, []);
   ```

#### Issue: "Too Many Requests" Error

**Symptoms:**

- Error message: "Rate limit exceeded"
- Authentication fails after multiple attempts

**Causes:**

1. Too many authentication attempts in short time
2. OAuth provider rate limiting
3. Cognito throttling

**Solutions:**

1. Wait a few minutes before retrying
2. Implement exponential backoff in retry logic
3. Check OAuth provider quotas:

   - Google: 10,000 requests per day (default)
   - GitHub: 5,000 requests per hour per OAuth app

4. Contact provider support to increase limits if needed

### Debugging Tools

#### Enable Amplify Debug Logging

```typescript
// src/config/amplify.ts
import { Amplify } from "aws-amplify";

Amplify.configure({
  // ... your config
});

// Enable debug logging
if (import.meta.env.DEV) {
  Amplify.Logger.LOG_LEVEL = "DEBUG";
}
```

#### Check Cognito User Pool Logs

```bash
# Enable CloudWatch logging for User Pool
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --user-pool-add-ons "AdvancedSecurityMode=AUDIT"

# View logs
aws logs tail /aws/cognito/userpools/$USER_POOL_ID --follow
```

#### Test OAuth Flow Manually

```bash
# Get authorization URL
COGNITO_DOMAIN="your-cognito-domain.auth.region.amazoncognito.com"
CLIENT_ID="your-client-id"
REDIRECT_URI="http://localhost:5173/auth/callback"

echo "https://${COGNITO_DOMAIN}/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${REDIRECT_URI}&identity_provider=Google"
```

Open this URL in a browser to test the OAuth flow manually.

#### Verify Token Contents

```typescript
// Decode JWT token (client-side only for debugging)
import { Auth } from "aws-amplify";

const session = await Auth.currentSession();
const idToken = session.getIdToken();
const payload = idToken.decodePayload();

console.log("Token payload:", payload);
console.log("User attributes:", {
  email: payload.email,
  name: payload.name,
  picture: payload.picture,
});
```

---

## Security Best Practices

### OAuth Client Secrets

1. **Never commit secrets to version control**

   - Use `.gitignore` to exclude `.env` files
   - Use SSM Parameter Store for production secrets
   - Rotate secrets regularly (every 90 days)

2. **Use different secrets for each environment**

   - Development secrets should differ from production
   - Limit access to production secrets
   - Use separate OAuth apps when possible

3. **Restrict access to SSM parameters**
   ```json
   {
     "Effect": "Allow",
     "Action": ["ssm:GetParameter"],
     "Resource": "arn:aws:ssm:*:*:parameter/madewithkiro/prod/*",
     "Condition": {
       "StringEquals": {
         "aws:RequestedRegion": "us-east-1"
       }
     }
   }
   ```

### OAuth Scopes

1. **Request minimum necessary scopes**

   - Google: `email`, `profile`, `openid` (no additional scopes)
   - GitHub: `read:user`, `user:email` (no repo access)

2. **Document why each scope is needed**

   - Helps with OAuth app review process
   - Builds user trust
   - Reduces attack surface

3. **Review scopes regularly**
   - Remove unused scopes
   - Update OAuth consent screen
   - Re-verify with providers if needed

### Redirect URIs

1. **Use HTTPS in production**

   - Never use HTTP for production redirect URIs
   - Localhost HTTP is acceptable for development only

2. **Validate redirect URIs strictly**

   - Don't use wildcards in redirect URIs
   - List all valid URIs explicitly
   - Remove old/unused URIs

3. **Monitor for unauthorized redirects**
   - Check CloudWatch logs for unexpected redirect attempts
   - Set up alarms for failed authentications
   - Review Cognito audit logs regularly

### Token Security

1. **Use short-lived access tokens**

   - Default: 60 minutes (recommended)
   - Maximum: 24 hours
   - Configure in Cognito User Pool Client

2. **Implement token refresh**

   - Automatically refresh expired access tokens
   - Use refresh tokens (valid for 30 days)
   - Handle refresh failures gracefully

3. **Revoke tokens on sign-out**

   ```typescript
   await Auth.signOut({ global: true }); // Revokes all tokens
   ```

4. **Validate tokens server-side**
   - API Gateway validates tokens with Cognito
   - Never trust client-side token validation alone
   - Verify token signature and expiration

### User Data Protection

1. **Minimize stored user data**

   - Only store necessary profile information
   - Don't store sensitive OAuth tokens in database
   - Use Cognito as source of truth for user identity

2. **Encrypt data at rest**

   - Enable DynamoDB encryption
   - Use KMS for SSM parameters
   - Encrypt S3 buckets if storing user files

3. **Implement proper access controls**
   - Users can only access their own data
   - Validate user ID from JWT token
   - Implement row-level security in Lambda

### Monitoring and Auditing

1. **Enable CloudTrail logging**

   ```bash
   aws cloudtrail create-trail \
     --name madewithkiro-audit \
     --s3-bucket-name madewithkiro-audit-logs
   ```

2. **Monitor authentication events**

   - Failed login attempts
   - Unusual geographic locations
   - Multiple failed attempts from same IP
   - Token refresh failures

3. **Set up CloudWatch alarms**

   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name high-auth-failures \
     --metric-name AuthenticationFailures \
     --threshold 10 \
     --evaluation-periods 1 \
     --period 300
   ```

4. **Review logs regularly**
   - Weekly review of authentication logs
   - Monthly security audit
   - Quarterly access review

### Compliance Considerations

1. **GDPR Compliance** (if serving EU users)

   - Provide clear privacy policy
   - Allow users to delete their data
   - Obtain explicit consent for data processing
   - Implement data export functionality

2. **OAuth Provider Terms of Service**

   - Review Google's OAuth policies
   - Review GitHub's OAuth policies
   - Comply with branding guidelines
   - Display required attribution

3. **Data Retention**
   - Define data retention policy
   - Implement automatic data deletion
   - Document data handling procedures
   - Provide user data export

### Incident Response

1. **Prepare incident response plan**

   - Document steps for security incidents
   - Define escalation procedures
   - Maintain contact list for security team

2. **Secret rotation procedure**

   ```bash
   # 1. Generate new secret in OAuth provider
   # 2. Update SSM parameter
   aws ssm put-parameter \
     --name "/madewithkiro/prod/google-client-secret" \
     --value "NEW_SECRET" \
     --overwrite

   # 3. Update CloudFormation stack
   aws cloudformation update-stack \
     --stack-name madewithkiro-prod \
     --use-previous-template \
     --capabilities CAPABILITY_IAM

   # 4. Verify authentication still works
   # 5. Revoke old secret in OAuth provider
   ```

3. **Breach notification**
   - Notify affected users within 72 hours
   - Report to relevant authorities
   - Document incident and response
   - Implement preventive measures

---

## Quick Reference

### Essential Commands

```bash
# Store OAuth secrets
aws ssm put-parameter --name "/madewithkiro/dev/google-client-secret" --value "SECRET" --type "SecureString"
aws ssm put-parameter --name "/madewithkiro/dev/github-client-secret" --value "SECRET" --type "SecureString"

# Get Cognito configuration
aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs'

# Create Cognito domain
aws cognito-idp create-user-pool-domain --domain madewithkiro-dev-$(date +%s) --user-pool-id $USER_POOL_ID

# Test authentication
curl -I https://<cognito-domain>.auth.<region>.amazoncognito.com
```

### Callback URL Checklist

- [ ] Google OAuth redirect URI matches Cognito domain exactly
- [ ] GitHub OAuth callback URL matches Cognito domain exactly
- [ ] Cognito User Pool Client includes all callback URLs
- [ ] Frontend redirect URLs match environment
- [ ] No trailing slashes in redirect URIs
- [ ] HTTPS used for production (HTTP only for localhost)

### Environment Variables Checklist

- [ ] `VITE_USER_POOL_ID` set correctly
- [ ] `VITE_USER_POOL_CLIENT_ID` set correctly
- [ ] `VITE_IDENTITY_POOL_ID` set correctly
- [ ] `VITE_COGNITO_DOMAIN` set correctly
- [ ] `VITE_AWS_REGION` set correctly
- [ ] `VITE_OAUTH_REDIRECT_SIGN_IN` set correctly
- [ ] `VITE_OAUTH_REDIRECT_SIGN_OUT` set correctly

### Testing Checklist

- [ ] Google OAuth works on localhost
- [ ] GitHub OAuth works on localhost
- [ ] Google OAuth works on dev environment
- [ ] GitHub OAuth works on dev environment
- [ ] Google OAuth works on production
- [ ] GitHub OAuth works on production
- [ ] Profile pictures load correctly
- [ ] Session persists across page refreshes
- [ ] Sign-out clears session completely
- [ ] Protected routes redirect to auth
- [ ] Callback redirects to intended destination

---

## Additional Resources

### Official Documentation

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [AWS Cognito User Pools Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [AWS Amplify Auth Documentation](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)

### Related Project Documentation

- [OAuth Setup Quick Start](./OAUTH-SETUP-QUICKSTART.md) - Quick setup guide
- [SSM Parameter Setup](./SSM-PARAMETER-SETUP.md) - Detailed SSM guide
- [Deployment Guide](./DEPLOYMENT-GUIDE.md) - Full deployment process
- [Authentication Design](../.kiro/specs/social-authentication/design.md) - Technical design
- [Authentication Requirements](../.kiro/specs/social-authentication/requirements.md) - Feature requirements

### Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [GitHub Issues](https://github.com/your-org/madewithkiro/issues)
3. Contact the development team

---

**Last Updated**: 2024
**Version**: 1.0.0
