# Deployment Guide

This guide covers deploying MadeWithKiro to AWS using AWS SAM.

## Prerequisites

- AWS Account with appropriate permissions
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) installed
- Project dependencies installed (`make install`)

## Deployment Environments

The application supports two environments:

- **dev**: Development environment with relaxed settings
- **prod**: Production environment with stricter security

Configuration is managed in `samconfig.toml`.

## Deploy to Development

### 1. Deploy Infrastructure

```bash
make deploy-dev
```

This deploys:

- DynamoDB tables
- Lambda functions
- API Gateway
- Cognito User Pool
- S3 bucket for frontend
- CloudFront distribution

### 2. Get API Configuration

After deployment, retrieve the API Gateway URL:

```bash
make outputs-dev
```

Look for the `ApiGatewayUrl` output value.

### 3. Configure Frontend

Run the setup script to populate `.env` from CloudFormation outputs:

```bash
./scripts/setup-env.sh
```

Or manually update `.env.development` with the `ApiUrl` output from `make outputs-dev`.

### 4. Upload Frontend

Build and upload the frontend to S3:

```bash
make upload-frontend-dev
```

This builds the React app and uploads it to the S3 bucket created by SAM.

### 5. Seed Test Data (Optional)

Populate the database with test data:

```bash
make seed-db
```

Your development environment is now ready!

## Deploy to Production

### 1. Deploy Infrastructure

```bash
make deploy-prod
```

You'll be prompted to confirm before deploying to production.

### 2. Get API Configuration

```bash
make outputs-prod
```

### 3. Configure Frontend

Run the setup script to populate `.env` from CloudFormation outputs:

```bash
./scripts/setup-env.sh
```

Or manually update `.env.production` with the `ApiUrl` output from `make outputs-prod`.

### 4. Upload Frontend

```bash
make upload-frontend-prod
```

## Custom Domain Setup

To use a custom domain (e.g., `madewithkiro.com`):

### 1. Register Domain

Register a domain through Route 53 or another registrar.

### 2. Request SSL Certificate

The SAM template automatically requests an ACM certificate for your domain. You'll need to validate it via email or DNS.

### 3. Update Configuration

Update `samconfig.toml` with your domain name:

```toml
[prod.deploy.parameters]
parameter_overrides = "Environment=prod DomainName=madewithkiro.com"
```

### 4. Deploy

```bash
make deploy-prod
```

### 5. Wait for DNS Propagation

DNS changes can take 5-30 minutes to propagate globally.

## Monitoring and Logs

### View Lambda Logs

Tail all Lambda logs:

```bash
make logs
```

View specific function logs:

```bash
make logs-profile
make logs-application
```

### CloudWatch Metrics

Access CloudWatch in the AWS Console to view:

- API Gateway request metrics
- Lambda execution metrics
- DynamoDB read/write capacity
- Error rates and latency

## Troubleshooting

### Deployment Fails

1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify SAM CLI version: `sam --version`
3. Check CloudFormation events in AWS Console
4. Review error messages in terminal output

### API Returns 403 Errors

1. Verify Cognito configuration
2. Check API Gateway authorizer settings
3. Ensure JWT tokens are valid
4. Review Lambda execution role permissions

### Frontend Not Loading

1. Check S3 bucket permissions
2. Verify CloudFront distribution status
3. Check browser console for errors
4. Ensure environment variables are set correctly

### Database Errors

1. Verify DynamoDB table exists
2. Check Lambda IAM permissions for DynamoDB
3. Review Lambda logs for specific errors
4. Ensure table indexes are created

## Cleanup

### Remove Development Environment

```bash
make destroy-dev
```

⚠️ This will delete all data and resources in the development environment.

### Remove Production Environment

```bash
make destroy-prod
```

⚠️ This will delete all data and resources in the production environment.

## Security Best Practices

- Never commit AWS credentials
- Use IAM roles with least privilege
- Enable CloudTrail for audit logging
- Rotate Cognito secrets regularly
- Keep dependencies up to date
- Enable DynamoDB encryption at rest
- Use HTTPS for all traffic
