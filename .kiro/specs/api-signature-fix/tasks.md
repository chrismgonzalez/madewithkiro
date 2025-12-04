# Implementation Plan

- [x] 1. Fix authService to return access token instead of ID token
- [x] 1.1 Update getAccessToken() method

  - Change `session.tokens?.idToken` to `session.tokens?.accessToken` on line 65
  - Update comment to reflect correct token type
  - Remove deprecated localStorage OTP token handling (lines 44-59)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 1.2 Update refreshSession() method

  - Remove deprecated OTP refresh logic (lines 177-197)
  - Keep only Amplify fetchAuthSession with forceRefresh
  - _Requirements: 2.4, 5.5_

- [x] 1.3 Update isAuthenticated() method

  - Remove localStorage OTP token checks (lines 127-141)
  - Keep only Cognito session check via getCurrentUser()
  - _Requirements: 2.1, 2.2_

- [ ]\* 2. Update unit tests for authService

  - Update test expectations to verify access token (not ID token)
  - Remove tests for localStorage token handling
  - Remove tests for OTP refresh endpoint
  - Add test to verify token type is "access"
  - _Requirements: 1.1, 1.3, 2.1, 2.2_

- [ ] 3. Manual testing and verification

  - Sign in with OTP
  - Open browser DevTools Network tab
  - Make profile update request
  - Verify Authorization header contains Bearer token
  - Decode JWT and verify token_use claim is "access"
  - Verify response is 200 (not 403)
  - Repeat with Google OAuth sign-in
  - Verify both flows work identically
  - _Requirements: All_

- [ ] 4. Final checkpoint - Verify fix works end-to-end
  - Ensure all tests pass, ask the user if questions arise.
