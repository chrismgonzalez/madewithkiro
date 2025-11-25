# SSM Parameter Setup Guide

This guide explains how to set up OAuth secrets in AWS Systems Manager Parameter Store for the MadeWithKiro authentication system.

## Overview

The `setup-ssm-parameters.sh` script automates the process of storing OAuth client secrets securely in AWS Systems Manager Parameter Store. These secrets are required for Google OAuth authentication.

## Prerequisites

1. **AWS CLI**: Install the AWS CLI

   - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

2. **AWS Credentials**: Configure AWS credentials with appropriate permissions

   ```bash
   aws configure
   ```

3. **Required IAM Permissions**:

   - `ssm:PutParameter`
   - `ssm:GetParameter`
   - `kms:Encrypt` (for SecureString parameters)

4. **OAuth Credentials**: Obtain OAuth client secrets from [Google Cloud Console](https://console.cloud.google.com/)

## OAuth Provider Setup

### Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Copy the Client ID and Client Secret

See [OAuth Provider Setup Documentation](./OAUTH-PROVIDER-SETUP.md) for detailed steps.

## Usage

### Development Environment

```bash
# Set environment variables
export GOOGLE_CLIENT_ID='your-google-client-id-dev'
export GOOGLE_CLIENT_SECRET='your-google-client-secret-dev'

# Run the script
./scripts/setup-ssm-parameters.sh dev
```

### Production Environment

```bash
# Set environment variables
export GOOGLE_CLIENT_ID='your-google-client-id-prod'
export GOOGLE_CLIENT_SECRET='your-google-client-secret-prod'

# Run the script
./scripts/setup-ssm-parameters.sh prod
```

## What the Script Does

1. **Validates Prerequisites**:

   - Checks if AWS CLI is installed
   - Verifies AWS credentials are configured
   - Validates required environment variables are set

2. **Stores Parameters**:

   - Creates or updates SSM parameters with SecureString type
   - Parameters are encrypted using AWS KMS
   - Stores parameters with descriptive names and descriptions

3. **Verifies Storage**:
   - Confirms each parameter was stored successfully
   - Provides clear success/error messages

## Parameter Names

The script creates the following SSM parameters:

### Development Environment

- `/madewithkiro/dev/google-client-id` - Google OAuth Client ID
- `/madewithkiro/dev/google-client-secret` - Google OAuth Client Secret

### Production Environment

- `/madewithkiro/prod/google-client-id` - Google OAuth Client ID
- `/madewithkiro/prod/google-client-secret` - Google OAuth Client Secret

## Security Considerations

1. **SecureString Type**: All secrets are stored as SecureString, which means they are encrypted at rest using AWS KMS.

2. **Environment Variables**: Never commit OAuth secrets to version control. Always use environment variables.

3. **Access Control**: Ensure only authorized users have access to SSM parameters through IAM policies.

4. **Separate Environments**: Use different OAuth credentials for development and production.

## Troubleshooting

### AWS CLI Not Found

**Error**: `AWS CLI is not installed`

**Solution**: Install AWS CLI following the [official guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### Invalid AWS Credentials

**Error**: `AWS credentials are not configured or invalid`

**Solution**: Run `aws configure` and enter your AWS credentials

### Missing Environment Variables

**Error**: `Missing required environment variables`

**Solution**: Export the required environment variables before running the script:

```bash
export GOOGLE_CLIENT_ID='your-client-id'
export GOOGLE_CLIENT_SECRET='your-secret'
```

### Permission Denied

**Error**: `Failed to create parameter`

**Solution**: Ensure your AWS user/role has the following permissions:

- `ssm:PutParameter`
- `ssm:GetParameter`
- `kms:Encrypt`

### Parameter Already Exists

**Info**: The script automatically detects existing parameters and updates them with the `--overwrite` flag.

## Verification

After running the script, you can verify the parameters were created:

```bash
# List all parameters for a specific environment
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Values=/madewithkiro/dev/"

# Get parameter value (for Client IDs - not secrets)
aws ssm get-parameter \
  --name "/madewithkiro/dev/google-client-id"

# Verify secret exists (without displaying value)
aws ssm get-parameter \
  --name "/madewithkiro/dev/google-client-secret" \
  --query "Parameter.Name" \
  --output text
```

## Next Steps

After setting up SSM parameters:

1. Deploy the SAM template:

   ```bash
   make deploy-dev
   # or
   make deploy-prod
   ```

2. The SAM template will automatically retrieve the secrets from SSM during deployment

3. Update your frontend environment variables with the Cognito configuration outputs

4. Test the OAuth flows

## Related Documentation

- [OAuth Provider Setup Guide](./OAUTH-PROVIDER-SETUP.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Authentication Design Document](../.kiro/specs/social-authentication/design.md)
