/**
 * AWS Amplify Configuration
 *
 * Configures AWS Amplify for authentication with Cognito User Pools
 * and federated identity providers (Google and GitHub).
 */

import { Amplify, type ResourcesConfig } from "aws-amplify";

/**
 * Detect current domain for dynamic redirect URL configuration
 *
 * This allows the same build to work on localhost and CloudFront
 * by automatically detecting the current domain and using appropriate
 * redirect URLs.
 */
const getCurrentDomain = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

/**
 * Determine redirect URLs based on current domain
 *
 * For localhost: Use localhost URLs
 * For CloudFront/production: Use current domain URLs
 */
const getRedirectUrls = () => {
  const currentDomain = getCurrentDomain();

  // If running on localhost, use localhost URLs
  if (currentDomain.includes("localhost")) {
    return {
      redirectSignIn: "http://localhost:5173/auth/callback",
      redirectSignOut: "http://localhost:5173/",
    };
  }

  // Otherwise use the current domain
  return {
    redirectSignIn: `${currentDomain}/auth/callback`,
    redirectSignOut: `${currentDomain}/`,
  };
};

const redirectUrls = getRedirectUrls();

/**
 * Amplify Configuration Object
 *
 * Configures:
 * - Cognito User Pool for authentication
 * - Cognito Identity Pool for AWS resource access
 * - OAuth settings for federated sign-in with Google and GitHub
 */
const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId:
        import.meta.env.VITE_USER_POOL_ID ||
        import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId:
        import.meta.env.VITE_USER_POOL_CLIENT_ID ||
        import.meta.env.VITE_COGNITO_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
      loginWith: {
        oauth: {
          domain:
            import.meta.env.VITE_COGNITO_DOMAIN?.replace(
              "https://",
              ""
            ).replace("http://", "") || "",
          scopes: [
            "email",
            "openid",
            "profile",
            "aws.cognito.signin.user.admin",
          ],
          redirectSignIn: [redirectUrls.redirectSignIn],
          redirectSignOut: [redirectUrls.redirectSignOut],
          responseType: "code" as const,
        },
      },
    },
  },
};

/**
 * Initialize Amplify with configuration
 *
 * This must be called before any Amplify Auth methods are used.
 * It's imported in main.tsx to ensure it runs on app initialization.
 */
Amplify.configure(amplifyConfig);

export default amplifyConfig;
