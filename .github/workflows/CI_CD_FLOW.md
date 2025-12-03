# CI/CD Pipeline Flow Diagram

## Complete Workflow Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPER WORKFLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

    Developer                     GitHub                        AWS
    ─────────                    ────────                      ─────
        │                            │                           │
        │                            │                           │
        ├─(1)─────────────────────▶│                           │
        │   Create Branch            │                           │
        │   + Commit Changes         │                           │
        │                            │                           │
        │                            │                           │
        ├─(2)─────────────────────▶│                           │
        │   Open Pull Request        │                           │
        │                            │                           │
        │                            ├─(3)───────────────────────┤
        │                            │   Trigger test.yml        │
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Frontend Tests     │ │
        │                            │   │  (Vitest)           │ │
        │                            │   └─────────────────────┘ │
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Backend Tests      │ │
        │                            │   │  (pytest)           │ │
        │                            │   └─────────────────────┘ │
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Post PR Comments   │ │
        │                            │   │  ✅ or ❌ Status    │ │
        │                            │   └─────────────────────┘ │
        │                            │                           │
        │◀────(4)────────────────────┤                           │
        │   View Test Results        │                           │
        │   on PR                    │                           │
        │                            │                           │
        │                            │                           │
        ├─(5)─────────────────────▶│                           │
        │   Merge PR to main         │                           │
        │                            │                           │
        │                            ├─(6)───────────────────────┤
        │                            │   Trigger deploy-dev.yml  │
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Run Tests Again    │ │
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │                            │            ▼              │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  AWS OIDC Auth      │ │
        │                            │   │  (No Credentials!)  │ │
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │                            │            ▼              │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  SAM Build          │─┤
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │                            │            ▼              │
        │                            │                           ├─(7)──────▶
        │                            │                           │  Deploy
        │                            │                           │  - Lambda
        │                            │                           │  - DynamoDB
        │                            │                           │  - API GW
        │                            │                           │  - Cognito
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Build Frontend     │ │
        │                            │   │  (Vite)             │ │
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │                            │            ▼              │
        │                            │                           ├─(8)──────▶
        │                            │                           │  Upload
        │                            │                           │  to S3
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Invalidate CF      │─┤
        │                            │   │  Cache              │ │
        │                            │   └─────────────────────┘ │
        │                            │                           │
        │◀────(9)────────────────────┤◀─────────────────────────┤
        │   View Deployment          │   Deployment Complete    │
        │   Summary                  │   ✅ Dev Live            │
        │                            │                           │
        │                            │                           │
        ├─(10)────────────────────▶│                           │
        │   Create & Push Tag        │                           │
        │   git tag v1.0.0           │                           │
        │                            │                           │
        │                            ├─(11)──────────────────────┤
        │                            │   Trigger deploy-prod.yml │
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Run Tests          │ │
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │                            │            ▼              │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  ⏸ WAIT FOR         │ │
        │                            │   │  MANUAL APPROVAL    │ │
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │◀────(12)───────────────────┤            │              │
        │   Approve Deployment       │            │              │
        │                            │            │              │
        ├─(13)────────────────────▶│            │              │
        │   Approve                  ├───────────▶│              │
        │                            │            ▼              │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  AWS OIDC Auth      │ │
        │                            │   │  (Prod Role)        │ │
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │                            │            ▼              │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  SAM Build & Deploy │─┤
        │                            │   └─────────────────────┘ │
        │                            │            │              │
        │                            │            ▼              │
        │                            │                           ├─(14)─────▶
        │                            │                           │  Deploy
        │                            │                           │  Production
        │                            │                           │  Stack
        │                            │                           │
        │                            │   ┌─────────────────────┐ │
        │                            │   │  Upload Frontend    │─┤
        │                            │   │  to S3 + Invalidate │ │
        │                            │   └─────────────────────┘ │
        │                            │                           │
        │◀────(15)───────────────────┤◀─────────────────────────┤
        │   🎉 Production            │   ✅ Prod Live           │
        │   Deployment Success       │   v1.0.0 Deployed        │
        │                            │                           │
```

## Detailed Step Descriptions

### (1) Create Branch + Commit Changes
- Developer creates a feature branch
- Makes code changes
- Commits changes locally

### (2) Open Pull Request
- Push branch to GitHub
- Open PR to merge into `main`
- PR triggers automated workflows

### (3) Trigger test.yml
- **Frontend Tests**: Run Vitest test suite
- **Backend Tests**: Run pytest test suite
- **Parallel Execution**: Both test suites run simultaneously
- **Comment Results**: Post test status to PR

### (4) View Test Results
- Developer sees test results in PR comments
- Status checks show pass/fail
- Merge is blocked if tests fail

### (5) Merge PR to main
- After approval and passing tests
- PR is merged to main branch
- Triggers dev deployment

### (6) Trigger deploy-dev.yml
- Workflow starts automatically on push to main
- Re-runs all tests as safety check
- Authenticates with AWS using OIDC

### (7) Deploy Infrastructure (Dev)
- **SAM Build**: Packages Lambda functions
- **CloudFormation**: Creates/updates stack
  - Lambda functions
  - DynamoDB tables
  - API Gateway
  - Cognito User Pool
  - IAM roles

### (8) Upload Frontend (Dev)
- **Vite Build**: Compiles React application
- **S3 Upload**: Syncs dist/ to S3 bucket
- **Cache Control**: Sets proper headers

### (9) View Deployment Summary
- Workflow posts summary with:
  - API URL
  - CloudFront URL
  - S3 bucket name
  - Deployment status

### (10) Create & Push Tag
- Developer creates semantic version tag
- `git tag v1.0.0`
- `git push origin v1.0.0`

### (11) Trigger deploy-prod.yml
- Workflow triggers on tag push
- Runs full test suite
- Waits for manual approval

### (12) Approve Deployment
- Reviewer receives notification
- Reviews changes and tag
- Checks test results

### (13) Approve
- Reviewer approves deployment
- Workflow continues execution
- Authenticates with prod role

### (14) Deploy Production Stack
- Same as dev deployment
- Uses production configuration
- Different AWS resources/stack

### (15) Production Live! 🎉
- Application deployed to production
- Version tagged and documented
- Deployment summary posted

## Workflow Triggers Summary

| Workflow | Trigger | When | Purpose |
|----------|---------|------|---------|
| `test.yml` | Pull Request | PR opened/updated to `main` or `develop` | Validate code changes |
| `deploy-dev.yml` | Push | Code merged to `main` | Auto-deploy to dev |
| `deploy-prod.yml` | Tag | Version tag pushed (e.g., `v1.0.0`) | Deploy to production |

## Authentication Flow (OIDC)

```
┌─────────────────┐
│ GitHub Actions  │
│    Workflow     │
└────────┬────────┘
         │
         │ 1. Request JWT token
         │    with repo info
         ▼
┌─────────────────┐
│  GitHub OIDC    │
│ Token Service   │
└────────┬────────┘
         │
         │ 2. Issue JWT token
         │    (short-lived)
         ▼
┌─────────────────┐
│    AWS STS      │
│ AssumeRoleWith  │
│  WebIdentity    │
└────────┬────────┘
         │
         │ 3. Verify:
         │    - Token signature
         │    - Repository match
         │    - Branch/tag match
         │
         │ 4. Return temporary credentials
         │    (15 min - 12 hours)
         ▼
┌─────────────────┐
│  IAM Role       │
│  Permissions    │
└────────┬────────┘
         │
         │ 5. Access AWS services
         ▼
┌─────────────────┐
│  AWS Services   │
│  CloudFormation │
│  S3, Lambda,    │
│  DynamoDB, etc. │
└─────────────────┘
```

## Environment Comparison

| Aspect | Dev | Prod |
|--------|-----|------|
| **Trigger** | Push to `main` | Version tag |
| **Approval** | None | Required |
| **IAM Role** | `*-Dev` (broader access) | `*-Prod` (tag-only) |
| **Stack Name** | `madewithkiro-dev` | `madewithkiro-prod` |
| **Domain** | CloudFront URL | Custom domain |
| **Testing** | Continuous | Release only |
| **Rollback** | Revert commit | Revert tag |

## Rollback Procedures

### Dev Rollback
```bash
# Option 1: Revert the commit
git revert <bad-commit-hash>
git push origin main
# Triggers automatic redeployment

# Option 2: Force push previous commit (destructive)
git reset --hard <good-commit-hash>
git push --force origin main
```

### Prod Rollback
```bash
# Option 1: Create new tag from previous version
git checkout v1.0.0  # Last known good version
git tag v1.0.2       # New patch version
git push origin v1.0.2

# Option 2: Delete bad tag and retag
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1
# Then create new tag from good commit

# Option 3: CloudFormation rollback
aws cloudformation rollback-stack --stack-name madewithkiro-prod
```

## Monitoring Points

### 1. GitHub Actions
- Workflow run status
- Job execution time
- Artifact sizes
- Action usage minutes

### 2. AWS CloudFormation
- Stack status
- Resource creation/updates
- Change sets
- Stack drift

### 3. AWS Lambda
- Invocation count
- Error rate
- Duration
- Cold starts

### 4. AWS CloudFront
- Cache hit ratio
- Request count
- Data transfer
- Error rate

### 5. AWS S3
- Bucket size
- Request count
- Upload/download speeds

## Security Checkpoints

✅ **No long-lived credentials** - OIDC tokens only
✅ **Least privilege IAM** - Minimal necessary permissions
✅ **Environment separation** - Dev and prod isolated
✅ **Manual approval for prod** - Human checkpoint
✅ **Repository restrictions** - Trust policy limits access
✅ **Branch/tag restrictions** - Prod only from tags
✅ **Audit trail** - CloudTrail logs all AWS actions
✅ **Secrets in Parameter Store** - OAuth credentials secured

---

**Last Updated:** December 3, 2024
**Version:** 1.0.0
