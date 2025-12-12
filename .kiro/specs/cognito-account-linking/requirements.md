# Requirements Document: Cognito-Level Account Linking

## Introduction

This specification defines the implementation of true Cognito-level account linking for MadeWithKiro, enabling users to sign in with multiple authentication methods (Google OAuth and Email OTP) while maintaining a single Cognito user identity. This replaces the current application-level linking approach with AWS Cognito's native `AdminLinkProviderForUser` functionality.

## Glossary

- **Cognito User Pool**: AWS service that manages user authentication and authorization
- **Federated Identity**: User identity from an external identity provider (e.g., Google)
- **Native User**: User created directly in Cognito (e.g., via custom auth/OTP)
- **Account Linking**: Process of connecting multiple authentication methods to a single user profile
- **AdminLinkProviderForUser**: AWS Cognito API operation that links federated identities to native users
- **PreSignUp Trigger**: Lambda function invoked before user creation in Cognito
- **PostAuthentication Trigger**: Lambda function invoked after successful authentication
- **CreateAuthChallenge Trigger**: Lambda function that generates OTP codes for custom authentication
- **Custom Auth Flow**: Cognito authentication flow using Lambda triggers (CUSTOM_WITHOUT_SRP)
- **Identity Claim**: User attribute from an identity provider (e.g., email, sub)
- **DynamoDB Profile**: Application-level user profile stored in DynamoDB
- **GSI1**: Global Secondary Index in DynamoDB for email-based lookups

## Requirements

### Requirement 1: Duplicate Account Detection

**User Story:** As a user who has signed in with Email OTP, I want to be notified when I try to sign in with Google using the same email address, so that I can choose whether to link my accounts.

#### Acceptance Criteria

1. WHEN a user signs in with Google AND a native Cognito user with the same email already exists THEN the system SHALL detect the duplicate account
2. WHEN a duplicate is detected THEN the system SHALL create a temporary Google user and store a flag indicating a potential link
3. WHEN the user completes Google authentication THEN the system SHALL redirect them to an account linking prompt page
4. WHEN the linking prompt is displayed THEN the system SHALL show which authentication methods already exist for that email
5. WHEN the user declines linking THEN the system SHALL allow them to proceed with the new separate Google account

### Requirement 2: User-Initiated Account Linking

**User Story:** As a user with duplicate accounts, I want to explicitly link my Google and Email OTP accounts, so that I can sign in with either method and access the same profile.

#### Acceptance Criteria

1. WHEN a user is shown the account linking prompt THEN the system SHALL display a clear explanation of what linking means
2. WHEN the user confirms they want to link accounts THEN the system SHALL call AdminLinkProviderForUser to link the identities
3. WHEN account linking succeeds THEN the system SHALL merge the accounts into a single Cognito user
4. WHEN the linked user signs in with either method THEN the system SHALL authenticate them as the same Cognito user (same sub)
5. WHEN account linking fails THEN the system SHALL display an error message and allow the user to proceed with separate accounts

### Requirement 3: PostAuthentication Duplicate Detection

**User Story:** As a user who just signed in, I want the system to check if I have duplicate accounts, so that I can be prompted to link them.

#### Acceptance Criteria

1. WHEN the PostAuthentication trigger runs THEN the system SHALL query DynamoDB GSI1 for profiles with the same email
2. WHEN multiple profiles are found with the same email THEN the system SHALL check if they belong to different Cognito users
3. WHEN duplicate Cognito users are detected THEN the system SHALL set a session flag indicating linking is available
4. WHEN the frontend receives the session flag THEN the system SHALL redirect to the account linking prompt
5. WHEN no duplicates are found THEN the system SHALL proceed with normal authentication flow

### Requirement 5: Single Profile Management

**User Story:** As a user with linked accounts, I want my profile data to be consistent across all authentication methods, so that I have a seamless experience regardless of how I sign in.

#### Acceptance Criteria

1. WHEN a user with linked accounts signs in THEN the system SHALL use a single DynamoDB profile keyed by the Cognito sub
2. WHEN a user's profile is updated THEN the system SHALL reflect changes regardless of which authentication method they used
3. WHEN the PostAuthentication trigger runs THEN the system SHALL create or update only one profile per Cognito user
4. WHEN a user has linked accounts THEN the system SHALL store all authentication methods in the authMethods array
5. WHEN querying by email THEN the system SHALL return the single profile associated with the linked Cognito user

### Requirement 7: Account Linking API Endpoint

**User Story:** As a user, I want to link my accounts through a secure API endpoint, so that I can confirm the linking action after authentication.

#### Acceptance Criteria

1. WHEN the user confirms account linking THEN the system SHALL call a POST /auth/link-accounts endpoint
2. WHEN the endpoint is called THEN the system SHALL verify the user is authenticated with a valid JWT token
3. WHEN linking Google to OTP THEN the system SHALL call AdminLinkProviderForUser with the Google identity as source
4. WHEN linking OTP to Google THEN the system SHALL set a password on the Google user using AdminSetUserPassword
5. WHEN linking succeeds THEN the system SHALL return success and update the user's profile authMethods

### Requirement 8: Identity Claim Validation

**User Story:** As a developer, I want to validate that linked accounts have consistent identity claims, so that I can trust the authentication data.

#### Acceptance Criteria

1. WHEN a user signs in with a linked account THEN the system SHALL verify the email claim matches across all identities
2. WHEN identity claims are inconsistent THEN the system SHALL log a warning and use the primary identity's claims
3. WHEN a user's ID token is issued THEN the system SHALL include all linked identities in the identities attribute
4. WHEN parsing user attributes THEN the system SHALL correctly identify the provider from the identities claim
5. WHEN a user has no linked identities THEN the system SHALL identify them as a native OTP user

### Requirement 9: Error Handling and Logging

**User Story:** As a system administrator, I want comprehensive error logging for account linking operations, so that I can troubleshoot issues and monitor system health.

#### Acceptance Criteria

1. WHEN account linking is attempted THEN the system SHALL log the operation with masked email addresses
2. WHEN AdminLinkProviderForUser fails THEN the system SHALL log the error with context (email, provider, error code)
3. WHEN a duplicate user would be created THEN the system SHALL log a warning before preventing creation
4. WHEN account linking succeeds THEN the system SHALL log success with the linked identity details
5. WHEN an unexpected error occurs THEN the system SHALL log the full error and allow graceful degradation

### Requirement 10: Account Linking UI Flow

**User Story:** As a user, I want a clear and intuitive UI for linking my accounts, so that I understand what's happening and can make an informed decision.

#### Acceptance Criteria

1. WHEN a duplicate account is detected THEN the system SHALL redirect to a /link-accounts page
2. WHEN the linking page loads THEN the system SHALL display both authentication methods and their associated email
3. WHEN the user views the prompt THEN the system SHALL explain that linking will merge the accounts into one
4. WHEN the user confirms linking THEN the system SHALL show a loading state while the operation completes
5. WHEN linking completes THEN the system SHALL redirect to the user's profile or intended destination

### Requirement 11: Security and Trust

**User Story:** As a security-conscious user, I want account linking to only occur with verified email addresses, so that my account cannot be hijacked.

#### Acceptance Criteria

1. WHEN linking accounts THEN the system SHALL only link users with verified email addresses
2. WHEN a Google user signs in THEN the system SHALL verify the email_verified claim is true
3. WHEN an OTP user signs in THEN the system SHALL verify the email by successful OTP validation
4. WHEN email verification fails THEN the system SHALL prevent account linking and log a security warning
5. WHEN linking accounts THEN the system SHALL only trust identity providers configured in the user pool

### Requirement 12: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for account linking scenarios, so that I can ensure the feature works correctly.

#### Acceptance Criteria

1. WHEN running tests THEN the system SHALL validate Google-to-OTP linking works correctly
2. WHEN running tests THEN the system SHALL validate OTP-to-Google linking works correctly
3. WHEN running tests THEN the system SHALL validate single profile creation for linked accounts
4. WHEN running tests THEN the system SHALL validate error handling for linking failures
5. WHEN running tests THEN the system SHALL validate backward compatibility with existing accounts
