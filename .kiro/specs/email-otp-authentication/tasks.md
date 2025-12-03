# Implementation Plan

- [x] 1. Set up AWS SES email domain configuration

  - Configure madewithkiro.com domain in AWS SES
  - Add DNS records (SPF, DKIM, DMARC, verification)
  - Request production access for SES
  - Create and verify noreply@madewithkiro.com email identity
  - Create SES email template for OTP codes
  - _Requirements: 6.1, 6.2_

- [x] 2. Update DynamoDB schema for authentication methods

  - Add authMethods field to user profile schema
  - Create or verify GSI1 exists for email lookups (GSI1PK: EMAIL#<email>)
  - Write migration script to backfill existing profiles with authMethods: ['google']
  - _Requirements: 3.1, 5.3_

- [ ]\* 3. Write unit tests for OTP utilities

  - Test OTP code generation (6 digits, randomness)
  - Test expiration time calculation (exactly 600 seconds)
  - Test email validation
  - _Requirements: 1.1, 1.2_

- [ ]\* 3.1 Write property test for OTP generation and delivery

  - **Property 1: OTP Code Generation and Delivery**
  - **Validates: Requirements 1.1, 2.1, 6.1, 6.2**

- [ ]\* 3.2 Write property test for OTP expiration time

  - **Property 2: OTP Expiration Time Consistency**
  - **Validates: Requirements 1.2**

- [x] 4. Implement unified OTP authentication Lambda function
- [x] 4.1 Create shared OTP utilities module

  - Implement 6-digit OTP code generation using crypto.randomInt
  - Implement expiration time calculation (600 seconds)
  - Implement email validation
  - Implement SES email sending with template
  - _Requirements: 1.1, 1.2, 6.1, 6.2_

- [x] 4.2 Implement CreateAuthChallenge handler

  - Generate OTP code using shared utilities
  - Store code and expiration in Cognito session
  - Send email via SES using madewithkiro.com domain
  - Log OTP request events to CloudWatch
  - _Requirements: 1.1, 1.2, 6.1, 6.2_

- [x] 4.3 Implement DefineAuthChallenge handler

  - Determine when OTP challenge is needed
  - Add simple rate limiting using Cognito session timestamps
  - Configure challenge flow parameters
  - _Requirements: 5.1, 7.1_

- [x] 4.4 Implement VerifyAuthChallenge handler

  - Validate OTP code against stored value
  - Check expiration time
  - Query DynamoDB GSI1 for existing accounts by email
  - Link accounts if duplicate found (update Cognito user attributes)
  - Return validation result
  - _Requirements: 1.3, 2.2, 3.1, 3.2, 3.3_

- [x] 4.5 Configure Lambda IAM role and deploy

  - Add permissions for Cognito, SES, DynamoDB, CloudWatch
  - Package Lambda with dependencies
  - Update SAM template with Lambda configuration
  - Deploy using SAM CLI
  - _Requirements: 5.1_

- [ ]\* 5. Write property tests for account linking

  - **Property 6: Duplicate Account Detection**
  - **Validates: Requirements 3.1**

- [ ]\* 5.1 Write property test for account linking preservation

  - **Property 7: Account Linking Preservation**
  - **Validates: Requirements 3.2, 3.3**

- [ ]\* 5.2 Write property test for multi-method authentication

  - **Property 8: Multi-Method Authentication**
  - **Validates: Requirements 3.5**

- [-] 6. Configure Cognito User Pool for custom authentication

  - Enable custom authentication flow in user pool
  - Attach Lambda triggers (DefineAuthChallenge, CreateAuthChallenge, VerifyAuthChallenge)
  - Configure SES email settings with noreply@madewithkiro.com
  - Add custom user attributes (custom:auth_methods)
  - Test custom authentication flow with test user
  - _Requirements: 5.1, 5.2, 5.5_

- [ ]\* 7. Write unit tests for backend API endpoints

  - Test request validation (email format, code format)
  - Test error handling for invalid/expired codes
  - Test response formatting
  - _Requirements: 1.1, 1.3, 4.3_

- [ ]\* 7.1 Write property test for error message specificity

  - **Property 9: Error Message Specificity**
  - **Validates: Requirements 4.3**

- [ ] 8. Implement backend API endpoints for OTP authentication
- [ ] 8.1 Implement POST /auth/otp/request endpoint

  - Implement request validation (email format)
  - Invoke Cognito InitiateAuth with CUSTOM_AUTH flow
  - Return success response with expiration time
  - Add error handling for email delivery failures
  - _Requirements: 1.1_

- [ ] 8.2 Implement POST /auth/otp/verify endpoint

  - Implement request validation (email, 6-digit code)
  - Invoke Cognito RespondToAuthChallenge
  - Return JWT tokens and user data
  - Distinguish between new users and linked accounts
  - Add error handling for invalid/expired codes
  - _Requirements: 1.3, 2.2, 3.2, 3.3, 4.3_

- [ ] 8.3 Update API Gateway configuration

  - Add new OTP endpoints to API Gateway
  - Configure CORS for frontend domain
  - Deploy API changes
  - _Requirements: 5.5_

- [ ]\* 9. Write unit tests for frontend components

  - Test OTPInput component (validation, formatting, paste support)
  - Test email validation logic
  - Test countdown timer functionality
  - Test error message display
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10. Create frontend OTP authentication components
- [ ] 10.1 Create OTPInput component

  - Implement 6-digit input with auto-advance
  - Add paste support for full code
  - Configure mobile numeric keyboard
  - Add error state styling
  - Style with Tailwind CSS (mobile-first)
  - _Requirements: 4.1, 4.2_

- [ ] 10.2 Create OTPAuthPage component

  - Implement email input step
  - Implement OTP verification step
  - Add countdown timer for expiration (10 minutes)
  - Add resend OTP functionality (simple client-side cooldown)
  - Display error messages (invalid, expired)
  - Handle loading states
  - Implement mobile-first responsive design
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3, 4.5_

- [ ] 10.3 Update AuthMethodSelector component

  - Add "Sign in with Email" button
  - Maintain existing "Sign in with Google" button
  - Implement mobile-first layout
  - Add proper touch targets (44x44px minimum)
  - _Requirements: 5.5_

- [ ] 10.4 Update AuthContext for OTP authentication

  - Add requestOTP function
  - Add verifyOTP function
  - Handle OTP authentication state
  - Store authentication method in context
  - Update token management for OTP users
  - _Requirements: 2.2, 5.2_

- [ ]\* 11. Write unit tests for profile management

  - Test profile creation for new OTP users
  - Test authMethods field handling
  - Test Cognito sub as userId
  - Test GSI1 key generation
  - _Requirements: 1.4, 1.5, 2.3, 5.3_

- [ ]\* 11.1 Write property test for new account creation

  - **Property 4: New Account Creation**
  - **Validates: Requirements 1.4, 1.5, 2.3**

- [ ]\* 11.2 Write property test for Cognito identifier consistency

  - **Property 10: Cognito User Identifier Consistency**
  - **Validates: Requirements 5.3**

- [ ] 12. Implement account creation and profile management
- [ ] 12.1 Update profile creation logic

  - Create DynamoDB profile for new OTP users
  - Set authMethods field appropriately
  - Use Cognito sub as userId
  - Add GSI1PK and GSI1SK for email lookups
  - _Requirements: 1.4, 1.5, 5.3_

- [ ] 12.2 Update profile retrieval logic

  - Ensure profile lookup works for both Google and OTP users
  - Use Cognito sub as primary key
  - Handle linked accounts correctly
  - _Requirements: 2.3, 5.3_

- [ ] 13. Implement error handling and user feedback

  - Implement frontend error display for all error types (400, 401, 500)
  - Add retry logic for network errors (max 3 attempts)
  - Show resend option for expired codes
  - Add user-friendly error messages
  - Implement mobile-optimized error alerts
  - _Requirements: 4.2, 4.3_

- [ ] 14. Update SAM template for infrastructure

  - Add Lambda function definition (single function with multiple handlers)
  - Add IAM roles and policies
  - Add Cognito user pool configuration updates
  - Add SES permissions
  - Verify DynamoDB GSI1 configuration
  - Add API Gateway endpoints
  - Add CloudWatch log groups
  - Add environment variables
  - _Requirements: 5.1, 5.5_

- [ ]\* 15. Write integration tests for end-to-end flows

  - Test complete OTP authentication flow (request → verify → tokens)
  - Test account linking flow (Google account → OTP auth → verify linking)
  - Test error scenarios (invalid codes, expired codes)
  - _Requirements: All_

- [ ] 16. Testing and validation checkpoint

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Manual testing and deployment
  - Test with real email addresses
  - Verify email delivery from madewithkiro.com
  - Test on mobile devices (iOS and Android)
  - Test account linking with existing Google accounts
  - Verify backward compatibility with Google OAuth
  - Deploy to development environment
  - Deploy to production environment
  - _Requirements: All_
