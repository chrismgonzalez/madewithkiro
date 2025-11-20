# Quick Start Guide

Get MadeWithKiro running in 5 minutes.

## Prerequisites Check

```bash
make check-deps
```

Ensure you have:

- ✓ bun
- ✓ uv
- ✓ sam (AWS SAM CLI)
- ✓ aws (AWS CLI configured)
- ✓ python3

## Option 1: Local Development Only

**No AWS deployment, just run locally:**

```bash
# 1. Install dependencies
make install

# 2. Start dev server
make dev

# 3. Open http://localhost:5173
```

**Note**: This runs the frontend only. Backend APIs won't work until deployed to AWS.

## Option 2: Deploy to AWS (Development)

**Full stack deployment without custom domain:**

```bash
# 1. Install dependencies
make install

# 2. Deploy infrastructure to AWS
make deploy-dev

# 3. Get configuration values
make outputs-dev

# 4. Set up environment variables
make setup-env-dev
cp .env.dev .env.local

# 5. Build and upload frontend
make build
make upload-frontend-dev

# 6. Get your app URL
make outputs-dev
# Look for "FrontendUrl" in the output
```

**Time**: ~5 minutes for first deployment

## Option 3: Production with Custom Domain

**Full production setup with your own domain:**

### Prerequisites

- Domain registered (via Route 53 or another registrar)

### Steps

```bash
# 1. Update samconfig.toml
# Edit the [prod.deploy.parameters] section:
# DomainName=yourdomain.com

# 2. Deploy
make deploy-prod

# 3. Get name servers (if domain not in Route 53)
make outputs-prod
# Look for "HostedZoneNameServers"

# 4. Update your domain registrar
# Set name servers to the ones from step 3

# 5. Wait for DNS propagation (5-30 minutes)

# 6. Build and upload frontend
make build
make upload-frontend-prod

# 7. Access your site
# https://yourdomain.com
```

**Time**: ~30 minutes (including DNS propagation)

## Common Commands

```bash
# Development
make dev                    # Start local dev server
make build                  # Build frontend
make test                   # Run tests

# Deployment
make deploy-dev            # Deploy to dev
make deploy-prod           # Deploy to prod
make upload-frontend-dev   # Upload frontend to dev
make upload-frontend-prod  # Upload frontend to prod

# Monitoring
make logs                  # View Lambda logs
make outputs-dev           # Show dev stack outputs
make outputs-prod          # Show prod stack outputs
make status                # Check deployment status

# Maintenance
make clean                 # Clean build artifacts
make destroy-dev           # Delete dev stack
make destroy-prod          # Delete prod stack
```

## Troubleshooting

### "sam: command not found"

Install AWS SAM CLI:

```bash
# macOS
brew install aws-sam-cli

# Other platforms
# See: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

### "aws: command not found"

Install and configure AWS CLI:

```bash
# macOS
brew install awscli

# Configure credentials
aws configure
```

### Deployment fails with "Unable to locate credentials"

Configure AWS credentials:

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
```

### Frontend shows "API Error"

1. Check if backend is deployed: `make outputs-dev`
2. Verify environment variables in `.env.local`
3. Check Lambda logs: `make logs`

### Custom domain not working

1. Check DNS propagation: `dig yourdomain.com`
2. Verify name servers at registrar
3. Check certificate status in ACM console
4. Wait up to 48 hours for full DNS propagation

## What Gets Deployed

### Development Environment

- DynamoDB table (on-demand billing)
- 2 Lambda functions (Profile, Application)
- API Gateway with Cognito authorizer
- Cognito User Pool
- S3 bucket for frontend
- CloudWatch logs

**Cost**: ~$0.50/month (mostly free tier)

### Production Environment (with custom domain)

- Everything in dev, plus:
- Route 53 Hosted Zone
- ACM Certificate (free)
- CloudFront Distribution

**Cost**: ~$2-5/month (depending on traffic)

## Next Steps

After deployment:

1. **Create a test user**:

   - Go to AWS Console > Cognito
   - Create a user in your User Pool
   - Verify email

2. **Test the app**:

   - Sign in with test user
   - Create your profile
   - Add an application
   - View the gallery

3. **Customize**:
   - Update branding in `src/`
   - Modify Lambda functions in `backend/`
   - Adjust infrastructure in `template.yaml`

## Getting Help

- **Deployment issues**: Check [DEPLOYMENT.md](DEPLOYMENT.md)
- **Domain setup**: Check [DOMAIN-SETUP.md](DOMAIN-SETUP.md)
- **Infrastructure details**: Check [INFRASTRUCTURE.md](INFRASTRUCTURE.md)
- **AWS issues**: Check CloudFormation events in AWS Console

## Clean Up

To remove everything and avoid charges:

```bash
# Development
make destroy-dev

# Production
make destroy-prod
```

⚠️ **Warning**: This deletes all data permanently.

## Tips

1. **Start with dev**: Deploy to dev first to test everything
2. **Use local dev**: Run `make dev` for frontend development
3. **Check logs**: Use `make logs` to debug Lambda issues
4. **Monitor costs**: Check AWS Cost Explorer regularly
5. **Enable MFA**: Secure your AWS account with MFA
6. **Backup data**: DynamoDB has point-in-time recovery enabled

## Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [AWS Cognito](https://docs.aws.amazon.com/cognito/)
- [DynamoDB](https://docs.aws.amazon.com/dynamodb/)
