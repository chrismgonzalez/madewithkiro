# AWS Amplify Configuration Guide

## Overview

This document describes the AWS Amplify configuration for the MadeWithKiro application. Amplify is configured to support authentication with AWS Cognito User Pools and federated identity providers (Google and GitHub).

## Configuration File

The Amplify configuration is located at `src/config/amplify.ts` and is automatically initialized when the application starts.

## Environment Variables

The following environment variables must be set in your `.env.development` or `.env.production` files:

### Required Variables

| Variable                   | Description                    | Example                                                     |
| -------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `VITE_USER_POOL_ID`        | Cognito User Pool ID           | `us-west-2_cwWGdl4T6`                                       |
| `VITE_USER_POOL_CLIENT_ID` | Cognito User Pool Client ID    | `54hln2cmp85e813qgo880as7q`                                 |
| `VITE_IDENTITY_POOL_ID`    | Cognito Identity Pool ID       | `us-west-2:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`            |
| `VITE_AWS_REGION`          | AWS Region                     | `us-west-2`                                                 |
| `VITE_COGNITO_DOMAIN`      | Cognito Domain (with https://) | `https://madewithkiro-dev.auth.us-west-2.amazoncognito.com` |

### Legacy Variables (Supported for Backward Compatibility)

The configuration also supports these legacy variable names:

- `VITE_COGNITO_USER_POOL_ID` (alias for `VITE_USER_POOL_ID`)
- `VITE_COGNITO_CLIENT_ID` (alias for `VITE_USER_POOL_CLIENT_ID`)
- `VITE_COGNITO_REGION` (alias for `VITE_AWS_REGION`)

## Getting Configuration Values

After deploying your SAM template, retrieve the configuration values from CloudFormation outputs:

```bash
# Get User Pool ID
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text

# Get User Pool Client ID
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text

# Get Identity Pool ID
aws cloudformation describe-stacks \
  --stack-name madewithkiro-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' \
  --output text
```

## Dynamic Redirect URLs

The configuration automatically detects the current domain and uses appropriate redirect URLs:

- **Localhost**: `http://localhost:5173/auth/callback`
- **Production/CloudFront**: `https://<current-domain>/auth/callback`

This allows the same build to work on both localhost and CloudFront without modification.

## OAuth Configuration

The Amplify configuration includes OAuth settings for federated sign-in:

- **Scopes**: `email`, `openid`, `profile`, `aws.cognito.signin.user.admin`
- **Response Type**: `code` (Authorization Code Grant)
- **Redirect Sign In**: `/auth/callback`
- **Redirect Sign Out**: `/` (home page)

## Testing the Configuration

Run the Amplify configuration tests:

```bash
bun run test src/config/__tests__/amplify.test.ts
```

## Initialization

Amplify is automatically initialized when the application starts. The configuration is imported in `src/main.tsx`:

```typescript
import "./config/amplify"; // Initialize AWS Amplify
```

This ensures Amplify is configured before any authentication methods are called.

## Troubleshooting

### Missing Environment Variables

If you see errors about missing environment variables, ensure all required variables are set in your `.env` file:

```bash
# Check if variables are set
echo $VITE_USER_POOL_ID
echo $VITE_USER_POOL_CLIENT_ID
echo $VITE_IDENTITY_POOL_ID
```

### Invalid Cognito Domain

The Cognito domain should be in the format:

```
https://<domain-prefix>.auth.<region>.amazoncognito.com
```

The configuration automatically strips `https://` and `http://` from the domain.

### Redirect URL Mismatch

Ensure the redirect URLs in your Cognito User Pool Client match the URLs used by the application:

1. Go to AWS Console → Cognito → User Pools
2. Select your User Pool
3. Go to "App integration" → "App clients"
4. Click on your app client
5. Verify "Allowed callback URLs" includes:
   - `http://localhost:5173/auth/callback` (for development)
   - `https://<your-domain>/auth/callback` (for production)

## Next Steps

After configuring Amplify:

1. Implement the AuthContext (Task 5)
2. Create authentication pages (Task 7)
3. Set up OAuth callback handler (Task 8)
4. Configure protected routes (Task 9)

## References

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Amplify Auth Documentation](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
