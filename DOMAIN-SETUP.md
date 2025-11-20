# Custom Domain Setup Guide

This guide explains how to set up a custom domain for MadeWithKiro.

## Overview

The SAM template supports custom domains with:

- **Route 53 Hosted Zone** (created automatically or use existing)
- **ACM Certificate** (SSL/TLS certificate for HTTPS)
- **CloudFront Distribution** (CDN with custom domain)
- **DNS Records** (automatic A record creation)

## Prerequisites

You need to **register a domain** first. You can do this through:

- AWS Route 53 (recommended): https://console.aws.amazon.com/route53/
- Any other domain registrar (GoDaddy, Namecheap, etc.)

**Note**: Domain registration is NOT automated in the template because:

1. It requires manual payment
2. It can take 24-48 hours to complete
3. It's a one-time setup that shouldn't be in infrastructure code

## Setup Options

### Option 1: New Domain with Auto-Created Hosted Zone (Recommended)

**Best for**: First-time setup, domain registered through Route 53

**Steps**:

1. **Register your domain** (if not already done):

   ```bash
   # Via AWS Console: Route 53 > Registered domains > Register domain
   # Or use AWS CLI:
   aws route53domains register-domain --domain-name madewithkiro.com --duration-in-years 1
   ```

2. **Update samconfig.toml** for production:

   ```toml
   [prod.deploy.parameters]
   parameter_overrides = [
     "Environment=prod",
     "CognitoCallbackURL=https://madewithkiro.com",
     "DomainName=madewithkiro.com",
     "HostedZoneId=",  # Leave empty to create new hosted zone
   ]
   ```

3. **Deploy the stack**:

   ```bash
   make deploy-prod
   ```

4. **Get the name servers** (if domain registered outside Route 53):

   ```bash
   make outputs-prod
   ```

   Look for `HostedZoneNameServers` output.

5. **Update domain registrar** (if not using Route 53):

   - Go to your domain registrar's DNS settings
   - Replace the name servers with the ones from the output
   - Wait 24-48 hours for DNS propagation

6. **Wait for certificate validation**:

   - ACM will automatically validate via DNS (5-30 minutes)
   - Check status: AWS Console > Certificate Manager

7. **Upload frontend**:

   ```bash
   make build
   make upload-frontend-prod
   ```

8. **Access your site**:
   ```
   https://madewithkiro.com
   ```

### Option 2: Existing Hosted Zone

**Best for**: Domain already has a Route 53 hosted zone

**Steps**:

1. **Get your Hosted Zone ID**:

   ```bash
   aws route53 list-hosted-zones-by-name --dns-name madewithkiro.com
   ```

2. **Update samconfig.toml**:

   ```toml
   [prod.deploy.parameters]
   parameter_overrides = [
     "Environment=prod",
     "CognitoCallbackURL=https://madewithkiro.com",
     "DomainName=madewithkiro.com",
     "HostedZoneId=Z1234567890ABC",  # Your hosted zone ID
   ]
   ```

3. **Deploy**:

   ```bash
   make deploy-prod
   ```

4. **Upload frontend**:
   ```bash
   make build
   make upload-frontend-prod
   ```

### Option 3: No Custom Domain (Development)

**Best for**: Local development, testing

**Steps**:

1. **Keep default settings** in samconfig.toml:

   ```toml
   [dev.deploy.parameters]
   parameter_overrides = [
     "Environment=dev",
     "CognitoCallbackURL=http://localhost:5173",
     "DomainName=",  # Empty = no custom domain
     "HostedZoneId=",
   ]
   ```

2. **Deploy**:

   ```bash
   make deploy-dev
   ```

3. **Use S3 website URL**:

   ```bash
   make outputs-dev
   ```

   Look for `FrontendUrl` output.

## Configuration Examples

### Development (No Custom Domain)

```toml
# samconfig.toml
[dev.deploy.parameters]
parameter_overrides = [
  "Environment=dev",
  "CognitoCallbackURL=http://localhost:5173",
  "DomainName=",
  "HostedZoneId=",
]
```

**Result**: Uses S3 website hosting directly

### Staging with Subdomain

```toml
# samconfig.toml
[staging.deploy.parameters]
parameter_overrides = [
  "Environment=staging",
  "CognitoCallbackURL=https://staging.madewithkiro.com",
  "DomainName=staging.madewithkiro.com",
  "HostedZoneId=Z1234567890ABC",  # Parent domain's hosted zone
]
```

**Result**: Creates CloudFront distribution with staging.madewithkiro.com

### Production with Custom Domain

```toml
# samconfig.toml
[prod.deploy.parameters]
parameter_overrides = [
  "Environment=prod",
  "CognitoCallbackURL=https://madewithkiro.com",
  "DomainName=madewithkiro.com",
  "HostedZoneId=",  # Auto-create or specify existing
]
```

**Result**: Full production setup with CloudFront and custom domain

## What Gets Created

When you specify a `DomainName`, the template creates:

1. **Route 53 Hosted Zone** (if `HostedZoneId` is empty)

   - Manages DNS records for your domain
   - Provides name servers for domain registrar

2. **ACM Certificate**

   - SSL/TLS certificate for HTTPS
   - Covers both `example.com` and `*.example.com`
   - Auto-validates via DNS

3. **CloudFront Distribution**

   - Global CDN for fast content delivery
   - HTTPS only (redirects HTTP to HTTPS)
   - Custom domain configured
   - Origin Access Control for S3

4. **Route 53 A Record**

   - Points your domain to CloudFront
   - Alias record (no additional cost)

5. **Updated S3 Bucket Policy**
   - Allows CloudFront to access S3
   - Blocks direct public access

## DNS Propagation

After deployment:

1. **Certificate validation**: 5-30 minutes
2. **CloudFront deployment**: 15-30 minutes
3. **DNS propagation**: 0-48 hours (depends on TTL)

Check DNS propagation:

```bash
# Check if DNS is propagated
dig madewithkiro.com

# Check CloudFront distribution status
aws cloudfront get-distribution --id <distribution-id>
```

## Troubleshooting

### Certificate Stuck in "Pending Validation"

**Cause**: DNS records not propagated or incorrect hosted zone

**Solution**:

1. Check Route 53 hosted zone has correct name servers
2. Verify domain registrar has correct name servers
3. Wait up to 30 minutes for DNS propagation
4. Check ACM console for validation records

### CloudFront Returns 403 Forbidden

**Cause**: S3 bucket policy not updated or no files uploaded

**Solution**:

```bash
# Upload frontend files
make build
make upload-frontend-prod

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

### Domain Not Resolving

**Cause**: DNS not propagated or incorrect name servers

**Solution**:

1. Check name servers at registrar match Route 53
2. Wait 24-48 hours for full propagation
3. Test with: `dig madewithkiro.com`

### Certificate Validation Failed

**Cause**: Hosted zone doesn't match domain or DNS issues

**Solution**:

1. Ensure hosted zone name matches domain exactly
2. Check hosted zone has correct name servers
3. Delete and recreate certificate if needed

## Cost Implications

Adding a custom domain increases costs:

| Service              | Cost                    |
| -------------------- | ----------------------- |
| Route 53 Hosted Zone | $0.50/month             |
| Route 53 Queries     | $0.40/million queries   |
| CloudFront           | $0.085/GB (first 10 TB) |
| ACM Certificate      | **FREE**                |
| Domain Registration  | $12-50/year (one-time)  |

**Estimated additional cost**: $1-5/month (depending on traffic)

## Updating Domain Configuration

### Change Domain Name

1. Update `samconfig.toml` with new domain
2. Deploy: `make deploy-prod`
3. Update Cognito callback URLs
4. Update name servers at registrar (if new domain)

### Remove Custom Domain

1. Set `DomainName=""` in samconfig.toml
2. Deploy: `make deploy-prod`
3. CloudFront and Route 53 resources will be removed

### Add Subdomain

1. Use existing hosted zone ID
2. Set `DomainName=subdomain.example.com`
3. Deploy

## Best Practices

1. **Use Route 53 for domain registration**: Simplifies DNS management
2. **Enable DNSSEC**: Extra security for DNS
3. **Set up CloudWatch alarms**: Monitor CloudFront errors
4. **Use CloudFront invalidations**: Clear cache after deployments
5. **Enable CloudFront logging**: Track access patterns
6. **Set up WAF**: Protect against common web attacks (optional)

## Makefile Commands

Add these to your workflow:

```bash
# Deploy with custom domain
make deploy-prod

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(aws cloudformation describe-stacks \
    --stack-name madewithkiro-prod \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text) \
  --paths "/*"

# Check certificate status
aws acm describe-certificate \
  --certificate-arn $(aws cloudformation describe-stacks \
    --stack-name madewithkiro-prod \
    --query 'Stacks[0].Outputs[?OutputKey==`CertificateArn`].OutputValue' \
    --output text)
```

## Security Considerations

1. **HTTPS Only**: CloudFront redirects all HTTP to HTTPS
2. **Origin Access Control**: S3 bucket only accessible via CloudFront
3. **Certificate Auto-Renewal**: ACM automatically renews certificates
4. **DNSSEC**: Consider enabling for additional security
5. **WAF**: Consider adding AWS WAF for DDoS protection

## Next Steps

After domain setup:

1. Update Cognito callback URLs to use custom domain
2. Update frontend environment variables
3. Test authentication flow with custom domain
4. Set up monitoring and alarms
5. Configure CloudFront caching policies
6. Enable CloudFront logging
7. Consider adding WAF rules

## Support

For domain-related issues:

1. Check CloudFormation events: `aws cloudformation describe-stack-events --stack-name madewithkiro-prod`
2. Check ACM certificate status: AWS Console > Certificate Manager
3. Check CloudFront distribution: AWS Console > CloudFront
4. Check Route 53 records: AWS Console > Route 53
5. Test DNS: `dig madewithkiro.com` or `nslookup madewithkiro.com`
