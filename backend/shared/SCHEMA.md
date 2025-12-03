# DynamoDB Schema Documentation

## Table: MadeWithKiro-{Environment}

### Primary Key Structure

- **PK (Partition Key)**: `USER#<userId>` or `APP#<appId>`
- **SK (Sort Key)**: `PROFILE` or `METADATA`

### Global Secondary Index (GSI1)

GSI1 supports multiple access patterns:

#### 1. User Applications Query

- **GSI1PK**: `USER#<userId>`
- **GSI1SK**: `APP#<appId>`
- **Purpose**: Query all applications created by a specific user

#### 2. Email Lookup for Account Linking

- **GSI1PK**: `EMAIL#<email>`
- **GSI1SK**: `PROFILE`
- **Purpose**: Find existing user profiles by email address
- **Use Cases**:
  - Prevent duplicate accounts across authentication methods
  - Link Google OAuth and email OTP authentication
  - Account recovery and verification

## Entity Types

### User Profile

**Primary Keys:**

- PK: `USER#<userId>`
- SK: `PROFILE`

**GSI1 Keys:**

- GSI1PK: `EMAIL#<email>`
- GSI1SK: `PROFILE`

**Attributes:**

```json
{
  "PK": "USER#<cognitoUserId>",
  "SK": "PROFILE",
  "GSI1PK": "EMAIL#<email>",
  "GSI1SK": "PROFILE",
  "entityType": "PROFILE",
  "userId": "<cognitoUserId>",
  "email": "<email>",
  "firstName": "<string>",
  "lastName": "<string>",
  "awsBuilderHandle": "<string>",
  "linkedInUsername": "<string|null>",
  "githubUsername": "<string|null>",
  "authMethods": ["google", "email"],
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>"
}
```

**Field Descriptions:**

- `userId`: Cognito user identifier (sub claim from JWT)
- `email`: User's email address (verified by Cognito)
- `firstName`: User's first name
- `lastName`: User's last name
- `awsBuilderHandle`: AWS Builder Center handle (required)
- `linkedInUsername`: LinkedIn username (optional)
- `githubUsername`: GitHub username (optional)
- `authMethods`: Array of authentication methods used (e.g., ["google"], ["email"], ["google", "email"])
- `createdAt`: Profile creation timestamp
- `updatedAt`: Last update timestamp

**Authentication Methods:**

- `"google"`: Google OAuth authentication
- `"email"`: Email OTP authentication
- Multiple methods indicate linked accounts

### Application

**Primary Keys:**

- PK: `APP#<appId>`
- SK: `METADATA`

**GSI1 Keys:**

- GSI1PK: `USER#<userId>`
- GSI1SK: `APP#<appId>`

**Attributes:**

```json
{
  "PK": "APP#<appId>",
  "SK": "METADATA",
  "GSI1PK": "USER#<userId>",
  "GSI1SK": "APP#<appId>",
  "entityType": "APPLICATION",
  "appId": "<uuid>",
  "userId": "<cognitoUserId>",
  "name": "<string>",
  "description": "<string>",
  "appUrl": "<url|null>",
  "githubUrl": "<url>",
  "tags": ["<string>"],
  "createdAt": "<ISO8601 timestamp>"
}
```

## Access Patterns

### 1. Get User Profile by User ID

```python
get_item(PK='USER#<userId>', SK='PROFILE')
```

### 2. Find User Profile by Email

```python
query(
    IndexName='GSI1',
    KeyConditionExpression='GSI1PK = :email AND GSI1SK = :sk',
    ExpressionAttributeValues={
        ':email': 'EMAIL#user@example.com',
        ':sk': 'PROFILE'
    }
)
```

### 3. Get All Applications by User

```python
query(
    IndexName='GSI1',
    KeyConditionExpression='GSI1PK = :userId',
    ExpressionAttributeValues={
        ':userId': 'USER#<userId>'
    }
)
```

### 4. Get Single Application

```python
get_item(PK='APP#<appId>', SK='METADATA')
```

### 5. Scan All Applications (Public Gallery)

```python
scan(
    FilterExpression='SK = :sk',
    ExpressionAttributeValues={
        ':sk': 'METADATA'
    }
)
```

## Migration Notes

### Adding authMethods Field

The `authMethods` field was added to support multiple authentication methods (Google OAuth and email OTP).

**Migration Script:** `backend/scripts/migrate_auth_methods.py`

**What it does:**

1. Scans all user profiles in DynamoDB
2. Adds `authMethods: ['google']` to profiles that don't have it
3. Updates GSI1PK to `EMAIL#<email>` format for email lookups
4. Adds email field if missing (fetched from Cognito)

**Usage:**

```bash
# Dry run (no changes)
python backend/scripts/migrate_auth_methods.py --dry-run

# Execute migration
python backend/scripts/migrate_auth_methods.py

# With custom table and user pool
python backend/scripts/migrate_auth_methods.py \
  --table MadeWithKiro-prod \
  --user-pool us-west-2_XXXXXXXXX
```

**Environment Variables:**

- `TABLE_NAME`: DynamoDB table name (default: MadeWithKiro-dev)
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID (required)

## Testing Email Lookups

**Test Script:** `backend/scripts/test_gsi1_email_lookup.py`

Tests the GSI1 email lookup functionality:

```bash
python backend/scripts/test_gsi1_email_lookup.py --email user@example.com
```

## Schema Evolution

### Version 1.0 (Initial)

- Basic user profiles with Google OAuth
- Applications with tags
- GSI1 for user applications

### Version 1.1 (Current)

- Added `authMethods` field to user profiles
- Added `email` field to user profiles
- Added GSI1 email lookup (GSI1PK: EMAIL#<email>)
- Support for multiple authentication methods
- Account linking capability
