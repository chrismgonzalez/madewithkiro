# Implementation Plan

- [ ] 1. Set up AWS SES email domain configuration

  - Configure madewithkiro.com domain in AWS SES
  - Add DNS records (SPF, DKIM, DMARC, verification)
  - Request production access for SES
  - Create and verify noreply@madewithkiro.com email identity
  - Create SES email template for OTP codes
  - _Requirements: 6.1, 6.2_

- [ ] 2. Update DynamoDB schema for authentication methods

  - Add authMethods field to user profile schema
  - Create or verify GSI1 exists for email lookups (GSI1PK: EMAIL#<email>)
  - Write migration script to backfill existing profiles with authMethods: ['google']
  - Test GSI1 queries for duplicate email detection
  - _Requirements: 3.1, 5.3_

- [ ] 3. Write unit tests for OTP code generation and validation

  - Test OTP code generation (6 digits, randomness)
  - Test expiration time calculation (exactly 600 seconds)
  - Test code hashing logic
  - Test email validation
  - _Requirements: 1.1, 1.2, 6.5_

- [ ]\* 3.1 Write property test for OTP generation and delivery

  - **Property 1: OTP Code Generation and Delivery**
  - **Validates: Requirements 1.1, 2.1, 6.1, 6.2**

- [ ]\* 3.2 Write property test for OTP expiration time

  - **Property 2: OTP Expiration Time Consistency**
  - **Validates: Requirements 1.2**

- [ ]\* 3.3 Write property test for secure code storage

  - **Property 13: Secure Code Storage**
  - **Validates: Requirements 6.5**

- [ ] 4. Implement Cognito custom authentication Lambda triggers
- [ ] 4.1 Implement CreateAuthChallenge Lambda function

  - Implement 6-digit OTP code generation using crypto.randomInt
  - Set 10-minute expiration time (600 seconds)
  - Hash OTP code before storing in Cognito session
  - Send email via SES using madewithkiro.com domain
  - Log OTP request events to CloudWatch
  - Run unit tests to verify implementation
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.5_

- [ ] 5. Write unit tests for rate limiting logic

  - Test rate limit calculation (60-second minimum)
  - Test rate limit enforcement
  - Test rate limit reset after timeout
  - _Requirements: 7.1, 7.2, 7.4_

- [ ]\* 5.1 Write property test for rate limiting enforcement

  - **Property 11: Rate Limiting Enforcement**
  - **Validates: Requirements 7.1, 7.2**

- [ ]\* 5.2 Write property test for rate limit reset

  - **Property 12: Rate Limit Reset**
  - **Validates: Requirements 7.4**

- [ ] 6. Implement DefineAuthChallenge Lambda function

  - Implement logic to determine when OTP challenge is needed
  - Add rate limiting check (60-second minimum between requests)
  - Configure Lambda IAM role with Cognito and CloudWatch permissions
  - Run unit tests to verify implementation
  - _Requirements: 5.1, 7.1_

- [ ] 7. Write unit tests for OTP verification and account linking

  - Test OTP code validation logic
  - Test code expiration checking
  - Test account linking logic when duplicate found
  - Test validation result handling
  - _Requirements: 1.3, 2.2, 3.1, 3.2, 3.3_

- [ ]\* 7.1 Write property test for valid OTP authentication

  - **Property 3: Valid OTP Authentication Success**
  - **Validates: Requirements 1.3, 2.2, 5.2**

- [ ]\* 7.2 Write property test for invalid OTP rejection

  - **Property 5: Invalid OTP Rejection**
  - **Validates: Requirements 2.4**

- [ ]\* 7.3 Write property test for duplicate account detection

  - **Property 6: Duplicate Account Detection**
  - **Validates: Requirements 3.1**

- [ ]\* 7.4 Write property test for account linking preservation

  - **Property 7: Account Linking Preservation**
  - **Validates: Requirements 3.2, 3.3**

- [ ] 8. Implement VerifyAuthChallenge Lambda function

  - Implement OTP code validation logic
  - Check code expiration time
  - Query DynamoDB GSI1 for existing accounts by email
  - Implement account linking logic when duplicate found
  - Return validation result to Cognito
  - Run unit tests to verify implementation
  - _Requirements: 1.3, 2.2, 3.1, 3.2, 3.3_

- [ ] 9. Implement PreAuthentication Lambda function

  - Implement duplicate account detection across identity providers
  - Log authentication attempts to CloudWatch
  - Prepare account linking metadata
  - Run unit tests to verify implementation
  - _Requirements: 3.1_

- [ ] 10. Deploy Lambda functions to AWS

  - Package Lambda functions with dependencies
  - Update SAM template with Lambda configurations
  - Configure environment variables (SES region, email identity)
  - Deploy using SAM CLI
  - _Requirements: 5.1_

- [ ] 11. Configure Cognito User Pool for custom authentication

  - Enable custom authentication flow in user pool
  - Attach Lambda triggers (DefineAuthChallenge, CreateAuthChallenge, VerifyAuthChallenge, PreAuthentication)
  - Configure SES email settings with noreply@madewithkiro.com
  - Add custom user attributes (custom:auth_methods, custom:primary_method, custom:linked_at)
  - Test custom authentication flow with test user
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 12. Write unit tests for backend API endpoints

  - Test request validation (email format, code format)
  - Test error handling for rate limiting
  - Test error handling for invalid/expired codes
  - Test response formatting
  - _Requirements: 1.1, 1.3, 4.3, 7.1, 7.2_

- [ ]\* 12.1 Write property test for error message specificity

  - **Property 9: Error Message Specificity**
  - **Validates: Requirements 4.3**

- [ ] 13. Implement backend API endpoints for OTP authentication
- [ ] 13.1 Implement POST /auth/otp/request endpoint

  - Implement request validation (email format)
  - Invoke Cognito InitiateAuth with CUSTOM_AUTH flow
  - Handle rate limiting errors
  - Return success response with expiration time
  - Add error handling for email delivery failures
  - Run unit tests to verify implementation
  - _Requirements: 1.1, 7.1, 7.2_

- [ ] 13.2 Implement POST /auth/otp/verify endpoint

  - Implement request validation (email, 6-digit code)
  - Invoke Cognito RespondToAuthChallenge
  - Handle account linking logic
  - Return JWT tokens and user data
  - Distinguish between new users and linked accounts
  - Add error handling for invalid/expired codes
  - Run unit tests to verify implementation
  - _Requirements: 1.3, 2.2, 3.2, 3.3, 4.3_

- [ ] 13.3 Update API Gateway configuration

  - Add new OTP endpoints to API Gateway
  - Configure CORS for frontend domain
  - Set up request/response validation
  - Deploy API changes
  - _Requirements: 5.5_

- [ ] 14. Write unit tests for frontend components

  - Test OTPInput component (validation, formatting, paste support)
  - Test email validation logic
  - Test countdown timer functionality
  - Test error message display
  - Test form state management
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 15. Create frontend OTP authentication components
- [ ] 15.1 Create OTPInput component

  - Implement 6-digit input with auto-advance
  - Add paste support for full code
  - Configure mobile numeric keyboard
  - Add error state styling
  - Style with Tailwind CSS (mobile-first)
  - Run unit tests to verify implementation
  - _Requirements: 4.1, 4.2_

- [ ] 15.2 Create OTPAuthPage component

  - Implement email input step
  - Implement OTP verification step
  - Add countdown timer for expiration (10 minutes)
  - Add resend OTP functionality with 60-second cooldown
  - Display error messages (invalid, expired, rate limited)
  - Handle loading states
  - Implement mobile-first responsive design
  - Run unit tests to verify implementation
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3, 4.5, 7.2_

- [ ] 15.3 Update AuthMethodSelector component

  - Add "Sign in with Email" button
  - Maintain existing "Sign in with Google" button
  - Implement mobile-first layout
  - Add proper touch targets (44x44px minimum)
  - _Requirements: 5.5_

- [ ] 15.4 Update AuthContext for OTP authentication

  - Add requestOTP function
  - Add verifyOTP function
  - Handle OTP authentication state
  - Store authentication method in context
  - Update token management for OTP users
  - _Requirements: 2.2, 5.2_

- [ ] 16. Write unit tests for profile management

  - Test profile creation for new OTP users
  - Test authMethods field handling
  - Test Cognito sub as userId
  - Test GSI1 key generation
  - Test profile retrieval for both Google and OTP users
  - _Requirements: 1.4, 1.5, 2.3, 5.3_

- [ ]\* 16.1 Write property test for new account creation

  - **Property 4: New Account Creation**
  - **Validates: Requirements 1.4, 1.5, 2.3**

- [ ]\* 16.2 Write property test for Cognito identifier consistency

  - **Property 10: Cognito User Identifier Consistency**
  - **Validates: Requirements 5.3**

- [ ]\* 16.3 Write property test for multi-method authentication

  - **Property 8: Multi-Method Authentication**
  - **Validates: Requirements 3.5**

- [ ] 17. Implement account creation and profile management
- [ ] 17.1 Update profile creation logic

  - Create DynamoDB profile for new OTP users
  - Set authMethods field appropriately
  - Use Cognito sub as userId
  - Add GSI1PK and GSI1SK for email lookups
  - Run unit tests to verify implementation
  - _Requirements: 1.4, 1.5, 5.3_

- [ ] 17.2 Update profile retrieval logic

  - Ensure profile lookup works for both Google and OTP users
  - Use Cognito sub as primary key
  - Handle linked accounts correctly
  - Run unit tests to verify implementation
  - _Requirements: 2.3, 5.3_

- [ ] 18. Implement error handling and user feedback

  - Implement frontend error display for all error types (400, 401, 429, 500)
  - Add retry logic for network errors (max 3 attempts)
  - Display rate limit countdown timer
  - Show resend option for expired codes
  - Add user-friendly error messages
  - Implement mobile-optimized error alerts
  - _Requirements: 4.2, 4.3, 7.2_

- [ ] 19. Implement logging and monitoring

  - Add CloudWatch logging for all Lambda functions
  - Log OTP request events (with hashed emails)
  - Log authentication success/failure events
  - Log account linking events
  - Log rate limit violations
  - Create CloudWatch dashboard for OTP metrics
  - Set up alarms for high error rates
  - _Requirements: 5.4, 6.3, 6.4, 7.5_

- [ ] 20. Update SAM template for infrastructure

  - Add Lambda function definitions
  - Add IAM roles and policies
  - Add Cognito user pool configuration
  - Add SES permissions
  - Add DynamoDB GSI1 if needed
  - Add API Gateway endpoints
  - Add CloudWatch log groups
  - Add environment variables
  - _Requirements: 5.1, 5.5_

- [ ] 21. Write acceptance tests for authentication flows

  - Test user can sign up with email OTP
  - Test user can sign in with email OTP
  - Test duplicate account detection and linking
  - Test rate limiting prevents rapid requests
  - Test expired codes are rejected
  - Test invalid codes show appropriate errors
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 3.2, 7.1_

- [ ] 22. Write integration tests for end-to-end flows

  - Test complete OTP authentication flow (request → verify → tokens)
  - Test account linking flow (Google account → OTP auth → verify linking)
  - Test rate limiting flow (rapid requests → blocking → reset)
  - Test error scenarios (invalid codes, expired codes, email failures)
  - _Requirements: All_

- [ ] 23. Testing and validation checkpoint

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Manual testing and QA

  - Test with real email addresses
  - Verify email delivery from madewithkiro.com
  - Test on mobile devices (iOS and Android)
  - Test account linking with existing Google accounts
  - Verify backward compatibility with Google OAuth
  - Test rate limiting behavior
  - Verify error messages are clear
  - Test countdown timers
  - _Requirements: All_

- [ ] 25. Documentation and deployment
  - Update README with OTP authentication instructions
  - Document SES configuration steps
  - Document DNS record requirements
  - Create deployment runbook
  - Update environment variable documentation
  - Deploy to development environment
  - Deploy to production environment
  - _Requirements: All_
