# Requirements Document

## Introduction

This document outlines the requirements for refactoring the email-based OTP authentication system in MadeWithKiro to follow AWS's recommended passwordless authentication pattern. The current implementation uses a hybrid approach with self-signed JWT tokens and DynamoDB-based OTP storage. This refactor will align with the AWS Cognito custom authentication flow as described in the AWS blog "Implementing passwordless email authentication with Amazon Cognito", ensuring proper token management, simplified architecture, and better security.

## Glossary

- **OTP (One-Time Password)**: A temporary, single-use 6-digit code sent to a user's email address for authentication
- **Cognito User Pool**: AWS service managing user authentication, authorization, and token issuance
- **Custom Authentication Flow (CUSTOM_AUTH)**: Cognito's mechanism for implementing custom authentication challenges using Lambda triggers
- **DefineAuthChallenge**: Lambda trigger that determines the authentication flow and what challenge to present
- **CreateAuthChallenge**: Lambda trigger that generates the OTP code and sends it via email
- **VerifyAuthChallenge**: Lambda trigger that validates the user's OTP response
- **PreSignUp**: Lambda trigger that runs before user registration to auto-confirm users
- **privateChallengeParameters**: Cognito session storage for sensitive challenge data (not visible to client)
- **publicChallengeParameters**: Cognito session storage for non-sensitive data (visible to client)
- **SRP_A**: Secure Remote Password protocol parameter used to initiate authentication
- **Amplify**: AWS frontend library for authentication and API integration

## Requirements

### Requirement 1

**User Story:** As a developer, I want the OTP authentication to use Cognito's native token issuance, so that token management is consistent with Google OAuth and follows AWS best practices.

#### Acceptance Criteria

1. WHEN a user successfully verifies their OTP code THEN the system SHALL return Cognito-issued JWT tokens (idToken, accessToken, refreshToken)
2. WHEN tokens are issued THEN the system SHALL use Cognito's standard token format and signing
3. WHEN the frontend receives tokens THEN the system SHALL store them using Amplify's standard token storage
4. WHEN a user authenticates via OTP THEN the system SHALL use the same token validation as Google OAuth users
5. WHEN tokens expire THEN the system SHALL support standard Cognito token refresh using the refreshToken

### Requirement 2

**User Story:** As a developer, I want to simplify the authentication architecture, so that there is a single clear authentication path using Cognito Lambda triggers.

#### Acceptance Criteria

1. WHEN OTP authentication is initiated THEN the system SHALL use Cognito's InitiateAuth API with CUSTOM_AUTH flow
2. WHEN OTP verification is performed THEN the system SHALL use Cognito's RespondToAuthChallenge API
3. WHEN OTP codes are stored THEN the system SHALL use Cognito's privateChallengeParameters (not DynamoDB)
4. WHEN the authentication flow completes THEN the system SHALL NOT use self-signed JWT tokens
5. WHEN Lambda triggers execute THEN the system SHALL handle the complete authentication flow without separate API endpoints for OTP storage

### Requirement 3

**User Story:** As a new user, I want to sign up and authenticate with just my email, so that I can access the platform without creating a password.

#### Acceptance Criteria

1. WHEN a user enters their email for the first time THEN the system SHALL auto-create a Cognito user account
2. WHEN a new user is created THEN the PreSignUp Lambda trigger SHALL auto-confirm the user
3. WHEN a new user is created THEN the system SHALL mark the email as verified
4. WHEN authentication succeeds for a new user THEN the system SHALL create a DynamoDB profile with the Cognito sub as userId
5. WHEN a user profile is created THEN the system SHALL set authMethods to ['email']

### Requirement 4

**User Story:** As a returning user, I want to sign in with my email using OTP, so that I can access my account without remembering a password.

#### Acceptance Criteria

1. WHEN a user enters their email THEN the system SHALL initiate CUSTOM_AUTH flow with Cognito
2. WHEN DefineAuthChallenge executes THEN the system SHALL request a CUSTOM_CHALLENGE
3. WHEN CreateAuthChallenge executes THEN the system SHALL generate a 6-digit OTP and send it via SES
4. WHEN the user submits the OTP code THEN the system SHALL validate it in VerifyAuthChallenge
5. WHEN OTP validation succeeds THEN Cognito SHALL issue tokens and complete authentication

### Requirement 5

**User Story:** As a user with an existing Google account, I want my email OTP authentication to link to my existing account, so that I maintain a single identity.

#### Acceptance Criteria

1. WHEN OTP authentication succeeds THEN the system SHALL check DynamoDB GSI1 for existing profiles with that email
2. WHEN an existing Google-authenticated profile is found THEN the system SHALL update authMethods to include 'email'
3. WHEN account linking occurs THEN the system SHALL preserve the original userId and profile data
4. WHEN a linked user signs in via OTP THEN the system SHALL return the same profile as Google OAuth
5. WHEN authMethods is updated THEN the system SHALL log the linking event to CloudWatch

### Requirement 6

**User Story:** As a user, I want clear feedback during OTP authentication, so that I understand the authentication status.

#### Acceptance Criteria

1. WHEN an OTP is sent THEN the frontend SHALL display a confirmation with the masked email address
2. WHEN OTP verification fails THEN the frontend SHALL display whether the code was incorrect or expired
3. WHEN rate limiting is triggered THEN the frontend SHALL display the remaining wait time
4. WHEN authentication succeeds THEN the frontend SHALL redirect to the appropriate page (gallery or create-profile)
5. WHEN a network error occurs THEN the frontend SHALL display a retry option

### Requirement 7

**User Story:** As a developer, I want the OTP system to have proper security controls, so that the authentication is protected from abuse.

#### Acceptance Criteria

1. WHEN an OTP is generated THEN the system SHALL use cryptographically secure random number generation
2. WHEN an OTP is stored THEN the system SHALL set a 10-minute expiration time
3. WHEN a user requests multiple OTPs THEN the system SHALL enforce a 60-second cooldown between requests
4. WHEN a user fails OTP verification 5 times THEN the system SHALL fail the authentication session
5. WHEN OTP codes are logged THEN the system SHALL NOT log the actual code value

### Requirement 8

**User Story:** As a developer, I want the frontend to use Amplify's authentication APIs, so that token management is handled consistently.

#### Acceptance Criteria

1. WHEN initiating OTP authentication THEN the frontend SHALL use Amplify's signIn with CUSTOM_AUTH
2. WHEN submitting OTP code THEN the frontend SHALL use Amplify's confirmSignIn
3. WHEN checking authentication state THEN the frontend SHALL use Amplify's getCurrentUser
4. WHEN refreshing tokens THEN the frontend SHALL use Amplify's fetchAuthSession
5. WHEN signing out THEN the frontend SHALL use Amplify's signOut

### Requirement 9

**User Story:** As a developer, I want to remove the deprecated DynamoDB-based OTP storage, so that the codebase is simplified.

#### Acceptance Criteria

1. WHEN the refactor is complete THEN the system SHALL NOT store OTP codes in DynamoDB ACCOUNT# records
2. WHEN the refactor is complete THEN the system SHALL NOT use self-signed JWT tokens for OTP users
3. WHEN the refactor is complete THEN the backend/auth/handler.py SHALL be removed or repurposed
4. WHEN the refactor is complete THEN the AUTH_JWT_SECRET environment variable SHALL NOT be required for OTP auth
5. WHEN the refactor is complete THEN all OTP authentication SHALL flow through Cognito Lambda triggers
