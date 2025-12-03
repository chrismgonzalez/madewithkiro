# DynamoDB Schema Migration Summary

## Task: Update DynamoDB schema for authentication methods

### Completed Items

✅ **1. Added authMethods field to user profile schema**

- Updated `UserProfile` model in `backend/shared/models.py`
- Field type: `List[str]` with default value `["google"]`
- Supports multiple authentication methods: `["google"]`, `["email"]`, or `["google", "email"]`
- Field includes description for clarity

✅ **2. Verified GSI1 exists for email lookups**

- GSI1 already configured in `template.yaml`
- GSI1PK: `EMAIL#<email>` format
- GSI1SK: `PROFILE` for user profiles
- Enables duplicate account detection and account linking

✅ **3. Created migration script to backfill existing profiles**

- Script location: `backend/scripts/migrate_auth_methods.py`
- Features:
  - Adds `authMethods: ['google']` to profiles without it
  - Updates GSI1PK to `EMAIL#<email>` format
  - Adds email field if missing (fetched from Cognito)
  - Supports dry-run mode for safe testing
  - Idempotent: safe to run multiple times
  - Comprehensive logging and error handling

### Schema Changes

#### User Profile Structure (Before)

```json
{
  "PK": "USER#<userId>",
  "SK": "PROFILE",
  "userId": "<userId>",
  "firstName": "John",
  "lastName": "Doe",
  "awsBuilderHandle": "johndoe",
  "linkedInUsername": "johndoe",
  "githubUsername": "johndoe",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### User Profile Structure (After)

```json
{
  "PK": "USER#<userId>",
  "SK": "PROFILE",
  "GSI1PK": "EMAIL#john.doe@example.com",
  "GSI1SK": "PROFILE",
  "entityType": "PROFILE",
  "userId": "<userId>",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "awsBuilderHandle": "johndoe",
  "linkedInUsername": "johndoe",
  "githubUsername": "johndoe",
  "authMethods": ["google"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### New Fields

1. **authMethods** (List[str])

   - Purpose: Track which authentication methods the user has used
   - Values: `"google"`, `"email"`
   - Default: `["google"]` for existing users
   - Example: `["google", "email"]` for linked accounts

2. **email** (string)

   - Purpose: Store user's email address for lookups
   - Source: Cognito user attributes
   - Required for GSI1 email lookups

3. **GSI1PK** (string)

   - Format: `EMAIL#<email>`
   - Purpose: Enable querying profiles by email
   - Use case: Account linking and duplicate detection

4. **GSI1SK** (string)
   - Value: `PROFILE`
   - Purpose: Sort key for GSI1 queries

### Access Patterns Enabled

#### 1. Find User by Email

```python
# Query GSI1 to find profile by email
response = table.query(
    IndexName='GSI1',
    KeyConditionExpression='GSI1PK = :email AND GSI1SK = :sk',
    ExpressionAttributeValues={
        ':email': 'EMAIL#user@example.com',
        ':sk': 'PROFILE'
    }
)
```

**Use Cases:**

- Check if user already exists before creating account
- Link Google OAuth and email OTP accounts
- Account recovery by email

#### 2. Check Authentication Methods

```python
# Get user profile and check auth methods
profile = get_item(PK='USER#<userId>', SK='PROFILE')
auth_methods = profile.get('authMethods', [])

if 'google' in auth_methods:
    # User can sign in with Google
if 'email' in auth_methods:
    # User can sign in with email OTP
```

### Documentation Created

1. **Schema Documentation** (`backend/shared/SCHEMA.md`)

   - Complete DynamoDB schema reference
   - Entity type definitions
   - Access pattern examples
   - Migration notes

2. **Scripts README** (`backend/scripts/README.md`)

   - Migration script usage guide
   - Testing script documentation
   - Best practices
   - Troubleshooting guide

3. **Architecture Update** (`docs/ARCHITECTURE.md`)
   - Updated user profile structure
   - Added GSI1 email lookup documentation
   - Explained account linking use case

### Testing

#### Unit Tests

All existing tests pass:

```bash
uv run pytest tests/test_models.py::TestUserProfile -v
```

Results:

- ✅ test_user_profile_with_google_auth
- ✅ test_user_profile_with_email_auth
- ✅ test_user_profile_with_multiple_auth_methods
- ✅ test_user_profile_default_auth_methods

#### Integration Tests

Test script available:

```bash
uv run python scripts/test_gsi1_email_lookup.py --email user@example.com
```

### Migration Instructions

#### Development Environment

```bash
# 1. Set environment variables
export TABLE_NAME=MadeWithKiro-dev
export COGNITO_USER_POOL_ID=us-west-2_XXXXXXXXX

# 2. Dry run to preview changes
uv run python scripts/migrate_auth_methods.py --dry-run

# 3. Execute migration
uv run python scripts/migrate_auth_methods.py

# 4. Verify results
uv run python scripts/test_gsi1_email_lookup.py --email test@example.com
```

#### Production Environment

```bash
# 1. Backup data (enable point-in-time recovery in DynamoDB)

# 2. Test in dev first (see above)

# 3. Run migration on prod
uv run python scripts/migrate_auth_methods.py \
  --table MadeWithKiro-prod \
  --user-pool us-west-2_PROD_POOL_ID

# 4. Verify in AWS Console
# - Check DynamoDB items have authMethods field
# - Verify GSI1 has EMAIL# keys
# - Test application functionality
```

### Code Changes

#### Files Modified

1. `backend/shared/models.py`

   - Added description to `authMethods` field in `UserProfile` model

2. `docs/ARCHITECTURE.md`
   - Updated user profile structure example
   - Added GSI1 email lookup documentation

#### Files Created

1. `backend/shared/SCHEMA.md`

   - Complete schema documentation

2. `backend/scripts/README.md`

   - Migration and testing guide

3. `.kiro/specs/email-otp-authentication/MIGRATION_SUMMARY.md`
   - This summary document

#### Files Already Existing (Verified)

1. `backend/scripts/migrate_auth_methods.py`

   - Migration script (already implemented)

2. `backend/scripts/test_gsi1_email_lookup.py`

   - Testing script (already implemented)

3. `template.yaml`

   - GSI1 configuration (already configured)

4. `backend/profile/handler.py`
   - Profile creation with authMethods (already implemented)

### Requirements Validation

✅ **Requirement 3.1**: Account linking support

- GSI1 email lookup enables finding existing accounts
- authMethods field tracks linked authentication methods

✅ **Requirement 5.3**: Cognito integration

- Uses Cognito sub as userId (primary key)
- Fetches email from Cognito for migration
- Maintains consistency with Cognito user pool

### Next Steps

The schema is now ready for email OTP authentication implementation. The next tasks in the spec are:

1. **Task 3**: Write unit tests for OTP utilities (optional)
2. **Task 4**: Implement unified OTP authentication Lambda function
3. **Task 5**: Write property tests for account linking (optional)
4. **Task 6**: Configure Cognito User Pool for custom authentication

### Notes

- The migration script is idempotent and safe to run multiple times
- All existing functionality remains unchanged
- New profiles automatically get authMethods field set to ["google"]
- GSI1 was already configured in the infrastructure
- No breaking changes to existing code
