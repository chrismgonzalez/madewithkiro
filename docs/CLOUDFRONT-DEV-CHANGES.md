# CloudFront for Dev Environment - Changes Summary

## Overview

Modified the infrastructure to deploy CloudFront for both dev and prod environments, ensuring HTTPS everywhere and a production-like setup for development.

## Changes Made

### 1. template.yaml

#### Added New Condition

```yaml
Conditions:
  CreateCloudFront: !Or
    - !Equals [!Ref Environment, "dev"]
    - !Equals [!Ref Environment, "prod"]
```

This ensures CloudFront is created for both environments.

#### Updated CloudFront Distribution

- **Changed Condition:** `HasCustomDomain` → `CreateCloudFront`
- **Made Aliases Conditional:** Only set custom domain alias when `HasCustomDomain` is true
- **Made Certificate Conditional:** Uses ACM certificate for custom domains, default CloudFront certificate otherwise

```yaml
Aliases: !If
  - HasCustomDomain
  - [!Ref DomainName]
  - !Ref AWS::NoValue

ViewerCertificate: !If
  - HasCustomDomain
  - AcmCertificateArn: !Ref Certificate
    SslSupportMethod: sni-only
    MinimumProtocolVersion: TLSv1.2_2021
  - CloudFrontDefaultCertificate: true
```

#### Updated Related Resources

- **CloudFrontOriginAccessControl:** Changed condition to `CreateCloudFront`
- **FrontendBucketPolicyForCloudFront:** Changed condition to `CreateCloudFront`

#### Added New Output

```yaml
CloudFrontUrl:
  Condition: CreateCloudFront
  Description: CloudFront Distribution URL (use this for Cognito callback in dev)
  Value: !Sub https://${CloudFrontDistribution.DomainName}
```

### 2. scripts/update-cognito-callback.sh (New File)

Created a helper script to automatically update the Cognito callback URL after first deployment.

**Features:**

- Fetches CloudFront URL from stack outputs
- Backs up samconfig.toml
- Updates callback URL automatically
- Prompts for confirmation

**Usage:**

```bash
./scripts/update-cognito-callback.sh dev
```

### 3. DEPLOYMENT-GUIDE.md (New File)

Comprehensive deployment guide covering:

- Prerequisites and setup
- Step-by-step deployment process
- Two-stage deployment (initial + callback update)
- Development workflow
- Production deployment
- Troubleshooting
- Cost estimates

## Deployment Flow

### Initial Deployment

```bash
make deploy-dev
```

- Creates all infrastructure
- CloudFront distribution created (~10-15 minutes)
- Uses `http://localhost:5173` as temporary callback URL

### Update Callback URL

```bash
./scripts/update-cognito-callback.sh dev
# Then redeploy
make deploy-dev
```

- Updates Cognito with CloudFront HTTPS URL
- Enables authentication to work with deployed frontend

### Upload Frontend

```bash
make build
make upload-frontend-dev
```

## Benefits

### For Dev Environment

✅ **HTTPS Everywhere** - No mixed content warnings
✅ **Production-like Setup** - Test with real CloudFront behavior
✅ **Secure Cookies** - Can use secure cookies in dev
✅ **Better Testing** - Catch CloudFront-specific issues early
✅ **Cognito Compatible** - Works seamlessly with Cognito auth

### For Prod Environment

✅ **Consistent Architecture** - Same setup as dev
✅ **Custom Domain Support** - Maintained for production
✅ **SSL Certificate** - Automatic via ACM

## URLs After Deployment

### Dev Environment

- **Frontend:** `https://d111111abcdef8.cloudfront.net` (CloudFront default domain)
- **API:** `https://xxxxx.execute-api.us-west-2.amazonaws.com/dev`
- **Cognito Callback:** `https://d111111abcdef8.cloudfront.net`

### Prod Environment

- **Frontend:** `https://madewithkiro.com` (Custom domain via CloudFront)
- **API:** `https://xxxxx.execute-api.us-west-2.amazonaws.com/prod`
- **Cognito Callback:** `https://madewithkiro.com`

## Cost Impact

**Additional CloudFront costs for dev:**

- ~$0.085/GB data transfer
- ~$0.01/10,000 requests
- No charge for HTTPS requests

**Estimated additional cost: $2-5/month for light dev usage**

## Migration Notes

If you've already deployed without CloudFront for dev:

1. **Backup current deployment:**

   ```bash
   make outputs-dev > dev-outputs-backup.txt
   ```

2. **Deploy updated template:**

   ```bash
   make deploy-dev
   ```

   CloudFormation will add CloudFront to existing stack.

3. **Update callback URL:**

   ```bash
   ./scripts/update-cognito-callback.sh dev
   make deploy-dev
   ```

4. **Upload frontend:**
   ```bash
   make upload-frontend-dev
   ```

## Testing Checklist

After deployment:

- [ ] CloudFront distribution created
- [ ] HTTPS URL accessible
- [ ] Cognito callback URL updated
- [ ] Authentication flow works
- [ ] API calls succeed
- [ ] Static assets load correctly
- [ ] No mixed content warnings

## Rollback

If you need to rollback to S3-only for dev:

1. Revert template.yaml changes
2. Update samconfig.toml callback to S3 website URL
3. Redeploy: `make deploy-dev`

Note: CloudFormation will remove CloudFront distribution (takes ~15 minutes).
