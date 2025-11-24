# AuthContext Tests

## Current Status

### ✅ Completed Tests

- **AuthContext.profileAttributes.test.tsx** - Task 16: Profile attribute retrieval tests (Amplify v6 API)
  - All 9 tests passing
  - Tests Google and GitHub profile attribute extraction
  - Tests name parsing logic
  - Tests edge cases

### ⚠️ Tests Requiring Updates

The original `AuthContext.test.tsx` file was written for Amplify v5 API and needs to be updated to use Amplify v6 API as part of their respective tasks:

- **Task 5**: Authentication context tests (signIn, signOut, Hub events)
- **Task 6**: useAuth hook tests
- **Task 8**: OAuth callback handler tests
- **Task 9**: Protected route tests
- **Task 15**: Session persistence tests

These tests should be updated when implementing or reviewing those specific tasks to use the correct Amplify v6 API:

- Replace `Auth.currentAuthenticatedUser()` with `getCurrentUser()`
- Replace `Auth.userAttributes()` with `fetchUserAttributes()` (returns object, not array)
- Replace `Auth.signOut()` with `signOut()`
- Replace `Auth.currentSession()` with `fetchAuthSession()`
- Replace `Auth.federatedSignIn()` with `signInWithRedirect()`

## Test Organization

Tests are organized by feature/task:

- `AuthContext.profileAttributes.test.tsx` - Profile attribute retrieval (Task 16)
- Future: Separate test files for other authentication features as they are implemented

## Running Tests

```bash
# Run all AuthContext tests
bun run test src/contexts/__tests__/

# Run specific test file
bun run test src/contexts/__tests__/AuthContext.profileAttributes.test.tsx
```
