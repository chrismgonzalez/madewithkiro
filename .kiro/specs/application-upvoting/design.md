# Design Document: Application Upvoting

## Overview

This design document specifies the technical implementation of the application upvoting feature for the MadeWithKiro platform. The feature enables authenticated users to upvote applications they find interesting, with upvote counts displayed publicly and user-specific upvote status available to authenticated users.

### Goals

- Enable users to express appreciation for applications through upvotes
- Track upvote counts per application for future ranking and display features
- Maintain data consistency between user upvote records and aggregate counts
- Follow existing architectural patterns (single-table DynamoDB, Python Lambda handlers)
- Provide RESTful API endpoints for upvote operations

### Non-Goals

- Downvoting or negative feedback mechanisms
- Upvote analytics or trending algorithms (future enhancement)
- Real-time upvote notifications
- Upvote history or timeline features

## Architecture

### System Components

The upvoting feature integrates into the existing MadeWithKiro architecture:

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│ CloudFront  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │ (JWT Authorization)
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Application Handler │ (Lambda)
│  - POST /applications/{appId}/upvote
│  - DELETE /applications/{appId}/upvote
│  - GET /applications/{appId}/upvote
│  - GET /applications (enhanced)
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│  DynamoDB   │
│  - User upvote records (PK=USER#{userId}, SK=UPVOTE#{appId})
│  - Application metadata with upvoteCount
│  - GSI1 for querying upvotes by application
└─────────────┘
```

### Design Decisions

1. **Single-Table Design**: Upvote records are stored in the existing MadeWithKiro DynamoDB table using composite keys, maintaining consistency with the current schema pattern.

2. **Denormalized Upvote Count**: The upvote count is stored as an attribute on the application record for fast read access. This trades write complexity for read performance, which is appropriate given that reads (viewing applications) are far more frequent than writes (upvoting).

3. **Atomic Updates**: DynamoDB's atomic counter operations ensure upvote counts remain consistent even under concurrent updates.

4. **GSI for Application Queries**: GSI1 enables efficient querying of all upvotes for a specific application, supporting future features like "who upvoted this" or upvote verification.

5. **Idempotent Operations**: Attempting to upvote an already-upvoted application returns an error rather than silently succeeding, providing clear feedback to the client.

## Components and Interfaces

### API Endpoints

#### POST /applications/{appId}/upvote

Creates an upvote record for the authenticated user.

**Request:**

- Path Parameter: `appId` (string, UUID)
- Headers: `Authorization: Bearer <JWT>`
- Body: None

**Response (201 Created):**

```json
{
  "data": {
    "appId": "uuid",
    "userId": "cognito-sub",
    "upvotedAt": "2024-01-15T10:30:00Z",
    "upvoteCount": 42
  },
  "error": null
}
```

**Error Responses:**

- 401 Unauthorized: Missing or invalid JWT
- 404 Not Found: Application does not exist
- 409 Conflict: User has already upvoted this application
- 500 Internal Server Error: Unexpected error

#### DELETE /applications/{appId}/upvote

Removes an upvote record for the authenticated user.

**Request:**

- Path Parameter: `appId` (string, UUID)
- Headers: `Authorization: Bearer <JWT>`
- Body: None

**Response (200 OK):**

```json
{
  "data": {
    "appId": "uuid",
    "userId": "cognito-sub",
    "upvoteCount": 41
  },
  "error": null
}
```

**Error Responses:**

- 401 Unauthorized: Missing or invalid JWT
- 404 Not Found: Application or upvote does not exist
- 500 Internal Server Error: Unexpected error

#### GET /applications/{appId}/upvote

Checks if the authenticated user has upvoted the application.

**Request:**

- Path Parameter: `appId` (string, UUID)
- Headers: `Authorization: Bearer <JWT>`
- Body: None

**Response (200 OK):**

```json
{
  "data": {
    "appId": "uuid",
    "hasUpvoted": true,
    "upvotedAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Error Responses:**

- 401 Unauthorized: Missing or invalid JWT
- 404 Not Found: Application does not exist
- 500 Internal Server Error: Unexpected error

#### GET /applications (Enhanced)

The existing endpoint is enhanced to include upvote information.

**Response (200 OK):**

```json
{
  "data": [
    {
      "appId": "uuid",
      "name": "My Application",
      "description": "...",
      "upvoteCount": 42,
      "hasUpvoted": true,
      "...": "other fields"
    }
  ],
  "error": null
}
```

**Notes:**

- `upvoteCount` is always included (defaults to 0 if not set)
- `hasUpvoted` is only included for authenticated requests
- Unauthenticated requests omit `hasUpvoted`

#### GET /applications/{appId} (Enhanced)

The existing endpoint is enhanced to include upvote information.

**Response (200 OK):**

```json
{
  "data": {
    "appId": "uuid",
    "name": "My Application",
    "description": "...",
    "upvoteCount": 42,
    "hasUpvoted": true,
    "...": "other fields"
  },
  "error": null
}
```

### Lambda Handler Functions

#### upvote_application(app_id: str, user_id: str) -> Dict[str, Any]

Creates an upvote record and increments the application's upvote count.

**Algorithm:**

1. Verify application exists (get_item for APP#{appId})
2. Check if user has already upvoted (get_item for USER#{userId}, SK=UPVOTE#{appId})
3. If already upvoted, return 409 Conflict
4. Create upvote record with timestamp
5. Atomically increment application's upvoteCount using update_item with ADD operation
6. Return success response with new upvote count

**Error Handling:**

- Application not found → 404
- Already upvoted → 409
- DynamoDB errors → 500

#### remove_upvote(app_id: str, user_id: str) -> Dict[str, Any]

Removes an upvote record and decrements the application's upvote count.

**Algorithm:**

1. Verify application exists
2. Check if upvote record exists
3. If no upvote exists, return 404
4. Delete upvote record
5. Atomically decrement application's upvoteCount (with minimum value of 0)
6. Return success response with new upvote count

**Error Handling:**

- Application not found → 404
- Upvote not found → 404
- DynamoDB errors → 500

#### check_upvote_status(app_id: str, user_id: str) -> Dict[str, Any]

Checks if a user has upvoted an application.

**Algorithm:**

1. Verify application exists
2. Query for upvote record (USER#{userId}, SK=UPVOTE#{appId})
3. Return hasUpvoted boolean and timestamp if exists

**Error Handling:**

- Application not found → 404
- DynamoDB errors → 500

#### enrich_applications_with_upvotes(applications: List[Dict], user_id: Optional[str]) -> List[Dict]

Enriches application data with upvote information.

**Algorithm:**

1. For each application, add upvoteCount (default to 0 if not present)
2. If user_id provided, batch query user's upvote records
3. Add hasUpvoted field to each application based on query results
4. Return enriched application list

### Shared Utilities

The implementation will use existing shared utilities:

- `dynamodb_utils.py`: get_item, put_item, update_item, delete_item, query_by_pk
- `error_handler.py`: sanitized_error_response, success_response, handle_not_found, handle_conflict
- `logger.py`: Structured logging with PII filtering

## Data Models

### DynamoDB Schema

#### User Upvote Record

Stores individual user upvotes for applications.

**Primary Keys:**

- PK: `USER#{userId}` (Cognito sub)
- SK: `UPVOTE#{appId}` (Application UUID)

**GSI1 Keys:**

- GSI1PK: `APP#{appId}`
- GSI1SK: `UPVOTE#{userId}`

**Attributes:**

```json
{
  "PK": "USER#cognito-sub-123",
  "SK": "UPVOTE#app-uuid-456",
  "GSI1PK": "APP#app-uuid-456",
  "GSI1SK": "UPVOTE#cognito-sub-123",
  "entityType": "UPVOTE",
  "userId": "cognito-sub-123",
  "appId": "app-uuid-456",
  "upvotedAt": "2024-01-15T10:30:00Z"
}
```

**Access Patterns:**

1. Check if user upvoted application: `get_item(PK=USER#{userId}, SK=UPVOTE#{appId})`
2. Get all upvotes by user: `query(PK=USER#{userId}, SK begins_with UPVOTE#)`
3. Get all upvotes for application: `query(GSI1, GSI1PK=APP#{appId}, GSI1SK begins_with UPVOTE#)`

#### Application Record (Enhanced)

The existing application record is enhanced with an upvote count attribute.

**Primary Keys:**

- PK: `APP#{appId}`
- SK: `METADATA`

**New Attribute:**

- `upvoteCount`: Number (default: 0)

**Example:**

```json
{
  "PK": "APP#app-uuid-456",
  "SK": "METADATA",
  "GSI1PK": "USER#cognito-sub-123",
  "GSI1SK": "APP#2024-01-15T10:00:00Z#app-uuid-456",
  "entityType": "APPLICATION",
  "appId": "app-uuid-456",
  "userId": "cognito-sub-123",
  "userName": "John Doe",
  "name": "My Application",
  "description": "...",
  "upvoteCount": 42,
  "...": "other fields"
}
```

### Pydantic Models

No new request models are needed (upvote operations have no request body). Response models will be defined inline in the handler.

### Data Consistency Guarantees

1. **Atomic Counter Updates**: DynamoDB's ADD operation ensures upvoteCount increments/decrements are atomic, preventing race conditions.

2. **Eventual Consistency**: The upvoteCount may briefly be inconsistent with the actual number of upvote records during concurrent operations, but will converge to the correct value.

3. **Idempotency**: Duplicate upvote attempts are rejected with 409 Conflict, preventing double-counting.

4. **Minimum Value**: The decrement operation ensures upvoteCount never goes below 0, even if upvote records are manually deleted.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified and eliminated:

- **1.5** (store both record and count) is subsumed by **1.1** and **1.2**
- **2.4** (unauthenticated remove) is redundant with **1.4** (authentication applies to all protected endpoints)
- **4.3** (upvoteCount in sorted results) is redundant with **3.2** (upvoteCount always included)
- **6.1** (verify authentication) is redundant with **1.4**
- **8.4** (upvote data in GET endpoints) is redundant with **3.2** and **3.3**

The remaining properties provide unique validation value and comprehensive coverage of the feature requirements.

### Property 1: Upvote Record Creation

_For any_ valid user ID and application ID, when an upvote operation is performed, a record with keys PK=USER#{userId} and SK=UPVOTE#{appId} should exist in DynamoDB after the operation completes.

**Validates: Requirements 1.1, 7.1**

### Property 2: Upvote Count Increment

_For any_ application with an initial upvote count N, when a user upvotes that application, the upvoteCount attribute should equal N + 1.

**Validates: Requirements 1.2, 7.2**

### Property 3: Duplicate Upvote Rejection

_For any_ user-application pair where an upvote record already exists, attempting to create another upvote should return a 409 Conflict error and not modify the upvoteCount.

**Validates: Requirements 1.3**

### Property 4: Authentication Required

_For any_ upvote operation (create, remove, or query), when the request lacks valid authentication credentials, the system should return a 401 Unauthorized error.

**Validates: Requirements 1.4, 2.4, 6.1**

### Property 5: Upvote Record Deletion

_For any_ existing upvote record, when a remove operation is performed, the record with keys PK=USER#{userId} and SK=UPVOTE#{appId} should no longer exist in DynamoDB.

**Validates: Requirements 2.1**

### Property 6: Upvote Count Decrement

_For any_ application with an upvote count N > 0, when a user removes their upvote, the upvoteCount attribute should equal N - 1.

**Validates: Requirements 2.2**

### Property 7: Non-Existent Upvote Removal Error

_For any_ user-application pair where no upvote record exists, attempting to remove an upvote should return a 404 Not Found error.

**Validates: Requirements 2.3**

### Property 8: Upvote Status Query Accuracy

_For any_ user and application, the upvote status query should return hasUpvoted=true if and only if a record with PK=USER#{userId} and SK=UPVOTE#{appId} exists in DynamoDB.

**Validates: Requirements 3.1**

### Property 9: Upvote Count Inclusion

_For any_ application returned by list or get endpoints, the response should include an upvoteCount field with a non-negative integer value (defaulting to 0 if not set).

**Validates: Requirements 3.2, 4.3, 8.4**

### Property 10: Authenticated User Upvote Status

_For any_ authenticated request to list or get applications, each application in the response should include a hasUpvoted boolean field indicating whether the requesting user has upvoted that application.

**Validates: Requirements 3.3**

### Property 11: Unauthenticated Response Exclusion

_For any_ unauthenticated request to list or get applications, the response should include upvoteCount for each application but should not include a hasUpvoted field.

**Validates: Requirements 3.4**

### Property 12: Upvote Count Sort Order

_For any_ set of applications sorted by upvote count, each application's upvoteCount should be greater than or equal to the next application's upvoteCount (descending order).

**Validates: Requirements 4.1**

### Property 13: Result Limit Enforcement

_For any_ query with a limit parameter L, the number of applications returned should not exceed L.

**Validates: Requirements 4.2**

### Property 14: Secondary Sort by Creation Date

_For any_ set of applications with identical upvoteCount values, when sorted, they should be ordered by createdAt timestamp in descending order (newest first).

**Validates: Requirements 4.5**

### Property 15: Orphaned Upvote Error Handling

_For any_ upvote record referencing a non-existent application, querying that upvote should return a 404 Not Found error.

**Validates: Requirements 5.3**

### Property 16: Application Existence Validation

_For any_ non-existent application ID, attempting to create an upvote should return a 404 Not Found error and not create any records.

**Validates: Requirements 5.4**

### Property 17: GSI1 Key Pattern

_For any_ upvote record created, it should have GSI1PK=APP#{appId} and GSI1SK=UPVOTE#{userId}.

**Validates: Requirements 7.3**

### Property 18: Upvote Timestamp Presence

_For any_ upvote record created, it should include an upvotedAt field with an ISO 8601 timestamp.

**Validates: Requirements 7.4**

### Property 19: Entity Type Attribute

_For any_ upvote record created, it should include an entityType attribute with the value "UPVOTE".

**Validates: Requirements 7.5**

## Error Handling

### Error Response Format

All errors follow the standardized format from `error_handler.py`:

```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message"
  }
}
```

### Error Scenarios

| Scenario                     | HTTP Status | Error Code     | Message                                          |
| ---------------------------- | ----------- | -------------- | ------------------------------------------------ |
| Missing/invalid JWT          | 401         | UNAUTHORIZED   | "Authentication required. Please sign in."       |
| Application not found        | 404         | NOT_FOUND      | "Application not found."                         |
| Already upvoted              | 409         | CONFLICT       | "You have already upvoted this application."     |
| Upvote not found (on remove) | 404         | NOT_FOUND      | "Upvote not found."                              |
| DynamoDB error               | 500         | INTERNAL_ERROR | "An error occurred. Please try again later."     |
| Invalid app ID format        | 400         | BAD_REQUEST    | "Invalid request data. Please check your input." |

### Error Logging

All errors are logged internally with full context using the structured logger:

```python
logger.error(
    message="Failed to create upvote",
    error=e,
    context={
        'operation': 'upvote_application',
        'app_id': app_id,
        'user_id': user_id
    }
)
```

Sensitive information (user IDs, email addresses) is automatically filtered by the logger's PII filtering.

### Partial Failure Handling

The implementation uses DynamoDB's atomic operations to prevent partial failures:

1. **Upvote Creation**: The upvote record is created first, then the count is incremented atomically. If the increment fails, the record remains but can be cleaned up by a future operation or background job.

2. **Upvote Removal**: The upvote record is deleted first, then the count is decremented atomically with a minimum value of 0. If the decrement fails, the record is already deleted, preventing duplicate removal attempts.

3. **Idempotency**: All operations check for existing state before modifying data, ensuring repeated requests don't cause inconsistent state.

## Testing Strategy

### 4-Layer Acceptance Testing Architecture

The upvoting feature will use the 4-layer acceptance testing framework to ensure behavior is tested in business language while running real system code. This approach provides comprehensive coverage through acceptance tests that describe complete user-observable behaviors.

**Layer Structure:**

```
Layer 1: Test Scenarios         tests/acceptance/test_upvoting.py
Given-When-Then        tests/unit/test_upvote_utils.py
|
Layer 2: DSL                    tests/shared/upvoting_dsl.py
Business-readable      given / when / then singletons
method names
|
Layer 3: Protocol Driver        tests/shared/upvoting_protocol_driver.py
Only layer that        Mocks externals (DynamoDB, JWT), runs real handler
knows HOW system works
|
Layer 4: System Under Test      backend/application/handler.py
Real business logic    Unmodified, no test-only hooks
```

### Acceptance Tests (Primary)

Acceptance tests describe complete user-observable behaviors in Given-When-Then format. A passing acceptance test means the feature is done.

**Location:** `backend/tests/acceptance/test_upvoting.py`

**Example Structure:**

```python
from tests.shared.upvoting_dsl import given, when, then

class TestApplicationUpvoting:
    """Feature: Application Upvoting"""

    def test_user_upvotes_application(self):
        """
        Scenario: User upvotes an application
        Given an authenticated user
        And an application exists with 5 upvotes
        When the user upvotes the application
        Then the upvote count increases to 6
        And the user's upvote is recorded
        """
        given.user_is_authenticated(user_id='user-123')
        given.application_exists(app_id='app-456', upvote_count=5)

        when.user_upvotes_application(app_id='app-456')

        then.upvote_count_is(6)
        then.user_upvote_is_recorded(user_id='user-123', app_id='app-456')

    def test_duplicate_upvote_rejected(self):
        """
        Scenario: User attempts to upvote twice
        Given an authenticated user
        And the user has already upvoted an application
        When the user attempts to upvote again
        Then a conflict error is returned
        And the upvote count does not change
        """
        given.user_is_authenticated(user_id='user-123')
        given.application_exists(app_id='app-456', upvote_count=5)
        given.user_has_upvoted(user_id='user-123', app_id='app-456')

        when.user_upvotes_application(app_id='app-456')

        then.conflict_error_is_returned()
        then.upvote_count_is(5)

    def test_unauthenticated_user_cannot_upvote(self):
        """
        Scenario: Unauthenticated user attempts to upvote
        Given no user is authenticated
        And an application exists
        When an upvote is attempted
        Then an unauthorized error is returned
        """
        given.no_user_is_authenticated()
        given.application_exists(app_id='app-456', upvote_count=5)

        when.user_upvotes_application(app_id='app-456')

        then.unauthorized_error_is_returned()
```

### DSL (Domain-Specific Language)

The DSL provides business-readable method names that delegate to the protocol driver.

**Location:** `backend/tests/shared/upvoting_dsl.py`

**Example Structure:**

```python
from tests.shared.upvoting_protocol_driver import UpvotingProtocolDriver

class GivenContext:
    def __init__(self):
        self._driver = UpvotingProtocolDriver()

    def user_is_authenticated(self, user_id: str):
        self._driver.authenticate_user(user_id)
        return self

    def application_exists(self, app_id: str, upvote_count: int = 0):
        self._driver.seed_application(app_id, upvote_count)
        return self

    def user_has_upvoted(self, user_id: str, app_id: str):
        self._driver.seed_upvote(user_id, app_id)
        return self

    def no_user_is_authenticated(self):
        self._driver.clear_authentication()
        return self

class WhenContext:
    def __init__(self):
        self._driver = UpvotingProtocolDriver()
        self.result = None
        self.error = None

    def user_upvotes_application(self, app_id: str):
        self.result, self.error = self._driver.upvote_application(app_id)
        return self

    def user_removes_upvote(self, app_id: str):
        self.result, self.error = self._driver.remove_upvote(app_id)
        return self

class ThenContext:
    def __init__(self, when_ctx: WhenContext):
        self._when = when_ctx
        self._driver = UpvotingProtocolDriver()

    def upvote_count_is(self, expected: int):
        assert self._when.result['upvoteCount'] == expected

    def user_upvote_is_recorded(self, user_id: str, app_id: str):
        recorded = self._driver.get_upvote_record(user_id, app_id)
        assert recorded is not None

    def conflict_error_is_returned(self):
        assert self._when.error is not None
        assert self._when.error['statusCode'] == 409

    def unauthorized_error_is_returned(self):
        assert self._when.error is not None
        assert self._when.error['statusCode'] == 401

given = GivenContext()
when = WhenContext()
then = ThenContext(when)
```

### Protocol Driver

The protocol driver is the only layer that knows how the system works. It mocks external dependencies (DynamoDB, JWT) but runs real business logic.

**Location:** `backend/tests/shared/upvoting_protocol_driver.py`

**Example Structure:**

```python
from unittest.mock import patch, MagicMock
from application.handler import lambda_handler
import json

class UpvotingProtocolDriver:
    def __init__(self):
        self._applications = {}
        self._upvotes = {}
        self._current_user_id = None
        self._mock_table = MagicMock()

    def authenticate_user(self, user_id: str):
        self._current_user_id = user_id

    def clear_authentication(self):
        self._current_user_id = None

    def seed_application(self, app_id: str, upvote_count: int):
        self._applications[app_id] = {
            'PK': f'APP#{app_id}',
            'SK': 'METADATA',
            'appId': app_id,
            'upvoteCount': upvote_count
        }
        self._mock_table.get_item.return_value = {
            'Item': self._applications[app_id]
        }

    def seed_upvote(self, user_id: str, app_id: str):
        key = f'{user_id}#{app_id}'
        self._upvotes[key] = {
            'PK': f'USER#{user_id}',
            'SK': f'UPVOTE#{app_id}',
            'userId': user_id,
            'appId': app_id
        }

    @patch('shared.dynamodb_utils.get_table')
    def upvote_application(self, app_id: str, mock_get_table):
        mock_get_table.return_value = self._mock_table

        event = self._create_event('POST', f'/applications/{app_id}/upvote')
        response = lambda_handler(event, {})

        if response['statusCode'] == 201:
            body = json.loads(response['body'])
            return body['data'], None
        else:
            return None, response

    def get_upvote_record(self, user_id: str, app_id: str):
        key = f'{user_id}#{app_id}'
        return self._upvotes.get(key)

    def _create_event(self, method: str, path: str):
        event = {
            'httpMethod': method,
            'path': path,
            'pathParameters': {'appId': path.split('/')[-2]},
            'headers': {}
        }

        if self._current_user_id:
            event['requestContext'] = {
                'authorizer': {
                    'claims': {'sub': self._current_user_id}
                }
            }

        return event
```

### Unit Tests (For Isolated Logic)

Unit tests are used only for logic too granular for acceptance tests, such as:

- Complex utility functions
- Data transformation logic
- Edge cases in algorithms

**Location:** `backend/tests/unit/test_upvote_utils.py`

Unit tests should use the same DSL where possible to maintain consistency.

### Property-Based Testing

Property-based tests verify universal correctness properties using Hypothesis to generate random test data.

**Location:** `backend/tests/property/test_upvote_properties.py`

**Configuration:**

- Minimum 100 iterations per property test
- Each test tagged with: `# Feature: application-upvoting, Property {number}: {property_text}`

**Example:**

```python
from hypothesis import given, strategies as st
import pytest
from tests.shared.upvoting_dsl import given as dsl_given, when, then

@given(
    user_id=st.text(min_size=1, max_size=50),
    app_id=st.uuids(),
    initial_count=st.integers(min_value=0, max_value=1000)
)
@pytest.mark.property
def test_upvote_count_increment(user_id, app_id, initial_count):
    """
    Feature: application-upvoting, Property 2: Upvote Count Increment
    For any application with an initial upvote count N, when a user upvotes
    that application, the upvoteCount attribute should equal N + 1.
    """
    dsl_given.user_is_authenticated(user_id=str(user_id))
    dsl_given.application_exists(app_id=str(app_id), upvote_count=initial_count)

    when.user_upvotes_application(app_id=str(app_id))

    then.upvote_count_is(initial_count + 1)
```

All 19 correctness properties will have corresponding property-based tests.

### Test Organization

```
backend/tests/
├── shared/                              # Layers 2 & 3 (shared by all tests)
│   ├── upvoting_dsl.py                 # DSL with given/when/then
│   └── upvoting_protocol_driver.py     # Protocol driver
├── acceptance/                          # Layer 1 - story-level scenarios
│   ├── conftest.py                     # Reset DSL state between tests
│   └── test_upvoting.py                # Acceptance tests
├── unit/                                # Layer 1 - isolated logic
│   └── test_upvote_utils.py            # Unit tests for utilities
└── property/                            # Property-based tests
    └── test_upvote_properties.py       # All 19 properties
```

### Mocking Strategy

**Mock (in Protocol Driver):**

- DynamoDB operations (using moto or MagicMock)
- JWT token extraction
- Time/timestamp generation
- Environment variables

**Do NOT Mock:**

- Business logic in handler functions
- Data transformations
- Validation logic
- Error handling

The protocol driver is the mock boundary. Everything inside it runs real code.

### Test Data

**Use realistic data, not convenient data:**

- Upvote counts: Use realistic values (47, not 1)
- User IDs: Use actual Cognito sub format
- Timestamps: Use realistic ISO 8601 strings
- Application IDs: Use valid UUIDs

**Fixtures must be stable and committed** - no random or time-dependent values.

### Coverage Goals

- **Acceptance Test Coverage**: 100% of user stories and acceptance criteria
- **Property Coverage**: 100% of correctness properties tested
- **Line Coverage**: Minimum 90% for upvote-related code
- **Branch Coverage**: Minimum 85% for conditional logic

### Running Tests

```bash
# Run all tests
cd backend && uv run pytest

# Run acceptance tests only
cd backend && uv run pytest tests/acceptance/

# Run property-based tests only
cd backend && uv run pytest -m property

# Run with coverage
cd backend && uv run pytest --cov=application --cov=shared

# Run specific test
cd backend && uv run pytest -k test_user_upvotes_application

# Run with verbose output
cd backend && uv run pytest -v
```

## Implementation Notes

### Lambda Handler Integration

The upvote functionality will be integrated into the existing `backend/application/handler.py` file, following the established pattern:

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for application operations"""
    http_method = event.get('httpMethod')
    path_parameters = event.get('pathParameters') or {}
    app_id = path_parameters.get('appId')

    # Existing routes...

    # New upvote routes
    if http_method == 'POST' and 'upvote' in event.get('path', ''):
        user_id = get_user_id_from_event(event)
        if not user_id:
            return handle_unauthorized(event=event)
        return upvote_application(app_id, user_id)

    elif http_method == 'DELETE' and 'upvote' in event.get('path', ''):
        user_id = get_user_id_from_event(event)
        if not user_id:
            return handle_unauthorized(event=event)
        return remove_upvote(app_id, user_id)

    elif http_method == 'GET' and 'upvote' in event.get('path', ''):
        user_id = get_user_id_from_event(event)
        if not user_id:
            return handle_unauthorized(event=event)
        return check_upvote_status(app_id, user_id)
```

### DynamoDB Update Expressions

Atomic counter operations will use DynamoDB's ADD operation:

```python
# Increment upvote count
table.update_item(
    Key={'PK': f'APP#{app_id}', 'SK': 'METADATA'},
    UpdateExpression='ADD upvoteCount :inc',
    ExpressionAttributeValues={':inc': 1},
    ReturnValues='ALL_NEW'
)

# Decrement with minimum value of 0
table.update_item(
    Key={'PK': f'APP#{app_id}', 'SK': 'METADATA'},
    UpdateExpression='SET upvoteCount = if_not_exists(upvoteCount, :zero) - :dec',
    ConditionExpression='upvoteCount > :zero',
    ExpressionAttributeValues={':dec': 1, ':zero': 0},
    ReturnValues='ALL_NEW'
)
```

### Batch Upvote Status Queries

For enriching application lists, batch queries will be used to minimize DynamoDB requests:

```python
def enrich_applications_with_upvotes(
    applications: List[Dict],
    user_id: Optional[str]
) -> List[Dict]:
    """Enrich applications with upvote data"""
    # Add upvoteCount (default to 0)
    for app in applications:
        app['upvoteCount'] = app.get('upvoteCount', 0)

    # If authenticated, batch query user's upvotes
    if user_id:
        upvoted_app_ids = set()
        upvote_records = query_by_pk(f'USER#{user_id}', 'UPVOTE#')
        for record in upvote_records:
            upvoted_app_ids.add(record['appId'])

        # Add hasUpvoted to each application
        for app in applications:
            app['hasUpvoted'] = app['appId'] in upvoted_app_ids

    return applications
```

### Migration Considerations

Existing applications in DynamoDB do not have an `upvoteCount` attribute. The implementation will:

1. Default to 0 when the attribute is missing
2. Use `if_not_exists(upvoteCount, 0)` in update expressions
3. No migration script needed—attributes are added on first upvote

### Future Enhancements

This design supports future features:

1. **Trending Applications**: Query applications sorted by upvoteCount using a GSI
2. **User Upvote History**: Query all upvotes by a user using PK=USER#{userId}, SK begins_with UPVOTE#
3. **Application Upvoters**: Query all users who upvoted an application using GSI1
4. **Upvote Analytics**: Track upvote trends over time using the upvotedAt timestamp
5. **Upvote Notifications**: Notify application owners when their app receives upvotes
