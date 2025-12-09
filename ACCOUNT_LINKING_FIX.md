# Account Linking Fix - Invalid Grant Error

## Problem

After linking Google and OTP accounts, signing in with Google returns `invalid_grant` error from Cognito's token endpoint.

## Root Cause

When we link accounts, we:

1. Delete the Google user profile in Cognito
2. Link the Google identity to the OTP user

However, the OAuth session is still active and references the deleted Google user, causing the `invalid_grant` error when trying to exchange the authorization code for tokens.

## Solution Implemented

### 1. Frontend Changes (✅ COMPLETED)

**File: `src/components/AccountLinkDialog.tsx`**

- After successful linking, redirect to home page with `?linked=true` parameter
- This clears the OAuth session and shows a success message
- User must sign in again (with either method) to establish a fresh session

**File: `src/components/Layout.tsx`**

- Added success toast notification when `?linked=true` is detected
- Shows: "Accounts linked successfully! You can now sign in with either Google or email."
- Auto-dismisses after 7 seconds

### 2. Backend Changes (✅ ALREADY DEPLOYED)

**File: `backend/auth/post_authentication.py`**

- Already has fix to skip duplicate detection for linked users
- Checks for `identities` attribute or username starting with "Google\_"
- This prevents the duplicate detection loop after linking

**File: `backend/auth/confirm_link_accounts.py`**

- Properly merges profiles from Google to OTP user
- Copies: firstName, lastName, awsBuilderHandle, linkedInUsername, githubUsername
- Deletes old Google profile after merge

## Testing Flow

### Test 1: Link Accounts (OTP → Google)

1. Sign in with Google first → creates Google profile
2. Sign out
3. Sign in with OTP (same email) → detects duplicate, shows dialog
4. Click "Yes, Link Accounts" → redirects to home with success message
5. Sign in with Google → should work (fresh OAuth session)
6. Verify profile has both auth methods

### Test 2: Link Accounts (Google → OTP)

1. Sign in with OTP first → creates OTP profile
2. Sign out
3. Sign in with Google (same email) → detects duplicate, shows dialog
4. Click "Yes, Link Accounts" → redirects to home with success message
5. Sign in with OTP → should work
6. Sign in with Google → should work
7. Verify profile has both auth methods

### Test 3: Verify No Duplicate Detection After Linking

1. After linking, sign in with Google
2. PostAuthentication should detect `identities` attribute
3. Should skip duplicate detection
4. Should NOT show linking dialog again

## Deployment Commands

If backend changes need to be deployed:

```bash
# Build SAM application
AWS_PROFILE=mwkprod sam build

# Deploy to dev environment
AWS_PROFILE=mwkprod sam deploy --config-env dev

# View logs if needed
AWS_PROFILE=mwkprod sam logs -n PostAuthenticationFunctionForOTP --stack-name madewithkiro-dev --tail
```

## Expected Behavior After Fix

1. **First-time linking**: User sees dialog, confirms, gets redirected to home with success message
2. **After linking**: User can sign in with either Google or OTP without seeing dialog again
3. **No invalid_grant errors**: Fresh OAuth session after redirect prevents token exchange errors
4. **Profile merge**: All data from Google profile is preserved in the OTP profile

## Files Modified

- ✅ `src/components/AccountLinkDialog.tsx` - Redirect after linking
- ✅ `src/components/Layout.tsx` - Success toast notification
- ✅ `backend/auth/post_authentication.py` - Skip duplicate detection for linked users (already deployed)
- ✅ `backend/auth/confirm_link_accounts.py` - Profile merge logic (already deployed)

## Notes

- The `invalid_grant` error is expected if user tries to complete OAuth flow after their Google user was deleted
- The fix ensures user is redirected before completing the OAuth flow
- User must sign in again to establish a fresh OAuth session
- This is the correct behavior per AWS Cognito's account linking requirements
