# PostHog Analytics Setup

PostHog analytics has been integrated into MadeWithKiro.

## What Was Added

1. **Package**: `posthog-js` installed via bun
2. **Context Provider**: `PostHogProvider` in `src/contexts/PostHogContext.tsx`
3. **Page Tracking Hook**: `usePageTracking` in `src/hooks/usePageTracking.ts`
4. **Analytics Utility**: Helper functions in `src/utils/analytics.ts`
5. **Environment Variables**: Added to `.env.example`, `.env.development`, and `.env.production`

## Configuration

Add your PostHog credentials to your environment files:

```bash
VITE_POSTHOG_API_KEY=phc_your_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com  # or https://eu.i.posthog.com for EU
```

Get your API key from: https://app.posthog.com/project/settings

## Features Enabled

- **Automatic Page View Tracking**: Tracks route changes via TanStack Router
- **Autocapture**: Automatically captures clicks and interactions
- **Page Leave Tracking**: Tracks when users leave pages
- **Person Profiles**: Only creates profiles for identified users

## Automatic User Tracking

User identification is automatically handled in `AuthContext`:

- **On Login**: User is identified with their Cognito userId, email, name, and provider
- **On Logout**: User identity is reset in PostHog

## Usage Examples

### Track Custom Events

```typescript
import { analytics } from "@/utils/analytics";

// Track an event
analytics.track("application_created", {
  appName: "My App",
  tags: ["react", "typescript"],
});

// Track user actions
analytics.track("profile_updated", {
  fields: ["firstName", "linkedIn"],
});

analytics.track("application_viewed", {
  appId: "app-123",
  appName: "My Cool App",
});
```

## Integration Points

The PostHog provider wraps your app in `src/main.tsx` and page tracking is enabled in `src/components/Layout.tsx`.

If PostHog credentials are not provided, the analytics will gracefully do nothing.

## Ad Blocker Bypass (Reverse Proxy)

PostHog requests are often blocked by ad blockers. I've configured a reverse proxy to bypass this:

**Development (Vite proxy):**

- Set `VITE_POSTHOG_USE_PROXY=true` in `.env.development`
- Requests go to `/ingest` which Vite proxies to PostHog
- Restart dev server after changing env variables

**Production (CloudFront):**

- CloudFront is configured to proxy `/ingest/*` to PostHog (see `template.yaml`)
- Set `VITE_POSTHOG_USE_PROXY=true` in `.env.production`
- Deploy with `make deploy-prod` to update CloudFront
- See `docs/POSTHOG_PRODUCTION_PROXY.md` for detailed setup

## Debugging

I've added console logging to help debug PostHog initialization:

1. **Check browser console** for PostHog initialization messages:

   - `[PostHog] Initializing with host: ...`
   - `[PostHog] Using proxy: true/false`
   - `[PostHog] Successfully initialized`
   - `[PageTracking] Capturing pageview: ...`
   - `[Analytics] Tracking event: ...`

2. **Run debug helper** in browser console:

   ```javascript
   window.checkPostHog();
   ```

   This will show PostHog status, config, and whether it's loaded.

3. **Common issues**:
   - **Blocked by ad blocker**: Enable proxy mode (`VITE_POSTHOG_USE_PROXY=true`) and restart dev server
   - Missing API key: Check `.env.development` has `VITE_POSTHOG_API_KEY`
   - Wrong host: Verify `VITE_POSTHOG_HOST` matches your PostHog instance
   - Dev server restart: After adding env variables, restart `bun run dev`
   - Browser console errors: Check for CORS or network issues
