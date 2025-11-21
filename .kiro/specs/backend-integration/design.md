# Design Document

## Overview

The backend integration feature connects the MadeWithKiro React frontend with AWS Lambda backend services through API Gateway. This design replaces the existing mock data services with real API calls and ensures robust error handling and data synchronization between frontend and backend.

The integration leverages the existing UI components from the madewithkiro-mvp spec. The design focuses on creating a clean service layer that abstracts API communication and provides a seamless developer experience. Note: Authentication is not yet implemented, so all API endpoints are public and use a hardcoded test user ID for this phase.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │   Hooks      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│         ┌─────────────────┴──────────────────┐              │
│         │        Service Layer                │              │
│         │  ┌────────────┐  ┌────────────┐    │              │
│         │  │  Profile   │  │Application │    │              │
│         │  │  Service   │  │  Service   │    │              │
│         │  └─────┬──────┘  └─────┬──────┘    │              │
│         │        └────────────────┘           │              │
│         │                │                    │              │
│         │        ┌───────┴────────┐           │              │
│         │        │   API Client   │           │              │
│         │        └───────┬────────┘           │              │
│         └────────────────┼────────────────────┘              │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │
                ┌──────────┴──────────┐
                │    API Gateway      │
                └──────────┬──────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
   ┌────┴─────┐                        ┌─────┴────┐
   │ Profile  │                        │Application│
   │ Lambda   │                        │  Lambda  │
   └────┬─────┘                        └─────┬────┘
        │                                    │
        └────────────────┬───────────────────┘
                         │
                   ┌─────┴──────┐
                   │  DynamoDB  │
                   └────────────┘
```

### Request Flow

1. User action triggers API call in component
2. Component calls service layer function (e.g., `profileService.getProfile()`)
3. Service function calls API client with endpoint and parameters
4. API client sends HTTP request to API Gateway
5. API Gateway invokes Lambda function
6. Lambda processes request and interacts with DynamoDB
7. Lambda returns response to API Gateway
8. API Gateway returns response to frontend
9. API client processes response (parse JSON, handle errors)
10. Service function returns typed data to component
11. Component updates UI with response data

## Components and Interfaces

### API Client (`src/services/apiClient.ts`)

The core HTTP client that handles all communication with the backend API.

**Responsibilities:**

- Configure base URL from environment variables
- Add standard headers to all requests
- Parse JSON responses
- Implement retry logic with exponential backoff
- Handle request cancellation with AbortController
- Log requests in development mode

**Interface:**

```typescript
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
}

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  data?: unknown;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

class ApiClient {
  constructor(config: ApiClientConfig);
  request<T>(options: RequestOptions): Promise<ApiResponse<T>>;
}
```

### Profile Service (`src/services/profileService.ts`)

Handles all profile-related API operations.

**Interface:**

```typescript
interface ProfileService {
  getProfile(userId: string): Promise<UserProfile>;
  createProfile(data: CreateProfileData): Promise<UserProfile>;
  updateProfile(data: UpdateProfileData): Promise<UserProfile>;
}

interface CreateProfileData {
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
}

interface UpdateProfileData extends CreateProfileData {}

interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Application Service (`src/services/applicationService.ts`)

Handles all application-related API operations.

**Interface:**

```typescript
interface ApplicationService {
  listApplications(userId?: string): Promise<Application[]>;
  createApplication(data: CreateApplicationData): Promise<Application>;
}

interface CreateApplicationData {
  name: string;
  description: string;
  appUrl: string;
  githubUrl?: string;
  tags: string[];
}

interface Application {
  appId: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  appUrl: string;
  githubUrl?: string;
  tags: string[];
  createdAt: string;
}
```

### Constants (`src/constants/api.ts`)

Provides constant values for API configuration.

**Interface:**

```typescript
// Default test user ID for development (no auth yet)
export const TEST_USER_ID = "test-user-001";

// API endpoints
export const API_ENDPOINTS = {
  PROFILE: "/profile",
  APPLICATIONS: "/applications",
} as const;
```

### TanStack Query Integration

We will use **TanStack Query (React Query)** for data fetching, caching, and synchronization. This provides:

- Automatic caching with configurable TTL
- Background refetching
- Optimistic updates
- Request deduplication
- Automatic retry logic
- Loading and error states

**Configuration:**

```typescript
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Custom Hooks (TanStack Query)

**useProfile Hook** - Manages profile data fetching and updates

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function useProfile(userId: string) {
  const queryClient = useQueryClient();

  // Fetch profile
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileService.getProfile(userId),
    enabled: !!userId,
  });

  // Update profile mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => profileService.updateProfile(data),
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["profile", userId] });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData(["profile", userId]);

      // Optimistically update
      queryClient.setQueryData(["profile", userId], (old: UserProfile) => ({
        ...old,
        ...newData,
      }));

      return { previousProfile };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(["profile", userId], context?.previousProfile);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
```

**useApplications Hook** - Manages applications list fetching and creation

```typescript
function useApplications(userId?: string) {
  const queryClient = useQueryClient();

  // Fetch applications
  const {
    data: applications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: userId
      ? ["applications", "user", userId]
      : ["applications", "all"],
    queryFn: () => applicationService.listApplications(userId),
  });

  // Create application mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateApplicationData) =>
      applicationService.createApplication(data),
    onMutate: async (newApp) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["applications"] });

      // Optimistically add to list
      const tempId = `temp-${Date.now()}`;
      const optimisticApp = {
        ...newApp,
        appId: tempId,
        userId: "current-user",
        userName: "You",
        createdAt: new Date().toISOString(),
        isPending: true,
      };

      queryClient.setQueryData(
        ["applications", "all"],
        (old: Application[] = []) => [optimisticApp, ...old]
      );

      return { tempId };
    },
    onSuccess: (newApp, variables, context) => {
      // Replace temp app with real one
      queryClient.setQueryData(
        ["applications", "all"],
        (old: Application[] = []) =>
          old.map((app) => (app.appId === context.tempId ? newApp : app))
      );
    },
    onError: (err, newApp, context) => {
      // Remove optimistic app on error
      queryClient.setQueryData(
        ["applications", "all"],
        (old: Application[] = []) =>
          old.filter((app) => app.appId !== context?.tempId)
      );
    },
    onSettled: () => {
      // Invalidate all application queries
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  return {
    applications,
    isLoading,
    error,
    createApplication: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
```

## Data Models

### TypeScript Types

All TypeScript types mirror the backend Pydantic models to ensure type safety across the stack.

**User Profile Types:**

```typescript
// Matches backend CreateProfileRequest
interface CreateProfileData {
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
}

// Matches backend UpdateProfileRequest
interface UpdateProfileData {
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
}

// Matches backend UserProfile
interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Application Types:**

```typescript
// Matches backend CreateApplicationRequest
interface CreateApplicationData {
  name: string;
  description: string;
  appUrl: string;
  githubUrl?: string;
  tags: string[];
}

// Matches backend Application
interface Application {
  appId: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  appUrl: string;
  githubUrl?: string;
  tags: string[];
  createdAt: string;
}
```

**API Response Types:**

```typescript
// Matches backend response format
interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>; // Field-level validation errors
}
```

### Environment Configuration

```typescript
interface EnvironmentConfig {
  apiBaseUrl: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoRegion: string;
  environment: "development" | "production";
}

// Loaded from environment variables
const config: EnvironmentConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  cognitoRegion: import.meta.env.VITE_COGNITO_REGION,
  environment: import.meta.env.MODE,
};
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Standard headers inclusion

_For any_ API request made by the API client, the request should include Content-Type and Accept headers
**Validates: Requirements 1.2**

### Property 2: JSON response parsing

_For any_ valid JSON response received by the API client, the response body should be automatically parsed into a JavaScript object
**Validates: Requirements 1.3**

### Property 3: Error status code handling

_For any_ HTTP response with a non-2xx status code, the API client should throw an error containing the status code and error message
**Validates: Requirements 1.5**

### Property 4: Request header consistency

_For any_ API request made by the API client, custom headers specified in request options should be included in the request
**Validates: Requirements 2.2**

### Property 5: Profile API request correctness

_For any_ valid userId, calling getProfile should send a GET request to the correct profile endpoint
**Validates: Requirements 4.1**

### Property 6: Profile creation request correctness

_For any_ valid profile data, calling createProfile should send a POST request to the correct endpoint
**Validates: Requirements 4.2**

### Property 7: Profile update request correctness

_For any_ valid profile update data with userId, calling updateProfile should send a PUT request to the correct endpoint
**Validates: Requirements 4.3**

### Property 8: Validation error parsing

_For any_ API response containing validation errors, the system should return an object mapping field names to error messages
**Validates: Requirements 4.4, 5.4**

### Property 9: Profile response type consistency

_For any_ successful profile API response, the returned data should match the UserProfile type structure
**Validates: Requirements 4.5**

### Property 10: User applications query correctness

_For any_ valid userId parameter, calling listApplications should send a GET request with the userId as a query parameter
**Validates: Requirements 5.2**

### Property 11: Application creation request correctness

_For any_ valid application data with userId, calling createApplication should send a POST request to the correct endpoint
**Validates: Requirements 5.3**

### Property 12: Application response type consistency

_For any_ successful application API response, the returned data should match the Application type structure
**Validates: Requirements 5.5**

### Property 13: Service signature compatibility

_For any_ service function, the real API service should maintain the same function signature and return type as the mock service
**Validates: Requirements 6.5**

### Property 14: Centralized API base URL

_For any_ API service module, all requests should use the same base URL configured from environment variables
**Validates: Requirements 11.5**

### Property 15: Response type validation

_For any_ API response received, the system should validate that the response structure matches the expected TypeScript type
**Validates: Requirements 14.2**

## Error Handling

### Error Types

**Network Errors:**

- Connection timeout
- DNS resolution failure
- Network unavailable
- Request aborted

**HTTP Errors:**

- 400 Bad Request - Validation errors
- 404 Not Found - Resource doesn't exist
- 500 Internal Server Error - Backend failure
- 502/503/504 - Gateway/service errors

**Application Errors:**

- Type validation failure
- Cache corruption
- Configuration missing

### Error Handling Strategy

**1. Request Level (API Client)**

- Catch network errors and wrap in ApiError
- Parse error responses from backend
- Implement retry logic for transient failures
- Log errors in development mode

**2. Service Level**

- Transform API errors into domain-specific errors
- Provide context about which operation failed
- Handle cache invalidation on errors

**3. Component Level**

- Display user-friendly error messages
- Provide retry actions where appropriate
- Show field-specific validation errors in forms
- Use error boundaries for unexpected errors

### Retry Logic

**Retry Conditions:**

- Network errors: Retry up to 3 times
- 5xx server errors: Retry up to 2 times
- 4xx client errors: No retry

**Backoff Strategy:**

- Exponential backoff: 1s, 2s, 4s
- Add jitter to prevent thundering herd
- Respect Retry-After header if present

**No Retry Scenarios:**

- 404 Not Found (show not found message)
- 400 Bad Request (show validation errors)

### Error Recovery

**Optimistic Update Failure:**

1. Revert UI to previous state
2. Show error message
3. Provide retry option
4. Keep form data for user to fix

**Cache Corruption:**

1. Detect invalid cached data
2. Clear corrupted cache entry
3. Fetch fresh data from API
4. Log error for debugging

## Testing Strategy

### Unit Testing

**API Client Tests:**

- Test request configuration (headers, URL construction)
- Test response parsing (JSON, errors)
- Test retry logic with different error types
- Test request cancellation
- Test logging in different environments

**Service Tests:**

- Test each service function calls API client correctly
- Test data transformation (request/response mapping)
- Test error handling and error message formatting
- Test cache integration

**Hook Tests:**

- Test loading state transitions
- Test error state handling
- Test data updates
- Test cleanup on unmount

### Property-Based Testing

We will use **fast-check** as the property-based testing library for TypeScript/JavaScript. Fast-check provides excellent TypeScript support and integrates well with Vitest.

**Configuration:**

- Minimum 100 iterations per property test
- Use Vitest as the test runner
- Tag each property test with the design document property number

**Property Test Examples:**

```typescript
// Property 1: Standard headers inclusion
test("Property 1: All requests include standard headers", () => {
  fc.assert(
    fc.property(
      fc.record({
        method: fc.constantFrom("GET", "POST", "PUT", "DELETE"),
        endpoint: fc.string(),
        data: fc.anything(),
      }),
      async (requestConfig) => {
        const client = new ApiClient({ baseURL: "https://api.test" });
        const spy = vi.spyOn(global, "fetch");

        await client.request(requestConfig).catch(() => {});

        const headers = spy.mock.calls[0][1]?.headers as Headers;
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("Accept")).toBe("application/json");
      }
    ),
    { numRuns: 100 }
  );
});

// Property 4: Custom headers inclusion
test("Property 4: Custom headers are included in requests", () => {
  fc.assert(
    fc.property(
      fc.record({
        method: fc.constantFrom("GET", "POST", "PUT"),
        endpoint: fc.string(),
        headers: fc.dictionary(fc.string(), fc.string()),
      }),
      async (requestConfig) => {
        const client = new ApiClient({ baseURL: "https://api.test" });
        const spy = vi.spyOn(global, "fetch");

        await client.request(requestConfig).catch(() => {});

        const headers = spy.mock.calls[0][1]?.headers as Headers;
        Object.entries(requestConfig.headers).forEach(([key, value]) => {
          expect(headers.get(key)).toBe(value);
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**API Service Integration:**

- Mock API Gateway responses using MSW (Mock Service Worker)
- Test complete request/response flow
- Test authentication token flow
- Test error scenarios (401, 404, 500)
- Test cache behavior

**Component Integration:**

- Test components with real service layer (mocked API)
- Test loading states during API calls
- Test error display
- Test optimistic updates
- Test form submission with validation errors

**End-to-End Scenarios:**

- User creates profile → API call → Success message
- User updates profile → Optimistic update → API call → Confirmation
- User creates application → Optimistic add → API call → Redirect
- User views gallery → API call → Display applications
- Token expires → Refresh → Retry request → Success

### Test Coverage Goals

- API Client: 100% coverage (critical infrastructure)
- Services: 95% coverage
- Hooks: 90% coverage
- Components: 80% coverage (focus on integration)

## Implementation Details

### API Client Implementation

**Request Interceptor Flow:**

```typescript
async function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  // 1. Build URL with query parameters
  const url = buildURL(options.endpoint, options.params);

  // 2. Prepare headers
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  // 3. Log request in development
  if (isDevelopment()) {
    logRequest(options.method, url, headers);
  }

  // 4. Make request with retry logic
  return await retryWithBackoff(() =>
    fetch(url, {
      method: options.method,
      headers,
      body: options.data ? JSON.stringify(options.data) : undefined,
      signal: options.signal,
    })
  );
}
```

**Response Interceptor Flow:**

```typescript
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  // 1. Log response in development
  if (isDevelopment()) {
    logResponse(response.status, response.statusText);
  }

  // 2. Parse JSON body
  const body = await response.json();

  // 3. Handle error responses
  if (!response.ok) {
    return {
      data: null,
      error: {
        code: body.error?.code || `ERROR_${response.status}`,
        message: body.error?.message || response.statusText,
        details: body.error?.details,
      },
    };
  }

  // 4. Return successful response
  return {
    data: body.data,
    error: null,
  };
}
```

### Cache Implementation

**Cache Strategy:**

- Use in-memory Map for cache storage
- Store data with timestamp and TTL
- Implement LRU eviction for memory management
- Clear cache on authentication state change

**Cache Keys:**

- Profile: `profile:${userId}`
- Applications list: `applications:all`
- User applications: `applications:user:${userId}`

**Cache Invalidation:**

- On profile update: Invalidate `profile:${userId}`
- On application create: Invalidate `applications:*`

### Optimistic Updates

**Profile Update Flow:**

```typescript
async function updateProfile(data: UpdateProfileData) {
  // 1. Store current state for rollback
  const previousProfile = currentProfile;

  // 2. Optimistically update UI
  setProfile({ ...previousProfile, ...data });

  try {
    // 3. Make API call
    const updated = await profileService.updateProfile(data);

    // 4. Confirm with server data
    setProfile(updated);

    // 5. Show success message
    showToast("Profile updated successfully");
  } catch (error) {
    // 6. Rollback on error
    setProfile(previousProfile);

    // 7. Show error message
    showToast("Failed to update profile", "error");
  }
}
```

### Request Cancellation

**Using AbortController:**

```typescript
function useApplications() {
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    // Create new controller for this effect
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Fetch data with signal
    fetchApplications(controller.signal);

    // Cleanup: abort on unmount or dependency change
    return () => {
      controller.abort();
    };
  }, [userId]);
}
```

### Environment Configuration

**Development (.env.development):**

```
VITE_API_BASE_URL=https://dev-api.madewithkiro.com
VITE_TEST_USER_ID=test-user-001
```

**Production (.env.production):**

```
VITE_API_BASE_URL=https://api.madewithkiro.com
VITE_TEST_USER_ID=test-user-001
```

**Configuration Validation:**

```typescript
function validateConfig(config: EnvironmentConfig): void {
  const required = ["apiBaseUrl", "testUserId"];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

## DynamoDB Seed Script Design

### Seed Script Architecture

The seed script will be a Python script that uses boto3 to populate DynamoDB with realistic test data.

**Location:** `backend/scripts/seed_db.py`

**Features:**

- Create sample user profiles
- Create sample applications
- Check for existing data
- Support clean flag to reset data
- Output summary of created items

### Seed Data Structure

**User Profile (1 test user):**

```python
SEED_USER = {
    'userId': 'test-user-001',
    'firstName': 'Test',
    'lastName': 'User',
    'awsBuilderHandle': 'test-builder',
    'linkedInUsername': 'testuser',
    'githubUsername': 'test-user',
}
```

**Applications (10+ applications for test user):**

```python
SEED_APPLICATIONS = [
    {
        'name': 'Task Manager Pro',
        'description': 'A powerful task management application built with Kiro',
        'appUrl': 'https://taskmanager.example.com',
        'githubUrl': 'https://github.com/test-user/task-manager',
        'tags': ['productivity', 'react', 'typescript'],
        'userId': 'test-user-001',
    },
    {
        'name': 'Weather Dashboard',
        'description': 'Real-time weather tracking with beautiful visualizations',
        'appUrl': 'https://weather.example.com',
        'githubUrl': None,  # Optional field
        'tags': ['weather', 'dashboard', 'api'],
        'userId': 'test-user-001',
    },
    # ... more applications for test user
]
```

### Seed Script Implementation

**Command-line Interface:**

```bash
# Seed with default data
python backend/scripts/seed_db.py

# Clean and reseed
python backend/scripts/seed_db.py --clean

# Specify table name
python backend/scripts/seed_db.py --table-name MyTable

# Dry run (show what would be created)
python backend/scripts/seed_db.py --dry-run
```

**Script Flow:**

```python
def seed_database(table_name: str, clean: bool = False, dry_run: bool = False):
    # 1. Connect to DynamoDB
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    # 2. Clean existing data if requested
    if clean:
        print("Cleaning existing data...")
        delete_all_items(table)

    # 3. Check for existing data
    existing_profiles = count_items(table, 'PROFILE')
    if existing_profiles > 0 and not clean:
        print(f"Found {existing_profiles} existing profiles. Skipping seed.")
        return

    # 4. Create test user profile
    if not dry_run:
        create_profile(table, SEED_USER)
    print(f"Created profile: {SEED_USER['firstName']} {SEED_USER['lastName']}")

    # 5. Create applications
    apps_created = 0
    for app_data in SEED_APPLICATIONS:
        if not dry_run:
            create_application(table, app_data)
        apps_created += 1
        print(f"Created application: {app_data['name']}")

    # 6. Output summary
    print(f"\nSeed complete!")
    print(f"Profile created: test-user-001")
    print(f"Applications created: {apps_created}")
```

### Makefile Integration

Add seed command to Makefile:

```makefile
.PHONY: seed-db
seed-db:
	@echo "Seeding DynamoDB with test data..."
	cd backend && uv run python scripts/seed_db.py

.PHONY: seed-db-clean
seed-db-clean:
	@echo "Cleaning and reseeding DynamoDB..."
	cd backend && uv run python scripts/seed_db.py --clean
```

## Migration Strategy

### Phase 1: Infrastructure Setup

1. Add environment variables to `.env.development` and `.env.production`
2. Create API client with basic configuration
3. Create auth service integration with Cognito
4. Set up error types and utilities

### Phase 2: Service Layer

1. Create profile service with all operations
2. Create application service with all operations
3. Implement cache manager
4. Add request/response interceptors to API client

### Phase 3: Custom Hooks

1. Create useApi hook for generic API calls
2. Create useProfile hook
3. Create useApplications hook
4. Add loading and error state management

### Phase 4: Component Integration

1. Update ProfilePage to use real API
2. Update GalleryPage to use real API
3. Update ProfileForm to use real API
4. Update ApplicationForm to use real API
5. Remove mock data service imports

### Phase 5: Testing & Polish

1. Add property-based tests for API client
2. Add integration tests for services
3. Add component integration tests
4. Test error scenarios
5. Test optimistic updates
6. Performance testing and optimization

### Backward Compatibility

During migration, maintain both mock and real services:

```typescript
// Feature flag for gradual rollout
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === "true";

export const profileService = USE_REAL_API
  ? realProfileService
  : mockProfileService;
```

This allows:

- Testing real API in development without affecting all developers
- Gradual component migration
- Easy rollback if issues arise
- A/B testing in production

### Rollback Plan

If critical issues arise:

1. Set `VITE_USE_REAL_API=false` in environment
2. Redeploy frontend with mock services
3. Fix issues in real API integration
4. Re-enable real API after fixes

## Performance Considerations

### Caching Strategy

**Cache Duration:**

- Profile data: 5 minutes (frequently updated)
- Applications list: 5 minutes (frequently updated)
- Static data: 1 hour

**Cache Invalidation:**

- Invalidate on mutations (create, update)
- Invalidate on authentication state change
- Invalidate on manual refresh

### Request Optimization

**Batching:**

- Consider batching multiple profile requests
- Use GraphQL or custom batch endpoint if needed

**Pagination:**

- Implement cursor-based pagination for large lists
- Cache paginated results separately
- Prefetch next page on scroll

**Debouncing:**

- Debounce search/filter inputs (300ms)
- Cancel previous requests when new ones start

### Bundle Size

**Code Splitting:**

- Lazy load service modules
- Split API client from main bundle
- Use dynamic imports for heavy dependencies

**Tree Shaking:**

- Import only needed functions from libraries
- Avoid importing entire AWS SDK
- Use modular imports for utilities

## Security Considerations

### Data Security

**Transmission:**

- Always use HTTPS
- Never include sensitive data in URL parameters

**Test User ID:**

- Use hardcoded test user ID for development
- Plan for proper authentication in future phases

### Input Validation

**Client-Side:**

- Validate all form inputs before submission
- Sanitize user input to prevent XSS
- Use TypeScript for type safety

**Server-Side:**

- Backend validates all inputs (primary defense)
- Frontend validation is for UX only
- Never trust client-side validation alone

### CORS Configuration

**API Gateway CORS:**

```yaml
Cors:
  AllowOrigins:
    - https://madewithkiro.com
    - https://dev.madewithkiro.com
  AllowHeaders:
    - Content-Type
    - Authorization
  AllowMethods:
    - GET
    - POST
    - PUT
    - OPTIONS
  MaxAge: 3600
```

## Monitoring and Observability

### Logging

**Development:**

- Log all API requests and responses
- Log authentication events
- Log cache hits/misses
- Log errors with stack traces

**Production:**

- Log errors only
- Redact sensitive information
- Use structured logging
- Send logs to CloudWatch

### Metrics

**Track:**

- API response times
- Error rates by endpoint
- Cache hit rates

**Alerts:**

- Error rate > 5%
- Response time > 2s
- Failed auth attempts > 10/min

### Error Tracking

**Integration:**

- Use Sentry or similar for error tracking
- Capture user context (non-PII)
- Track error frequency and patterns
- Set up alerts for new errors

**Error Context:**

```typescript
Sentry.captureException(error, {
  tags: {
    endpoint: "/api/profile",
    method: "POST",
  },
  extra: {
    userId: user?.id,
    requestId: response.headers.get("x-request-id"),
  },
});
```
