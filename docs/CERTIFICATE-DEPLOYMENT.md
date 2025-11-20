# Certificate Deployment Guide

## Overview

CloudFront requires ACM certificates to be in the **us-east-1** region, but our main stack is in **us-west-2**. To handle this properly, we use a two-stack approach:

1. **Certificate Stack** (us-east-1) - Creates the ACM certificate
2. **Main Stack** (us-west-2) - References the certificate ARN

## Prerequisites

- AWS CLI configured
- SAM CLI installed
- Domain registered and Route 53 Hosted Zone created
- Hosted Zone ID: `Z00541582Q16QTXW4013F`

## Step-by-Step Deployment

### Step 1: Deploy Certificate Stack (us-east-1)

```bash
make deploy-certificate
```

This will:

- Deploy `certificate-template.yaml` to us-east-1
- Create ACM certificate for `madewithkiro.com` and `*.madewithkiro.com`
- Use DNS validation with your Route 53 Hosted Zone
- Output the Certificate ARN

**Expected Output:**

```
Certificate ARN:
arn:aws:acm:us-east-1:633458675472:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**⏱️ Time:** ~5-10 minutes (DNS validation)

### Step 2: Update samconfig.toml with Certificate ARN

Copy the Certificate ARN from Step 1 and update `samconfig.toml`:

```toml
[prod.deploy.parameters]
parameter_overrides = [
  "Environment=prod",
  "CognitoCallbackURL=https://madewithkiro.com",
  "DomainName=madewithkiro.com",
  "HostedZoneId=Z00541582Q16QTXW4013F",
  "CertificateArn=arn:aws:acm:us-east-1:633458675472:certificate/YOUR-CERT-ID",  # ← Update this
]
```

### Step 3: Deploy Main Stack (us-west-2)

```bash
make deploy-prod
```

This will:

- Deploy the main application stack to us-west-2
- Reference the certificate from us-east-1
- Create CloudFront distribution with custom domain
- Set up all other resources (Lambda, DynamoDB, Cognito, etc.)

**⏱️ Time:** ~15-20 minutes (CloudFront creation)

### Step 4: Verify Deployment

```bash
make outputs-prod
```

Check for:

- ✅ CloudFront URL
- ✅ Custom Domain URL (https://madewithkiro.com)
- ✅ API Gateway URL
- ✅ Cognito User Pool ID

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     us-east-1 Region                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Certificate Stack (madewithkiro-certificate)          │ │
│  │  - ACM Certificate for madewithkiro.com                │ │
│  │  - DNS Validation via Route 53                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Certificate ARN
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     us-west-2 Region                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Main Stack (madewithkiro-prod)                        │ │
│  │  - CloudFront (references cert from us-east-1)         │ │
│  │  - Lambda Functions                                    │ │
│  │  - DynamoDB                                            │ │
│  │  - Cognito                                             │ │
│  │  - API Gateway                                         │ │
│  │  - S3 Bucket                                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Files

- `certificate-template.yaml` - Certificate stack template
- `certificate-samconfig.toml` - Certificate stack configuration
- `template.yaml` - Main application stack template
- `samconfig.toml` - Main stack configuration

## Troubleshooting

### Certificate Validation Pending

If the certificate stays in "Pending Validation" status:

1. Check DNS records were created:

   ```bash
   aws acm describe-certificate \
     --certificate-arn YOUR-CERT-ARN \
     --region us-east-1 \
     --query 'Certificate.DomainValidationOptions'
   ```

2. Verify CNAME records in Route 53:

   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id Z00541582Q16QTXW4013F \
     --query 'ResourceRecordSets[?Type==`CNAME`]'
   ```

3. Wait up to 30 minutes for DNS propagation

### CloudFront Deployment Fails

If CloudFront fails with certificate error:

1. Verify certificate is in us-east-1:

   ```bash
   aws acm list-certificates --region us-east-1
   ```

2. Verify certificate status is "ISSUED":

   ```bash
   aws acm describe-certificate \
     --certificate-arn YOUR-CERT-ARN \
     --region us-east-1 \
     --query 'Certificate.Status'
   ```

3. Ensure Certificate ARN in samconfig.toml is correct

### Update Certificate ARN

If you need to update the certificate ARN after deployment:

1. Update `samconfig.toml` with new ARN
2. Redeploy: `make deploy-prod`
3. CloudFormation will update CloudFront distribution

## Cleanup

### Delete Main Stack

```bash
aws cloudformation delete-stack --stack-name madewithkiro-prod --region us-west-2
```

### Delete Certificate Stack

```bash
aws cloudformation delete-stack --stack-name madewithkiro-certificate --region us-east-1
```

**Note:** Delete main stack first, as it references the certificate.

## Cost

**Certificate Stack:**

- ACM Certificate: **FREE**
- Route 53 DNS queries: ~$0.40/month per million queries

**Main Stack:**

- See main DEPLOYMENT-GUIDE.md for full cost breakdown

## Best Practices

1. ✅ Deploy certificate stack once, reuse for multiple environments
2. ✅ Keep certificate ARN in parameter store for automation
3. ✅ Monitor certificate expiration (auto-renews if DNS validation works)
4. ✅ Use same certificate for multiple CloudFront distributions
5. ✅ Tag resources appropriately for cost tracking

## Next Steps

After successful deployment:

1. ✅ Test custom domain: `https://madewithkiro.com`
2. ✅ Upload frontend: `make upload-frontend-prod`
3. ✅ Test authentication flow
4. ✅ Create test profile and application
5. ✅ Monitor CloudWatch logs

---

**Your certificate is now properly deployed in us-east-1 and ready for CloudFront!** 🎉
