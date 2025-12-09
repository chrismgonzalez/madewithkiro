# JWT Token Refresh Issue After Account Linking

## Problem Statement

After successful account linking, the `custom:pending_link` claim persists in the user's JWT token even though the PENDING_LINK record has been deleted from DynamoDB.

## Root Cause

JWT tokens are **stateless and cached** by Cognito. The flow is:

1. User authenticates → Cognito generates JWT with custom claims (from PreTokenGeneration)
2. User confirms linking → PENDING_LINK deleted from DynamoDB ✅
3. User redirects → Signs back in
4. **Cognito returns the SAME cached JWT** (not expired yet) ❌
5. PreTokenGeneration doesn't run (no new token generated)
6. User still has `custom:pending_link` in their token

## Why Token Doesn't Refresh

### JWT Token Lifecycle

```
Token Generation:
1. User authenticates
2. PreTokenGeneration trigger runs
3. Reads PENDING_LINK from DynamoDB
4. Adds custom claims to token
5. Cognito issues JWT (valid for 60 minutes)
6. Token is cached in browser + Cognito

Token Reuse:
1. User signs in again (within 60 minutes)
2. Cognito checks: "Do I have a valid token for this user?"
3. YES → Return cached token (PreTokenGeneration NOT called)
4. NO → Generate new token (PreTokenGeneration IS called)
```

### Current Flow (Broken)

```
1. User authenticates with OTP
   ↓
2. JWT issued with custom:pending_link (expires in 60 min)
   ↓
3. User confirms linking
   ↓
4. PENDING_LINK deleted from DynamoDB ✅
   ↓
5. window.location.href = "/?linked=true" (redirect)
   ↓
6. User signs back in (within 60 min)
   ↓
7. Cognito returns SAME cached JWT ❌
   ↓
8. custom:pending_link still in token ❌
   ↓
9. Dialog appears again ❌
```

## Solutions

### Option 1: Global Sign Out (Recommended) ✅

Force Cognito to invalidate all tokens for the user.

**Pros**:

- Guarantees fresh token on next sign-in
- Clears all cached tokens
- Simple to implement

**Cons**:

- User must sign in again
- Slightly worse UX (but acceptable for account linking)

**Implementation**:

```typescript
// src/components/AccountLinkDialog.tsx
const handleConfirm = async () => {
  setIsLinking(true);
  setError(null);

  try {
    await confirmAccountLink();

    // Wait for backend to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ✅ Global sign out to invalidate all tokens
    await signOut({ global: true });

    // Redirect to home with success message
    localStorage.setItem("accountLinked", "true");
    window.location.href = "/auth?linked=true";
  } catch (err: any) {
    console.error("Failed to link accounts:", err);
    setError(err.message || "Failed to link accounts. Please try again.");
    setIsLinking(false);
  }
};
```

### Option 2: Force Token Refresh

Use `fetchAuthSession({ forceRefresh: true })` to get a new token.

**Pros**:

- User stays signed in
- Better UX

**Cons**:

- May not work if Cognito still caches the token
- Requires waiting for token refresh
- More complex error handling

**Implementation**:

```typescript
const handleConfirm = async () => {
  setIsLinking(true);
  setError(null);

  try {
    await confirmAccountLink();

    // Wait for backend to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ✅ Force token refresh
    await fetchAuthSession({ forceRefresh: true });

    // Reload to clear state
    window.location.href = "/?linked=true";
  } catch (err: any) {
    console.error("Failed to link accounts:", err);
    setError(err.message || "Failed to link accounts. Please try again.");
    setIsLinking(false);
  }
};
```

### Option 3: Backend-Initiated Token Revocation

Have the backend call Cognito to revoke tokens after linking.

**Pros**:

- Centralized control
- Guaranteed token invalidation

**Cons**:

- Requires additional IAM permissions
- More complex backend logic
- User still needs to refresh

**Implementation**:

```python
# backend/auth/link_accounts.py
def _revoke_user_tokens(user_sub: str) -> None:
    """Revoke all tokens for user to force fresh token generation."""
    try:
        cognito_client.admin_user_global_sign_out(
            UserPoolId=USER_POOL_ID,
            Username=user_sub
        )
        logger.info(f"Revoked tokens for user {user_sub}")
    except ClientError as e:
        logger.error(f"Failed to revoke tokens: {str(e)}", error=e)
```

### Option 4: Set Token Expiration in Response

Return a custom header telling frontend to refresh token.

**Pros**:

- Clean separation of concerns
- Frontend knows to refresh

**Cons**:

- Still requires frontend action
- Doesn't guarantee token refresh

## Recommended Solution: Option 1 (Global Sign Out)

This is the most reliable approach for account linking scenarios.

### Implementation Steps

#### 1. Update AccountLinkDialog.tsx

```typescript
import { signOut } from "aws-amplify/auth";

export function AccountLinkDialog() {
  const { pendingLink, user } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLinking(true);
    setError(null);

    try {
      // Step 1: Link accounts via API
      await confirmAccountLink();

      // Step 2: Wait for backend processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Global sign out to invalidate all tokens
      // This ensures the next sign-in will generate a fresh token
      // without the custom:pending_link claim
      await signOut({ global: true });

      // Step 4: Redirect to auth page with success message
      localStorage.setItem("accountLinked", "true");
      window.location.href = "/auth?message=accounts-linked";
    } catch (err: any) {
      console.error("Failed to link accounts:", err);
      setError(err.message || "Failed to link accounts. Please try again.");
      setIsLinking(false);
    }
  };

  const handleCancel = () => {
    // User declined linking - reload to clear dialog
    window.location.reload();
  };

  // ... rest of component
}
```

#### 2. Update Auth Page to Show Success Message

```typescript
// src/pages/AuthPage.tsx
export function AuthPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const message = searchParams.get("message");
  const accountLinked = localStorage.getItem("accountLinked");

  useEffect(() => {
    if (accountLinked === "true") {
      // Show success toast
      toast.success("Accounts linked successfully! Please sign in again.");
      localStorage.removeItem("accountLinked");
    }
  }, [accountLinked]);

  return (
    <div>
      {message === "accounts-linked" && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">
            ✅ Your accounts have been linked successfully! Please sign in with
            either method.
          </p>
        </div>
      )}
      {/* Auth UI */}
    </div>
  );
}
```

#### 3. Alternative: Use AuthContext refreshSession

If you want to try staying signed in:

```typescript
const handleConfirm = async () => {
  setIsLinking(true);
  setError(null);

  try {
    await confirmAccountLink();

    // Wait for backend
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Try to refresh session
    const refreshed = await refreshSession();

    if (refreshed) {
      // Success - reload page
      window.location.href = "/?linked=true";
    } else {
      // Refresh failed - sign out and redirect
      await signOut({ global: true });
      window.location.href = "/auth?message=accounts-linked";
    }
  } catch (err: any) {
    console.error("Failed to link accounts:", err);
    setError(err.message || "Failed to link accounts. Please try again.");
    setIsLinking(false);
  }
};
```

## Testing Strategy

### Manual Test Flow

1. **Setup**: Create OTP user, then sign in with Google (same email)
2. **Verify**: See linking dialog with custom:pending_link claim
3. **Action**: Click "Yes, Link Accounts"
4. **Expected**:
   - API call succeeds
   - PENDING_LINK deleted from DynamoDB
   - User signed out globally
   - Redirected to auth page with success message
5. **Sign In**: Sign in with either method
6. **Verify**:
   - No linking dialog appears
   - Token does NOT have custom:pending_link claim
   - User can access their profile

### Token Inspection

Check token claims in browser console:

```javascript
// Get current session
const session = await fetchAuthSession();
const idToken = session.tokens?.idToken;

// Decode JWT (base64)
const payload = JSON.parse(atob(idToken.split(".")[1]));

// Check for custom claims
console.log("Has pending_link:", payload["custom:pending_link"]);
console.log("All claims:", payload);
```

### Unit Tests

```typescript
describe("AccountLinkDialog", () => {
  it("should sign out globally after successful linking", async () => {
    const mockSignOut = vi.fn();
    vi.mock("aws-amplify/auth", () => ({
      signOut: mockSignOut,
    }));

    render(<AccountLinkDialog />);

    await userEvent.click(screen.getByText("Yes, Link Accounts"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ global: true });
    });
  });
});
```

## Edge Cases

### 1. Sign Out Fails

- **Scenario**: Global sign out API call fails
- **Solution**: Catch error, show message, allow retry

### 2. User Closes Browser During Linking

- **Scenario**: User closes browser after linking but before sign out
- **Solution**: PENDING_LINK is deleted, next sign-in will work (token expires eventually)

### 3. Multiple Tabs Open

- **Scenario**: User has multiple tabs open
- **Solution**: Global sign out affects all tabs, all will redirect to auth

### 4. Token Already Expired

- **Scenario**: User waits >60 min before linking
- **Solution**: Next sign-in generates fresh token anyway (no issue)

## Monitoring

### CloudWatch Logs

- Log when PENDING_LINK is deleted
- Log when user is signed out after linking
- Track time between linking and sign-out

### Metrics

- `AccountLinkingSuccess` - Count of successful links
- `TokenRefreshAfterLinking` - Count of token refreshes
- `SignOutAfterLinking` - Count of sign-outs

## Summary

**Problem**: JWT tokens are cached and don't automatically refresh after PENDING_LINK deletion.

**Root Cause**: Cognito returns cached tokens if they haven't expired, so PreTokenGeneration doesn't run.

**Solution**: Use `signOut({ global: true })` after successful linking to force token invalidation.

**Impact**: User must sign in again, but gets a fresh token without custom claims.

**Effort**: ~30 minutes to implement and test.
