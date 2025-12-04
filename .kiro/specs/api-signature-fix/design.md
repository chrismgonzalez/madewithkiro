# Design Document

## Overview

The 403 IncompleteSignatureException error occurs because the `authService.getAccessToken()` method is returning the **ID token** instead of the **access token**. AWS API Gateway's Cognito Authorizer requires the access token for authorization, but the code is incorrectly sending the ID token.

**Root Cause:**
In `src/services/authService.ts` line 64-65:

```typescript
// API Gateway Cognito authorizer requires ID token, not access token
return session.tokens?.idToken?.toString() ?? null;
```

This comment and implementation are incorrect. The Cognito Authorizer validates **access tokens**, not ID tokens.

**Additional Issues:**

- Legacy OTP token handling in localStorage (lines 44-59) from the old implementation should be removed
- The OTP refactor moved to Cognito-issued tokens, making localStorage token management obsolete
- Legacy OTP refresh logic in `refreshSession()` method (lines 177-197) should be removed

The fix is a simple one-line change: replace `idToken` with `accessToken`.

## Architecture

### Current Flow (Broken)

```
User completes OTP auth
  ↓
Amplify stores tokens (accessToken + idToken) in secure storage
  ↓
User makes API request (e.g., PUT /profile)
  ↓
apiClient.getAuthToken() calls authService.getAccessToken()
  ↓
authService returns session.tokens.idToken (WRONG!)
  ↓
Request sent WITH Authorization: Bearer <idToken>
  ↓
API Gateway receives request
  ↓
Cognito Authorizer tries to validate idToken as accessToken
  ↓
Validation fails → 403 IncompleteSignatureException
```

### Fixed Flow

```
User completes OTP auth
  ↓
Amplify stores tokens (accessToken + idToken) in secure storage
  ↓
User makes API request (e.g., PUT /profile)
  ↓
apiClient.getAuthToken() calls authService.getAccessToken()
  ↓
authService returns session.tokens.accessToken (CORRECT!)
  ↓
Request sent WITH Authorization: Bearer <accessToken>
  ↓
API Gateway receives request
  ↓
Cognito Authorizer validates accessToken
  ↓
Token valid → Request proceeds to Lambda
  ↓
Lambda receives user identity from Cognito claims
  ↓
Success response returned
```

## Components and Interfaces

### 1. Auth Service (`src/services/authService.ts`)

**Current Implementation (BROKEN):**

```typescript
async getAccessToken(): Promise<string | null> {
  try {
    // First, check for OTP access token in localStorage
    const otpToken = localStorage.getItem("otp_access_token");
    if (otpToken) {
      // ... validation logic ...
      return otpToken;
    }

    // Fall back to Cognito session (for Google OAuth users)
    const session = await fetchAuthSession();
    // API Gateway Cognito authorizer requires ID token, not access token
    return session.tokens?.idToken?.toString() ?? null;  // ❌ WRONG!
  } catch (error) {
    return null;
  }
}
```

**Fixed Implementation:**

```typescript
async getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    // API Gateway Cognito authorizer requires ACCESS token, not ID token
    return session.tokens?.accessToken?.toString() ?? null;  // ✅ CORRECT!
  } catch (error) {
    return null;
  }
}
```

**Changes Required:**

1. Remove deprecated localStorage OTP token handling (lines 44-59)
2. Change `idToken` to `accessToken` on line 65
3. Update the comment to reflect correct token type
4. Remove deprecated OTP refresh logic in `refreshSession()` method (lines 177-197)
5. Simplify `isAuthenticated()` method to remove localStorage checks (lines 127-141)

### 2. API Client (`src/services/apiClient.ts`)

**Current Implementation (CORRECT):**
The API client is already correctly implemented. It:

- Imports `authService` dynamically
- Calls `authService.getAccessToken()`
- Adds the token to Authorization header
- Handles 401 responses with automatic refresh

**No changes needed** - the API client is working correctly.

### 3. API Gateway Configuration

**Current State (CORRECT):**
The SAM template shows the Cognito Authorizer is properly configured:

- Attached to protected endpoints including `/profile` PUT
- Uses the correct Cognito User Pool
- Validates JWT access tokens
- Passes user claims to Lambda functions

**No changes needed** - the API Gateway configuration is correct.

## Data Models

### Amplify Auth Session

```typescript
interface AuthSession {
  tokens?: {
    accessToken?: {
      toString(): string;
      payload: Record<string, any>;
    };
    idToken?: {
      toString(): string;
      payload: Record<string, any>;
    };
  };
  credentials?: AWSCredentials;
  identityId?: string;
  userSub?: string;
}
```

### Token Types

**Access Token:**

- Used for API authorization
- Contains scopes and permissions
- Validated by API Gateway Cognito Authorizer
- Short-lived (60 minutes by default)

**ID Token:**

- Contains user identity information
- Used for displaying user profile data
- NOT used for API authorization
- Short-lived (60 minutes by default)

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Access Token Retrieval

_For any_ authenticated user (OTP or Google OAuth), calling `getAccessToken()` should return the access token from the Amplify session, not the ID token.

**Validates: Requirements 1.1, 1.3, 2.1, 2.2**

### Property 2: Token Type Consistency

_For any_ API request requiring authentication, the Authorization header should contain the access token, not the ID token.

**Validates: Requirements 1.2, 1.3, 2.3**

### Property 3: No Legacy Token Storage

_For any_ authentication flow after the fix, the system should not store or retrieve tokens from localStorage.

**Validates: Requirements 2.1, 2.2**

### Property 4: Session Refresh Consistency

_For any_ token refresh operation, the system should use Amplify's `fetchAuthSession({ forceRefresh: true })` for both OTP and Google OAuth users.

**Validates: Requirements 2.4, 5.5**

## Error Handling

### Error Scenarios

1. **No Active Session**

   - Cause: User not authenticated or session expired
   - Handling: Return `null` from `getAccessToken()`, API returns 401
   - User Experience: Redirected to login

2. **Token Retrieval Failure**

   - Cause: Amplify session fetch fails
   - Handling: Catch error, return `null`
   - User Experience: Redirected to login

3. **Token Expired**

   - Cause: Access token has expired
   - Handling: API client's `handleUnauthorized()` attempts refresh
   - User Experience: Transparent refresh, request retried

4. **Refresh Failure**
   - Cause: Refresh token expired or invalid
   - Handling: Redirect to login page
   - User Experience: Prompted to sign in again

## Testing Strategy

### Unit Tests

1. **Auth Service Token Retrieval**

   - Test `getAccessToken()` returns access token (not ID token)
   - Test `getAccessToken()` with no session returns null
   - Test `getAccessToken()` does not check localStorage
   - Test `refreshSession()` uses Amplify's fetchAuthSession
   - Test `isAuthenticated()` does not check localStorage

2. **Integration with API Client**
   - Test API requests include access token in Authorization header
   - Test token format is `Bearer <accessToken>`
   - Test requests succeed with valid access token

### Manual Testing Checklist

1. Sign in with OTP
2. Open browser DevTools Network tab
3. Make a profile update request
4. Verify request headers include `Authorization: Bearer <token>`
5. Copy the token value
6. Decode the JWT at jwt.io
7. Verify the token is an access token (check `token_use` claim = "access")
8. Verify response is 200 (not 403)
9. Repeat with Google OAuth sign-in
10. Verify both flows work identically

## Implementation Notes

### Token Type Identification

You can identify token types by decoding the JWT and checking the `token_use` claim:

- Access token: `"token_use": "access"`
- ID token: `"token_use": "id"`

### Why Access Token, Not ID Token?

AWS API Gateway Cognito Authorizer is designed to validate **access tokens** because:

1. Access tokens contain authorization scopes
2. Access tokens are meant for API access
3. ID tokens are meant for user identity information
4. This is the AWS-recommended pattern

### Backward Compatibility

The fix maintains backward compatibility:

- Existing Google OAuth users continue to work
- OTP users now work correctly
- No changes to AuthContext or other components needed
- API Gateway configuration remains unchanged

### Performance Considerations

- `fetchAuthSession()` is cached by Amplify
- No additional network requests for token retrieval
- Token refresh only occurs when needed (on 401 response)

## Deployment

### Changes Required

1. Update `src/services/authService.ts`

   - Remove localStorage token handling
   - Change `idToken` to `accessToken`
   - Remove deprecated OTP refresh logic
   - Update comments

2. No infrastructure changes needed
   - API Gateway configuration is correct
   - Cognito authorizer is properly configured

### Verification Steps

1. Deploy updated frontend code
2. Clear browser cache and local storage
3. Sign in with OTP
4. Attempt profile update
5. Verify 200 response (not 403)
6. Check CloudWatch logs for Lambda execution
7. Verify user identity is passed to Lambda
8. Repeat with Google OAuth

### Rollback Plan

If issues occur:

1. Revert `authService.ts` changes
2. Redeploy previous version
3. Investigate root cause
4. Apply fix and redeploy

The fix is isolated to the auth service, so rollback is straightforward and low-risk.
