# Backend Scripts

This directory contains utility scripts for database management and testing.

## Migration Scripts

### migrate_auth_methods.py

Backfills existing user profiles with the `authMethods` field and updates GSI1 keys for email lookups.

**Purpose:**

- Add `authMethods: ['google']` to existing profiles
- Update GSI1PK to `EMAIL#<email>` format
- Add email field if missing (fetched from Cognito)

**Usage:**

```bash
# Dry run (preview changes without applying)
uv run python scripts/migrate_auth_methods.py --dry-run

# Execute migration on dev environment
export TABLE_NAME=MadeWithKiro-dev
export COGNITO_USER_POOL_ID=us-west-2_XXXXXXXXX
uv run python scripts/migrate_auth_methods.py

# Execute migration on prod environment
uv run python scripts/migrate_auth_methods.py \
  --table MadeWithKiro-prod \
  --user-pool us-west-2_YYYYYYYYY
```

**Environment Variables:**

- `TABLE_NAME`: DynamoDB table name (default: MadeWithKiro-dev)
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID (required)

**What it does:**

1. Scans all user profiles in DynamoDB
2. For each profile without `authMethods`:
   - Adds `authMethods: ['google']`
   - Updates `updatedAt` timestamp
3. For each profile without proper GSI1PK:
   - Updates GSI1PK to `EMAIL#<email>` format
4. For each profile without email:
   - Fetches email from Cognito User Pool
   - Adds email field to profile

**Output:**

```
Starting migration for table: MadeWithKiro-dev
User Pool ID: us-west-2_XXXXXXXXX
Dry run: False
Scanning for user profiles...
Found 5 profiles
Adding authMethods to profile user-123
Updating GSI1PK for profile user-123
Successfully updated profile user-123
...
Migration complete!
Total profiles: 5
Updated: 5
Failed: 0
Already up to date: 0
```

**Safety:**

- Always run with `--dry-run` first to preview changes
- Idempotent: safe to run multiple times
- Skips profiles that are already up to date
- Logs all operations for audit trail

## Testing Scripts

### test_gsi1_email_lookup.py

Tests the GSI1 email lookup functionality to verify account linking works correctly.

**Usage:**

```bash
# Test email lookup
export TABLE_NAME=MadeWithKiro-dev
uv run python scripts/test_gsi1_email_lookup.py --email user@example.com

# Test with custom table
uv run python scripts/test_gsi1_email_lookup.py \
  --table MadeWithKiro-prod \
  --email user@example.com
```

**What it tests:**

1. Queries GSI1 by email to find existing profiles
2. Verifies duplicate email detection
3. Displays profile information including auth methods

**Output:**

```
Testing GSI1 email lookup for: user@example.com
Table: MadeWithKiro-dev

✓ Found exactly 1 profile with email user@example.com
Profile details:
  User ID: user-123
  Name: John Doe
  Auth Methods: ['google']
  GSI1PK: EMAIL#user@example.com
  Email: user@example.com

✓ Email lookup test passed!
```

### seed_db.py

Seeds the database with test data for development.

**Usage:**

```bash
# Seed database with test data
export TABLE_NAME=MadeWithKiro-dev
uv run python scripts/seed_db.py

# Clean existing data and reseed
uv run python scripts/seed_db.py --clean

# Dry run
uv run python scripts/seed_db.py --dry-run
```

**What it creates:**

- 1 test user profile (test-user-001)
- 10+ sample applications with various tags
- Proper GSI1 keys for testing queries

## Best Practices

### Before Running Migrations

1. **Backup your data:**

   ```bash
   # Enable point-in-time recovery in DynamoDB console
   # Or export table to S3
   ```

2. **Test in dev first:**

   ```bash
   # Always test migrations in dev environment
   uv run python scripts/migrate_auth_methods.py \
     --table MadeWithKiro-dev \
     --user-pool us-west-2_DEV_POOL \
     --dry-run
   ```

3. **Review dry run output:**

   - Check number of profiles to be updated
   - Verify update expressions look correct
   - Ensure no unexpected changes

4. **Run migration:**

   ```bash
   # Remove --dry-run flag to execute
   uv run python scripts/migrate_auth_methods.py \
     --table MadeWithKiro-dev \
     --user-pool us-west-2_DEV_POOL
   ```

5. **Verify results:**
   ```bash
   # Test email lookups work
   uv run python scripts/test_gsi1_email_lookup.py \
     --table MadeWithKiro-dev \
     --email test@example.com
   ```

### After Running Migrations

1. **Verify in AWS Console:**

   - Check DynamoDB table items
   - Verify GSI1 has correct keys
   - Check item counts match expectations

2. **Test application functionality:**

   - Test user login
   - Test profile creation
   - Test account linking (if applicable)

3. **Monitor CloudWatch logs:**
   - Check for any errors
   - Verify migration completed successfully

## Troubleshooting

### "COGNITO_USER_POOL_ID environment variable not set"

**Solution:** Set the environment variable or use the `--user-pool` flag:

```bash
export COGNITO_USER_POOL_ID=us-west-2_XXXXXXXXX
# or
uv run python scripts/migrate_auth_methods.py --user-pool us-west-2_XXXXXXXXX
```

### "Email not found for user"

**Cause:** User doesn't have email attribute in Cognito

**Solution:**

- Verify user exists in Cognito User Pool
- Check user has email attribute
- Ensure email is verified

### "Failed to update profile"

**Cause:** DynamoDB permissions or network issues

**Solution:**

- Check AWS credentials are configured
- Verify IAM permissions for DynamoDB
- Check network connectivity to AWS

### Migration runs but no profiles updated

**Cause:** Profiles already have authMethods field

**Solution:** This is expected behavior. The migration is idempotent and skips profiles that are already up to date.

## Development

### Adding New Migration Scripts

1. Create new script in `backend/scripts/`
2. Follow existing patterns:
   - Use argparse for CLI arguments
   - Support `--dry-run` flag
   - Use structured logging
   - Make idempotent
3. Add documentation to this README
4. Test thoroughly in dev environment

### Testing Scripts Locally

```bash
# Install dependencies
cd backend
uv sync

# Run script
uv run python scripts/your_script.py --help
```
