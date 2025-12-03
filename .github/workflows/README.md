# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows for automated testing and deployment of the MadeWithKiro application.

## Workflows

### 1. Test Workflow (`test.yml`)
**Trigger:** Pull requests to `main` or `develop` branches

**Purpose:** Runs automated tests to ensure code quality before merging.

**What it does:**
- Runs frontend tests using Vitest
- Runs backend tests using pytest
- Posts test results as PR comments
- Blocks merge if tests fail

### 2. Deploy to Dev (`deploy-dev.yml`)
**Trigger:** Push to `main` branch

**Purpose:** Automatically deploys the application to the development environment.

**What it does:**
- Runs all tests first (frontend + backend)
- Builds the SAM application
- Deploys infrastructure using AWS SAM
- Builds and uploads the frontend to S3
- Invalidates CloudFront cache for immediate updates
- Posts deployment summary

### 3. Deploy to Production (`deploy-prod.yml`)
**Trigger:** Push of version tags (e.g., `v1.0.0`, `v2.1.3`)

**Purpose:** Deploys the application to production environment on release.

**What it does:**
- Runs all tests first (frontend + backend)
- Builds the SAM application
- Deploys infrastructure using AWS SAM to production
- Builds and uploads the frontend to S3
- Invalidates CloudFront cache
- Posts deployment summary with version info

**Usage:** Create and push a release tag to trigger deployment:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## AWS OIDC Setup

The workflows use OpenID Connect (OIDC) to authenticate with AWS, eliminating the need for long-lived credentials. This is more secure and follows AWS best practices.

### Step 1: Create OIDC Identity Provider in AWS

1. Navigate to **IAM** → **Identity Providers** in AWS Console
2. Click **Add provider**
3. Configure the provider:
   - **Provider type:** OpenID Connect
   - **Provider URL:** `https://token.actions.githubusercontent.com`
   - **Audience:** `sts.amazonaws.com`
4. Click **Add provider**

### Step 2: Create IAM Roles for GitHub Actions

You need two separate IAM roles: one for dev and one for prod.

#### Create Dev Role

1. Go to **IAM** → **Roles** → **Create role**
2. Select **Web identity**
3. Configure:
   - **Identity provider:** token.actions.githubusercontent.com
   - **Audience:** sts.amazonaws.com
4. Click **Next**
5. Attach the following permissions:
   - `AWSCloudFormationFullAccess`
   - `AmazonS3FullAccess`
   - `AWSLambda_FullAccess`
   - `AmazonDynamoDBFullAccess`
   - `CloudFrontFullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `IAMFullAccess` (for creating Lambda execution roles)
   - `AmazonCognitoPowerUser`
   - `AmazonSSMReadOnlyAccess` (for OAuth credentials)
   - Or create a custom policy with necessary permissions
6. Name the role: `GitHubActions-MadeWithKiro-Dev`
7. Edit the trust policy to restrict to your repository:

```json
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
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/madewithkiro:*"
        }
      }
    }
  ]
}
```

Replace:
- `YOUR_ACCOUNT_ID` with your AWS account ID
- `YOUR_GITHUB_ORG` with your GitHub organization or username

#### Create Prod Role

Follow the same steps but:
1. Name the role: `GitHubActions-MadeWithKiro-Prod`
2. Update trust policy to restrict to specific branches/tags for production:

```json
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
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/madewithkiro:ref:refs/tags/v*"
        }
      }
    }
  ]
}
```

This restricts production deployments to only version tags.

### Step 3: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `AWS_ROLE_ARN_DEV` | `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActions-MadeWithKiro-Dev` | ARN of the dev IAM role |
| `AWS_ROLE_ARN_PROD` | `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActions-MadeWithKiro-Prod` | ARN of the prod IAM role |

Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID.

### Step 4: Configure GitHub Environment for Production

For additional protection, configure a production environment:

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name it `production`
4. Configure protection rules:
   - ✅ **Required reviewers:** Add team members who must approve production deployments
   - ✅ **Wait timer:** Optional delay before deployment (e.g., 5 minutes)
   - ✅ **Deployment branches:** Only `tags` matching `v*`

## Infrastructure as Code Flexibility

The workflows are designed to support future IaC tool changes beyond AWS SAM:

### Current Structure (AWS SAM)
```yaml
- name: Build SAM application
  run: sam build --use-container --config-env ${{ env.ENVIRONMENT }}

- name: Deploy infrastructure with SAM
  run: sam deploy --config-env ${{ env.ENVIRONMENT }} ...
```

### How to Migrate to Another IaC Tool

If you decide to migrate to Terraform, CDK, or another tool, you only need to replace the build and deploy steps:

#### Example: Terraform
```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3

- name: Terraform Init
  run: terraform init

- name: Terraform Plan
  run: terraform plan -var="environment=${{ env.ENVIRONMENT }}"

- name: Terraform Apply
  run: terraform apply -var="environment=${{ env.ENVIRONMENT }}" -auto-approve
```

#### Example: AWS CDK
```yaml
- name: Setup CDK
  run: npm install -g aws-cdk

- name: CDK Deploy
  run: cdk deploy --context environment=${{ env.ENVIRONMENT }} --require-approval never
```

The rest of the workflow (tests, frontend build, S3 upload, CloudFront invalidation) remains the same regardless of IaC tool.

## Monitoring Deployments

### View Workflow Runs
1. Go to **Actions** tab in GitHub repository
2. Select the workflow (Test, Deploy to Dev, or Deploy to Production)
3. View run history and logs

### Deployment Summaries
Each deployment generates a summary with:
- Environment details
- Stack outputs (S3 bucket, API URL, CloudFront distribution)
- Success/failure status
- Troubleshooting tips on failure

### AWS CloudWatch
Monitor Lambda function logs:
```bash
aws logs tail /aws/lambda/MadeWithKiro-Profile-dev --follow
aws logs tail /aws/lambda/MadeWithKiro-Application-dev --follow
```

## Troubleshooting

### Tests Failing
- Check the test logs in the workflow run
- Run tests locally: `make test`
- Ensure all dependencies are up to date

### Deployment Fails: "No stack changes to deploy"
This is not an error. The workflow uses `--no-fail-on-empty-changeset` to skip when there are no infrastructure changes.

### Deployment Fails: "User is not authorized"
- Verify IAM role ARN in GitHub secrets is correct
- Check IAM role trust policy matches your repository
- Ensure IAM role has necessary permissions

### CloudFront Invalidation Fails
- Check that CloudFront distribution exists (custom domain configured)
- Verify IAM role has `cloudfront:CreateInvalidation` permission

### Frontend Not Updating
- Check S3 bucket upload succeeded
- Wait 1-2 minutes for CloudFront invalidation to complete
- Clear browser cache
- Verify CloudFront cache behaviors

## Security Best Practices

✅ **Implemented:**
- OIDC for AWS authentication (no long-lived credentials)
- Separate IAM roles for dev and prod
- Environment protection rules for production
- Least privilege IAM permissions
- Pull request reviews before merge

🔒 **Additional Recommendations:**
- Enable branch protection rules on `main`
- Require status checks to pass before merge
- Use CODEOWNERS file for sensitive files
- Regularly rotate OAuth credentials in SSM Parameter Store
- Monitor CloudTrail for suspicious AWS API calls

## Maintenance

### Updating Dependencies
GitHub Actions automatically uses latest patch versions for actions (e.g., `@v4`, `@v2`).

To update to new major versions:
1. Test in a separate branch first
2. Update version numbers in workflow files
3. Verify tests pass
4. Merge to main

### Cost Optimization
- GitHub Actions minutes are free for public repositories
- Private repositories: 2,000 minutes/month free (Team plan)
- AWS costs depend on usage (Lambda, DynamoDB, CloudFront, S3)

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions
2. Review CloudFormation stack events in AWS Console
3. Check Lambda logs in CloudWatch
4. Open an issue in the repository
