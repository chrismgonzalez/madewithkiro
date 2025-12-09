# PENDING_LINK Cleanup Issue - Analysis & Solution

## Problem Statement

The `custom:pending_link` custom claim persists in JWT tokens even after successful account linking, causing the linking prompt to appear repeatedly.

## Root Cause Analysis

### How Custom Claims Work

1. **PostAuthentication** trigger creates `PENDING_LINK` record in DynamoDB when duplicate detected
2. **PreTokenGeneration** trigger reads `PENDING_LINK` record and adds custom claims to JWT:
   - `custom:pending_link: 'true'`
   - `custom:link_google_user: '<google_username>'`
3. **User confirms linking** via API
4. **Problem**: If `PENDING_LINK` record isn't deleted, PreTokenGeneration keeps adding claims to new tokens

### Current State

#### Two API Endpoints Exist:

1. **`/auth/confirm-link`** (ConfirmLinkAccountsFunction)

   - Handler: `confirm_link_accounts.py`
   - ✅ **Deletes PENDING_LINK record** via `_delete_pending_link()`
   - Used by: `src/services/accountLinking.ts`
   - Called by: `AccountLinkDialog.tsx`

2. **`/auth/link-accounts`** (LinkAccountsFunction)
   - Handler: `link_accounts.py`
   - ❌ **Does NOT delete PENDING_LINK record**
   - Used by: `src/services/authService.ts`
   - Tests reference this endpoint

### Current Frontend Usage

```typescript
// src/components/AccountLinkDialog.tsx
import { confirmAccountLink } from "@/services/accountLinking";

await confirmAccountLink(); // ✅ Calls /auth/confirm-link
```

```typescript
// src/services/authService.ts
export async function linkAccounts(targetUserSub: string) {
  const response = await apiClient.post<LinkAccountsResponse>(
    "/auth/link-accounts", // ❌ This endpoint doesn't delete PENDING_LINK
    { targetUserSub, confirmLink: true }
  );
}
```

## Issue Scenarios

### Scenario 1: Using /auth/confirm-link (Current - Working)

1. User authenticates → PENDING_LINK created
2. PreTokenGeneration adds custom claims
3. User confirms → `/auth/confirm-link` called
4. ✅ PENDING_LINK deleted
5. Next token refresh → No custom claims added
6. ✅ Works correctly

### Scenario 2: Using /auth/link-accounts (Broken)

1. User authenticates → PENDING_LINK created
2. PreTokenGeneration adds custom claims
3. User confirms → `/auth/link-accounts` called
4. ❌ PENDING_LINK NOT deleted
5. Next token refresh → Custom claims still added
6. ❌ User sees linking prompt again

### Scenario 3: User Declines Linking

1. User authenticates → PENDING_LINK created
2. PreTokenGeneration adds custom claims
3. User declines linking
4. ❌ PENDING_LINK NOT deleted (no endpoint for decline)
5. Next login → Custom claims still added
6. ❌ User sees linking prompt again

## Solutions

### Option 1: Add PENDING_LINK Deletion to link_accounts.py (Recommended)

Make both endpoints consistent by adding deletion to `link_accounts.py`:

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    # ... existing code ...

    # Merge profiles (Requirements 5.4, 7.5)
    merge_result = _merge_profiles(current_user_sub, target_user_sub)

    if not merge_result['success']:
        return _error_response(...)

    # ✅ ADD THIS: Delete pending link record
    _delete_pending_link(current_user_sub)

    # Return success
    return {
        'statusCode': 200,
        'headers': get_cors_headers(event),
        'body': json.dumps({
            'success': True,
            'message': 'Accounts linked successfully',
            'linkedIdentities': link_result.get('linked_identities', [])
        })
    }

def _delete_pending_link(user_sub: str) -> None:
    """Delete pending link record from DynamoDB."""
    try:
        table = dynamodb.Table(TABLE_NAME)

        table.delete_item(
            Key={
                'PK': f'USER#{user_sub}',
                'SK': 'PENDING_LINK'
            }
        )

        logger.info(
            "Deleted pending link record",
            context={'user_sub': user_sub}
        )

    except ClientError as e:
        logger.error(
            f"Error deleting pending link: {str(e)}",
            error=e,
            context={'user_sub': user_sub}
        )
        # Don't fail the linking if we can't delete the record
```

### Option 2: Consolidate to Single Endpoint

Remove one endpoint and use only one:

- Keep `/auth/confirm-link` (simpler, already works)
- Remove `/auth/link-accounts` and update tests
- Update `authService.ts` to use `confirmAccountLink`

**Pros**: Single source of truth, less maintenance
**Cons**: Breaking change, need to update tests

### Option 3: Add Decline Endpoint

Create `/auth/decline-link` endpoint to handle user declining:

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle user declining account linking."""
    user_sub, _ = _extract_user_from_token(event)

    if not user_sub:
        return _error_response(401, 'UNAUTHORIZED', 'Invalid token', event)

    # Delete pending link record
    _delete_pending_link(user_sub)

    logger.info(
        "User declined account linking",
        context={'user_sub': user_sub}
    )

    return {
        'statusCode': 200,
        'headers': get_cors_headers(event),
        'body': json.dumps({
            'success': True,
            'message': 'Account linking declined'
        })
    }
```

## Recommended Implementation Plan

### Phase 1: Fix link_accounts.py (Immediate)

1. Add `_delete_pending_link()` function to `link_accounts.py`
2. Call it after successful profile merge
3. Add IAM permission for DeleteItem on PENDING_LINK records
4. Deploy and test

### Phase 2: Add Decline Handling (Short-term)

1. Create `/auth/decline-link` endpoint
2. Update frontend to call it when user declines
3. Add tests for decline flow

### Phase 3: Consolidate Endpoints (Long-term)

1. Deprecate `/auth/link-accounts`
2. Update all references to use `/auth/confirm-link`
3. Remove deprecated endpoint after migration

## Testing Strategy

### Unit Tests

```python
def test_link_accounts_deletes_pending_link():
    """Test that PENDING_LINK is deleted after successful linking."""
    # Setup: Create PENDING_LINK record
    # Execute: Call link_accounts
    # Assert: PENDING_LINK record is deleted

def test_link_accounts_continues_on_delete_failure():
    """Test that linking succeeds even if PENDING_LINK deletion fails."""
    # Setup: Mock DynamoDB delete to fail
    # Execute: Call link_accounts
    # Assert: Linking still succeeds, error is logged
```

### Integration Tests

```python
def test_custom_claims_cleared_after_linking():
    """Test that custom claims don't appear in tokens after linking."""
    # 1. Authenticate OTP user → PENDING_LINK created
    # 2. Get token → Verify custom:pending_link present
    # 3. Link accounts
    # 4. Refresh token → Verify custom:pending_link NOT present
```

### Manual Testing

1. Sign in with OTP → See linking prompt
2. Confirm linking → Success message
3. Sign out and sign in again → No linking prompt
4. Check DynamoDB → PENDING_LINK record deleted

## IAM Permissions Required

Update `link_accounts.py` Lambda permissions in `template.yaml`:

```yaml
LinkAccountsFunction:
  Policies:
    - Statement:
        - Sid: DynamoDBAccess
          Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem # ✅ Already present
            - dynamodb:Query # ✅ Add for GSI queries
          Resource:
            - !GetAtt MadeWithKiroTable.Arn
            - !Sub "${MadeWithKiroTable.Arn}/index/GSI1" # ✅ Add for GSI
```

## Monitoring & Logging

### CloudWatch Logs

- Log when PENDING_LINK is deleted
- Log if deletion fails (warning, not error)
- Log user_sub for audit trail

### CloudWatch Metrics

- `PendingLinkDeleted` - Count of successful deletions
- `PendingLinkDeleteFailed` - Count of failed deletions

### Alarms

- Alert if deletion failure rate > 5%

## Edge Cases

### 1. PENDING_LINK Already Deleted

- **Scenario**: User links accounts, then API is called again
- **Solution**: DeleteItem is idempotent, no error if item doesn't exist

### 2. PENDING_LINK Expired

- **Scenario**: User waits 24+ hours before linking
- **Solution**: PreTokenGeneration already handles expiration and deletes record

### 3. Multiple Pending Links

- **Scenario**: User has multiple duplicate accounts
- **Solution**: Each PENDING_LINK has unique PK (USER#{sub}), only current user's is deleted

### 4. Concurrent Requests

- **Scenario**: User clicks confirm multiple times
- **Solution**: First request deletes record, subsequent requests succeed (idempotent)

## Rollback Plan

If issues occur:

1. Revert Lambda code to previous version
2. Manually delete PENDING_LINK records via DynamoDB console if needed
3. Users can sign out/in to get fresh tokens without custom claims

## Summary

**Current Issue**: `link_accounts.py` doesn't delete PENDING_LINK record, causing custom claims to persist.

**Root Cause**: Inconsistency between two API endpoints - one deletes, one doesn't.

**Solution**: Add `_delete_pending_link()` call to `link_accounts.py` after successful merge.

**Impact**: Low risk, high value - fixes persistent linking prompt issue.

**Effort**: ~30 minutes to implement and test.
