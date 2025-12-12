# Backend Scripts

This directory contains utility scripts for database management and testing.

## Database Management Scripts

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

### Database Seeding

1. **Always use dry run first:**

   ```bash
   uv run python scripts/seed_db.py --dry-run
   ```

2. **Clean and reseed for fresh data:**

   ```bash
   uv run python scripts/seed_db.py --clean
   ```

3. **Verify seeded data:**
   - Check DynamoDB console for created items
   - Test application functionality with seeded data

## Troubleshooting

### "TABLE_NAME environment variable not set"

**Solution:** Set the environment variable:

```bash
export TABLE_NAME=MadeWithKiro-dev
```

### "Failed to seed database"

**Cause:** DynamoDB permissions or network issues

**Solution:**

- Check AWS credentials are configured
- Verify IAM permissions for DynamoDB
- Check network connectivity to AWS

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
