# CI/CD Setup Checklist

Use this checklist to verify that your GitHub Actions CI/CD pipeline is properly configured.

## Pre-Setup Verification

- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] GitHub repository admin access
- [ ] Repository owner/organization name known

## AWS Setup

### OIDC Identity Provider
- [ ] OIDC provider created in IAM
- [ ] Provider URL: `https://token.actions.githubusercontent.com`
- [ ] Audience: `sts.amazonaws.com`
- [ ] Thumbprint: `6938fd4d98bab03faadb97b34396831e3780aea1`

**Verify:**
```bash
aws iam list-open-id-connect-providers
```

### Dev IAM Role
- [ ] Role created: `GitHubActions-MadeWithKiro-Dev`
- [ ] Trust policy configured with OIDC provider
- [ ] Trust policy allows: `repo:YOUR_ORG/madewithkiro:*`
- [ ] Policies attached:
  - [ ] AWSCloudFormationFullAccess
  - [ ] AmazonS3FullAccess
  - [ ] AWSLambda_FullAccess
  - [ ] AmazonDynamoDBFullAccess
  - [ ] CloudFrontFullAccess
  - [ ] AmazonAPIGatewayAdministrator
  - [ ] IAMFullAccess
  - [ ] AmazonCognitoPowerUser
  - [ ] AmazonSSMReadOnlyAccess

**Verify:**
```bash
aws iam get-role --role-name GitHubActions-MadeWithKiro-Dev
aws iam list-attached-role-policies --role-name GitHubActions-MadeWithKiro-Dev
```

### Prod IAM Role
- [ ] Role created: `GitHubActions-MadeWithKiro-Prod`
- [ ] Trust policy configured with OIDC provider
- [ ] Trust policy allows: `repo:YOUR_ORG/madewithkiro:ref:refs/tags/v*`
- [ ] Same policies attached as Dev role

**Verify:**
```bash
aws iam get-role --role-name GitHubActions-MadeWithKiro-Prod
aws iam list-attached-role-policies --role-name GitHubActions-MadeWithKiro-Prod
```

### Copy Role ARNs
- [ ] Dev role ARN copied: `arn:aws:iam::ACCOUNT_ID:role/GitHubActions-MadeWithKiro-Dev`
- [ ] Prod role ARN copied: `arn:aws:iam::ACCOUNT_ID:role/GitHubActions-MadeWithKiro-Prod`

**Get ARNs:**
```bash
aws iam get-role --role-name GitHubActions-MadeWithKiro-Dev --query 'Role.Arn' --output text
aws iam get-role --role-name GitHubActions-MadeWithKiro-Prod --query 'Role.Arn' --output text
```

## GitHub Setup

### Repository Secrets
Navigate to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

- [ ] `AWS_ROLE_ARN_DEV` secret added with Dev role ARN
- [ ] `AWS_ROLE_ARN_PROD` secret added with Prod role ARN

**Verify:**
- Secrets should appear in the list (values are hidden)
- Secret names must match exactly

### Production Environment
Navigate to: `Settings` → `Environments` → `New environment`

- [ ] Environment created: `production`
- [ ] Required reviewers added (at least 1)
- [ ] Deployment branches configured: `Selected branches and tags`
- [ ] Branch/tag pattern: `v*` (matches version tags)
- [ ] Wait timer (optional): 0-60 minutes

**Verify:**
- Environment should appear in Environments list
- Protection rules should be visible

### Branch Protection (Recommended)
Navigate to: `Settings` → `Branches` → `Add rule`

- [ ] Branch name pattern: `main`
- [ ] Require pull request before merging
- [ ] Require status checks to pass before merging
- [ ] Status checks:
  - [ ] `Frontend Tests`
  - [ ] `Backend Tests`
  - [ ] `Test Summary`
- [ ] Require conversation resolution before merging
- [ ] Include administrators (optional but recommended)

## Workflow Files Verification

- [ ] `.github/workflows/test.yml` exists
- [ ] `.github/workflows/deploy-dev.yml` exists
- [ ] `.github/workflows/deploy-prod.yml` exists
- [ ] `.github/workflows/_deploy-template.yml` exists (optional)

**Verify:**
```bash
ls -l .github/workflows/*.yml
```

## Testing the Pipeline

### 1. Test Workflow (Pull Request)

- [ ] Create a test branch:
  ```bash
  git checkout -b test-ci-setup
  ```

- [ ] Make a small change:
  ```bash
  echo "# CI/CD Pipeline Active" >> README.md
  git add README.md
  git commit -m "test: verify CI/CD pipeline"
  git push origin test-ci-setup
  ```

- [ ] Open pull request on GitHub
- [ ] Wait for workflows to start
- [ ] Check workflow runs in `Actions` tab
- [ ] Verify frontend tests run
- [ ] Verify backend tests run
- [ ] Check PR comments for test results
- [ ] Verify test summary appears

**Expected Results:**
- ✅ Frontend Tests job completes
- ✅ Backend Tests job completes
- ✅ Test Summary job completes
- ✅ PR shows status checks
- ✅ Comments appear on PR

### 2. Dev Deployment (Merge to Main)

- [ ] Merge the test PR to main (or push directly):
  ```bash
  git checkout main
  git merge test-ci-setup
  git push origin main
  ```

- [ ] Check `Actions` tab for "Deploy to Dev" workflow
- [ ] Wait for tests to complete
- [ ] Wait for SAM build
- [ ] Wait for infrastructure deployment
- [ ] Wait for frontend upload
- [ ] Check workflow summary for outputs

**Expected Results:**
- ✅ Tests pass
- ✅ SAM build completes
- ✅ CloudFormation stack updates/creates
- ✅ Frontend uploads to S3
- ✅ CloudFront cache invalidates
- ✅ Deployment summary shows URLs

**Verify Deployment:**
```bash
aws cloudformation describe-stacks --stack-name madewithkiro-dev
make outputs-dev
```

### 3. Prod Deployment (Release Tag)

- [ ] Create a version tag:
  ```bash
  git tag -a v0.1.0 -m "Initial CI/CD setup"
  git push origin v0.1.0
  ```

- [ ] Check `Actions` tab for "Deploy to Production" workflow
- [ ] Approve deployment if required (Environment protection)
- [ ] Wait for tests to complete
- [ ] Wait for infrastructure deployment
- [ ] Check workflow summary

**Expected Results:**
- ✅ Workflow triggers on tag push
- ✅ Tests pass
- ✅ Manual approval required (if configured)
- ✅ Production deployment completes
- ✅ Deployment summary shows production URLs

**Verify Deployment:**
```bash
aws cloudformation describe-stacks --stack-name madewithkiro-prod
make outputs-prod
```

## Verification Commands

### Check All Workflows
```bash
gh workflow list  # Requires GitHub CLI
# Or visit: https://github.com/YOUR_ORG/madewithkiro/actions
```

### Check Recent Runs
```bash
gh run list --limit 5  # Requires GitHub CLI
```

### View Workflow Logs
```bash
gh run view <run-id> --log  # Requires GitHub CLI
```

### Check CloudFormation Stacks
```bash
# Dev stack
aws cloudformation describe-stacks --stack-name madewithkiro-dev

# Prod stack
aws cloudformation describe-stacks --stack-name madewithkiro-prod
```

### Check S3 Buckets
```bash
# List buckets
aws s3 ls | grep madewithkiro

# Check bucket contents
aws s3 ls s3://madewithkiro-dev-frontend-bucket/ --recursive
```

### Check Lambda Functions
```bash
# List functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `MadeWithKiro`)].FunctionName'

# Get function info
aws lambda get-function --function-name MadeWithKiro-Profile-dev
```

### Check CloudFront Distributions
```bash
aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,DomainName,Status]'
```

## Troubleshooting Checklist

### Workflow Doesn't Trigger
- [ ] Check workflow file syntax (YAML validation)
- [ ] Verify trigger conditions (branch names, paths)
- [ ] Check if workflows are enabled in repository settings
- [ ] Verify repository permissions for Actions

### OIDC Authentication Fails
- [ ] OIDC provider exists in AWS
- [ ] Role trust policy includes correct repository name
- [ ] Role trust policy includes correct branch/tag pattern
- [ ] GitHub secret has correct role ARN
- [ ] IAM role has necessary permissions

### Tests Fail
- [ ] Dependencies are up to date
- [ ] Lock files committed (package.json, requirements.txt)
- [ ] Runtime versions match (Node.js, Python)
- [ ] Environment variables set correctly

### Deployment Fails
- [ ] IAM role has sufficient permissions
- [ ] SAM template syntax is valid
- [ ] SSM parameters configured (OAuth credentials)
- [ ] CloudFormation stack limits not exceeded
- [ ] S3 bucket names are globally unique

### Frontend Not Updating
- [ ] S3 upload completed successfully
- [ ] CloudFront invalidation ran
- [ ] Wait 1-2 minutes for cache invalidation
- [ ] Clear browser cache
- [ ] Check S3 bucket contents

## Post-Setup Tasks

- [ ] Document custom domain setup (if applicable)
- [ ] Configure CloudWatch alarms
- [ ] Set up AWS budgets/cost alerts
- [ ] Add CODEOWNERS file
- [ ] Create runbook for common operations
- [ ] Schedule IAM permission reviews
- [ ] Document rollback procedures
- [ ] Train team on CI/CD usage

## Maintenance Schedule

### Weekly
- [ ] Review failed workflow runs
- [ ] Check for security alerts

### Monthly
- [ ] Review AWS costs
- [ ] Update dependencies
- [ ] Review IAM permissions

### Quarterly
- [ ] Audit IAM roles and policies
- [ ] Review and update documentation
- [ ] Test disaster recovery procedures
- [ ] Rotate OAuth credentials

## Success Criteria

Your CI/CD pipeline is fully operational when:

✅ Pull requests automatically trigger tests
✅ Test results appear as PR comments
✅ Merging to main automatically deploys to dev
✅ Creating version tags automatically deploys to prod
✅ Production deployments require approval
✅ All deployments complete without errors
✅ Frontend and backend are accessible
✅ CloudFront cache invalidates correctly
✅ Workflow summaries display correctly

## Resources

- **Documentation:** `.github/workflows/README.md`
- **Quick Start:** `.github/workflows/QUICKSTART.md`
- **Implementation:** `.github/workflows/IMPLEMENTATION_SUMMARY.md`
- **Setup Script:** `.github/workflows/setup-aws-oidc.sh`

## Support

If you encounter issues:
1. Check workflow logs in GitHub Actions
2. Review CloudFormation events in AWS Console
3. Check Lambda logs in CloudWatch
4. Consult the documentation files
5. Open an issue in the repository

---

**Checklist Version:** 1.0.0
**Last Updated:** December 3, 2024
