# Implementation Plan

- [x] 1. Update PreSignUp Lambda for OTP auto-confirmation
- [x] 1.1 Implement PreSignUp Lambda handler

  - Create `backend/auth/pre_signup.py` with auto-confirmation logic
  - Set `autoConfirmUser=true` for all OTP signups
  - Set `autoVerifyEmail=true` to mark email as verified
  - Add logging for user creation events
  - _Requirements: 3.2, 3.3_

- [ ]\* 1.2 Write property test for auto-confirmation

  - **Property 4: New User Auto-Confirmation**
  - **Validates: Requirements 3.2, 3.3**

- [x] 2. Refactor DefineAuthChallenge Lambda
- [x] 2.1 Update DefineAuthChallenge handler

  - Remove DynamoDB-based rate limiting
  - Implement session-based flow control
  - Return `CUSTOM_CHALLENGE` for first attempt
  - Set `issueTokens=true` when `challengeResult=true`
  - Set `failAuthentication=true` after 5 failed attempts
  - _Requirements: 7.4_

- [ ]\* 2.2 Write property test for max attempts enforcement

  - **Property 9: Maximum Attempts Enforcement**
  - **Validates: Requirements 7.4**

- [x] 3. Refactor CreateAuthChallenge Lambda
- [x] 3.1 Update CreateAuthChallenge handler

  - Remove DynamoDB OTP storage
  - Store OTP in `privateChallengeParameters` only
  - Implement session-based rate limiting (60s cooldown)
  - Generate 6-digit OTP using `secrets.randbelow()`
  - Send OTP via SES using existing template
  - Set expiration to 600 seconds from creation
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]\* 3.2 Write property test for OTP generation security

  - **Property 6: OTP Generation Security**
  - **Validates: Requirements 7.1**

- [ ]\* 3.3 Write property test for OTP expiration

  - **Property 7: OTP Expiration Enforcement**
  - **Validates: Requirements 7.2**

- [ ]\* 3.4 Write property test for rate limiting

  - **Property 8: Rate Limiting Enforcement**
  - **Validates: Requirements 7.3**

- [x] 4. Refactor VerifyAuthChallenge Lambda
- [x] 4.1 Update VerifyAuthChallenge handler

  - Read OTP from `privateChallengeParameters` (not DynamoDB)
  - Use `secrets.compare_digest()` for timing-safe comparison
  - Check expiration before validation
  - Return `answerCorrect=true/false` based on validation
  - _Requirements: 4.4_

- [x] 4.2 Implement account linking in VerifyAuthChallenge

  - Query DynamoDB GSI1 for existing profile by email
  - If existing profile found, update `authMethods` to include 'email'
  - If no profile found, create new profile with Cognito sub as userId
  - Preserve original userId and profile data during linking
  - Log account linking events to CloudWatch
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]\* 4.3 Write property test for OTP storage location

  - **Property 3: OTP Storage Location**
  - **Validates: Requirements 2.3, 9.1**

- [ ]\* 4.4 Write property test for account linking preservation

  - **Property 10: Account Linking Preservation**
  - **Validates: Requirements 5.2, 5.3**

- [ ]\* 4.5 Write property test for profile creation

  - **Property 5: Profile Creation with Cognito Sub**
  - **Validates: Requirements 3.4, 3.5**

- [ ]\* 4.6 Write property test for OTP code not logged

  - **Property 12: OTP Code Not Logged**
  - **Validates: Requirements 7.5**

- [ ] 5. Checkpoint - Backend Lambda tests

  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update SAM template for Lambda triggers
- [x] 6.1 Configure Cognito Lambda triggers in SAM template

  - Add PreSignUp trigger configuration
  - Update DefineAuthChallenge trigger
  - Update CreateAuthChallenge trigger
  - Update VerifyAuthChallengeResponse trigger
  - Add Lambda invoke permissions for Cognito
  - _Requirements: 2.1, 2.2_

- [x] 6.2 Update Lambda IAM roles

  - Remove AUTH_JWT_SECRET from environment variables
  - Ensure SES permissions for CreateAuthChallenge
  - Ensure DynamoDB permissions for VerifyAuthChallenge
  - _Requirements: 9.4_

- [x] 7. Refactor frontend AuthContext for Amplify
- [x] 7.1 Update AuthContext to use Amplify Auth APIs

  - Replace custom token management with Amplify
  - Implement `signInWithOTP` using `signIn` with `CUSTOM_WITHOUT_SRP`
  - Implement `confirmOTP` using `confirmSignIn`
  - Use `getCurrentUser` for auth state
  - Use `fetchAuthSession` for token refresh
  - Use `signOut` for logout
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]\* 7.2 Write property test for token format consistency

  - **Property 2: Token Format Consistency**
  - **Validates: Requirements 1.4**

- [ ]\* 7.3 Write property test for linked account profile consistency

  - **Property 11: Linked Account Profile Consistency**
  - **Validates: Requirements 5.4**

- [x] 8. Refactor OTPAuthPage component
- [x] 8.1 Update OTPAuthPage to use Amplify signIn

  - Replace direct API call with `signIn({ username: email, options: { authFlowType: 'CUSTOM_WITHOUT_SRP' } })`
  - Handle challenge response from Cognito
  - Extract `publicChallengeParameters` for UI display
  - Handle rate limit errors from challenge parameters
  - _Requirements: 4.1, 6.1, 6.3_

- [x] 8.2 Update OTPAuthPage to use Amplify confirmSignIn

  - Replace direct API call with `confirmSignIn({ challengeResponse: code })`
  - Handle success (tokens received) and redirect appropriately
  - Handle failure (incorrect/expired code) with proper error messages
  - Distinguish between incorrect and expired codes for user feedback
  - _Requirements: 4.4, 6.2, 6.4_

- [x] 8.3 Update error handling for Cognito errors

  - Map Cognito error types to user-friendly messages
  - Handle `NotAuthorizedException` for max attempts
  - Handle network errors with retry option
  - _Requirements: 6.5_

- [ ]\* 8.4 Write property test for Cognito token issuance

  - **Property 1: Cognito Token Issuance**
  - **Validates: Requirements 1.1, 1.2, 2.4**

- [x] 9. Checkpoint - Frontend integration tests

  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Remove deprecated OTP handler code
- [x] 10.1 Remove handler.py OTP endpoints

  - Remove or archive `backend/auth/handler.py`
  - Remove `/auth/otp/request` endpoint from API Gateway
  - Remove `/auth/otp/verify` endpoint from API Gateway
  - Remove `/auth/otp/refresh` endpoint from API Gateway
  - _Requirements: 9.3_

- [x] 10.2 Clean up environment variables

  - Remove `AUTH_JWT_SECRET` from SAM template
  - Remove `AUTH_JWT_SECRET` from environment configuration
  - Update any documentation referencing removed variables
  - _Requirements: 9.4_

- [x] 10.3 Remove DynamoDB ACCOUNT# record creation

  - Verify no code creates `ACCOUNT#` records for OTP
  - Remove any migration scripts that reference ACCOUNT# OTP records
  - _Requirements: 9.1_

- [x] 11. Update Amplify configuration
- [x] 11.1 Configure Amplify for custom auth flow

  - Ensure Amplify config supports `CUSTOM_WITHOUT_SRP` auth flow
  - Verify Cognito User Pool client allows custom auth
  - Test Amplify token storage and refresh
  - _Requirements: 1.3, 1.5_

- [ ]\* 12. Write integration tests for end-to-end flows

  - Test complete OTP flow: email → OTP sent → verify → tokens
  - Test account linking: existing Google user → OTP auth → profile linked
  - Test rate limiting: rapid requests → rate limit enforced
  - Test expiration: wait 10+ minutes → code rejected
  - Test max attempts: 5 failures → authentication fails
  - _Requirements: All_

- [ ] 13. Final checkpoint - All tests passing

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Manual testing and deployment
  - Test with real email addresses
  - Verify email delivery from madewithkiro.com
  - Test on mobile devices (iOS and Android)
  - Test account linking with existing Google accounts
  - Verify token consistency between OTP and Google OAuth
  - Verify backward compatibility with existing Google OAuth users
  - Deploy to development environment
  - Deploy to production environment
  - _Requirements: All_
