# OTP Authentication Lambda Functions

This directory contains the Lambda functions for Cognito custom authentication flow using email OTP codes.

## Overview

The OTP authentication system consists of four Lambda functions that work together with AWS Cognito to provide passwordless email authentication:

1. **PreSignUp** - Auto-confirms new users for OTP authentication
2. **DefineAuthChallenge** - Determines the authentication flow and enforces rate limiting
3. **CreateAuthChallenge** - Generates OTP codes and sends them via SES
4. **VerifyAuthChallenge** - Validates OTP codes and handles account linking

## Files

### Deprecated Files

- `handler.py.deprecated` - **DEPRECATED**: Old DynamoDB-based OTP handler with self-signed JWT tokens. This file has been replaced by the Cognito Lambda triggers below. Kept for reference only.

### `otp_utils.py`

Shared utilities for OTP operations:

- `generate_otp_code()` - Generates 6-digit cryptographically secure OTP codes
- `calculate_expiration_time()` - Calculates expiration timestamp (10 minutes)
- `is_valid_email()` - Validates email address format
- `send_otp_email()` - Sends OTP via AWS SES using email template
- `is_otp_expired()` - Checks if OTP has expired

### `pre_signup.py`

Lambda handler for PreSignUp trigger:

- Auto-confirms new users for OTP authentication
- Marks email as verified
- Logs user creation events

### `define_auth_challenge.py`

Lambda handler for DefineAuthChallenge trigger:

- Determines when to issue OTP challenges
- Enforces rate limiting (60 seconds between requests)
- Prevents brute force attacks (max 5 attempts)
- Controls token issuance

### `create_auth_challenge.py`

Lambda handler for CreateAuthChallenge trigger:

- Generates 6-digit OTP codes
- Sends OTP via SES email
- Stores OTP and expiration in Cognito session
- Logs OTP request events to CloudWatch

### `verify_auth_challenge.py`

Lambda handler for VerifyAuthChallenge trigger:

- Validates OTP code against stored value
- Checks expiration time
- Queries DynamoDB GSI1 for existing accounts by email
- Links accounts if duplicate found (updates Cognito user attributes)
- Returns validation result

## Requirements Mapping

- **Requirements 1.1, 1.2**: OTP generation and expiration (otp_utils.py)
- **Requirements 6.1, 6.2**: Email sending via SES (otp_utils.py, create_auth_challenge.py)
- **Requirements 5.1, 7.1**: Authentication flow and rate limiting (define_auth_challenge.py)
- **Requirements 1.3, 2.2**: OTP validation (verify_auth_challenge.py)
- **Requirements 3.1, 3.2, 3.3**: Account linking (verify_auth_challenge.py)

## Deployment

The Lambda functions are deployed via AWS SAM template (template.yaml):

```yaml
Resources:
  DefineAuthChallengeFunction:
    Type: AWS::Serverless::Function
    Handler: auth.define_auth_challenge.lambda_handler

  CreateAuthChallengeFunction:
    Type: AWS::Serverless::Function
    Handler: auth.create_auth_challenge.lambda_handler

  VerifyAuthChallengeFunction:
    Type: AWS::Serverless::Function
    Handler: auth.verify_auth_challenge.lambda_handler
```

The functions are automatically triggered by Cognito via LambdaConfig:

```yaml
CognitoUserPool:
  Properties:
    LambdaConfig:
      DefineAuthChallenge: !GetAtt DefineAuthChallengeFunction.Arn
      CreateAuthChallenge: !GetAtt CreateAuthChallengeFunction.Arn
      VerifyAuthChallengeResponse: !GetAtt VerifyAuthChallengeFunction.Arn
```

## IAM Permissions

### DefineAuthChallenge

- CloudWatch Logs (CreateLogGroup, CreateLogStream, PutLogEvents)

### CreateAuthChallenge

- SES (SendEmail, SendTemplatedEmail, SendRawEmail)
- CloudWatch Logs

### VerifyAuthChallenge

- DynamoDB (Query, GetItem, UpdateItem on table and GSI1)
- Cognito (AdminUpdateUserAttributes, AdminGetUser, ListUsers)
- CloudWatch Logs

## Environment Variables

### All Functions

- `TABLE_NAME` - DynamoDB table name
- `ENVIRONMENT` - Environment (dev/prod)

### CreateAuthChallenge

- `SES_EMAIL_IDENTITY` - Email address for sending (e.g., noreply@madewithkiro.com)
- `SES_TEMPLATE_NAME` - SES email template name
- `SES_CONFIGURATION_SET` - SES configuration set name

## Authentication Flow

1. User enters email address
2. Frontend calls Cognito InitiateAuth with CUSTOM_AUTH flow
3. **DefineAuthChallenge** determines OTP challenge is needed
4. **CreateAuthChallenge** generates OTP and sends email
5. User receives email with 6-digit code
6. User enters OTP code
7. Frontend calls Cognito RespondToAuthChallenge
8. **VerifyAuthChallenge** validates code and checks for duplicates
9. If valid, Cognito issues JWT tokens
10. If duplicate account found, accounts are linked

## Rate Limiting

- Minimum 60 seconds between OTP requests per email
- Maximum 5 authentication attempts per session
- Rate limit violations are logged to CloudWatch

## Account Linking

When a user authenticates with OTP:

1. Query DynamoDB GSI1 for existing profile with same email
2. If found (e.g., Google account exists):
   - Add 'email' to authMethods array in DynamoDB
   - Update Cognito custom attributes
   - Link accounts (user can now use both methods)
3. If not found:
   - New profile will be created on first login
   - Set authMethods to ['email']

## Error Handling

All functions include comprehensive error handling:

- Invalid email format
- Expired OTP codes
- Incorrect OTP codes
- Email delivery failures
- DynamoDB errors
- Cognito errors

Errors are logged to CloudWatch with appropriate context.

## Testing

See the test files in `backend/tests/` for unit tests and property-based tests.

## Known Issues

### Circular Dependency Linting Warning

The SAM template validation shows a circular dependency warning between CognitoUserPool and the Lambda functions. This is a **linting warning only** and does not prevent deployment:

- CognitoUserPool references Lambda functions via GetAtt in LambdaConfig
- Lambda functions are defined BEFORE CognitoUserPool in the template
- The Cognito IAM policy uses wildcard (`*`) to avoid circular reference
- UserPoolId is passed in the Cognito event at runtime (not needed at creation)

**Status**: Template builds and deploys successfully despite the linting warning. This is a known CloudFormation pattern for Cognito Lambda triggers.

**Validation**:

```bash
sam build --template template.yaml  # ✅ Succeeds
sam validate --template template.yaml  # ⚠️ Shows linting warning (safe to ignore)
```
