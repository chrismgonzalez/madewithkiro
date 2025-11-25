# Security Headers Implementation

## Overview

This document describes the security headers implemented in CloudFront for the MadeWithKiro application. These headers protect against common web vulnerabilities and enforce security best practices.

## Implementation

Security headers are configured via a CloudFront Response Headers Policy attached to the CloudFront distribution. The policy is defined in `template.yaml` as the `CloudFrontResponseHeadersPolicy` resource.

## Security Headers Configured

### 1. Strict-Transport-Security (HSTS)

**Purpose**: Forces browsers to use HTTPS for all future requests to the domain.

**Configuration**:

```yaml
StrictTransportSecurity:
  AccessControlMaxAgeSec: 31536000 # 1 year
  IncludeSubdomains: true
  Preload: true
  Override: true
```

**Effect**:

- Browsers will automatically convert HTTP requests to HTTPS for 1 year
- Applies to all subdomains
- Eligible for browser HSTS preload lists

### 2. X-Content-Type-Options

**Purpose**: Prevents browsers from MIME-sniffing responses away from the declared content-type.

**Configuration**:

```yaml
ContentTypeOptions:
  Override: true
```

**Effect**:

- Sets `X-Content-Type-Options: nosniff`
- Prevents browsers from interpreting files as a different MIME type than declared

### 3. X-Frame-Options

**Purpose**: Protects against clickjacking attacks by preventing the page from being embedded in iframes.

**Configuration**:

```yaml
FrameOptions:
  FrameOption: DENY
  Override: true
```

**Effect**:

- Sets `X-Frame-Options: DENY`
- Prevents the application from being embedded in any iframe

### 4. X-XSS-Protection

**Purpose**: Enables browser XSS protection for legacy browsers.

**Configuration**:

```yaml
XSSProtection:
  ModeBlock: true
  Protection: true
  Override: true
```

**Effect**:

- Sets `X-XSS-Protection: 1; mode=block`
- Enables XSS filtering and blocks the page if an attack is detected
- Note: Modern browsers rely on CSP instead, but this provides backward compatibility

### 5. Referrer-Policy

**Purpose**: Controls how much referrer information is sent with requests.

**Configuration**:

```yaml
ReferrerPolicy:
  ReferrerPolicy: strict-origin-when-cross-origin
  Override: true
```

**Effect**:

- Sends full URL for same-origin requests
- Sends only origin for cross-origin HTTPS requests
- Sends no referrer when downgrading from HTTPS to HTTP

### 6. Content-Security-Policy (CSP)

**Purpose**: Restricts resource loading to prevent XSS and other code injection attacks.

**Configuration**:

```yaml
ContentSecurityPolicy:
  ContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.execute-api.*.amazonaws.com https://*.amazonaws.com https://*.amazoncognito.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  Override: true
```

**Directives**:

- `default-src 'self'`: Only load resources from same origin by default
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'`: Allow scripts from same origin, inline scripts, and eval (required for React/Vite)
- `style-src 'self' 'unsafe-inline'`: Allow styles from same origin and inline styles (required for Tailwind CSS)
- `img-src 'self' data: https:`: Allow images from same origin, data URIs, and any HTTPS source
- `font-src 'self' data:`: Allow fonts from same origin and data URIs
- `connect-src 'self' https://*.execute-api.*.amazonaws.com https://*.amazonaws.com https://*.amazoncognito.com`: Allow API calls to same origin, API Gateway, AWS services, and Cognito
- `frame-ancestors 'none'`: Prevent embedding in iframes (similar to X-Frame-Options)
- `base-uri 'self'`: Restrict base tag to same origin
- `form-action 'self'`: Restrict form submissions to same origin

## Verification

After deployment, you can verify the security headers are present using:

### Browser DevTools

1. Open the application in a browser
2. Open DevTools (F12)
3. Go to Network tab
4. Refresh the page
5. Click on the main document request
6. Check the Response Headers section

### Command Line

```bash
curl -I https://your-cloudfront-domain.cloudfront.net
```

### Online Tools

- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## Expected Headers in Response

```
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.execute-api.*.amazonaws.com https://*.amazonaws.com https://*.amazoncognito.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

## Deployment

The security headers are automatically applied when you deploy the CloudFormation stack:

```bash
# Deploy to dev
make deploy-dev

# Deploy to production
make deploy-prod
```

After deployment, CloudFront will automatically apply these headers to all responses.

## Troubleshooting

### CSP Violations

If you see CSP violations in the browser console:

1. Check the browser console for specific violation messages
2. Review the CSP policy in `template.yaml`
3. Add necessary domains to the appropriate directive
4. Redeploy the stack

### Headers Not Appearing

If headers are not appearing:

1. Verify the CloudFront distribution has been updated (check AWS Console)
2. Clear CloudFront cache: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`
3. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Check that the ResponseHeadersPolicy is attached to the distribution

## Security Considerations

### CSP Relaxations

The current CSP includes `'unsafe-inline'` and `'unsafe-eval'` for scripts, which are required for:

- React development and production builds
- Vite bundler
- Dynamic imports

**Future Improvements**:

- Consider using nonces or hashes for inline scripts in production
- Evaluate if `'unsafe-eval'` can be removed after build optimization

### HSTS Preloading

The application is configured for HSTS preloading. To submit to the preload list:

1. Ensure HTTPS is working correctly
2. Test thoroughly (preloading is difficult to undo)
3. Submit at [hstspreload.org](https://hstspreload.org/)

## Related Requirements

This implementation satisfies the following requirements from the security hardening specification:

- **Requirement 7.4**: Security headers configured in CloudFront
- **Requirement 7.5**: Content Security Policy implemented

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [AWS CloudFront Response Headers Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-response-headers.html)
