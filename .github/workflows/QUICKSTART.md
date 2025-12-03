# CI/CD Pipeline Quick Start Guide

This guide will help you set up and start using the GitHub Actions CI/CD pipeline for MadeWithKiro.

## Prerequisites

Before you begin, ensure you have:
- [ ] AWS account with administrator access
- [ ] GitHub repository with admin permissions
- [ ] AWS CLI installed and configured locally
- [ ] Basic understanding of AWS IAM and CloudFormation

## Setup Checklist

### 1. Configure AWS OIDC Provider (5 minutes)

```bash
# Using AWS CLI
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

Or use the AWS Console: IAM → Identity Providers → Add provider

### 2. Create IAM Roles (10 minutes)

#### Dev Role
```bash
# Create trust policy file
cat > trust-policy-dev.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/madewithkiro:*"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name GitHubActions-MadeWithKiro-Dev \
  --assume-role-policy-document file://trust-policy-dev.json

# Attach policies (customize based on your needs)
aws iam attach-role-policy \
  --role-name GitHubActions-MadeWithKiro-Dev \
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess

aws iam attach-role-policy \
  --role-name GitHubActions-MadeWithKiro-Dev \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Add more policies as needed for Lambda, DynamoDB, CloudFront, etc.
```

#### Prod Role
```bash
# Create trust policy for prod (more restrictive - only tags)
cat > trust-policy-prod.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/madewithkiro:ref:refs/tags/v*"
        }
      }
    }
  ]
}
EOF

# Create prod role
aws iam create-role \
  --role-name GitHubActions-MadeWithKiro-Prod \
  --assume-role-policy-document file://trust-policy-prod.json

# Attach same policies as dev role
```

**Important:** Replace `YOUR_ACCOUNT_ID` and `YOUR_ORG` with your actual values!

### 3. Configure GitHub Secrets (2 minutes)

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value Example |
|------------|---------------|
| `AWS_ROLE_ARN_DEV` | `arn:aws:iam::123456789012:role/GitHubActions-MadeWithKiro-Dev` |
| `AWS_ROLE_ARN_PROD` | `arn:aws:iam::123456789012:role/GitHubActions-MadeWithKiro-Prod` |

### 4. Configure Production Environment (3 minutes)

1. Go to Settings → Environments
2. Click "New environment"
3. Name: `production`
4. Add protection rules:
   - ✅ Required reviewers (select team members)
   - ✅ Deployment branches: Only tags matching `v*`

### 5. Test the Setup (5 minutes)

#### Test Pull Request Workflow
```bash
# Create a test branch
git checkout -b test-ci

# Make a small change
echo "# Test CI" >> README.md

# Commit and push
git add README.md
git commit -m "test: CI pipeline"
git push origin test-ci

# Create PR on GitHub
# ✅ Watch the Test workflow run automatically
```

#### Test Dev Deployment
```bash
# Merge the PR to main (or push directly to main)
git checkout main
git merge test-ci
git push origin main

# ✅ Watch the Deploy to Dev workflow run automatically
```

#### Test Prod Deployment
```bash
# Create and push a version tag
git tag v0.1.0
git push origin v0.1.0

# ✅ Watch the Deploy to Production workflow run
# Note: This requires approval if you configured environment protection
```

## Common Operations

### Run Tests Manually
```bash
# Locally
make test

# Or separately
bun run test              # Frontend
cd backend && uv run pytest -v  # Backend
```

### Deploy Manually (Bypass CI/CD)
```bash
# Dev
make deploy-dev

# Prod
make deploy-prod
```

### View Deployment Status
```bash
# Check CloudFormation stacks
aws cloudformation describe-stacks --stack-name madewithkiro-dev
aws cloudformation describe-stacks --stack-name madewithkiro-prod

# Or use make commands
make outputs-dev
make outputs-prod
```

### Rollback a Deployment

GitHub Actions doesn't have automatic rollback. To rollback:

#### Option 1: Revert the commit
```bash
git revert <commit-hash>
git push origin main
# This triggers a new deployment with the reverted code
```

#### Option 2: Redeploy previous tag (prod only)
```bash
# Delete the bad tag
git tag -d v1.2.0
git push origin :refs/tags/v1.2.0

# Checkout previous version
git checkout v1.1.0

# Create new tag
git tag v1.2.1
git push origin v1.2.1
```

#### Option 3: Manual rollback via CloudFormation
```bash
aws cloudformation rollback-stack --stack-name madewithkiro-prod
```

### View Workflow Logs
1. Go to GitHub → Actions tab
2. Select the workflow run
3. Click on the job to see detailed logs
4. Download logs for offline analysis (Actions menu → Download log archive)

### Invalidate CloudFront Cache Manually
```bash
# Dev
make invalidate-cloudfront-dev

# Prod
make invalidate-cloudfront-prod
```

## Troubleshooting

### "Error: Credentials could not be loaded"
**Problem:** OIDC authentication failed

**Solutions:**
1. Verify IAM role ARN in GitHub secrets
2. Check role trust policy includes your repository
3. Ensure OIDC provider exists in AWS
4. Verify role has necessary permissions

### "Stack does not exist"
**Problem:** First-time deployment

**Solution:** The deployment will create the stack. This is normal on first run.

### Tests Fail on CI but Pass Locally
**Problem:** Environment differences

**Solutions:**
1. Check Node.js/Python versions match
2. Ensure `package.json` and `requirements.txt` are up to date
3. Look for hardcoded paths or environment-specific code
4. Check for missing environment variables

### Deployment Succeeds but Application Doesn't Work
**Problem:** Configuration mismatch

**Solutions:**
1. Check SSM parameters are set: `make validate-oauth-dev`
2. Verify environment variables in template.yaml
3. Check CloudFront/S3 permissions
4. Review Lambda logs: `make logs-profile` or `make logs-application`

### CloudFront Not Updating
**Problem:** Cache not invalidated

**Solutions:**
1. Wait 1-2 minutes for invalidation to complete
2. Check invalidation status in AWS Console
3. Clear browser cache
4. Verify cache behaviors in CloudFront distribution

## Best Practices

### Branch Strategy
```
main (production-ready)
  ↑
develop (integration)
  ↑
feature/* (new features)
fix/* (bug fixes)
```

**Recommended flow:**
1. Create feature branch from `develop`
2. Open PR to `develop` → Tests run
3. Merge to `develop` → Tests run again
4. When ready for release, merge `develop` to `main` → Deploy to dev
5. Create release tag from `main` → Deploy to prod

### Semantic Versioning
Use semantic versioning for tags:
- `v1.0.0` - Major release (breaking changes)
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)

### Git Tags
```bash
# Create annotated tag with message
git tag -a v1.0.0 -m "Release version 1.0.0"

# List all tags
git tag -l

# Push specific tag
git push origin v1.0.0

# Push all tags
git push origin --tags

# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0
```

### Monitoring
- Set up CloudWatch alarms for Lambda errors
- Monitor CloudFormation stack drift
- Review GitHub Actions usage (Settings → Billing)
- Check AWS costs regularly

## Migration to Other IaC Tools

The pipeline is designed for flexibility. To migrate from SAM to another tool:

1. Keep the test and frontend deployment steps (they're tool-agnostic)
2. Replace only the infrastructure deployment section
3. Use the `_deploy-template.yml` as a reference
4. Update the IaC-specific steps (build, deploy, outputs)

See `README.md` for detailed migration examples.

## Getting Help

- **GitHub Actions Logs:** Check workflow run details
- **AWS CloudFormation:** Review stack events
- **CloudWatch Logs:** View Lambda function logs
- **Make Commands:** Use `make help` for available commands
- **Documentation:** See full README.md in this directory

## Next Steps

Once setup is complete:
- [ ] Add branch protection rules to `main`
- [ ] Configure status checks required before merge
- [ ] Set up AWS CloudWatch alarms
- [ ] Create runbooks for common issues
- [ ] Document application-specific deployment steps
- [ ] Schedule regular security audits of IAM roles

---

**Setup Time:** ~25 minutes total
**Difficulty:** Intermediate
**Prerequisites:** AWS account, GitHub admin access
