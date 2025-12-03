# CI/CD Pipeline - GitHub Actions

This project includes a comprehensive CI/CD pipeline using GitHub Actions with AWS OIDC authentication.

## 🚀 Quick Start

### 1. Automated Setup (Recommended)
```bash
cd .github/workflows
export GITHUB_ORG="your-github-org"
./setup-aws-oidc.sh
```

### 2. Add GitHub Secrets
After running the setup script, add these secrets to your GitHub repository:
- `AWS_ROLE_ARN_DEV` - ARN of the dev IAM role
- `AWS_ROLE_ARN_PROD` - ARN of the prod IAM role

### 3. Configure Production Environment
- Go to Settings → Environments
- Create environment named `production`
- Add required reviewers
- Set deployment branches to `v*` tags

### 4. Test the Pipeline
```bash
# Create a test PR - tests run automatically
git checkout -b test-ci
git push origin test-ci

# Merge to main - deploys to dev automatically
git checkout main
git merge test-ci
git push origin main

# Create a release tag - deploys to prod
git tag v1.0.0
git push origin v1.0.0
```

## 📚 Documentation

All documentation is in `.github/workflows/`:

| File | Purpose |
|------|---------|
| `README.md` | Complete documentation |
| `QUICKSTART.md` | Fast setup guide |
| `SETUP_CHECKLIST.md` | Verification checklist |
| `IMPLEMENTATION_SUMMARY.md` | Architecture overview |
| `CI_CD_FLOW.md` | Visual flow diagrams |
| `INDEX.md` | File navigation |

## 🔄 Workflows

### Test (`test.yml`)
- **Trigger:** Pull requests to `main` or `develop`
- **Actions:** Runs frontend and backend tests
- **Result:** Comments on PR with test results

### Deploy to Dev (`deploy-dev.yml`)
- **Trigger:** Push to `main` branch
- **Actions:** Tests, builds, deploys to AWS dev environment
- **Result:** Dev environment updated automatically

### Deploy to Prod (`deploy-prod.yml`)
- **Trigger:** Version tags (e.g., `v1.0.0`)
- **Actions:** Tests, approval, deploy to AWS prod environment
- **Result:** Production release with approval gate

## 🔒 Security

- ✅ OIDC authentication (no long-lived credentials)
- ✅ Separate IAM roles for dev and prod
- ✅ Manual approval required for production
- ✅ Repository and branch restrictions

## 🛠️ Setup Time

- **Automated setup:** ~5 minutes
- **Manual verification:** ~10 minutes
- **Testing:** ~10 minutes
- **Total:** ~25 minutes

## 📖 Full Documentation

For complete setup instructions, troubleshooting, and detailed information:

```bash
cd .github/workflows
cat README.md
```

Or visit: `.github/workflows/README.md`

## 🆘 Support

1. Check workflow logs in GitHub Actions
2. Review documentation in `.github/workflows/`
3. Check AWS CloudFormation events
4. Consult `SETUP_CHECKLIST.md` for verification

---

**Setup Status:** ✅ Ready to use
**Version:** 1.0.0
**Last Updated:** December 3, 2024
