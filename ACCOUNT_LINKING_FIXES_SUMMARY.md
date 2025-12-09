# Account Linking Fixes Summary

## Two Critical Issues Identified

### Issue 1: Applications Not Reassigned During Account Linking ⚠️

**Problem**: When accounts are linked, applications created by the source user remain associated with the old userId, causing them to become "orphaned" and not appear in the destination user's profile.

**Root Cause**: The `_merge_profiles()` function merges authMethods and deletes the source profile, but doesn't update application ownership.

**Impact**:

- User loses access to their applications after linking
- Applications appear to be deleted from user's perspective
- Data integrity issue - apps reference non-existent user

**Solution**: Add application reassignment logic to `_merge_profiles()` in `link_accounts.py`

**Status**: ⏳ **Not yet implemented** - See `APPLICATION_LINKING_ANALYSIS.md` for full solution

---

### Issue 2: Custom Claims Not Cleared After Linking ✅

**Problem**: The `custom:pending_link` claim persists in JWT tokens after successful account linking, causing the linking prompt to appear repeatedly.

**Root Cause**: The `link_accounts.py` endpoint doesn't delete the `PENDING_LINK` DynamoDB record after successful linking, so `PreTokenGeneration` keeps adding the custom claims to new tokens.

**Impact**:

- User sees linking prompt on every login even after linking
- Poor user experience
- Confusion about whether linking succeeded

**Solution**: Add `_delete_pending_link()` call after successful profile merge in `link_accounts.py`

**Status**: ✅ **FIXED** - Implementation complete

---

## Implementation Details

### Fix 1: Application Reassignment (TODO)

**Files to modify**:

- `backend/auth/link_accounts.py`
- `backend/auth/confirm_link_accounts.py`

**Changes needed**:

1. Add `_reassign_applications()` function
2. Call it from `_merge_profiles()` after merging authMethods
3. Update all app records: `userId` and `GSI1PK` to destination user
4. Add comprehensive logging

**Code location**: See `APPLICATION_LINKING_ANALYSIS.md` for complete implementation

**Testing**:

- Unit tests for 0, 1, and multiple apps
- Integration test: Create apps → Link accounts → Verify apps appear in destination profile
- Error handling: Partial failures, DynamoDB throttling

---

### Fix 2: PENDING_LINK Cleanup (COMPLETED) ✅

**Files modified**:

- ✅ `backend/auth/link_accounts.py`

**Changes made**:

1. **Added `_delete_pending_link()` function**:

```python
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
        logger.info("Deleted pending link record", context={'user_sub': user_sub})
    except ClientError as e:
        logger.error(f"Error deleting pending link: {str(e)}", error=e)
        # Don't fail linking if deletion fails
```

2. **Updated lambda_handler to call deletion**:

```python
# After successful profile merge
merge_result = _merge_profiles(current_user_sub, target_user_sub)

if not merge_result['success']:
    return _error_response(...)

# ✅ NEW: Delete pending link record
_delete_pending_link(current_user_sub)

return success_response
```

**IAM Permissions**: Already has `dynamodb:DeleteItem` permission ✅

**Testing needed**:

- Unit test: Verify PENDING_LINK deleted after linking
- Integration test: Link accounts → Refresh token → Verify no custom claims
- Error handling: Deletion fails but linking succeeds

---

## Flow Diagrams

### Current Flow (With Fix 2)

```
1. User authenticates (OTP)
   ↓
2. PostAuthentication detects duplicate Google account
   ↓
3. Creates PENDING_LINK record in DynamoDB
   ↓
4. PreTokenGeneration reads PENDING_LINK
   ↓
5. Adds custom:pending_link claim to JWT
   ↓
6. Frontend shows linking prompt
   ↓
7. User confirms linking
   ↓
8. POST /auth/link-accounts
   ↓
9. Cognito: AdminLinkProviderForUser
   ↓
10. DynamoDB: Merge profiles
    ↓
11. ✅ DynamoDB: Delete PENDING_LINK record
    ↓
12. User signs out/in
    ↓
13. PreTokenGeneration: No PENDING_LINK found
    ↓
14. ✅ No custom claims added
    ↓
15. ✅ No linking prompt shown
```

### Desired Flow (With Both Fixes)

```
1. User authenticates (OTP)
   ↓
2. PostAuthentication detects duplicate Google account
   ↓
3. Creates PENDING_LINK record in DynamoDB
   ↓
4. PreTokenGeneration reads PENDING_LINK
   ↓
5. Adds custom:pending_link claim to JWT
   ↓
6. Frontend shows linking prompt
   ↓
7. User confirms linking
   ↓
8. POST /auth/link-accounts
   ↓
9. Cognito: AdminLinkProviderForUser
   ↓
10. DynamoDB: Merge profiles
    ↓
11. ✅ DynamoDB: Reassign applications to destination user
    ↓
12. ✅ DynamoDB: Delete PENDING_LINK record
    ↓
13. User signs out/in
    ↓
14. PreTokenGeneration: No PENDING_LINK found
    ↓
15. ✅ No custom claims added
    ↓
16. ✅ No linking prompt shown
    ↓
17. ✅ User sees all their applications
```

---

## Priority & Risk Assessment

### Fix 1: Application Reassignment

- **Priority**: 🔴 **HIGH** - Data loss issue
- **Risk**: 🟡 **MEDIUM** - Requires careful testing, but changes are isolated
- **Effort**: ~2 hours (implementation + tests)
- **User Impact**: Critical - Users lose their work without this

### Fix 2: PENDING_LINK Cleanup

- **Priority**: 🟡 **MEDIUM** - UX issue, not data loss
- **Risk**: 🟢 **LOW** - Simple change, already implemented
- **Effort**: ✅ Complete (~30 minutes)
- **User Impact**: Moderate - Annoying but not blocking

---

## Deployment Plan

### Phase 1: Deploy Fix 2 (PENDING_LINK Cleanup) ✅

1. ✅ Code changes complete
2. Run backend tests: `cd backend && pytest tests/test_link_accounts.py`
3. Deploy: `make deploy-dev`
4. Manual test: Link accounts → Sign out/in → Verify no prompt
5. Deploy to prod: `make deploy-prod`

### Phase 2: Implement & Deploy Fix 1 (Application Reassignment)

1. Implement `_reassign_applications()` function
2. Write unit tests
3. Write integration tests
4. Run all tests: `make test`
5. Deploy to dev: `make deploy-dev`
6. Manual test: Create apps → Link accounts → Verify apps visible
7. Deploy to prod: `make deploy-prod`

---

## Testing Checklist

### Fix 2: PENDING_LINK Cleanup

- [ ] Unit test: `test_delete_pending_link_after_successful_linking()`
- [ ] Unit test: `test_linking_succeeds_even_if_delete_fails()`
- [ ] Integration test: Link accounts → Refresh token → No custom claims
- [ ] Manual test: Full flow in dev environment

### Fix 1: Application Reassignment

- [ ] Unit test: `test_reassign_zero_applications()`
- [ ] Unit test: `test_reassign_one_application()`
- [ ] Unit test: `test_reassign_multiple_applications()`
- [ ] Unit test: `test_reassignment_continues_on_partial_failure()`
- [ ] Integration test: Create apps → Link → Verify ownership
- [ ] Manual test: Full flow in dev environment

---

## Rollback Plan

### If Fix 2 Causes Issues:

1. Revert Lambda code to previous version via AWS Console
2. Users can manually delete PENDING_LINK via DynamoDB console if needed
3. No data loss - just UX issue returns

### If Fix 1 Causes Issues:

1. Revert Lambda code to previous version
2. Applications remain with original owner (no worse than before)
3. Can manually reassign via DynamoDB console if needed

---

## Documentation Updates Needed

After both fixes:

1. Update `ACCOUNT_LINKING_COMPLETE.md` with new flow
2. Add troubleshooting section for orphaned apps
3. Document manual recovery procedures
4. Update API documentation

---

## Next Steps

1. ✅ **DONE**: Fix 2 implementation complete
2. **TODO**: Run tests for Fix 2
3. **TODO**: Deploy Fix 2 to dev
4. **TODO**: Implement Fix 1 (application reassignment)
5. **TODO**: Test both fixes together
6. **TODO**: Deploy to production

---

## Questions for User

1. Should we implement Fix 1 (application reassignment) now, or deploy Fix 2 first?
2. Do you want to add a "decline linking" endpoint as well?
3. Should we consolidate the two API endpoints (`/auth/link-accounts` and `/auth/confirm-link`) into one?
