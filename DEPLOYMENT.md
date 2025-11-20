# Deployment Guide

This guide walks you through deploying MadeWithKiro to AWS.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials (`aws configure`)
3. **AWS SAM CLI** installed ([installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
4. **Bun** installed ([installation guide](https://bun.sh/))
5. **uv** installed ([installation guide](https://docs.astral.sh/uv/))

Check if all tools are installed:

```bash
make check-deps
```

## First-Time Deployment

### Step 1: Install Dependencies

```bash
make install
```

This installs:

- Frontend dependencies (React, Vite, Tailwind, etc.) via Bun
- Backend dependencies (boto3, pydantic) via uv

### Step 2: Deploy Infrastructure

```bash
make deploy-dev
```

This command will:

1. Build the SAM application
2. Package Lambda functions
3. Deploy CloudFormation stack with:
   - DynamoDB table (single-table design with GSI)
   - Cognito User Pool and Client
   - API Gateway with Cognito authorizer
   - Lambda functions (Profile and Application handlers)
   - S3 bucket for frontend hosting

**Note**: First deployment takes 3-5 minutes.

### Step 3: Get Stack Outputs

After deployment completes, get the configuration values:

```bash
make outputs-dev
```

You'll see output like:

```
---------------------------------------------------------
|                   DescribeStacks                      |
+------------------+------------------------------------+
|  OutputKey       |  OutputValue                       |
+------------------+------------------------------------+
|  ApiUrl          |  https://abc123.execute-api...     |
|  UserPoolId      |  us-east-1_xxxxxxxxx               |
|  UserPoolClientId|  xxxxxxxxxxxxxxxxxxxxxxxxxx        |
|  UserPoolDomain  |  https://madewithkiro-dev-...      |
|  FrontendUrl     |  http://madewithkiro-frontend...   |
+------------------+------------------------------------+
```

### Step 4: Configure Frontend Environment

Create a `.env.local` file with the values from stack outputs:

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

Update these values:

```env
VITE_API_URL=<ApiUrl from outputs>
VITE_COGNITO_USER_POOL_ID=<UserPoolId from outputs>
VITE_COGNITO_CLIENT_ID=<UserPoolClientId from outputs>
VITE_COGNITO_DOMAIN=<UserPoolDomain from outputs>
VITE_AWS_REGION=us-east-1
VITE_ENVIRONMENT=dev
```

### Step 5: Build and Upload Frontend

```bash
make build
make upload-frontend-dev
```

This builds the React app and uploads it to the S3 bucket.

### Step 6: Test the Application

Get the frontend URL:

```bash
make outputs-dev
```

Open the `FrontendUrl` in your browser.

## Production Deployment

### Deploy to Production

```bash
make deploy-prod
```

You'll be prompted to confirm before deploying to production.

### Update Production Frontend

```bash
make build
make upload-frontend-prod
```

You'll be prompted to confirm before uploading to production.

## Updating the Application

### Update Backend (Lambda Functions)

After making changes to Lambda functions:

```bash
make deploy-dev
```

SAM will detect changes and update only the modified resources.

### Update Frontend

After making changes to React code:

```bash
make build
make upload-frontend-dev
```

## Monitoring and Debugging

### View Lambda Logs

Tail all Lambda logs:

```bash
make logs
```

Tail specific function logs:

```bash
make logs-profile
make logs-application
```

### Check Deployment Status

```bash
make status
```

### View Stack Outputs

```bash
make outputs-dev
make outputs-prod
```

## Testing Locally

### Run Frontend Locally

```bash
make dev
```

Opens development server at http://localhost:5173

### Test Lambda Functions Locally

Start local API Gateway:

```bash
make local-api
```

This requires SAM CLI and Docker.

## Troubleshooting

### Deployment Fails

1. Check AWS credentials:

   ```bash
   aws sts get-caller-identity
   ```

2. Verify SAM CLI is installed:

   ```bash
   sam --version
   ```

3. Check CloudFormation events:
   ```bash
   aws cloudformation describe-stack-events --stack-name madewithkiro-dev
   ```

### Lambda Function Errors

View logs:

```bash
make logs-profile
make logs-application
```

### CORS Issues

Ensure your frontend URL is configured in the Cognito callback URLs. Update `samconfig.toml`:

```toml
parameter_overrides = [
    "Environment=dev",
    "CognitoCallbackURL=http://localhost:5173"
]
```

Then redeploy:

```bash
make deploy-dev
```

## Cleanup

### Remove Development Environment

```bash
make destroy-dev
```

⚠️ **Warning**: This deletes all resources and data.

### Remove Production Environment

```bash
make destroy-prod
```

You'll need to type "DELETE PRODUCTION" to confirm.

## Cost Optimization

The application uses serverless services with pay-per-use pricing:

- **DynamoDB**: On-demand billing (no cost when idle)
- **Lambda**: Pay per invocation (1M free requests/month)
- **API Gateway**: Pay per request (1M free requests/month)
- **Cognito**: Free tier: 50,000 MAUs
- **S3**: Pay for storage and requests (minimal for static hosting)

Expected costs for low-traffic POC: **< $5/month**

## Security Best Practices

1. **Never commit credentials**: Use `.env.local` (already in `.gitignore`)
2. **Use IAM roles**: Lambda functions use IAM roles, not access keys
3. **Enable MFA**: For AWS console access
4. **Review Cognito settings**: Adjust password policies as needed
5. **Monitor CloudWatch**: Set up alarms for errors and unusual activity

## Custom Domain Setup (Optional)

To use a custom domain (e.g., madewithkiro.com) instead of the S3 website URL:

1. **Register a domain** (via Route 53 or another registrar)
2. **Update samconfig.toml** with your domain name
3. **Deploy the stack** - it will create:
   - Route 53 Hosted Zone (if needed)
   - ACM Certificate (SSL/TLS)
   - CloudFront Distribution
   - DNS records
4. **Update name servers** at your registrar (if not using Route 53)
5. **Wait for DNS propagation** (5-30 minutes for certificate, up to 48 hours for DNS)

See [DOMAIN-SETUP.md](DOMAIN-SETUP.md) for detailed instructions.

## Next Steps

After successful deployment:

1. Create a test user in Cognito
2. Test authentication flow
3. Create a profile
4. Add an application
5. View the gallery
6. (Optional) Set up custom domain

## Support

For issues or questions:

1. Check CloudWatch logs: `make logs`
2. Review CloudFormation events
3. Verify environment configuration
4. Check AWS service quotas
