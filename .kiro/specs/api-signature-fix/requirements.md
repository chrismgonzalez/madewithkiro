# Requirements Document

## Introduction

This document outlines the requirements for fixing the 403 IncompleteSignatureException error that occurs when making authenticated API requests to the profile endpoint after OTP sign-in. Investigation reveals that the Authorization header IS being sent with a Bearer token, but API Gateway is rejecting it with an incomplete signature error. This indicates the token format or type may be incorrect, or there's a mismatch between what's being sent and what the Cognito Authorizer expects. This fix ensures that the correct token type (access token vs ID token) is being sent and that the API Gateway Cognito Authorizer is properly configured to validate it.

## Glossary

- **IncompleteSignatureException**: AWS error indicating that the request signature is missing required components or is malformed
- **API Gateway**: AWS service that provides RESTful API endpoints for the application
- **Cognito Authorizer**: API Gateway component that validates JWT tokens from Cognito
- **JWT Token**: JSON Web Token issued by Cognito for authenticated users
- **Authorization Header**: HTTP header containing the Bearer token for authentication
- **API Client**: Frontend service module responsible for making HTTP requests to the backend
- **Access Token**: Cognito JWT token used for API authorization
- **ID Token**: Cognito JWT token containing user identity information

## Requirements

### Requirement 1

**User Story:** As a user who has signed in with OTP, I want my API requests to be properly authenticated, so that I can access protected endpoints without errors.

#### Acceptance Criteria

1. WHEN a user completes OTP authentication THEN the system SHALL store valid Cognito JWT tokens
2. WHEN an authenticated API request is made THEN the system SHALL include the Authorization header with Bearer token
3. WHEN the Authorization header is set THEN the system SHALL use the Cognito access token (not ID token)
4. WHEN API Gateway receives the request THEN the system SHALL validate the token using the Cognito authorizer
5. WHEN token validation succeeds THEN the system SHALL allow the request to proceed to the Lambda function

### Requirement 2

**User Story:** As a developer, I want consistent authentication across all API requests, so that both OTP and Google OAuth users have the same experience.

#### Acceptance Criteria

1. WHEN any user authenticates (OTP or Google) THEN the system SHALL use the same token storage mechanism
2. WHEN making API requests THEN the system SHALL use the same authorization header format for all users
3. WHEN tokens are retrieved THEN the system SHALL use Amplify's fetchAuthSession consistently
4. WHEN tokens expire THEN the system SHALL automatically refresh them before making requests
5. WHEN token refresh fails THEN the system SHALL redirect the user to sign in again

### Requirement 3

**User Story:** As a developer, I want clear error messages for authentication failures, so that I can quickly diagnose and fix issues.

#### Acceptance Criteria

1. WHEN an API request fails with 403 THEN the system SHALL log the error details to the console
2. WHEN authentication fails THEN the system SHALL log the token state (present/missing/expired)
3. WHEN the Authorization header is missing THEN the system SHALL log a warning before making the request
4. WHEN API Gateway returns authentication errors THEN the system SHALL map them to user-friendly messages
5. WHEN debugging is enabled THEN the system SHALL log request headers (excluding sensitive token values)

### Requirement 4

**User Story:** As a developer, I want the API client to handle authentication automatically, so that components don't need to manage tokens manually.

#### Acceptance Criteria

1. WHEN the API client is initialized THEN the system SHALL configure automatic token injection
2. WHEN making an authenticated request THEN the system SHALL fetch the current session from Amplify
3. WHEN the session is valid THEN the system SHALL extract the access token
4. WHEN the access token is available THEN the system SHALL add it to the Authorization header
5. WHEN the session is invalid THEN the system SHALL throw an authentication error

### Requirement 5

**User Story:** As a user, I want seamless API access after authentication, so that I can use the application without interruption.

#### Acceptance Criteria

1. WHEN a user completes authentication THEN the system SHALL immediately be able to make authenticated API requests
2. WHEN navigating between pages THEN the system SHALL maintain authentication state
3. WHEN the page is refreshed THEN the system SHALL restore authentication from stored tokens
4. WHEN making multiple API requests THEN the system SHALL reuse the same token without re-fetching
5. WHEN tokens are about to expire THEN the system SHALL proactively refresh them

### Requirement 6

**User Story:** As a developer, I want proper API Gateway configuration, so that the Cognito authorizer works correctly.

#### Acceptance Criteria

1. WHEN API Gateway is configured THEN the system SHALL have a Cognito authorizer attached to protected endpoints
2. WHEN the authorizer is configured THEN the system SHALL use the correct Cognito User Pool
3. WHEN the authorizer validates tokens THEN the system SHALL check the token signature and expiration
4. WHEN validation succeeds THEN the system SHALL pass user claims to the Lambda function
5. WHEN validation fails THEN the system SHALL return a 401 or 403 error with appropriate message

### Requirement 7

**User Story:** As a developer, I want to verify the authentication flow end-to-end, so that I can confirm the fix works correctly.

#### Acceptance Criteria

1. WHEN testing the fix THEN the system SHALL successfully complete OTP authentication
2. WHEN making a profile update request THEN the system SHALL include the Authorization header
3. WHEN API Gateway receives the request THEN the system SHALL validate the token successfully
4. WHEN the Lambda function executes THEN the system SHALL receive the user identity from Cognito claims
5. WHEN the response is returned THEN the system SHALL complete the profile update without errors
