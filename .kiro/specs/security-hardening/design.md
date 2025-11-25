# Design Document

## Overview

This design document outlines the security hardening and public release preparation for the MadeWithKiro application. The design focuses on removing sensitive data, implementing proper security controls, enforcing least-privilege access, and ensuring production-ready configuration management. The approach follows AWS security best practices and industry standards for serverless applications.

## Architecture

### Current Security Posture

The application currently has:

- OAuth credentials in samconfig.toml (development environment)
- Wildcard CORS (`'*'`) in API Gateway and Lambda responses
- No rate limiting on API endpoints
- Debug logging and print statements in Lambda functions
- Development-only code paths in application handler
- Hardcoded CloudFront distribution ID in samconfig.toml
- Mixed authentication patterns (some endpoints bypass Cognito)

### Target Security Posture

The hardened application will have:

- All secrets stored in AWS SSM Parameter Store or Secrets Manager
- Environment-specific CORS policies restricting to known domains
- API Gateway rate limiting and throttling
- Sanitized error messages with no internal details exposed
- Production-ready logging with CloudWatch integration
- Proper IAM roles with least-privilege permissions
- Security headers on all responses
- HTTPS enforcement everywhere
- Clean codebase with no development artifacts

## Components and Interfaces

### 1. Secrets Management

**SSM Parameter Store Structure:**

```
/madewithkiro/dev/google-client-id
/madewithkiro/dev/google-client-secret
/madewithkiro/dev/github-client-id
/madewithkiro/dev/github-client-secret

/madewithkiro/prod/google-client-id
/madewithkiro/prod/google-client-secret
/madewithkiro/prod/github-client-id
/madewithkiro/prod/github-client-secret
```

**SAM Template Integration:**

- Parameters reference SSM paths with environment prefix
- CloudFormation resolves secrets at deployment time
- No secrets in git repository or samconfig.toml

### 2. CORS Configuration

**API Gateway Level:**

```yaml
Cors:
  AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
  AllowHeaders: "'Content-Type,Authorization'"
  AllowOrigin: !If
    - IsProduction
    - "'https://madewithkiro.com'"
    - "'http://localhost:5173,https://*.cloudfront.net'"
```

**Lambda Response Headers:**

```python
def get_cors_origin(event):
    """Validate and return appropriate CORS origin"""
    origin = event.get('headers', {}).get('origin', '')
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')

    if origin in allowed_origins:
        return origin
    return allowed_origins[0] if allowed_origins else '*'
```

### 3. Rate Limiting

**API Gateway Throttling:**

```yaml
ThrottleSettings:
  RateLimit: 100 # requests per second
  BurstLimit: 200 # concurrent requests
```

**Per-Method Throttling:**

- Public endpoints (GET): Higher limits
- Authenticated endpoints (POST/PUT/DELETE): Standard limits
- Create operations: Lower limits to prevent abuse

### 4. Error Handling

**Error Response Structure:**

```python
def sanitized_error_response(status_code: int, user_message: str,
                             internal_error: Exception = None) -> Dict:
    """Return user-friendly error without exposing internals"""
    # Log detailed error internally
    if internal_error:
        logger.error(f"Internal error: {str(internal_error)}",
                    exc_info=True)

    # Return generic message to user
    return {
        'statusCode': status_code,
        'headers': get_security_headers(event),
        'body': json.dumps({
            'error': {
                'code': f'ERROR_{status_code}',
                'message': user_message
            }
        })
    }
```

**Error Message Mapping:**

- 400: "Invalid request data"
- 401: "Authentication required"
- 403: "Access denied"
- 404: "Resource not found"
- 500: "An error occurred processing your request"

### 5. Security Headers

**CloudFront Response Headers Policy:**

```yaml
ResponseHeadersPolicy:
  SecurityHeadersConfig:
    StrictTransportSecurity:
      AccessControlMaxAgeSec: 31536000
      IncludeSubdomains: true
      Preload: true
    ContentTypeOptions:
      Override: true
    FrameOptions:
      FrameOption: DENY
      Override: true
    XSSProtection:
      ModeBlock: true
      Protection: true
      Override: true
    ReferrerPolicy:
      ReferrerPolicy: strict-origin-when-cross-origin
      Override: true
  ContentSecurityPolicy:
    ContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com"
    Override: true
```

### 6. IAM Permissions

**Lambda Execution Role (Profile Function):**

```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref MadeWithKiroTable
  - Statement:
      - Effect: Allow
        Action:
          - dynamodb:GetItem
          - dynamodb:PutItem
          - dynamodb:UpdateItem
        Resource: !GetAtt MadeWithKiroTable.Arn
        Condition:
          ForAllValues:StringEquals:
            dynamodb:LeadingKeys:
              - !Sub "USER#${aws:userid}"
```

**Lambda Execution Role (Application Function):**

```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref MadeWithKiroTable
  - Statement:
      - Effect: Allow
        Action:
          - dynamodb:GetItem
          - dynamodb:PutItem
          - dynamodb:UpdateItem
          - dynamodb:DeleteItem
          - dynamodb:Query
          - dynamodb:Scan
        Resource:
          - !GetAtt MadeWithKiroTable.Arn
          - !Sub "${MadeWithKiroTable.Arn}/index/*"
```

### 7. Logging and Monitoring

**CloudWatch Log Groups:**

```yaml
ProfileFunctionLogGroup:
  Type: AWS::Logs::LogGroup
  Properties:
    LogGroupName: !Sub /aws/lambda/MadeWithKiro-Profile-${Environment}
    RetentionInDays: 30 # dev: 7, prod: 30
```

**Structured Logging:**

```python
import logging
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def log_event(event_type: str, details: Dict, level: str = 'INFO'):
    """Structured logging for CloudWatch"""
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'event_type': event_type,
        'environment': os.environ.get('ENVIRONMENT'),
        'details': details
    }

    if level == 'ERROR':
        logger.error(json.dumps(log_entry))
    else:
        logger.info(json.dumps(log_entry))
```

## Data Models

No changes to existing data models. Security hardening focuses on access control and data protection rather than schema changes.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: No secrets in repository

_For any_ file in the git repository, the file content should not contain AWS credentials, API keys, OAuth secrets, or authentication tokens
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Environment-specific configuration

_For any_ deployment to an environment (dev or prod), the configuration should use environment-specific SSM parameters and not share secrets between environments
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: CORS origin validation

_For any_ API request with an Origin header, the response should only include that origin in Access-Control-Allow-Origin if it matches the allowed origins list
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 4: Error message sanitization

_For any_ error response returned to clients, the response body should not contain stack traces, file paths, database queries, or internal system details
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 5: HTTPS enforcement

_For any_ HTTP request to the application, the request should be redirected to HTTPS or rejected
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 6: Least privilege IAM

_For any_ Lambda function execution role, the role should only have permissions for the specific DynamoDB operations and tables required by that function
**Validates: Requirements 4.1, 4.2**

### Property 7: Authentication enforcement

_For any_ protected API endpoint (POST, PUT, DELETE), requests without valid JWT tokens should be rejected with 401 status
**Validates: Requirements 4.5**

### Property 8: No development artifacts

_For any_ source file in the production codebase, the file should not contain TODO comments, console.log statements, print statements for debugging, or commented-out code blocks
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 9: Security headers present

_For any_ response from CloudFront, the response headers should include Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, and Content-Security-Policy
**Validates: Requirements 7.4, 7.5**

### Property 10: Logging without sensitive data

_For any_ log entry written to CloudWatch, the log entry should not contain passwords, tokens, API keys, or personally identifiable information beyond user IDs
**Validates: Requirements 5.1, 5.2**

## Error Handling

### Error Categories

**1. Authentication Errors (401)**

- Missing JWT token
- Expired token
- Invalid token signature
- User message: "Authentication required. Please sign in."

**2. Authorization Errors (403)**

- Valid token but insufficient permissions
- Attempting to modify another user's resources
- User message: "You don't have permission to perform this action."

**3. Validation Errors (400)**

- Invalid request format
- Missing required fields
- Field validation failures
- User message: "Invalid request data. Please check your input."

**4. Not Found Errors (404)**

- Resource doesn't exist
- User message: "The requested resource was not found."

**5. Server Errors (500)**

- Database connection failures
- Unexpected exceptions
- User message: "An error occurred. Please try again later."

### Error Logging Strategy

**Internal Logging (CloudWatch):**

- Full exception details with stack traces
- Request context (method, path, user ID)
- Timestamp and correlation ID
- Environment and function name

**External Response (Client):**

- Generic error message
- Error code for client-side handling
- No internal details
- Consistent format

### Rate Limiting Errors (429)\*\*

- Too many requests
- User message: "Too many requests. Please try again in a moment."

## Testing Strategy

### Unit Testing

**Security-Focused Unit Tests:**

1. **Secrets Detection Tests**

   - Scan all files for patterns matching API keys, tokens, credentials
   - Verify .env files contain only placeholders
   - Check git history for accidentally committed secrets

2. **CORS Validation Tests**

   - Test origin validation logic with various origins
   - Verify wildcard is not used in production
   - Test preflight OPTIONS requests

3. **Error Sanitization Tests**

   - Verify error responses don't leak internal details
   - Test exception handling doesn't expose stack traces
   - Validate error message consistency

4. **IAM Permission Tests**

   - Parse SAM template and verify least-privilege policies
   - Check no wildcard (\*) permissions
   - Validate resource-level restrictions

5. **Header Validation Tests**
   - Verify security headers are present in responses
   - Test HTTPS redirect logic
   - Validate CSP policy syntax

### Integration Testing

**End-to-End Security Tests:**

1. **Authentication Flow Tests**

   - Test protected endpoints reject unauthenticated requests
   - Verify token validation works correctly
   - Test token expiration handling

2. **CORS Integration Tests**

   - Make requests from allowed and disallowed origins
   - Verify preflight requests work correctly
   - Test credentials mode with CORS

3. **Rate Limiting Tests**

   - Send requests exceeding rate limits
   - Verify 429 responses are returned
   - Test burst limit behavior

4. **HTTPS Enforcement Tests**
   - Attempt HTTP requests to CloudFront
   - Verify redirects to HTTPS
   - Test mixed content scenarios

### Security Scanning

**Automated Security Checks:**

1. **Dependency Scanning**

   - Run `npm audit` for frontend dependencies
   - Run `pip-audit` for Python dependencies
   - Check for known vulnerabilities

2. **Static Code Analysis**

   - Use `bandit` for Python security issues
   - Use `eslint-plugin-security` for JavaScript
   - Scan for hardcoded secrets with `trufflehog`

3. **Infrastructure Scanning**
   - Use `cfn-lint` for CloudFormation best practices
   - Run `checkov` for infrastructure security
   - Validate IAM policies with AWS IAM Access Analyzer

### Manual Security Review

**Pre-Release Checklist:**

1. Review all environment variables and parameters
2. Verify no secrets in git history
3. Test authentication flows manually
4. Review CloudWatch logs for sensitive data
5. Verify CORS configuration in browser dev tools
6. Test rate limiting with load testing tools
7. Review IAM policies for least privilege
8. Verify security headers with security headers checker
9. Test error responses don't leak information
10. Verify HTTPS enforcement across all endpoints

### Property-Based Testing

We will use **Hypothesis** for Python property-based testing to verify security properties across many generated inputs.

**Configuration:**

- Minimum 100 iterations per property test
- Use `@given` decorators with appropriate strategies
- Tag tests with property numbers from design document

**Example Property Test Structure:**

```python
from hypothesis import given, strategies as st
import pytest

@given(st.text())
def test_property_4_error_sanitization(error_message):
    """
    Feature: security-hardening, Property 4: Error message sanitization
    For any error response, it should not contain internal details
    """
    response = create_error_response(500, Exception(error_message))
    body = json.loads(response['body'])

    # Should not contain stack traces or file paths
    assert 'Traceback' not in body['error']['message']
    assert '.py' not in body['error']['message']
    assert '/backend/' not in body['error']['message']
```
