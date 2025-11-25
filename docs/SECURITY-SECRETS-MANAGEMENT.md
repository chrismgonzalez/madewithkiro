# Security: Secrets Management

## Overview

This document explains how sensitive credentials and secrets are managed in the MadeWithKiro application to ensure security best practices are followed.

## Secrets Storage Strategy

All sensitive credentials are stored in **AWS Systems Manager (SSM) Parameter Store** and are **never committed to version control**. This includes:

- OAuth Client IDs
- OAuth Client Secrets
- API keys
- Database credentials
- Any other sensitive configuration values

## Environment Separation

Secrets are stored with environment-specific paths to ensure complete isolation between development and production:

```
/madewithkiro/dev/...    # Development environment secrets
/madewithkiro/prod/...   # Production environment secrets
```

This prevents accidental use of production credentials in development and vice versa.

## OAuth Credentials Structure

### SSM Parameter Paths

#### Development Environment

- `/madewithkiro/dev/google-client-id` - Google OAuth Client ID
- `/madewithkiro/dev/google-client-secret` - Google OAuth Client Secret (SecureString)
- `/madewithkiro/dev/github-client-id` - GitHub OAuth Client ID
- `/madewithkiro/dev/github-client-secret` - GitHub OAuth Client Secret (SecureString)

#### Production Environment

- `/madewithkiro/prod/google-client-id` - Google OAuth Client ID
- `/madewithkiro/prod/google-client-secret` - Google OAuth Client Secret (SecureString)
- `/madewithkiro/prod/github-client-id` - GitHub OAuth Client ID
- `/madewithkiro/prod/github-client-secret` - GitHub OAuth Client Secret (SecureString)

### Parameter Types

- **Client IDs**: Stored as `String` type (not sensitive, but centralized for consistency)
- **Client Secrets**: Stored as `String` type (encrypted at rest by AWS)

## Configuration Files

### samconfig.toml

The `samconfig.toml` file contains **only references to SSM parameter paths**, never actual secrets:

```toml
[dev.deploy.parameters]
parameter_overrides = [
  "GoogleClientIdParameter=/madewithkiro/dev/google-client-id",
  "GoogleClientSecretParameter=/madewithkiro/dev/google-client-secret",
  "GitHubClientIdParameter=/madewithkiro/dev/github-client-id",
  "GitHubClientSecretParameter=/madewithkiro/dev/github-client-secret",
]
```

### template.yaml

The SAM template uses CloudFormation's `{{resolve:ssm:...}}` syntax to retrieve secrets at deployment time:

```yaml
ProviderDetails:
  client_id: !Sub "{{resolve:ssm:${GoogleClientIdParameter}}}"
  client_secret: !Sub "{{resolve:ssm:${GoogleClientSecretParameter}}}"
```

Secrets are resolved during CloudFormation stack deployment and are never visible in:

- CloudFormation console
- Stack outputs
- CloudFormation events
- Git history

### .env Files

- `.env.example` - Contains **only placeholder values** (safe to commit)
- `.env.development` - Contains actual values (in `.gitignore`, never committed)
- `.env.production` - Contains actual values (in `.gitignore`, never committed)

## Setting Up Secrets

### Prerequisites

1. AWS CLI installed and configured
2. Appropriate IAM permissions:
   - `ssm:PutParameter`
   - `ssm:GetParameter`
   - `ssm:DescribeParameters`

### Step 1: Obtain OAuth Credentials

Follow the [OAuth Provider Setup Guide](./OAUTH-PROVIDER-SETUP.md) to create OAuth applications and obtain:

- Google OAuth Client ID and Secret
- GitHub OAuth Client ID and Secret

### Step 2: Store Secrets in SSM

Use the provided script to store secrets securely:

```bash
# Set environment variables (never commit these!)
export GOOGLE_CLIENT_ID='your-google-client-id'
export GOOGLE_CLIENT_SECRET='your-google-client-secret'
export GITHUB_CLIENT_ID='your-github-client-id'
export GITHUB_CLIENT_SECRET='your-github-client-secret'

# Store in development environment
./scripts/setup-ssm-parameters.sh dev

# Store in production environment (use different credentials!)
./scripts/setup-ssm-parameters.sh prod
```

### Step 3: Verify Secrets

Verify that secrets were stored correctly:

```bash
# List all parameters for an environment
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Values=/madewithkiro/dev/"

# Verify a specific parameter exists (without showing value)
aws ssm get-parameter \
  --name "/madewithkiro/dev/google-client-id" \
  --query "Parameter.Name" \
  --output text
```

### Step 4: Deploy

Once secrets are in SSM, deploy the application:

```bash
# Development
sam deploy --config-env dev

# Production
sam deploy --config-env prod
```

The deployment will automatically retrieve secrets from SSM.

## Security Best Practices

### 1. Never Commit Secrets

**DO NOT** commit any of the following to version control:

- OAuth Client Secrets
- API keys
- Database passwords
- `.env.development` or `.env.production` files
- Any file containing actual credential values

**ALWAYS** use:

- SSM Parameter Store for AWS deployments
- Environment variables for local development
- `.env.example` with placeholder values only

### 2. Use Different Credentials Per Environment

- Development and production **must** use different OAuth applications
- Never use production credentials in development
- Rotate credentials regularly (every 90 days recommended)

### 3. Limit Access to Secrets

Use IAM policies to restrict who can read secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:*:*:parameter/madewithkiro/prod/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": "o-xxxxxxxxxx"
        }
      }
    }
  ]
}
```

### 4. Audit Secret Access

Monitor access to secrets using AWS CloudTrail:

```bash
# View recent SSM parameter access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=/madewithkiro/prod/google-client-secret \
  --max-results 10
```

### 5. Rotate Secrets Regularly

Establish a rotation schedule:

1. Create new OAuth credentials in provider console
2. Update SSM parameters with new values
3. Deploy updated application
4. Verify new credentials work
5. Delete old OAuth credentials from provider

## Troubleshooting

### Error: "Parameter not found"

**Cause**: SSM parameter doesn't exist or path is incorrect

**Solution**:

```bash
# Verify parameter exists
aws ssm get-parameter --name "/madewithkiro/dev/google-client-secret"

# If not found, run setup script
./scripts/setup-ssm-parameters.sh dev
```

### Error: "Access Denied"

**Cause**: IAM user/role lacks permissions to read SSM parameters

**Solution**: Add required IAM permissions:

```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameter", "ssm:GetParameters"],
  "Resource": "arn:aws:ssm:*:*:parameter/madewithkiro/*"
}
```

### Error: "Invalid client_secret"

**Cause**: Secret in SSM doesn't match OAuth provider

**Solution**:

1. Verify secret in OAuth provider console
2. Update SSM parameter with correct value:
   ```bash
   export GOOGLE_CLIENT_SECRET='correct-secret'
   ./scripts/setup-ssm-parameters.sh dev
   ```
3. Redeploy application

## Migration from Hardcoded Secrets

If you previously had hardcoded secrets in `samconfig.toml`:

### Step 1: Extract Secrets

Copy the Client IDs and Secrets from `samconfig.toml` (but don't commit them anywhere):

```toml
# OLD (insecure):
"GoogleClientId=227466642868-xxx.apps.googleusercontent.com"
"GitHubClientId=Ov23lixxx"
```

### Step 2: Store in SSM

```bash
export GOOGLE_CLIENT_ID='227466642868-xxx.apps.googleusercontent.com'
export GOOGLE_CLIENT_SECRET='your-secret'
export GITHUB_CLIENT_ID='Ov23lixxx'
export GITHUB_CLIENT_SECRET='your-secret'

./scripts/setup-ssm-parameters.sh dev
```

### Step 3: Update samconfig.toml

Replace hardcoded values with SSM parameter references:

```toml
# NEW (secure):
"GoogleClientIdParameter=/madewithkiro/dev/google-client-id"
"GoogleClientSecretParameter=/madewithkiro/dev/google-client-secret"
"GitHubClientIdParameter=/madewithkiro/dev/github-client-id"
"GitHubClientSecretParameter=/madewithkiro/dev/github-client-secret"
```

### Step 4: Verify Git History

Check that no secrets remain in git history:

```bash
# Search for potential secrets
git log -p | grep -i "client.*secret"
git log -p | grep -E "[0-9]{12}-[a-z0-9]{32}"
```

If secrets are found in history, consider using tools like `git-filter-repo` or `BFG Repo-Cleaner` to remove them.

## Related Documentation

- [SSM Parameter Setup Guide](./SSM-PARAMETER-SETUP.md)
- [OAuth Provider Setup](./OAUTH-PROVIDER-SETUP.md)
- [Deployment Guide](./DEPLOYMENT-WITH-OAUTH.md)
- [Security Hardening Spec](../.kiro/specs/security-hardening/design.md)

## Compliance

This secrets management approach helps meet the following security requirements:

- **Requirement 1.1**: No hardcoded AWS credentials, API keys, or authentication tokens
- **Requirement 1.2**: Placeholder values only in committed .env.example files
- **Requirement 1.3**: SSM parameters or Secrets Manager for all sensitive values
- **Requirement 1.4**: No sensitive data in git history
- **Requirement 1.5**: Secrets retrieved from environment variables or AWS services
- **Requirement 3.1**: Production-specific SSM parameters
- **Requirement 3.2**: Development-specific SSM parameters
