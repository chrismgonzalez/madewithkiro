# Implementation Plan: Social Authentication

- [ ] 1. Update SAM template with social identity providers

  - Update template.yaml to add Google and GitHub identity providers
  - Add SSM parameter references for OAuth client secrets
  - Update Cognito User Pool to include picture attribute
  - Update Cognito User Pool Client to support social providers and disable password auth
  - Add DependsOn clauses to ensure proper resource creation order
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1_

- [ ]\* 1.1 Write unit tests for SAM template validation

  - Test that Google IdP resource is defined correctly
  - Test that GitHub IdP resource is defined correctly
  - Test that SSM parameters are referenced correctly
  - Test that User Pool Client has correct SupportedIdentityProviders
  - Test that ExplicitAuthFlows is empty (no password auth)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1_

- [ ] 2. Create SSM parameter setup script

  - Create script to store OAuth secrets in SSM Parameter Store
  - Support both development and production environments
  - Include validation for required environment variables
  - Add error handling for AWS CLI failures
  - _Requirements: 3.3_

- [ ]\* 2.1 Write unit tests for SSM setup script

  - Test parameter creation with correct names
  - Test SecureString type is used
  - Test environment-specific parameter paths
  - _Requirements: 3.3_

- [ ] 3. Create authentication service module

  - Implement CognitoAuthService class with OAuth flow methods
  - Implement signInWithProvider method for Google and GitHub
  - Implement handleCallback method for authorization code exchange
  - Implement getUserInfo method to fetch user attributes
  - Add proper TypeScript interfaces for auth types
  - _Requirements: 1.2, 1.4, 2.2, 2.4_

- [ ]\* 3.1 Write property test for OAuth URL construction

  - **Property 1: OAuth attribute extraction completeness**
  - **Validates: Requirements 1.3**

- [ ]\* 3.2 Write property test for JWT token validity

  - **Property 2: JWT token validity after authentication**
  - **Validates: Requirements 1.4, 2.4**

- [ ] 4. Create token management module

  - Implement TokenManager class for secure token storage
  - Implement storeTokens, getAccessToken, clearTokens methods
  - Implement refreshAccessToken method with automatic retry
  - Add token expiration detection logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]\* 4.1 Write property test for automatic token refresh

  - **Property 5: Automatic token refresh on expiration**
  - **Validates: Requirements 4.2**

- [ ]\* 4.2 Write property test for session persistence

  - **Property 6: Session persistence across browser sessions**
  - **Validates: Requirements 4.3**

- [ ]\* 4.3 Write property test for re-authentication requirement

  - **Property 7: Re-authentication requirement on refresh token expiration**
  - **Validates: Requirements 4.4**

- [ ] 5. Create authentication context and provider

  - Implement AuthContext with user state and auth methods
  - Implement AuthProvider component wrapping the app
  - Implement useAuth custom hook for consuming auth context
  - Add loading and error states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]\* 5.1 Write property test for first-time user creation

  - **Property 3: First-time user profile creation**
  - **Validates: Requirements 1.5, 2.5**

- [ ]\* 5.2 Write property test for GitHub attribute extraction

  - **Property 4: GitHub attribute extraction completeness**
  - **Validates: Requirements 2.3**

- [ ] 6. Create login page component

  - Implement LoginPage component with social login buttons
  - Add Google and GitHub button UI with icons
  - Implement click handlers to trigger OAuth flows
  - Add loading states during authentication
  - Style buttons using Tailwind CSS and shadcn/ui
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ]\* 6.1 Write unit tests for login page

  - Test that Google button is rendered
  - Test that GitHub button is rendered
  - Test that clicking Google button triggers correct OAuth flow
  - Test that clicking GitHub button triggers correct OAuth flow
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 7. Create OAuth callback handler component

  - Implement CallbackPage component to handle OAuth redirects
  - Parse authorization code from URL parameters
  - Exchange code for tokens using auth service
  - Handle OAuth errors and display user-friendly messages
  - Implement redirect to stored destination or home page
  - _Requirements: 1.4, 2.4, 5.1, 5.2, 6.1, 6.2, 6.3_

- [ ]\* 7.1 Write property test for OAuth error propagation

  - **Property 8: OAuth error propagation**
  - **Validates: Requirements 5.1**

- [ ]\* 7.2 Write property test for error message display

  - **Property 9: Error message display**
  - **Validates: Requirements 5.2**

- [ ]\* 7.3 Write property test for protected route redirect

  - **Property 12: Protected route redirect preservation**
  - **Validates: Requirements 6.1, 6.2**

- [ ] 8. Create error handling components

  - Implement ErrorDisplay component for authentication errors
  - Add error message mapping for common OAuth errors
  - Implement retry button for network errors
  - Add user-friendly error messages
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]\* 8.1 Write property test for network error retry

  - **Property 10: Network error retry availability**
  - **Validates: Requirements 5.4**

- [ ]\* 8.2 Write property test for provider independence

  - **Property 11: Provider independence on failure**
  - **Validates: Requirements 5.5**

- [ ] 9. Create protected route component

  - Implement ProtectedRoute wrapper component
  - Check authentication status before rendering children
  - Store intended destination URL in sessionStorage
  - Redirect to login page if unauthenticated
  - Show loading spinner while checking auth status
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]\* 9.1 Write unit tests for protected route

  - Test redirect to login when unauthenticated
  - Test destination URL is stored
  - Test children render when authenticated
  - Test default redirect when no destination stored
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 10. Implement sign-out functionality

  - Add signOut method to auth service
  - Call Cognito logout endpoint to revoke tokens
  - Clear tokens from localStorage
  - Reset auth context state
  - Redirect to login page after sign-out
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]\* 10.1 Write property test for token revocation

  - **Property 13: Token revocation on sign-out**
  - **Validates: Requirements 7.1, 7.4**

- [ ]\* 10.2 Write property test for local token cleanup

  - **Property 14: Local token cleanup on sign-out**
  - **Validates: Requirements 7.2**

- [ ] 11. Implement profile picture support

  - Add picture attribute to Cognito User Pool schema in SAM template
  - Update attribute mapping for Google to include picture
  - Update attribute mapping for GitHub to include avatar_url
  - Ensure picture URL is stored in user attributes after authentication
  - _Requirements: 9.4, 9.7, 10.1, 10.2, 10.3_

- [ ]\* 11.1 Write property test for Google profile picture retrieval

  - **Property 15: Google profile picture retrieval and storage**
  - **Validates: Requirements 9.4, 10.1, 10.3**

- [ ]\* 11.2 Write property test for GitHub name parsing

  - **Property 16: GitHub name parsing**
  - **Validates: Requirements 9.6**

- [ ]\* 11.3 Write property test for GitHub avatar retrieval

  - **Property 17: GitHub avatar retrieval and storage**
  - **Validates: Requirements 9.7, 10.2, 10.3**

- [ ] 12. Create profile picture display component

  - Implement ProfilePicture component with image rendering
  - Add fallback to default avatar with user initial
  - Handle image load errors gracefully
  - Support different sizes (small, medium, large)
  - Style using Tailwind CSS
  - _Requirements: 10.4, 10.5_

- [ ]\* 12.1 Write property test for profile picture rendering

  - **Property 18: Profile picture rendering**
  - **Validates: Requirements 10.4**

- [ ]\* 12.2 Write property test for profile picture fallback

  - **Property 19: Profile picture fallback**
  - **Validates: Requirements 10.5**

- [ ] 13. Update environment configuration

  - Add Cognito configuration to environment files
  - Add OAuth callback URLs for dev and prod
  - Add user pool ID, client ID, and domain to config
  - Create separate configs for development and production
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]\* 13.1 Write unit tests for environment configuration

  - Test dev config has localhost callback URL
  - Test prod config has production callback URL
  - Test environment-specific values are loaded correctly
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 14. Update routing configuration

  - Add /login route for LoginPage component
  - Add /callback route for CallbackPage component
  - Wrap protected routes with ProtectedRoute component
  - Update navigation to use auth-aware links
  - _Requirements: 1.1, 1.4, 6.1, 6.2_

- [ ] 15. Update navigation and user menu

  - Add sign-out button to user menu
  - Display user profile picture in navigation
  - Show user name in navigation
  - Add conditional rendering based on auth status
  - _Requirements: 7.3, 10.4_

- [ ] 16. Remove username/password authentication

  - Remove password input fields from UI
  - Remove username/password auth flows from Cognito config
  - Update documentation to reflect social-only auth
  - _Requirements: 8.1, 8.2, 8.4_

- [ ]\* 16.1 Write unit tests for password auth removal

  - Test login page does not contain password fields
  - Test User Pool Client ExplicitAuthFlows is empty
  - _Requirements: 8.1, 8.2_

- [ ] 17. Create OAuth provider setup documentation

  - Document Google OAuth setup steps
  - Document GitHub OAuth setup steps
  - Document SSM parameter creation process
  - Document callback URL configuration
  - Add troubleshooting guide
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 18. Update deployment scripts and Makefile

  - Update Makefile to include SSM parameter setup
  - Add deploy command that reads from SSM
  - Update deployment documentation
  - Add validation for required OAuth credentials
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 19. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Deploy to development environment

  - Store OAuth secrets in SSM Parameter Store for dev
  - Deploy SAM template to dev environment
  - Verify Cognito User Pool and identity providers created
  - Test Google OAuth flow end-to-end
  - Test GitHub OAuth flow end-to-end
  - Verify profile pictures are displayed correctly
  - _Requirements: 11.1, 11.2_

- [ ] 21. Deploy to production environment

  - Store OAuth secrets in SSM Parameter Store for prod
  - Deploy SAM template to prod environment
  - Verify Cognito User Pool and identity providers created
  - Test Google OAuth flow end-to-end in production
  - Test GitHub OAuth flow end-to-end in production
  - Monitor CloudWatch logs for any errors
  - _Requirements: 11.3, 11.4, 11.5_

- [ ] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
