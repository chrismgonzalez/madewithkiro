# Quick Deploy Reference

## First Time Deployment

```bash
# 1. Deploy infrastructure (includes CloudFront - takes ~15 min)
make deploy-dev

# 2. Update Cognito callback URL with CloudFront URL
./scripts/update-cognito-callback.sh dev

# 3. Redeploy to update Cognito
make deploy-dev

# 4. Build and upload frontend
make build
make upload-frontend-dev

# 5. Get your URLs
make outputs-dev
```

## Daily Development

```bash
# Local development (frontend calls deployed API)
make dev

# Deploy backend changes
make deploy-dev

# Deploy frontend changes
make build
make upload-frontend-dev
make invalidate-cloudfront-dev  # Clear cache
```

## Useful Commands

```bash
make outputs-dev              # Show all URLs and IDs
make logs                     # View Lambda logs
make status                   # Check deployment status
make test                     # Run all tests
make clean                    # Clean build artifacts
```

## Important URLs (After Deployment)

Get these from `make outputs-dev`:

- **Frontend URL:** `CloudFrontUrl` output (use this!)
- **API URL:** `ApiUrl` output
- **Cognito User Pool ID:** `UserPoolId` output
- **Cognito Client ID:** `UserPoolClientId` output

## Troubleshooting

```bash
# View logs
make logs-profile        # Profile Lambda logs
make logs-application    # Application Lambda logs

# Check stack status
aws cloudformation describe-stacks --stack-name madewithkiro-dev

# Verify CloudFront
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`MadeWithKiro dev Distribution`]'
```

## Production Deployment

```bash
# Deploy to prod (requires confirmation)
make deploy-prod

# Upload frontend
make build
make upload-frontend-prod
make invalidate-cloudfront-prod
```

## Cost Monitoring

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-11-01,End=2024-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```
