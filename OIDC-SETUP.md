# GitHub Actions OIDC Infrastructure Setup

This document provides instructions for setting up the GitHub Actions OIDC infrastructure stack for the MadeWithKiro CI/CD pipeline.

## Overview

The OIDC infrastructure stack creates:

- GitHub OIDC Identity Provider in AWS
- Single IAM Role for GitHub Actions with deployment permissions for both dev and prod environments
- Proper trust relationships for secure authentication

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. AWS SAM CLI installed
3. GitHub repository with Actions enabled

## Files Created

- `oidc-template.yaml` - SAM template for OIDC infrastructure
- `oidc-samconfig.toml` - SAM configuration for deployment
- `OIDC-SETUP.md` - This setup documentation

## Configuration

### 1. Update GitHub Repository Information

Edit `oidc-samconfig.toml` and update the following parameters:

```toml
# Replace with your actual GitHub organization/username and repository name
"GitHubOrg=your-github-org",
"GitHubRepo=madewithkiro",
```

### 2. Deploy OIDC Stack

```bash
# Validate the template
sam validate --template oidc-template.yaml --region us-west-2

# Deploy the OIDC stack
sam deploy --template oidc-template.yaml --config-file oidc-samconfig.toml
```

### 3. Capture Role ARN

After successful deployment, capture the role ARN from the stack outputs:

```bash
# Get the role ARN
aws cloudformation describe-stacks \
  --stack-name madewithkiro-oidc \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`GitHubActionsRoleArn`].OutputValue' \
  --output text
```

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

1. **AWS_REGION**: `us-west-2`
2. **DEPLOYMENT_ROLE_ARN**: The role ARN from the stack output
3. **DISCORD_WEBHOOK_URL**: Discord webhook URL for notifications (optional)

### Setting GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the appropriate value

## IAM Permissions

The deployment role includes permissions for:

- **CloudFormation**: Full access for stack management
- **IAM**: Full access for role/policy management
- **S3**: Bucket and object operations for deployments and frontend hosting
- **Lambda**: Function management for SAM deployments
- **API Gateway**: REST API management
- **DynamoDB**: Table operations
- **Cognito**: User pool and identity pool management
- **CloudFront**: Distribution and cache management
- **Route 53**: DNS record management
- **SES**: Email service configuration
- **SSM**: Parameter Store access for configuration
- **CloudWatch Logs**: Log group management

## Security Considerations

### Trust Policy

The role can only be assumed by GitHub Actions from:

- Main branch pushes: `repo:org/repo:ref:refs/heads/main`
- Release tags: `repo:org/repo:ref:refs/tags/v*`
- Pull requests: `repo:org/repo:pull_request`

### Least Privilege

While the role has broad permissions for deployment, it's scoped to:

- Specific S3 bucket patterns
- CloudFormation stack operations
- Resource creation/management only

## Troubleshooting

### Common Issues

1. **Template Validation Errors**: The cfn-lint tool may show false positives for `AWS::IAM::OIDCIdentityProvider`. This is a known issue and can be ignored.

2. **Permission Denied**: Ensure your AWS credentials have sufficient permissions to create IAM roles and OIDC providers.

3. **GitHub Repository Access**: Verify the GitHubOrg and GitHubRepo parameters match your actual repository.

### Verification

After deployment, verify the setup:

```bash
# Check if OIDC provider exists
aws iam list-open-id-connect-providers --region us-west-2

# Check if role exists
aws iam get-role --role-name GitHubActions-DeploymentRole --region us-west-2
```

## Next Steps

After successful OIDC infrastructure deployment:

1. Configure GitHub repository settings and branch protection rules
2. Create GitHub Actions workflows
3. Set up GitHub environments (development/production)
4. Test the CI/CD pipeline with a sample deployment

## Stack Management

### Update Stack

```bash
# Update the OIDC stack
sam deploy --template oidc-template.yaml --config-file oidc-samconfig.toml
```

### Delete Stack

```bash
# Delete the OIDC stack
aws cloudformation delete-stack --stack-name madewithkiro-oidc --region us-west-2
```

## References

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [AWS IAM OIDC Identity Providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [AWS SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
