# GitHub Actions CI/CD Pipeline - File Index

Complete index of all files in the CI/CD pipeline implementation.

## 📋 Quick Navigation

- [Workflow Files](#workflow-files)
- [Documentation](#documentation)
- [Configuration Templates](#configuration-templates)
- [Setup Scripts](#setup-scripts)
- [Getting Started](#getting-started)

---

## Workflow Files

### 1. `test.yml` - Pull Request Testing
**Location:** `.github/workflows/test.yml`
**Trigger:** Pull requests to `main` or `develop`
**Purpose:** Automated testing before code merge

**What it does:**
- Runs frontend tests (Vitest)
- Runs backend tests (pytest)
- Posts results as PR comments
- Blocks merge on failure

**When to use:**
- Automatically triggered on PR creation
- Automatically re-runs on PR updates

---

### 2. `deploy-dev.yml` - Development Deployment
**Location:** `.github/workflows/deploy-dev.yml`
**Trigger:** Push to `main` branch
**Purpose:** Automatic deployment to development environment

**What it does:**
- Runs full test suite
- Authenticates with AWS using OIDC
- Builds SAM application
- Deploys infrastructure
- Uploads frontend to S3
- Invalidates CloudFront cache

**When to use:**
- Automatically triggered on merge to main
- Manual trigger available via GitHub UI

---

### 3. `deploy-prod.yml` - Production Deployment
**Location:** `.github/workflows/deploy-prod.yml`
**Trigger:** Version tags (e.g., `v1.0.0`, `v2.1.3`)
**Purpose:** Production deployment with approval

**What it does:**
- Runs full test suite
- Requires manual approval
- Deploys to production environment
- Tags deployment with version
- Creates detailed summary

**When to use:**
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

---

### 4. `_deploy-template.yml` - Reusable Template
**Location:** `.github/workflows/_deploy-template.yml`
**Type:** Reusable workflow
**Purpose:** Template for future IaC tool migrations

**Features:**
- IaC tool agnostic design
- Commented Terraform examples
- Commented CDK examples
- Easy to customize

**When to use:**
- As a reference for creating new workflows
- When migrating to different IaC tools

---

## Documentation

### 1. `README.md` - Complete Documentation
**Location:** `.github/workflows/README.md`
**Size:** ~9KB
**Purpose:** Comprehensive pipeline documentation

**Contents:**
- Workflow descriptions
- AWS OIDC setup guide
- IAM role configuration
- GitHub secrets setup
- Troubleshooting guide
- Security best practices
- Migration examples

**Start here if:** You need detailed information about any aspect

---

### 2. `QUICKSTART.md` - Fast Setup Guide
**Location:** `.github/workflows/QUICKSTART.md`
**Size:** ~9KB
**Purpose:** Get up and running quickly

**Contents:**
- Step-by-step setup checklist
- CLI commands ready to copy
- Testing procedures
- Common operations
- Quick troubleshooting

**Start here if:** You want to set up the pipeline ASAP

---

### 3. `SETUP_CHECKLIST.md` - Verification Guide
**Location:** `.github/workflows/SETUP_CHECKLIST.md`
**Size:** ~10KB
**Purpose:** Verify your setup is complete

**Contents:**
- Pre-setup verification
- AWS setup checklist
- GitHub setup checklist
- Testing procedures
- Troubleshooting checklist
- Success criteria

**Start here if:** You're setting up or verifying the pipeline

---

### 4. `IMPLEMENTATION_SUMMARY.md` - Overview
**Location:** `.github/workflows/IMPLEMENTATION_SUMMARY.md`
**Size:** ~12KB
**Purpose:** High-level overview of the implementation

**Contents:**
- Architecture diagrams
- File descriptions
- Security model
- Feature list
- Setup time estimate

**Start here if:** You want to understand the big picture

---

### 5. `CI_CD_FLOW.md` - Flow Diagrams
**Location:** `.github/workflows/CI_CD_FLOW.md`
**Size:** ~15KB
**Purpose:** Visual workflow documentation

**Contents:**
- Complete workflow diagrams
- Step-by-step flow descriptions
- Authentication flow
- Environment comparison
- Rollback procedures
- Monitoring points

**Start here if:** You prefer visual documentation

---

### 6. `INDEX.md` - This File
**Location:** `.github/workflows/INDEX.md`
**Purpose:** Navigate all pipeline files

**Start here if:** You need a roadmap of available files

---

## Configuration Templates

### 1. `iam-policy-template.json` - IAM Policy
**Location:** `.github/workflows/iam-policy-template.json`
**Size:** ~7KB
**Purpose:** Template IAM policy for GitHub Actions roles

**Includes permissions for:**
- CloudFormation
- S3
- Lambda
- DynamoDB
- API Gateway
- CloudFront
- IAM
- Cognito
- Route 53
- ACM
- SSM Parameter Store
- CloudWatch Logs
- EventBridge
- ECR

**How to use:**
1. Review the permissions
2. Customize for your needs
3. Attach to IAM roles
4. Test with least privilege principle

---

### 2. `trust-policy-template.json` - Trust Policy
**Location:** `.github/workflows/trust-policy-template.json`
**Size:** ~0.5KB
**Purpose:** OIDC provider trust policy template

**How to use:**
1. Replace `YOUR_ACCOUNT_ID` with AWS account ID
2. Replace `YOUR_GITHUB_ORG` with GitHub org/username
3. Replace `BRANCH_OR_TAG_PATTERN` with appropriate pattern
   - Dev: `*` (all branches/tags)
   - Prod: `ref:refs/tags/v*` (only version tags)
4. Apply to IAM role

---

## Setup Scripts

### 1. `setup-aws-oidc.sh` - Automated Setup
**Location:** `.github/workflows/setup-aws-oidc.sh`
**Size:** ~8KB
**Executable:** Yes (`chmod +x`)
**Purpose:** Automate AWS OIDC and IAM role setup

**What it does:**
- Creates OIDC identity provider
- Creates Dev IAM role
- Creates Prod IAM role
- Attaches necessary policies
- Provides setup summary

**How to use:**
```bash
cd .github/workflows
export GITHUB_ORG="your-org-name"
./setup-aws-oidc.sh
```

**Requirements:**
- AWS CLI installed
- AWS credentials configured
- Permissions to create IAM resources

---

## Getting Started

### For First-Time Setup

1. **Read the Overview**
   - Start with `IMPLEMENTATION_SUMMARY.md`
   - Understand the architecture

2. **Follow Quick Start**
   - Use `QUICKSTART.md` for setup
   - Or run `setup-aws-oidc.sh` for automation

3. **Verify Setup**
   - Use `SETUP_CHECKLIST.md` to verify
   - Test each workflow

4. **Learn the Flows**
   - Read `CI_CD_FLOW.md` for visual understanding
   - Understand trigger conditions

### For Daily Use

- **Creating PRs:** Tests run automatically
- **Merging to main:** Dev deploys automatically  
- **Releasing:** Create version tag for prod

### For Troubleshooting

1. Check workflow logs in GitHub Actions
2. Consult `README.md` troubleshooting section
3. Review `SETUP_CHECKLIST.md` for common issues
4. Check AWS CloudFormation events

### For Maintenance

- Regular: Monitor workflow runs weekly
- Monthly: Review IAM permissions
- Quarterly: Update dependencies and documentation

---

## File Size Summary

| Category | Files | Total Size |
|----------|-------|------------|
| Workflows | 4 | ~27 KB |
| Documentation | 6 | ~65 KB |
| Configuration | 2 | ~8 KB |
| Scripts | 1 | ~8 KB |
| **Total** | **13** | **~108 KB** |

---

## Workflow Decision Tree

```
┌─────────────────────────────┐
│   What do you want to do?   │
└──────────┬──────────────────┘
           │
           ├─ Set up for first time
           │  └─▶ QUICKSTART.md or setup-aws-oidc.sh
           │
           ├─ Understand architecture
           │  └─▶ IMPLEMENTATION_SUMMARY.md + CI_CD_FLOW.md
           │
           ├─ Verify setup
           │  └─▶ SETUP_CHECKLIST.md
           │
           ├─ Troubleshoot issue
           │  └─▶ README.md (Troubleshooting section)
           │
           ├─ Customize IAM roles
           │  └─▶ iam-policy-template.json + trust-policy-template.json
           │
           ├─ Migrate to new IaC tool
           │  └─▶ _deploy-template.yml + README.md (Migration section)
           │
           └─ Daily development
              └─▶ Just use Git normally! Workflows handle the rest.
```

---

## Quick Reference Commands

### Testing
```bash
# Run tests locally
make test

# Frontend only
bun run test

# Backend only
cd backend && uv run pytest -v
```

### Deployment
```bash
# Dev (manual)
make deploy-dev

# Prod (manual)
make deploy-prod

# Trigger via Git
git push origin main              # Auto-deploys to dev
git tag v1.0.0 && git push origin v1.0.0  # Auto-deploys to prod
```

### Monitoring
```bash
# View stack outputs
make outputs-dev
make outputs-prod

# View logs
make logs-profile
make logs-application

# Check deployment status
make status
```

### CloudFront
```bash
# Invalidate cache
make invalidate-cloudfront-dev
make invalidate-cloudfront-prod
```

---

## Version History

### v1.0.0 (2024-12-03)
- Initial implementation
- Complete CI/CD pipeline with OIDC
- Comprehensive documentation
- Automated setup scripts

---

## Related Files (Outside This Directory)

- `../../Makefile` - Local development commands
- `../../template.yaml` - SAM infrastructure template
- `../../samconfig.toml` - SAM configuration
- `../../package.json` - Frontend dependencies
- `../../backend/pyproject.toml` - Backend dependencies

---

## Support

**For pipeline-related issues:**
- Check documentation in this directory
- Review GitHub Actions logs
- Consult AWS CloudFormation events

**For application issues:**
- See main repository README
- Check Lambda logs in CloudWatch
- Review DynamoDB tables

---

**Last Updated:** December 3, 2024
**Version:** 1.0.0
**Maintained by:** MadeWithKiro Team
