---
name: testing
description: This skill should be used when the user asks to "write tests", "add a test", "build test infrastructure", "set up acceptance tests", "create a protocol driver", "write a DSL", "decide what kind of test to write", or is implementing a new feature or bugfix and needs test coverage. Provides the 4-layer acceptance testing framework with DSL, protocol driver, and scenario design guidance.
---

# Testing Skill

Use this skill when writing tests, deciding what kind of test to write, or building out test infrastructure for a feature.

## Principles

1. **All production code must have a test.** Prefer acceptance tests that describe behavior in human-readable Given-When-Then format. Unit tests are for logic too granular for acceptance tests.

2. **Tests first.** Write or update the test to define correct behavior before writing implementation. If behavior changes, update the test first, then make it pass.

3. **Simplest implementation that works.** Tests should be easy to read, maintain, and extend. Avoid over-engineering test infrastructure.

---

## Test Hierarchy

### Acceptance Tests (write first)

Describe complete user-observable behaviors in business language. A passing acceptance test means the feature is done.

- Location: `src/__tests__/acceptance/` (frontend), `backend/tests/acceptance/` (backend)
- Format: Given-When-Then scenarios in a test class
- Mock only: external I/O (APIs, databases, filesystems)
- Run: real business logic

### Unit Tests (write for isolated logic)

Test a single function or class in isolation. Use when the behavior is too granular or edge-case-heavy to express as an acceptance test.

- Location: `src/__tests__/unit/` (frontend), `backend/tests/unit/` (backend)
- Format: focused, fast, no I/O
- Use the same DSL as acceptance tests where possible

---

## 4-Layer Architecture

Every test domain (a feature, a service, a story) uses this structure:

```
Layer 1: Test Scenarios         tests/acceptance/test_[story].py
Given-When-Then        tests/unit/test_[component].py
|
Layer 2: DSL                    tests/shared/[domain]_dsl.py
Business-readable      given / when / then singletons
method names
|
Layer 3: Protocol Driver        tests/shared/[domain]_protocol_driver.py
Only layer that        Mocks externals, runs real system
knows HOW system works
|
Layer 4: System Under Test      Your actual application code
Real business logic    Unmodified, no test-only hooks
```

The DSL and Protocol Driver are **shared** between acceptance and unit tests. No duplication.

### Layer 1 — Test Scenarios

Express what the user needs. No implementation details. Both acceptance and unit tests import from the same DSL.

**Frontend Example (TypeScript):**

```typescript
// src/__tests__/acceptance/test_application_upvoting.test.tsx
import { given, when, then } from "../shared/application_dsl";

describe("Feature: Application Upvoting", () => {
  describe("Scenario: User upvotes an application", () => {
    test("Given authenticated user When they upvote Then count increases", async () => {
      given.user_is_authenticated("user123");
      given.application_exists({ id: "app456", upvotes: 5 });

      await when.user_upvotes_application("app456");

      then.upvote_count_is(6);
      then.user_upvote_is_recorded("user123", "app456");
    });
  });
});
```

**Backend Example (Python):**

```python
# backend/tests/acceptance/test_application_upvoting.py
from tests.shared.application_dsl import given, when, then

class TestApplicationUpvoting:
    """Feature: Application Upvoting"""

    def test_user_upvotes_application(self):
        """
        Scenario: User upvotes an application
        Given an authenticated user
        When they upvote an application
        Then the upvote count increases
        """
        given.user_is_authenticated(user_id='user123')
        given.application_exists(app_id='app456', upvotes=5)

        when.user_upvotes_application(app_id='app456')

        then.upvote_count_is(6)
        then.user_upvote_is_recorded(user_id='user123', app_id='app456')
```

### Layer 2 — DSL

Provides the `given`, `when`, `then` singletons. Methods are named in business language. No system calls here — delegates entirely to the protocol driver.

**Frontend Example (TypeScript):**

```typescript
// src/__tests__/shared/application_dsl.ts
import { ApplicationProtocolDriver } from "./application_protocol_driver";

class GivenContext {
  private driver = new ApplicationProtocolDriver();

  user_is_authenticated(userId: string) {
    this.driver.authenticateUser(userId);
    return this;
  }

  application_exists(app: { id: string; upvotes: number }) {
    this.driver.seedApplication(app);
    return this;
  }
}

class WhenContext {
  private driver = new ApplicationProtocolDriver();
  result: any = null;

  async user_upvotes_application(appId: string) {
    this.result = await this.driver.upvoteApplication(appId);
    return this;
  }
}

class ThenContext {
  constructor(private whenCtx: WhenContext) {}
  private driver = new ApplicationProtocolDriver();

  upvote_count_is(expected: number) {
    expect(this.whenCtx.result.upvotes).toBe(expected);
  }

  user_upvote_is_recorded(userId: string, appId: string) {
    const recorded = this.driver.getUserUpvote(userId, appId);
    expect(recorded).toBeTruthy();
  }
}

export const given = new GivenContext();
export const when = new WhenContext();
export const then = new ThenContext(when);
```

**Backend Example (Python):**

```python
# backend/tests/shared/application_dsl.py
from tests.shared.application_protocol_driver import ApplicationProtocolDriver

class GivenContext:
    def __init__(self):
        self._driver = ApplicationProtocolDriver()

    def user_is_authenticated(self, user_id: str):
        self._driver.authenticate_user(user_id)
        return self

    def application_exists(self, app_id: str, upvotes: int):
        self._driver.seed_application(app_id=app_id, upvotes=upvotes)
        return self

class WhenContext:
    def __init__(self):
        self._driver = ApplicationProtocolDriver()
        self.result = None

    def user_upvotes_application(self, app_id: str):
        self.result = self._driver.upvote_application(app_id)
        return self

class ThenContext:
    def __init__(self, when_ctx: WhenContext):
        self._when = when_ctx
        self._driver = ApplicationProtocolDriver()

    def upvote_count_is(self, expected: int):
        assert self._when.result["upvotes"] == expected

    def user_upvote_is_recorded(self, user_id: str, app_id: str):
        recorded = self._driver.get_user_upvote(user_id, app_id)
        assert recorded is not None

given = GivenContext()
when = WhenContext()
then = ThenContext(when)
```

### Layer 3 — Protocol Driver

The only layer that knows how the system works. Mocks external I/O (HTTP calls, databases, queues). Runs real business logic.

**Frontend Example (TypeScript):**

```typescript
// src/__tests__/shared/application_protocol_driver.ts
import { vi } from "vitest";
import { apiClient } from "@/services/apiClient";
import { ApplicationService } from "@/services/applicationService";

export class ApplicationProtocolDriver {
  private applications: Map<string, any> = new Map();
  private upvotes: Map<string, Set<string>> = new Map();
  private currentUserId: string | null = null;

  authenticateUser(userId: string) {
    this.currentUserId = userId;
    // Mock auth context
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: userId },
      isAuthenticated: true,
    });
  }

  seedApplication(app: { id: string; upvotes: number }) {
    this.applications.set(app.id, app);
    // Mock API response
    vi.mocked(apiClient.get).mockResolvedValue({
      data: app,
      status: 200,
    });
  }

  async upvoteApplication(appId: string) {
    // Mock only the API call, run real service logic
    const service = new ApplicationService();
    const result = await service.upvoteApplication(appId);

    // Track state change
    if (!this.upvotes.has(appId)) {
      this.upvotes.set(appId, new Set());
    }
    this.upvotes.get(appId)!.add(this.currentUserId!);

    return result;
  }

  getUserUpvote(userId: string, appId: string): boolean {
    return this.upvotes.get(appId)?.has(userId) ?? false;
  }
}
```

**Backend Example (Python):**

```python
# backend/tests/shared/application_protocol_driver.py
from unittest.mock import patch, MagicMock
from application.handler import lambda_handler
from shared.dynamodb_utils import get_table

class ApplicationProtocolDriver:
    def __init__(self):
        self._applications: dict[str, dict] = {}
        self._upvotes: dict[str, set[str]] = {}
        self._current_user_id: str | None = None
        self._mock_table = MagicMock()

    def authenticate_user(self, user_id: str):
        self._current_user_id = user_id

    def seed_application(self, app_id: str, upvotes: int):
        self._applications[app_id] = {
            'PK': f'APP#{app_id}',
            'SK': 'METADATA',
            'app_id': app_id,
            'upvotes': upvotes
        }
        # Mock DynamoDB response
        self._mock_table.get_item.return_value = {
            'Item': self._applications[app_id]
        }

    @patch('shared.dynamodb_utils.get_table')
    def upvote_application(self, app_id: str, mock_get_table):
        mock_get_table.return_value = self._mock_table

        # Create Lambda event
        event = {
            'httpMethod': 'POST',
            'path': f'/applications/{app_id}/upvote',
            'requestContext': {
                'authorizer': {
                    'claims': {'sub': self._current_user_id}
                }
            }
        }

        # Run real handler
        response = lambda_handler(event, {})
        result = json.loads(response['body'])

        # Track state
        if app_id not in self._upvotes:
            self._upvotes[app_id] = set()
        self._upvotes[app_id].add(self._current_user_id)

        return result

    def get_user_upvote(self, user_id: str, app_id: str) -> bool:
        return user_id in self._upvotes.get(app_id, set())
```

### Layer 4 — System Under Test

Your real application code. No test-only hooks, no changes to accommodate tests.

---

## Test File Structure

**Frontend:**

```
src/
├── __tests__/
│   ├── shared/                         # Layers 2 & 3
│   │   ├── [domain]_dsl.ts
│   │   └── [domain]_protocol_driver.ts
│   ├── acceptance/                     # Layer 1 — story-level
│   │   └── test_[story].test.tsx
│   ├── unit/                           # Layer 1 — isolated logic
│   │   └── test_[component].test.ts
│   └── fixtures/                       # Reusable test data
│       └── [domain]_fixtures.ts
```

**Backend:**

```
backend/tests/
├── shared/                         # Layers 2 & 3
│   ├── [domain]_dsl.py
│   └── [domain]_protocol_driver.py
├── acceptance/                     # Layer 1 — story-level
│   ├── conftest.py                 # Reset DSL state
│   └── test_[story].py
├── unit/                           # Layer 1 — isolated logic
│   └── test_[component].py
└── fixtures/                       # Reusable test data
    └── [domain]_fixtures.py
```

### conftest.py — Reset DSL state between tests

```python
# backend/tests/acceptance/conftest.py
import pytest
from tests.shared.application_dsl import given, when, then

@pytest.fixture(autouse=True)
def reset_dsl():
    given.__init__()
    when.__init__()
    yield
```

---

## What to Mock

**Mock:** external I/O — HTTP APIs, databases, queues, filesystems, clocks

**Do not mock:** business logic, domain services, data transformations, validation

The protocol driver is the mock boundary. Everything inside it runs real code.

---

## Test Naming

Tests should read as specifications:

```
test_[actor]_[action]_[outcome]

test_user_upvotes_application_increases_count
test_duplicate_upvote_returns_error
test_unauthenticated_user_cannot_upvote
```

---

## Adding a New Test Domain

When adding tests for a new feature or service:

1. Create `tests/shared/[domain]_dsl.{ts,py}` — `given`, `when`, `then` singletons
2. Create `tests/shared/[domain]_protocol_driver.{ts,py}` — mock externals, run real code
3. Create `tests/acceptance/test_[story].{test.tsx,py}` — one class per user story
4. Add DSL reset to `conftest.py` (Python) or test setup (TypeScript)
5. Create `tests/unit/test_[component].{test.ts,py}` for any granular logic

---

## Test Data and Scenarios

Passing tests that test the wrong thing are worse than no tests — they create false confidence. Getting test data and scenarios right is a prerequisite for meaningful coverage, not an afterthought.

### Fixture Design Rules

**Use realistic data, not convenient data.**

Convenient fixtures are the primary source of false confidence. Real systems produce messy data:

| Convenient (avoid)         | Realistic (prefer)                              |
| -------------------------- | ----------------------------------------------- |
| `quantity=1`               | `quantity=47` (a real inventory count)          |
| `start=today, end=today+7` | Start mid-week, end crossing a month boundary   |
| All fields populated       | Some optional fields `null` or absent           |
| Single item per request    | Multiple items with partial availability        |
| Simple round numbers       | Values that would actually come from the system |

**Capture real payloads from external systems.**

When your system integrates with an external API, use actual response payloads as fixture baselines — not invented structures. Real payloads reveal field naming inconsistencies, unexpected nulls, and formats your code must actually handle.

```json
// src/__tests__/fixtures/dynamodb_application_response.json
// Captured from real system, committed to source control
{
  "Item": {
    "PK": "APP#abc-123",
    "SK": "METADATA",
    "app_id": "abc-123",
    "title": "My Application",
    "upvotes": 47,
    "created_at": "2026-03-19T08:42:11Z",
    "tags": ["react", "typescript"],
    "github_url": null
  }
}
```

The `null` on `github_url` would never appear in an invented fixture — but it's exactly the kind of value that breaks a naively written parser.

**Fixtures must be stable and committed.** Do not generate random or time-dependent values. Tests must be deterministic and reproducible across environments and time.

### Scenario Design

Before writing a test, answer: _what is the minimal realistic scenario that proves this specific behavior?_

Every behavior needs at least three scenario types:

| Type               | Question it answers                   | Example                                           |
| ------------------ | ------------------------------------- | ------------------------------------------------- |
| Happy path         | Does it work under normal conditions? | User upvotes application, count increases         |
| Boundary           | Does it handle the edge correctly?    | User tries to upvote twice — second attempt fails |
| Failure / negative | Does it fail correctly?               | Unauthenticated user cannot upvote                |

A single happy-path scenario tells you almost nothing. Boundary scenarios expose off-by-one errors. Negative scenarios expose silent failures — the case where the code does the wrong thing without raising an error.

### The False Confidence Checklist

Before marking a test suite complete, verify:

- [ ] Fixtures contain values that could realistically come from the real system
- [ ] At least one scenario uses data captured from or modeled on a real integration response
- [ ] Boundary conditions are explicitly tested, not just the obvious case
- [ ] A scenario exists for the known failure mode
- [ ] Assertions check the specific value, not just that something was returned
- [ ] You can describe in one sentence what real-world situation each scenario represents

### Weak vs Strong Assertions

Weak assertions pass even when the code is wrong:

```typescript
// Weak — tells you almost nothing
expect(result).toBeDefined();
expect(results.length).toBeGreaterThan(0);
expect(response.status).toBe(200);
```

Strong assertions verify the specific behavior under test:

```typescript
// Strong — fails if the logic is wrong
expect(result.upvotes).toBe(6); // Was 5, user upvoted once
expect(result.user_has_upvoted).toBe(true);
expect(response.data.app_id).toBe("app456");
```

---

## MadeWithKiro-Specific Patterns

### Frontend Testing

**Mock TanStack Query:**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// In protocol driver
render(
  <QueryClientProvider client={createTestQueryClient()}>
    <Component />
  </QueryClientProvider>
);
```

**Mock Auth Context:**

```typescript
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// In protocol driver
vi.mocked(useAuth).mockReturnValue({
  user: { sub: "user123", email: "user@example.com" },
  isAuthenticated: true,
});
```

### Backend Testing

**Mock DynamoDB with moto:**

```python
import boto3
from moto import mock_dynamodb

@pytest.fixture
def mock_dynamodb_table():
    with mock_dynamodb():
        dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
        table = dynamodb.create_table(
            TableName='MadeWithKiroTable',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        yield table
```

**Mock Cognito Events:**

```python
def create_cognito_event(trigger_source: str, user_sub: str, email: str):
    return {
        'version': '1',
        'triggerSource': trigger_source,
        'userPoolId': 'us-west-2_TEST',
        'userName': user_sub,
        'request': {
            'userAttributes': {
                'sub': user_sub,
                'email': email
            }
        },
        'response': {}
    }
```

---

## Running Tests

**Frontend:**

```bash
bun run test                      # All tests
bun run test:watch                # Watch mode
bun run test:coverage             # Coverage report
bun run test acceptance/          # Acceptance tests only
bun run test unit/                # Unit tests only
```

**Backend:**

```bash
cd backend && uv run pytest                          # All tests
cd backend && uv run pytest tests/acceptance/        # Acceptance only
cd backend && uv run pytest tests/unit/              # Unit only
cd backend && uv run pytest -v                       # Verbose
cd backend && uv run pytest --cov=.                  # Coverage
cd backend && uv run pytest -k test_upvoting         # Specific test
```

---

## Adapting This Framework

Replace placeholders with your application's specifics:

| Generic               | MadeWithKiro                                          |
| --------------------- | ----------------------------------------------------- |
| `order_dsl.py`        | `application_dsl.py`, `profile_dsl.py`, `auth_dsl.py` |
| `OrderProtocolDriver` | `ApplicationProtocolDriver`, `ProfileProtocolDriver`  |
| `InventoryAdapter`    | `apiClient`, DynamoDB table, Cognito                  |
| `OrderService`        | `ApplicationService`, Lambda handlers                 |
| DSL method names      | Business language for your domain                     |

The structure is identical regardless of language, framework, or domain. Only the names and the specific external dependencies change.
