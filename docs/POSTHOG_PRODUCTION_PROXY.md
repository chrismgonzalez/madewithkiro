# PostHog Production Proxy Setup

To bypass ad blockers in production, you need to proxy PostHog requests through your CloudFront distribution.

## Option 1: CloudFront Cache Behavior (Recommended)

Add a cache behavior to your CloudFront distribution that proxies `/ingest/*` to PostHog.

### Manual Setup (AWS Console)

1. Go to CloudFront console
2. Select your distribution
3. Go to "Behaviors" tab
4. Click "Create behavior"
5. Configure:
   - **Path pattern**: `/ingest/*`
   - **Origin**: Create new origin
     - **Origin domain**: `us.i.posthog.com` (or `eu.i.posthog.com` for EU)
     - **Protocol**: HTTPS only
     - **Origin path**: Leave empty
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache policy**: CachingDisabled (or create custom with short TTL)
   - **Origin request policy**: AllViewer
6. Save and wait for deployment

### Automated Setup (SAM Template)

I'll add this to your `template.yaml` - see the updated CloudFront configuration below.

## Option 2: API Gateway Proxy (Alternative)

If you prefer to use API Gateway instead of CloudFront:

1. Add a new Lambda function that proxies to PostHog
2. Add API Gateway routes for `/ingest/*`
3. Update frontend to use API Gateway URL

This is more complex and adds latency, so CloudFront is recommended.

## Frontend Configuration

Once the proxy is set up:

**Production (.env.production):**

```bash
VITE_POSTHOG_API_KEY=your_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_USE_PROXY=true
```

The frontend will send requests to `https://yourdomain.com/ingest/*` which CloudFront will proxy to PostHog.

## Testing

1. Deploy the CloudFront changes
2. Build and deploy your frontend
3. Open browser console and check for PostHog initialization
4. Verify requests go to `/ingest/*` instead of `us.i.posthog.com`
5. Check Network tab - requests should succeed (200 OK)

## Troubleshooting

- **502 Bad Gateway**: Check origin domain is correct (`us.i.posthog.com` or `eu.i.posthog.com`)
- **CORS errors**: Ensure origin request policy includes all headers
- **Still blocked**: Clear browser cache and CloudFront cache
- **Events not appearing**: Check PostHog project settings and API key
