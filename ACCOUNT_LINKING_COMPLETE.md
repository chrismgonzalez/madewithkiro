# Account Linking Feature - Complete ✅

## Summary

The Cognito-level account linking feature is now fully functional. Users can link their Google and email (OTP) accounts when they sign in with the same email address.

## What Was Fixed

### Issue: `invalid_grant` Error After Linking

After linking accounts, signing in with Google returned an `invalid_grant` error from Cognito's token endpoint.

### Root Cause

1. During linking, we delete the Google user profile in Cognito
2. The OAuth session remained active and referenced the deleted user
3. When trying to exchange the authorization code for tokens, Cognito failed

### Solution Implemented

1. **Redirect after linking** - Instead of reloading the page, we redirect to home with a success message
2. **Clear OAuth session** - The redirect clears the active OAuth session
3. **Set user status** - Added `admin_set_user_password` to ensure OTP user is in CONFIRMED status (not FORCE_CHANGE_PASSWORD)
4. **Success notification** - Show toast message: "Accounts linked successfully! You can now sign in with either Google or email."

## Complete Flow

### 1. Duplicate Detection

- User signs in with Google → creates Google profile
- User signs out
- User signs in with OTP (same email) → PostAuthentication detects duplicate
- PreTokenGeneration adds custom claims to JWT: `custom:pending_link = "true"`

### 2. User Confirmation

- Frontend detects `custom:pending_link` in ID token
- Shows AccountLinkDialog with explanation
- User clicks "Yes, Link Accounts"

### 3. Account Linking

- Frontend calls `POST /auth/confirm-link`
- Backend:
  - Deletes Google user profile
  - Links Google identity to OTP user using `AdminLinkProviderForUser`
  - Sets permanent password on OTP user (ensures CONFIRMED status)
  - Merges profiles (copies firstName, lastName, awsBuilderHandle, etc.)
  - Deletes old Google profile from DynamoDB
  - Updates authMethods to `['google', 'email']`

### 4. Post-Linking

- User is redirected to home page with `?linked=true`
- Success toast appears
- User can now sign in with either Google or email
- Both methods access the same profile

## Files Modified

### Backend

- ✅ `backend/auth/post_authentication.py` - Duplicate detection, skip for linked users
- ✅ `backend/auth/pre_token_generation.py` - Add custom claims to JWT
- ✅ `backend/auth/confirm_link_accounts.py` - Execute linking, merge profiles, set user status
- ✅ `template.yaml` - Lambda configuration and IAM permissions

### Frontend

- ✅ `src/contexts/AuthContext.tsx` - Parse custom claims from ID token
- ✅ `src/components/AccountLinkDialog.tsx` - User confirmation dialog, redirect after linking
- ✅ `src/components/Layout.tsx` - Success toast notification
- ✅ `src/services/accountLinking.ts` - API service

## Testing Checklist

- ✅ Sign in with Google first, then OTP → shows link dialog
- ✅ Confirm linking → redirects with success message
- ✅ Sign in with Google after linking → works (no invalid_grant)
- ✅ Sign in with OTP after linking → works
- ✅ Profile has both auth methods: `['google', 'email']`
- ✅ No duplicate detection after linking (identities attribute detected)
- ✅ Profile data preserved (firstName, lastName, awsBuilderHandle, etc.)

## Key Technical Details

### Cognito Account Linking

- Must delete federated user profile before linking (per AWS docs)
- Use `AdminLinkProviderForUser` with correct parameters:
  - DestinationUser: Cognito user (OTP user)
  - SourceUser: Google identity with `Cognito_Subject` attribute
- OTP user becomes primary, Google becomes secondary auth method

### Custom Claims

- Custom claims only available in JWT token payload, not user attributes
- Must parse from `idToken.payload['custom:pending_link']`
- PreTokenGeneration trigger adds claims before token issuance

### User Status

- After linking, set permanent password to ensure CONFIRMED status
- This prevents FORCE_CHANGE_PASSWORD status that blocks authentication
- Password is random and not used (OTP and Google don't need passwords)

### OAuth Session Management

- Redirect after linking clears OAuth session
- User must sign in again to establish fresh session
- This prevents `invalid_grant` errors

## Deployment

Backend changes deployed to dev environment:

```bash
AWS_PROFILE=mwkprod sam build
AWS_PROFILE=mwkprod sam deploy --config-env dev
```

Frontend changes deployed via Vite build:

```bash
bun run build
# Upload to S3 and invalidate CloudFront cache
```

## Next Steps (Optional Enhancements)

1. Add monitoring metrics for linking success/failure rates
2. Add CloudWatch alarms for linking errors
3. Create user guide with screenshots
4. Add integration tests for complete flow
5. Consider adding "unlink accounts" feature
6. Add email notification when accounts are linked

## Status: ✅ COMPLETE AND WORKING
