# Implementation Plan: Social Authentication with Cognito SDK

## BDD/TDD Approach

This implementation follows Behavior-Driven Development (BDD) and Test-Driven Development (TDD) methodology:

1. **Write Acceptance Tests First** - Given-When-Then format describing expected behavior
2. **Red** - Run tests and watch them fail
3. **Green** - Write minimal code to make tests pass
4. **Refactor** - Improve code quality while keeping tests green

Each task follows this pattern to ensure proper SDLC practices.

---

- [x] 1. Set up infrastructure and dependencies

  - Install aws-amplify package using bun
  - Install @aws-amplify/auth package
  - Install fast-check for property-based testing
  - Update package.json with correct versions
  - Configure test scripts in package.json
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 2. Update SAM template with Cognito resources

  - Add Cognito User Pool with federated identity support
  - Add Google Identity Provider configuration
  - Add GitHub Identity Provider configuration
  - Add Cognito User Pool Client with OAuth settings
  - Add Cognito Identity Pool
  - Add SSM parameter references for OAuth secrets
  - Add CloudFormation outputs for User Pool ID, Client ID, and Identity Pool ID
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Create SSM parameter setup script

  - Create script to store OAuth secrets in SSM Parameter Store
  - Support both development and production environments
  - Include validation for required environment variables
  - Add error handling for AWS CLI failures
  - _Requirements: 12.2, 12.4_

- [x] 4. Create Amplify configuration module

  - Create amplify.ts configuration file
  - Configure Auth with User Pool ID, Client ID, and Identity Pool ID
  - Configure OAuth settings with redirect URLs
  - Set up environment-specific configuration
  - Initialize Amplify in main.tsx
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.5_

- [x] 5. Implement authentication context (BDD/TDD)
- [x] 5.1 Write acceptance tests for authentication context

  - **GIVEN** a user clicks the "Sign in with Google" button
  - **WHEN** the authentication flow initiates
  - **THEN** the system should redirect to Google OAuth consent screen
  - **GIVEN** a user clicks the "Sign in with GitHub" button
  - **WHEN** the authentication flow initiates
  - **THEN** the system should redirect to GitHub OAuth authorization page
  - **GIVEN** a user successfully authenticates with Google
  - **WHEN** the OAuth callback is processed
  - **THEN** the system should create a user profile with email, given_name, family_name, and picture from Google
  - **GIVEN** a user successfully authenticates with GitHub
  - **WHEN** the OAuth callback is processed
  - **THEN** the system should create a user profile with email, name, and avatar_url from GitHub
  - **GIVEN** a user successfully authenticates
  - **WHEN** the authentication completes
  - **THEN** the system should issue JWT tokens (ID token, access token, refresh token)
  - **GIVEN** a user is authenticated
  - **WHEN** the user clicks sign out
  - **THEN** the system should clear all authentication state and redirect to the home page
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 3.2, 3.3, 4.2, 4.3_

- [ ]\* 5.2 Write property test for federated sign-in flow

  - **Property 1: Federated sign-in flow**
  - **Validates: Requirements 1.2, 2.2**

- [ ]\* 5.3 Write property test for user attribute extraction

  - **Property 2: User attribute extraction**
  - **Validates: Requirements 1.3, 2.3, 10.1, 10.2**

- [x] 5.4 Implement authentication context (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement AuthContext with user state
  - **GREEN**: Implement AuthProvider component
  - **GREEN**: Implement signInWithGoogle using Auth.federatedSignIn
  - **GREEN**: Implement signInWithGitHub using Auth.federatedSignIn
  - **GREEN**: Implement signOut using Auth.signOut
  - **GREEN**: Implement refreshSession using Auth.currentSession
  - **GREEN**: Set up Hub listener for auth events (signIn, signOut)
  - **GREEN**: Implement checkUser using Auth.currentAuthenticatedUser
  - **GREEN**: Extract user attributes from Cognito response
  - **REFACTOR**: Extract helper functions for attribute parsing
  - **REFACTOR**: Improve error handling
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 3.2, 3.3, 4.2, 4.3, 11.1, 11.2, 11.3, 11.4_

- [x] 6. Implement useAuth hook (BDD/TDD)
- [x] 6.1 Write acceptance tests for useAuth hook

  - **GIVEN** a component uses the useAuth hook
  - **WHEN** the component renders
  - **THEN** the hook should provide access to the current user state
  - **GIVEN** a component uses the useAuth hook
  - **WHEN** the component renders
  - **THEN** the hook should provide signInWithGoogle, signInWithGitHub, and signOut methods
  - **GIVEN** a component uses the useAuth hook outside of AuthProvider
  - **WHEN** the hook is called
  - **THEN** the system should throw an error indicating the hook must be used within AuthProvider
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 6.2 Implement useAuth custom hook (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Export useAuth hook from AuthContext
  - **GREEN**: Provide type-safe access to auth state and methods
  - **GREEN**: Throw error if used outside AuthProvider
  - **REFACTOR**: Improve error messages
  - **REFACTOR**: Add JSDoc comments
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 7. Implement authentication page (BDD/TDD)
- [x] 7.1 Write acceptance tests for authentication page

  - **GIVEN** a user visits the authentication page
  - **WHEN** the page loads
  - **THEN** the system should display a "Sign in with Google" button with the Google icon
  - **GIVEN** a user visits the authentication page
  - **WHEN** the page loads
  - **THEN** the system should display a "Sign in with GitHub" button with the GitHub icon
  - **GIVEN** a user clicks the "Sign in with Google" button
  - **WHEN** the button is clicked
  - **THEN** the system should call signInWithGoogle and show a loading state
  - **GIVEN** a user clicks the "Sign in with GitHub" button
  - **WHEN** the button is clicked
  - **THEN** the system should call signInWithGitHub and show a loading state
  - **GIVEN** an OAuth error occurs
  - **WHEN** the error is returned in the URL parameters
  - **THEN** the system should display a user-friendly error message
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 7.1, 7.2_

- [x] 7.2 Implement authentication page component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement AuthPage component with social login buttons
  - **GREEN**: Add Google button with Chrome icon
  - **GREEN**: Add GitHub button with GitHub icon
  - **GREEN**: Implement click handlers to call signInWithGoogle/signInWithGitHub
  - **GREEN**: Add loading states during authentication
  - **GREEN**: Handle OAuth errors from URL parameters
  - **GREEN**: Display user-friendly error messages
  - **GREEN**: Style using Tailwind CSS and shadcn/ui
  - **REFACTOR**: Extract error message mapping to utility function
  - **REFACTOR**: Improve button styling and accessibility
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 7.1, 7.2_

- [x] 8. Implement OAuth callback handler (BDD/TDD)
- [x] 8.1 Write acceptance tests for OAuth callback handler

  - **GIVEN** a user completes OAuth authentication
  - **WHEN** the callback URL is loaded
  - **THEN** the system should wait for Amplify to complete the code exchange
  - **GIVEN** the OAuth code exchange completes successfully
  - **WHEN** the Hub signIn event is processed
  - **THEN** the system should retrieve the stored redirect destination from sessionStorage
  - **GIVEN** a redirect destination was stored before authentication
  - **WHEN** the callback processing completes
  - **THEN** the system should redirect to the stored destination
  - **GIVEN** no redirect destination was stored
  - **WHEN** the callback processing completes
  - **THEN** the system should redirect to the home page
  - **GIVEN** an OAuth error occurs during callback
  - **WHEN** the error is detected
  - **THEN** the system should display an error message and show a link to retry authentication
  - _Requirements: 1.4, 2.3, 3.4, 4.3, 8.1, 8.2, 8.3_

- [x] 8.2 Implement OAuth callback handler page (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement AuthCallbackPage component
  - **GREEN**: Wait for Amplify to complete code exchange
  - **GREEN**: Wait for Hub signIn event to be processed
  - **GREEN**: Retrieve stored redirect destination from sessionStorage
  - **GREEN**: Redirect to stored destination or home page
  - **GREEN**: Handle OAuth errors in callback
  - **GREEN**: Display loading spinner during processing
  - **REFACTOR**: Extract redirect logic to helper function
  - **REFACTOR**: Improve error handling
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.4, 2.3, 3.4, 4.3, 8.1, 8.2, 8.3_

- [x] 9. Implement protected route component (BDD/TDD)
- [x] 9.1 Write acceptance tests for protected route

  - **GIVEN** an authenticated user accesses a protected route
  - **WHEN** the route loads
  - **THEN** the system should render the protected content
  - **GIVEN** an unauthenticated user accesses a protected route
  - **WHEN** the route loads
  - **THEN** the system should store the intended destination URL in sessionStorage
  - **GIVEN** an unauthenticated user accesses a protected route
  - **WHEN** the route loads
  - **THEN** the system should redirect to the /auth page
  - **GIVEN** the authentication status is being checked
  - **WHEN** the check is in progress
  - **THEN** the system should display a loading spinner
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 9.2 Implement protected route component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement ProtectedRoute wrapper component
  - **GREEN**: Check authentication status using useAuth
  - **GREEN**: Store intended destination URL in sessionStorage
  - **GREEN**: Redirect to /auth if unauthenticated
  - **GREEN**: Show loading spinner while checking auth status
  - **GREEN**: Render children if authenticated
  - **REFACTOR**: Simplify conditional logic
  - **REFACTOR**: Improve loading state UI
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 10. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement profile picture component (BDD/TDD)
- [x] 11.1 Write acceptance tests for profile picture component

  - **GIVEN** a user has a profile picture URL
  - **WHEN** the ProfilePicture component renders
  - **THEN** the system should display the user's profile picture
  - **GIVEN** a user does not have a profile picture URL
  - **WHEN** the ProfilePicture component renders
  - **THEN** the system should display a default avatar with the user's initial
  - **GIVEN** a profile picture fails to load
  - **WHEN** the image error occurs
  - **THEN** the system should fall back to the default avatar with the user's initial
  - **GIVEN** the ProfilePicture component is rendered with different size props
  - **WHEN** the component renders
  - **THEN** the system should apply the appropriate size classes (sm, md, lg)
  - _Requirements: 10.4, 10.5_

- [x] 11.2 Implement profile picture component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement ProfilePicture component with image rendering
  - **GREEN**: Add fallback to default avatar with user initial
  - **GREEN**: Handle image load errors gracefully
  - **GREEN**: Support different sizes (sm, md, lg)
  - **GREEN**: Style using Tailwind CSS with gradient background for fallback
  - **REFACTOR**: Extract size classes to constant
  - **REFACTOR**: Improve gradient colors
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 10.4, 10.5_

- [x] 12. Implement API request interceptor (BDD/TDD)
- [x] 12.1 Write acceptance tests for API interceptor

  - **GIVEN** an authenticated user makes an API request
  - **WHEN** the request is sent
  - **THEN** the system should add the Authorization header with the current access token as a Bearer token
  - **GIVEN** an API request returns a 401 Unauthorized response
  - **WHEN** the response is received
  - **THEN** the system should attempt to refresh the access token using Auth.currentSession
  - **GIVEN** the token refresh succeeds
  - **WHEN** the new token is obtained
  - **THEN** the system should retry the original request with the new token
  - **GIVEN** the token refresh fails
  - **WHEN** the refresh attempt completes
  - **THEN** the system should redirect the user to the /auth page
  - _Requirements: 6.2, 6.4_

- [x] 12.2 Implement API request interceptor (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create axios instance with base URL
  - **GREEN**: Implement request interceptor to add Authorization header
  - **GREEN**: Get current session token using Auth.currentSession
  - **GREEN**: Implement response interceptor for 401 errors
  - **GREEN**: Automatically refresh token on 401 and retry request
  - **GREEN**: Redirect to auth page if refresh fails
  - **REFACTOR**: Extract token refresh logic to helper function
  - **REFACTOR**: Improve error logging
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.2, 6.4_

- [x] 12.3 Create auth service module (BDD/TDD)
- [x] 12.3.1 Write acceptance tests for auth service

  - **GIVEN** a user is authenticated
  - **WHEN** I request the access token
  - **THEN** I should receive the current access token from Cognito
  - **GIVEN** an access token is expired
  - **WHEN** I make an authenticated request
  - **THEN** the system should attempt to refresh the token before making the request
  - **GIVEN** token refresh fails
  - **WHEN** the refresh attempt completes
  - **THEN** the user should be redirected to the authentication page

- [x] 12.3.2 Write acceptance tests for request interceptor integration

  - **GIVEN** a user is authenticated
  - **WHEN** the API client makes an authenticated request
  - **THEN** the request should include the access token in the Authorization header as a Bearer token
  - **GIVEN** a user is not authenticated
  - **WHEN** the API client makes a request to a public endpoint
  - **THEN** the request should not include an Authorization header

- [ ]\* 12.3.3 Write property test for authenticated request token inclusion

  - **Property: Authenticated request token inclusion**
  - **Validates: Token is correctly added to all authenticated requests**

- [x] 12.3.4 Implement auth service (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement getAccessToken method using Cognito SDK
  - **GREEN**: Implement token refresh logic
  - **GREEN**: Implement isAuthenticated check
  - **GREEN**: Handle token expiration
  - **REFACTOR**: Ensure all tests pass, improve code quality

- [x] 12.3.5 Integrate auth service with API client (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Retrieve access token before authenticated requests
  - **GREEN**: Add Bearer token to Authorization header
  - **GREEN**: Handle token expiration and refresh
  - **GREEN**: Redirect to auth page on refresh failure
  - **REFACTOR**: Ensure all tests pass, improve code quality

- [x] 13. Update routing configuration

  - Add /auth route for AuthPage component
  - Add /auth/callback route for AuthCallbackPage component
  - Wrap protected routes with ProtectedRoute component
  - Update router configuration in router.tsx
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_

- [x] 14. Implement navigation component updates (BDD/TDD)
- [x] 14.1 Write acceptance tests for navigation component

  - **GIVEN** an authenticated user views the navigation
  - **WHEN** the navigation renders
  - **THEN** the system should display the user's profile picture
  - **GIVEN** an authenticated user views the navigation
  - **WHEN** the navigation renders
  - **THEN** the system should display the user's name
  - **GIVEN** an authenticated user views the navigation
  - **WHEN** the navigation renders
  - **THEN** the system should display a sign-out button in the user menu
  - **GIVEN** an authenticated user clicks the sign-out button
  - **WHEN** the button is clicked
  - **THEN** the system should call the signOut method and redirect to the home page
  - **GIVEN** an unauthenticated user views the navigation
  - **WHEN** the navigation renders
  - **THEN** the system should display a sign-in button
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 14.2 Implement navigation component updates (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add sign-out button to user menu
  - **GREEN**: Display user profile picture in navigation
  - **GREEN**: Show user name in navigation
  - **GREEN**: Add conditional rendering based on auth status
  - **GREEN**: Call signOut method on sign-out button click
  - **REFACTOR**: Extract user menu to separate component
  - **REFACTOR**: Improve mobile responsiveness
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 9.1, 9.2, 9.3, 10.4_

- [x] 15. Implement session persistence (BDD/TDD)
- [x] 15.1 Write acceptance tests for session persistence

  - **GIVEN** a user has an active session
  - **WHEN** the user refreshes the page
  - **THEN** the system should restore the user's authentication state from the stored session
  - **GIVEN** a user has an active session
  - **WHEN** the access token expires
  - **THEN** the system should automatically refresh the token using the refresh token
  - **GIVEN** the refresh token expires
  - **WHEN** the system attempts to refresh the session
  - **THEN** the system should redirect the user to the authentication page
  - **GIVEN** a user closes and reopens the browser
  - **WHEN** the application loads
  - **THEN** the system should restore the user's authentication state if the session is still valid
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 15.2 Implement session persistence (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Ensure AuthContext checks for existing session on mount
  - **GREEN**: Use Auth.currentAuthenticatedUser to restore session
  - **GREEN**: Handle refresh token expiration gracefully
  - **GREEN**: Maintain auth state across browser sessions
  - **REFACTOR**: Improve session restoration logic
  - **REFACTOR**: Add better error handling
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 16. Implement profile attribute retrieval (BDD/TDD)
- [x] 16.1 Write acceptance tests for profile attribute retrieval

  - **GIVEN** a user authenticates with Google
  - **WHEN** the user profile is created
  - **THEN** the system should extract email, given_name, family_name, and picture from the Google response
  - **GIVEN** a user authenticates with GitHub
  - **WHEN** the user profile is created
  - **THEN** the system should extract email, name, and avatar_url from the GitHub response
  - **GIVEN** a user authenticates with GitHub
  - **WHEN** the name attribute is processed
  - **THEN** the system should parse the full name into given_name and family_name
  - **GIVEN** user attributes are extracted
  - **WHEN** the profile is stored
  - **THEN** the system should store the profile picture URL in the user state
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]\* 16.2 Write property test for name parsing

  - **Property 3: Name parsing**
  - **Validates: Requirements 10.3**

- [x] 16.3 Implement profile attribute retrieval (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Extract user attributes from Cognito response in AuthContext
  - **GREEN**: Map Google attributes (email, given_name, family_name, picture)
  - **GREEN**: Map GitHub attributes (email, name, avatar_url)
  - **GREEN**: Parse GitHub name into given_name and family_name
  - **GREEN**: Store profile picture URL in user state
  - **REFACTOR**: Extract attribute mapping to helper functions
  - **REFACTOR**: Improve name parsing logic
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 17. Implement error handling (BDD/TDD)
- [x] 17.1 Write acceptance tests for error handling

  - **GIVEN** an OAuth error occurs during authentication
  - **WHEN** the error is detected
  - **THEN** the system should display a user-friendly error message based on the error type
  - **GIVEN** a network error occurs during authentication
  - **WHEN** the error is detected
  - **THEN** the system should display a message indicating a network issue and suggest retrying
  - **GIVEN** an identity provider is unavailable
  - **WHEN** the authentication attempt fails
  - **THEN** the system should display a message indicating the provider is temporarily unavailable
  - **GIVEN** a network error occurs during authentication
  - **WHEN** the error is detected
  - **THEN** the system should automatically retry the authentication up to 2 times
  - **GIVEN** all retry attempts fail
  - **WHEN** the final attempt completes
  - **THEN** the system should display an error message and log the error details for monitoring
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 17.2 Implement error handling (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add error state to AuthContext
  - **GREEN**: Handle OAuth errors from URL parameters
  - **GREEN**: Display user-friendly error messages
  - **GREEN**: Implement retry mechanism for network errors
  - **GREEN**: Handle provider unavailability
  - **GREEN**: Log errors for monitoring
  - **REFACTOR**: Extract error message mapping to utility
  - **REFACTOR**: Improve retry logic
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 18. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Update environment configuration

  - Create .env.development with Cognito configuration
  - Create .env.production with Cognito configuration
  - Add environment variables for User Pool ID, Client ID, Identity Pool ID
  - Add OAuth redirect URLs for callback route
  - Document environment variable setup
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 20. Create OAuth provider setup documentation

  - Document Google OAuth setup steps
  - Document GitHub OAuth setup steps
  - Document SSM parameter creation process
  - Document callback URL configuration
  - Add troubleshooting guide
  - _Requirements: 5.2, 5.3, 12.2, 12.4_

- [x] 21. Update deployment scripts and Makefile

  - Update Makefile to include SSM parameter setup
  - Add deploy command that reads from SSM
  - Update deployment documentation
  - Add validation for required OAuth credentials
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 22. Deploy to development environment

  - Store OAuth secrets in SSM Parameter Store for dev
  - Deploy SAM template to dev environment
  - Verify Cognito User Pool and identity providers created
  - Update frontend .env.development with Cognito outputs
  - Build and deploy frontend to dev
  - Test Google OAuth flow end-to-end
  - Test GitHub OAuth flow end-to-end
  - Verify profile pictures are displayed correctly
  - Verify session persistence works
  - _Requirements: 12.1, 12.2_

- [ ] 23. Deploy to production environment

  - Store OAuth secrets in SSM Parameter Store for prod
  - Deploy SAM template to prod environment
  - Verify Cognito User Pool and identity providers created
  - Update frontend .env.production with Cognito outputs
  - Build and deploy frontend to prod
  - Test Google OAuth flow end-to-end in production
  - Test GitHub OAuth flow end-to-end in production
  - Monitor CloudWatch logs for any errors
  - _Requirements: 12.3, 12.4, 12.5_

- [ ] 24. Final checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Integrate authentication with API client (BDD/TDD)
- [ ] 25.1 Write acceptance tests for API client authentication

  - **GIVEN** a user is authenticated
  - **WHEN** the API client makes a request with requiresAuth set to true
  - **THEN** the request should include an Authorization header with a Bearer token
  - **GIVEN** a user is not authenticated
  - **WHEN** the API client makes a request with requiresAuth set to true
  - **THEN** the request should proceed without an Authorization header
  - **GIVEN** a user makes an authenticated request
  - **WHEN** the API returns 401 Unauthorized
  - **THEN** the system should attempt to refresh the token and retry the request
  - **GIVEN** token refresh succeeds
  - **WHEN** the request is retried
  - **THEN** the request should include the new token and succeed
  - **GIVEN** token refresh fails
  - **WHEN** the refresh attempt completes
  - **THEN** the system should redirect to the authentication page
  - **GIVEN** a user makes a request to a public endpoint
  - **WHEN** requiresAuth is false or undefined
  - **THEN** the request should not include an Authorization header
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]\* 25.2 Write property test for authenticated request token inclusion

  - **Property 21: Authenticated request token inclusion**
  - **Validates: Requirements 13.1, 13.2**

- [ ]\* 25.3 Write property test for public request without token

  - **Property 22: Public request without token**
  - **Validates: Requirements 13.3**

- [ ] 25.4 Create auth service module (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create authService.ts file
  - **GREEN**: Implement getAccessToken method
  - **GREEN**: Implement getIdToken method
  - **GREEN**: Implement isAuthenticated method
  - **GREEN**: Implement refreshSession method
  - **GREEN**: Export singleton instance
  - **REFACTOR**: Add error handling
  - **REFACTOR**: Add JSDoc comments
  - **REFACTOR**: Ensure all tests pass
  - _Requirements: 13.1, 13.4_

- [ ] 25.5 Update API client with authentication support (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add getAuthToken private method to ApiClient
  - **GREEN**: Update buildHeaders to accept requiresAuth parameter
  - **GREEN**: Update buildHeaders to add Authorization header when authenticated
  - **GREEN**: Add handleUnauthorized method for 401 responses
  - **GREEN**: Update makeRequest to handle 401 responses
  - **GREEN**: Update makeRequest to call handleUnauthorized on 401
  - **GREEN**: Ensure token refresh and retry logic works
  - **REFACTOR**: Extract token management to helper methods
  - **REFACTOR**: Improve error handling
  - **REFACTOR**: Ensure all tests pass
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 25.6 Update service methods to use requiresAuth flag

  - Update applicationService methods to set requiresAuth: true
  - Update profileService methods to set requiresAuth: true
  - Ensure public endpoints (if any) use requiresAuth: false
  - Test authenticated API calls work correctly
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 25.7 Test API client authentication integration

  - Test authenticated requests include Bearer token
  - Test public requests don't include token
  - Test 401 response triggers token refresh
  - Test successful token refresh and retry
  - Test failed token refresh redirects to auth
  - Verify all API calls work with real authentication
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 26. Create OAuth provider setup documentation (BDD/TDD)
- [ ] 26.1 Write documentation validation tests

  - **GIVEN** a developer follows the Google OAuth setup documentation
  - **WHEN** they complete all steps
  - **THEN** they should have a valid Google Client ID and Client Secret stored in SSM
  - **GIVEN** a developer follows the GitHub OAuth setup documentation
  - **WHEN** they complete all steps
  - **THEN** they should have a valid GitHub Client ID and Client Secret stored in SSM
  - **GIVEN** a developer configures OAuth redirect URIs
  - **WHEN** they deploy the Cognito User Pool
  - **THEN** the redirect URIs should match the Cognito domain exactly
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 26.2 Create OAuth setup documentation

  - **GREEN**: Document Google Cloud Console project creation
  - **GREEN**: Document Google OAuth consent screen configuration
  - **GREEN**: Document Google OAuth credentials creation
  - **GREEN**: Document GitHub OAuth App creation
  - **GREEN**: Document GitHub callback URL configuration
  - **GREEN**: Document SSM parameter storage commands
  - **GREEN**: Document Cognito domain setup
  - **GREEN**: Document redirect URI updates
  - **GREEN**: Add troubleshooting section for common OAuth errors
  - **REFACTOR**: Ensure documentation is clear and complete
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 27. Transition from mock to real authentication (BDD/TDD)
- [ ] 27.1 Write acceptance tests for mock removal

  - **GIVEN** the codebase has been migrated to real authentication
  - **WHEN** searching for "MockAuthContext" in the codebase
  - **THEN** the search should return zero results
  - **GIVEN** the codebase has been migrated to real authentication
  - **WHEN** all components are checked
  - **THEN** all components should use the real AuthContext
  - **GIVEN** the codebase has been migrated to real authentication
  - **WHEN** all API calls are checked
  - **THEN** all API calls should use real authentication tokens
  - **GIVEN** the codebase has been migrated to real authentication
  - **WHEN** all tests are run
  - **THEN** all tests should pass without mock authentication
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 27.2 Identify and document mock authentication usage

  - **GREEN**: Search for all MockAuthContext imports
  - **GREEN**: List all components using mock authentication
  - **GREEN**: Identify test files that need updates
  - **GREEN**: Create migration checklist
  - _Requirements: 14.1_

- [ ] 27.3 Replace mock context with real context (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Replace MockAuthContext imports with AuthContext
  - **GREEN**: Update main.tsx to use real AuthProvider
  - **GREEN**: Update all component imports
  - **GREEN**: Update service imports to use real services
  - **REFACTOR**: Verify all imports are correct
  - **REFACTOR**: Ensure all tests pass
  - _Requirements: 14.2, 14.3_

- [ ] 27.4 Remove mock authentication files (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Delete MockAuthContext.tsx file
  - **GREEN**: Remove mock-related test utilities
  - **GREEN**: Clean up unused mock data services
  - **GREEN**: Update test setup to mock Amplify Auth
  - **REFACTOR**: Verify no broken imports
  - **REFACTOR**: Ensure all tests pass
  - _Requirements: 14.1, 14.5_

- [ ] 27.5 Verify migration completeness

  - Search codebase for any remaining mock references
  - Run all tests and verify they pass
  - Test OAuth flows end-to-end
  - Verify protected routes work correctly
  - Check for console errors
  - _Requirements: 14.4, 14.5_

- [ ] 28. Implement multi-domain authentication support (BDD/TDD)
- [ ] 28.1 Write acceptance tests for multi-domain support

  - **GIVEN** the application is running on localhost
  - **WHEN** a user initiates OAuth authentication
  - **THEN** the redirect URL should be http://localhost:5173/auth/callback
  - **GIVEN** the application is running on CloudFront dev
  - **WHEN** a user initiates OAuth authentication
  - **THEN** the redirect URL should be https://dev.madewithkiro.com/auth/callback
  - **GIVEN** the application is running on CloudFront prod
  - **WHEN** a user initiates OAuth authentication
  - **THEN** the redirect URL should be https://madewithkiro.com/auth/callback
  - **GIVEN** OAuth providers are configured
  - **WHEN** checking authorized origins
  - **THEN** all domains (localhost, dev, prod) should be included
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]\* 28.2 Write property test for dynamic redirect URL detection

  - **Property 26: Dynamic redirect URL detection**
  - **Validates: Requirements 16.3, 16.4, 16.5**

- [ ] 28.3 Implement dynamic redirect URL detection (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement getCurrentDomain() function
  - **GREEN**: Implement getRedirectUrls() function
  - **GREEN**: Update Amplify config to use dynamic redirect URLs
  - **GREEN**: Handle localhost detection
  - **GREEN**: Handle CloudFront domain detection
  - **REFACTOR**: Extract domain detection logic
  - **REFACTOR**: Add error handling for edge cases
  - **REFACTOR**: Ensure all tests pass
  - _Requirements: 16.3, 16.4, 16.5_

- [ ] 28.4 Update SAM template with multiple callback URLs

  - Add localhost callback URL to CallbackURLs array
  - Add dev CloudFront callback URL to CallbackURLs array
  - Add prod CloudFront callback URL to CallbackURLs array
  - Add corresponding LogoutURLs
  - Document callback URL configuration
  - _Requirements: 16.2_

- [ ] 28.5 Update OAuth provider configurations

  - Add localhost to Google authorized origins
  - Add dev CloudFront to Google authorized origins
  - Add prod CloudFront to Google authorized origins
  - Update Google redirect URIs for all Cognito domains
  - Create separate GitHub OAuth apps for dev and prod (or configure multiple callbacks)
  - Document OAuth provider multi-domain setup
  - _Requirements: 16.1_

- [ ] 28.6 Test authentication on all domains

  - Test Google OAuth on localhost
  - Test GitHub OAuth on localhost
  - Test Google OAuth on CloudFront dev
  - Test GitHub OAuth on CloudFront dev
  - Test Google OAuth on CloudFront prod
  - Test GitHub OAuth on CloudFront prod
  - Verify tokens persist across page refreshes on all domains
  - Verify API calls work from all domains
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 29. Documentation and cleanup

  - [ ] 29.1 Update README with authentication details

    - Document OAuth provider setup process
    - Document environment variables required
    - Document authentication flow
    - Add link to OAuth setup documentation
    - Document multi-domain testing process
    - Add testing checklist for each domain
    - _Requirements: All_

  - [ ] 29.2 Add JSDoc comments to auth services
    - Document all auth functions
    - Document parameters and return types
    - Add usage examples
    - _Requirements: All_
